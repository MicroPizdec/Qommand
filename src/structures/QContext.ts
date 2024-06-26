import { QClient } from '../QClient';
import {
  CommandInteraction,
  User,
  Member,
  Guild,
  InteractionContent,
  Message,
  ComponentInteraction,
  AnyInteractionChannel,
  InteractionOptionsWrapper,
  InteractionResponseTypes,
  AnyInteractionGateway,
} from 'oceanic.js';
import { QCommand } from './QCommand';
import { FollowupMessageInteractionResponse } from 'oceanic.js/dist/lib/util/interactions/MessageInteractionResponse';

type Filter = (interaction: ComponentInteraction) => boolean;
interface CollectButtonOptions {
  filter: Filter;
  messageID: string;
  timeout?: number;
}

export class QContext {
  private data: Map<string, any> = new Map<string, any>();
  public acknowledged: boolean;

  public constructor(
    public readonly client: QClient,
    public readonly interaction: CommandInteraction,
    public readonly command: QCommand,
  ) {
    this.acknowledged = false;
  }

  /** An user who invoked the command */
  public get user(): User {
    return this.interaction.member?.user || this.interaction.user!;
  }

  /** A member who invoked the command */
  public get member(): Member | null {
    return this.interaction.member;
  }

  /** A guild where command had been invoked */
  public get guild(): Guild | undefined {
    return this.client.guilds.get(this.interaction.guildID!);
  }

  public get channel(): AnyInteractionChannel | undefined {
    return this.interaction.channel;
  }

  public get commandName(): string {
    return this.interaction.data.name;
  }

  public get options(): InteractionOptionsWrapper {
    return this.interaction.data.options;
  }

  /** An user's locale */
  public get locale(): string {
    return this.interaction.locale;
  }

  /**
   * Reply to interaction.
   * @param options Interaction content
   */
  public async reply(options: InteractionContent): Promise<void> {
    await this.client.rest.interactions.createInteractionResponse(this.interaction.id, this.interaction.token, {
      type: InteractionResponseTypes.CHANNEL_MESSAGE_WITH_SOURCE,
      data: options,
    });
    this.acknowledged = true;
  }

  /**
   * Defers the response.
   * @param flags Message flags. Use 64 if you want an ephemeral response.
   */
  public async defer(flags?: number): Promise<void> {
    await this.interaction.defer(flags);
    this.acknowledged = true;
  }

  /**
   * Edits the interaction response.
   * @param options 
   * @returns A interaction message object
   */
  public async editReply(options: InteractionContent): Promise<Message> {
    return this.interaction.editOriginal(options);
  }

  /**
   * Sends the followup message.
   * @param options Message content
   * @returns A followup message object
   */
  public async followUp(options: InteractionContent): Promise<FollowupMessageInteractionResponse<CommandInteraction>> {
    return this.interaction.createFollowup(options);
  }

  /**
   * Deletes the interaction response.
   */
  public async deleteReply(): Promise<void> {
    return this.interaction.deleteOriginal();
  }

  /**
   * Localizes the given string key.
   * @param str A string key
   * @param args Additional args which will be passed to the actual string
   * @returns A localized string
   */
  public t(str: string, ...args: any[]): string {
    return this.client.localizationManager.getString(this.user, str, ...args);
  }

  /**
   * Set the additional data
   * @param key Key
   * @param data Value
   */
  public set(key: string, data: any): void {
    this.data.set(key, data);
  }

  /**
   * 
   * @param key 
   * @returns 
   */
  public get<T>(key: string): T {
    return this.data.get(key) as T;
  }

  public async collectButton({ filter, messageID, timeout }: CollectButtonOptions): Promise<ComponentInteraction | void> {
    return new Promise<ComponentInteraction | undefined>((resolve, reject) => {
      const listener = async (interaction: AnyInteractionGateway) => {
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
