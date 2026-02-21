import type {
  Asset, App, Person, Integration, ActivityEntry,
  Notification, OrgUser, OnboardingKit, SpendData, AssetStatusData, CategorySpend
} from '../types';

// ─── Mock Assets ──────────────────────────────────────────────────────────
export const mockAssets: Asset[] = [
  {
    id: 'a1', tag: 'AST-0001', name: 'MacBook Pro 14"', type: 'Laptop', make: 'Apple', model: 'MacBook Pro 14" M3 Pro',
    serial: 'C02XK1JAJG5L', status: 'Deployed', assignedTo: 'Alice Johnson', assignedToId: 'p1',
    location: 'New York HQ', purchaseDate: '2023-09-15', warrantyExpiry: '2026-09-15',
    cost: 2499, currency: 'USD', os: 'macOS 14 Sonoma', ram: '18GB', storage: '512GB SSD',
    screenSize: '14.2"', vendor: 'Apple Store', poNumber: 'PO-2023-0041',
    department: 'Engineering', category: 'Laptops', tags: ['engineering', 'remote'],
    detectionSource: 'Jamf',
    lifecycle: [
      { id: 'l1', date: '2023-09-15', event: 'Purchased', description: 'Purchased from Apple Store', user: 'IT Team' },
      { id: 'l2', date: '2023-09-20', event: 'Deployed', description: 'Assigned to Alice Johnson', user: 'Tom Admin' },
    ],
    activityLog: [
      { id: 'al1', timestamp: '2024-01-15T10:23:00Z', action: 'Status Changed', user: 'Tom Admin', details: 'Status changed to Deployed' },
    ]
  },
  {
    id: 'a2', tag: 'AST-0002', name: 'Dell UltraSharp 27"', type: 'Monitor', make: 'Dell', model: 'U2723QE',
    serial: 'CN-0F3J7G-71629', status: 'Deployed', assignedTo: 'Alice Johnson', assignedToId: 'p1',
    location: 'New York HQ', purchaseDate: '2023-09-15', warrantyExpiry: '2026-09-15',
    cost: 699, currency: 'USD', vendor: 'Dell Direct', poNumber: 'PO-2023-0041',
    department: 'Engineering', category: 'Monitors', tags: ['engineering'],
    detectionSource: 'Manual',
  },
  {
    id: 'a3', tag: 'AST-0003', name: 'MacBook Pro 14"', type: 'Laptop', make: 'Apple', model: 'MacBook Pro 14" M3 Pro',
    serial: 'C02YM2KAJG5L', status: 'In Stock', location: 'New York HQ',
    purchaseDate: '2024-01-10', warrantyExpiry: '2027-01-10',
    cost: 2499, currency: 'USD', os: 'macOS 14 Sonoma', ram: '18GB', storage: '512GB SSD',
    vendor: 'Apple Store', poNumber: 'PO-2024-0012',
    department: 'Engineering', category: 'Laptops', tags: ['engineering'],
    detectionSource: 'Jamf',
  },
  {
    id: 'a4', tag: 'AST-0004', name: 'iPhone 15 Pro', type: 'Phone', make: 'Apple', model: 'iPhone 15 Pro 256GB',
    serial: 'DX3M7K9PKP', status: 'Deployed', assignedTo: 'Bob Smith', assignedToId: 'p2',
    location: 'London Office', purchaseDate: '2023-11-01', warrantyExpiry: '2024-11-01',
    cost: 1199, currency: 'USD', vendor: 'Apple Store',
    department: 'Sales', category: 'Phones', tags: ['sales', 'mobile'],
    detectionSource: 'Intune',
  },
  {
    id: 'a5', tag: 'AST-0005', name: 'ThinkPad X1 Carbon', type: 'Laptop', make: 'Lenovo', model: 'ThinkPad X1 Carbon Gen 11',
    serial: 'PF2ABCDE', status: 'In Repair', location: 'Repair Center',
    purchaseDate: '2022-06-20', warrantyExpiry: '2025-06-20',
    cost: 1799, currency: 'USD', os: 'Windows 11 Pro', ram: '16GB', storage: '256GB SSD',
    vendor: 'Lenovo Direct', department: 'Finance', category: 'Laptops',
    notes: 'Keyboard replacement in progress', detectionSource: 'Intune',
  },
  {
    id: 'a6', tag: 'AST-0006', name: 'iPad Pro 12.9"', type: 'Tablet', make: 'Apple', model: 'iPad Pro 12.9" M2',
    serial: 'DLXK9MPQRS', status: 'Deployed', assignedTo: 'Carol White', assignedToId: 'p3',
    location: 'San Francisco Office', purchaseDate: '2023-03-15', warrantyExpiry: '2025-03-15',
    cost: 1299, currency: 'USD', vendor: 'Apple Store',
    department: 'Design', category: 'Tablets', tags: ['design'], detectionSource: 'Jamf',
  },
  {
    id: 'a7', tag: 'AST-0007', name: 'MacBook Air 13"', type: 'Laptop', make: 'Apple', model: 'MacBook Air 13" M2',
    serial: 'C02ZK3MAJG5L', status: 'Retired', location: 'Storage Room',
    purchaseDate: '2020-01-15', warrantyExpiry: '2023-01-15',
    cost: 1299, currency: 'USD', vendor: 'Apple Store',
    department: 'Engineering', category: 'Laptops', detectionSource: 'Manual',
  },
  {
    id: 'a8', tag: 'AST-0008', name: 'Dell Latitude 5540', type: 'Laptop', make: 'Dell', model: 'Latitude 5540 i7',
    serial: 'CN-1H3J7G-81729', status: 'In Stock', location: 'London Office',
    purchaseDate: '2024-02-01', warrantyExpiry: '2027-02-01',
    cost: 1349, currency: 'USD', os: 'Windows 11 Pro', ram: '16GB', storage: '512GB SSD',
    vendor: 'Dell Direct', department: 'HR', category: 'Laptops', detectionSource: 'Intune',
  },
  {
    id: 'a9', tag: 'AST-0009', name: 'Logitech MX Master 3', type: 'Peripheral', make: 'Logitech', model: 'MX Master 3S',
    serial: '2218MX3-001', status: 'Deployed', assignedTo: 'David Lee', assignedToId: 'p4',
    location: 'New York HQ', purchaseDate: '2023-08-10', warrantyExpiry: '2025-08-10',
    cost: 99, currency: 'USD', vendor: 'Amazon', department: 'Engineering', category: 'Peripherals',
    detectionSource: 'Manual',
  },
  {
    id: 'a10', tag: 'AST-0010', name: 'HP LaserJet Pro', type: 'Printer', make: 'HP', model: 'LaserJet Pro M404n',
    serial: 'CNJXL3T4HV', status: 'Deployed', location: 'New York HQ - Floor 3',
    purchaseDate: '2022-11-20', warrantyExpiry: '2025-11-20',
    cost: 449, currency: 'USD', vendor: 'Staples', department: 'Operations', category: 'Printers',
    detectionSource: 'Manual',
  },
];

