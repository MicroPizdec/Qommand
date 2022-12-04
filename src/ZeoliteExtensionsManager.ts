import { getLogger, Logger } from '@log4js-node/log4js-api';
import { ZeoliteClient } from './ZeoliteClient';
import path from 'path';
import fs from 'fs';
import { ZeoliteExtension } from './ZeoliteExtension';

export class ZeoliteExtensionsManager {
  public extensions: Map<string, ZeoliteExtension>;
  public readonly client: ZeoliteClient;
  public extensionsDir: string;

  private logger: Logger;

  public constructor(client: ZeoliteClient) {
    this.client = client;
    this.extensions = new Map();
    this.logger = getLogger('ZeoliteExtensionsManager');

    this.logger.debug('Initialized extensions manager.');
  }

  public setExtensionsDir(dir: string): this {
    this.extensionsDir = dir;
    return this;
  }

  public loadAllExtensions() {
    this.logger.info(`Started loading extensions from ${this.extensionsDir}...`);
    const files = fs.readdirSync(this.extensionsDir).filter((f) => !f.endsWith('.js.map'));
    let count = 0;

    for (const file of files) {
      this.loadExtension(file);
      count++;
    }

    this.logger.info(`Loaded ${count} extensions.`);
  }

  public loadExtension(name: string): ZeoliteExtension {
    let extCls: typeof ZeoliteExtension;
    try {
      extCls = require(path.join(this.extensionsDir, name)).default;
    } catch (err: any) {
      this.logger.error(`Failed to load extension ${name}:`);
      throw err;
    }
    const ext = new extCls(this.client);

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
    const extPath = require.resolve(path.join(this.extensionsDir, ext!.name));

    delete require.cache[extPath];
    this.extensions.delete(ext!.name);

    this.logger.debug(`Unloaded extension ${ext!.name}.`);
  }

  public reloadExtension(name: string): ZeoliteExtension {
    this.unloadExtension(name);
    return this.loadExtension(name);
  }
}
