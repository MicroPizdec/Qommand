import { ZeoliteClient } from './ZeoliteClient';
import {
  CommandInteraction,
  User,
  Member,
  Guild,
  InteractionContent,
  Message,
  ComponentInteraction,
  AnyTextChannel,
  InteractionOptionsWrapper,
} from 'oceanic.js';
import { ZeoliteCommand } from './ZeoliteCommand';

type Filter = (interaction: ComponentInteraction) => boolean;
interface CollectButtonOptions {
  filter: Filter;
  messageID: string;
  timeout?: number;
}

export class ZeoliteContext {
  private data: Map<string, any> = new Map<string, any>();

  public constructor(
    public readonly client: ZeoliteClient,
    public readonly interaction: CommandInteraction,
    public readonly command: ZeoliteCommand,
  ) {}

  public get user(): User {
    return this.interaction.member?.user || this.interaction.user!;
  }

  public get member(): Member | undefined {
    return this.interaction.member;
  }

  public get guild(): Guild | undefined {
    return this.client.guilds.get(this.interaction.guildID!);
  }

  public get channel(): AnyTextChannel | undefined {
    return this.interaction.channel;
  }

  public get commandName(): string {
    return this.interaction.data.name;
  }

  public get options(): InteractionOptionsWrapper {
    return this.interaction.data.options;
  }

  public async reply(options: InteractionContent) {
    return this.interaction.createMessage(options);
  }

  public async defer(flags?: number) {
    return this.interaction.defer(flags);
  }

  public async editReply(options: InteractionContent) {
    return this.interaction.editOriginal(options);
  }

  public async followUp(options: InteractionContent): Promise<Message> {
    return this.interaction.createFollowup(options);
  }

  public async deleteReply() {
    return this.interaction.deleteOriginal();
  }

  public t(str: string, ...args: any[]): string {
    return this.client.localizationManager.getString(this.member || this.user!, str, ...args);
  }

  public set(key: string, data: any) {
    this.data.set(key, data);
  }

  public get<T>(key: string): T {
    return this.data.get(key) as T;
  }

  public async collectButton({
    filter,
    messageID,
    timeout,
  }: CollectButtonOptions): Promise<ComponentInteraction | void> {
    return new Promise<ComponentInteraction | undefined>((resolve, reject) => {
      const listener = async (interaction: ComponentInteraction) => {
        if (interaction.type != 3 || interaction.message.id != messageID || !filter(interaction)) return;

        const timer = setTimeout(() => {
          this.client.off('interactionCreate', listener);
          resolve(undefined);
        }, timeout);

        this.client.off('interactionCreate', listener);
        clearTimeout(timer);
        resolve(interaction);
      };

      this.client.on('interactionCreate', listener);
    });
  }
}
