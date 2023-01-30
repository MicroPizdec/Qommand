import emojiRegex from 'emoji-regex';

type Style = 'primary' | 'secondary' | 'success' | 'danger' | 'link';
enum Styles {
  primary = 1,
  secondary,
  success,
  danger,
  link,
}

interface Emoji {
  id: string | null;
  name: string;
  animated?: boolean;
}

export class Button {
  public readonly type: number = 2;
  public custom_id?: string;
  public disabled?: boolean;
  public style: 1 | 2 | 3 | 4 | 5;
  public label?: string;
  public url?: string;
  public emoji?: Emoji;

  public setCustomID(id: string): this {
    this.custom_id = id;
    return this;
  }

  public setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    return this;
  }

  public setStyle(style: Style): this {
    this.style = Styles[style];
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
