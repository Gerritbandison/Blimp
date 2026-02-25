import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TopBar } from '../TopBar';
import { useStore } from '../../../store/useStore';

const mockNavigate = vi.fn();
const mockLogout = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/assets', search: '', hash: '', state: null, key: '' }),
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

function renderTopBar() {
  return render(
    <BrowserRouter>
      <TopBar />
    </BrowserRouter>
  );
}

describe('TopBar', () => {
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

  // ── 1. Renders breadcrumbs ───────────────────────────────────────────────

  it('renders breadcrumbs based on current route', () => {
    renderTopBar();

    // useLocation is mocked to /assets, so breadcrumbs should be "Blimp / Assets"
    expect(screen.getByText('Blimp')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
  });

  // ── 2. Global search input is present and typeable ───────────────────────

  it('renders the global search input', () => {
    renderTopBar();

    const searchInput = document.querySelector('[data-global-search]') as HTMLInputElement;
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Search assets, apps, people...');
  });

  it('search input is typeable and updates store', () => {
    renderTopBar();

    const searchInput = document.querySelector('[data-global-search]') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'Test' } });

    expect(useStore.getState().globalSearch).toBe('Test');
  });

  // ── 3. Search results appear when typing 2+ chars ────────────────────────

  it('shows search results dropdown when typing 2+ characters', () => {
    renderTopBar();

    const searchInput = document.querySelector('[data-global-search]') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'Te' } });

    // "Test Laptop" should appear in results since "te" matches
    expect(screen.getByText('Test Laptop')).toBeInTheDocument();
  });

  it('does not show search results when typing fewer than 2 characters', () => {
    renderTopBar();

    const searchInput = document.querySelector('[data-global-search]') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'T' } });

    // "Test Laptop" should NOT appear in a dropdown
    // Note: the asset name is not rendered in the TopBar itself, only in search results
    expect(screen.queryByText('Test Laptop')).not.toBeInTheDocument();
  });

  it('shows matching apps in search results', () => {
    renderTopBar();

    const searchInput = document.querySelector('[data-global-search]') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'Slack' } });

    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByText(/Salesforce/)).toBeInTheDocument();
  });

  it('shows matching people in search results', () => {
    renderTopBar();

    const searchInput = document.querySelector('[data-global-search]') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText(/Engineering/)).toBeInTheDocument();
  });

  // ── 4. Notification bell shows unread count ──────────────────────────────

  it('shows unread notification count badge', () => {
    renderTopBar();

    // There is 1 unread notification
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  // ── 5. Clicking notification bell opens dropdown ─────────────────────────

  it('opens notification dropdown when bell is clicked', () => {
    renderTopBar();

    const bellButton = screen.getByLabelText(/Notifications/);
    fireEvent.click(bellButton);

    // The dropdown shows the notification title and message
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Test notification')).toBeInTheDocument();
  });

  // ── 6. "Mark all read" button works ──────────────────────────────────────

  it('"Mark all read" button calls markAllNotificationsRead', () => {
    renderTopBar();

    // Open notification dropdown
    const bellButton = screen.getByLabelText(/Notifications/);
    fireEvent.click(bellButton);

    // Click "Mark all read"
    const markAllButton = screen.getByText('Mark all read');
    fireEvent.click(markAllButton);

    // After clicking, all notifications should be marked read in the store
    const storeNotifications = useStore.getState().notifications;
    expect(storeNotifications.every((n) => n.read)).toBe(true);
  });

  // ── 7. "Add New" button opens quick add dropdown ─────────────────────────

  it('"Add New" button opens quick add dropdown', () => {
    renderTopBar();

    const addNewButton = screen.getByText('Add New');
    fireEvent.click(addNewButton);

    expect(screen.getByText('New Asset')).toBeInTheDocument();
    expect(screen.getByText('New App')).toBeInTheDocument();
    expect(screen.getByText('New Person')).toBeInTheDocument();
  });

  // ── 8. Theme toggle opens dropdown with Light/Dark/System options ────────

  it('theme toggle opens dropdown with Light, Dark, System options', () => {
    renderTopBar();

    const themeButton = screen.getByLabelText('Toggle theme');
    fireEvent.click(themeButton);

    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('clicking a theme option updates the store', () => {
    renderTopBar();

    const themeButton = screen.getByLabelText('Toggle theme');
    fireEvent.click(themeButton);

    fireEvent.click(screen.getByText('Dark'));
    expect(useStore.getState().theme).toBe('dark');
  });

  // ── 9. "Add New" hidden for Read Only role ───────────────────────────────

  it('"Add New" is hidden for Read Only role', () => {
    useStore.setState({ currentUserRole: 'Read Only' });
    renderTopBar();

    expect(screen.queryByText('Add New')).not.toBeInTheDocument();
  });

  it('"Add New" is hidden for Finance role', () => {
    useStore.setState({ currentUserRole: 'Finance' });
    renderTopBar();

    expect(screen.queryByText('Add New')).not.toBeInTheDocument();
  });

  it('shows role badge for non-Admin users', () => {
    useStore.setState({ currentUserRole: 'Read Only' });
    renderTopBar();

    expect(screen.getByText('Read Only')).toBeInTheDocument();
  });

  it('does not show role badge for Admin users', () => {
    useStore.setState({ currentUserRole: 'Admin' });
    renderTopBar();

    // The role badge should not render "Admin" as a badge
    // "Admin" might appear elsewhere but not as a role badge span
    const adminBadges = screen.queryAllByText('Admin');
    // If it appears, it should not be in a role badge context
    adminBadges.forEach((el) => {
      expect(el).not.toHaveClass('rounded-full');
    });
  });
});
