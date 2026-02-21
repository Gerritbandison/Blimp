// ─── Asset Types ───────────────────────────────────────────────────────────
export type AssetStatus = 'Deployed' | 'In Stock' | 'In Repair' | 'Retired' | 'Lost';
export type AssetType = 'Laptop' | 'Monitor' | 'Phone' | 'Tablet' | 'Desktop' | 'Server' | 'Printer' | 'Network' | 'Peripheral' | 'Other';

export interface Asset {
  id: string;
  tag: string;
  name: string;
  type: AssetType;
  make: string;
  model: string;
  serial: string;
  status: AssetStatus;
  assignedTo?: string;
  assignedToId?: string;
  location: string;
  purchaseDate: string;
  warrantyExpiry: string;
  cost: number;
  currency: string;
  os?: string;
  ram?: string;
  storage?: string;
  screenSize?: string;
  poNumber?: string;
  vendor?: string;
  notes?: string;
  tags?: string[];
  department?: string;
  category?: string;
  linkedApps?: string[];
  linkedAssets?: string[];
  documents?: Document[];
  lifecycle?: LifecycleEvent[];
  activityLog?: ActivityEntry[];
  depreciation?: {
    method: 'straight-line' | 'custom';
    usefulLife: number;
    residualValue: number;
  };
  leaseInfo?: {
    isLeased: boolean;
    leaseEnd?: string;
    lessor?: string;
    monthlyPayment?: number;
  };
  detectionSource?: string;
  qrCode?: string;
}

export interface LifecycleEvent {
  id: string;
  date: string;
  event: string;
  description?: string;
  user?: string;
}

// ─── App / License Types ───────────────────────────────────────────────────
export type AppStatus = 'Active' | 'Inactive' | 'Pending' | 'Expired' | 'In Review' | 'Shadow IT';
export type LicenseType = 'Per User' | 'Per Device' | 'Site' | 'Enterprise' | 'Open Source';
export type LicenseStatus = 'Active' | 'Unused' | 'Pending' | 'Expired';
export type DetectionSource = 'Manual' | 'SSO' | 'MDM' | 'Accounting' | 'Shadow IT' | string;
export type AppCategory = 'Productivity' | 'Development' | 'Design' | 'Communication' | 'Security' | 'HR' | 'Finance' | 'Marketing' | 'Analytics' | 'Infrastructure' | 'Business' | 'Other';

export interface App {
  id: string;
  name: string;
  vendor: string;
  logo?: string;
  category: AppCategory;
  licenseType: LicenseType;
  totalLicenses: number;
  assignedLicenses: number;
  costPerLicense: number;
  billingCycle: 'monthly' | 'annual';
  currency: string;
  renewalDate: string;
  noticePeriodDays: number;
  status: AppStatus;
  detectionSource: DetectionSource;
  adminOwner?: string;
  businessOwner?: string;
  description?: string;
  vendorContact?: string;
  contractStart?: string;
  contractEnd?: string;
  supportTier?: string;
  licenses?: License[];
  users?: AppUser[];
  compliance?: ComplianceInfo;
  documents?: Document[];
  activityLog?: ActivityEntry[];
  paymentHistory?: Payment[];
  tags?: string[];
  url?: string;
}

export interface License {
  id: string;
  appId: string;
  assignedTo?: string;
  assignedToId?: string;
  status: LicenseStatus;
  assignedDate?: string;
  lastUsed?: string;
  key?: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  department: string;
  lastLogin?: string;
  usageStatus: 'Active' | 'Inactive' | 'Never Used';
}

export interface ComplianceInfo {
  soc2: boolean;
  iso27001: boolean;
  gdpr: boolean;
  hipaa?: boolean;
  cyberEssentials?: boolean;
  riskRating: 'Low' | 'Medium' | 'High' | 'Critical';
  lastAudit?: string;
  dpaStatus?: 'Signed' | 'Pending' | 'Not Required';
  questionnaire?: 'Complete' | 'In Progress' | 'Not Started';
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'Paid' | 'Pending' | 'Failed';
  invoice?: string;
}

// ─── People Types ──────────────────────────────────────────────────────────
export type PersonStatus = 'Active' | 'Onboarding' | 'Offboarding' | 'Offboarded';

export interface Person {
  id: string;
  name: string;
  email: string;
  department: string;
  title: string;
  status: PersonStatus;
  location: string;
  startDate: string;
  endDate?: string;
  managerId?: string;
  managerName?: string;
  phone?: string;
  photo?: string;
  assetsAssigned: number;
  licensesAssigned: number;
  assets?: string[];
  licenses?: string[];
  notes?: string;
  documents?: Document[];
  activityLog?: ActivityEntry[];
  onboardingTasks?: OnboardingTask[];
  offboardingTasks?: OffboardingTask[];
  totalItCost?: number;
  tags?: string[];
}

export interface OnboardingTask {
  id: string;
  task: string;
  completed: boolean;
  dueDate?: string;
  assignedTo?: string;
  category: 'Hardware' | 'Software' | 'Access' | 'Admin';
}

export interface OffboardingTask {
  id: string;
  task: string;
  completed: boolean;
  dueDate?: string;
  assignedTo?: string;
  category: 'Hardware' | 'Software' | 'Access' | 'Admin' | 'Security';
}

// ─── Common Types ──────────────────────────────────────────────────────────
export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  url?: string;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details?: string;
  module?: string;
  entityId?: string;
  entityName?: string;
}

export interface Notification {
  id: string;
  type: 'warning' | 'info' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface Integration {
  id: string;
  name: string;
  category: string;
  logo?: string;
  description: string;
  status: 'Connected' | 'Disconnected' | 'Error' | 'Syncing';
  lastSync?: string;
  syncFrequency?: string;
  connectedAt?: string;
  features: string[];
  syncCount?: number;
  errorMessage?: string;
}

// ─── Report Types ──────────────────────────────────────────────────────────
export interface SpendData {
  month: string;
  hardware: number;
  software: number;
  total: number;
}

export interface AssetStatusData {
  name: string;
  value: number;
  color: string;
}

export interface CategorySpend {
  category: string;
  amount: number;
  count: number;
}

// ─── Settings Types ────────────────────────────────────────────────────────
export type UserRole = 'Admin' | 'IT Manager' | 'Finance' | 'Read Only' | 'Custom';

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Invited' | 'Suspended';
  lastLogin?: string;
  photo?: string;
  department?: string;
}

export interface OnboardingKit {
  id: string;
  name: string;
  role: string;
  department?: string;
  location?: string;
  assets: { type: AssetType; model: string }[];
  apps: { appId: string; appName: string }[];
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  module: 'asset' | 'app' | 'person';
  options?: string[];
  required: boolean;
}

// ─── Asset Group Types ────────────────────────────────────────────────────
export interface AssetGroup {
  id: string;
  name: string;
  type: AssetType;
  model: string;
  targetStock: number;
  location?: string;
  department?: string;
}

// ─── Settings Types (persisted) ───────────────────────────────────────────
export interface CompanySettings {
  name: string;
  domain: string;
  currency: string;
  fiscalYearStart: string;
  timezone: string;
  plan: string;
}

export interface NotificationSettings {
  renewalReminder: boolean;
  renewalDays: number;
  warrantyExpiry: boolean;
  warrantyDays: number;
  lowStock: boolean;
  onboarding: boolean;
  offboarding: boolean;
  shadowIt: boolean;
}
