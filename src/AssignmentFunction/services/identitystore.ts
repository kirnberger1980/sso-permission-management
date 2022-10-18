import { IdentitystoreClient, ListGroupsCommand,  ListGroupsCommandOutput } from "@aws-sdk/client-identitystore";

const IdentityStoreId = process.env.IDENTITY_STORE_ID;

const client = new IdentitystoreClient({ region: process.env.AWS_REGION });

export async function getGroups(adDomain: string) {
  let NextToken = undefined;
  const groups = [];
  do {
    const lgCommand = new ListGroupsCommand({
      IdentityStoreId,
      NextToken
    });
    const lgResponse: ListGroupsCommandOutput = await client.send(lgCommand);
    if (lgResponse && lgResponse.Groups) {
      groups.push(...lgResponse.Groups);
    }
    NextToken = lgResponse.NextToken;
  } while (NextToken);
  return groups.map(group => {
    return {
      groupName: group.DisplayName?.substring(0,group.DisplayName.indexOf("@" + adDomain)) || "",
      groupId: group.GroupId || ""
    }
  })
}