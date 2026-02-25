import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { useStore } from '../../../store/useStore';

const mockLogout = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../auth/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { name: 'Admin', email: 'admin@blimp.io', role: 'Admin' },
    login: vi.fn(),
    logout: mockLogout,
  }),
}));

function renderSidebar() {
  return render(
    <BrowserRouter>
      <Sidebar />
    </BrowserRouter>
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      currentUserName: 'Admin User',
      currentUserRole: 'Admin',
      notifications: [
        {
          id: 'n1',
          type: 'warning',
          title: 'Test',
          message: 'Test notification',
          timestamp: '2024-02-01T10:00:00Z',
          read: false,
        },
      ],
      globalSearch: '',
      assets: [
        {
          id: 'a1',
          tag: 'AST-001',
          name: 'Test Laptop',
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
      toasts: [],
      theme: 'light',
    });
  });

  // ── 1. Renders all navigation links ──────────────────────────────────────

  it('renders all navigation links', () => {
    renderSidebar();

    const expectedLabels = [
      'Dashboard',
      'Assets',
      'People',
      'Apps',
      'Spend',
      'Reports',
      'Integrations',
      'Audit Log',
      'Settings',
    ];

    expectedLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  // ── 2. Navigation links have correct hrefs/paths ─────────────────────────

  it('navigation links have correct paths', () => {
    renderSidebar();

    const linkPaths: Record<string, string> = {
      Dashboard: '/',
      Assets: '/assets',
      People: '/people',
      Apps: '/apps',
      Spend: '/spend',
      Reports: '/reports',
      Integrations: '/integrations',
      'Audit Log': '/audit-log',
      Settings: '/settings',
    };

    Object.entries(linkPaths).forEach(([label, path]) => {
      const link = screen.getByText(label).closest('a');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', path);
    });
  });

  // ── Section headers ──────────────────────────────────────────────────────

  it('shows section headers', () => {
    renderSidebar();

    expect(screen.getByText('Management')).toBeInTheDocument();
    expect(screen.getByText('Finance & Analytics')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  // ── 3. Shows user name and role ──────────────────────────────────────────

  it('shows user name and role', () => {
    renderSidebar();

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  // ── 4. Collapse toggle works (hides labels) ─────────────────────────────

  it('collapse toggle hides text labels and section headers', () => {
    renderSidebar();

    // Initially expanded: labels should be visible
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Management')).toBeInTheDocument();

    // Click the collapse button
    const collapseButton = screen.getByTitle('Collapse sidebar');
    fireEvent.click(collapseButton);

    // After collapsing: labels should be hidden
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Assets')).not.toBeInTheDocument();
    expect(screen.queryByText('Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Finance & Analytics')).not.toBeInTheDocument();
    expect(screen.queryByText('System')).not.toBeInTheDocument();

    // User name should also be hidden
    expect(screen.queryByText('Admin User')).not.toBeInTheDocument();

    // Expand button should now be available
    const expandButton = screen.getByTitle('Expand sidebar');
    fireEvent.click(expandButton);

    // Labels should reappear
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Management')).toBeInTheDocument();
  });

  // ── 5. Sign out button calls logout and navigates ────────────────────────

  it('sign out button calls logout and navigates to /login', () => {
    renderSidebar();

    const signOutButton = screen.getByTitle('Sign out');
    fireEvent.click(signOutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