// ─── Mock Apps ────────────────────────────────────────────────────────────
export const mockApps: App[] = [
  {
    id: 'app1', name: 'Slack', vendor: 'Salesforce', category: 'Communication',
    licenseType: 'Per User', totalLicenses: 150, assignedLicenses: 132,
    costPerLicense: 8.75, billingCycle: 'monthly', currency: 'USD',
    renewalDate: '2025-04-01', noticePeriodDays: 30, status: 'Active',
    detectionSource: 'SSO', adminOwner: 'Tom Admin', businessOwner: 'Alice Johnson',
    description: 'Team communication and collaboration platform',
    vendorContact: 'enterprise@slack.com', contractStart: '2023-04-01',
    url: 'https://slack.com', tags: ['communication', 'essential'],
    compliance: { soc2: true, iso27001: true, gdpr: true, riskRating: 'Low', dpaStatus: 'Signed', questionnaire: 'Complete' },
  },
  {
    id: 'app2', name: 'GitHub', vendor: 'Microsoft', category: 'Development',
    licenseType: 'Per User', totalLicenses: 80, assignedLicenses: 75,
    costPerLicense: 21, billingCycle: 'monthly', currency: 'USD',
    renewalDate: '2025-06-15', noticePeriodDays: 30, status: 'Active',
    detectionSource: 'SSO', adminOwner: 'Alice Johnson',
    description: 'Code hosting and collaboration platform',
    url: 'https://github.com', tags: ['development', 'essential'],
    compliance: { soc2: true, iso27001: true, gdpr: true, riskRating: 'Low', dpaStatus: 'Signed', questionnaire: 'Complete' },
  },
  {
    id: 'app3', name: 'Figma', vendor: 'Figma', category: 'Design',
    licenseType: 'Per User', totalLicenses: 25, assignedLicenses: 18,
    costPerLicense: 15, billingCycle: 'monthly', currency: 'USD',
    renewalDate: '2025-03-10', noticePeriodDays: 14, status: 'Active',
    detectionSource: 'Manual', adminOwner: 'Carol White',
    description: 'Collaborative interface design tool',
    url: 'https://figma.com', tags: ['design'],
    compliance: { soc2: true, iso27001: false, gdpr: true, riskRating: 'Low', questionnaire: 'In Progress' },
  },
  {
    id: 'app4', name: 'Jira', vendor: 'Atlassian', category: 'Development',
    licenseType: 'Per User', totalLicenses: 100, assignedLicenses: 89,
    costPerLicense: 10, billingCycle: 'monthly', currency: 'USD',
    renewalDate: '2025-05-20', noticePeriodDays: 30, status: 'Active',
    detectionSource: 'SSO', adminOwner: 'Tom Admin',
    description: 'Project tracking and issue management',
    url: 'https://atlassian.com/jira', tags: ['development', 'pm'],
    compliance: { soc2: true, iso27001: true, gdpr: true, riskRating: 'Low', dpaStatus: 'Signed', questionnaire: 'Complete' },
  },
  {
    id: 'app5', name: 'Zoom', vendor: 'Zoom', category: 'Communication',
    licenseType: 'Per User', totalLicenses: 120, assignedLicenses: 95,
    costPerLicense: 16, billingCycle: 'monthly', currency: 'USD',
    renewalDate: '2025-07-01', noticePeriodDays: 30, status: 'Active',
    detectionSource: 'SSO', adminOwner: 'Tom Admin',
    description: 'Video conferencing and webinar platform',
    url: 'https://zoom.us', tags: ['communication'],
    compliance: { soc2: true, iso27001: true, gdpr: true, riskRating: 'Medium', dpaStatus: 'Signed', questionnaire: 'Complete' },
  },
  {
    id: 'app6', name: 'HubSpot', vendor: 'HubSpot', category: 'Marketing',
    licenseType: 'Enterprise', totalLicenses: 1, assignedLicenses: 1,
    costPerLicense: 3600, billingCycle: 'annual', currency: 'USD',
    renewalDate: '2025-02-28', noticePeriodDays: 60, status: 'Active',
    detectionSource: 'Accounting', adminOwner: 'Bob Smith',
    description: 'CRM and marketing automation platform',
    url: 'https://hubspot.com', tags: ['sales', 'marketing'],
    compliance: { soc2: true, iso27001: false, gdpr: true, riskRating: 'Medium', dpaStatus: 'Signed', questionnaire: 'In Progress' },
  },
  {
    id: 'app7', name: 'Notion', vendor: 'Notion', category: 'Productivity',
    licenseType: 'Per User', totalLicenses: 200, assignedLicenses: 47,
    costPerLicense: 16, billingCycle: 'monthly', currency: 'USD',
    renewalDate: '2025-08-15', noticePeriodDays: 30, status: 'Active',
    detectionSource: 'SSO', adminOwner: 'Alice Johnson',
    description: 'All-in-one workspace for notes and documentation',
    url: 'https://notion.so', tags: ['productivity'],
    compliance: { soc2: true, iso27001: false, gdpr: true, riskRating: 'Low', questionnaire: 'Complete' },
  },
  {
    id: 'app8', name: '1Password', vendor: '1Password', category: 'Security',
    licenseType: 'Per User', totalLicenses: 160, assignedLicenses: 158,
    costPerLicense: 8, billingCycle: 'monthly', currency: 'USD',
    renewalDate: '2025-09-01', noticePeriodDays: 30, status: 'Active',
    detectionSource: 'Manual', adminOwner: 'Tom Admin',
    description: 'Password management and security',
    url: 'https://1password.com', tags: ['security', 'essential'],
    compliance: { soc2: true, iso27001: true, gdpr: true, riskRating: 'Low', dpaStatus: 'Signed', questionnaire: 'Complete' },
  },
  {
    id: 'app9', name: 'Asana', vendor: 'Asana', category: 'Productivity',
    licenseType: 'Per User', totalLicenses: 50, assignedLicenses: 12,
    costPerLicense: 13.49, billingCycle: 'monthly', currency: 'USD',
    renewalDate: '2025-03-31', noticePeriodDays: 30, status: 'Active',
    detectionSource: 'Shadow IT', adminOwner: undefined,
    description: 'Project and task management',
    url: 'https://asana.com', tags: ['productivity', 'shadow-it'],
    compliance: { soc2: true, iso27001: false, gdpr: true, riskRating: 'Low', questionnaire: 'Not Started' },
  },
  {
    id: 'app10', name: 'Dropbox', vendor: 'Dropbox', category: 'Productivity',
    licenseType: 'Per User', totalLicenses: 30, assignedLicenses: 3,
    costPerLicense: 20, billingCycle: 'monthly', currency: 'USD',
    renewalDate: '2025-01-15', noticePeriodDays: 30, status: 'Expired',
    detectionSource: 'Accounting', adminOwner: 'Tom Admin',
    description: 'Cloud storage and file sharing',
    url: 'https://dropbox.com', tags: ['storage'],
    compliance: { soc2: true, iso27001: true, gdpr: true, riskRating: 'Medium', dpaStatus: 'Signed', questionnaire: 'Complete' },
  },
];

