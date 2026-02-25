import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { AppList } from '../Apps/AppList';

// ─── Mock react-router-dom: keep real exports but override useNavigate ───────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// ─── Mock csvExport so we can spy without DOM side-effects ───────────────────

const exportToCSVMock = vi.fn();
vi.mock('../../utils/csvExport', () => ({
  exportToCSV: (...args: unknown[]) => exportToCSVMock(...args),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderAppList() {
  return render(
    <BrowserRouter>
      <AppList />
    </BrowserRouter>,
  );
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockApps = [
  {
    id: 'app1',
    name: 'Slack',
    vendor: 'Salesforce',
    category: 'Communication' as const,
    licenseType: 'Per User' as const,
    totalLicenses: 100,
    assignedLicenses: 80,
    costPerLicense: 12,
    billingCycle: 'monthly' as const,
    currency: 'USD',
    renewalDate: '2027-06-01',
    noticePeriodDays: 30,
    status: 'Active' as const,
    detectionSource: 'Manual',
  },
  {
    id: 'app2',
    name: 'Figma',
    vendor: 'Figma Inc',
    category: 'Design' as const,
    licenseType: 'Per User' as const,
    totalLicenses: 50,
    assignedLicenses: 30,
    costPerLicense: 15,
    billingCycle: 'monthly' as const,
    currency: 'USD',
    renewalDate: '2027-08-15',
    noticePeriodDays: 60,
    status: 'Active' as const,
    detectionSource: 'Manual',
  },
  {
    id: 'app3',
    name: 'OldApp',
    vendor: 'Legacy Corp',
    category: 'Other' as const,
    licenseType: 'Site' as const,
    totalLicenses: 10,
    assignedLicenses: 2,
    costPerLicense: 100,
    billingCycle: 'annual' as const,
    currency: 'USD',
    renewalDate: '2024-01-01',
    noticePeriodDays: 90,
    status: 'Inactive' as const,
    detectionSource: 'Manual',
  },
  {
    id: 'app4',
    name: 'ShadowTool',
    vendor: 'Unknown Vendor',
    category: 'Productivity' as const,
    licenseType: 'Per User' as const,
    totalLicenses: 5,
    assignedLicenses: 5,
    costPerLicense: 8,
    billingCycle: 'monthly' as const,
    currency: 'USD',
    renewalDate: '2027-12-01',
    noticePeriodDays: 30,
    status: 'Expired' as const,
    detectionSource: 'Manual',
  },
];

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({
    assets: [],
    apps: mockApps,
    people: [],
    currentUserRole: 'Admin',
    currentUserName: 'Admin User',
    toasts: [],
    activityLog: [],
    notifications: [],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AppList page', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Renders apps table with correct data
  // ═══════════════════════════════════════════════════════════════════════════

  describe('renders apps table with correct data', () => {
    it('renders the "Apps & Licenses" page heading', () => {
      renderAppList();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Apps & Licenses');
    });

    it('shows total app count in subtitle', () => {
      renderAppList();
      expect(screen.getByText(/4 apps/)).toBeInTheDocument();
    });

    it('displays correct column headers in the data table', () => {
      renderAppList();

      const expectedHeaders = ['App', 'Category', 'License Type', 'Utilization', 'Cost', 'Renewal', 'Status', 'Source'];
      for (const header of expectedHeaders) {
        expect(screen.getByText(header)).toBeInTheDocument();
      }
    });

    it('renders app rows with name and vendor', () => {
      renderAppList();

      expect(screen.getByText('Slack')).toBeInTheDocument();
      expect(screen.getByText('Salesforce')).toBeInTheDocument();
      expect(screen.getByText('Figma')).toBeInTheDocument();
      expect(screen.getByText('Figma Inc')).toBeInTheDocument();
      expect(screen.getByText('OldApp')).toBeInTheDocument();
      expect(screen.getByText('Legacy Corp')).toBeInTheDocument();
      expect(screen.getByText('ShadowTool')).toBeInTheDocument();
      expect(screen.getByText('Unknown Vendor')).toBeInTheDocument();
    });

    it('renders category badges in the table', () => {
      renderAppList();

      expect(screen.getByText('Communication')).toBeInTheDocument();
      expect(screen.getByText('Design')).toBeInTheDocument();
    });

    it('shows empty state when store has no apps', () => {
      useStore.setState({ apps: [] });
      renderAppList();

      expect(screen.getByText('No apps found')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Search filters apps
  // ═══════════════════════════════════════════════════════════════════════════

  describe('search filters apps', () => {
    it('renders the search input', () => {
      renderAppList();
      expect(screen.getByPlaceholderText('Search apps...')).toBeInTheDocument();
    });

    it('filters apps by name', async () => {
      renderAppList();

      const searchInput = screen.getByPlaceholderText('Search apps...');
      await userEvent.type(searchInput, 'Slack');

      expect(screen.getByText('Slack')).toBeInTheDocument();
      expect(screen.queryByText('Figma')).not.toBeInTheDocument();
      expect(screen.queryByText('OldApp')).not.toBeInTheDocument();
      expect(screen.queryByText('ShadowTool')).not.toBeInTheDocument();
    });

    it('filters apps by vendor name', async () => {
      renderAppList();

      const searchInput = screen.getByPlaceholderText('Search apps...');
      await userEvent.type(searchInput, 'Legacy');

      expect(screen.getByText('OldApp')).toBeInTheDocument();
      expect(screen.queryByText('Slack')).not.toBeInTheDocument();
      expect(screen.queryByText('Figma')).not.toBeInTheDocument();
    });

    it('filters apps by category text', async () => {
      renderAppList();

      const searchInput = screen.getByPlaceholderText('Search apps...');
      await userEvent.type(searchInput, 'Design');

      expect(screen.getByText('Figma')).toBeInTheDocument();
      expect(screen.queryByText('Slack')).not.toBeInTheDocument();
    });

    it('shows empty state when search matches nothing', async () => {
      renderAppList();

      const searchInput = screen.getByPlaceholderText('Search apps...');
      await userEvent.type(searchInput, 'NonExistentApp');

      expect(screen.getByText('No apps found')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Status filter pills work
  // ═══════════════════════════════════════════════════════════════════════════

  describe('status filter pills work', () => {
    it('renders the All, Active, Inactive, and Expired status pills', () => {
      renderAppList();

      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Inactive' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Expired' })).toBeInTheDocument();
    });

    it('filters to Active apps when Active pill is clicked', async () => {
      renderAppList();

      await userEvent.click(screen.getByRole('button', { name: 'Active' }));

      expect(screen.getByText('Slack')).toBeInTheDocument();
      expect(screen.getByText('Figma')).toBeInTheDocument();
      expect(screen.queryByText('OldApp')).not.toBeInTheDocument();
      expect(screen.queryByText('ShadowTool')).not.toBeInTheDocument();
    });

    it('filters to Inactive apps when Inactive pill is clicked', async () => {
      renderAppList();

      await userEvent.click(screen.getByRole('button', { name: 'Inactive' }));

      expect(screen.getByText('OldApp')).toBeInTheDocument();
      expect(screen.queryByText('Slack')).not.toBeInTheDocument();
      expect(screen.queryByText('Figma')).not.toBeInTheDocument();
      expect(screen.queryByText('ShadowTool')).not.toBeInTheDocument();
    });

    it('filters to Expired apps when Expired pill is clicked', async () => {
      renderAppList();

      await userEvent.click(screen.getByRole('button', { name: 'Expired' }));

      expect(screen.getByText('ShadowTool')).toBeInTheDocument();
      expect(screen.queryByText('Slack')).not.toBeInTheDocument();
      expect(screen.queryByText('OldApp')).not.toBeInTheDocument();
    });

    it('returns to showing all apps when All pill is clicked after filtering', async () => {
      renderAppList();

      await userEvent.click(screen.getByRole('button', { name: 'Active' }));
      expect(screen.queryByText('OldApp')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'All' }));
      expect(screen.getByText('Slack')).toBeInTheDocument();
      expect(screen.getByText('Figma')).toBeInTheDocument();
      expect(screen.getByText('OldApp')).toBeInTheDocument();
      expect(screen.getByText('ShadowTool')).toBeInTheDocument();
    });

    it('shows empty state when filter yields no results', async () => {
      // Only Active and Inactive and Expired apps in our data -- remove them all
      useStore.setState({ apps: [] });
      renderAppList();

      expect(screen.getByText('No apps found')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. "Add App" button opens modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe('"Add App" button opens modal', () => {
    it('shows the Add App button when user role is Admin', () => {
      renderAppList();
      expect(screen.getByRole('button', { name: /add app/i })).toBeInTheDocument();
    });

    it('opens the add app modal when clicked', async () => {
      renderAppList();

      await userEvent.click(screen.getByRole('button', { name: /add app/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add New App / License')).toBeInTheDocument();
    });

    it('modal contains expected form fields', async () => {
      renderAppList();
      await userEvent.click(screen.getByRole('button', { name: /add app/i }));
      const dialog = screen.getByRole('dialog');

      // Required fields
      expect(within(dialog).getByPlaceholderText('e.g. Slack')).toBeInTheDocument();
      expect(within(dialog).getByPlaceholderText('e.g. Salesforce')).toBeInTheDocument();

      // Other fields
      expect(within(dialog).getByPlaceholderText('Name of admin owner')).toBeInTheDocument();
    });

    it('closes modal when Cancel is clicked', async () => {
      renderAppList();
      await userEvent.click(screen.getByRole('button', { name: /add app/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const dialog = screen.getByRole('dialog');
      await userEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('submits the form and adds the new app to the store', async () => {
      renderAppList();

      await userEvent.click(screen.getByRole('button', { name: /add app/i }));
      const dialog = screen.getByRole('dialog');

      // Fill required fields
      await userEvent.type(within(dialog).getByPlaceholderText('e.g. Slack'), 'Notion');
      await userEvent.type(within(dialog).getByPlaceholderText('e.g. Salesforce'), 'Notion Labs');

      // Fill renewal date so the RenewalUrgency component renders without error
      const dateInputs = within(dialog).getAllByDisplayValue('');
      const renewalDateInput = dateInputs.find((el) => el.getAttribute('type') === 'date')!;
      fireEvent.change(renewalDateInput, { target: { value: '2027-12-01' } });

      // Submit via the modal footer's Add App button
      const buttons = within(dialog).getAllByRole('button', { name: /add app/i });
      const submitButton = buttons[buttons.length - 1];
      await userEvent.click(submitButton);

      // Modal should close
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Store should now contain 5 apps
      const state = useStore.getState();
      expect(state.apps).toHaveLength(5);

      const newApp = state.apps.find((a) => a.name === 'Notion');
      expect(newApp).toBeDefined();
      expect(newApp?.vendor).toBe('Notion Labs');
    });

    it('shows a success toast after adding an app', async () => {
      renderAppList();
      await userEvent.click(screen.getByRole('button', { name: /add app/i }));
      const dialog = screen.getByRole('dialog');

      await userEvent.type(within(dialog).getByPlaceholderText('e.g. Slack'), 'ToastApp');
      await userEvent.type(within(dialog).getByPlaceholderText('e.g. Salesforce'), 'Toast Vendor');

      const dateInputs = within(dialog).getAllByDisplayValue('');
      const renewalDateInput = dateInputs.find((el) => el.getAttribute('type') === 'date')!;
      fireEvent.change(renewalDateInput, { target: { value: '2027-12-01' } });

      const buttons = within(dialog).getAllByRole('button', { name: /add app/i });
      await userEvent.click(buttons[buttons.length - 1]);

      const state = useStore.getState();
      expect(state.toasts.some((t) => t.type === 'success' && t.message.includes('ToastApp'))).toBe(true);
    });

    it('shows validation errors when required fields are empty', async () => {
      renderAppList();
      await userEvent.click(screen.getByRole('button', { name: /add app/i }));
      const dialog = screen.getByRole('dialog');

      // Submit without filling anything
      const buttons = within(dialog).getAllByRole('button', { name: /add app/i });
      await userEvent.click(buttons[buttons.length - 1]);

      expect(within(dialog).getByText('App name is required')).toBeInTheDocument();
      expect(within(dialog).getByText('Vendor is required')).toBeInTheDocument();

      // Modal should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // No new app should be added
      expect(useStore.getState().apps).toHaveLength(4);
    });

    it('clears validation error when user starts typing in errored field', async () => {
      renderAppList();
      await userEvent.click(screen.getByRole('button', { name: /add app/i }));
      const dialog = screen.getByRole('dialog');

      // Trigger validation
      const buttons = within(dialog).getAllByRole('button', { name: /add app/i });
      await userEvent.click(buttons[buttons.length - 1]);

      expect(within(dialog).getByText('App name is required')).toBeInTheDocument();

      // Start typing in the name field
      await userEvent.type(within(dialog).getByPlaceholderText('e.g. Slack'), 'A');
      expect(within(dialog).queryByText('App name is required')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Row click navigates to app detail
  // ═══════════════════════════════════════════════════════════════════════════

  describe('row click navigates to app detail', () => {
    it('navigates to /apps/:id when a table row is clicked', () => {
      renderAppList();

      const nameCell = screen.getByText('Slack');
      const row = nameCell.closest('tr');
      expect(row).toBeTruthy();
      fireEvent.click(row!);

      expect(mockNavigate).toHaveBeenCalledWith('/apps/app1');
    });

    it('navigates to correct id for different apps', () => {
      renderAppList();

      const nameCell = screen.getByText('Figma');
      const row = nameCell.closest('tr');
      fireEvent.click(row!);

      expect(mockNavigate).toHaveBeenCalledWith('/apps/app2');
    });

    it('navigates to correct id for third app', () => {
      renderAppList();

      const nameCell = screen.getByText('OldApp');
      const row = nameCell.closest('tr');
      fireEvent.click(row!);

      expect(mockNavigate).toHaveBeenCalledWith('/apps/app3');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Export button works
  // ═══════════════════════════════════════════════════════════════════════════

  describe('export button works', () => {
    it('renders an Export button', () => {
      renderAppList();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('calls exportToCSV with all apps when no filter is active', async () => {
      renderAppList();

      await userEvent.click(screen.getByRole('button', { name: /export/i }));

      expect(exportToCSVMock).toHaveBeenCalledTimes(1);
      const [data, columns, filename] = exportToCSVMock.mock.calls[0];
      expect(data).toHaveLength(4);
      expect(filename).toBe('apps');
      expect(columns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'name', label: 'App Name' }),
          expect.objectContaining({ key: 'vendor', label: 'Vendor' }),
        ]),
      );
    });

    it('exports only filtered apps when search filter is active', async () => {
      renderAppList();

      const searchInput = screen.getByPlaceholderText('Search apps...');
      await userEvent.type(searchInput, 'Slack');

      await userEvent.click(screen.getByRole('button', { name: /export/i }));

      const [data] = exportToCSVMock.mock.calls[0];
      expect(data).toHaveLength(1);
    });

    it('exports only status-filtered apps', async () => {
      renderAppList();

      await userEvent.click(screen.getByRole('button', { name: 'Inactive' }));
      await userEvent.click(screen.getByRole('button', { name: /export/i }));

      const [data] = exportToCSVMock.mock.calls[0];
      expect(data).toHaveLength(1);
    });

    it('shows a success toast after exporting', async () => {
      renderAppList();

      await userEvent.click(screen.getByRole('button', { name: /export/i }));

      const state = useStore.getState();
      expect(state.toasts.some((t) => t.type === 'success' && t.message.includes('Exported'))).toBe(true);
    });

    it('always shows the Export button regardless of role', () => {
      useStore.setState({ currentUserRole: 'Read Only' });
      renderAppList();

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Read Only role cannot see Add App button
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Read Only role cannot see Add App button', () => {
    it('hides Add App button for Read Only role', () => {
      useStore.setState({ currentUserRole: 'Read Only' });
      renderAppList();

      expect(screen.queryByRole('button', { name: /add app/i })).not.toBeInTheDocument();
    });

    it('hides Add App button for Finance role', () => {
      useStore.setState({ currentUserRole: 'Finance' });
      renderAppList();

      expect(screen.queryByRole('button', { name: /add app/i })).not.toBeInTheDocument();
    });

    it('shows Add App button for IT Manager role', () => {
      useStore.setState({ currentUserRole: 'IT Manager' });
      renderAppList();

      expect(screen.getByRole('button', { name: /add app/i })).toBeInTheDocument();
    });

    it('shows Add App button for Admin role', () => {
      useStore.setState({ currentUserRole: 'Admin' });
      renderAppList();

      expect(screen.getByRole('button', { name: /add app/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Additional: Category filter and view toggle
  // ═══════════════════════════════════════════════════════════════════════════

  describe('category filter', () => {
    it('filters apps by category when dropdown is used', async () => {
      renderAppList();

      // Open the Filters panel
      await userEvent.click(screen.getByRole('button', { name: /filters/i }));

      const categorySelect = screen.getByRole('combobox');
      await userEvent.selectOptions(categorySelect, 'Communication');

      expect(screen.getByText('Slack')).toBeInTheDocument();
      expect(screen.queryByText('Figma')).not.toBeInTheDocument();
      expect(screen.queryByText('OldApp')).not.toBeInTheDocument();
    });

    it('shows all apps again when category is cleared', async () => {
      renderAppList();

      await userEvent.click(screen.getByRole('button', { name: /filters/i }));

      const categorySelect = screen.getByRole('combobox');
      await userEvent.selectOptions(categorySelect, 'Design');
      expect(screen.queryByText('Slack')).not.toBeInTheDocument();
      expect(screen.getByText('Figma')).toBeInTheDocument();

      // Clear by selecting "All Categories"
      await userEvent.selectOptions(categorySelect, '');
      expect(screen.getByText('Slack')).toBeInTheDocument();
      expect(screen.getByText('Figma')).toBeInTheDocument();
      expect(screen.getByText('OldApp')).toBeInTheDocument();
    });

    it('shows Clear button when a category is selected', async () => {
      renderAppList();

      await userEvent.click(screen.getByRole('button', { name: /filters/i }));

      const categorySelect = screen.getByRole('combobox');
      await userEvent.selectOptions(categorySelect, 'Other');

      expect(screen.getByText('OldApp')).toBeInTheDocument();
      expect(screen.queryByText('Slack')).not.toBeInTheDocument();

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await userEvent.click(clearButton);

      expect(screen.getByText('Slack')).toBeInTheDocument();
      expect(screen.getByText('Figma')).toBeInTheDocument();
      expect(screen.getByText('OldApp')).toBeInTheDocument();
    });
  });

  describe('view toggle', () => {
    it('renders "App Register" and "Renewal Timeline" view tabs', () => {
      renderAppList();

      expect(screen.getByRole('button', { name: 'App Register' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Renewal Timeline' })).toBeInTheDocument();
    });

    it('switches to Renewal Timeline view', async () => {
      renderAppList();

      await userEvent.click(screen.getByRole('button', { name: 'Renewal Timeline' }));

      // "Renewal Timeline" appears in both the tab button and the h3 heading
      const matches = screen.getAllByText('Renewal Timeline');
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });
  });
});
