import { getLogger, Logger } from '@log4js-node/log4js-api';
import { QClient } from '../QClient';
import path from 'path';
import fs from 'fs/promises';
import { QExtension } from '../structures/QExtension';

export class ZeoliteExtensionsManager {
  public extensions: Map<string, QExtension>;
  public readonly client: QClient;
  public extensionsDir: string;

  private logger: Logger;

  public constructor(client: QClient) {
    this.client = client;
    this.extensions = new Map();
    this.logger = getLogger('ZeoliteExtensionsManager');

    this.logger.debug('Initialized extensions manager.');

    process.on('exit', async (code) => {
      this.logger.info('Calling all onExit() methods of extensions...');
      for (const ext of this.extensions.values()) {
        this.logger.debug(`Called ${ext.constructor.name}.onExit()`);
        await ext.onExit();
      }
    });
  }

  public setExtensionsDir(dir: string): this {
    this.extensionsDir = dir;
    this.logger.trace(`Set extensions dir: ${dir}`);
    return this;
  }

  public async loadExtensionsInDir(dir: string) {
    this.setExtensionsDir(dir);
    await this.loadAllExtensions();
  }

  public async loadAllExtensions(): Promise<void> {
    this.logger.debug(`Started loading extensions from ${this.extensionsDir}...`);
    const files = await fs.readdir(this.extensionsDir).then((list) => list.filter((f) => !f.endsWith('.js.map')));
    let count = 0;

    for (const file of files) {
      await this.loadExtension(file);
      count++;
    }

    this.logger.info(`Loaded ${count} extensions.`);
  }

  public async loadExtension(name: string): Promise<QExtension> {
    let extCls: typeof QExtension;
    try {
      extCls = require(path.join(this.extensionsDir, name)).default;

      const ext = new extCls(this.client);
      if (!(ext instanceof QExtension)) {
        throw new Error(`${extCls.name} does not inherit from QExtension.`);
      }
      if (this.extensions.has(ext.name)) {
        this.logger.warn(`Attempted to load already existing extension ${ext.name}`);
        throw new Error(`Extension ${ext.name} is already loaded.`);
      }

      ext.path = path.join(this.extensionsDir, name);
      await ext.onLoad();
      this.extensions.set(ext.name, ext);

      this.logger.debug(`Loaded extension ${ext.name}`);

      return ext;
    } catch (err: any) {
      this.logger.error(`Failed to load extension ${name}.`);
      throw err;
    }
  }

  public async unloadExtension(name: string): Promise<void> {
    if (!this.extensions.has(name)) {
      throw new Error('this extension does not exist.');
    }

    const ext = this.extensions.get(name);
    const extPath = require.resolve(path.join(this.extensionsDir, ext!.name));
    await ext?.onUnload();

    delete require.cache[extPath];
    this.extensions.delete(ext!.name);

    this.logger.debug(`Unloaded extension ${ext!.name}.`);
  }

  public async reloadExtension(name: string): Promise<QExtension> {
    this.unloadExtension(name);
    return this.loadExtension(name);
  }
}