// ─── Mock People ──────────────────────────────────────────────────────────
export const mockPeople: Person[] = [
  {
    id: 'p1', name: 'Alice Johnson', email: 'alice.johnson@company.com',
    department: 'Engineering', title: 'Senior Software Engineer', status: 'Active',
    location: 'New York HQ', startDate: '2021-03-15', managerId: 'p5', managerName: 'Eve Davis',
    phone: '+1 (212) 555-0101', assetsAssigned: 2, licensesAssigned: 8,
    totalItCost: 4850, tags: ['engineer', 'backend'],
    onboardingTasks: [],
  },
  {
    id: 'p2', name: 'Bob Smith', email: 'bob.smith@company.com',
    department: 'Sales', title: 'Account Executive', status: 'Active',
    location: 'London Office', startDate: '2022-06-01', managerId: 'p6', managerName: 'Frank Brown',
    phone: '+44 20 7946 0102', assetsAssigned: 1, licensesAssigned: 5,
    totalItCost: 2100, tags: ['sales'],
  },
  {
    id: 'p3', name: 'Carol White', email: 'carol.white@company.com',
    department: 'Design', title: 'Lead Product Designer', status: 'Active',
    location: 'San Francisco Office', startDate: '2020-09-01', managerId: 'p5', managerName: 'Eve Davis',
    phone: '+1 (415) 555-0103', assetsAssigned: 1, licensesAssigned: 6,
    totalItCost: 3100, tags: ['design'],
  },
  {
    id: 'p4', name: 'David Lee', email: 'david.lee@company.com',
    department: 'Engineering', title: 'DevOps Engineer', status: 'Active',
    location: 'New York HQ', startDate: '2022-01-10', managerId: 'p5', managerName: 'Eve Davis',
    phone: '+1 (212) 555-0104', assetsAssigned: 2, licensesAssigned: 9,
    totalItCost: 3700, tags: ['engineer', 'devops'],
  },
  {
    id: 'p5', name: 'Eve Davis', email: 'eve.davis@company.com',
    department: 'Engineering', title: 'VP of Engineering', status: 'Active',
    location: 'New York HQ', startDate: '2019-04-01',
    phone: '+1 (212) 555-0105', assetsAssigned: 2, licensesAssigned: 12,
    totalItCost: 6200, tags: ['leadership', 'engineering'],
  },
  {
    id: 'p6', name: 'Frank Brown', email: 'frank.brown@company.com',
    department: 'Sales', title: 'VP of Sales', status: 'Active',
    location: 'London Office', startDate: '2020-01-15',
    phone: '+44 20 7946 0106', assetsAssigned: 1, licensesAssigned: 10,
    totalItCost: 4100, tags: ['leadership', 'sales'],
  },
  {
    id: 'p7', name: 'Grace Kim', email: 'grace.kim@company.com',
    department: 'HR', title: 'HR Manager', status: 'Active',
    location: 'New York HQ', startDate: '2021-11-01', managerId: 'p5', managerName: 'Eve Davis',
    phone: '+1 (212) 555-0107', assetsAssigned: 1, licensesAssigned: 4,
    totalItCost: 1800,
  },
  {
    id: 'p8', name: 'Henry Wilson', email: 'henry.wilson@company.com',
    department: 'Engineering', title: 'Frontend Developer', status: 'Onboarding',
    location: 'New York HQ', startDate: '2024-02-15', managerId: 'p5', managerName: 'Eve Davis',
    phone: '+1 (212) 555-0108', assetsAssigned: 0, licensesAssigned: 0,
    totalItCost: 0, tags: ['engineer', 'frontend'],
    onboardingTasks: [
      { id: 'ot1', task: 'Assign MacBook Pro 14"', completed: false, category: 'Hardware', dueDate: '2024-02-16' },
      { id: 'ot2', task: 'Assign 2x Monitors', completed: false, category: 'Hardware', dueDate: '2024-02-16' },
      { id: 'ot3', task: 'Provision GitHub access', completed: true, category: 'Software', dueDate: '2024-02-15' },
      { id: 'ot4', task: 'Set up Slack account', completed: true, category: 'Software', dueDate: '2024-02-15' },
      { id: 'ot5', task: 'Add to Jira workspace', completed: false, category: 'Software', dueDate: '2024-02-16' },
      { id: 'ot6', task: 'Complete security training', completed: false, category: 'Admin', dueDate: '2024-02-22' },
    ],
  },
  {
    id: 'p9', name: 'Irene Chen', email: 'irene.chen@company.com',
    department: 'Finance', title: 'Financial Analyst', status: 'Offboarding',
    location: 'San Francisco Office', startDate: '2021-07-01', endDate: '2024-03-01',
    managerId: 'p5', managerName: 'Eve Davis',
    phone: '+1 (415) 555-0109', assetsAssigned: 2, licensesAssigned: 6,
    totalItCost: 3200,
    offboardingTasks: [
      { id: 'off1', task: 'Recover laptop (ThinkPad X1)', completed: false, category: 'Hardware', dueDate: '2024-03-01' },
      { id: 'off2', task: 'Recover iPhone', completed: false, category: 'Hardware', dueDate: '2024-03-01' },
      { id: 'off3', task: 'Revoke GitHub access', completed: true, category: 'Software', dueDate: '2024-02-28' },
      { id: 'off4', task: 'Revoke Slack access', completed: false, category: 'Software', dueDate: '2024-03-01' },
      { id: 'off5', task: 'Confirm data wipe', completed: false, category: 'Security', dueDate: '2024-03-05' },
      { id: 'off6', task: 'Archive employee record', completed: false, category: 'Admin', dueDate: '2024-03-07' },
    ],
  },
  {
    id: 'p10', name: 'James Park', email: 'james.park@company.com',
    department: 'Marketing', title: 'Marketing Manager', status: 'Active',
    location: 'San Francisco Office', startDate: '2022-08-15',
    phone: '+1 (415) 555-0110', assetsAssigned: 1, licensesAssigned: 7,
    totalItCost: 2700, tags: ['marketing'],
  },
];

