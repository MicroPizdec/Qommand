import { Client, ClientEvents, Constants, CommandInteraction, Member, User, InteractionContent, ClientOptions } from 'oceanic.js';
import { ZeoliteCommand } from './ZeoliteCommand';
import { ZeoliteContext } from './ZeoliteContext';
import { ZeoliteLocalizationManager } from './ZeoliteLocalizationManager';
import { getLogger, Logger } from '@log4js-node/log4js-api';
import { ZeoliteCommandsManager } from './ZeoliteCommandsManager';
import { ZeoliteExtensionsManager } from './ZeoliteExtensionsManager';

export interface ZeoliteClientOptions extends ClientOptions {
  owners?: string[];
}

export type MiddlewareFunc = (ctx: ZeoliteContext, next: () => Promise<void> | void) => Promise<void> | void;

export interface ZeoliteEvents extends ClientEvents {
  noPermissions: [ctx: ZeoliteContext, permissions: Constants.PermissionName[]];
  commandCooldown: [ctx: ZeoliteContext, secondsLeft: number];
  ownerOnlyCommand: [ctx: ZeoliteContext];
  guildOnlyCommand: [ctx: ZeoliteContext];
  commandSuccess: [ctx: ZeoliteContext];
  commandError: [ctx: ZeoliteContext, error: Error];
}

export declare interface ZeoliteClient {
  on<K extends keyof ZeoliteEvents>(event: K, listener: (...args: ZeoliteEvents[K]) => void): this;
  on(event: string, listener: (...args: any) => void): this;
  once<K extends keyof ZeoliteEvents>(event: K, listener: (...args: ZeoliteEvents[K]) => void): this;
  once(event: string, listener: (...args: any) => void): this;
  off<K extends keyof ZeoliteEvents>(event: K, listener: (...args: ZeoliteEvents[K]) => void): this;
  off(event: string, listener: (...args: any) => void): this;
  emit<K extends keyof ZeoliteEvents>(event: K, ...args: ZeoliteEvents[K]): boolean;
  emit(event: string, ...args: any): boolean;
}

export class ZeoliteClient extends Client {
  public commandsManager: ZeoliteCommandsManager;
  public extensionsManager: ZeoliteExtensionsManager;
  public localizationManager: ZeoliteLocalizationManager;
  public owners: string[] = [];
  public middlewares: MiddlewareFunc[] = [];
  public logger: Logger;

  private oceanicLogger: Logger;

  public constructor(options: ZeoliteClientOptions) {
    super(options);

    this.logger = getLogger('ZeoliteClient');
    this.oceanicLogger = getLogger('Oceanic');
    this.logger.debug("Initialized loggers.");

    this.commandsManager = new ZeoliteCommandsManager(this);
    this.extensionsManager = new ZeoliteExtensionsManager(this);
    this.localizationManager = new ZeoliteLocalizationManager(this);
    this.owners = options.owners || [];

    this.on('debug', (msg) => this.oceanicLogger.debug(msg));

    this.once('ready', async () => {
      this.logger.info(`Logged in as ${this.user?.username}.`);
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

    this.logger.info('Initialized ZeoliteClient.');
  }

  private async onInteraction(interaction: CommandInteraction): Promise<void> {
    if (interaction.type != 2) return;

    this.logger.debug(
      `Received command interaction /${interaction.data.name} from ${interaction.user.tag} (${interaction.user.id}) in ${interaction.guild ? interaction.guild.name : 'bot DM'}`,
    );

    const cmd: ZeoliteCommand | undefined = this.commandsManager.commands.get(interaction.data.name);
    if (!cmd) return;

    const ctx = new ZeoliteContext(this, interaction, cmd);
    this.logger.debug(`Created ZeoliteContext for interaction /${cmd.name}`);

    await this.handleMiddlewares(cmd, ctx);
  }

  private async handleMiddlewares(cmd: ZeoliteCommand, ctx: ZeoliteContext): Promise<void> {
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

  private async runCommand(ctx: ZeoliteContext, next: () => Promise<void> | void): Promise<void> {
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
          this.logger.debug(`Command ${ctx.command.name} didn't run due to being on cooldown. Seconds left: ${secsLeft}`);
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
        cmdCooldowns?.set((ctx.member || ctx.user!).id, Date.now());
        setTimeout(() => cmdCooldowns?.delete((ctx.member || ctx.user!).id), ctx.command.cooldown * 1000);
      }
    } catch (error: any) {
      this.emit('commandError', ctx, error);
    }
  }

  public validatePermissions(member: Member, perms: Constants.PermissionName[]): boolean {
    for (const perm of perms) {
      if (!member.permissions.has(perm)) return false;
    }

    return true;
  }

  public async connect(): Promise<void> {
    this.logger.info('Logging in...');
    await super.connect();
  }

  public isOwner(user: Member | User): boolean {
    return this.owners.includes(user.id);
  }

  public addMiddleware(func: MiddlewareFunc): void {
    if (typeof func != "function") throw new Error("The middleware should be a function.");
    this.middlewares.push(func);
  }

  public generateInvite(permissions?: number, scopes?: string[]): string {
    let link = `https://discord.com/api/oauth2/authorize?client_id=${this.application?.id}`;
    if (permissions) link += `&permissions=${permissions}`;
    if (scopes) link += `&scopes=${scopes.join('%20')}`;
    return link;
  }
}
