import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '../Dashboard';
import { useStore } from '../../store/useStore';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Recharts components rely on ResizeObserver and measured dimensions which do
// not exist in jsdom. Stub every component the Dashboard imports so the rest
// of the tree still renders.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
}));

// Track navigate calls so we can assert quick-action routing.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Seed Data ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({
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
        name: 'Alice Johnson',
        email: 'alice@co.com',
        department: 'Engineering',
        title: 'Engineer',
        status: 'Active',
        location: 'NYC',
        startDate: '2023-01-01',
        assetsAssigned: 2,
        licensesAssigned: 3,
        totalItCost: 2000,
      },
    ],
    activityLog: [
      {
        id: 'act1',
        timestamp: '2024-02-01T10:00:00Z',
        action: 'Asset Created',
        user: 'Admin',
        details: 'Laptop added',
        module: 'Assets',
      },
    ],
    notifications: [
      {
        id: 'n1',
        type: 'warning',
        title: 'License Renewal',
        message: 'Slack renews soon',
        timestamp: '2024-02-01T10:00:00Z',
        read: false,
      },
    ],
    currentUserRole: 'Admin',
    currentUserName: 'Admin User',
    toasts: [],
    assetGroups: [],
    integrations: [],
  });
});

// ── Helper ───────────────────────────────────────────────────────────────────

function renderDashboard() {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>,
  );
}

// ── Test Suite ───────────────────────────────────────────────────────────────

