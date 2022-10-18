import * as events from "aws-cdk-lib/aws-events";

/**
 * Event Pattern to be used for AWS Organizations API Events from CloudTrail
 */
export const orgEventPattern : events.EventPattern = {
  source: ["aws.organizations"],
  detailType: ["AWS API Call via CloudTrail"],
  detail: {
    eventSource: ["organizations.amazonaws.com"],
    eventName: ["CreateAccount",
      "CloseAccount",
      "MoveAccount",
      "CreateOrganizationalUnit",
      "DeleteOrganizationalUnit",
      "UpdateOrganizationalUnit",
      "RemoveAccountFromOrganization"]
  }
}