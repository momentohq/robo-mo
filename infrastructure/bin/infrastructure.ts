import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MomentoVectorIndexChatDemoStack } from '../lib/mvi-chat-demo-stack';

const isDevDeploy = process.env.IS_DEV_DEPLOY!!;
const isProd = process.env.DEPLOY_ORG === 'prod';

let chatDomain: string | undefined = "";
let chatSubdomain: string | undefined = process.env.MVI_CHAT_SUBDOMAIN;
if (isDevDeploy) {
  chatDomain = process.env.MVI_CHAT_DOMAIN;
  if (chatDomain === undefined) {
    throw new Error('MVI_CHAT_DOMAIN environment variable must be set');
  }
  if (chatSubdomain === undefined) {
    console.log(
      'MVI_CHAT_SUBDOMAIN environment variable not set, using "mo-chat"'
    );
    chatSubdomain = 'mo-chat';
  }
} else if (isProd) {
  chatDomain = "mochat.momentohq.com"
  chatSubdomain = "web"
} else {
  chatDomain = "mochat-preprod.momentohq.com"
  chatSubdomain = "web"
}

const app = new cdk.App();
const env = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
};

new MomentoVectorIndexChatDemoStack(
  app,
  'robo-mo',
  chatSubdomain,
  chatDomain,
  {
    stackName: 'mvi-chat-demo',
    ...env,
  }
);
