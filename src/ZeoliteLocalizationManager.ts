import { ZeoliteClient } from './ZeoliteClient';
import { Member, User } from 'oceanic.js';
import fs from 'fs/promises';
import path from 'path';
import util from 'util';
import { getLogger, Logger } from '@log4js-node/log4js-api';
import { ZeoliteContext } from './ZeoliteContext';

/**
 * Localization manager
 */
export class ZeoliteLocalizationManager {
  public languageStrings: Record<string, Record<string, string>> = {};
  public userLanguages: Record<string, string | undefined> = {};
  public readonly client: ZeoliteClient;
  public langsDir?: string;
  public defaultLang: string = 'en-US';
  public langProvider?: ZeoliteLanguageProvider;

  private boundMiddleware: typeof this.middleware;
  private logger: Logger;

  public constructor(client: ZeoliteClient) {
    this.client = client;
    this.logger = getLogger('ZeoliteLocalizationManager');
    this.boundMiddleware = this.middleware.bind(this);

    this.logger.debug('Initialized localization manager.');
  }

  private async middleware(ctx: ZeoliteContext, next: () => void | Promise<void>) {
    this.userLanguages[ctx.user.id] = await this.langProvider?.getUserLanguage(ctx);
    await next();
  }

  public setLanguageProvider(provider: ZeoliteLanguageProvider): this {
    this.langProvider = provider;
    if (!this.client.middlewares.includes(this.boundMiddleware)) {
      this.client.addMiddleware(this.boundMiddleware);
    }
    this.logger.trace(`Set ${this.langProvider.constructor.name} as the language provider`);
    return this;
  }

  // i know, i know, our apis are horrible
  public getLanguage(lang: string): Record<string, string> {
    return this.languageStrings[lang] || this.languageStrings[this.defaultLang];
  }

  public getString(user: Member | User, str: string, ...args: any[]): string {
    // another piece of shitcode, but it works, isn't it?
    const lang = this.userLanguages[user.id] || this.defaultLang;
    const langStrs = this.getLanguage(lang);
    return langStrs[str] ? util.format(langStrs[str], ...args) : `${str} ${args.join(' ')}`;
  }

  public setLangsDir(dir: string): this {
    this.langsDir = dir;
    this.logger.trace(`Set languages dir: ${dir}`);
    return this;
  }

  public async loadLanguagesInDir(dir: string) {
    this.setLangsDir(dir);
    await this.loadLanguages();
  }

  public setDefaultLang(lang: string): this {
    this.defaultLang = lang;
    return this;
  }

  public async reloadLanguages(): Promise<void> {
    const langs = Object.keys(this.languageStrings);

    for (const lang of langs) {
      const langPath = require.resolve(path.join(this.langsDir!, lang));
      delete require.cache[langPath];
      delete this.languageStrings[lang];
    }

    await this.loadLanguages();
  }

  public async loadLanguages(): Promise<void> {
    if (!this.langsDir) {
      throw new Error('Languages dir not set.');
    }

    const langs = await fs.readdir(this.langsDir)
      .then((list) => list.filter((f) => !f.endsWith('.js.map')).map((i) => i.split('.')[0]));

    for (const lang of langs) {
      const strs = require(path.join(this.langsDir, lang)).default;
      this.languageStrings[lang] = strs;
      this.logger.debug(`Loaded language ${lang}`);
    }

    this.logger.info(`Loaded ${langs.length} language files.`);
  }
}

export interface ZeoliteLanguageProvider {
  getUserLanguage(ctx: ZeoliteContext): Promise<string | undefined>;
  updateUserLanguage(userID: string, lang: string): Promise<any>;
  deleteUserLanguage(userID: string): Promise<any>;
}