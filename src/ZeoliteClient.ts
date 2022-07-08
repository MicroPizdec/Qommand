import { Client, CommandInteraction, User, Member, Constants, ClientEvents } from 'eris';
import { ZeoliteCommand } from './ZeoliteCommand';
import { ZeoliteClientOptions } from './ZeoliteClientOptions';
import { ZeoliteExtension } from './ZeoliteExtension';
import { ZeoliteLogger, LoggerLevel } from './ZeoliteLogger';
import fs from 'fs';
import path from 'path';
import { ZeoliteContext } from './ZeoliteContext';
import { ZeoliteLocalization } from './ZeoliteLocalization';

export type MiddlewareFunc = (ctx: ZeoliteContext, next: () => Promise<void> | void) => Promise<void> | void;

export interface ZeoliteEvents extends ClientEvents {
  noPermissions: [ctx: ZeoliteContext, permissions: (keyof Constants['Permissions'])[]];
  commandCooldown: [ctx: ZeoliteContext, secondsLeft: number];
  ownerOnlyCommand: [ctx: ZeoliteContext];
  guildOnlyCommand: [ctx: ZeoliteContext];
  commandSuccess: [ctx: ZeoliteContext];
  commandError: [ctx: ZeoliteContext, error: Error]
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
  public commands: Map<string, ZeoliteCommand>;
  public extensions: Map<string, ZeoliteExtension>;
  public cooldowns: Map<string, Map<string, number>>;
  public localization: ZeoliteLocalization;
  public logger: ZeoliteLogger;
  public cmdDirPath: string;
  public extDirPath: string;
  public langsDirPath: string;
  public owners: string[] = [];
  public middlewares: MiddlewareFunc[] = [];

  private debug: boolean;
  private erisLogger: ZeoliteLogger;

  public constructor(token: string, options: ZeoliteClientOptions) {
    super(token, options);

    this.commands = new Map();
    this.extensions = new Map();
    this.cooldowns = new Map();

    this.cmdDirPath = options.cmdDirPath;
    this.extDirPath = options.extDirPath;
    this.langsDirPath = options.langsDirPath;
    this.owners = options.owners;
    this.debug = options.debug || false;

    this.logger = new ZeoliteLogger(this.debug ? LoggerLevel.Debug : LoggerLevel.Info, 'ZeoliteClient');

    this.on('ready', () => {
      this.logger.info(`Logged in as ${this.user?.username}.`);
      for (const cmd of this.commands.values()) {
        this.createCommand(cmd.json());
      }
    });

    if (this.debug) {
      this.erisLogger = new ZeoliteLogger(LoggerLevel.Debug, 'eris');

      this.on('debug', (msg) => this.erisLogger.debug(msg));
    }

    this.on('interactionCreate', this.handleCommand);

    this.localization = new ZeoliteLocalization(this);

    this.logger.info('ZeoliteClient initialized.');
  }

  private async handleCommand(interaction: CommandInteraction) {
    if (interaction.type != 2) return;

    const cmd: ZeoliteCommand | undefined = this.commands.get(interaction.data.name);
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
      this.emit('ownerOnlyCommand', ctx);
      return;
    }

    if (ctx.command.guildOnly && !ctx.guild) {
      this.emit('guildOnlyCommand', ctx);
      return;
    }

    if (ctx.command.cooldown) {
      if (!this.cooldowns.has(ctx.command.name)) {
        this.cooldowns.set(ctx.command.name, new Map<string, number>());
      }

      let cmdCooldowns = this.cooldowns.get(ctx.command.name);
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
        const cmdCooldowns = this.cooldowns.get(ctx.command.name);
        cmdCooldowns?.set((ctx.member || ctx.user!).id, Date.now());
        setTimeout(() => cmdCooldowns?.delete((ctx.member || ctx.user!).id), ctx.command.cooldown * 1000);
      }
    } catch (error: any) {
      this.emit('commandError', ctx, error);
    }
  }

  public validatePermissions(member: Member, perms: (keyof Constants['Permissions'])[]): boolean {
    for (const perm of perms) {
      if (!member.permissions.has(perm)) return false;
    }

    return true;
  }

  public loadAllCommands() {
    const files = fs.readdirSync(this.cmdDirPath).filter((f) => !f.endsWith('.js.map'));

    for (const file of files) {
      this.loadCommand(file);
    }

    this.logger.info('Loaded all commands.');
  }

  public loadCommand(name: string): ZeoliteCommand {
    const cmdCls: typeof ZeoliteCommand = require(path.join(this.cmdDirPath, name)).default;
    const cmd = new cmdCls(this);

    if (!cmd.preLoad()) {
      this.logger.warn(`Command ${cmd.name} didn't loaded due to failed pre-load check.`);
      return cmd;
    }

    this.commands.set(cmd.name, cmd);

    this.logger.debug(`Loaded command ${cmd.name}.`);

    return cmd;
  }

  public unloadCommand(name: string) {
    if (!this.commands.has(name)) {
      throw new Error('this command does not exist.');
    }

    const cmd = this.commands.get(name);
    const cmdPath = require.resolve(path.join(this.cmdDirPath, cmd!.name));

    delete require.cache[cmdPath];
    this.commands.delete(cmd!.name);

    this.logger.debug(`Unloaded command ${name}.`);
  }

  public reloadCommand(name: string): ZeoliteCommand {
    this.unloadCommand(name);
    return this.loadCommand(name);
  }

  public async connect() {
    this.logger.info('Logging in...');
    return super.connect();
  }

  public isOwner(user: Member | User): boolean {
    return this.owners.includes(user.id);
  }

  public loadAllExtensions() {
    const files = fs.readdirSync(this.extDirPath).filter((f) => !f.endsWith('.js.map'));

    for (const file of files) {
      this.loadExtension(file);
    }

    this.logger.info('Loaded extensions.');
  }

  public loadExtension(name: string): ZeoliteExtension {
    const extCls: typeof ZeoliteExtension = require(path.join(this.extDirPath, name)).default;
    const ext = new extCls(this);

    this.extensions.set(ext.name, ext);
    ext.onLoad();

    this.logger.debug(`Loaded extension ${ext.name}`);

    return ext;
  }

  public unloadExtension(name: string) {
    if (!this.extensions.has(name)) {
      throw new Error('this extension does not exist.');
    }

    const ext = this.extensions.get(name);
    const extPath = require.resolve(path.join(this.extDirPath, ext!.name));

    delete require.cache[extPath];
    this.extensions.delete(ext!.name);

    this.logger.debug(`Unloaded extension ${ext!.name}.`);
  }

  public reloadExtension(name: string): ZeoliteExtension {
    this.unloadExtension(name);
    return this.loadExtension(name);
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
