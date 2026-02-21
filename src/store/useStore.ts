import { create } from 'zustand';
import type { Asset, App, Person, Integration, Notification } from '../types';
import { mockAssets, mockApps, mockPeople, mockIntegrations, mockNotifications } from '../data/mockData';

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

  // UI State
  sidebarCollapsed: boolean;
  globalSearch: string;
  toasts: ToastMessage[];

  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setGlobalSearch: (search: string) => void;

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

  // Notification actions
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Toast actions
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  assets: mockAssets,
  apps: mockApps,
  people: mockPeople,
  integrations: mockIntegrations,
  notifications: mockNotifications,

  sidebarCollapsed: false,
  globalSearch: '',
  toasts: [],

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setGlobalSearch: (search) => set({ globalSearch: search }),

  addAsset: (asset) => set((state) => ({ assets: [asset, ...state.assets] })),
  updateAsset: (id, updates) =>
    set((state) => ({
      assets: state.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  deleteAsset: (id) =>
    set((state) => ({ assets: state.assets.filter((a) => a.id !== id) })),

  addApp: (app) => set((state) => ({ apps: [app, ...state.apps] })),
  updateApp: (id, updates) =>
    set((state) => ({
      apps: state.apps.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  addPerson: (person) => set((state) => ({ people: [person, ...state.people] })),
  updatePerson: (id, updates) =>
    set((state) => ({
      people: state.people.map((p) => (p.id === id ? { ...p, ...updates } : p)),
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

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
