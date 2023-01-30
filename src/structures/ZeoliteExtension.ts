import { ZeoliteClient } from '../ZeoliteClient';

/**
 * A class that represents an reloadable extension. As with ZeoliteCommand, you shouldn't instantiate this class directly.
 * @example
 * ```
 * export default class TestExtension extends ZeoliteExtension {
 *   // ...
 * }
 * ```
 */
export class ZeoliteExtension {
  public readonly client: ZeoliteClient;
  public name: string;
  public path: string;

  public constructor(client: ZeoliteClient) {
    this.client = client;
  }

  public onLoad(): unknown {
    throw new Error(`${this.constructor.name} doesn't have the onLoad() method.`);
  }

  public onUnload(): unknown {
    throw new Error(`${this.constructor.name} doesn't have the onUnload() method.`);
  }
}
