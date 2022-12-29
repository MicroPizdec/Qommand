import { getLogger, Logger } from '@log4js-node/log4js-api';
import {
  CreateApplicationCommandOptions,
  ChatInputApplicationCommand,
  ApplicationCommandOptions,
  Constants,
} from 'oceanic.js';
import { ZeoliteClient } from './ZeoliteClient';
import { ZeoliteContext } from './ZeoliteContext';

/**
 * A class that represents a command. You mustn't instantiate this class directly, extend that class instead.
 * @example 
 * ```
 * export default class TestCommand extends ZeoliteCommand {
 *   // ...
 * }
 * ```
 */
export class ZeoliteCommand {
  public data: ZeoliteCommandStructure;
  /** An instance of client */
  public readonly client: ZeoliteClient;
  /** Full path to command file */
  public path: string;
  protected logger: Logger;

  public constructor(client: ZeoliteClient, data?: ZeoliteCommandStructure) {
    if (!data) {
      throw new Error('No data provided.');
    }
    this.client = client;
    this.data = data;
    this.logger = getLogger(this.constructor.name);
  }

  public get name(): string {
    return this.data.name;
  }

  public get description(): string {
    return this.data.description;
  }

  public get group(): string | undefined {
    return this.data.group;
  }

  public get options(): ApplicationCommandOptions[] | undefined {
    return this.data.options;
  }

  public get ownerOnly(): boolean | undefined {
    return this.data.ownerOnly;
  }

  public get guildOnly(): boolean | undefined {
    return this.data.guildOnly;
  }

  public get cooldown(): number | undefined {
    return this.data.cooldown;
  }

  public get requiredPermissions(): Constants.PermissionName[] {
    return this.data.requiredPermissions ? this.data.requiredPermissions : (this.data.requiredPermissions = []);
  }

  public get nameLocalizations(): Record<string, string> | undefined {
    return this.data.nameLocalizations;
  }

  public get descriptionLocalizations(): Record<string, string> | undefined {
    return this.data.descriptionLocalizations;
  }

  public preLoad(): boolean {
    return true;
  }

  public async run(ctx: ZeoliteContext): Promise<void> {
    throw new Error(`${this.constructor.name} does not have the run() method`);
  }

  /**
   * Updates this command in Discord API.
   * @returns 
   */
  public async update(): Promise<ChatInputApplicationCommand | undefined> {
    return this.client.application.createGlobalCommand(this.json());
  }

  /**
   * 
   * @returns 
   */
  public json(): CreateApplicationCommandOptions {
    return {
      type: 1,
      name: this.name,
      description: this.description,
      options: this.options,
      nameLocalizations: this.nameLocalizations,
      descriptionLocalizations: this.descriptionLocalizations,
    };
  }

  /**
   * Reloads this command.
   * @returns The instance of reloaded command
   */
  public reload(): ZeoliteCommand {
    return this.client.commandsManager.reloadCommand(this.name);
  }
}

export interface ZeoliteCommandStructure {
  name: string;
  description: string;
  group?: string;
  options?: ApplicationCommandOptions[];
  ownerOnly?: boolean;
  guildOnly?: boolean;
  cooldown?: number;
  requiredPermissions?: Constants.PermissionName[];
  nameLocalizations?: Record<string, string>;
  descriptionLocalizations?: Record<string, string>;
}
