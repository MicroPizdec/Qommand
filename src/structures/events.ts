import { Constants } from 'oceanic.js';
import { ZeoliteContext } from './ZeoliteContext';

declare module 'oceanic.js' {
  interface ClientEvents {
    noPermissions: [ctx: ZeoliteContext, permissions: Constants.PermissionName[]];
    commandCooldown: [ctx: ZeoliteContext, secondsLeft: number];
    ownerOnlyCommand: [ctx: ZeoliteContext];
    guildOnlyCommand: [ctx: ZeoliteContext];
    commandSuccess: [ctx: ZeoliteContext];
    commandError: [ctx: ZeoliteContext, error: Error];
  }
}
