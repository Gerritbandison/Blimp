import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Asset, App, Person, Integration, Notification,
  OrgUser, AssetGroup, CompanySettings, NotificationSettings,
  ActivityEntry,
} from '../types';
import {
  mockAssets, mockApps, mockPeople, mockIntegrations,
  mockNotifications, mockOrgUsers, mockActivityLog,
} from '../data/mockData';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface AppState {
  // Data
  assets: Asset[];
  apps: App[];
  people: Person[];
  integrations: Integration[];
  notifications: Notification[];
  orgUsers: OrgUser[];
  assetGroups: AssetGroup[];
  activityLog: ActivityEntry[];

  // Settings (persisted)
  companySettings: CompanySettings;
  notificationSettings: NotificationSettings;

  // UI State
  sidebarCollapsed: boolean;
  globalSearch: string;
  toasts: ToastMessage[];
  theme: 'light' | 'dark' | 'system';

  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setGlobalSearch: (search: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Asset actions
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;

  // App actions
  addApp: (app: App) => void;
  updateApp: (id: string, updates: Partial<App>) => void;

  // People actions
  addPerson: (person: Person) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;

  // Integration actions
  updateIntegration: (id: string, updates: Partial<Integration>) => void;

  // Notification actions
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Org Users actions
  updateOrgUser: (id: string, updates: Partial<OrgUser>) => void;

  // Asset Group actions
  addAssetGroup: (group: AssetGroup) => void;
  updateAssetGroup: (id: string, updates: Partial<AssetGroup>) => void;
  deleteAssetGroup: (id: string) => void;

  // Settings actions
  updateCompanySettings: (updates: Partial<CompanySettings>) => void;
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void;

  // Activity Log
  addActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void;

  // Toast actions
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const defaultCompanySettings: CompanySettings = {
  name: 'Acme Corp',
  domain: 'acme.com',
  currency: 'USD',
  fiscalYearStart: 'January',
  timezone: 'America/New_York',
  plan: 'Business',
};

const defaultNotificationSettings: NotificationSettings = {
  renewalReminder: true,
  renewalDays: 30,
  warrantyExpiry: true,
  warrantyDays: 60,
  lowStock: true,
  onboarding: true,
  offboarding: true,
  shadowIt: true,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      assets: mockAssets,
      apps: mockApps,
      people: mockPeople,
      integrations: mockIntegrations,
      notifications: mockNotifications,
      orgUsers: mockOrgUsers,
      assetGroups: [],
      activityLog: mockActivityLog,

      companySettings: defaultCompanySettings,
      notificationSettings: defaultNotificationSettings,

      sidebarCollapsed: false,
      globalSearch: '',
      toasts: [],
      theme: 'light',

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setGlobalSearch: (search) => set({ globalSearch: search }),
      setTheme: (theme) => set({ theme }),

      // ── Asset actions ──
      addAsset: (asset) => {
        set((state) => ({ assets: [asset, ...state.assets] }));
        // Auto-generate notification if warranty < 60 days
        const warrantyDays = Math.ceil(
          (new Date(asset.warrantyExpiry).getTime() - Date.now()) / 86400000
        );
        if (warrantyDays > 0 && warrantyDays <= 60) {
          get().addNotification({
            type: 'warning',
            title: 'Warranty Expiring Soon',
            message: `${asset.name} (${asset.tag}) warranty expires in ${warrantyDays} days`,
            timestamp: new Date().toISOString(),
            read: false,
            link: `/assets/${asset.id}`,
          });
        }
        get().addActivity({
          action: 'Asset Created',
          user: 'Current User',
          details: `${asset.name} (${asset.tag}) added to inventory`,
          module: 'Assets',
          entityId: asset.id,
          entityName: asset.name,
        });
      },

      updateAsset: (id, updates) =>
        set((state) => ({
          assets: state.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      deleteAsset: (id) => {
        const asset = get().assets.find((a) => a.id === id);
        set((state) => ({ assets: state.assets.filter((a) => a.id !== id) }));
        if (asset) {
          get().addActivity({
            action: 'Asset Deleted',
            user: 'Current User',
            details: `${asset.name} (${asset.tag}) removed from inventory`,
            module: 'Assets',
            entityId: id,
            entityName: asset.name,
          });
        }
      },

      // ── App actions ──
      addApp: (app) => {
        set((state) => ({ apps: [app, ...state.apps] }));
        const daysToRenewal = Math.ceil(
          (new Date(app.renewalDate).getTime() - Date.now()) / 86400000
        );
        if (daysToRenewal > 0 && daysToRenewal <= 30) {
          get().addNotification({
            type: 'warning',
            title: 'License Renewal Soon',
            message: `${app.name} renewal in ${daysToRenewal} days ($${(app.costPerLicense * app.totalLicenses).toLocaleString()})`,
            timestamp: new Date().toISOString(),
            read: false,
            link: `/apps/${app.id}`,
          });
        }
        get().addActivity({
          action: 'App Added',
          user: 'Current User',
          details: `${app.name} added to app register`,
          module: 'Apps',
          entityId: app.id,
          entityName: app.name,
        });
      },

      updateApp: (id, updates) =>
        set((state) => ({
          apps: state.apps.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      // ── People actions ──
      addPerson: (person) => {
        set((state) => ({ people: [person, ...state.people] }));
        if (person.status === 'Onboarding') {
          get().addNotification({
            type: 'info',
            title: 'Onboarding Started',
            message: `${person.name}'s onboarding has begun`,
            timestamp: new Date().toISOString(),
            read: false,
            link: `/people/${person.id}`,
          });
        }
        get().addActivity({
          action: person.status === 'Onboarding' ? 'Person Onboarding' : 'Person Created',
          user: 'Current User',
          details: `${person.name} added to system`,
          module: 'People',
          entityId: person.id,
          entityName: person.name,
        });
      },

      updatePerson: (id, updates) =>
        set((state) => ({
          people: state.people.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      // ── Integration actions ──
      updateIntegration: (id, updates) =>
        set((state) => ({
          integrations: state.integrations.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        })),

      // ── Notification actions ──
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            { ...notification, id: `n${Date.now()}-${Math.random().toString(36).substring(7)}` },
            ...state.notifications,
          ],
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      // ── Org Users actions ──
      updateOrgUser: (id, updates) =>
        set((state) => ({
          orgUsers: state.orgUsers.map((u) =>
            u.id === id ? { ...u, ...updates } : u
          ),
        })),

      // ── Asset Group actions ──
      addAssetGroup: (group) =>
        set((state) => ({ assetGroups: [...state.assetGroups, group] })),

      updateAssetGroup: (id, updates) =>
        set((state) => ({
          assetGroups: state.assetGroups.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        })),

      deleteAssetGroup: (id) =>
        set((state) => ({
          assetGroups: state.assetGroups.filter((g) => g.id !== id),
        })),

      // ── Settings actions ──
      updateCompanySettings: (updates) =>
        set((state) => ({
          companySettings: { ...state.companySettings, ...updates },
        })),

      updateNotificationSettings: (updates) =>
        set((state) => ({
          notificationSettings: { ...state.notificationSettings, ...updates },
        })),

      // ── Activity Log ──
      addActivity: (entry) =>
        set((state) => ({
          activityLog: [
            {
              ...entry,
              id: `act${Date.now()}-${Math.random().toString(36).substring(7)}`,
              timestamp: new Date().toISOString(),
            },
            ...state.activityLog,
          ].slice(0, 100), // Keep last 100 entries
        })),

      // ── Toast actions ──
      addToast: (toast) => {
        const id = Math.random().toString(36).substring(7);
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        setTimeout(() => {
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        }, 3500);
      },
      removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'blimp-itam-store',
      partialize: (state) => ({
        assets: state.assets,
        apps: state.apps,
        people: state.people,
        integrations: state.integrations,
        notifications: state.notifications,
        orgUsers: state.orgUsers,
        assetGroups: state.assetGroups,
        activityLog: state.activityLog,
        companySettings: state.companySettings,
        notificationSettings: state.notificationSettings,
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);
