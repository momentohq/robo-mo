import * as path from 'path';
import {Construct} from 'constructs';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import {DockerImageAsset} from 'aws-cdk-lib/aws-ecr-assets';
import {LogGroup} from 'aws-cdk-lib/aws-logs';

export class RobomoDiscordBot extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: {
      discordTokenSecret: secrets.ISecret;
      slackTokenSecret: secrets.ISecret;
    }
  ) {
    super(scope, id);

    const cluster = new ecs.Cluster(this, 'DiscordBotFargateCluster');

    const imageAsset = new DockerImageAsset(this, 'DiscordBotECSDockerImage', {
      directory: path.join(__dirname, '../../../robo-mo-discord-bot'),
    });

    const logGroup = new LogGroup(this, 'Logs', {
      logGroupName: 'DiscordBotECSLogGroup',
    });

    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      'DiscordBotECS',
      {
        runtimePlatform: {
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
          cpuArchitecture: ecs.CpuArchitecture.X86_64,
        },
      }
    );
    taskDefinition.addContainer('DiscordBotECSContainer', {
      image: ecs.ContainerImage.fromDockerImageAsset(imageAsset),
      logging: new ecs.AwsLogDriver({
        logGroup: logGroup,
        streamPrefix: 'DiscordBotECS',
      }),
    });

    const policy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
        'logs:PutLogEvents',
        'logs:CreateLogStream',
        'ecs:*',
      ],
    });
    policy.addResources(
      cluster.clusterArn,
      taskDefinition.taskDefinitionArn,
      logGroup.logGroupArn
    );
    taskDefinition.addToTaskRolePolicy(policy);
    taskDefinition.addToExecutionRolePolicy(policy);

    props.discordTokenSecret.grantRead(taskDefinition.taskRole);
    props.slackTokenSecret.grantRead(taskDefinition.taskRole);

    new ecs.FargateService(this, 'DiscordBotECSFargateService', {
      cluster,
      taskDefinition,
    });
  }
}
