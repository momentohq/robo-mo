FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:18

WORKDIR /usr/src/app

COPY ecs-code/dist/index.js ./
COPY ecs-code/package.json ./
RUN npm install

ENV DISCORD_BOT_TOKEN="DiscordBotToken"
ENV SLACK_TOKEN="SlackToken"
CMD ["npm", "run", "start"]

