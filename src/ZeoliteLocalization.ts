import { ZeoliteClient } from './ZeoliteClient';
import { Member, User } from 'oceanic.js';
import fs from 'fs';
import path from 'path';
import util from 'util';

let self: ZeoliteLocalization;

export class ZeoliteLocalization {
  public languageStrings: Record<string, Record<string, string>> = {};
  public userLanguages: Record<string, string | undefined> = {};
  public readonly client: ZeoliteClient;

  public constructor(client: ZeoliteClient) {
    this.client = client;
    self = this;
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
    const langs = fs.readdirSync(this.client.langsDirPath).map((i) => i.split('.')[0]);

    for (const lang of langs) {
      const strs = require(path.join(this.client.langsDirPath, lang)).default;
      self.languageStrings[lang] = strs;
      this.client.logger.debug(`Loaded language ${lang}`);
    }

    this.client.logger.info('Loaded all language files.');
  }
}
