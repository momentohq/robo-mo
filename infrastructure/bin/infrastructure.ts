import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {MomentoVectorIndexChatDemoStack} from '../lib/mvi-chat-demo-stack';
import { RobomoDns } from '../lib/robomo-dns';

const isDevDeploy = process.env.IS_DEV_DEPLOY!;
const isProd = process.env.DEPLOY_ORG === 'prod';
const isCi = Boolean(process.env.MOCK_LOOKUPS_FOR_CI_SYNTH);

let chatDomain: string | undefined;
let streamlitDemoSubdomain: string | undefined =
  process.env.STREAMLIT_DEMO_SUBDOMAIN;
let langserveDemoSubdomain: string | undefined =
  process.env.LANGSERVE_DEMO_SUBDOMAIN;
if (isDevDeploy) {
  chatDomain = process.env.MVI_CHAT_DOMAIN;
  if (chatDomain === undefined) {
    throw new Error('MVI_CHAT_DOMAIN environment variable must be set');
  }
  if (streamlitDemoSubdomain === undefined) {
    console.log(
      'STREAMLIT_DEMO_SUBDOMAIN environment variable not set, using "mo-chat"'
    );
    streamlitDemoSubdomain = 'mo-chat';
  }
  if (langserveDemoSubdomain === undefined) {
    console.log(
      'LANGSERVE_DEMO_SUBDOMAIN environment variable not set, using "robomo-ls"'
    );
    langserveDemoSubdomain = 'robomo-ls';
  }
} else if (isProd) {
  chatDomain = 'mochat.momentohq.com';
  streamlitDemoSubdomain = 'web';
  langserveDemoSubdomain = 'robomo-ls';
} else {
  chatDomain = 'mochat.preprod.a.momentohq.com';
  streamlitDemoSubdomain = 'web';
  langserveDemoSubdomain = 'robomo-ls';
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
  {
    chatDomain,
    streamlitDemoSubdomain,
    langserveDemoSubdomain,
    isCi,
  },
  {
    stackName: 'mvi-chat-demo',
    ...env,
  }
);

new RobomoDns(
  app,
  'robo-mo-dns',
  {
    chatDomain,
  },
  {
    stackName: 'mvi-chat-dns',
    ...env,
  }
);
