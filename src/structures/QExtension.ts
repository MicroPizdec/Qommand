import { QClient } from '../QClient';

/**
 * A class that represents an reloadable extension. As with QCommand, you shouldn't instantiate this class directly.
 * @example
 * ```
 * export default class SampleExtension extends QExtension {
 *   // ...
 * }
 * ```
 */
export class QExtension {
  public readonly client: QClient;
  public name: string;
  public path: string;

  public constructor(client: QClient, data?: QExtensionData) {
    this.client = client;
    if (data) {
      this.name = data.name;
    }
  }

  public onLoad(): unknown {
    throw new Error(`${this.constructor.name} doesn't have the onLoad() method.`);
  }

  public onUnload(): unknown {
    throw new Error(`${this.constructor.name} doesn't have the onUnload() method.`);
  }

  public onExit(): any {}
}

export type QExtensionData = {
  name: string;
}
