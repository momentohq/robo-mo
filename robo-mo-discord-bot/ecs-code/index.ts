import {WebClient} from '@slack/web-api';
import {Client, GatewayIntentBits} from 'discord.js';
import {GetSecretValueCommand, SecretsManagerClient} from '@aws-sdk/client-secrets-manager';

const _secretsClient = new SecretsManagerClient({});
const _cachedSecrets = new Map<string, string>();

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages],
  });
  const web = await getSlackClient();
  const slackChannelId = 'C06F6APVB6H';

  client.once('ready', readyClient => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
  });

  client.on('messageCreate', async message => {
    // Cross-post messages in the #support or #general channel to a Slack channel
    const supportChannels =
      message.guild?.channels.cache.filter(
        channel => channel.name.includes('support') || channel.name.includes('general')
      ) || [];
    for (const supportChannel of supportChannels.values()) {
      if (message.channel.id === supportChannel?.id && !message.author.bot) {
        console.log('Support channel message: ' + message.cleanContent);

        // get the id of the newest message in the last 11 messages because it's the one that was just posted
        const lastElevenMessages = await message.channel.messages.fetch({limit: 11});
        const fiveMinutes = 5 * 60 * 1000;
        const newestMessageId = lastElevenMessages.reduce((newest, obj) =>
          newest === null ? obj : obj.createdTimestamp > newest.createdTimestamp ? obj : newest
        ).id;

        // make sure message is the first from a user in the last 5 minutes (don't want to spam our Slack channel)
        if (
          lastElevenMessages.some(
            m =>
              m.id !== newestMessageId &&
              m.author.id === message.author.id &&
              Date.now() - m.createdTimestamp < fiveMinutes
          )
        ) {
          console.log('Not posting message to Slack because user has posted in the last 5 minutes');
        } else {
          // retry posting to slack 3 times before logging failure
          for (let i = 0; i < 3; i++) {
            try {
              const result = await web.chat.postMessage({
                text: `${message.author.displayName} requesting support: ${message.cleanContent} \nhttps://discord.com/channels/${message.guild?.id}/${message.channel.id}/${message.id}`,
                channel: slackChannelId,
              });
              console.log(`Successfully sent message ${result.ts} in conversation ${result.channel}`);
              break;
            } catch (error) {
              console.error('Error posting message to Slack', error);
              await sleep(1000);
            }
          }
        }
      }
    }
  });

  const discordToken: string = await getSecret('DiscordBotToken');
  await client.login(discordToken);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getSlackClient(): Promise<WebClient> {
  const token: string = await getSecret('SlackToken');
  const client = new WebClient(token);
  return client;
}

async function getSecret(secretName: string): Promise<string> {
  if (!_cachedSecrets.has(secretName)) {
    const secretResponse = await _secretsClient.send(new GetSecretValueCommand({SecretId: secretName}));
    if (secretResponse) {
      _cachedSecrets.set(secretName, secretResponse.SecretString!);
    } else {
      throw new Error(`Unable to retrieve secret: ${secretName}`);
    }
  }
  return _cachedSecrets.get(secretName)!;
}

main()
  .then(() => console.log('Main complete!'))
  .catch(error => console.error('Error in main:', error));
