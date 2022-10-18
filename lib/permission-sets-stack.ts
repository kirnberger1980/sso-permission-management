import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sso from "aws-cdk-lib/aws-sso";
import { PermissionStackProps } from "./types/config";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { PowerUserRolePolicy } from "./resources/permission-set-policies";
import { getAssignmentFunctionPolicyStatements } from "./resources/assignment-function-policy";
import { orgEventPattern } from "./resources/event-patterns";

export class PermissionSetsStack extends cdk.Stack {

  public readonly eventBus: events.EventBus;

  constructor(scope: Construct, id: string, props: PermissionStackProps) {
    super(scope, id, props);


    /**
     * PermissionSet Example for a Global Assignment
     */
    new sso.CfnPermissionSet(this, "MyRole1PermissionSet", {
      instanceArn: props.config.General.SsoInstanceArn,
      name: "MyGlobalRole",
      managedPolicies: ["arn:aws:iam::aws:policy/AdministratorAccess"],
      // sessionDuration: "PT10H"
    });

    /**
     * PermissionSet for an OU Assignment
     */
    new sso.CfnPermissionSet(this, "MyOuRolePermissionSet",{
      instanceArn: props.config.General.SsoInstanceArn,
      name: "MyOuRole",
      managedPolicies: ["arn:aws:iam::aws:policy/PowerUserAccess"],
      inlinePolicy: PowerUserRolePolicy
    });

    /**
     * PermissionSet for an Account Assignment
     */
    new sso.CfnPermissionSet(this, "MyAccountRolePermissionSet", {
      instanceArn: props.config.General.SsoInstanceArn,
      name: "MyAccountRole",
      managedPolicies: ["arn:aws:iam::aws:policy/ReadOnlyAccess"]
    });

    /**
     * SSM Parameter to store the configuration of Assignments
     */
    const assignmentConfigParameter = new ssm.StringParameter(this, "AssignmentConfigParameter", {
      parameterName: props.config.General.SsmParameterName,
      stringValue: JSON.stringify(props.config.AssignmentConfiguration),
      description: "Assignment Configuration for managing assigments of permission sets."
    })

    /**
     * Node JS Lambda Function which is handling the Assignments of Accounts, IAM Roles und AD Groups
     */
    const assignmentFunction = new NodejsFunction(this, "AssignmentFunction", {
      memorySize: props.config.AssignmentFunction.MemorySizeMb,
      timeout: cdk.Duration.seconds(props.config.AssignmentFunction.TimeOutSeconds),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "assignPermissionSets",
      reservedConcurrentExecutions: 1,
      entry: path.join(__dirname, "/../src/AssignmentFunction/index.ts"),
      bundling: {
        minify: true,
        externalModules: ["aws-sdk"]
      },
      environment: {
        SSO_INSTANCE_ARN: props.config.General.SsoInstanceArn,
        CONFIG_PARAMETER_NAME: assignmentConfigParameter.parameterName,
        IDENTITY_STORE_ID: props.config.General.IdentityStoreId,
        MS_TEAMS_WEBHOOK_URL: props.config.General.TeamsWebhookUrl
      }
    });

    /** add all neccessary permissions to Lambda Function */
    getAssignmentFunctionPolicyStatements({ Ssm: { ParameterName: props.config.General.SsmParameterName }, IdentityStore: { IdentityStoreId: props.config.General.IdentityStoreId } }).forEach(policyStatement => assignmentFunction.addToRolePolicy(policyStatement));

    /**
     * Parameter Store Parameter Changed Event Triggering Assignment Function
     */
    new events.Rule(this, "ParameterChangeRule", {
      eventPattern:{
        source: ["aws.ssm"],
        detailType: ["Parameter Store Change"],
        detail: {
          name: [props.config.General.SsmParameterName],
          operation: [
            "Create",
            "Update",
            "LabelParameterVersion"
          ]
        }
      },
      targets: [new targets.LambdaFunction(assignmentFunction)]
    });

    /**
   * Event Bus for cross-region events from Organizations
   */
    this.eventBus = new events.EventBus(this, "OrgEventBus", {
      eventBusName: "OrgEventBus"
    });

    /**
     * Organization Changed Event Triggering Assignment Function
     */
    new events.Rule(this, "OrgEventsRule", {
      eventPattern: orgEventPattern,
      eventBus: this.eventBus,
      targets: [new targets.LambdaFunction(assignmentFunction)]
    })
  }
}
