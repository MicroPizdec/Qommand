import { getLogger, Logger } from '@log4js-node/log4js-api';
import { QClient } from '../QClient';
import { QCommand } from '../structures/QCommand';
import path from 'path';
import fs from 'fs/promises';
import { ChatInputApplicationCommand } from 'oceanic.js';

export class ZeoliteCommandsManager {
  public commands: Map<string, QCommand>;
  public readonly client: QClient;
  public commandsDir: string;
  public cooldowns: Map<string, Map<string, number>>;

  private logger: Logger;

  public constructor(client: QClient) {
    this.client = client;
    this.commands = new Map();
    this.logger = getLogger('ZeoliteCommandsManager');
    this.cooldowns = new Map();

    this.logger.debug('Initialized commands manager.');
  }

  public setCommandsDir(dir: string): this {
    this.commandsDir = dir;
    this.logger.trace(`Set commands dir: ${dir}`)
    return this;
  }

  public async loadCommandsInDir(dir: string) {
    this.setCommandsDir(dir);
    await this.loadAllCommands();
  }

  public async loadAllCommands(): Promise<void> {
    if (!this.commandsDir) {
      throw new Error('Command dir not set.');
    }
    this.logger.debug(`Started loading commands from ${this.commandsDir}...`);
    const files = await fs.readdir(this.commandsDir).then((list) => list.filter((f) => !f.endsWith('.js.map')));
    let count = 0;

    for (const file of files) {
      this.loadCommand(file);
      count++;
    }

    this.logger.info(`Loaded ${count} commands.`);
  }

  /**
   * Loads a command.
   * @param name Command name
   * @returns The instance of loaded command
   */
  public loadCommand(name: string): QCommand {
    let cmdCls: typeof QCommand;
    try {
      cmdCls = require(path.join(this.commandsDir, name)).default;

      const cmd = new cmdCls(this.client);
      if (!(cmd instanceof QCommand)) {
        throw new Error(`${cmdCls.name} does not inherit from ZeoliteCommand.`);
      }
      if (!cmd.preLoad()) {
        this.logger.warn(`Command ${cmd.name} didn't load due to failed pre-load check.`);
        return cmd;
      }
      if (this.commands.has(cmd.name)) {
        this.logger.warn(`Attempted to load already existing command ${cmd.name}`);
        throw new Error(`Command ${cmd.name} is already exist.`);
      }

      cmd.path = path.join(this.commandsDir, name);
      this.commands.set(cmd.name, cmd);
      this.logger.debug(`Loaded command ${cmd.name}.`);
      return cmd;
    } catch (err: any) {
      this.logger.error(`Failed to load command ${name}.`);
      throw err;
    }
  }

  /**
   * Unloads a command
   * @param name Command name
   */
  public unloadCommand(name: string): void {
    if (!this.commands.has(name)) {
      throw new Error(`Command ${name} does not exist.`);
    }

    const cmd = this.commands.get(name);

    delete require.cache[cmd!.path];
    this.commands.delete(cmd!.name);

    this.logger.debug(`Unloaded command ${name}.`);
  }

  /**
   * Reloads a command
   * @param name Command name
   * @returns The instance of reloaded command
   */
  public reloadCommand(name: string): QCommand {
    this.unloadCommand(name);
    return this.loadCommand(name);
  }

  /**
   * Updates all application commands.
   */
  public async updateCommands(): Promise<void> {
    const commandList = [...this.commands.values()].map((cmd) => cmd.json());
    try {
      await this.client.application.bulkEditGlobalCommands(commandList);
    } catch (e: any) {
      this.logger.error('Failed to update application commands.');
      throw e;
    }
    this.logger.info('Updated all application commands.');
  }

  public async updateCommand(name: string): Promise<ChatInputApplicationCommand | undefined> {
    if (!this.commands.has(name)) {
      throw new Error('this command does not exist.');
    }

    return this.commands.get(name)?.update();
  }
}
