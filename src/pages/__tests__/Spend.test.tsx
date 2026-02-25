import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Spend } from '../Spend';
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

vi.mock('../../utils/csvExport', () => ({
  exportToCSV: vi.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderSpend() {
  return render(
    <BrowserRouter>
      <Spend />
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

describe('Spend', () => {
  // ── 1. Renders Spend page with heading ─────────────────────────────────────

  it('renders the page heading "IT Spend"', () => {
    renderSpend();
    expect(
      screen.getByRole('heading', { name: /it spend/i }),
    ).toBeInTheDocument();
  });

  it('displays the page subtitle', () => {
    renderSpend();
    expect(
      screen.getByText('Cost analysis across hardware, software, and vendors'),
    ).toBeInTheDocument();
  });

  it('shows the Export button', () => {
    renderSpend();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  // ── 2. Shows KPI cards ─────────────────────────────────────────────────────

  it('shows the Total IT Spend KPI card', () => {
    renderSpend();
    expect(screen.getByText('Total IT Spend')).toBeInTheDocument();
  });

  it('shows the Hardware KPI card', () => {
    renderSpend();
    // "Hardware" appears in KPI cards and chart legends
    expect(screen.getAllByText('Hardware').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the Software KPI card', () => {
    renderSpend();
    // "Software" appears in KPI cards and chart legends
    expect(screen.getAllByText('Software').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the Cost / Employee KPI card', () => {
    renderSpend();
    expect(screen.getByText('Cost / Employee')).toBeInTheDocument();
  });

  it('shows the Wasted Spend KPI card', () => {
    renderSpend();
    expect(screen.getByText('Wasted Spend')).toBeInTheDocument();
  });

  it('shows hardware cost value of $2,000', () => {
    renderSpend();
    // Hardware cost = 1500 + 500 = 2000
    expect(screen.getByText('$2,000')).toBeInTheDocument();
  });

  it('shows the number of assets in hardware card subtitle', () => {
    renderSpend();
    expect(screen.getByText('2 assets total')).toBeInTheDocument();
  });

  it('shows the number of subscriptions in software card subtitle', () => {
    renderSpend();
    expect(screen.getByText('1 subscriptions')).toBeInTheDocument();
  });

  it('shows the active employees count in per-employee card subtitle', () => {
    renderSpend();
    expect(screen.getByText('1 active employees')).toBeInTheDocument();
  });

  it('shows the unused licences count in wasted spend card subtitle', () => {
    renderSpend();
    // Slack: 50 total - 40 assigned = 10 unused
    expect(screen.getByText('10 unused licences')).toBeInTheDocument();
  });

  it('shows annual period label by default', () => {
    renderSpend();
    // The Total IT Spend card shows "per year" in annual mode
    expect(screen.getByText('per year')).toBeInTheDocument();
  });

  // ── 3. Monthly/annual toggle works ─────────────────────────────────────────

  it('renders both Monthly and Annual toggle buttons', () => {
    renderSpend();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Annual')).toBeInTheDocument();
  });

  it('defaults to Annual mode', () => {
    renderSpend();
    expect(screen.getByText('per year')).toBeInTheDocument();
  });

  it('switches to Monthly mode when Monthly button is clicked', () => {
    renderSpend();
    fireEvent.click(screen.getByText('Monthly'));
    expect(screen.getByText('per month')).toBeInTheDocument();
  });

  it('switches back to Annual mode when Annual button is clicked', () => {
    renderSpend();
    // Go to monthly first
    fireEvent.click(screen.getByText('Monthly'));
    expect(screen.getByText('per month')).toBeInTheDocument();

    // Switch back
    fireEvent.click(screen.getByText('Annual'));
    expect(screen.getByText('per year')).toBeInTheDocument();
  });

  it('updates the Total IT Spend value when toggling to monthly', () => {
    renderSpend();
    // In annual mode the total is hardware + softwareAnnual
    expect(screen.getAllByText('$9,200').length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByText('Monthly'));
    // In monthly mode: the annual value should no longer appear
    expect(screen.queryAllByText('$9,200')).toHaveLength(0);
  });

  it('updates the Software KPI when toggling to monthly', () => {
    renderSpend();
    // Annual software = $7,200 (appears in KPI and possibly chart)
    expect(screen.getAllByText('$7,200').length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByText('Monthly'));
    // Monthly software = 7200/12 = 600
    expect(screen.getAllByText('$600').length).toBeGreaterThanOrEqual(1);
  });

  // ── 4. Charts render ──────────────────────────────────────────────────────

  it('renders ResponsiveContainer components', () => {
    renderSpend();
    const containers = screen.getAllByTestId('responsive-container');
    expect(containers.length).toBeGreaterThanOrEqual(1);
  });

  it('renders LineChart for the Spend Trend section', () => {
    renderSpend();
    const lineCharts = screen.getAllByTestId('line-chart');
    expect(lineCharts.length).toBeGreaterThanOrEqual(1);
  });

  it('renders PieChart for the Spend by Category section', () => {
    renderSpend();
    const pieCharts = screen.getAllByTestId('pie-chart');
    expect(pieCharts.length).toBeGreaterThanOrEqual(1);
  });

  it('renders BarChart for the department spend section', () => {
    renderSpend();
    const barCharts = screen.getAllByTestId('bar-chart');
    expect(barCharts.length).toBeGreaterThanOrEqual(1);
  });

  // ── 5. Section headings ────────────────────────────────────────────────────

  it('shows the Spend Trend chart heading', () => {
    renderSpend();
    expect(screen.getByText('Spend Trend')).toBeInTheDocument();
  });

  it('shows the Spend Trend subtitle', () => {
    renderSpend();
    expect(screen.getByText('Hardware vs Software (12 months)')).toBeInTheDocument();
  });

  it('shows the Spend by Category chart heading', () => {
    renderSpend();
    expect(screen.getByText('Spend by Category')).toBeInTheDocument();
  });

  it('shows the Vendor Breakdown table heading', () => {
    renderSpend();
    expect(screen.getByText('Vendor Breakdown')).toBeInTheDocument();
  });

  it('shows the Spend by Department chart heading', () => {
    renderSpend();
    expect(screen.getByText('Spend by Department')).toBeInTheDocument();
  });

  it('shows the Upcoming Renewals heading', () => {
    renderSpend();
    expect(screen.getByText('Upcoming Renewals')).toBeInTheDocument();
  });

  // ── 6. Vendor Breakdown table ──────────────────────────────────────────────

  it('shows vendor table column headers', () => {
    renderSpend();
    // The table has columns: Vendor, Hardware, Software, Total, Items, % of Spend
    expect(screen.getByText('Vendor')).toBeInTheDocument();
    expect(screen.getByText('Items')).toBeInTheDocument();
    expect(screen.getByText('% of Spend')).toBeInTheDocument();
  });

  it('shows vendor names in the breakdown table', () => {
    renderSpend();
    // Dell from asset make, LG from asset make, Salesforce from app vendor
    expect(screen.getByText('Dell')).toBeInTheDocument();
    expect(screen.getByText('LG')).toBeInTheDocument();
    expect(screen.getByText('Salesforce')).toBeInTheDocument();
  });

  it('shows the vendor count in the subtitle', () => {
    renderSpend();
    // 3 vendors: Dell, LG, Salesforce
    expect(screen.getByText(/3 vendors/)).toBeInTheDocument();
  });

  // ── 7. Upcoming Renewals ──────────────────────────────────────────────────

  it('shows "No upcoming renewals" when no apps renew within 90 days', () => {
    renderSpend();
    // Slack renewal is 2025-06-01 which is far in the future
    expect(screen.getByText('No upcoming renewals')).toBeInTheDocument();
  });

  it('shows upcoming renewal when app renews within 90 days', () => {
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
    renderSpend();
    expect(screen.queryByText('No upcoming renewals')).not.toBeInTheDocument();
    expect(screen.getByText('Slack')).toBeInTheDocument();
  });

  // ── 8. Edge cases ─────────────────────────────────────────────────────────

  it('handles empty assets array gracefully', () => {
    useStore.setState({ assets: [] });
    renderSpend();
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('0 assets total')).toBeInTheDocument();
  });

  it('handles empty apps array gracefully', () => {
    useStore.setState({ apps: [] });
    renderSpend();
    expect(screen.getByText('0 subscriptions')).toBeInTheDocument();
  });

  it('handles empty people array gracefully', () => {
    useStore.setState({ people: [] });
    renderSpend();
    expect(screen.getByText('0 active employees')).toBeInTheDocument();
  });

  it('handles zero wasted spend when all licenses are assigned', () => {
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
    renderSpend();
    expect(screen.getByText('0 unused licences')).toBeInTheDocument();
  });

  it('shows multiple assets contributing to hardware total', () => {
    useStore.setState({
      assets: [
        {
          id: 'a1', tag: 'AST-001', name: 'Laptop 1', type: 'Laptop',
          make: 'Dell', model: 'XPS', serial: 'S1', status: 'Deployed',
          location: 'NYC', purchaseDate: '2024-01-01', warrantyExpiry: '2027-01-01',
          cost: 3000, currency: 'USD',
        },
        {
          id: 'a2', tag: 'AST-002', name: 'Laptop 2', type: 'Laptop',
          make: 'Apple', model: 'MBP', serial: 'S2', status: 'Deployed',
          location: 'NYC', purchaseDate: '2024-01-01', warrantyExpiry: '2027-01-01',
          cost: 2500, currency: 'USD',
        },
      ],
    });
    renderSpend();
    // Hardware = 3000 + 2500 = 5500
    expect(screen.getByText('$5,500')).toBeInTheDocument();
    expect(screen.getByText('2 assets total')).toBeInTheDocument();
  });
});
