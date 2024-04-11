import { Client, Constants, CommandInteraction, Member, User, ClientOptions, RESTApplication, AnyInteractionGateway } from 'oceanic.js';
import { QContext } from './structures/QContext';
import { QLocalizationManager } from './managers/QLocalizationManager';
import { getLogger, Logger } from '@log4js-node/log4js-api';
import { ZeoliteCommandsManager } from './managers/QCommandsManager';
import { ZeoliteExtensionsManager } from './managers/QExtensionsManager';

/**
 * Main class of ZeoliteCore
 */
export class QClient extends Client {
  public commandsManager: ZeoliteCommandsManager;
  public extensionsManager: ZeoliteExtensionsManager;
  public localizationManager: QLocalizationManager;
  /** Array of bot owner IDs */
  public owners: string[];
  /** Array of middleware functions */
  public middlewares: MiddlewareFunc[] = [];
  public logger: Logger;

  private oceanicLogger: Logger;

  public constructor(options: QClientOptions = {}) {
    super(options);

    this.logger = getLogger('QClient');
    this.oceanicLogger = getLogger('Oceanic');
    this.logger.debug('Initialized loggers.');

    this.commandsManager = new ZeoliteCommandsManager(this);
    this.extensionsManager = new ZeoliteExtensionsManager(this);
    this.localizationManager = new QLocalizationManager(this);
    this.owners = options.owners || [];

    this.on('debug', (msg) => this.oceanicLogger.trace(msg));

    this.once('ready', async () => {
      this.logger.info(`Logged in as ${this.user?.username}.`);
      try {
        if (!this.owners.length) this.owners = await this.fetchBotOwners();
      } catch (e: any) {
        this.logger.error(`Failed to fetch bot owners.`);
        console.error(e);
      }
      await this.commandsManager.updateCommands();
    });

    this.on('commandError', (ctx, error) => {
      this.logger.error(`An error occurred while running command ${ctx.commandName}:`);
      console.error(error);
    });

    this.on('warn', (msg) => this.oceanicLogger.warn(msg));

    this.on('error', (err, id) => {
      this.oceanicLogger.error(`Error on shard ${id}:`);
      console.error(err);
    });

    this.on('interactionCreate', this.onInteraction);

    this.logger.info('Initialized QClient.');
  }

  private async onInteraction(interaction: AnyInteractionGateway): Promise<void> {
    if (interaction.type != 2) return;

    this.logger.debug(`Received command interaction /${interaction.data.name} from ${interaction.user.tag} (${interaction.user.id}) in ${interaction.guild ? interaction.guild.name : 'bot DM'}`);

    const cmd = this.commandsManager.commands.get(interaction.data.name);
    if (!cmd) {
      this.logger.trace(`Command ${interaction.data.name} not found`);
      return;
    }
    this.logger.trace(`Found command ${cmd.name}`);

    const ctx = new QContext(this, interaction, cmd);
    this.logger.trace(`Created ZeoliteContext for interaction /${cmd.name}`);

    await this.handleMiddlewares(ctx);
  }

  private async handleMiddlewares(ctx: QContext): Promise<void> {
    let prevIndex = -1;
    let stack = [...this.middlewares, this.runCommand.bind(this)];

    async function runner(index: number) {
      prevIndex = index;

      const middleware = stack[index];

      if (middleware) {
        await middleware(ctx, () => runner(index + 1));
      }
    }

    await runner(0);
  }