// ─── Mock Integrations ────────────────────────────────────────────────────
export const mockIntegrations: Integration[] = [
  {
    id: 'int1', name: 'Jamf Pro', category: 'MDM/RMM',
    description: 'Apple device management — auto-import and sync macOS/iOS devices',
    status: 'Connected', lastSync: '2024-02-21T08:00:00Z', syncFrequency: 'Every 4 hours',
    connectedAt: '2023-06-01', features: ['Auto-import devices', 'Sync hardware specs', 'Push policies', 'App inventory'],
    syncCount: 87,
  },
  {
    id: 'int2', name: 'Microsoft Intune', category: 'MDM/RMM',
    description: 'Microsoft endpoint management for Windows and mobile devices',
    status: 'Connected', lastSync: '2024-02-21T07:30:00Z', syncFrequency: 'Every 4 hours',
    connectedAt: '2023-06-15', features: ['Device sync', 'Compliance status', 'App deployment', 'Policy enforcement'],
    syncCount: 43,
  },
  {
    id: 'int3', name: 'Okta', category: 'SSO/IAM',
    description: 'Identity provider — sync users and detect app usage via SSO logs',
    status: 'Connected', lastSync: '2024-02-21T09:00:00Z', syncFrequency: 'Every hour',
    connectedAt: '2023-05-01', features: ['User sync', 'App usage detection', 'License rightsizing', 'Auto-offboarding'],
    syncCount: 1247,
  },
  {
    id: 'int4', name: 'Google Workspace', category: 'Core',
    description: 'Google Workspace user and device sync',
    status: 'Connected', lastSync: '2024-02-21T08:45:00Z', syncFrequency: 'Every 6 hours',
    connectedAt: '2023-04-01', features: ['User directory sync', 'Chrome device import', 'License tracking', 'Drive usage'],
    syncCount: 215,
  },
  {
    id: 'int5', name: 'BambooHR', category: 'HR',
    description: 'HR system integration — sync employee data and trigger onboarding/offboarding',
    status: 'Connected', lastSync: '2024-02-21T06:00:00Z', syncFrequency: 'Daily',
    connectedAt: '2023-07-01', features: ['Employee sync', 'Auto-onboarding trigger', 'Auto-offboarding trigger', 'Department sync'],
    syncCount: 342,
  },
  {
    id: 'int6', name: 'Xero', category: 'Accounting',
    description: 'Accounting integration for IT spend tracking and shadow IT detection',
    status: 'Error', lastSync: '2024-02-19T10:00:00Z', syncFrequency: 'Daily',
    connectedAt: '2023-08-15', features: ['Transaction import', 'Vendor matching', 'Shadow IT detection', 'PO matching'],
    errorMessage: 'Authentication token expired. Please reconnect.',
    syncCount: 128,
  },
  {
    id: 'int7', name: 'Jira', category: 'Ticketing',
    description: 'Link assets to support tickets and track IT service requests',
    status: 'Connected', lastSync: '2024-02-21T07:00:00Z', syncFrequency: 'Real-time',
    connectedAt: '2023-09-01', features: ['Asset-ticket linking', 'Auto ticket creation', 'Status sync', 'SLA tracking'],
    syncCount: 543,
  },
  {
    id: 'int8', name: 'NinjaOne', category: 'MDM/RMM',
    description: 'RMM for monitoring and managing endpoints',
    status: 'Disconnected',
    features: ['Remote monitoring', 'Patch management', 'Device inventory', 'Alert sync'],
  },
  {
    id: 'int9', name: 'Azure AD / Entra ID', category: 'SSO/IAM',
    description: 'Microsoft identity platform — user and group sync',
    status: 'Disconnected',
    features: ['User sync', 'Group sync', 'Conditional access', 'License detection'],
  },
  {
    id: 'int10', name: 'QuickBooks', category: 'Accounting',
    description: 'QuickBooks accounting integration',
    status: 'Disconnected',
    features: ['Invoice import', 'Expense tracking', 'Vendor sync', 'Budget reporting'],
  },
];

