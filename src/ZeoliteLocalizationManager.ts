import { ZeoliteClient } from './ZeoliteClient';
import { Member, User } from 'oceanic.js';
import fs from 'fs/promises';
import path from 'path';
import util from 'util';
import { getLogger, Logger } from '@log4js-node/log4js-api';

/**
 * Localization manager
 */
export class ZeoliteLocalizationManager {
  public languageStrings: Record<string, Record<string, string>> = {};
  public userLanguages: Record<string, string | undefined> = {};
  public readonly client: ZeoliteClient;
  public langsDir: string;
  public defaultLang: string = "en-US";
  private logger: Logger;

  public constructor(client: ZeoliteClient) {
    this.client = client;
    this.logger = getLogger('ZeoliteLocalizationManager');

    this.logger.debug('Initialized localization manager.');
  }

  // this method should be overridden by developer, or not?
  public getUserLanguage(user: Member | User): string {
    return 'en';
  }

  public getString(user: Member | User, str: string, ...args: any[]): string {
    // another piece of shitcode, but it works, isn't it?
    const lang = this.userLanguages[user.id] || this.defaultLang;
    const langStrs = this.languageStrings[lang] || this.languageStrings[this.defaultLang];
    return langStrs[str] ? util.format(langStrs[str], ...args) : `${str} ${args.join(' ')}`;
  }

  public setLangsDir(dir: string): this {
    this.langsDir = dir;
    return this;
  }

  public setDefaultLang(lang: string): this {
    this.defaultLang = lang;
    return this;
  }

  public async reloadLanguages(): Promise<void> {
    const langs = Object.keys(this.languageStrings);

    for (const lang of langs) {
      const langPath = require.resolve(path.join(this.langsDir, lang));
      delete require.cache[langPath];
      delete this.languageStrings[lang];
    }

    await this.loadLanguages();
  }

  public async loadLanguages(): Promise<void> {
    if (!this.langsDir) {
      throw new Error("Languages dir not set.");
    }

    const langs = await fs.readdir(this.langsDir)
      .then(list => list.filter(f => !f.endsWith(".js.map")).map((i) => i.split('.')[0]));

    for (const lang of langs) {
      const strs = require(path.join(this.langsDir, lang)).default;
      this.languageStrings[lang] = strs;
      this.logger.debug(`Loaded language ${lang}`);
    }

    this.logger.info(`Loaded ${langs.length} language files.`);
  }
}
