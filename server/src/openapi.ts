/**
 * OpenAPI 3.0 specification for the Blimp ITAM API.
 *
 * Served at GET /api-docs via swagger-ui-express.
 */

import type { OpenAPIV3 } from 'openapi-types';

const paginationParams: OpenAPIV3.ParameterObject[] = [
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 100, maximum: 500 }, description: 'Max results to return' },
  { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 }, description: 'Number of results to skip' },
];

const searchParam: OpenAPIV3.ParameterObject = {
  name: 'search', in: 'query', schema: { type: 'string' }, description: 'Free-text search',
};

const bearerAuth: OpenAPIV3.SecuritySchemeObject = {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'JWT token obtained from POST /auth/login',
};

const errorResponse = (desc: string): OpenAPIV3.ResponseObject => ({
  description: desc,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

export const spec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Blimp ITAM API',
    version: '1.0.0',
    description: 'REST API for Blimp — IT Asset Management. Manage hardware assets, software licenses, people, integrations, and agent-reported inventory.',
    contact: { name: 'Blimp Team', url: 'https://github.com/Gerritbandison/Blimp' },
    license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
  },
  servers: [
    { url: '/', description: 'Current server' },
  ],
  tags: [
    { name: 'Health', description: 'Liveness & readiness probes' },
    { name: 'Auth', description: 'Authentication & user management' },
    { name: 'Assets', description: 'Hardware asset CRUD' },
    { name: 'Apps', description: 'Software application & license CRUD' },
    { name: 'People', description: 'People directory CRUD' },
    { name: 'Activity', description: 'Audit / activity log' },
    { name: 'Agent', description: 'Endpoint agent device management & reporting' },
    { name: 'Integrations', description: 'Third-party integration connections & sync' },
    { name: 'Documents', description: 'File upload & download' },
  ],
  components: {
    securitySchemes: { BearerAuth: bearerAuth },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
        required: ['error'],
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/UserSummary' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'name', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 8 },
          role: { type: 'string', enum: ['Admin', 'ITManager', 'Finance', 'ReadOnly', 'Custom'], default: 'ReadOnly' },
        },
      },
      UserSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          department: { type: 'string' },
          photo: { type: 'string' },
        },
      },
      Asset: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tag: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['Laptop', 'Monitor', 'Phone', 'Tablet', 'Desktop', 'Server', 'Printer', 'Network', 'Peripheral', 'Other'] },
          make: { type: 'string' },
          model: { type: 'string' },
          serial: { type: 'string' },
          status: { type: 'string' },
          assignedTo: { type: 'string', nullable: true },
          assignedToId: { type: 'string', nullable: true },
          location: { type: 'string' },
          purchaseDate: { type: 'string', format: 'date-time' },
          warrantyExpiry: { type: 'string', format: 'date-time' },
          cost: { type: 'number' },
          currency: { type: 'string' },
          os: { type: 'string', nullable: true },
          ram: { type: 'string', nullable: true },
          storage: { type: 'string', nullable: true },
          department: { type: 'string', nullable: true },
          detectionSource: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AssetCreate: {
        type: 'object',
        required: ['tag', 'name', 'type', 'make', 'model', 'serial', 'location', 'purchaseDate', 'warrantyExpiry'],
        properties: {
          tag: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['Laptop', 'Monitor', 'Phone', 'Tablet', 'Desktop', 'Server', 'Printer', 'Network', 'Peripheral', 'Other'] },
          make: { type: 'string' },
          model: { type: 'string' },
          serial: { type: 'string' },
          status: { type: 'string', default: 'In Stock' },
          assignedTo: { type: 'string' },
          assignedToId: { type: 'string' },
          location: { type: 'string' },
          purchaseDate: { type: 'string', format: 'date' },
          warrantyExpiry: { type: 'string', format: 'date' },
          cost: { type: 'number', default: 0 },
          currency: { type: 'string', default: 'USD' },
          os: { type: 'string' },
          ram: { type: 'string' },
          storage: { type: 'string' },
          notes: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          department: { type: 'string' },
          detectionSource: { type: 'string' },
        },
      },
      App: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          vendor: { type: 'string' },
          logo: { type: 'string', nullable: true },
          category: { type: 'string' },
          licenseType: { type: 'string' },
          totalLicenses: { type: 'integer' },
          assignedLicenses: { type: 'integer' },
          costPerLicense: { type: 'number' },
          billingCycle: { type: 'string', enum: ['monthly', 'annual'] },
          currency: { type: 'string' },
          renewalDate: { type: 'string', format: 'date-time' },
          status: { type: 'string' },
          adminOwner: { type: 'string', nullable: true },
          businessOwner: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AppCreate: {
        type: 'object',
        required: ['name', 'vendor', 'category', 'licenseType', 'totalLicenses', 'costPerLicense', 'renewalDate'],
        properties: {
          name: { type: 'string' },
          vendor: { type: 'string' },
          logo: { type: 'string' },
          category: { type: 'string' },
          licenseType: { type: 'string' },
          totalLicenses: { type: 'integer', minimum: 0 },
          assignedLicenses: { type: 'integer', minimum: 0, default: 0 },
          costPerLicense: { type: 'number', minimum: 0 },
          billingCycle: { type: 'string', enum: ['monthly', 'annual'], default: 'annual' },
          currency: { type: 'string', default: 'USD' },
          renewalDate: { type: 'string', format: 'date' },
          noticePeriodDays: { type: 'integer', default: 30 },
          status: { type: 'string', default: 'Active' },
          adminOwner: { type: 'string' },
          businessOwner: { type: 'string' },
          description: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      Person: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          department: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string', enum: ['Active', 'Onboarding', 'Offboarding', 'Offboarded'] },
          location: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time', nullable: true },
          phone: { type: 'string', nullable: true },
          photo: { type: 'string', nullable: true },
          assetsAssigned: { type: 'integer' },
          licensesAssigned: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PersonCreate: {
        type: 'object',
        required: ['name', 'email', 'department', 'title', 'location', 'startDate'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          department: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string', enum: ['Active', 'Onboarding', 'Offboarding', 'Offboarded'], default: 'Active' },
          location: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          phone: { type: 'string' },
          photo: { type: 'string' },
          notes: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      ActivityEntry: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          action: { type: 'string' },
          module: { type: 'string' },
          entityName: { type: 'string', nullable: true },
          details: { type: 'string', nullable: true },
          user: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      AgentDevice: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          tokenPrefix: { type: 'string' },
          platform: { type: 'string', nullable: true },
          hostname: { type: 'string', nullable: true },
          lastSeen: { type: 'string', format: 'date-time', nullable: true },
          lastReport: { type: 'string', format: 'date-time', nullable: true },
          reportCount: { type: 'integer' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AgentDeviceCreate: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
      AgentReport: {
        type: 'object',
        required: ['version', 'generatedAt', 'deviceId', 'platform', 'hostname', 'hardware', 'os', 'network'],
        description: 'Hardware inventory report submitted by the Blimp endpoint agent.',
        properties: {
          version: { type: 'string' },
          generatedAt: { type: 'string', format: 'date-time' },
          deviceId: { type: 'string' },
          platform: { type: 'string', enum: ['Windows', 'macOS', 'Linux'] },
          hostname: { type: 'string' },
          hardware: {
            type: 'object',
            required: ['make', 'model', 'serial'],
            properties: {
              make: { type: 'string' },
              model: { type: 'string' },
              serial: { type: 'string' },
              cpu: { type: 'string' },
              ramGB: { type: 'number' },
            },
          },
          os: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' },
              version: { type: 'string' },
              buildNumber: { type: 'string' },
              architecture: { type: 'string' },
            },
          },
          network: {
            type: 'object',
            required: ['hostname'],
            properties: {
              hostname: { type: 'string' },
              ipAddresses: { type: 'array', items: { type: 'string' } },
            },
          },
          displays: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                manufacturer: { type: 'string' },
                serial: { type: 'string' },
                resolution: { type: 'string' },
                isBuiltIn: { type: 'boolean' },
              },
            },
          },
          peripherals: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'name'],
              properties: {
                type: { type: 'string' },
                name: { type: 'string' },
                manufacturer: { type: 'string' },
                serial: { type: 'string' },
                connectionType: { type: 'string', default: 'USB' },
                isBuiltIn: { type: 'boolean' },
              },
            },
          },
          software: {
            type: 'object',
            properties: {
              installed: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['name', 'version'],
                  properties: {
                    name: { type: 'string' },
                    version: { type: 'string' },
                    publisher: { type: 'string' },
                  },
                },
              },
            },
          },
          identity: {
            type: 'object',
            properties: {
              currentUser: { type: 'string' },
              currentUserEmail: { type: 'string' },
              adJoined: { type: 'boolean' },
              entraJoined: { type: 'boolean' },
            },
          },
        },
      },
      ReportResult: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          assetId: { type: 'string' },
          monitorsAdded: { type: 'integer' },
          monitorsUpdated: { type: 'integer' },
          peripheralsAdded: { type: 'integer' },
          personLinked: { type: 'boolean' },
        },
      },
      Integration: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          category: { type: 'string' },
          status: { type: 'string' },
          connectedAt: { type: 'string', format: 'date-time' },
          lastSync: { type: 'string', format: 'date-time', nullable: true },
          syncFrequency: { type: 'string' },
          features: { type: 'array', items: { type: 'string' } },
        },
      },
      IntuneConnect: {
        type: 'object',
        required: ['tenantId', 'clientId', 'clientSecret'],
        properties: {
          tenantId: { type: 'string' },
          clientId: { type: 'string' },
          clientSecret: { type: 'string' },
          syncFrequency: { type: 'string', default: 'daily' },
          enabledFeatures: { type: 'array', items: { type: 'string' } },
        },
      },
      NinjaOneConnect: {
        type: 'object',
        required: ['instanceUrl', 'clientId', 'clientSecret'],
        properties: {
          instanceUrl: { type: 'string' },
          clientId: { type: 'string' },
          clientSecret: { type: 'string' },
          syncFrequency: { type: 'string', default: 'daily' },
          enabledFeatures: { type: 'array', items: { type: 'string' } },
        },
      },
      SyncResult: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          result: { type: 'object' },
          summary: {
            type: 'object',
            properties: {
              devices: { type: 'integer' },
              assetsAdded: { type: 'integer' },
              assetsUpdated: { type: 'integer' },
              peopleAdded: { type: 'integer' },
            },
          },
        },
      },
      Document: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          size: { type: 'integer' },
          uploadedBy: { type: 'string' },
          url: { type: 'string' },
          assetId: { type: 'string', nullable: true },
          appId: { type: 'string', nullable: true },
          personId: { type: 'string', nullable: true },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    // ── Health ──────────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        security: [],
        responses: {
          '200': {
            description: 'Healthy',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string' }, checks: { type: 'object', properties: { database: { type: 'string' } } } } } } },
          },
          '503': { description: 'Database unreachable' },
        },
      },
    },
    '/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe',
        security: [],
        responses: {
          '200': {
            description: 'Ready',
            content: { 'application/json': { schema: { type: 'object', properties: { ready: { type: 'boolean' }, timestamp: { type: 'string' } } } } },
          },
        },
      },
    },

    // ── Auth ────────────────────────────────────────────────────────────────────
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email & password',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          '401': errorResponse('Invalid credentials'),
          '429': errorResponse('Too many login attempts'),
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create a new user (Admin only)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: {
          '201': { description: 'User created', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          '400': errorResponse('Validation error'),
          '409': errorResponse('Email already exists'),
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        responses: {
          '200': { description: 'Current user', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserSummary' } } } },
          '401': errorResponse('Not authenticated'),
        },
      },
    },

    // ── Assets ──────────────────────────────────────────────────────────────────
    '/assets': {
      get: {
        tags: ['Assets'],
        summary: 'List assets',
        parameters: [
          ...paginationParams,
          searchParam,
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by status' },
          { name: 'type', in: 'query', schema: { type: 'string' }, description: 'Filter by asset type' },
        ],
        responses: {
          '200': {
            description: 'Paginated asset list',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Asset' } }, total: { type: 'integer' }, limit: { type: 'integer' }, offset: { type: 'integer' } } } } },
          },
        },
      },
      post: {
        tags: ['Assets'],
        summary: 'Create asset',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AssetCreate' } } } },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Asset' } } } },
          '400': errorResponse('Validation error'),
        },
      },
    },
    '/assets/{id}': {
      get: {
        tags: ['Assets'],
        summary: 'Get asset details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Asset details with lifecycle, activities, and documents', content: { 'application/json': { schema: { $ref: '#/components/schemas/Asset' } } } },
          '404': errorResponse('Asset not found'),
        },
      },
      patch: {
        tags: ['Assets'],
        summary: 'Update asset',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AssetCreate' } } } },
        responses: {
          '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Asset' } } } },
          '404': errorResponse('Asset not found'),
        },
      },
      delete: {
        tags: ['Assets'],
        summary: 'Delete asset',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Deleted', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
          '404': errorResponse('Asset not found'),
        },
      },
    },
    '/assets/bulk-update': {
      post: {
        tags: ['Assets'],
        summary: 'Bulk update assets',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['ids', 'updates'], properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1 }, updates: { type: 'object', description: 'Fields to update (status, location, department, etc.)' } } } } },
        },
        responses: {
          '200': { description: 'Updated', content: { 'application/json': { schema: { type: 'object', properties: { updated: { type: 'integer' } } } } } },
        },
      },
    },

    // ── Apps ─────────────────────────────────────────────────────────────────────
    '/apps': {
      get: {
        tags: ['Apps'],
        summary: 'List apps',
        parameters: [
          ...paginationParams,
          searchParam,
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by status' },
        ],
        responses: {
          '200': {
            description: 'Paginated app list',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/App' } }, total: { type: 'integer' }, limit: { type: 'integer' }, offset: { type: 'integer' } } } } },
          },
        },
      },
      post: {
        tags: ['Apps'],
        summary: 'Create app',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AppCreate' } } } },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/App' } } } },
          '400': errorResponse('Validation error'),
        },
      },
    },
    '/apps/{id}': {
      get: {
        tags: ['Apps'],
        summary: 'Get app details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'App with licenses, payments, activities, documents', content: { 'application/json': { schema: { $ref: '#/components/schemas/App' } } } },
          '404': errorResponse('App not found'),
        },
      },
      patch: {
        tags: ['Apps'],
        summary: 'Update app',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AppCreate' } } } },
        responses: {
          '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/App' } } } },
          '404': errorResponse('App not found'),
        },
      },
      delete: {
        tags: ['Apps'],
        summary: 'Delete app',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted' },
          '404': errorResponse('App not found'),
        },
      },
    },

    // ── People ──────────────────────────────────────────────────────────────────
    '/people': {
      get: {
        tags: ['People'],
        summary: 'List people',
        parameters: [
          ...paginationParams,
          searchParam,
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by status' },
          { name: 'department', in: 'query', schema: { type: 'string' }, description: 'Filter by department' },
        ],
        responses: {
          '200': {
            description: 'Paginated people list',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Person' } }, total: { type: 'integer' }, limit: { type: 'integer' }, offset: { type: 'integer' } } } } },
          },
        },
      },
      post: {
        tags: ['People'],
        summary: 'Create person',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PersonCreate' } } } },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Person' } } } },
          '400': errorResponse('Validation error'),
        },
      },
    },
    '/people/{id}': {
      get: {
        tags: ['People'],
        summary: 'Get person details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Person with activities and documents', content: { 'application/json': { schema: { $ref: '#/components/schemas/Person' } } } },
          '404': errorResponse('Person not found'),
        },
      },
      patch: {
        tags: ['People'],
        summary: 'Update person',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PersonCreate' } } } },
        responses: {
          '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Person' } } } },
          '404': errorResponse('Person not found'),
        },
      },
      delete: {
        tags: ['People'],
        summary: 'Delete person (unassigns assets first)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted' },
          '404': errorResponse('Person not found'),
        },
      },
    },
    '/people/{id}/profile': {
      get: {
        tags: ['People'],
        summary: 'Get comprehensive person profile with devices, licenses, and cost summary',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Full profile',
            content: { 'application/json': { schema: { type: 'object', properties: { person: { $ref: '#/components/schemas/Person' }, devices: { type: 'array', items: { type: 'object' } }, monitors: { type: 'array', items: { type: 'object' } }, peripherals: { type: 'array', items: { type: 'object' } }, licenses: { type: 'array', items: { type: 'object' } }, costSummary: { type: 'object', properties: { hardware: { type: 'number' }, softwareAnnual: { type: 'number' }, total: { type: 'number' } } } } } } },
          },
          '404': errorResponse('Person not found'),
        },
      },
    },

    // ── Activity ────────────────────────────────────────────────────────────────
    '/activity': {
      get: {
        tags: ['Activity'],
        summary: 'List activity log entries',
        parameters: [
          ...paginationParams,
          searchParam,
          { name: 'module', in: 'query', schema: { type: 'string' }, description: 'Filter by module (Assets, Apps, People)' },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Start of date range (ISO date)' },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' }, description: 'End of date range (ISO date)' },
        ],
        responses: {
          '200': {
            description: 'Activity entries',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/ActivityEntry' } }, total: { type: 'integer' } } } } },
          },
        },
      },
    },

    // ── Agent ───────────────────────────────────────────────────────────────────
    '/agent/devices': {
      get: {
        tags: ['Agent'],
        summary: 'List agent devices (Admin/ITManager)',
        responses: {
          '200': { description: 'Device list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AgentDevice' } } } } },
        },
      },
      post: {
        tags: ['Agent'],
        summary: 'Create agent device token (Admin/ITManager)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentDeviceCreate' } } } },
        responses: {
          '201': {
            description: 'Device created (token shown only once)',
            content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/AgentDevice' }, { type: 'object', properties: { token: { type: 'string', description: 'Plaintext token — shown only at creation' } } }] } } },
          },
        },
      },
    },
    '/agent/devices/{id}': {
      delete: {
        tags: ['Agent'],
        summary: 'Revoke device token (Admin/ITManager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Revoked', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
          '404': errorResponse('Device not found'),
        },
      },
    },
    '/agent/devices/{id}/rotate': {
      post: {
        tags: ['Agent'],
        summary: 'Rotate device token (Admin/ITManager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'New token generated',
            content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, tokenPrefix: { type: 'string' }, token: { type: 'string' } } } } },
          },
          '404': errorResponse('Device not found'),
        },
      },
    },
    '/agent/health': {
      get: {
        tags: ['Agent'],
        summary: 'Agent liveness check (device token auth)',
        security: [{ AgentToken: [] }],
        responses: {
          '200': {
            description: 'Healthy',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, device: { type: 'string' }, serverTime: { type: 'string' } } } } },
          },
          '401': errorResponse('Invalid or revoked token'),
        },
      },
    },
    '/agent/report': {
      post: {
        tags: ['Agent'],
        summary: 'Submit hardware inventory report (device token auth)',
        security: [{ AgentToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentReport' } } } },
        responses: {
          '200': { description: 'Report processed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReportResult' } } } },
          '401': errorResponse('Invalid or revoked token'),
          '429': errorResponse('Rate limited'),
        },
      },
    },

    // ── Integrations ────────────────────────────────────────────────────────────
    '/integrations': {
      get: {
        tags: ['Integrations'],
        summary: 'List integrations',
        responses: {
          '200': { description: 'Integration list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Integration' } } } } },
        },
      },
    },
    '/integrations/intune/connect': {
      post: {
        tags: ['Integrations'],
        summary: 'Connect Microsoft Intune (Admin/ITManager)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/IntuneConnect' } } } },
        responses: {
          '201': { description: 'Connected', content: { 'application/json': { schema: { $ref: '#/components/schemas/Integration' } } } },
          '400': errorResponse('Validation error'),
        },
      },
    },
    '/integrations/intune/sync': {
      post: {
        tags: ['Integrations'],
        summary: 'Trigger Intune sync (Admin/ITManager)',
        responses: {
          '200': { description: 'Sync completed', content: { 'application/json': { schema: { $ref: '#/components/schemas/SyncResult' } } } },
          '404': errorResponse('Intune not connected'),
        },
      },
    },
    '/integrations/ninjaone/connect': {
      post: {
        tags: ['Integrations'],
        summary: 'Connect NinjaOne (Admin/ITManager)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/NinjaOneConnect' } } } },
        responses: {
          '201': { description: 'Connected', content: { 'application/json': { schema: { $ref: '#/components/schemas/Integration' } } } },
          '400': errorResponse('Validation error'),
        },
      },
    },
    '/integrations/ninjaone/sync': {
      post: {
        tags: ['Integrations'],
        summary: 'Trigger NinjaOne sync (Admin/ITManager)',
        responses: {
          '200': { description: 'Sync completed', content: { 'application/json': { schema: { $ref: '#/components/schemas/SyncResult' } } } },
          '404': errorResponse('NinjaOne not connected'),
        },
      },
    },
    '/integrations/{id}/disconnect': {
      post: {
        tags: ['Integrations'],
        summary: 'Disconnect integration (Admin/ITManager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Disconnected', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
          '404': errorResponse('Integration not found'),
        },
      },
    },

    // ── Documents ───────────────────────────────────────────────────────────────
    '/documents/upload': {
      post: {
        tags: ['Documents'],
        summary: 'Upload document',
        parameters: [
          { name: 'assetId', in: 'query', schema: { type: 'string' }, description: 'Link to asset' },
          { name: 'appId', in: 'query', schema: { type: 'string' }, description: 'Link to app' },
          { name: 'personId', in: 'query', schema: { type: 'string' }, description: 'Link to person' },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'File (max 10 MB). Allowed: pdf, png, jpeg, gif, csv, xlsx, docx, xls, doc, txt.' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Uploaded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Document' } } } },
          '400': errorResponse('No file or missing entity ID'),
        },
      },
    },
    '/documents/{filename}': {
      get: {
        tags: ['Documents'],
        summary: 'Download document',
        parameters: [{ name: 'filename', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'File binary', content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } },
          '404': errorResponse('File not found'),
        },
      },
    },
    '/documents/{id}': {
      delete: {
        tags: ['Documents'],
        summary: 'Delete document',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted' },
          '404': errorResponse('Document not found'),
        },
      },
    },
  },
};
