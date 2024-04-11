import { AnyInteractionGateway, ComponentInteraction, Message } from 'oceanic.js';
import EventEmitter from 'events';
import { QClient } from '../QClient';

type Filter = (interaction: ComponentInteraction) => boolean;

export interface ZeoliteInteractionCollectorOptions {
  message: Message;
  filter: Filter;
  time: number;
}

export declare interface ZeoliteInteractionCollector {
  on(event: 'collect', listener: (interaction: ComponentInteraction) => void | Promise<void>): this;
  off(event: 'collect', listener: (interaction: ComponentInteraction) => void | Promise<void>): this;
  emit(event: 'collect', interaction: ComponentInteraction): boolean;
}

export class ZeoliteInteractionCollector extends EventEmitter {
  public readonly client: QClient;
  public filter: Filter;
  public message: Message;
  public time: number;

  private timeout: NodeJS.Timeout;
  private boundListener: typeof this.listener;

  public constructor(client: QClient, options: ZeoliteInteractionCollectorOptions) {
    super();

    this.client = client;
    this.filter = options.filter;
    this.message = options.message;
    this.time = options.time;

    this.boundListener = this.listener.bind(this);
    this.client.on('interactionCreate', this.boundListener);
    this.timeout = setTimeout(() => this.stop(), this.time);
  }

  private async listener(interaction: AnyInteractionGateway) {
    if (interaction.type != 3 || interaction.message.id != this.message.id || !this.filter(interaction)) return;

    this.emit('collect', interaction);
  }

  public stop() {
    this.client.off('interactionCreate', this.boundListener);
    clearTimeout(this.timeout);
  }
}