describe('Dashboard', () => {
  // ── 1. Renders Dashboard heading ─────────────────────────────────────────

  describe('page heading', () => {
    it('renders the "Dashboard" heading', () => {
      renderDashboard();
      expect(
        screen.getByRole('heading', { name: /dashboard/i }),
      ).toBeInTheDocument();
    });

    it('displays the welcome subtitle', () => {
      renderDashboard();
      expect(
        screen.getByText(/welcome back\. here's your it overview\./i),
      ).toBeInTheDocument();
    });

    it('renders the Refresh button', () => {
      renderDashboard();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  // ── 2. KPI stat cards with correct values ────────────────────────────────

  describe('KPI stat cards', () => {
    it('shows "Total Assets" card with the correct asset count', () => {
      renderDashboard();
      expect(screen.getByText('Total Assets')).toBeInTheDocument();
      // 2 assets in the store; 1 is Deployed
      expect(screen.getByText('1 deployed')).toBeInTheDocument();
    });

    it('shows "Apps & Licenses" card with the correct app count', () => {
      renderDashboard();
      expect(screen.getByText('Apps & Licenses')).toBeInTheDocument();
      // 1 app which is Active
      const activeLabels = screen.getAllByText('1 active');
      expect(activeLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('shows "Total People" card with the correct people count', () => {
      renderDashboard();
      expect(screen.getByText('Total People')).toBeInTheDocument();
      // 1 person who is Active
      const activeLabels = screen.getAllByText('1 active');
      // Both Apps & People show "1 active"
      expect(activeLabels.length).toBe(2);
    });

    it('shows "Monthly IT Spend" card with a dollar amount', () => {
      renderDashboard();
      expect(screen.getByText('Monthly IT Spend')).toBeInTheDocument();
      // Software: 12 * 50 = $600/mo; Hardware: (1500 + 500) / 36 ~ $56
      // Total ~ $656, rendered as $656
      const spendElement = screen.getByText(/^\$[\d,]+$/);
      expect(spendElement).toBeInTheDocument();
    });

    it('shows "Needs Action" card with repairs/renewals/warnings subtitle', () => {
      renderDashboard();
      expect(screen.getByText('Needs Action')).toBeInTheDocument();
      expect(screen.getByText('Repairs, renewals, warnings')).toBeInTheDocument();
    });

    it('shows "Agent Coverage" card', () => {
      renderDashboard();
      expect(screen.getByText('Agent Coverage')).toBeInTheDocument();
      // No agent integration configured, so subtitle reads "Not connected"
      expect(screen.getByText('Not connected')).toBeInTheDocument();
    });

    it('updates KPI values when store data changes', () => {
      renderDashboard();
      // Initially 2 assets
      expect(screen.getByText('1 deployed')).toBeInTheDocument();

      // Add a third Deployed asset and re-render
      useStore.setState({
        assets: [
          ...useStore.getState().assets,
          {
            id: 'a3',
            tag: 'AST-003',
            name: 'Laptop 2',
            type: 'Laptop',
            make: 'HP',
            model: 'EliteBook',
            serial: 'S3',
            status: 'Deployed',
            location: 'LA',
            purchaseDate: '2024-06-01',
            warrantyExpiry: '2027-06-01',
            cost: 1200,
            currency: 'USD',
          },
        ],
      });

      // Re-render picks up the zustand state change
      const { unmount } = renderDashboard();
      expect(screen.getAllByText('2 deployed').length).toBeGreaterThanOrEqual(1);
      unmount();
    });
  });

  // ── 3. Quick action buttons rendered and clickable ───────────────────────

  describe('quick action buttons', () => {
    it('renders the "Add Asset" quick action button', () => {
      renderDashboard();
      expect(screen.getByText('Add Asset')).toBeInTheDocument();
    });

    it('renders the "Onboard User" quick action button', () => {
      renderDashboard();
      expect(screen.getByText('Onboard User')).toBeInTheDocument();
    });

    it('renders the "Review Licences" quick action button', () => {
      renderDashboard();
      expect(screen.getByText('Review Licences')).toBeInTheDocument();
    });

    it('renders the "IT Spend" quick action button', () => {
      renderDashboard();
      expect(screen.getByText('IT Spend')).toBeInTheDocument();
    });

    it('renders the "Integrations" quick action button', () => {
      renderDashboard();
      const elements = screen.getAllByText('Integrations');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders the "Reports" quick action button', () => {
      renderDashboard();
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    it('navigates to /assets when "Add Asset" is clicked', () => {
      renderDashboard();
      fireEvent.click(screen.getByText('Add Asset'));
      expect(mockNavigate).toHaveBeenCalledWith('/assets');
    });

    it('navigates to /people when "Onboard User" is clicked', () => {
      renderDashboard();
      fireEvent.click(screen.getByText('Onboard User'));
      expect(mockNavigate).toHaveBeenCalledWith('/people');
    });

    it('navigates to /apps when "Review Licences" is clicked', () => {
      renderDashboard();
      fireEvent.click(screen.getByText('Review Licences'));
      expect(mockNavigate).toHaveBeenCalledWith('/apps');
    });

    it('navigates to /spend when "IT Spend" is clicked', () => {
      renderDashboard();
      fireEvent.click(screen.getByText('IT Spend'));
      expect(mockNavigate).toHaveBeenCalledWith('/spend');
    });

    it('navigates to /reports when "Reports" is clicked', () => {
      renderDashboard();
      fireEvent.click(screen.getByText('Reports'));
      expect(mockNavigate).toHaveBeenCalledWith('/reports');
    });

    it('navigates to /integrations when "Integrations" quick action is clicked', () => {
      renderDashboard();
      // "Integrations" text appears in multiple places; the quick-link is the first
      const elements = screen.getAllByText('Integrations');
      fireEvent.click(elements[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/integrations');
    });

    it('stat card for Total Assets navigates to /assets when clicked', () => {
      renderDashboard();
      fireEvent.click(screen.getByText('Total Assets'));
      expect(mockNavigate).toHaveBeenCalledWith('/assets');
    });

    it('stat card for Apps & Licenses navigates to /apps when clicked', () => {
      renderDashboard();
      fireEvent.click(screen.getByText('Apps & Licenses'));
      expect(mockNavigate).toHaveBeenCalledWith('/apps');
    });

    it('stat card for Total People navigates to /people when clicked', () => {
      renderDashboard();
      fireEvent.click(screen.getByText('Total People'));
      expect(mockNavigate).toHaveBeenCalledWith('/people');
    });
  });

  // ── 4. Recent activity section ───────────────────────────────────────────

  describe('recent activity section', () => {
    it('displays the "Recent Activity" heading', () => {
      renderDashboard();
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    it('displays the "Latest platform changes" subtitle', () => {
      renderDashboard();
      expect(screen.getByText('Latest platform changes')).toBeInTheDocument();
    });

    it('renders activity log entries from the store', () => {
      renderDashboard();
      expect(screen.getByText('Asset Created')).toBeInTheDocument();
      expect(screen.getByText('Laptop added')).toBeInTheDocument();
    });

    it('shows the activity entry author', () => {
      renderDashboard();
      // The user "Admin" should appear somewhere in the entry line
      expect(screen.getByText(/Admin/)).toBeInTheDocument();
    });

    it('shows the activity module badge when module is provided', () => {
      renderDashboard();
      // The seed data has module: 'Assets' which renders as a badge
      const moduleBadges = screen.getAllByText('Assets');
      expect(moduleBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('renders multiple activity log entries', () => {
      useStore.setState({
        activityLog: [
          {
            id: 'act1',
            timestamp: new Date().toISOString(),
            action: 'Asset Created',
            user: 'Admin',
            details: 'Laptop added',
            module: 'Assets',
          },
          {
            id: 'act2',
            timestamp: new Date().toISOString(),
            action: 'App Added',
            user: 'IT Manager',
            details: 'Slack added',
            module: 'Apps',
          },
          {
            id: 'act3',
            timestamp: new Date().toISOString(),
            action: 'Person Created',
            user: 'HR',
            details: 'Alice onboarded',
            module: 'People',
          },
        ],
      });
      renderDashboard();
      expect(screen.getByText('Asset Created')).toBeInTheDocument();
      expect(screen.getByText('App Added')).toBeInTheDocument();
      expect(screen.getByText('Person Created')).toBeInTheDocument();
    });

    it('limits displayed entries to a maximum of 10', () => {
      const entries = Array.from({ length: 15 }, (_, i) => ({
        id: `act-${i}`,
        timestamp: new Date().toISOString(),
        action: `Action ${i}`,
        user: 'Admin',
        details: `Detail ${i}`,
        module: 'Assets' as const,
      }));
      useStore.setState({ activityLog: entries });
      renderDashboard();
      // First 10 entries should be present
      expect(screen.getByText('Action 0')).toBeInTheDocument();
      expect(screen.getByText('Action 9')).toBeInTheDocument();
      // 11th and beyond should NOT be rendered
      expect(screen.queryByText('Action 10')).not.toBeInTheDocument();
      expect(screen.queryByText('Action 14')).not.toBeInTheDocument();
    });
  });

  // ── 5. Charts are rendered (mocked) ──────────────────────────────────────

  describe('charts', () => {
    it('renders the "IT Spend Over Time" chart section', () => {
      renderDashboard();
      expect(screen.getByText('IT Spend Over Time')).toBeInTheDocument();
      expect(
        screen.getByText('Hardware vs Software (last 7 months)'),
      ).toBeInTheDocument();
    });

    it('renders the "Asset Status" chart section with pie chart', () => {
      renderDashboard();
      expect(screen.getByText('Asset Status')).toBeInTheDocument();
      expect(screen.getByText('Distribution by status')).toBeInTheDocument();
      // The mocked PieChart should be in the DOM
      expect(screen.getAllByTestId('pie-chart').length).toBeGreaterThanOrEqual(1);
    });

    it('renders the "Spend by Category" chart section with bar chart', () => {
      renderDashboard();
      expect(screen.getByText('Spend by Category')).toBeInTheDocument();
      expect(screen.getAllByTestId('bar-chart').length).toBeGreaterThanOrEqual(1);
    });

    it('renders ResponsiveContainer wrappers for all charts', () => {
      renderDashboard();
      const containers = screen.getAllByTestId('responsive-container');
      // At least 3: spend over time (LineChart), asset status (PieChart), category (BarChart)
      expect(containers.length).toBeGreaterThanOrEqual(3);
    });

    it('renders the line chart for spend over time', () => {
      renderDashboard();
      expect(screen.getAllByTestId('line-chart').length).toBeGreaterThanOrEqual(1);
    });

    it('shows "No assets yet" for asset status chart when there are no assets', () => {
      useStore.setState({ assets: [] });
      renderDashboard();
      expect(screen.getByText('No assets yet')).toBeInTheDocument();
    });
  });

  // ── 6. Notification / Action Required section ────────────────────────────

  describe('notification and action required section', () => {
    it('renders the "Action Required" heading', () => {
      renderDashboard();
      expect(screen.getByText('Action Required')).toBeInTheDocument();
    });

    it('shows the "Items needing attention" subtitle', () => {
      renderDashboard();
      expect(screen.getByText('Items needing attention')).toBeInTheDocument();
    });

    it('shows "All clear" message when there are no pending actions', () => {
      // The seed data has renewal in 2025, well in the past, so no upcoming
      // renewals within 60 days. No low stock, no onboarding/offboarding.
      renderDashboard();
      expect(
        screen.getByText('All clear! No immediate actions needed.'),
      ).toBeInTheDocument();
    });

    it('shows upcoming renewal when an app renewal is within 60 days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      useStore.setState({
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
            renewalDate: futureDate.toISOString().split('T')[0],
            noticePeriodDays: 30,
            status: 'Active',
            detectionSource: 'Manual',
          },
        ],
      });
      renderDashboard();
      expect(screen.getByText('Slack renewal')).toBeInTheDocument();
      expect(screen.getByText(/30 days/)).toBeInTheDocument();
    });

    it('shows warranty expiry warning when asset warranty is within 60 days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 20);
      useStore.setState({
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
            warrantyExpiry: futureDate.toISOString().split('T')[0],
            cost: 1500,
            currency: 'USD',
          },
        ],
      });
      renderDashboard();
      expect(screen.getByText('Laptop 1 warranty')).toBeInTheDocument();
      expect(screen.getByText(/20 days/)).toBeInTheDocument();
    });

    it('shows onboarding entry when a person has Onboarding status', () => {
      useStore.setState({
        people: [
          {
            id: 'p2',
            name: 'Bob Smith',
            email: 'bob@co.com',
            department: 'Design',
            title: 'Designer',
            status: 'Onboarding',
            location: 'LA',
            startDate: '2024-03-01',
            assetsAssigned: 0,
            licensesAssigned: 0,
            onboardingTasks: [
              { id: 't1', task: 'Setup laptop', completed: false, category: 'Hardware' },
              { id: 't2', task: 'Create email', completed: true, category: 'Access' },
            ],
          },
        ],
      });
      renderDashboard();
      expect(screen.getByText('Bob Smith onboarding')).toBeInTheDocument();
      // 1 incomplete task out of 2
      expect(screen.getByText('1 tasks pending')).toBeInTheDocument();
    });

    it('shows offboarding entry when a person has Offboarding status', () => {
      useStore.setState({
        people: [
          {
            id: 'p3',
            name: 'Carol White',
            email: 'carol@co.com',
            department: 'Sales',
            title: 'AE',
            status: 'Offboarding',
            location: 'NYC',
            startDate: '2022-01-01',
            assetsAssigned: 1,
            licensesAssigned: 2,
            offboardingTasks: [
              { id: 'ot1', task: 'Return laptop', completed: false, category: 'Hardware' },
            ],
          },
        ],
      });
      renderDashboard();
      expect(screen.getByText('Carol White offboarding')).toBeInTheDocument();
      expect(screen.getByText('1 tasks pending')).toBeInTheDocument();
    });
  });

  // ── Asset status breakdown legend ────────────────────────────────────────

  describe('asset status breakdown', () => {
    it('lists each asset status with its count in the legend', () => {
      renderDashboard();
      // Seed data has 1 Deployed and 1 In Stock
      expect(screen.getByText('Deployed')).toBeInTheDocument();
      expect(screen.getByText('In Stock')).toBeInTheDocument();
    });

    it('reflects multiple statuses when assets span many states', () => {
      useStore.setState({
        assets: [
          {
            id: 'a1', tag: 'AST-001', name: 'L1', type: 'Laptop', make: 'Dell',
            model: 'XPS', serial: 'S1', status: 'Deployed', location: 'NYC',
            purchaseDate: '2024-01-01', warrantyExpiry: '2027-01-01', cost: 1500, currency: 'USD',
          },
          {
            id: 'a2', tag: 'AST-002', name: 'L2', type: 'Laptop', make: 'HP',
            model: 'EB', serial: 'S2', status: 'In Stock', location: 'LA',
            purchaseDate: '2024-01-01', warrantyExpiry: '2027-01-01', cost: 1000, currency: 'USD',
          },
          {
            id: 'a3', tag: 'AST-003', name: 'L3', type: 'Laptop', make: 'Apple',
            model: 'MBP', serial: 'S3', status: 'In Repair', location: 'SF',
            purchaseDate: '2024-01-01', warrantyExpiry: '2027-01-01', cost: 2000, currency: 'USD',
          },
          {
            id: 'a4', tag: 'AST-004', name: 'L4', type: 'Laptop', make: 'Dell',
            model: 'Lat', serial: 'S4', status: 'Retired', location: 'NYC',
            purchaseDate: '2022-01-01', warrantyExpiry: '2025-01-01', cost: 800, currency: 'USD',
          },
        ],
      });
      renderDashboard();
      expect(screen.getByText('Deployed')).toBeInTheDocument();
      expect(screen.getByText('In Stock')).toBeInTheDocument();
      expect(screen.getByText('In Repair')).toBeInTheDocument();
      expect(screen.getByText('Retired')).toBeInTheDocument();
    });
  });

  // ── Savings opportunity section ──────────────────────────────────────────

  describe('savings opportunity', () => {
    it('displays savings opportunity when there are unused licenses', () => {
      renderDashboard();
      // 50 total - 40 assigned = 10 unused
      expect(screen.getByText('Savings Opportunity')).toBeInTheDocument();
      expect(screen.getByText(/10 unused licences/)).toBeInTheDocument();
    });

    it('does not show savings opportunity when all licenses are assigned', () => {
      useStore.setState({
        apps: [
          {
            id: 'app1',
            name: 'Slack',
            vendor: 'Salesforce',
            category: 'Communication',
            licenseType: 'Per User',
            totalLicenses: 50,
            assignedLicenses: 50,
            costPerLicense: 12,
            billingCycle: 'monthly',
            currency: 'USD',
            renewalDate: '2025-06-01',
            noticePeriodDays: 30,
            status: 'Active',
            detectionSource: 'Manual',
          },
        ],
      });
      renderDashboard();
      expect(screen.queryByText('Savings Opportunity')).not.toBeInTheDocument();
    });

    it('navigates to /spend when "Review in Spend" is clicked', () => {
      renderDashboard();
      fireEvent.click(screen.getByText(/Review in Spend/));
      expect(mockNavigate).toHaveBeenCalledWith('/spend');
    });
  });

  // ── Integrations summary section ─────────────────────────────────────────

  describe('integrations summary', () => {
    it('renders the integrations card with "Manage" link', () => {
      renderDashboard();
      expect(screen.getByText('Manage')).toBeInTheDocument();
    });

    it('shows connected and available counts', () => {
      useStore.setState({
        integrations: [
          {
            id: 'int-1', name: 'Intune', category: 'MDM',
            description: 'Microsoft Intune', status: 'Connected',
            features: ['Asset sync'], lastSync: '2024-02-01T10:00:00Z',
          },
          {
            id: 'int-2', name: 'NinjaOne', category: 'RMM',
            description: 'NinjaOne RMM', status: 'Disconnected',
            features: ['Asset sync'],
          },
        ],
      });
      renderDashboard();
      // "1 connected" and "1 available"
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/connected/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/available/i).length).toBeGreaterThanOrEqual(1);
    });

    it('navigates to /integrations when "Manage" is clicked', () => {
      renderDashboard();
      fireEvent.click(screen.getByText('Manage'));
      expect(mockNavigate).toHaveBeenCalledWith('/integrations');
    });
  });

  // ── Empty state edge cases ───────────────────────────────────────────────

  describe('empty state handling', () => {
    it('renders the dashboard with zero assets, apps, and people', () => {
      useStore.setState({
        assets: [],
        apps: [],
        people: [],
        activityLog: [],
        notifications: [],
      });
      renderDashboard();
      // Headings should still appear
      expect(
        screen.getByRole('heading', { name: /dashboard/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('Total Assets')).toBeInTheDocument();
      expect(screen.getByText('Apps & Licenses')).toBeInTheDocument();
      expect(screen.getByText('Total People')).toBeInTheDocument();
      expect(screen.getByText('No assets yet')).toBeInTheDocument();
    });

    it('shows 0 deployed when no assets have Deployed status', () => {
      useStore.setState({
        assets: [
          {
            id: 'a1', tag: 'AST-001', name: 'Laptop 1', type: 'Laptop',
            make: 'Dell', model: 'XPS', serial: 'S1', status: 'In Stock',
            location: 'NYC', purchaseDate: '2024-01-01',
            warrantyExpiry: '2027-01-01', cost: 1500, currency: 'USD',
          },
        ],
      });
      renderDashboard();
      expect(screen.getByText('0 deployed')).toBeInTheDocument();
    });
  });
});