  private async runCommand(ctx: QContext, next: () => Promise<void> | void): Promise<void> {
    if (ctx.command.ownerOnly && !this.isOwner(ctx.member || ctx.user!)) {
      this.logger.debug(`Command ${ctx.command.name} didn't run because ${ctx.user.tag} isn't a bot owner.`);
      this.emit('ownerOnlyCommand', ctx);
      return;
    }

    if (ctx.command.guildOnly && !ctx.guild) {
      this.logger.debug(`Command ${ctx.command.name} didn't run due to being ran in DMs.`);
      this.emit('guildOnlyCommand', ctx);
      return;
    }

    if (ctx.command.cooldown) {
      if (!this.commandsManager.cooldowns.has(ctx.command.name)) {
        this.commandsManager.cooldowns.set(ctx.command.name, new Map<string, number>());
      }

      let cmdCooldowns = this.commandsManager.cooldowns.get(ctx.command.name);
      let now = Date.now();
      if (cmdCooldowns?.has((ctx.member || ctx.user!).id)) {
        let expiration = (cmdCooldowns.get((ctx.member || ctx.user!).id) as number) + ctx.command.cooldown * 1000;
        if (now < expiration) {
          let secsLeft = Math.floor((expiration - now) / 1000);
          this.logger.debug(
            `Command ${ctx.command.name} didn't run due to being on cooldown. Seconds left: ${secsLeft}`,
          );
          this.emit('commandCooldown', ctx, secsLeft);
          return;
        }
      }
    }

    try {
      if (ctx.command.guildOnly && !this.validatePermissions(ctx.member!, ctx.command.requiredPermissions)) {
        this.logger.debug(`Command ${ctx.command.name} didn't run because ${ctx.user.tag} doesn't have ${ctx.command.requiredPermissions.join()} permissions.`);
        this.emit('noPermissions', ctx, ctx.command.requiredPermissions);
        return;
      }

      await ctx.command.run(ctx);
      this.emit('commandSuccess', ctx);
      if (ctx.command.cooldown) {
        const cmdCooldowns = this.commandsManager.cooldowns.get(ctx.command.name);
        cmdCooldowns?.set(ctx.user.id, Date.now());
        setTimeout(() => cmdCooldowns?.delete(ctx.user.id), ctx.command.cooldown * 1000);
      }
    } catch (error: any) {
      this.emit('commandError', ctx, error);
    }
  }

  /**
   * Fetches the bot owners.
   * @returns Array of bot owner IDs
   */
  public async fetchBotOwners(): Promise<string[]> {
    const app: RESTApplication = await this.rest.request({
      method: 'GET',
      auth: true,
      path: '/oauth2/applications/@me',
    });

    let owners: string[];
    if (app.team) {
      owners = app.team.members.map(m => m.user.id);
    } else {
      owners = [app.owner.id];
    }
    this.logger.debug(`Successfully fetched bot owners: ${owners.join(", ")}`);
    return owners;
  }

  /**
   * Validates the specified member's permissions.
   * @param member Member
   * @param perms Array of permission names
   * @returns Whether the member has the specified permissions or not
   */
  public validatePermissions(member: Member, perms: Constants.PermissionName[]): boolean {
    for (const perm of perms) {
      if (!member.permissions.has(perm)) return false;
    }

    return true;
  }

  /**
   * Connect to Discord.
   */
  public async connect(): Promise<void> {
    this.logger.info('Logging in...');
    await super.connect();
  }

  /**
   * Checks whether the user is the bot owner or not.
   * @param user A member or user object
   * @returns Pretty self-explanatory
   */
  public isOwner(user: Member | User): boolean {
    return this.owners.includes(user.id);
  }

  /**
   * Adds the middleware function to client.
   * @param func Middleware
   * @example
   * Middlewares in ZeoliteCore works like their Express counterpart, so they will be executed before the command's run() method.
   * ```ts
   * client.addMiddleware(async (ctx, next) => {
   *   console.log('hello from middleware!');
   *   await next();
   * });
   * ```
   */
  public addMiddleware(func: MiddlewareFunc): void {
    if (typeof func != 'function') throw new Error('The middleware should be a function.');
    this.middlewares.push(func);
  }

  /**
   * Removes the middleware from client.
   * @param func Middleware
   */
  public removeMiddleware(func: MiddlewareFunc): void {
    if (typeof func != 'function') throw new Error('The middleware should be a function.');
    const index = this.middlewares.indexOf(func);
    if (index != -1) this.middlewares.splice(index, 1);
  }

  /**
   * Generates an invite link for bot.
   * @param permissions Permissions bitfield
   * @param scopes Array of scopes
   * @returns The invite link
   */
  public generateInvite(permissions?: number, scopes?: string[]): string {
    let link = `https://discord.com/api/oauth2/authorize?client_id=${this.application?.id}`;
    if (permissions) link += `&permissions=${permissions}`;
    if (scopes) link += `&scope=${scopes.join('%20')}`;
    return link;
  }
}

export type MiddlewareFunc = (ctx: QContext, next: () => Promise<void> | void) => Promise<void> | void;

export interface QClientOptions extends ClientOptions {
  /** An array of bot owner IDs */
  owners?: string[];
  logging?: {
    level: string;
  };
}
