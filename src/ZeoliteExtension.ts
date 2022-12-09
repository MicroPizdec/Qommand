import { ZeoliteClient } from './ZeoliteClient';

export class ZeoliteExtension {
  public readonly client: ZeoliteClient;
  public name: string;

  public constructor(client: ZeoliteClient) {
    this.client = client;
  }

  public onLoad(): void {
    throw new Error(`${this.constructor.name} doesn't have the onLoad() method.`);
  }

  public onUnload(): void {
    throw new Error(`${this.constructor.name} doesn't have the onUnload() method.`);
  }
}
