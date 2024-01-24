import * as path from 'path';
import {Construct} from 'constructs';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import 'dotenv/config';

export class RobomoDiscordBot extends Construct {
  constructor(
    scope: Construct, 
    id: string, 
    props: {
      discordTokenSecret: secrets.ISecret, 
      slackTokenSecret: secrets.ISecret
    }
  ) {
      super(scope, id);

      const cluster = new ecs.Cluster(this, 'DiscordBotFargateCluster');

      const imageAsset = new DockerImageAsset(this, "DiscordBotECSDockerImage", {
        directory: path.join(__dirname, "../../robomo-discord-bot")
      });

      const taskDefinition = new ecs.FargateTaskDefinition(this, 'DiscordBotECS', {
        runtimePlatform: {
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
          cpuArchitecture: ecs.CpuArchitecture.X86_64,
        }
      });
      taskDefinition.addContainer('DiscordBotECSContainer', {
        image: ecs.ContainerImage.fromDockerImageAsset(imageAsset),
        logging: new ecs.AwsLogDriver({
          streamPrefix: "DiscordBotECS"
        }),
      });

      const policy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "secretsmanager:GetSecretValue",
          "logs:PutLogEvents",
          "logs:CreateLogStream",
          "ecs:*"
        ],
      });
      policy.addResources(
        props.discordTokenSecret.secretArn, 
        props.slackTokenSecret.secretArn,
        cluster.clusterArn, 
        taskDefinition.taskDefinitionArn
      );
      taskDefinition.addToTaskRolePolicy(policy);
      taskDefinition.addToExecutionRolePolicy(policy);

      new ecs.FargateService(this, 'DiscordBotECSFargateService', {
        cluster,
        taskDefinition,
      });
  }
}
