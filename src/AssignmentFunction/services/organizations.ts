import { OrganizationsClient, ListAccountsForParentCommand, ListRootsCommand, ListChildrenCommand, DescribeOrganizationalUnitCommand, ListAccountsCommand, ListOrganizationalUnitsForParentCommand } from "@aws-sdk/client-organizations";

const client = new OrganizationsClient({ region: process.env.AWS_REGION });

const ouAccountMappings: OuAccountMapping[] = [];

interface OuObject {
  name: string,
  ouId: string
}

interface Account {
  id: string | undefined,
  name: string | undefined
}

interface OuAccountMapping {
  organizationUnitName: string,
  organizationUnitId: string,
  accounts: Account[]
}

export async function listActiveAccountsForOu(organizationUnitName: string) {
  const foundMapping = ouAccountMappings.find(mapping => mapping.organizationUnitName === organizationUnitName);
  if (foundMapping) {
    return foundMapping.accounts;
  }
  const ouId = await getOuIdFromOuName(organizationUnitName);
  if (ouId) {
    const accounts : Account[] = [];
    await getAllAccountsOfOu(ouId, accounts);
    if (accounts && accounts.length > 0) {
      ouAccountMappings.push({
        organizationUnitName,
        organizationUnitId: ouId,
        accounts
      })
      return accounts;
    }
  }
  return undefined;
}

export async function listAllActiveAccounts() {
  const accounts = [];
  let NextToken;
  do {
    const command : ListAccountsCommand = new ListAccountsCommand({ NextToken });
    const response = await client.send(command);
    const tempAccounts = response.Accounts?.filter(account => account.Status === "ACTIVE").map(account => {
      return {id: account.Id, name: account.Name};
    });
    if (tempAccounts) {
      accounts.push(...tempAccounts);
    }
    NextToken = response.NextToken;
  } while(NextToken);
  return accounts;
}

export async function getAccountId(accountName: string) {
  const accounts = await listAllActiveAccounts();
  return accounts.find(account => account.name === accountName)?.id;
}

async function getOuIdFromOuName(organizationUnitName: string) {
  const lrcommand = new ListRootsCommand({});
  const lrResponse = await client.send(lrcommand);
  let rootId;
  if (lrResponse.Roots && lrResponse.Roots.length > 0) {
    if (lrResponse.Roots[0].Id) {
      rootId = lrResponse.Roots[0].Id;
    }
  }
  if (rootId) {
    return await searchTree(organizationUnitName, { ouId: rootId, name: "root"});
  }
  return undefined;
}

async function searchTree(ouName: string, ouObject?: OuObject): Promise<string | undefined> {
  if (!ouObject) {
    return undefined;
  }
  else if (ouObject.name === ouName) {
    return ouObject.ouId;
  }
  else {
    const laCommand = new ListChildrenCommand({ ParentId: ouObject.ouId, ChildType: "ORGANIZATIONAL_UNIT" });
    const laResponse = await client.send(laCommand);
    if (laResponse.Children && laResponse.Children.length > 0) {
      const childOrgIds = laResponse.Children.map(child => child.Id);
      let result;
      for (let i=0; result == null && i< childOrgIds.length; i++) {
        const doCommand = new DescribeOrganizationalUnitCommand({ OrganizationalUnitId: childOrgIds[i] });
        const doResponse = await client.send(doCommand);
        let childOuObject;
        if (doResponse.OrganizationalUnit && doResponse.OrganizationalUnit.Id && doResponse.OrganizationalUnit.Name) {
          childOuObject = {
            ouId: doResponse.OrganizationalUnit.Id,
            name: doResponse.OrganizationalUnit.Name
          }
        }
        result = await searchTree(ouName, childOuObject);
      }
      return result;
    } else {
      return undefined;
    }
  }
}

async function getAllAccountsOfOu(ouId: string, accounts: Account[]){
  const lafpCommand = new ListAccountsForParentCommand({
    ParentId: ouId
  });
  const lafpResponse = await client.send(lafpCommand);
  lafpResponse.Accounts?.filter(account => account.Status === "ACTIVE").map(account => {
    return {id: account.Id, name: account.Name};
  }).forEach(account => {
    if (account.id && account.name) {
      accounts.push(account);
    }
  });
  const lofpCommand = new ListOrganizationalUnitsForParentCommand({
    ParentId: ouId
  });
  const lofpResponse = await client.send(lofpCommand);
  const promiseArray = [];
  if (lofpResponse.OrganizationalUnits) {
    for (const ou of lofpResponse.OrganizationalUnits) {
      if (ou.Id) {
        promiseArray.push(getAllAccountsOfOu(ou.Id, accounts));
      }
    }
  }
  await Promise.all(promiseArray);
}