// ─── Mock Activity Log ────────────────────────────────────────────────────
export const mockActivityLog: ActivityEntry[] = [
  { id: 'act1', timestamp: '2024-02-21T09:15:00Z', action: 'Asset Created', user: 'Tom Admin', details: 'Dell Latitude 5540 added to inventory', module: 'Assets', entityId: 'a8', entityName: 'Dell Latitude 5540' },
  { id: 'act2', timestamp: '2024-02-21T09:00:00Z', action: 'License Assigned', user: 'Tom Admin', details: 'Slack license assigned to Bob Smith', module: 'Apps', entityId: 'app1', entityName: 'Slack' },
  { id: 'act3', timestamp: '2024-02-21T08:45:00Z', action: 'Person Onboarding', user: 'Grace Kim', details: 'Henry Wilson set to Onboarding status', module: 'People', entityId: 'p8', entityName: 'Henry Wilson' },
  { id: 'act4', timestamp: '2024-02-20T16:30:00Z', action: 'Status Changed', user: 'Tom Admin', details: 'ThinkPad X1 Carbon moved to In Repair', module: 'Assets', entityId: 'a5', entityName: 'ThinkPad X1 Carbon' },
  { id: 'act5', timestamp: '2024-02-20T14:00:00Z', action: 'Integration Error', user: 'System', details: 'Xero integration authentication failed', module: 'Integrations', entityId: 'int6', entityName: 'Xero' },
  { id: 'act6', timestamp: '2024-02-20T11:20:00Z', action: 'Person Offboarding', user: 'Grace Kim', details: 'Irene Chen set to Offboarding status', module: 'People', entityId: 'p9', entityName: 'Irene Chen' },
  { id: 'act7', timestamp: '2024-02-19T15:45:00Z', action: 'App Added', user: 'Alice Johnson', details: 'Asana detected via Shadow IT', module: 'Apps', entityId: 'app9', entityName: 'Asana' },
  { id: 'act8', timestamp: '2024-02-19T10:00:00Z', action: 'License Unassigned', user: 'Tom Admin', details: 'Notion license removed from Carol White', module: 'Apps', entityId: 'app7', entityName: 'Notion' },
  { id: 'act9', timestamp: '2024-02-18T14:30:00Z', action: 'Asset Retired', user: 'Tom Admin', details: 'MacBook Air 13" moved to Retired status', module: 'Assets', entityId: 'a7', entityName: 'MacBook Air 13"' },
  { id: 'act10', timestamp: '2024-02-18T09:00:00Z', action: 'Document Uploaded', user: 'Alice Johnson', details: 'Warranty certificate uploaded for MacBook Pro 14"', module: 'Assets', entityId: 'a1', entityName: 'MacBook Pro 14"' },
];

