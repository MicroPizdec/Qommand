import { Constants } from 'oceanic.js';
import { QContext } from './QContext';

declare module 'oceanic.js' {
  interface ClientEvents {
    noPermissions: [ctx: QContext, permissions: Constants.PermissionName[]];
    commandCooldown: [ctx: QContext, secondsLeft: number];
    ownerOnlyCommand: [ctx: QContext];
    guildOnlyCommand: [ctx: QContext];
    commandSuccess: [ctx: QContext];
    commandError: [ctx: QContext, error: Error];
  }
}