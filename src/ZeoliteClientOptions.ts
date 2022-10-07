import { ClientOptions } from 'oceanic.js';

export interface ZeoliteClientOptions extends ClientOptions {
  cmdDirPath: string;
  owners: string[];
  extDirPath: string;
  langsDirPath: string;
  debug?: boolean;
}
