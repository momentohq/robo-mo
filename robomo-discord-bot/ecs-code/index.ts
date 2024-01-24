import { WebClient } from '@slack/web-api';
import { Client, GatewayIntentBits } from 'discord.js';
import {GetSecretValueCommand, SecretsManagerClient} from '@aws-sdk/client-secrets-manager';

const _secretsClient = new SecretsManagerClient({});
const _cachedSecrets = new Map<string, string>();

async function main() {
  console.log("In main!");

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages] });

  const web = await getSlackClient();

  console.log("Initialized clients");
  
  let botId = "";
  const slackChannelId = "C06F6APVB6H";

  client.once('ready', readyClient => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
    botId = readyClient.user.id;
  });

  client.on('messageCreate', async (message) => {
    // Respond to any message that mentions the bot
    if (message.mentions.users.has(botId) && !message.author.bot) {
      // ping robo mo api endpoint to search docs and get response
      let roboMoAnswered = false;
      for (let i = 0; i < 3; i++) {
        try {
          const fetchResponse = await fetch("https://robomo-ls.mochat.momentohq.com/rag-momento-vector-index/invoke", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({input: message.cleanContent.replace('@RoboMo', '')}),
          });
          const roboMoAnswer = await fetchResponse.json();
          console.log("Answer?", roboMoAnswer);
          message.reply(roboMoAnswer['output']);
          roboMoAnswered = true;
          break;
        } catch (error) {
          console.log("Error fetching answer from RoboMo:", error);
          await sleep(1000);
        }
      }
      if (!roboMoAnswered) {
        message.reply("Sorry, I'm having trouble answering your question right now. Please try again later or ask in the support channel to request help from Momento staff.");
      }
    }

    // Cross-post messages in the #support channel to a Slack channel
    let supportChannel = message.guild?.channels.cache.find(channel => channel.name === "support");
    if (message.channel.id === supportChannel?.id  && !message.author.bot) {
      console.log("Support channel message: " + message.cleanContent);

      // make sure message is the first from a user in the last 5 minutes
      let lastElevenMessages = await message.channel.messages.fetch({ limit: 11 });
      const fiveMinutes = 5 * 60 * 1000;

      // get the id of the newest message in the last 11 messages because it's the one that was just posted
      let newestMessageId = lastElevenMessages.reduce((newest, obj) => newest === null ? obj : obj.createdTimestamp > newest.createdTimestamp ? obj : newest).id;

      if (lastElevenMessages.some(m => m.id !== newestMessageId && m.author.id === message.author.id && Date.now() - m.createdTimestamp < fiveMinutes)) {
        console.log("Not posting message to Slack because user has posted in the last 5 minutes");
      } else {
        // retry posting to slack 3 times before logging failure
        for (let i = 0; i < 3; i++) {
          try {
            const result = await web.chat.postMessage({
              text: `Discord user requesting support: ${message.cleanContent} \nhttps://discord.com/channels/${message.guild?.id}/${message.channel.id}/${message.id}`,
              channel: slackChannelId,
            });
            console.log(`Successfully sent message ${result.ts} in conversation ${result.channel}`);
            break;
          } catch (error) {
            console.error(`Error posting message to Slack: ${error}`);
            await sleep(1000);
          }
        }
      }
    }
  });

  const discordToken = await getSecret("DiscordBotToken");
  client.login(discordToken);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getSlackClient(): Promise<WebClient> {
  const token = await getSecret("SlackToken");
  const client = new WebClient(token);
  console.log("Created Slack client");
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
.then(() => console.log("Main complete!"))
.catch((error) => console.error("Error in main:", error));

