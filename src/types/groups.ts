export type GroupRow = {
  id: string;
  owner_user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type GroupMemberRow = {
  id: string;
  group_id: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export type ContactGroup = {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ContactGroupMember = {
  id: string;
  groupId: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type ContactGroupDetail = ContactGroup & {
  members: ContactGroupMember[];
};

export function mapGroupRow(row: GroupRow, memberCount = 0): ContactGroup {
  return {
    id: row.id,
    name: row.name,
    memberCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapGroupMemberRow(row: GroupMemberRow): ContactGroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
