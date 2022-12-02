import { ZeoliteClient } from './ZeoliteClient';
import { Member, User } from 'oceanic.js';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { getLogger, Logger } from '@log4js-node/log4js-api';

export class ZeoliteLocalizationManager {
  public languageStrings: Record<string, Record<string, string>> = {};
  public userLanguages: Record<string, string | undefined> = {};
  public readonly client: ZeoliteClient;
  public langsDir: string;
  private logger: Logger;

  public constructor(client: ZeoliteClient) {
    this.client = client;
    this.logger = getLogger('ZeoliteLocalizationManager');

    this.logger.info('Initialized localization manager.');
  }

  // this method should be overridden by developer
  public getUserLanguage(user: Member | User): string {
    return 'en';
  }

  public getString(user: Member | User, str: string, ...args: any[]): string {
    const lang = this.userLanguages[user.id] || 'en';
    const langStrs = this.languageStrings[lang];
    return langStrs[str] ? util.format(langStrs[str], ...args) : `${str} ${args.join(' ')}`;
  }

  public setLangsDir(dir: string) {
    this.langsDir = dir;
  }

  public reloadLanguages() {
    const langs = Object.keys(this.languageStrings);

    for (const lang of langs) {
      const langPath = require.resolve(path.join(__dirname, '..', 'languages', lang));
      delete require.cache[langPath];
      delete this.languageStrings[lang];
    }

    this.loadLanguages();
  }

  public loadLanguages() {
    const langs = fs.readdirSync(this.langsDir).map((i) => i.split('.')[0]);

    for (const lang of langs) {
      const strs = require(path.join(this.langsDir, lang)).default;
      this.languageStrings[lang] = strs;
      this.client.logger.debug(`Loaded language ${lang}`);
    }

    this.logger.info('Loaded all language files.');
  }
}
