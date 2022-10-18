import { SSOAdminClient, ListAccountAssignmentsCommand, DescribePermissionSetCommand, ListPermissionSetsCommand, ListPermissionSetsCommandOutput, DescribePermissionSetCommandOutput, CreateAccountAssignmentCommand, DeleteAccountAssignmentCommand, ListAccountsForProvisionedPermissionSetCommand, DescribeAccountAssignmentCreationStatusCommand, DescribeAccountAssignmentDeletionStatusCommand } from "@aws-sdk/client-sso-admin"
import { getGroups } from "./identitystore";
import { listAllActiveAccounts, listActiveAccountsForOu } from "./organizations"
import { AssignmentProp } from "../types/services"
import { AssignmentConfig } from "../types/assignment-config"
import { IncomingWebhook } from "../teams/IncomingWebhook";

const InstanceArn = process.env.SSO_INSTANCE_ARN;
const webhook = new IncomingWebhook(process.env.MS_TEAMS_WEBHOOK_URL);
const client = new SSOAdminClient({ region: process.env.AWS_REGION });

let accounts : { id: string | undefined, name: string | undefined }[] = []
let groups : { groupName: string, groupId: string }[] = [];
let permissionSets : DescribePermissionSetCommandOutput[] = [];

/**
 * Loads AD Groups into the groups variable for further use
 */
async function loadGroups(adDomain: string) {
  if (!groups || groups.length === 0) {
    groups = await getGroups(adDomain);
  }
}

/**
 * Loads PermissionSets into the permissionSets variable for further use
 */
async function loadPermissionSets() {
  if (!permissionSets || permissionSets.length === 0) {
    permissionSets = await getPermissionSets();
  }
}

/**
 * empty rhe permissionSets variable. Use this function after deleting/creating permission Sets
 */
export async function clearPermissionSetCache() {
  if (permissionSets && permissionSets.length > 0) {
    permissionSets = []
  }
}

/**
 * Load Accounts into the accounts variable for further use
 */
async function loadAccounts() {
  if (!accounts || accounts.length == 0) {
    accounts = await listAllActiveAccounts();
  }
}

/**
 *
 * @param assignmentProps assignment properties
 * @returns the status message of the assignment creation
 */
