import * as cdk from 'aws-cdk-lib';
import { CfnOutput } from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import {Construct} from 'constructs';

export class RobomoDns extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: {
      chatDomain: string;
    },
    cdkStackProps?: cdk.StackProps
  ) {
      super(scope, id, cdkStackProps);
      
    const hostedZone = new route53.HostedZone(this, 'mvi-chat-hosted-zone', {
      zoneName: props.chatDomain
    });
      
    
    new CfnOutput(this, 'mvi-hosted-zone-id-output', { value: hostedZone.hostedZoneId, exportName: 'mvi-hosted-zone-id' });
    new CfnOutput(this, 'mvi-hosted-zone-name-output', { value: hostedZone.zoneName, exportName: 'mvi-hosted-zone-name' });
  }
}
