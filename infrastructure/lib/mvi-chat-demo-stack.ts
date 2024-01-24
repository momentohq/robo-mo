import * as cdk from 'aws-cdk-lib';
import * as certmgr from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import {Platform} from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import {Construct} from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import {Duration} from 'aws-cdk-lib';

export class MomentoVectorIndexChatDemoStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: {
      chatDomain: string;
      streamlitDemoSubdomain: string;
      langserveDemoSubdomain: string;
      isCi: boolean;
    },
    cdkStackProps?: cdk.StackProps
  ) {
    super(scope, id, cdkStackProps);

    const openAiApiKeySecret = secrets.Secret.fromSecretNameV2(
      this,
      'open-ai-api-key-secret',
      'mvi/OpenAiApiKey'
    );

    const momentoApiKeySecret = secrets.Secret.fromSecretNameV2(
      this,
      'momento-api-key-secret',
      'mvi/MomentoApiKey'
    );

    const vpc = new ec2.Vpc(this, 'mvi-chat-demo-network', {
      vpcName: 'mvi-chat-demo-network',
      maxAzs: 2,
    });

    // Register the mo-chat subdomain and create a certificate for it
    let hostedZone: cdk.aws_route53.IHostedZone;
    if (props.isCi) {
      hostedZone = new route53.HostedZone(this, 'mvi-chat-hosted-zone', {
        zoneName: props.chatDomain,
      });
    } else {
      hostedZone = route53.HostedZone.fromLookup(this, 'mvi-chat-hosted-zone', {
        domainName: props.chatDomain,
      });
    }

    this.addEcsApp({
      appName: 'mvi-chat-demo',
      chatSubdomain: props.streamlitDemoSubdomain,
      chatDomain: props.chatDomain,
      containerPort: 80,
      dockerFilePath: '../',
      additionalEnvVars: {
        STREAMLIT_SERVER_ADDRESS: '0.0.0.0',
        STREAMLIT_SERVER_PORT: `${80}`,
        STREAMLIT_SERVER_HEADLESS: 'true',
      },
      dockerCommand: [
        'poetry',
        'run',
        'streamlit',
        'run',
        'robo_mo/chatbot.py',
      ],
      vpc,
      hostedZone,
      openAiApiKeySecret,
      momentoApiKeySecret,
    });

    this.addEcsApp({
      appName: 'langserve-robomo',
      chatSubdomain: props.langserveDemoSubdomain,
      chatDomain: props.chatDomain,
      containerPort: 8080,
      dockerFilePath: '../langchain-robomo',
      additionalEnvVars: {},
      vpc,
      hostedZone,
      openAiApiKeySecret,
      momentoApiKeySecret,
    });
    const reindexLambda = new lambdaNodejs.NodejsFunction(
      this,
      'langserve-reindex-lambda',
      {
        functionName: 'langserve-reindex-lambda',
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(
          __dirname,
          '../../lambdas/reindex-momento-data/handler.ts'
        ),
        projectRoot: path.join(__dirname, '../../lambdas/reindex-momento-data'),
        depsLockFilePath: path.join(
          __dirname,
          '../../lambdas/reindex-momento-data/package-lock.json'
        ),
        handler: 'handler',
        timeout: cdk.Duration.seconds(30),
        memorySize: 128,
        environment: {
          ROBOMO_API_ENDPOINT: `${props.langserveDemoSubdomain}.${props.chatDomain}`,
          ROBOMO_INDEX_NAME: 'momento', // TODO: make this configurable
        },
      }
    );

    const eventRule = new events.Rule(this, 'langserve-reindex-rule', {
      schedule: events.Schedule.rate(Duration.days(7)),
    });

    eventRule.addTarget(new targets.LambdaFunction(reindexLambda));
  }

  addEcsApp(options: {
    appName: string;
    chatSubdomain: string;
    chatDomain: string;
    containerPort: number;
    dockerFilePath: string;
    additionalEnvVars: {[key: string]: string};
    dockerCommand?: string[];
    vpc: ec2.Vpc;
    hostedZone: route53.IHostedZone;
    openAiApiKeySecret: secrets.ISecret;
    momentoApiKeySecret: secrets.ISecret;
  }) {
    // ALB for TLS
    const loadBalancerSecurityGroup = new ec2.SecurityGroup(
      this,
      `${options.appName}-alb-sg`,
      {
        securityGroupName: `${options.appName}-alb-sg`,
        vpc: options.vpc,
      }
    );
    loadBalancerSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.allTcp()
    );
    const loadBalancer = new elbv2.ApplicationLoadBalancer(
      this,
      `${options.appName}-alb`,
      {
        idleTimeout: cdk.Duration.seconds(60 * 10),
        vpc: options.vpc,
        internetFacing: true,
        securityGroup: loadBalancerSecurityGroup,
      }
    );

    new route53.ARecord(this, `${options.appName}-dns-a-record`, {
      zone: options.hostedZone,
      recordName: options.chatSubdomain,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.LoadBalancerTarget(loadBalancer)
      ),
    });

    const certificate = new certmgr.Certificate(
      this,
      `${options.appName}-cert`,
      {
        domainName: `${options.chatSubdomain}.${options.chatDomain}`,
        validation: certmgr.CertificateValidation.fromDns(options.hostedZone),
      }
    );

    const listener = loadBalancer.addListener(
      `${options.appName}-alb-listener`,
      {
        port: 443,
        certificates: [
          elbv2.ListenerCertificate.fromCertificateManager(certificate),
        ],
      }
    );

    // Chat demo Fargate service
    const cluster = new ecs.Cluster(this, `${options.appName}-cluster`, {
      clusterName: `${options.appName}-cluster`,
      vpc: options.vpc,
    });

    const chatDemoTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      `${options.appName}-task-definition`,
      {
        cpu: 1024,
        memoryLimitMiB: 2048,
        runtimePlatform: {
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
          cpuArchitecture: ecs.CpuArchitecture.X86_64,
        },
      }
    );
    options.openAiApiKeySecret.grantRead(chatDemoTaskDefinition.taskRole);
    options.momentoApiKeySecret.grantRead(chatDemoTaskDefinition.taskRole);

    chatDemoTaskDefinition.addContainer(`${options.appName}-container`, {
      containerName: options.appName,
      image: ecs.ContainerImage.fromAsset(options.dockerFilePath, {
        platform: Platform.LINUX_AMD64,
      }),
      environment: {
        MOMENTO_API_KEY_SECRET_NAME: `${options.momentoApiKeySecret.secretName}`,
        OPENAI_API_KEY_SECRET_NAME: `${options.openAiApiKeySecret.secretName}`,
        AWS_REGION: `${this.region}`,
        ...options.additionalEnvVars,
      },
      command: options.dockerCommand,
      portMappings: [
        {containerPort: options.containerPort, hostPort: options.containerPort},
      ],
      logging: new ecs.AwsLogDriver({
        streamPrefix: options.appName,
      }),
    });

    const chatDemoSecurityGroup = new ec2.SecurityGroup(
      this,
      `${options.appName}-security-group`,
      {
        securityGroupName: options.appName,
        vpc: options.vpc,
      }
    );
    chatDemoSecurityGroup.connections.allowFrom(
      loadBalancerSecurityGroup,
      ec2.Port.tcp(options.containerPort)
    );

    const chatService = new ecs.FargateService(
      this,
      `${options.appName}-service`,
      {
        serviceName: options.appName,
        cluster,
        taskDefinition: chatDemoTaskDefinition,
        securityGroups: [chatDemoSecurityGroup],
      }
    );

    listener.addTargets(`${options.appName}-target`, {
      port: options.containerPort,
      targets: [chatService],
      protocol: elbv2.ApplicationProtocol.HTTP,
      healthCheck: {
        healthyHttpCodes: '200,307',
      },
    });
  }
}
