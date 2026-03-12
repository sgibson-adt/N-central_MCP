/** User and access group tools. */

import { apiGet, sanitizePathParam } from '../client.js';
import { paginationParams, paginationArgs } from '../shared.js';

export const userTools = [
  {
    name: 'list_users',
    description: 'Retrieve the list of users for a specific organization unit.',
    inputSchema: {
      type: 'object',
      properties: {
        orgUnitId: { type: 'number', description: 'The organization unit ID' },
        ...paginationParams,
      },
      required: ['orgUnitId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/org-units/${sanitizePathParam(args.orgUnitId)}/users`, paginationArgs(args));
    },
  },
  {
    name: 'list_user_roles',
    description: 'Retrieve a list of user roles for a given organization unit.',
    inputSchema: {
      type: 'object',
      properties: {
        orgUnitId: { type: 'number', description: 'The organization unit ID' },
        ...paginationParams,
      },
      required: ['orgUnitId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/org-units/${sanitizePathParam(args.orgUnitId)}/user-roles`, paginationArgs(args));
    },
  },
  {
    name: 'get_user_role',
    description: 'Retrieve a specific user role for a given organization unit and user role ID.',
    inputSchema: {
      type: 'object',
      properties: {
        orgUnitId: { type: 'string', description: 'The organization unit ID' },
        userRoleId: { type: 'string', description: 'The user role ID' },
      },
      required: ['orgUnitId', 'userRoleId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/org-units/${sanitizePathParam(args.orgUnitId)}/user-roles/${sanitizePathParam(args.userRoleId)}`);
    },
  },
  {
    name: 'list_access_groups',
    description: 'Retrieve access groups for a specific organization unit.',
    inputSchema: {
      type: 'object',
      properties: {
        orgUnitId: { type: 'number', description: 'The organization unit ID' },
        ...paginationParams,
      },
      required: ['orgUnitId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/org-units/${sanitizePathParam(args.orgUnitId)}/access-groups`, paginationArgs(args));
    },
  },
  {
    name: 'get_access_group',
    description: 'Retrieve detailed information for a specific access group by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        accessGroupId: { type: 'string', description: 'The access group ID' },
      },
      required: ['accessGroupId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/access-groups/${sanitizePathParam(args.accessGroupId)}`);
    },
  },
];
