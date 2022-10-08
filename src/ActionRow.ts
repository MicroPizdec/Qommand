import { MessageComponent } from "oceanic.js";

export class ActionRow {
  public readonly type: 1 = 1;
  public components: MessageComponent[];

  public constructor(...buttons: MessageComponent[]) {
    this.components = buttons;
  }
}
