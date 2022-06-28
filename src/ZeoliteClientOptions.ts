import { ClientOptions } from 'eris';

export interface ZeoliteClientOptions extends ClientOptions {
  cmdDirPath: string;
  owners: string[];
  extDirPath: string;
  debug?: boolean;
}
