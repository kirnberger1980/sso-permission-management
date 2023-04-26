import { PolicyStatement} from "aws-cdk-lib/aws-iam";
import * as statement from "cdk-iam-floyd";
import { StatementProps } from "../types/resources";

/**
 * get all neccessary policy statements for the Assignment LambdaFunction
*/
export function getAssignmentFunctionPolicyStatements(statementProps: StatementProps) {
  /**
   * Array of PolicyStatements for Assignment LambdaFunction
   */
  const AssignmentFunctionPolicyStatements : PolicyStatement[] = [];

  /**
   * Permissions for IAM to get SAMLProviders
   */
  AssignmentFunctionPolicyStatements.push(new statement.Iam().allow()
    .toGetSAMLProvider()
    .toCreateRole()
    .toPutRolePolicy()
    .toAttachRolePolicy()
    .onAllResources());

  /**
   * Permssions for Identity Store Service (used by AWS IAM Identity Center)
   */
  AssignmentFunctionPolicyStatements.push(new statement.Identitystore().allow()
    .toListGroups().onIdentitystore(statementProps.IdentityStore.IdentityStoreId).onAllGroups("*"));

  /**
   * Permissions for AWS Organizations
   */
  AssignmentFunctionPolicyStatements.push(new statement.Organizations().allow()
    .toListAccountsForParent().onAllResources()
    .toListOrganizationalUnitsForParent().onAllResources()
    .toListRoots().onAllResources()
    .toListChildren().onAllResources()
    .toDescribeOrganizationalUnit().onAllResources()
    .toListAccounts().onAllResources());

  /**
   * Permissions for AWS Systems Manager ParameterStore
   */
  AssignmentFunctionPolicyStatements.push(new statement.Ssm().allow().toGetParameter().onParameter(statementProps.Ssm.ParameterName.replace(/^\//, "")));

  /**
   * Permissions for AWS SSO
   */
  AssignmentFunctionPolicyStatements.push(new statement.Sso().allow()
    .toListAccountAssignments().onAllResources()
    .toDescribePermissionSet().onAllResources()
    .toListPermissionSets().onAllResources()
    .toCreateAccountAssignment().onAllResources()
    .toDeleteAccountAssignment().onAllResources()
    .toListAccountsForProvisionedPermissionSet().onAllResources()
    .toDescribeAccountAssignmentCreationStatus().onAllResources()
    .toDescribeAccountAssignmentDeletionStatus().onAllResources());

  return AssignmentFunctionPolicyStatements;
}
