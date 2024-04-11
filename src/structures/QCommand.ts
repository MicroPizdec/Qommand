import { getLogger, Logger } from '@log4js-node/log4js-api';
import {
  CreateApplicationCommandOptions,
  ChatInputApplicationCommand,
  ApplicationCommandOptions,
  Constants,
} from 'oceanic.js';
import { QClient } from '../QClient';
import { QContext } from './QContext';

/**
 * A class that represents a command. You mustn't instantiate this class directly, extend that class instead.
 * @example 
 * ```
 * export default class SampleCommand extends QCommand {
 *   // ...
 * }
 * ```
 */
export class QCommand {
  public data: QCommandData;
  /** An instance of client */
  public readonly client: QClient;
  /** Full path to command file */
  public path: string;
  protected logger: Logger;

  public constructor(client: QClient, data?: QCommandData) {
    if (!data) {
      throw new Error('No data provided.');
    }
    this.client = client;
    this.data = data;
    this.logger = getLogger(this.constructor.name);
  }

  public get type(): Constants.ApplicationCommandTypes {
    return this.data.type || Constants.ApplicationCommandTypes.CHAT_INPUT;
  }

  /** Command name */
  public get name(): string {
    return this.data.name;
  }

  /** Command description */
  public get description(): string {
    return this.data.description;
  }

  /** Command group, can be used in help command */
  public get group(): string | undefined {
    return this.data.group;
  }

  /** Command options */
  public get options(): ApplicationCommandOptions[] | undefined {
    return this.data.options;
  }

  /** Whether the command can be executed only by bot owners or not */
  public get ownerOnly(): boolean | undefined {
    return this.data.ownerOnly;
  }

  /** Whether the command can be executed only in guilds or not */
  public get guildOnly(): boolean | undefined {
    return this.data.guildOnly;
  }

  /** Cooldown value in seconds */
  public get cooldown(): number | undefined {
    return this.data.cooldown;
  }

  /** Required permissions for this command */
  public get requiredPermissions(): Constants.PermissionName[] {
    return this.data.requiredPermissions ? this.data.requiredPermissions : (this.data.requiredPermissions = []);
  }

  /** Name localizations */
  public get nameLocalizations(): Record<string, string> | undefined {
    return this.data.nameLocalizations;
  }

  /** Description localizations */
  public get descriptionLocalizations(): Record<string, string> | undefined {
    return this.data.descriptionLocalizations;
  }

  /**
   * The pre-load check. You can override this method for some advanced stuff.
   * @returns Boolean
   */
  public preLoad(): boolean {
    return true;
  }

  /**
   * The main method of this class that you should override in your extended class.
   * @param ctx Command context
   */
  public async run(ctx: QContext): Promise<unknown> {
    throw new Error(`${this.constructor.name} does not have the run() method`);
  }

  /**
   * Updates this command in Discord API.
   * @returns An application command object
   */
  public async update(): Promise<ChatInputApplicationCommand | undefined> {
    return this.client.application.createGlobalCommand(this.json());
  }

  /**
   * Returns this command as a plain object. Useful for some Discord API-related stuff. 
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
  public reload(): QCommand {
    return this.client.commandsManager.reloadCommand(this.name);
  }
}

export interface QCommandData {
  type?: Constants.ApplicationCommandTypes;
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
