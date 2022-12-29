import { ZeoliteClient, ZeoliteCommand, ZeoliteContext } from "zeolitecore";

export default class TestCommand extends ZeoliteCommand {
  constructor(client: ZeoliteClient) {
    super(client, {
      name: 'test',
      description: 'testing...',
    });
  }

  async run(ctx: ZeoliteContext) {
    await ctx.reply({ content: 'it works!' });
  }
}