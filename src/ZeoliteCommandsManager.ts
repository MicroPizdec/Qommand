import { getLogger, Logger } from '@log4js-node/log4js-api';
import { ZeoliteClient } from './ZeoliteClient';
import { ZeoliteCommand } from './ZeoliteCommand';
import path from 'path';
import fs from 'fs';

export class ZeoliteCommandsManager {
  public commands: Map<string, ZeoliteCommand>;
  public readonly client: ZeoliteClient;
  public commandsDir: string;
  public cooldowns: Map<string, Map<string, number>>;

  private logger: Logger;

  public constructor(client: ZeoliteClient) {
    this.client = client;
    this.commands = new Map();
    this.logger = getLogger('ZeoliteCommandsManager');
    this.cooldowns = new Map();

    this.logger.debug('Initialized commands manager.');
  }

  public setCommandsDir(dir: string): this {
    this.commandsDir = dir;
    return this;
  }

  public loadAllCommands() {
    this.logger.info(`Started loading commands from ${this.commandsDir}...`);
    const files = fs.readdirSync(this.commandsDir).filter((f) => !f.endsWith('.js.map'));
    let count = 0;

    for (const file of files) {
      this.loadCommand(file);
      count++;
    }

    this.logger.info(`Loaded ${count} commands.`);
  }

  public loadCommand(name: string): ZeoliteCommand {
    let cmdCls: typeof ZeoliteCommand;
    try {
      cmdCls = require(path.join(this.commandsDir, name)).default;
    } catch (err: any) {
      this.logger.error(`Failed to load command ${name}:`);
      throw err;
    }

    const cmd = new cmdCls(this.client);

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
    const cmdPath = require.resolve(path.join(this.commandsDir, cmd!.name));

    delete require.cache[cmdPath];
    this.commands.delete(cmd!.name);

    this.logger.debug(`Unloaded command ${name}.`);
  }

  public reloadCommand(name: string): ZeoliteCommand {
    this.unloadCommand(name);
    return this.loadCommand(name);
  }

  public async updateCommands() {
    this.logger.info('Started updating application commands...');
    for (const cmd of this.commands.values()) {
      try {
        await this.client.application.createGlobalCommand(cmd.json());
        this.logger.debug(`Updated command ${cmd.name}.`);
      } catch (err: any) {
        this.logger.error(`Failed to update command ${cmd.name}:`);
        console.error(err);
      }
    }
    this.logger.info('Updated all application commands.')
  }
}
