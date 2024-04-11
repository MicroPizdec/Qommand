import { QClient } from 'zeolitecore';
import path from 'path';

const client = new QClient({
  auth: 'Bot <insert your bot token here>',
});

client.on('ready', () => console.log('Ready!'));

(async () => {
  await client.commandsManager.setCommandsDir(path.join(__dirname, 'commands'))
    .loadAllCommands();

  await client.connect();
})();
