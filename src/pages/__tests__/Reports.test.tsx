import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Reports } from '../Reports';
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderReports() {
  return render(
    <BrowserRouter>
      <Reports />
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
        category: 'MDM',
        description: 'Device management',
        status: 'Connected',
        lastSync: '2024-02-20T10:00:00Z',
        features: ['Device Sync', 'Compliance'],
        syncCount: 5,
      },
      {
        id: 'int2',
        name: 'NinjaOne',
        category: 'RMM',
        description: 'Remote monitoring',
        status: 'Disconnected',
        features: ['Device Sync'],
        syncCount: 0,
      },
      {
        id: 'int3',
        name: 'BambooHR',
        category: 'HR',
        description: 'HR platform',
        status: 'Disconnected',
        features: ['People Sync'],
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

describe('Reports', () => {
  // ── 1. Renders Reports page ────────────────────────────────────────────────

  it('renders the page heading "Reports"', () => {
    renderReports();
    expect(
      screen.getByRole('heading', { name: /reports/i }),
    ).toBeInTheDocument();
  });

  it('displays the subtitle with analytics description', () => {
    renderReports();
    expect(
      screen.getByText('Analytics and insights across your IT estate'),
    ).toBeInTheDocument();
  });

  it('shows the Export All button', () => {
    renderReports();
    expect(screen.getByText('Export All')).toBeInTheDocument();
  });

  // ── 2. Tab navigation works ────────────────────────────────────────────────

  it('renders all five section tabs', () => {
    renderReports();
    expect(screen.getByText('IT Spend')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Licenses')).toBeInTheDocument();
    expect(screen.getByText('Employee Costs')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
  });

  it('defaults to the IT Spend tab', () => {
    renderReports();
    // The IT Spend tab should be active by default and show its KPI cards
    expect(screen.getByText('Total Hardware Cost')).toBeInTheDocument();
  });

  it('switches to the Assets tab when clicked', () => {
    renderReports();
    fireEvent.click(screen.getByText('Assets'));
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
    expect(screen.getByText('Deployed')).toBeInTheDocument();
    expect(screen.getByText('In Stock')).toBeInTheDocument();
  });

  it('switches to the Licenses tab when clicked', () => {
    renderReports();
    fireEvent.click(screen.getByText('Licenses'));
    expect(screen.getByText('Total Licenses')).toBeInTheDocument();
    expect(screen.getByText('Assigned')).toBeInTheDocument();
  });

  it('switches to the Employee Costs tab when clicked', () => {
    renderReports();
    fireEvent.click(screen.getByText('Employee Costs'));
    expect(screen.getByText('IT Cost per Employee')).toBeInTheDocument();
    expect(screen.getByText('Cost by Department')).toBeInTheDocument();
  });

  it('switches to the Compliance tab when clicked', () => {
    renderReports();
    fireEvent.click(screen.getByText('Compliance'));
    expect(screen.getByText('Vendor Compliance Matrix')).toBeInTheDocument();
  });

  it('hides IT Spend content when switching to another tab', () => {
    renderReports();
    // Confirm IT Spend content is shown
    expect(screen.getByText('Total Hardware Cost')).toBeInTheDocument();
    // Switch away
    fireEvent.click(screen.getByText('Assets'));
    // IT Spend KPI cards should no longer be visible
    expect(screen.queryByText('Total Hardware Cost')).not.toBeInTheDocument();
  });

  it('can navigate back to IT Spend after switching tabs', () => {
    renderReports();
    fireEvent.click(screen.getByText('Assets'));
    expect(screen.queryByText('Total Hardware Cost')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('IT Spend'));
    expect(screen.getByText('Total Hardware Cost')).toBeInTheDocument();
  });

  // ── 3. Each tab shows its content ──────────────────────────────────────────

  describe('IT Spend tab', () => {
    it('shows spend summary KPI cards', () => {
      renderReports();
      expect(screen.getByText('Total Hardware Cost')).toBeInTheDocument();
      expect(screen.getByText('Annual Software Cost')).toBeInTheDocument();
      expect(screen.getByText('Monthly IT Spend')).toBeInTheDocument();
    });

    it('shows the total hardware cost value', () => {
      renderReports();
      // 1500 + 500 = 2000
      expect(screen.getByText('$2,000')).toBeInTheDocument();
    });

    it('shows the annual software cost value', () => {
      renderReports();
      // Slack: 12 * 50 * 12 = 7200 (monthly billing, so multiply by 12)
      expect(screen.getByText('$7,200')).toBeInTheDocument();
    });

    it('shows the "Lifetime asset spend" subtitle', () => {
      renderReports();
      expect(screen.getByText('Lifetime asset spend')).toBeInTheDocument();
    });

    it('shows the "All active subscriptions" subtitle', () => {
      renderReports();
      expect(screen.getByText('All active subscriptions')).toBeInTheDocument();
    });

    it('shows chart headings for spend section', () => {
      renderReports();
      expect(screen.getByText('Monthly IT Spend (7 months)')).toBeInTheDocument();
      expect(screen.getByText('Spend by Department')).toBeInTheDocument();
      expect(screen.getByText('Spend by Category')).toBeInTheDocument();
      expect(screen.getByText('Spend Trend')).toBeInTheDocument();
    });
  });

  describe('Assets tab', () => {
    beforeEach(() => {
      renderReports();
      fireEvent.click(screen.getByText('Assets'));
    });

    it('shows asset stat cards', () => {
      expect(screen.getByText('Total Assets')).toBeInTheDocument();
      expect(screen.getByText('Deployed')).toBeInTheDocument();
      expect(screen.getByText('In Stock')).toBeInTheDocument();
      expect(screen.getByText('Warranty Expiring (90d)')).toBeInTheDocument();
    });

    it('shows the correct total assets count', () => {
      // 2 assets in our test data
      const totalAssetsCard = screen.getByText('Total Assets');
      const card = totalAssetsCard.closest('.card');
      expect(card).toHaveTextContent('2');
    });

    it('shows the deployed count of 1', () => {
      // 1 deployed asset in our test data
      const deployedLabel = screen.getByText('Deployed');
      const card = deployedLabel.closest('.card');
      expect(card).toHaveTextContent('1');
    });

    it('shows the in-stock count of 1', () => {
      const inStockLabel = screen.getByText('In Stock');
      const card = inStockLabel.closest('.card');
      expect(card).toHaveTextContent('1');
    });

    it('shows the Asset Status Distribution chart heading', () => {
      expect(screen.getByText('Asset Status Distribution')).toBeInTheDocument();
    });

    it('shows the Assets by Type chart heading', () => {
      expect(screen.getByText('Assets by Type')).toBeInTheDocument();
    });

    it('shows asset type breakdown rows', () => {
      expect(screen.getByText('Laptop')).toBeInTheDocument();
      expect(screen.getByText('Monitor')).toBeInTheDocument();
    });
  });

  describe('Licenses tab', () => {
    beforeEach(() => {
      renderReports();
      fireEvent.click(screen.getByText('Licenses'));
    });

    it('shows license stat cards', () => {
      expect(screen.getByText('Total Licenses')).toBeInTheDocument();
      expect(screen.getByText('Assigned')).toBeInTheDocument();
      expect(screen.getByText(/Unused \(wasted cost\)/)).toBeInTheDocument();
    });

    it('shows the total licenses count', () => {
      // Slack has 50 total licenses
      const totalLabel = screen.getByText('Total Licenses');
      const card = totalLabel.closest('.card');
      expect(card).toHaveTextContent('50');
    });

    it('shows the assigned licenses count', () => {
      // Slack has 40 assigned licenses
      const assignedLabel = screen.getByText('Assigned');
      const card = assignedLabel.closest('.card');
      expect(card).toHaveTextContent('40');
    });

    it('shows License Utilization by App heading', () => {
      expect(screen.getByText('License Utilization by App')).toBeInTheDocument();
    });

    it('shows the app name in utilization breakdown', () => {
      expect(screen.getByText('Slack')).toBeInTheDocument();
    });

    it('shows utilization percentage for Slack', () => {
      // 40/50 = 80%
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('shows the utilization fraction for Slack', () => {
      // 40 utilized, 10 unused -> shows as 40/50
      expect(screen.getByText('40/50')).toBeInTheDocument();
    });

    it('shows Upcoming Renewals heading', () => {
      expect(screen.getByText('Upcoming Renewals (Next 6 Months)')).toBeInTheDocument();
    });
  });

  describe('Employee Costs tab', () => {
    beforeEach(() => {
      renderReports();
      fireEvent.click(screen.getByText('Employee Costs'));
    });

    it('shows IT Cost per Employee chart heading', () => {
      expect(screen.getByText('IT Cost per Employee')).toBeInTheDocument();
    });

    it('shows Cost by Department chart heading', () => {
      expect(screen.getByText('Cost by Department')).toBeInTheDocument();
    });
  });

  describe('Compliance tab', () => {
    beforeEach(() => {
      renderReports();
      fireEvent.click(screen.getByText('Compliance'));
    });

    it('shows the Vendor Compliance Matrix heading', () => {
      expect(screen.getByText('Vendor Compliance Matrix')).toBeInTheDocument();
    });

    it('shows compliance table column headers', () => {
      expect(screen.getByText('Vendor')).toBeInTheDocument();
      expect(screen.getByText('SOC 2')).toBeInTheDocument();
      expect(screen.getByText('ISO 27001')).toBeInTheDocument();
      expect(screen.getByText('GDPR')).toBeInTheDocument();
      expect(screen.getByText('Risk')).toBeInTheDocument();
      expect(screen.getByText('DPA')).toBeInTheDocument();
    });

    it('shows vendor names in the compliance table', () => {
      expect(screen.getByText('Slack')).toBeInTheDocument();
      expect(screen.getByText('Zendesk')).toBeInTheDocument();
      expect(screen.getByText('Zoom')).toBeInTheDocument();
      expect(screen.getByText('Asana')).toBeInTheDocument();
    });

    it('shows risk rating badges', () => {
      const lowBadges = screen.getAllByText('Low');
      expect(lowBadges.length).toBeGreaterThan(0);
      const mediumBadges = screen.getAllByText('Medium');
      expect(mediumBadges.length).toBeGreaterThan(0);
    });

    it('shows DPA status values', () => {
      const signedBadges = screen.getAllByText('Signed');
      expect(signedBadges.length).toBeGreaterThan(0);
      const notRequiredBadges = screen.getAllByText('Not Required');
      expect(notRequiredBadges.length).toBeGreaterThan(0);
    });

    it('shows an Export button in the compliance section', () => {
      // The compliance section has its own Export button
      const exportButtons = screen.getAllByText('Export');
      expect(exportButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 4. Charts are rendered (mocked) ───────────────────────────────────────

  it('renders ResponsiveContainer components for IT Spend charts', () => {
    renderReports();
    const containers = screen.getAllByTestId('responsive-container');
    expect(containers.length).toBeGreaterThanOrEqual(1);
  });

  it('renders BarChart components for IT Spend charts', () => {
    renderReports();
    const barCharts = screen.getAllByTestId('bar-chart');
    expect(barCharts.length).toBeGreaterThanOrEqual(1);
  });

  it('renders LineChart component for Spend Trend', () => {
    renderReports();
    const lineCharts = screen.getAllByTestId('line-chart');
    expect(lineCharts.length).toBeGreaterThanOrEqual(1);
  });

  it('renders PieChart when viewing Assets tab', () => {
    renderReports();
    fireEvent.click(screen.getByText('Assets'));
    const pieCharts = screen.getAllByTestId('pie-chart');
    expect(pieCharts.length).toBeGreaterThanOrEqual(1);
  });

  it('renders BarChart for Employee Costs tab', () => {
    renderReports();
    fireEvent.click(screen.getByText('Employee Costs'));
    const barCharts = screen.getAllByTestId('bar-chart');
    expect(barCharts.length).toBeGreaterThanOrEqual(1);
  });

  it('renders ResponsiveContainer for Employee Costs charts', () => {
    renderReports();
    fireEvent.click(screen.getByText('Employee Costs'));
    const containers = screen.getAllByTestId('responsive-container');
    expect(containers.length).toBeGreaterThanOrEqual(1);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it('handles empty assets array on Assets tab', () => {
    useStore.setState({ assets: [] });
    renderReports();
    fireEvent.click(screen.getByText('Assets'));
    const totalLabel = screen.getByText('Total Assets');
    const card = totalLabel.closest('.card');
    expect(card).toHaveTextContent('0');
  });

  it('handles empty apps array on Licenses tab', () => {
    useStore.setState({ apps: [] });
    renderReports();
    fireEvent.click(screen.getByText('Licenses'));
    const totalLabel = screen.getByText('Total Licenses');
    const card = totalLabel.closest('.card');
    expect(card).toHaveTextContent('0');
  });

  it('handles empty people array on Employee Costs tab', () => {
    useStore.setState({ people: [] });
    renderReports();
    fireEvent.click(screen.getByText('Employee Costs'));
    expect(screen.getByText('IT Cost per Employee')).toBeInTheDocument();
  });
});
