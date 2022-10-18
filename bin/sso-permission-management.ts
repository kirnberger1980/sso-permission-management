#!/usr/bin/env node
import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { PermissionSetsStack } from "../lib/permission-sets-stack";
import { OrgEventsRuleBridgeStack } from "../lib/org-events-rule-bridge-stack";
import { SampleConfig } from "../values/sample";

const app = new App();
const pmStack = new PermissionSetsStack(app, "CF-STACK-SSO-PERMISSIONSETS", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT ,region: process.env.CDK_DEFAULT_REGION },
  config: SampleConfig
});
new OrgEventsRuleBridgeStack(app, "CF-STACK-SSO-EVENTRULE", {
  env:{ account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-1" },
  eventBus: pmStack.eventBus
});
