import { ChatInputApplicationCommandStructure, ApplicationCommand, ApplicationCommandOptions, Constants } from 'eris';
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

  public get requiredPermissions(): (keyof Constants['Permissions'])[] {
    return this.data.requiredPermissions ? this.data.requiredPermissions : (this.data.requiredPermissions = []);
  }

  public preLoad(): boolean {
    return true;
  }

  public async run(ctx: ZeoliteContext) {
    throw new Error('abstract class method.');
  }

  public async update(): Promise<ApplicationCommand | undefined> {
    return this.client.createCommand(this.json());
  }

  public json(): ChatInputApplicationCommandStructure {
    return {
      type: 1,
      name: this.name,
      description: this.description,
      options: this.options,
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
  requiredPermissions?: (keyof Constants['Permissions'])[];
}
