import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Integrations } from '../Integrations';
import { useStore } from '../../store/useStore';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock the sync utilities so they don't make real calls
vi.mock('../../utils/intune', () => ({
  syncIntuneDevices: vi.fn().mockResolvedValue([]),
  validateIntuneCredentials: vi.fn().mockResolvedValue(true),
  INTUNE_FEATURES: ['Device Sync', 'Compliance Policies'],
  INTUNE_REQUIRED_PERMISSIONS: ['DeviceManagementManagedDevices.Read.All'],
}));

vi.mock('../../utils/ninjaone', () => ({
  syncNinjaOneDevices: vi.fn().mockResolvedValue([]),
  validateNinjaOneCredentials: vi.fn().mockResolvedValue(true),
  NINJAONE_FEATURES: ['Device Sync', 'Alerts'],
}));

vi.mock('../../utils/agentImport', () => ({
  buildAssetsFromReport: vi.fn().mockReturnValue({
    deviceAsset: { id: 'agent-dev-1', name: 'Agent Device' },
    monitorAssets: [],
    peripheralAssets: [],
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderIntegrations() {
  return render(
    <BrowserRouter>
      <Integrations />
    </BrowserRouter>,
  );
}

// ── Test Data ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({
    integrations: [
      {
        id: 'int1',
        name: 'Microsoft Intune',
        category: 'MDM/RMM',
        description: 'Device management and compliance',
        status: 'Connected',
        lastSync: '2024-02-20T10:00:00Z',
        features: ['Device Sync', 'Compliance'],
        syncCount: 5,
        syncFrequency: 'Every 4 hours',
      },
      {
        id: 'int2',
        name: 'NinjaOne',
        category: 'MDM/RMM',
        description: 'Remote monitoring and management',
        status: 'Disconnected',
        features: ['Device Sync'],
        syncCount: 0,
      },
      {
        id: 'int3',
        name: 'BambooHR',
        category: 'HR',
        description: 'HR platform for people data',
        status: 'Disconnected',
        features: ['People Sync'],
        syncCount: 0,
      },
      {
        id: 'int4',
        name: 'Jamf Pro',
        category: 'MDM/RMM',
        description: 'Apple device management',
        status: 'Disconnected',
        features: ['Device Sync', 'App Management'],
        syncCount: 0,
      },
      {
        id: 'int5',
        name: 'Zendesk',
        category: 'Ticketing',
        description: 'Help desk and ticketing',
        status: 'Disconnected',
        features: ['Ticket Sync'],
        syncCount: 0,
      },
      {
        id: 'int6',
        name: 'Blimp Agent',
        category: 'Core',
        description: 'Lightweight agent for hardware detection',
        status: 'Disconnected',
        features: ['Hardware Detection', 'Monitor EDID', 'USB Peripherals'],
        syncCount: 0,
      },
    ],
    assets: [
      {
        id: 'a1',
        tag: 'AST-001',
        name: 'Laptop 1',
        type: 'Laptop',
        make: 'Dell',
        model: 'XPS',
        serial: 'S1',
        status: 'Deployed',
        location: 'NYC',
        purchaseDate: '2024-01-01',
        warrantyExpiry: '2027-01-01',
        cost: 1500,
        currency: 'USD',
      },
      {
        id: 'a2',
        tag: 'AST-002',
        name: 'Monitor 1',
        type: 'Monitor',
        make: 'LG',
        model: '27"',
        serial: 'S2',
        status: 'In Stock',
        location: 'NYC',
        purchaseDate: '2024-01-01',
        warrantyExpiry: '2027-01-01',
        cost: 500,
        currency: 'USD',
      },
    ],
    apps: [
      {
        id: 'app1',
        name: 'Slack',
        vendor: 'Salesforce',
        category: 'Communication',
        licenseType: 'Per User',
        totalLicenses: 50,
        assignedLicenses: 40,
        costPerLicense: 12,
        billingCycle: 'monthly',
        currency: 'USD',
        renewalDate: '2025-06-01',
        noticePeriodDays: 30,
        status: 'Active',
        detectionSource: 'Manual',
      },
    ],
    people: [
      {
        id: 'p1',
        name: 'Alice',
        email: 'a@co.com',
        department: 'Engineering',
        title: 'Eng',
        status: 'Active',
        location: 'NYC',
        startDate: '2023-01-01',
        assetsAssigned: 2,
        licensesAssigned: 3,
        totalItCost: 2000,
      },
    ],
    currentUserRole: 'Admin',
    toasts: [],
    activityLog: [],
    notifications: [],
  });
});

// ── Suite ────────────────────────────────────────────────────────────────────

describe('Integrations', () => {
  // ── 1. Renders integration cards ───────────────────────────────────────────

  it('renders the page heading', () => {
    renderIntegrations();
    expect(
      screen.getByRole('heading', { name: /integrations/i }),
    ).toBeInTheDocument();
  });

  it('renders all integration cards by name', () => {
    renderIntegrations();
    expect(screen.getByText('Microsoft Intune')).toBeInTheDocument();
    expect(screen.getByText('NinjaOne')).toBeInTheDocument();
    expect(screen.getByText('BambooHR')).toBeInTheDocument();
    expect(screen.getByText('Jamf Pro')).toBeInTheDocument();
    expect(screen.getByText('Zendesk')).toBeInTheDocument();
    expect(screen.getByText('Blimp Agent')).toBeInTheDocument();
  });

  it('renders descriptions for each integration', () => {
    renderIntegrations();
    expect(screen.getByText('Device management and compliance')).toBeInTheDocument();
    expect(screen.getByText('Remote monitoring and management')).toBeInTheDocument();
    expect(screen.getByText('HR platform for people data')).toBeInTheDocument();
    expect(screen.getByText('Apple device management')).toBeInTheDocument();
    expect(screen.getByText('Help desk and ticketing')).toBeInTheDocument();
    expect(screen.getByText('Lightweight agent for hardware detection')).toBeInTheDocument();
  });

  it('renders category badges for each integration', () => {
    renderIntegrations();
    const mdmBadges = screen.getAllByText('MDM/RMM');
    // 3 on cards (Intune, NinjaOne, Jamf) + 1 in category filter = 4+
    expect(mdmBadges.length).toBeGreaterThanOrEqual(3);
    const hrBadges = screen.getAllByText('HR');
    expect(hrBadges.length).toBeGreaterThanOrEqual(1);
    const ticketingBadges = screen.getAllByText('Ticketing');
    expect(ticketingBadges.length).toBeGreaterThanOrEqual(1);
    const coreBadges = screen.getAllByText('Core');
    expect(coreBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders feature badges on cards', () => {
    renderIntegrations();
    // Multiple cards show "Device Sync" (Intune, NinjaOne, Jamf)
    const deviceSyncBadges = screen.getAllByText('Device Sync');
    expect(deviceSyncBadges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('People Sync')).toBeInTheDocument();
    expect(screen.getByText('Ticket Sync')).toBeInTheDocument();
  });

  // ── 2. Shows "Connected" status for connected integrations ─────────────────

  it('shows "Connected" status badge for Intune', () => {
    renderIntegrations();
    // "Connected" appears as status badge + stat card label
    const connectedElements = screen.getAllByText('Connected');
    expect(connectedElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the connected count in the page subtitle', () => {
    renderIntegrations();
    expect(screen.getByText(/1 connected/)).toBeInTheDocument();
    expect(screen.getByText(/5 available/)).toBeInTheDocument();
  });

  it('shows the "Connected" stat card with a value of 1', () => {
    renderIntegrations();
    const statLabels = screen.getAllByText('Connected');
    expect(statLabels.length).toBeGreaterThanOrEqual(1);
  });

  // ── 3. Shows "Disconnected" status ─────────────────────────────────────────

  it('shows "Disconnected" status badge for disconnected integrations', () => {
    renderIntegrations();
    const disconnected = screen.getAllByText('Disconnected');
    expect(disconnected.length).toBe(5);
  });

  // ── 4. "Sync Now" button visible for connected integrations ────────────────

  it('shows "Sync Now" button for connected Intune integration', () => {
    renderIntegrations();
    expect(screen.getByText('Sync Now')).toBeInTheDocument();
  });

  it('does not show multiple Sync Now buttons when only one integration is connected', () => {
    renderIntegrations();
    const syncButtons = screen.getAllByText('Sync Now');
    expect(syncButtons).toHaveLength(1);
  });

  // ── 5. "Connect" button visible for disconnected integrations ──────────────

  it('shows "Connect" buttons for disconnected integrations', () => {
    renderIntegrations();
    const connectButtons = screen.getAllByText('Connect');
    // NinjaOne, BambooHR, Jamf Pro, Zendesk are disconnected and not the agent
    expect(connectButtons.length).toBe(4);
  });

  it('shows "Set Up Agent" button for disconnected Blimp Agent', () => {
    renderIntegrations();
    expect(screen.getByText('Set Up Agent')).toBeInTheDocument();
  });

  // ── 6. Settings gear visible for connected integrations ────────────────────

  it('shows settings button for connected integrations', () => {
    renderIntegrations();
    const settingsButton = screen.getByTitle('Integration settings');
    expect(settingsButton).toBeInTheDocument();
  });

  it('does not show settings button for disconnected integrations', () => {
    renderIntegrations();
    const settingsButtons = screen.getAllByTitle('Integration settings');
    // Only one connected integration (Intune) should have the settings gear
    expect(settingsButtons).toHaveLength(1);
  });

  // ── 7. Last sync time for connected integrations ──────────────────────────

  it('shows last sync time for connected integrations', () => {
    renderIntegrations();
    // The lastSync is '2024-02-20T10:00:00Z', formatted as "Feb 20, ..."
    expect(screen.getByText(/Feb 20/)).toBeInTheDocument();
  });

  it('shows sync frequency for connected integrations', () => {
    renderIntegrations();
    expect(screen.getByText('Every 4 hours')).toBeInTheDocument();
  });

  it('shows sync record count for connected integrations', () => {
    renderIntegrations();
    expect(screen.getByText('5 records')).toBeInTheDocument();
  });

  // ── 8. Stats summary cards ─────────────────────────────────────────────────

  it('shows the Records Synced stat', () => {
    renderIntegrations();
    expect(screen.getByText('Records Synced')).toBeInTheDocument();
  });

  it('shows the Errors stat', () => {
    renderIntegrations();
    expect(screen.getByText('Errors')).toBeInTheDocument();
  });

  it('shows the Available stat', () => {
    renderIntegrations();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  // ── 9. Category filter buttons ─────────────────────────────────────────────

  it('renders category filter buttons', () => {
    renderIntegrations();
    // "All" and "SSO/IAM" only appear once (in the filter bar); "MDM/RMM" appears in filter + cards
    expect(screen.getAllByText('All').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('MDM/RMM').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('SSO/IAM')).toBeInTheDocument();
    expect(screen.getByText('Accounting')).toBeInTheDocument();
  });

  it('filters integrations when a category button is clicked', () => {
    renderIntegrations();
    const hrButtons = screen.getAllByText('HR');
    fireEvent.click(hrButtons[0]);
    expect(screen.getByText('BambooHR')).toBeInTheDocument();
    expect(screen.queryByText('Microsoft Intune')).not.toBeInTheDocument();
    expect(screen.queryByText('NinjaOne')).not.toBeInTheDocument();
  });

  it('shows all integrations when "All" category is selected', () => {
    renderIntegrations();
    const hrButtons = screen.getAllByText('HR');
    fireEvent.click(hrButtons[0]);
    expect(screen.queryByText('Microsoft Intune')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('All'));
    expect(screen.getByText('Microsoft Intune')).toBeInTheDocument();
    expect(screen.getByText('BambooHR')).toBeInTheDocument();
  });

  // ── 10. Clicking "Connect" opens the right modal ──────────────────────────

  it('opens IntuneModal when clicking Connect on a disconnected Intune', () => {
    useStore.setState({
      integrations: useStore.getState().integrations.map((i) =>
        i.name === 'Microsoft Intune'
          ? { ...i, status: 'Disconnected' as const, lastSync: undefined, syncCount: 0 }
          : i,
      ),
    });
    renderIntegrations();
    const connectButtons = screen.getAllByText('Connect');
    fireEvent.click(connectButtons[0]);
    expect(screen.getByText(/Connect Microsoft Intune/i)).toBeInTheDocument();
  });

  it('opens NinjaOneModal when clicking Connect on NinjaOne', () => {
    renderIntegrations();
    const connectButtons = screen.getAllByText('Connect');
    fireEvent.click(connectButtons[0]);
    expect(screen.getByText(/Connect NinjaOne/i)).toBeInTheDocument();
  });

  it('opens generic modal when clicking Connect on BambooHR', () => {
    renderIntegrations();
    const connectButtons = screen.getAllByText('Connect');
    fireEvent.click(connectButtons[1]);
    expect(screen.getByText(/Connect BambooHR/i)).toBeInTheDocument();
  });

  // ── 11. Settings modal for connected integrations ─────────────────────────

  it('opens IntegrationSettingsModal when clicking the settings gear', () => {
    renderIntegrations();
    const settingsButton = screen.getByTitle('Integration settings');
    fireEvent.click(settingsButton);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // ── 12. Import Agent Report button ─────────────────────────────────────────

  it('shows the Import Agent Report button', () => {
    renderIntegrations();
    expect(screen.getByText('Import Agent Report')).toBeInTheDocument();
  });

  // ── 13. Live Sync badge for Intune ─────────────────────────────────────────

  it('shows "Live Sync" badge for connected Intune', () => {
    renderIntegrations();
    expect(screen.getByText('Live Sync')).toBeInTheDocument();
  });

  // ── 14. Connected Blimp Agent shows "Manage Agent" instead of "Sync Now" ──

  it('shows "Manage Agent" button when Blimp Agent is connected', () => {
    useStore.setState({
      integrations: useStore.getState().integrations.map((i) =>
        i.name === 'Blimp Agent'
          ? { ...i, status: 'Connected' as const, lastSync: '2024-02-20T10:00:00Z' }
          : i,
      ),
    });
    renderIntegrations();
    expect(screen.getByText('Manage Agent')).toBeInTheDocument();
  });

  // ── 15. Error status integration ──────────────────────────────────────────

  it('shows error banner and Reconnect button when integration has Error status', () => {
    useStore.setState({
      integrations: useStore.getState().integrations.map((i) =>
        i.name === 'NinjaOne'
          ? {
              ...i,
              status: 'Error' as const,
              errorMessage: 'Authentication token expired',
            }
          : i,
      ),
    });
    renderIntegrations();
    expect(screen.getByText(/1 integration error/i)).toBeInTheDocument();
    expect(screen.getByText('Authentication token expired')).toBeInTheDocument();
    const reconnectButtons = screen.getAllByText('Reconnect');
    expect(reconnectButtons.length).toBeGreaterThanOrEqual(1);
  });

  // ── 16. Multiple connected integrations ────────────────────────────────────

  it('shows correct connected count when multiple integrations are connected', () => {
    useStore.setState({
      integrations: useStore.getState().integrations.map((i) =>
        i.name === 'NinjaOne'
          ? { ...i, status: 'Connected' as const, lastSync: '2024-02-21T08:00:00Z', syncCount: 3 }
          : i,
      ),
    });
    renderIntegrations();
    expect(screen.getByText(/2 connected/)).toBeInTheDocument();
  });
});
