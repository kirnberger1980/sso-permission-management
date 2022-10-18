import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { OrgStackProps } from "./types/config";
import { orgEventPattern } from "./resources/event-patterns";

export class OrgEventsRuleBridgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: OrgStackProps) {
    super(scope, id, props);

    /**
     * Parameter Store Parameter Changed Event Triggering Assignment Function
     */
    new events.Rule(this, "OrgEventsRule", {
      eventPattern: orgEventPattern,
      targets: [new targets.EventBus(props.eventBus)]
    });

  }
}