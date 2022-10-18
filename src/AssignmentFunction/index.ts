import { getAssignmentConfig } from "./services/ssm";
import { getDesiredAssignments, getCurrentAssignments, createAssignment, deleteAssignment, diffAssignments, clearPermissionSetCache} from "./services/sso";
import { OrgEventDetail, ParameterChangeEventDetail } from "./types/events";
import { EventBridgeEvent } from "aws-lambda";

export async function assignPermissionSets(event: EventBridgeEvent<string, OrgEventDetail | ParameterChangeEventDetail>) {

  console.log("👉 Event was triggered by:", event.source);
  console.debug("📢 Event message:", JSON.stringify(event));

  // load the assignment config from SSM parameter
  const assignmentConfig = await getAssignmentConfig();

  if (assignmentConfig) {
    // build the desired assignments from the assignment config
    const desiredAssignments = await getDesiredAssignments(assignmentConfig);
    console.log("ℹ️ ","Desired assignments", desiredAssignments.length, "\n");

    // build the current assignments from the provisioned
    const currentAssignments = await getCurrentAssignments(assignmentConfig.AdDomain);

    // determine the assignments to create & create them
    const assignmentsToCreate = diffAssignments(desiredAssignments, currentAssignments);
    console.log("ℹ️ ","Assignments to create:", assignmentsToCreate.length, "\n");
    for (let i=0; i<assignmentsToCreate.length; i++) {
      await createAssignment(assignmentsToCreate[i]);
    }

    // determine the assignments to delete & delete them
    const assignmentsToDelete = diffAssignments(currentAssignments, desiredAssignments);
    console.log("ℹ️ ","Assignments to delete:", assignmentsToDelete.length, "\n");
    for (let j=0; j<assignmentsToDelete.length; j++) {
      await deleteAssignment(assignmentsToDelete[j]);
    }
    // clear the "cache" of permission sets as it was before creation/deletion of new assignments
    clearPermissionSetCache();
  }
  return null;
}

// (async() => {
//   const accountId = await getAccountId("bdp-sandbox");
//   if (accountId) {
//     const assignments = await createAssignment(accountId, "AdminRole", "RESS_HV_SW_BC_OGS_DEV", "prod.d001.loc");
//     console.log(assignments);
//   }
//   console.time("assignments");
//   const assignmentProps = await getCurrentAssignments("prod.d001.loc");
//   console.log(assignmentProps);
//   console.timeEnd("assignments");
//   await assignPermissionSets({});
// })()