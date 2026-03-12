/** Custom property tools — device and org unit properties. */

import { apiGet, sanitizePathParam } from '../client.js';
import { paginationParams, paginationArgs } from '../shared.js';

export const customPropertyTools = [
  {
    name: 'list_device_custom_properties',
    description: 'Retrieve all custom properties for a specific device.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'The device ID' },
      },
      required: ['deviceId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/devices/${sanitizePathParam(args.deviceId)}/custom-properties`);
    },
  },
  {
    name: 'get_device_custom_property',
    description: 'Retrieve a specific custom property for a device.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'The device ID' },
        propertyId: { type: 'number', description: 'The custom property ID' },
      },
      required: ['deviceId', 'propertyId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/devices/${sanitizePathParam(args.deviceId)}/custom-properties/${sanitizePathParam(args.propertyId)}`);
    },
  },
  {
    name: 'list_org_custom_properties',
    description: 'Retrieve the list of custom properties for an organization unit.',
    inputSchema: {
      type: 'object',
      properties: {
        orgUnitId: { type: 'number', description: 'The organization unit ID' },
        ...paginationParams,
      },
      required: ['orgUnitId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/org-units/${sanitizePathParam(args.orgUnitId)}/custom-properties`, paginationArgs(args));
    },
  },
  {
    name: 'get_org_unit_property',
    description: 'Retrieve a specific custom property for an organization unit.',
    inputSchema: {
      type: 'object',
      properties: {
        orgUnitId: { type: 'number', description: 'The organization unit ID' },
        propertyId: { type: 'number', description: 'The custom property ID' },
      },
      required: ['orgUnitId', 'propertyId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/org-units/${sanitizePathParam(args.orgUnitId)}/custom-properties/${sanitizePathParam(args.propertyId)}`);
    },
  },
  {
    name: 'get_org_custom_property_default',
    description: 'Retrieve the default value for an organization unit custom property.',
    inputSchema: {
      type: 'object',
      properties: {
        orgUnitId: { type: 'number', description: 'The organization unit ID' },
        propertyId: { type: 'number', description: 'The custom property ID' },
      },
      required: ['orgUnitId', 'propertyId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/org-units/${sanitizePathParam(args.orgUnitId)}/org-custom-property-defaults/${sanitizePathParam(args.propertyId)}`);
    },
  },
  {
    name: 'get_device_default_custom_property',
    description: 'Retrieve the default device custom property information by organization unit ID and property ID.',
    inputSchema: {
      type: 'object',
      properties: {
        orgUnitId: { type: 'number', description: 'The organization unit ID' },
        propertyId: { type: 'number', description: 'The custom property ID' },
      },
      required: ['orgUnitId', 'propertyId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/org-units/${sanitizePathParam(args.orgUnitId)}/custom-properties/device-custom-property-defaults/${sanitizePathParam(args.propertyId)}`);
    },
  },
];
