import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { AssetList } from '../Assets/AssetList';

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

function renderAssetList() {
  return render(
    <BrowserRouter>
      <AssetList />
    </BrowserRouter>,
  );
}

/**
 * Locate a status-filter pill button by its text prefix.
 * Status pills are rendered as rounded-full buttons with text like "Deployed (1)" or just "All".
 */
function getStatusPill(label: string): HTMLElement {
  const buttons = screen.getAllByRole('button');
  const pill = buttons.find((btn) => {
    const text = btn.textContent?.trim() ?? '';
    if (!btn.className.includes('rounded-full')) return false;
    return text.startsWith(label);
  });
  if (!pill) throw new Error(`Status pill "${label}" not found`);
  return pill;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockAssets = [
  {
    id: 'a1',
    tag: 'AST-001',
    name: 'ThinkPad X1',
    type: 'Laptop' as const,
    make: 'Lenovo',
    model: 'X1 Carbon',
    serial: 'SN-ALPHA',
    status: 'Deployed' as const,
    assignedTo: 'Alice Johnson',
    assignedToId: 'p1',
    location: 'New York',
    purchaseDate: '2024-01-15',
    warrantyExpiry: '2027-01-15',
    cost: 1899,
    currency: 'USD',
  },
  {
    id: 'a2',
    tag: 'AST-002',
    name: 'Dell UltraSharp',
    type: 'Monitor' as const,
    make: 'Dell',
    model: 'U2723QE',
    serial: 'SN-BRAVO',
    status: 'In Stock' as const,
    location: 'Kansas City',
    purchaseDate: '2024-03-01',
    warrantyExpiry: '2027-03-01',
    cost: 550,
    currency: 'USD',
  },
  {
    id: 'a3',
    tag: 'AST-003',
    name: 'HP Z4 Workstation',
    type: 'Desktop' as const,
    make: 'HP',
    model: 'Z4 G5',
    serial: 'SN-CHARLIE',
    status: 'In Repair' as const,
    location: 'Conshohocken',
    purchaseDate: '2023-06-15',
    warrantyExpiry: '2026-06-15',
    cost: 2200,
    currency: 'USD',
  },
  {
    id: 'a4',
    tag: 'AST-004',
    name: 'iPhone 15 Pro',
    type: 'Phone' as const,
    make: 'Apple',
    model: '15 Pro',
    serial: 'SN-DELTA',
    status: 'Retired' as const,
    assignedTo: 'Bob Smith',
    assignedToId: 'p2',
    location: 'Remote',
    purchaseDate: '2023-09-20',
    warrantyExpiry: '2025-09-20',
    cost: 1199,
    currency: 'USD',
  },
];

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({
    assets: mockAssets,
    apps: [],
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

describe('AssetList page', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Renders assets table with correct data
  // ═══════════════════════════════════════════════════════════════════════════

  describe('renders assets table with correct data', () => {
    it('renders the "Assets" page heading', () => {
      renderAssetList();
      expect(screen.getByRole('heading', { name: /assets/i })).toBeInTheDocument();
    });

    it('shows total asset count in subtitle', () => {
      renderAssetList();
      expect(screen.getByText(/4 total assets/)).toBeInTheDocument();
    });

    it('shows deployed count in subtitle', () => {
      renderAssetList();
      const matches = screen.getAllByText(/1 deployed/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('displays asset names in the default grouped view', () => {
      renderAssetList();
      expect(screen.getByText('ThinkPad X1')).toBeInTheDocument();
      expect(screen.getByText('Dell UltraSharp')).toBeInTheDocument();
      expect(screen.getByText('HP Z4 Workstation')).toBeInTheDocument();
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    });

    it('displays correct column headers when in list view', () => {
      renderAssetList();
      fireEvent.click(screen.getByTitle('List view'));

      expect(screen.getByText('Asset Tag')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Assigned To')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('displays asset data rows in list view', () => {
      renderAssetList();
      fireEvent.click(screen.getByTitle('List view'));

      expect(screen.getByText('AST-001')).toBeInTheDocument();
      expect(screen.getByText('ThinkPad X1')).toBeInTheDocument();
      expect(screen.getByText('AST-002')).toBeInTheDocument();
      expect(screen.getByText('Dell UltraSharp')).toBeInTheDocument();
      expect(screen.getByText('AST-003')).toBeInTheDocument();
      expect(screen.getByText('HP Z4 Workstation')).toBeInTheDocument();
    });

    it('displays assigned user names in list view', () => {
      renderAssetList();
      fireEvent.click(screen.getByTitle('List view'));

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Search filters assets
  // ═══════════════════════════════════════════════════════════════════════════

  describe('search filters assets', () => {
    it('renders the search input', () => {
      renderAssetList();
      expect(screen.getByPlaceholderText(/search assets/i)).toBeInTheDocument();
    });

    it('filters assets by name', () => {
      renderAssetList();
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      fireEvent.change(searchInput, { target: { value: 'ThinkPad' } });

      expect(screen.getByText('ThinkPad X1')).toBeInTheDocument();
      expect(screen.queryByText('Dell UltraSharp')).not.toBeInTheDocument();
      expect(screen.queryByText('HP Z4 Workstation')).not.toBeInTheDocument();
    });

    it('filters assets by asset tag', () => {
      renderAssetList();
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      fireEvent.change(searchInput, { target: { value: 'AST-002' } });

      expect(screen.getByText('Dell UltraSharp')).toBeInTheDocument();
      expect(screen.queryByText('ThinkPad X1')).not.toBeInTheDocument();
    });

    it('filters assets by serial number', () => {
      renderAssetList();
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      fireEvent.change(searchInput, { target: { value: 'SN-CHARLIE' } });

      expect(screen.getByText('HP Z4 Workstation')).toBeInTheDocument();
      expect(screen.queryByText('Dell UltraSharp')).not.toBeInTheDocument();
    });

    it('filters assets by assignedTo', () => {
      renderAssetList();
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      fireEvent.change(searchInput, { target: { value: 'Alice' } });

      expect(screen.getByText('ThinkPad X1')).toBeInTheDocument();
      expect(screen.queryByText('Dell UltraSharp')).not.toBeInTheDocument();
      expect(screen.queryByText('HP Z4 Workstation')).not.toBeInTheDocument();
    });

    it('shows empty state when search matches nothing', () => {
      renderAssetList();
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      fireEvent.change(searchInput, { target: { value: 'zzz-no-match-zzz' } });

      expect(screen.getByText('No assets found')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Status filter pills filter correctly
  // ═══════════════════════════════════════════════════════════════════════════

  describe('status filter pills filter correctly', () => {
    it('renders all status filter pills', () => {
      renderAssetList();

      expect(getStatusPill('All')).toBeInTheDocument();
      expect(getStatusPill('Deployed')).toBeInTheDocument();
      expect(getStatusPill('In Stock')).toBeInTheDocument();
      expect(getStatusPill('In Repair')).toBeInTheDocument();
      expect(getStatusPill('Retired')).toBeInTheDocument();
      expect(getStatusPill('Lost')).toBeInTheDocument();
    });

    it('filters to Deployed assets when Deployed pill is clicked', () => {
      renderAssetList();
      fireEvent.click(getStatusPill('Deployed'));

      expect(screen.getByText('ThinkPad X1')).toBeInTheDocument();
      expect(screen.queryByText('Dell UltraSharp')).not.toBeInTheDocument();
      expect(screen.queryByText('HP Z4 Workstation')).not.toBeInTheDocument();
      expect(screen.queryByText('iPhone 15 Pro')).not.toBeInTheDocument();
    });

    it('filters to In Stock assets when In Stock pill is clicked', () => {
      renderAssetList();
      fireEvent.click(getStatusPill('In Stock'));

      expect(screen.getByText('Dell UltraSharp')).toBeInTheDocument();
      expect(screen.queryByText('ThinkPad X1')).not.toBeInTheDocument();
    });

    it('filters to In Repair assets when In Repair pill is clicked', () => {
      renderAssetList();
      fireEvent.click(getStatusPill('In Repair'));

      expect(screen.getByText('HP Z4 Workstation')).toBeInTheDocument();
      expect(screen.queryByText('ThinkPad X1')).not.toBeInTheDocument();
    });

    it('filters to Retired assets when Retired pill is clicked', () => {
      renderAssetList();
      fireEvent.click(getStatusPill('Retired'));

      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
      expect(screen.queryByText('ThinkPad X1')).not.toBeInTheDocument();
    });

    it('shows all assets again when All pill is clicked after filtering', () => {
      renderAssetList();

      fireEvent.click(getStatusPill('Deployed'));
      expect(screen.queryByText('Dell UltraSharp')).not.toBeInTheDocument();

      fireEvent.click(getStatusPill('All'));
      expect(screen.getByText('ThinkPad X1')).toBeInTheDocument();
      expect(screen.getByText('Dell UltraSharp')).toBeInTheDocument();
      expect(screen.getByText('HP Z4 Workstation')).toBeInTheDocument();
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    });

    it('shows empty state when status filter yields no results', () => {
      renderAssetList();
      fireEvent.click(getStatusPill('Lost'));

      expect(screen.getByText('No assets found')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. "Add Asset" button opens modal
  // ═══════════════════════════════════════════════════════════════════════════

  describe('"Add Asset" button opens modal', () => {
    it('shows the Add Asset button when user role is Admin', () => {
      renderAssetList();
      expect(screen.getByRole('button', { name: /add asset/i })).toBeInTheDocument();
    });

    it('opens the add asset modal when clicked', async () => {
      renderAssetList();
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add New Asset')).toBeInTheDocument();
    });

    it('modal contains all expected form fields', async () => {
      renderAssetList();
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      const dialog = screen.getByRole('dialog');

      // Required fields
      expect(within(dialog).getByPlaceholderText('AST-XXXX')).toBeInTheDocument();
      expect(within(dialog).getByPlaceholderText(/MacBook Pro/i)).toBeInTheDocument();

      // Other fields
      expect(within(dialog).getByPlaceholderText(/Apple, Dell/i)).toBeInTheDocument(); // make
      expect(within(dialog).getByPlaceholderText('Model name')).toBeInTheDocument();
      expect(within(dialog).getByPlaceholderText('SN-XXXXX')).toBeInTheDocument(); // serial
      expect(within(dialog).getByPlaceholderText('Office location')).toBeInTheDocument(); // location
      expect(within(dialog).getByPlaceholderText('Vendor name')).toBeInTheDocument();
    });

    it('closes the modal when Cancel is clicked', async () => {
      renderAssetList();
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const dialog = screen.getByRole('dialog');
      await userEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Filling and submitting add asset form adds asset
  // ═══════════════════════════════════════════════════════════════════════════

  describe('filling and submitting add asset form adds asset', () => {
    it('adds an asset to the store and closes modal on valid submission', async () => {
      renderAssetList();
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      const dialog = screen.getByRole('dialog');

      // Fill required fields
      await userEvent.type(within(dialog).getByPlaceholderText('AST-XXXX'), 'AST-NEW');
      await userEvent.type(within(dialog).getByPlaceholderText(/MacBook Pro/i), 'Test Laptop');

      // Fill optional fields
      await userEvent.type(within(dialog).getByPlaceholderText(/Apple, Dell/i), 'Lenovo');
      await userEvent.type(within(dialog).getByPlaceholderText('Model name'), 'T14s');
      await userEvent.type(within(dialog).getByPlaceholderText('SN-XXXXX'), 'SN-TEST');

      // Submit
      await userEvent.click(within(dialog).getByRole('button', { name: /create asset/i }));

      // Modal should close
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Store should now have 5 assets
      const state = useStore.getState();
      expect(state.assets).toHaveLength(5);

      const newAsset = state.assets.find((a) => a.tag === 'AST-NEW');
      expect(newAsset).toBeDefined();
      expect(newAsset?.name).toBe('Test Laptop');
      expect(newAsset?.make).toBe('Lenovo');
      expect(newAsset?.model).toBe('T14s');
      expect(newAsset?.serial).toBe('SN-TEST');
    });

    it('shows a success toast after adding an asset', async () => {
      renderAssetList();
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      const dialog = screen.getByRole('dialog');

      await userEvent.type(within(dialog).getByPlaceholderText('AST-XXXX'), 'AST-TOAST');
      await userEvent.type(within(dialog).getByPlaceholderText(/MacBook Pro/i), 'Toast Laptop');

      await userEvent.click(within(dialog).getByRole('button', { name: /create asset/i }));

      const state = useStore.getState();
      expect(state.toasts.some((t) => t.type === 'success' && t.message.includes('Toast Laptop'))).toBe(true);
    });

    it('shows validation errors when required fields are empty', async () => {
      renderAssetList();
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      const dialog = screen.getByRole('dialog');

      // Submit without filling anything
      await userEvent.click(within(dialog).getByRole('button', { name: /create asset/i }));

      expect(within(dialog).getByText('Asset tag is required')).toBeInTheDocument();
      expect(within(dialog).getByText('Asset name is required')).toBeInTheDocument();

      // Modal should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // No new asset should be added
      expect(useStore.getState().assets).toHaveLength(4);
    });

    it('clears validation error when user starts typing in errored field', async () => {
      renderAssetList();
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      const dialog = screen.getByRole('dialog');

      // Trigger validation
      await userEvent.click(within(dialog).getByRole('button', { name: /create asset/i }));
      expect(within(dialog).getByText('Asset tag is required')).toBeInTheDocument();

      // Start typing in the tag field
      await userEvent.type(within(dialog).getByPlaceholderText('AST-XXXX'), 'A');
      expect(within(dialog).queryByText('Asset tag is required')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Export button triggers CSV download
  // ═══════════════════════════════════════════════════════════════════════════

  describe('export button triggers CSV download', () => {
    it('renders an Export button', () => {
      renderAssetList();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('calls exportToCSV with all assets when no filter is active', () => {
      renderAssetList();
      fireEvent.click(screen.getByRole('button', { name: /export/i }));

      expect(exportToCSVMock).toHaveBeenCalledTimes(1);
      const [data, , filename] = exportToCSVMock.mock.calls[0];
      expect(data).toHaveLength(4);
      expect(filename).toBe('assets');
    });

    it('exports only filtered assets when a search filter is active', () => {
      renderAssetList();
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      fireEvent.change(searchInput, { target: { value: 'ThinkPad' } });

      fireEvent.click(screen.getByRole('button', { name: /export/i }));

      const [data] = exportToCSVMock.mock.calls[0];
      expect(data).toHaveLength(1);
    });

    it('exports only status-filtered assets', () => {
      renderAssetList();
      fireEvent.click(getStatusPill('In Stock'));

      fireEvent.click(screen.getByRole('button', { name: /export/i }));

      const [data] = exportToCSVMock.mock.calls[0];
      expect(data).toHaveLength(1);
    });

    it('shows a success toast after exporting', () => {
      renderAssetList();
      fireEvent.click(screen.getByRole('button', { name: /export/i }));

      const state = useStore.getState();
      expect(state.toasts.some((t) => t.type === 'success' && t.message.includes('Exported'))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Row click navigates to asset detail
  // ═══════════════════════════════════════════════════════════════════════════

  describe('row click navigates to asset detail', () => {
    it('navigates to /assets/:id when a table row is clicked in list view', () => {
      renderAssetList();
      fireEvent.click(screen.getByTitle('List view'));

      // Find the row containing ThinkPad X1 and click it
      const nameCell = screen.getByText('ThinkPad X1');
      const row = nameCell.closest('tr');
      expect(row).toBeTruthy();
      fireEvent.click(row!);

      expect(mockNavigate).toHaveBeenCalledWith('/assets/a1');
    });

    it('navigates to /assets/:id when an asset card is clicked in grouped view', () => {
      renderAssetList();

      // Grouped view is the default. Find the card with the asset name.
      const nameElement = screen.getByText('ThinkPad X1');
      const card = nameElement.closest('[class*="cursor-pointer"]');
      expect(card).toBeTruthy();
      fireEvent.click(card!);

      expect(mockNavigate).toHaveBeenCalledWith('/assets/a1');
    });

    it('navigates to correct id for different assets', () => {
      renderAssetList();
      fireEvent.click(screen.getByTitle('List view'));

      const nameCell = screen.getByText('Dell UltraSharp');
      const row = nameCell.closest('tr');
      fireEvent.click(row!);

      expect(mockNavigate).toHaveBeenCalledWith('/assets/a2');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Read Only role cannot see Add Asset button
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Read Only role cannot see Add Asset button', () => {
    it('hides Add Asset button for Read Only role', () => {
      useStore.setState({ currentUserRole: 'Read Only' });
      renderAssetList();

      expect(screen.queryByRole('button', { name: /add asset/i })).not.toBeInTheDocument();
    });

    it('hides Add Asset button for Finance role', () => {
      useStore.setState({ currentUserRole: 'Finance' });
      renderAssetList();

      expect(screen.queryByRole('button', { name: /add asset/i })).not.toBeInTheDocument();
    });

    it('shows Add Asset button for IT Manager role', () => {
      useStore.setState({ currentUserRole: 'IT Manager' });
      renderAssetList();

      expect(screen.getByRole('button', { name: /add asset/i })).toBeInTheDocument();
    });

    it('hides Import button for Read Only role', () => {
      useStore.setState({ currentUserRole: 'Read Only' });
      renderAssetList();

      expect(screen.queryByRole('button', { name: /import/i })).not.toBeInTheDocument();
    });

    it('always shows Export button regardless of role', () => {
      useStore.setState({ currentUserRole: 'Read Only' });
      renderAssetList();

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('hides bulk action buttons for Read Only when rows are selected', () => {
      useStore.setState({ currentUserRole: 'Read Only' });
      renderAssetList();

      // Switch to list view
      fireEvent.click(screen.getByTitle('List view'));

      // Select all rows
      fireEvent.click(screen.getByRole('checkbox', { name: /select all/i }));
      expect(screen.getByText(/4 selected/i)).toBeInTheDocument();

      // Bulk edit / delete should NOT appear
      expect(screen.queryByRole('button', { name: /bulk edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. Bulk select works (checkboxes)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('bulk select works (checkboxes)', () => {
    it('renders checkboxes for each row in list view', () => {
      renderAssetList();
      fireEvent.click(screen.getByTitle('List view'));

      // 1 "select all" + 4 row checkboxes = 5
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(5);
    });

    it('selects a single row when its checkbox is clicked', () => {
      renderAssetList();
      fireEvent.click(screen.getByTitle('List view'));

      const checkboxes = screen.getAllByRole('checkbox');
      // checkboxes[0] is "select all", checkboxes[1] is first row
      fireEvent.click(checkboxes[1]);

      expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
    });

    it('selects all rows when the select-all checkbox is clicked', () => {
      renderAssetList();
      fireEvent.click(screen.getByTitle('List view'));

      const selectAll = screen.getByRole('checkbox', { name: /select all/i });
      fireEvent.click(selectAll);

      expect(screen.getByText(/4 selected/i)).toBeInTheDocument();
    });

    it('deselects a row when its checkbox is clicked again', () => {
      renderAssetList();
      fireEvent.click(screen.getByTitle('List view'));

      const checkboxes = screen.getAllByRole('checkbox');
      // Select then deselect
      fireEvent.click(checkboxes[1]);
      expect(screen.getByText(/1 selected/i)).toBeInTheDocument();

      fireEvent.click(checkboxes[1]);
      expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
    });

    it('shows bulk action buttons (Bulk Edit, Retire, Delete) when assets are selected', () => {
      renderAssetList();
      fireEvent.click(screen.getByTitle('List view'));

      fireEvent.click(screen.getByRole('checkbox', { name: /select all/i }));

      expect(screen.getByRole('button', { name: /bulk edit/i })).toBeInTheDocument();
      // Use exact match to avoid matching the "Retired" status filter pill
      const retireButtons = screen.getAllByRole('button', { name: /retire/i });
      const bulkRetireButton = retireButtons.find((btn) => !btn.className.includes('rounded-full'));
      expect(bulkRetireButton).toBeTruthy();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('deselects all when select-all is clicked twice', () => {
      renderAssetList();
      fireEvent.click(screen.getByTitle('List view'));

      const selectAll = screen.getByRole('checkbox', { name: /select all/i });
      fireEvent.click(selectAll);
      expect(screen.getByText(/4 selected/i)).toBeInTheDocument();

      fireEvent.click(selectAll);
      expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Additional: View toggle and edge cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('view toggle', () => {
    it('starts in grouped view by default', () => {
      renderAssetList();
      const groupedButton = screen.getByTitle('Grouped view');
      expect(groupedButton.className).toContain('bg-blue-600');
    });

    it('switches to list view when the list toggle button is clicked', () => {
      renderAssetList();
      const listButton = screen.getByTitle('List view');
      fireEvent.click(listButton);

      expect(listButton.className).toContain('bg-blue-600');
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('switches back to grouped view from list view', () => {
      renderAssetList();

      fireEvent.click(screen.getByTitle('List view'));
      expect(screen.getByRole('table')).toBeInTheDocument();

      fireEvent.click(screen.getByTitle('Grouped view'));
      const groupedButton = screen.getByTitle('Grouped view');
      expect(groupedButton.className).toContain('bg-blue-600');
    });
  });

  describe('empty state', () => {
    it('shows empty state when store has no assets', () => {
      useStore.setState({ assets: [] });
      renderAssetList();

      expect(screen.getByText('No assets found')).toBeInTheDocument();
      expect(screen.getByText('Add your first asset to get started')).toBeInTheDocument();
    });
  });

  describe('filters panel', () => {
    it('shows the Filters button and can expand filter panel', () => {
      renderAssetList();

      const filtersButton = screen.getByRole('button', { name: /filters/i });
      expect(filtersButton).toBeInTheDocument();

      fireEvent.click(filtersButton);

      // Labels are not associated via htmlFor, so check for the label text and select elements
      expect(screen.getByText('Type:')).toBeInTheDocument();
      expect(screen.getByText('Location:')).toBeInTheDocument();
      expect(screen.getByText('Source:')).toBeInTheDocument();
    });
  });
});
