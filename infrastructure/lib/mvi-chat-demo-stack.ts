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

export class MomentoVectorIndexChatDemoStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    chatSubdomain: string,
    chatDomain: string,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    const openAiApiKeySecret = secrets.Secret.fromSecretNameV2(this, 'open-ai-api-key-secret', 'mvi/OpenAiApiKey');

    const momentoApiKeySecret = secrets.Secret.fromSecretNameV2(this, 'momento-api-key-secret', 'mvi/MomentoApiKey');

    const vpc = new ec2.Vpc(this, 'mvi-chat-demo-network', {
      vpcName: 'mvi-chat-demo-network',
      maxAzs: 2,
    });

    // ALB for TLS
    const loadBalancerSecurityGroup = new ec2.SecurityGroup(
      this,
      'mvi-chat-demo-alb-sg',
      {
        securityGroupName: 'mvi-chat-demo-alb-sg',
        vpc: vpc,
      }
    );
    loadBalancerSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.allTcp()
    );
    const loadBalancer = new elbv2.ApplicationLoadBalancer(
      this,
      'mvi-chat-demo-alb',
      {
        vpc: vpc,
        internetFacing: true,
        securityGroup: loadBalancerSecurityGroup,
      }
    );

    // Register the mo-chat subdomain and create a certificate for it
    const hostedZone = new route53.HostedZone(this, 'mvi-chat-hosted-zone', {
      zoneName: chatDomain
    });

    new route53.ARecord(this, 'mvi-chat-demo-dns-a-record', {
      zone: hostedZone,
      recordName: chatSubdomain,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.LoadBalancerTarget(loadBalancer)
      ),
    });

    const certificate = new certmgr.Certificate(this, 'mvi-chat-demo-cert', {
      domainName: `${chatSubdomain}.${chatDomain}`,
      validation: certmgr.CertificateValidation.fromDns(hostedZone),
    });

    const listener = loadBalancer.addListener('mvi-chat-demo-alb-listener', {
      port: 443,
      certificates: [
        elbv2.ListenerCertificate.fromCertificateManager(certificate),
      ],
    });

    // Chat demo Fargate service
    const cluster = new ecs.Cluster(this, 'mvi-chat-demo-cluster', {
      clusterName: 'mvi-chat-demo-cluster',
      vpc,
    });

    const chatDemoTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      'mvi-chat-demo-task-definition',
      {
        cpu: 1024,
        memoryLimitMiB: 2048,
        runtimePlatform: {
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
          cpuArchitecture: ecs.CpuArchitecture.X86_64,
        },
      }
    );
    openAiApiKeySecret.grantRead(chatDemoTaskDefinition.taskRole);
    momentoApiKeySecret.grantRead(chatDemoTaskDefinition.taskRole);

    const chatDemoPort = 80;
    chatDemoTaskDefinition.addContainer('mvi-chat-demo-container', {
      containerName: 'chat-demo',
      image: ecs.ContainerImage.fromAsset('../', {
        platform: Platform.LINUX_AMD64,
      }),
      environment: {
        MOMENTO_API_KEY_SECRET_NAME: `${momentoApiKeySecret.secretName}`,
        OPENAI_API_KEY_SECRET_NAME: `${openAiApiKeySecret.secretName}`,
        AWS_REGION: `${this.region}`,
        STREAMLIT_SERVER_ADDRESS: '0.0.0.0',
        STREAMLIT_SERVER_PORT: `${chatDemoPort}`,
        STREAMLIT_SERVER_HEADLESS: 'true',
      },
      command: ['poetry', 'run', 'streamlit', 'run', 'robo_mo/chatbot.py'],
      portMappings: [{containerPort: chatDemoPort, hostPort: chatDemoPort}],
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'chat-demo',
      }),
    });

    const chatDemoSecurityGroup = new ec2.SecurityGroup(
      this,
      'mvi-chat-demo-security-group',
      {
        securityGroupName: 'chat-demo',
        vpc,
      }
    );
    chatDemoSecurityGroup.connections.allowFrom(
      loadBalancerSecurityGroup,
      ec2.Port.tcp(chatDemoPort)
    );

    const chatService = new ecs.FargateService(this, 'mvi-chat-demo-service', {
      serviceName: 'chat-demo',
      cluster,
      taskDefinition: chatDemoTaskDefinition,
      securityGroups: [chatDemoSecurityGroup],
    });

    listener.addTargets('mvi-chat-demo-target', {
      port: chatDemoPort,
      targets: [chatService],
      protocol: elbv2.ApplicationProtocol.HTTP,
    });
  }
}