// ─── Mock Notifications ───────────────────────────────────────────────────
export const mockNotifications: Notification[] = [
  { id: 'n1', type: 'warning', title: 'License Renewal Due', message: 'HubSpot enterprise license expires in 7 days', timestamp: '2024-02-21T09:00:00Z', read: false, link: '/apps/app6' },
  { id: 'n2', type: 'warning', title: 'Warranty Expiring', message: 'iPhone 15 Pro warranty expires in 15 days', timestamp: '2024-02-21T08:30:00Z', read: false, link: '/assets/a4' },
  { id: 'n3', type: 'error', title: 'Integration Error', message: 'Xero integration authentication has expired', timestamp: '2024-02-20T14:00:00Z', read: false, link: '/integrations' },
  { id: 'n4', type: 'info', title: 'New Asset Detected', message: 'NinjaOne detected 2 new devices', timestamp: '2024-02-20T11:00:00Z', read: true },
  { id: 'n5', type: 'info', title: 'Onboarding Started', message: 'Henry Wilson\'s onboarding has begun', timestamp: '2024-02-20T09:00:00Z', read: true, link: '/people/p8' },
  { id: 'n6', type: 'warning', title: 'Shadow IT Detected', message: 'Asana detected via user logins — 12 users', timestamp: '2024-02-19T15:45:00Z', read: true, link: '/apps/app9' },
];

