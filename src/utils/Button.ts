import emojiRegex from 'emoji-regex';
import { ButtonStyles } from 'oceanic.js';

interface Emoji {
  id: string | null;
  name: string;
  animated?: boolean;
}

export class Button {
  public readonly type: number = 2;
  public customID?: string;
  public disabled?: boolean;
  public style: ButtonStyles;
  public label?: string;
  public url?: string;
  public emoji?: Emoji;

  public setCustomID(id: string): this {
    this.customID = id;
    return this;
  }

  public setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    return this;
  }

  public setStyle(style: ButtonStyles): this {
    this.style = style;
    return this;
  }

  public setLabel(label: string): this {
    if (label.length > 80) {
      throw new RangeError("label length shouldn't be more than 80 chars.");
    }

    this.label = label;
    return this;
  }

  public setURL(url?: string): this {
    this.url = url;
    return this;
  }

  public setEmoji(emoji: string): this {
    if (!/<a:.+?:\d+>|<:.+?:\d+>/g.test(emoji) && !emojiRegex().test(emoji)) {
      throw new TypeError('invalid emoji');
    }

    const id = emoji.match(/(?<=:)\d+/g)![0];
    const name = emoji.match(/(?<=:)\d+/g)![0] || emoji;
    const animated = /<a/.test(emoji);

    this.emoji = {
      id: id || null,
      name,
      animated,
    };
    return this;
  }
}
