import {
  CommandInteraction,
  InteractionDataOptions,
  InteractionDataOptionWithValue,
  Member,
  Role,
  User,
  PartialChannel,
} from 'eris';
import { ZeoliteClient } from './ZeoliteClient';

export class ZeoliteCommandOptions {
  public readonly client: ZeoliteClient;
  private subcommand?: string;
  private hoistedOptions?: InteractionDataOptions[];
  private data?: InteractionDataOptions[];
  private resolved: typeof CommandInteraction.prototype.data.resolved;

  public constructor(
    client: ZeoliteClient,
    options?: InteractionDataOptions[],
    resolved?: typeof CommandInteraction.prototype.data.resolved,
  ) {
    this.client = client;
    this.hoistedOptions = options;
    this.resolved = resolved;

    if (options?.[0].type == 1) {
      this.subcommand = options[0].name;
      this.hoistedOptions = options[0].options;
    }

    this.data = options;
  }

  private getOption(name: string): InteractionDataOptionWithValue {
    return this.hoistedOptions?.find((o) => o.name == name) as InteractionDataOptionWithValue;
  }

  public getSubcommand(): string | undefined {
    return this.subcommand;
  }

  public getString(name: string): string | undefined {
    return this.getOption(name)?.value as string | undefined;
  }

  public getBoolean(name: string): boolean | undefined {
    return this.getOption(name)?.value as boolean | undefined;
  }

  public getInteger(name: string): number | undefined {
    return this.getOption(name)?.value as number | undefined;
  }

  public getUser(name: string): User | undefined {
    const id = this.getOption(name)?.value as string;
    const user = this.resolved?.users?.get(id);
    return user;
  }

  public getMember(name: string): Omit<Member, 'user' | 'deaf' | 'mute'> | undefined {
    const id = this.getOption(name)?.value as string;
    const member = this.resolved?.members?.get(id);
    return member;
  }

  public getRole(name: string): Role | undefined {
    const id = this.getOption(name)?.value as string;
    const role = this.resolved?.roles?.get(id);
    return role;
  }

  public getChannel(name: string): PartialChannel | undefined {
    const id = this.getOption(name)?.value as string;
    const channel = this.resolved?.channels?.get(id);
    return channel;
  }
}
