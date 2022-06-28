import { ZeoliteClient } from './ZeoliteClient';

export class ZeoliteExtension {
  public readonly client: ZeoliteClient;
  public name: string;

  public constructor(client: ZeoliteClient) {
    this.client = client;
  }

  public onLoad() {
    throw new Error('abstract class method.');
  }

  public onUnload() {
    throw new Error('abstract class method.');
  }
}
