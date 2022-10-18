import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { AssignmentConfig } from "../types/assignment-config";

const client = new SSMClient({ region: process.env.AWS_REGION });

const ssmParameter = process.env.CONFIG_PARAMETER_NAME;

export async function getAssignmentConfig() {
  const gpCommand = new GetParameterCommand({
    Name: ssmParameter
  });
  const response = await client.send(gpCommand);
  if (response.Parameter && response.Parameter.Value) {
    const assignmentConfig: AssignmentConfig = JSON.parse(response.Parameter.Value);
    return assignmentConfig
  }
  return undefined;
}