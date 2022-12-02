import {
  CreateApplicationCommandOptions,
  ChatInputApplicationCommand,
  ApplicationCommandOptions,
  Constants,
} from 'oceanic.js';
import { ZeoliteClient } from './ZeoliteClient';
import { ZeoliteContext } from './ZeoliteContext';

export class ZeoliteCommand {
  public data: ZeoliteCommandStructure;
  public readonly client: ZeoliteClient;

  public constructor(client: ZeoliteClient, data?: ZeoliteCommandStructure) {
    this.client = client;
    this.data = data!;
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

  public async run(ctx: ZeoliteContext) {
    throw new Error('abstract class method.');
  }

  public async update(): Promise<ChatInputApplicationCommand | undefined> {
    return this.client.application.createGlobalCommand(this.json());
  }

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
