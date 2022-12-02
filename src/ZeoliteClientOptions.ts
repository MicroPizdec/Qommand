import { ClientOptions } from 'oceanic.js';

export interface ZeoliteClientOptions extends ClientOptions {
  owners: string[];
  debug?: boolean;
}
