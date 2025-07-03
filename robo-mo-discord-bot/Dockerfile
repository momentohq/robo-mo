FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:20

WORKDIR /usr/src/app

COPY ecs-code/dist/index.js ./
COPY ecs-code/package.json ./
RUN npm install

CMD ["npm", "run", "start"]

