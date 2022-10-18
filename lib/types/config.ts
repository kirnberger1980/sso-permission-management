import { StackProps } from "aws-cdk-lib";
import { AssignmentConfig } from "../../src/AssignmentFunction/types/assignment-config"
import * as events from "aws-cdk-lib/aws-events";

export interface Config {
  General:  {
    SsoInstanceArn: string,
    IdentityStoreId: string,
    SsmParameterName: string,
    TeamsWebhookUrl: string
  },
  AssignmentFunction: {
    MemorySizeMb: number,
    TimeOutSeconds: number
  },
  AssignmentConfiguration: AssignmentConfig
}

export interface PermissionStackProps extends StackProps {
  config: Config
}

export interface OrgStackProps extends StackProps {
  eventBus: events.EventBus
}