// ─── Mock Org Users ───────────────────────────────────────────────────────
export const mockOrgUsers: OrgUser[] = [
  { id: 'u1', name: 'Tom Admin', email: 'tom@company.com', role: 'Admin', status: 'Active', lastLogin: '2024-02-21T09:00:00Z', department: 'IT' },
  { id: 'u2', name: 'Alice Johnson', email: 'alice.johnson@company.com', role: 'IT Manager', status: 'Active', lastLogin: '2024-02-21T08:30:00Z', department: 'Engineering' },
  { id: 'u3', name: 'Grace Kim', email: 'grace.kim@company.com', role: 'IT Manager', status: 'Active', lastLogin: '2024-02-20T16:00:00Z', department: 'HR' },
  { id: 'u4', name: 'Bob Smith', email: 'bob.smith@company.com', role: 'Read Only', status: 'Active', lastLogin: '2024-02-19T11:00:00Z', department: 'Sales' },
  { id: 'u5', name: 'Sarah Finance', email: 'sarah@company.com', role: 'Finance', status: 'Active', lastLogin: '2024-02-18T14:00:00Z', department: 'Finance' },
  { id: 'u6', name: 'Mike New', email: 'mike@company.com', role: 'Read Only', status: 'Invited', department: 'Marketing' },
];

