import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {MomentoVectorIndexChatDemoStack} from '../lib/mvi-chat-demo-stack';

// read from environment variable or panic
const chatDomain: string | undefined = process.env.MVI_CHAT_DOMAIN;
if (chatDomain === undefined) {
  throw new Error('MVI_CHAT_DOMAIN environment variable must be set');
}

let chatSubdomain: string | undefined = process.env.MVI_CHAT_SUBDOMAIN;
if (chatSubdomain === undefined) {
  console.log(
    'MVI_CHAT_SUBDOMAIN environment variable not set, using "mo-chat"'
  );
  chatSubdomain = 'mo-chat';
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
