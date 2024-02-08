import {Construct} from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import {Duration} from 'aws-cdk-lib';

export interface ScheduledReindexLambdaProps {
  robomoApiEndpoint: string;
  robomoIndexName: string;
}

export class ScheduledReindexLambda extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: ScheduledReindexLambdaProps
  ) {
    super(scope, id);

    const reindexLambda = new lambdaNodejs.NodejsFunction(
      this,
      'langserve-reindex-lambda',
      {
        functionName: 'langserve-reindex-lambda',
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(
          __dirname,
          '../../../lambdas/reindex-momento-data/handler.ts'
        ),
        projectRoot: path.join(__dirname, '../../../lambdas/reindex-momento-data'),
        depsLockFilePath: path.join(
          __dirname,
          '../../../lambdas/reindex-momento-data/package-lock.json'
        ),
        handler: 'handler',
        timeout: cdk.Duration.seconds(30),
        memorySize: 128,
        environment: {
          ROBOMO_API_ENDPOINT: props.robomoApiEndpoint,
          ROBOMO_INDEX_NAME: props.robomoIndexName,
        },
      }
    );

    const eventRule = new events.Rule(this, 'langserve-reindex-rule', {
      schedule: events.Schedule.rate(Duration.days(7)),
    });
    eventRule.addTarget(new targets.LambdaFunction(reindexLambda));
  }
}
