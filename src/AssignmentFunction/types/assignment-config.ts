export interface AssignmentConfig {
  AdDomain: string,
  GlobalAssignments?: Assignment[],
  OuAssignments?: OuAssignment[],
  AccountAssignments?: AccountAssignment[]
}

interface Assignment {
  AdGroupName: string,
  PermissionSet: string
}

interface AccountAssignment {
  AccountName: string,
  Assignments: Assignment[]
}

interface OuAssignment {
  OuName: string,
  Assignments: Assignment[]
}