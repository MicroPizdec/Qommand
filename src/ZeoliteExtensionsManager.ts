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

    this.logger.info('Initialized extensions manager.');
  }

  public setExtensionsDir(dir: string): this {
    this.extensionsDir = dir;
    return this;
  }

  public loadAllExtensions() {
    this.logger.debug(`Started loading extensions from  ${this.extensionsDir}...`);
    const files = fs.readdirSync(this.extensionsDir).filter((f) => !f.endsWith('.js.map'));

    for (const file of files) {
      this.loadExtension(file);
    }

    this.logger.info('Loaded extensions.');
  }

  public loadExtension(name: string): ZeoliteExtension {
    const extCls: typeof ZeoliteExtension = require(path.join(this.extensionsDir, name)).default;
    const ext = new extCls(this.client);

    this.extensions.set(ext.name, ext);
    ext.onLoad();

    this.logger.info(`Loaded extension ${ext.name}`);

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

    this.logger.info(`Unloaded extension ${ext!.name}.`);
  }

  public reloadExtension(name: string): ZeoliteExtension {
    this.unloadExtension(name);
    return this.loadExtension(name);
  }
}