// ─── Mock Onboarding Kits ─────────────────────────────────────────────────
export const mockOnboardingKits: OnboardingKit[] = [
  {
    id: 'kit1', name: 'Engineering Kit', role: 'Software Engineer',
    department: 'Engineering',
    assets: [{ type: 'Laptop', model: 'MacBook Pro 14" M3 Pro' }, { type: 'Monitor', model: 'Dell UltraSharp 27"' }, { type: 'Peripheral', model: 'Logitech MX Master 3S' }],
    apps: [{ appId: 'app2', appName: 'GitHub' }, { appId: 'app1', appName: 'Slack' }, { appId: 'app4', appName: 'Jira' }],
  },
  {
    id: 'kit2', name: 'Sales Kit', role: 'Account Executive',
    department: 'Sales',
    assets: [{ type: 'Laptop', model: 'MacBook Pro 14" M3 Pro' }, { type: 'Phone', model: 'iPhone 15 Pro 256GB' }],
    apps: [{ appId: 'app6', appName: 'HubSpot' }, { appId: 'app1', appName: 'Slack' }, { appId: 'app5', appName: 'Zoom' }],
  },
  {
    id: 'kit3', name: 'Design Kit', role: 'Product Designer',
    department: 'Design',
    assets: [{ type: 'Laptop', model: 'MacBook Pro 14" M3 Pro' }, { type: 'Tablet', model: 'iPad Pro 12.9"' }],
    apps: [{ appId: 'app3', appName: 'Figma' }, { appId: 'app1', appName: 'Slack' }],
  },
];

// ─── Chart / Report Data ──────────────────────────────────────────────────
export const spendData: SpendData[] = [
  { month: 'Aug', hardware: 12400, software: 18200, total: 30600 },
  { month: 'Sep', hardware: 28900, software: 18500, total: 47400 },
  { month: 'Oct', hardware: 9800, software: 19100, total: 28900 },
  { month: 'Nov', hardware: 15300, software: 20300, total: 35600 },
  { month: 'Dec', hardware: 22100, software: 21000, total: 43100 },
  { month: 'Jan', hardware: 7600, software: 21400, total: 29000 },
  { month: 'Feb', hardware: 11200, software: 21800, total: 33000 },
];

export const assetStatusData: AssetStatusData[] = [
  { name: 'Deployed', value: 67, color: '#22c55e' },
  { name: 'In Stock', value: 18, color: '#3b82f6' },
  { name: 'In Repair', value: 6, color: '#f59e0b' },
  { name: 'Retired', value: 7, color: '#9ca3af' },
  { name: 'Lost', value: 2, color: '#ef4444' },
];

export const categorySpendData: CategorySpend[] = [
  { category: 'Laptops', amount: 28400, count: 32 },
  { category: 'Software / SaaS', amount: 21800, count: 10 },
  { category: 'Phones', amount: 8700, count: 15 },
  { category: 'Monitors', amount: 6300, count: 28 },
  { category: 'Tablets', amount: 4200, count: 8 },
  { category: 'Infrastructure', amount: 3100, count: 5 },
  { category: 'Peripherals', amount: 1800, count: 42 },
];

export const departmentSpendData = [
  { department: 'Engineering', hardware: 45200, software: 38400, total: 83600 },
  { department: 'Sales', hardware: 18900, software: 22100, total: 41000 },
  { department: 'Design', hardware: 12400, software: 9800, total: 22200 },
  { department: 'Finance', hardware: 8700, software: 6200, total: 14900 },
  { department: 'HR', hardware: 5400, software: 4100, total: 9500 },
  { department: 'Marketing', hardware: 6800, software: 8300, total: 15100 },
];
