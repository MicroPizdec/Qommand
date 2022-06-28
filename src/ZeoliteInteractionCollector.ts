import { ComponentInteraction, Message } from 'eris';
import EventEmitter from 'events';
import { ZeoliteClient } from './ZeoliteClient';

type Filter = (interaction: ComponentInteraction) => boolean;

export interface ZeoliteInteractionCollectorOptions {
  message: Message;
  filter: Filter;
  time: number;
}

export declare interface ZeoliteInteractionCollector {
  on(event: 'collect', listener: (interaction: ComponentInteraction) => void | Promise<void>): this;
  emit(event: 'collect', interaction: ComponentInteraction): boolean;
}

export class ZeoliteInteractionCollector extends EventEmitter {
  public readonly client: ZeoliteClient;
  public filter: Filter;
  public message: Message;
  public time: number;

  private timeout: NodeJS.Timeout;
  private boundListener: typeof this.listener;

  public constructor(client: ZeoliteClient, options: ZeoliteInteractionCollectorOptions) {
    super();

    this.client = client;
    this.filter = options.filter;
    this.message = options.message;
    this.time = options.time;

    this.boundListener = this.listener.bind(this);
    this.client.on('interactionCreate', this.boundListener);
    this.timeout = setTimeout(() => this.stop(), this.time);
  }

  private async listener(interaction: ComponentInteraction) {
    if (interaction.type != 3 || interaction.message.id != this.message.id || !this.filter(interaction)) return;

    this.emit('collect', interaction);
  }

  public stop() {
    this.client.off('interactionCreate', this.boundListener);
    clearTimeout(this.timeout);
  }
}