export async function createAssignment(assignmentProps : AssignmentProp) {
  const caaCommand = new CreateAccountAssignmentCommand({
    InstanceArn,
    PermissionSetArn: assignmentProps.PermissionSetArn,
    PrincipalId: assignmentProps.PrincipalId,
    PrincipalType: "GROUP",
    TargetId: assignmentProps.TargetId,
    TargetType: "AWS_ACCOUNT"
  });
  const response = await client.send(caaCommand);
  let creationStatus = response.AccountAssignmentCreationStatus?.Status;
  let failureReason = response.AccountAssignmentCreationStatus?.FailureReason;
  while (creationStatus === "IN_PROGRESS") {
    console.log("🚧 Creation in progress for Assignment for Account", assignmentProps.AccountName,"with pemssion set", assignmentProps.PermissionSet, "and AD Group", assignmentProps.GroupName, ". Status:", creationStatus, "\n");
    const daacsCommand = new DescribeAccountAssignmentCreationStatusCommand({
      AccountAssignmentCreationRequestId: response.AccountAssignmentCreationStatus?.RequestId,
      InstanceArn
    });
    const daacsResponse = await client.send(daacsCommand);
    creationStatus = daacsResponse.AccountAssignmentCreationStatus?.Status;
    failureReason = daacsResponse.AccountAssignmentCreationStatus?.FailureReason;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (creationStatus === "SUCCEEDED") {
    console.log("✅ Successfully created Assignment for Account", assignmentProps.AccountName,"with pemssion set", assignmentProps.PermissionSet, "and AD Group", assignmentProps.GroupName, ". Status:", creationStatus, "\n");
    await sendAssignmentNotification(AssignmentAction.CREATE, NotificationType.SUCCESS, assignmentProps.AccountName || "N/A", assignmentProps.TargetId || "N/A", assignmentProps.PermissionSet || "N/A", assignmentProps.GroupName || "N/A");
  } else {
    console.error("🚨 Error creating Assignment for Account", assignmentProps.AccountName,"with pemssion set", assignmentProps.PermissionSet, "and AD Group", assignmentProps.GroupName, ". Status:", creationStatus, "\n");
    console.error("🚨 Failure Reason:", failureReason);
    await sendAssignmentNotification(AssignmentAction.CREATE, NotificationType.ERROR, assignmentProps.AccountName || "N/A", assignmentProps.TargetId || "N/A", assignmentProps.PermissionSet || "N/A", assignmentProps.GroupName || "N/A", failureReason);
  }
  return response.AccountAssignmentCreationStatus;
}

/**
 *
 * @param assignmentProps assignment properties
 * @returns the status message of the assignment deletion
 */
export async function deleteAssignment(assignmentProps: AssignmentProp) {
  const caaCommand = new DeleteAccountAssignmentCommand({
    PermissionSetArn: assignmentProps.PermissionSetArn,
    PrincipalId: assignmentProps.PrincipalId,
    InstanceArn,
    PrincipalType: "GROUP",
    TargetId: assignmentProps.TargetId,
    TargetType: "AWS_ACCOUNT"
  });
  const response = await client.send(caaCommand);
  let deletionStatus = response.AccountAssignmentDeletionStatus?.Status;
  let failureReason = response.AccountAssignmentDeletionStatus?.FailureReason;
  while (deletionStatus === "IN_PROGRESS") {
    console.debug("🚧 Deletion in progress for Assignment for Account", assignmentProps.AccountName,"with pemssion set", assignmentProps.PermissionSet, "and AD Group", assignmentProps.GroupName, ". Status:", deletionStatus);
    const daadsCommand = new DescribeAccountAssignmentDeletionStatusCommand({
      AccountAssignmentDeletionRequestId: response.AccountAssignmentDeletionStatus?.RequestId,
      InstanceArn
    });
    const daadsResponse = await client.send(daadsCommand);
    deletionStatus = daadsResponse.AccountAssignmentDeletionStatus?.Status;
    failureReason = daadsResponse.AccountAssignmentDeletionStatus?.FailureReason;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (deletionStatus === "SUCCEEDED") {
    console.log("✅ Successfully deleted Assignment for Account", assignmentProps.AccountName,"with pemssion set", assignmentProps.PermissionSet, "and AD Group", assignmentProps.GroupName, ". Status:", deletionStatus, "\n");
    await sendAssignmentNotification(AssignmentAction.DELETE, NotificationType.SUCCESS, assignmentProps.AccountName || "N/A", assignmentProps.TargetId || "N/A", assignmentProps.PermissionSet || "N/A", assignmentProps.GroupName || "N/A");
  } else {
    console.error("🚨 Error deleting Assignment for Account", assignmentProps.AccountName,"with pemssion set", assignmentProps.PermissionSet, "and AD Group", assignmentProps.GroupName, ". Status:", deletionStatus, "\n");
    console.error("🚨 Failure Reason:", failureReason);
    await sendAssignmentNotification(AssignmentAction.DELETE, NotificationType.ERROR, assignmentProps.AccountName || "N/A", assignmentProps.TargetId || "N/A", assignmentProps.PermissionSet || "N/A", assignmentProps.GroupName || "N/A", failureReason);
  }
  return response.AccountAssignmentDeletionStatus;
}

/**
 *
 * @param accountId AccountId where the permission set should be provisioned
 * @param permissionSet Name of the permission set (e.g. AdminRole)
 * @param adDomain Name of the AD Domain
 * @returns all current assignments for the account and permission set
 */
async function findAccountAssignments(accountId: string, permissionSet: string, adDomain: string) {
  await loadPermissionSets()
  await loadGroups(adDomain);
  await loadAccounts();
  const psd = permissionSets.find(pms => pms.PermissionSet?.Name === permissionSet);
  if (psd && psd.PermissionSet) {
    let NextToken = undefined;
    const accountAssignments = [];
    do {
      const laCommand: ListAccountAssignmentsCommand = new ListAccountAssignmentsCommand({
        AccountId: accountId,
        InstanceArn,
        PermissionSetArn: psd.PermissionSet.PermissionSetArn,
        NextToken
      });
      const response = await client.send(laCommand);
      if (response.AccountAssignments && response.AccountAssignments.length > 0) {
        accountAssignments.push(...response.AccountAssignments);
      }
      NextToken = response.NextToken;
    } while(NextToken);
    const assignments = accountAssignments?.map(assignment => {
      const assignmentProp : AssignmentProp = {
        PermissionSet: permissionSets.find(permissionSet => permissionSet.PermissionSet?.PermissionSetArn === assignment.PermissionSetArn)?.PermissionSet?.Name,
        PrincipalId: assignment.PrincipalId,
        TargetId: assignment.AccountId,
        AccountName: accounts.find(account => account.id === assignment.AccountId)?.name,
        PrincipalType: assignment.PrincipalType,
        PermissionSetArn: assignment.PermissionSetArn,
        GroupName: groups.find(group => group.groupId === assignment.PrincipalId)?.groupName
      }
      return assignmentProp;
    });
    return assignments;
  }
  return undefined;
}

/**
 *
 * @returns all permission sets that are currently deployed in the affected account & region
 */
async function getPermissionSets() {
  let NextToken = undefined;
  const permissionSetArns = [];
  do {
    const lpmCommand: ListPermissionSetsCommand = new ListPermissionSetsCommand({
      InstanceArn,
      NextToken
    });
    const lpmResponse: ListPermissionSetsCommandOutput = await client.send(lpmCommand);
    if (lpmResponse.PermissionSets) {
      permissionSetArns.push(...lpmResponse.PermissionSets);
    }
    NextToken = lpmResponse.NextToken;
  } while (NextToken);
  const promiseArray: Promise<DescribePermissionSetCommandOutput>[] = [];
  permissionSetArns.forEach(pma => {
    const dpaCommand = new DescribePermissionSetCommand({
      InstanceArn,
      PermissionSetArn: pma
    });
    const promise = client.send(dpaCommand);
    promiseArray.push(promise);
  });
  const pms : DescribePermissionSetCommandOutput[] = await Promise.all(promiseArray);
  console.log("✅ Successfully loaded permission sets.", "\n")
  return pms;
}

/**
 *
 * @param adDomain Name of the AD Domain
 * @returns all assignments provisioned in the account
 */
export async function getCurrentAssignments(adDomain: string) {
  const assignmentProps : AssignmentProp[] = [];
  await loadPermissionSets();
  await loadGroups(adDomain);
  for (let i=0; i<permissionSets.length; i++) {
    let NextToken = undefined;
    const accountIds: string[] = []
    do {
      const lafppsCommand : ListAccountsForProvisionedPermissionSetCommand = new ListAccountsForProvisionedPermissionSetCommand({
        InstanceArn,
        PermissionSetArn: permissionSets[i].PermissionSet?.PermissionSetArn,
        NextToken
      })
      const response = await client.send(lafppsCommand);
      if (response.AccountIds && response.AccountIds.length > 0) {
        accountIds.push(...response.AccountIds);
      }
      NextToken = response.NextToken;
    } while (NextToken);
    if (accountIds && accountIds.length > 0) {
      for (let j=0; j<accountIds.length; j++) {
        const assignments = await findAccountAssignments(accountIds[j], permissionSets[i].PermissionSet?.Name || "", adDomain);
        if (assignments) {
          assignmentProps.push(...assignments);
        }
      }
    }
  }
  return assignmentProps;
}

/**
 *
 * @param oneAssignmentList the list you want to check
 * @param anotherAssignmentList the other list which is used as substractor
 * @returns an assignment list which is oneAssignmentList minus anotherAssignmentList
 */
export function diffAssignments(oneAssignmentList: AssignmentProp[], anotherAssignmentList: AssignmentProp[]) {
  const assignmentDiff = oneAssignmentList.filter(oneAssignment => {
    const found = anotherAssignmentList.find(anotherAssignment => {
      return anotherAssignment.AccountName === oneAssignment.AccountName &&
        anotherAssignment.GroupName === oneAssignment.GroupName &&
        anotherAssignment.PermissionSet === oneAssignment.PermissionSet &&
        anotherAssignment.PermissionSetArn === oneAssignment.PermissionSetArn &&
        anotherAssignment.PrincipalId === oneAssignment.PrincipalId &&
        anotherAssignment.PrincipalType === oneAssignment.PrincipalType &&
        anotherAssignment.TargetId === oneAssignment.TargetId;
    });
    return !found;
  });
  return assignmentDiff;
}

/**
 *
 * @param assignmentConfig the assignment config object which is stored in the parameter store
 */
export async function getDesiredAssignments(assignmentConfig: AssignmentConfig) {
  const assignmentProps : AssignmentProp[] = [];
  await loadAccounts();
  await loadPermissionSets();
  await loadGroups(assignmentConfig.AdDomain);
  if (assignmentConfig.GlobalAssignments) {
    for (let i=0; i<assignmentConfig.GlobalAssignments?.length; i++) {
      if (assignmentConfig.GlobalAssignments[i]) {
        const permissionSet = permissionSets.find(ps => ps.PermissionSet?.Name === assignmentConfig.GlobalAssignments![i].PermissionSet)?.PermissionSet;
        const group = groups.find(group => group.groupName === assignmentConfig.GlobalAssignments![i].AdGroupName);
        if (permissionSet && group) {
          for (let j=0;j<accounts.length;j++) {
            assignmentProps.push({
              PermissionSetArn: permissionSet.PermissionSetArn,
              PrincipalId: group.groupId,
              TargetId: accounts[j].id,
              AccountName: accounts[j].name,
              PrincipalType: "GROUP",
              PermissionSet: permissionSet.Name,
              GroupName: group.groupName
            })
          }
        }
        console.debug("✅ getDesiredAssignments: Built global assignments for AD group", group?.groupName," with permission set",permissionSet?.Name);
      }
    }
  }
  if (assignmentConfig.OuAssignments && assignmentConfig.OuAssignments.length > 0) {  
    for (let i=0; i<assignmentConfig.OuAssignments.length; i++) {
      const accountsOu = await listActiveAccountsForOu(assignmentConfig.OuAssignments[i].OuName);
      if (!accountsOu || accountsOu.length === 0) {
        console.warn("🔁 getDesiredAssignments: No accounts found for ou", assignmentConfig.OuAssignments[i].OuName,". Skipping...")
      } else if (assignmentConfig.OuAssignments[i] && accountsOu) {
        for (let k=0;k<assignmentConfig.OuAssignments[i].Assignments.length;k++) {
          const group = groups.find(group => group.groupName === assignmentConfig.OuAssignments![i].Assignments[k].AdGroupName);
          const permissionSet = permissionSets.find(ps => ps.PermissionSet?.Name === assignmentConfig.OuAssignments![i].Assignments[k].PermissionSet)?.PermissionSet;
          if (permissionSet && group && group.groupId && permissionSet.PermissionSetArn) {
            console.debug("✅ getDesiredAssignments: Built OU assignments in ou",assignmentConfig.OuAssignments![i].OuName,"for group", group?.groupName,"with permission set", permissionSet?.Name);
            for (let j=0; j<accountsOu.length; j++) {
              assignmentProps.push({
                PermissionSetArn: permissionSet.PermissionSetArn,
                PrincipalId: group.groupId,
                TargetId: accountsOu[j].id,
                AccountName: accountsOu[j].name,
                PrincipalType: "GROUP",
                PermissionSet: permissionSet.Name,
                GroupName: group.groupName
              })
            }
          } else {
            console.warn("🔁 getDesiredAssignments: Skipping AD Group", assignmentConfig.OuAssignments[i].Assignments[k].AdGroupName, "with permission set", assignmentConfig.OuAssignments[i].Assignments[k].PermissionSet, ".");
          }
        }
      }
    }
  }
  if (assignmentConfig.AccountAssignments && assignmentConfig.AccountAssignments) {
    for (let i=0; i<assignmentConfig.AccountAssignments.length; i++) {
      const account = accounts.find(account => account.name === assignmentConfig.AccountAssignments![i].AccountName);
      for (let j=0; j<assignmentConfig.AccountAssignments[i].Assignments.length; j++) {
        if (assignmentConfig.AccountAssignments[i] && account && account.name && account.id) {
          const permissionSet = permissionSets.find(ps => ps.PermissionSet?.Name === assignmentConfig.AccountAssignments![i].Assignments[j].PermissionSet)?.PermissionSet;
          const group = groups.find(group => group.groupName === assignmentConfig.AccountAssignments![i].Assignments[j].AdGroupName);
          if (permissionSet && group) {
            assignmentProps.push({
              PermissionSetArn: permissionSet.PermissionSetArn,
              PrincipalId: group.groupId,
              TargetId: account.id,
              AccountName: account.name,
              PrincipalType: "GROUP",
              PermissionSet: permissionSet.Name,
              GroupName: group.groupName
            })
          }
        }
      }
    }
  }
  return assignmentProps;
}

async function sendAssignmentNotification(assignmentAction: AssignmentAction, notificationType: NotificationType, accountName: string, accountId: string, permissionSet: string, adGroup: string, failureReason?: string) {
  let summary;
  let themeColor;
  let activityText;
  const action = assignmentAction === AssignmentAction.CREATE ? "creating" : "deleting";
  if (notificationType === NotificationType.ERROR) {
    summary = "Error " + action +" assigment";
    themeColor = "ff0000";
    activityText= "Failure reason: " + failureReason;
  } else {
    summary = "Successfully "+ action + " assignment";
    themeColor = "00ff00";
  }
  await webhook.send({
    "@context": "http://schema.org/extensions",
    "@type": "MessageCard",
    summary,
    themeColor,
    sections: [{
      activityTitle: summary,
      activityText,
      activitySubtitle: (new Date()).toISOString(),
      markdown: true,
      facts: [{
        name: "Account",
        value: accountName + "(" + accountId + ")"
      },
      {
        name: "Permission Set",
        value: permissionSet
      },
      {
        name: "AD Group",
        value: adGroup
      }
      ]
    }]
  })
}

enum NotificationType {
  ERROR,
  SUCCESS
}

enum AssignmentAction {
  CREATE,
  DELETE
}