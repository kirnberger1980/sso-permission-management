import { PolicyDocument, PolicyStatement} from "aws-cdk-lib/aws-iam";
import * as statement from "cdk-iam-floyd";

/**
 * Array to store policy statements for PowerUserRole
 */
const powerUserRolePolicyStatements : PolicyStatement[] = [];

/**
 * Push Statements für das befüllen der Inline Policy - PowerUserRole
 */

powerUserRolePolicyStatements.push(new statement.Iam()
  .to("Get*").onAllResources()
  .to("List*").onAllResources());

powerUserRolePolicyStatements.push(new statement.Iam()
  .toGenerateServiceLastAccessedDetails().onAllResources()
  .toPassRole().onAllResources());

/**
 * Policy Document for PowerUserRole
 */
export const PowerUserRolePolicy = new PolicyDocument({
  statements: powerUserRolePolicyStatements
});