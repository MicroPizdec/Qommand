import { Client, ClientEvents, Constants, CommandInteraction, Member, User } from 'oceanic.js';
import { ZeoliteCommand } from './ZeoliteCommand';
import { ZeoliteClientOptions } from './ZeoliteClientOptions';
import { ZeoliteExtension } from './ZeoliteExtension';
import fs from 'fs';
import path from 'path';
import { ZeoliteContext } from './ZeoliteContext';
import { ZeoliteLocalizationManager } from './ZeoliteLocalizationManager';
import { getLogger, Logger } from '@log4js-node/log4js-api';
import { ZeoliteCommandsManager } from './ZeoliteCommandsManager';
import { ZeoliteExtensionsManager } from './ZeoliteExtensionsManager';

export type MiddlewareFunc = (ctx: ZeoliteContext, next: () => Promise<void> | void) => Promise<void> | void;

export interface ZeoliteEvents extends ClientEvents {
  noPermissions: [ctx: ZeoliteContext, permissions: string[]];
  commandCooldown: [ctx: ZeoliteContext, secondsLeft: number];
  ownerOnlyCommand: [ctx: ZeoliteContext];
  guildOnlyCommand: [ctx: ZeoliteContext];
  commandSuccess: [ctx: ZeoliteContext];
  commandError: [ctx: ZeoliteContext, error: Error];
}

export declare interface ZeoliteClient {
  on<K extends keyof ZeoliteEvents>(event: K, listener: (...args: ZeoliteEvents[K]) => void): this;
  on(event: string, listener: (...args: any) => void): this;
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

    this.on('debug', (msg) => this.oceanicLogger.debug(msg));

    this.commandsManager = new ZeoliteCommandsManager(this);
    this.extensionsManager = new ZeoliteExtensionsManager(this);
    this.owners = options.owners;

    this.on('ready', () => {
      this.logger.info(`Logged in as ${this.user?.username}.`);
      for (const cmd of this.commandsManager.commands.values()) {
        this.application.createGlobalCommand(cmd.json());
      }
    });

    this.on('commandError', (ctx, error) => {
      this.logger.error(`An error occurred while running command ${ctx.commandName}:`);
      console.error(error);
    });

    this.on('warn', (msg) => this.logger.warn(msg));

    this.on('error', (err, id) => {
      this.logger.error(`Error on shard ${id}:`);
      console.error(err);
    });

    this.on('interactionCreate', this.handleCommand);

    this.localizationManager = new ZeoliteLocalizationManager(this);

    this.logger.info('Initialized ZeoliteClient.');
  }

  private async handleCommand(interaction: CommandInteraction) {
    if (interaction.type != 2) return;

    this.logger.debug(
      `Received command interaction /${interaction.data.name} from ${interaction.user.tag} (${interaction.user.id})`,
    );

    const cmd: ZeoliteCommand | undefined = this.commandsManager.commands.get(interaction.data.name);
    if (!cmd) return;

    const ctx = new ZeoliteContext(this, interaction, cmd);

    await this.handleMiddlewares(cmd, ctx);
  }

  private async handleMiddlewares(cmd: ZeoliteCommand, ctx: ZeoliteContext) {
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

  private async runCommand(ctx: ZeoliteContext, next: () => Promise<void> | void) {
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
          this.emit('commandCooldown', ctx, secsLeft);
          return;
        }
      }
    }

    try {
      if (ctx.command.guildOnly && !this.validatePermissions(ctx.member!, ctx.command.requiredPermissions)) {
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

  public async connect() {
    this.logger.info('Logging in...');
    return super.connect();
  }

  public isOwner(user: Member | User): boolean {
    return this.owners.includes(user.id);
  }

  public addMiddleware(func: MiddlewareFunc) {
    this.middlewares.push(func);
  }

  public generateInvite(permissions?: number, scopes?: string[]): string {
    let link = `https://discord.com/api/oauth2/authorize?client_id=${this.application?.id}`;
    if (permissions) link += `&permissions=${permissions}`;
    if (scopes) link += `&scopes=${scopes.join('%20')}`;
    return link;
  }
}
