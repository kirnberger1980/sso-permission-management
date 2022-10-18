import { Config } from "../lib/types/config";

export const SampleConfig : Config = {
  General: {
    IdentityStoreId: "<Your identity store id>",
    SsmParameterName: "/YOURORG/ASSIGNMENTCONFIG",
    SsoInstanceArn: "arn:aws:sso:::instance/ssoins-<IdOfYourSsoInstance>",
    TeamsWebhookUrl: "https://yourorg.webhook.office.com/webhookb2/webhookid"
  },
  AssignmentConfiguration: {
    AdDomain: "yourorg.com",
    GlobalAssignments: [
      {
        AdGroupName: "AD-GROUP-CLOUD-ADMINS",
        PermissionSet: "MyGlobalRole"
      }
      // Place your Global Assignments here
    ],
    OuAssignments: [
      {
        OuName: "FinanceUnit",
        Assignments: [
          {
            AdGroupName: "AD-GROUP-FINANCE-OPS",
            PermissionSet: "MyOuRole"
          }
        ]
        // Place your OU Assignments here
      }
    ],
    AccountAssignments: [
      {
        AccountName: "MyOrgSecurityAccount",
        Assignments: [
          {
            AdGroupName: "AD-GROUP-SEC_AUDIT",
            PermissionSet: "MyAccountRole"
          }
        ]
        // Place your Account Assignments here
      }
    ]
  },
  AssignmentFunction: {
    MemorySizeMb: 1024,
    TimeOutSeconds: 300
  }
}