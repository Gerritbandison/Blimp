import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { PeopleList } from '../People/PeopleList';

// ─── Mock csvExport so we can spy on calls without DOM side-effects ─────────

const exportToCSVMock = vi.fn();
vi.mock('../../utils/csvExport', () => ({
  exportToCSV: (...args: unknown[]) => exportToCSVMock(...args),
}));

// ─── Helper: capture navigations by rendering a catch-all route ─────────────

function NavigationSink() {
  return <div data-testid="navigated">Navigation occurred</div>;
}

function renderPeopleList(initialEntries: string[] = ['/people']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/people" element={<PeopleList />} />
        <Route path="/people/:id" element={<NavigationSink />} />
      </Routes>
    </MemoryRouter>
  );
}

/**
 * Helper: find a status-filter pill button by its exact status label.
 * The status pills are rendered as a set of small rounded-full buttons.
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

// ─── Shared store state ─────────────────────────────────────────────────────

const mockPeople = [
  {
    id: 'p1', name: 'Alice Johnson', email: 'alice@co.com',
    department: 'Engineering', title: 'Engineer', status: 'Active' as const,
    location: 'NYC', startDate: '2023-01-01',
    assetsAssigned: 2, licensesAssigned: 3, totalItCost: 2000,
  },
  {
    id: 'p2', name: 'Bob Smith', email: 'bob@co.com',
    department: 'Sales', title: 'Sales Rep', status: 'Onboarding' as const,
    location: 'London', startDate: '2024-01-15',
    assetsAssigned: 0, licensesAssigned: 0, totalItCost: 0,
  },
  {
    id: 'p3', name: 'Carol Davis', email: 'carol@co.com',
    department: 'Engineering', title: 'Senior Engineer', status: 'Offboarding' as const,
    location: 'NYC', startDate: '2021-03-10',
    assetsAssigned: 3, licensesAssigned: 5, totalItCost: 4500,
  },
];

// ─── Setup / Teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  useStore.setState({
    people: mockPeople,
    assets: [],
    apps: [],
    currentUserRole: 'Admin',
    currentUserName: 'Admin User',
    toasts: [],
    activityLog: [],
    notifications: [],
  });
  exportToCSVMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PeopleList page', () => {

  // ── 1. Renders people table with data ───────────────────────────────────

  it('renders the page with a "People" heading', () => {
    renderPeopleList();

    expect(screen.getByRole('heading', { name: /people/i })).toBeInTheDocument();
  });

  it('displays people names in the table', () => {
    renderPeopleList();

    // Names may appear in multiple places (table + stat card subtitles)
    expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bob Smith').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Carol Davis').length).toBeGreaterThanOrEqual(1);
  });

  it('displays people emails in the table', () => {
    renderPeopleList();

    expect(screen.getByText('alice@co.com')).toBeInTheDocument();
    expect(screen.getByText('bob@co.com')).toBeInTheDocument();
    expect(screen.getByText('carol@co.com')).toBeInTheDocument();
  });

  it('displays department data for people', () => {
    renderPeopleList();

    // Engineering appears for Alice and Carol
    const engineeringBadges = screen.getAllByText('Engineering');
    expect(engineeringBadges.length).toBeGreaterThanOrEqual(1);
    const salesBadges = screen.getAllByText('Sales');
    expect(salesBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('displays status badges for people', () => {
    renderPeopleList();

    // Status text appears in table badges, stat cards, and filter pills
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Onboarding').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Offboarding').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the DataTable with correct column headers', () => {
    renderPeopleList();

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Department')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
  });

  // ── 2. Shows summary stat cards ────────────────────────────────────────

  it('displays the Total People stat card with correct count', () => {
    renderPeopleList();

    expect(screen.getByText('Total People')).toBeInTheDocument();
    // The number "3" may appear in stat cards and filter pill counts
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
  });

  it('displays the Onboarding stat card with correct count', () => {
    renderPeopleList();

    // The stat card label appears in multiple places (card, filter pill, table badge)
    const onboardingLabels = screen.getAllByText('Onboarding');
    expect(onboardingLabels.length).toBeGreaterThanOrEqual(1);

    // Onboarding count = 1 (Bob Smith)
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
  });

  it('displays the Offboarding stat card with correct count', () => {
    renderPeopleList();

    expect(screen.getAllByText('Offboarding').length).toBeGreaterThanOrEqual(1);
  });

  it('displays the Total IT Cost stat card with formatted value', () => {
    renderPeopleList();

    expect(screen.getByText('Total IT Cost')).toBeInTheDocument();
    // Total cost = 2000 + 0 + 4500 = 6500
    expect(screen.getAllByText(/\$6,500/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows location count in the Total People card subtitle', () => {
    renderPeopleList();

    // 2 unique locations: NYC and London
    expect(screen.getByText('2 locations')).toBeInTheDocument();
  });

  // ── 3. Search filters people ──────────────────────────────────────────

  it('renders a search input with the correct placeholder', () => {
    renderPeopleList();

    expect(screen.getByPlaceholderText(/search people/i)).toBeInTheDocument();
  });

  it('filters people by name when the user types in the search input', () => {
    renderPeopleList();

    const searchInput = screen.getByPlaceholderText(/search people/i);
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    // Alice should be in the table; the table should NOT contain Bob or Carol rows
    const table = screen.getByRole('table');
    expect(within(table).getAllByText('Alice Johnson').length).toBeGreaterThanOrEqual(1);
    expect(within(table).queryByText('bob@co.com')).not.toBeInTheDocument();
    expect(within(table).queryByText('carol@co.com')).not.toBeInTheDocument();
  });

  it('filters people by email when searching', () => {
    renderPeopleList();

    const searchInput = screen.getByPlaceholderText(/search people/i);
    fireEvent.change(searchInput, { target: { value: 'bob@co.com' } });

    const table = screen.getByRole('table');
    expect(within(table).getByText('bob@co.com')).toBeInTheDocument();
    expect(within(table).queryByText('alice@co.com')).not.toBeInTheDocument();
  });

  it('filters people by department when searching', () => {
    renderPeopleList();

    const searchInput = screen.getByPlaceholderText(/search people/i);
    fireEvent.change(searchInput, { target: { value: 'Sales' } });

    const table = screen.getByRole('table');
    expect(within(table).getByText('bob@co.com')).toBeInTheDocument();
    expect(within(table).queryByText('alice@co.com')).not.toBeInTheDocument();
    expect(within(table).queryByText('carol@co.com')).not.toBeInTheDocument();
  });

  it('filters people by title when searching', () => {
    renderPeopleList();

    const searchInput = screen.getByPlaceholderText(/search people/i);
    fireEvent.change(searchInput, { target: { value: 'Senior Engineer' } });

    const table = screen.getByRole('table');
    expect(within(table).getByText('carol@co.com')).toBeInTheDocument();
    expect(within(table).queryByText('alice@co.com')).not.toBeInTheDocument();
    expect(within(table).queryByText('bob@co.com')).not.toBeInTheDocument();
  });

  it('search is case-insensitive', () => {
    renderPeopleList();

    const searchInput = screen.getByPlaceholderText(/search people/i);
    fireEvent.change(searchInput, { target: { value: 'alice' } });

    expect(screen.getAllByText('Alice Johnson')[0]).toBeInTheDocument();
  });

  it('shows empty state when search yields no results', () => {
    renderPeopleList();

    const searchInput = screen.getByPlaceholderText(/search people/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent-person-xyz' } });

    expect(screen.getByText('No people found')).toBeInTheDocument();
  });

  // ── 4. Status filter pills work ───────────────────────────────────────

  it('renders status filter pills including "All"', () => {
    renderPeopleList();

    expect(getStatusPill('All')).toBeInTheDocument();
    expect(getStatusPill('Active')).toBeInTheDocument();
    expect(getStatusPill('Onboarding')).toBeInTheDocument();
    expect(getStatusPill('Offboarding')).toBeInTheDocument();
    expect(getStatusPill('Offboarded')).toBeInTheDocument();
  });

  it('filters to only "Active" people when the Active pill is clicked', () => {
    renderPeopleList();

    fireEvent.click(getStatusPill('Active'));

    // Check within the table for filtered content
    const table = screen.getByRole('table');
    expect(within(table).getByText('alice@co.com')).toBeInTheDocument();
    expect(within(table).queryByText('bob@co.com')).not.toBeInTheDocument();
    expect(within(table).queryByText('carol@co.com')).not.toBeInTheDocument();
  });

  it('filters to only "Onboarding" people when the Onboarding pill is clicked', () => {
    renderPeopleList();

    fireEvent.click(getStatusPill('Onboarding'));

    const table = screen.getByRole('table');
    expect(within(table).getByText('bob@co.com')).toBeInTheDocument();
    expect(within(table).queryByText('alice@co.com')).not.toBeInTheDocument();
    expect(within(table).queryByText('carol@co.com')).not.toBeInTheDocument();
  });

  it('filters to only "Offboarding" people when the Offboarding pill is clicked', () => {
    renderPeopleList();

    fireEvent.click(getStatusPill('Offboarding'));

    const table = screen.getByRole('table');
    expect(within(table).getByText('carol@co.com')).toBeInTheDocument();
    expect(within(table).queryByText('alice@co.com')).not.toBeInTheDocument();
    expect(within(table).queryByText('bob@co.com')).not.toBeInTheDocument();
  });

  it('shows empty state when status filter yields no results', () => {
    renderPeopleList();

    // None of our people are "Offboarded"
    fireEvent.click(getStatusPill('Offboarded'));

    expect(screen.getByText('No people found')).toBeInTheDocument();
  });

  it('shows all people again when "All" pill is clicked after filtering', () => {
    renderPeopleList();

    // Filter to Active first
    fireEvent.click(getStatusPill('Active'));
    const table = screen.getByRole('table');
    expect(within(table).queryByText('bob@co.com')).not.toBeInTheDocument();

    // Click All
    fireEvent.click(getStatusPill('All'));

    expect(within(table).getByText('alice@co.com')).toBeInTheDocument();
    expect(within(table).getByText('bob@co.com')).toBeInTheDocument();
    expect(within(table).getByText('carol@co.com')).toBeInTheDocument();
  });

  it('displays person counts in status filter pills', () => {
    renderPeopleList();

    // Active (1), Onboarding (1), Offboarding (1), Offboarded (0)
    const activePill = getStatusPill('Active');
    expect(activePill.textContent).toContain('(1)');

    const onboardingPill = getStatusPill('Onboarding');
    expect(onboardingPill.textContent).toContain('(1)');

    const offboardingPill = getStatusPill('Offboarding');
    expect(offboardingPill.textContent).toContain('(1)');

    const offboardedPill = getStatusPill('Offboarded');
    expect(offboardedPill.textContent).toContain('(0)');
  });

  // ── 5. "Add Person" button opens modal ────────────────────────────────

  it('shows the "Add Person" button when user role is Admin', () => {
    renderPeopleList();

    expect(screen.getByRole('button', { name: /add person/i })).toBeInTheDocument();
  });

  it('opens the add person modal when "Add Person" is clicked', () => {
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /add person/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add New Person')).toBeInTheDocument();
  });

  it('shows all form fields in the add person modal', () => {
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /add person/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByPlaceholderText('e.g. Jane Smith')).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('jane@company.com')).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('Engineering, Sales...')).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('Job title')).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('Office location')).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('+1 (555) 000-0000')).toBeInTheDocument();
  });

  it('shows required asterisks for name and email fields', () => {
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /add person/i }));

    const dialog = screen.getByRole('dialog');
    // The labels include a red asterisk
    const labels = within(dialog).getAllByText('*');
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });

  it('closes the modal when "Cancel" is clicked', () => {
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /add person/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    const cancelButton = within(dialog).getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ── 6. Form validation shows errors for empty name/email ──────────────

  it('shows validation error for empty name when submitting', () => {
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /add person/i }));

    const dialog = screen.getByRole('dialog');
    // Click the "Add Person" submit button inside the modal
    const submitButton = within(dialog).getAllByRole('button', { name: /add person/i })[0];
    fireEvent.click(submitButton);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('shows validation error for empty email when submitting', () => {
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /add person/i }));

    const dialog = screen.getByRole('dialog');
    const submitButton = within(dialog).getAllByRole('button', { name: /add person/i })[0];
    fireEvent.click(submitButton);

    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('shows both validation errors simultaneously when both are empty', () => {
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /add person/i }));

    const dialog = screen.getByRole('dialog');
    const submitButton = within(dialog).getAllByRole('button', { name: /add person/i })[0];
    fireEvent.click(submitButton);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('does not show name error when only email is missing', async () => {
    const user = userEvent.setup();
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /add person/i }));

    const dialog = screen.getByRole('dialog');
    const nameInput = within(dialog).getByPlaceholderText('e.g. Jane Smith');
    await user.type(nameInput, 'Test Person');

    const submitButton = within(dialog).getAllByRole('button', { name: /add person/i })[0];
    fireEvent.click(submitButton);

    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('does not close the modal when validation fails', () => {
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /add person/i }));

    const dialog = screen.getByRole('dialog');
    const submitButton = within(dialog).getAllByRole('button', { name: /add person/i })[0];
    fireEvent.click(submitButton);

    // Modal should remain open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('clears name error when user starts typing in name field', async () => {
    const user = userEvent.setup();
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /add person/i }));

    const dialog = screen.getByRole('dialog');
    const submitButton = within(dialog).getAllByRole('button', { name: /add person/i })[0];
    fireEvent.click(submitButton);

    expect(screen.getByText('Name is required')).toBeInTheDocument();

    const nameInput = within(dialog).getByPlaceholderText('e.g. Jane Smith');
    await user.type(nameInput, 'A');

    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  // ── 7. Submitting valid form adds person ──────────────────────────────

  it('adds a person to the store when form is submitted with valid data', async () => {
    const user = userEvent.setup();
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /add person/i }));

    const dialog = screen.getByRole('dialog');
    const nameInput = within(dialog).getByPlaceholderText('e.g. Jane Smith');
    const emailInput = within(dialog).getByPlaceholderText('jane@company.com');

    await user.type(nameInput, 'Jane Doe');
    await user.type(emailInput, 'jane@company.com');

    const submitButton = within(dialog).getAllByRole('button', { name: /add person/i })[0];
    fireEvent.click(submitButton);

    // Modal should close
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // The new person should appear in the list
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('closes the modal after successful submission', async () => {
    const user = userEvent.setup();
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /add person/i }));

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('e.g. Jane Smith'), 'New Person');
    await user.type(within(dialog).getByPlaceholderText('jane@company.com'), 'new@co.com');

    const submitButton = within(dialog).getAllByRole('button', { name: /add person/i })[0];
    fireEvent.click(submitButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('adds a toast notification after adding a person', async () => {
    const user = userEvent.setup();
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /add person/i }));

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('e.g. Jane Smith'), 'Jane Doe');
    await user.type(within(dialog).getByPlaceholderText('jane@company.com'), 'jane@co.com');

    const submitButton = within(dialog).getAllByRole('button', { name: /add person/i })[0];
    fireEvent.click(submitButton);

    const storeState = useStore.getState();
    const lastToast = storeState.toasts[storeState.toasts.length - 1];
    expect(lastToast.type).toBe('success');
    expect(lastToast.message).toContain('Jane Doe');
  });

  it('increases total people count after adding a person', async () => {
    const user = userEvent.setup();
    renderPeopleList();

    // Before: 3 people (the number '3' appears in multiple places: stat card, table badges)
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: /add person/i }));

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('e.g. Jane Smith'), 'New Person');
    await user.type(within(dialog).getByPlaceholderText('jane@company.com'), 'new@test.com');

    const submitButton = within(dialog).getAllByRole('button', { name: /add person/i })[0];
    fireEvent.click(submitButton);

    // After: 4 people
    const storeState = useStore.getState();
    expect(storeState.people).toHaveLength(4);
  });

  // ── 8. Export button works ────────────────────────────────────────────

  it('renders an "Export" button', () => {
    renderPeopleList();

    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('calls exportToCSV with people data when "Export" is clicked', () => {
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    expect(exportToCSVMock).toHaveBeenCalledTimes(1);
    // First arg should be the people array (all 3 since no filter active)
    const firstArg = exportToCSVMock.mock.calls[0][0] as unknown[];
    expect(firstArg).toHaveLength(3);
    // Third arg should be the filename base
    expect(exportToCSVMock.mock.calls[0][2]).toBe('people');
  });

  it('exports only filtered people when a search filter is active', () => {
    renderPeopleList();

    const searchInput = screen.getByPlaceholderText(/search people/i);
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    const firstArg = exportToCSVMock.mock.calls[0][0] as unknown[];
    expect(firstArg).toHaveLength(1);
  });

  it('exports only filtered people when a status filter is active', () => {
    renderPeopleList();

    fireEvent.click(getStatusPill('Active'));

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    const firstArg = exportToCSVMock.mock.calls[0][0] as unknown[];
    expect(firstArg).toHaveLength(1);
  });

  it('adds a toast notification after exporting', () => {
    renderPeopleList();

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    const storeState = useStore.getState();
    const lastToast = storeState.toasts[storeState.toasts.length - 1];
    expect(lastToast.type).toBe('success');
    expect(lastToast.message).toContain('Exported');
    expect(lastToast.message).toContain('people');
  });

  // ── 9. Row click navigates to person detail ───────────────────────────

  it('navigates to person detail when a table row is clicked', async () => {
    renderPeopleList();

    // Find Alice's name element and click the row
    const aliceElement = screen.getAllByText('Alice Johnson')[0];
    const row = aliceElement.closest('tr');
    expect(row).toBeTruthy();
    fireEvent.click(row!);

    // Should navigate to person detail route
    await waitFor(() => {
      expect(screen.getByTestId('navigated')).toBeInTheDocument();
    });
  });

  // ── 10. Read Only role hides Add Person ───────────────────────────────

  it('hides the "Add Person" button when user role is Read Only', () => {
    useStore.setState({ currentUserRole: 'Read Only' });
    renderPeopleList();

    expect(screen.queryByRole('button', { name: /add person/i })).not.toBeInTheDocument();
  });

  it('hides the "Add Person" button when user role is Finance', () => {
    useStore.setState({ currentUserRole: 'Finance' });
    renderPeopleList();

    expect(screen.queryByRole('button', { name: /add person/i })).not.toBeInTheDocument();
  });

  it('shows the "Add Person" button when user role is IT Manager', () => {
    useStore.setState({ currentUserRole: 'IT Manager' });
    renderPeopleList();

    expect(screen.getByRole('button', { name: /add person/i })).toBeInTheDocument();
  });

  // ── Additional tests: Department cards ────────────────────────────────

  it('displays department breakdown cards', () => {
    renderPeopleList();

    expect(screen.getByText('Departments')).toBeInTheDocument();
    // Engineering and Sales departments
    // Department cards show dept name and people count
    const engCards = screen.getAllByText('Engineering');
    expect(engCards.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by department when a department card is clicked', () => {
    renderPeopleList();

    // Find and click the Sales department card button
    const buttons = screen.getAllByRole('button');
    const salesCard = buttons.find((btn) => {
      const text = btn.textContent ?? '';
      return text.includes('Sales') && text.includes('person');
    });
    expect(salesCard).toBeTruthy();
    fireEvent.click(salesCard!);

    // Only Bob's email should be visible in the table (Sales department)
    const table = screen.getByRole('table');
    expect(within(table).getByText('bob@co.com')).toBeInTheDocument();
    expect(within(table).queryByText('alice@co.com')).not.toBeInTheDocument();
  });

  it('clears department filter when the same department card is clicked again', () => {
    renderPeopleList();

    const buttons = screen.getAllByRole('button');
    const salesCard = buttons.find((btn) => {
      const text = btn.textContent ?? '';
      return text.includes('Sales') && text.includes('person');
    });
    expect(salesCard).toBeTruthy();

    // Click to filter
    fireEvent.click(salesCard!);
    const table = screen.getByRole('table');
    expect(within(table).queryByText('alice@co.com')).not.toBeInTheDocument();

    // Click again to clear
    fireEvent.click(salesCard!);
    expect(within(table).getByText('alice@co.com')).toBeInTheDocument();
    expect(within(table).getByText('bob@co.com')).toBeInTheDocument();
  });

  // ── Additional tests: Subtitle info ───────────────────────────────────

  it('shows active, onboarding, and offboarding counts in subtitle', () => {
    renderPeopleList();

    expect(screen.getByText(/1 active/i)).toBeInTheDocument();
    expect(screen.getByText(/1 onboarding/i)).toBeInTheDocument();
    expect(screen.getByText(/1 offboarding/i)).toBeInTheDocument();
  });

  // ── Additional tests: Filters button ──────────────────────────────────

  it('shows the Filters button and can expand filter panel', () => {
    renderPeopleList();

    const filtersButton = screen.getByRole('button', { name: /filters/i });
    expect(filtersButton).toBeInTheDocument();

    fireEvent.click(filtersButton);

    // Filter panel should show department dropdown
    expect(screen.getByText('All Departments')).toBeInTheDocument();
  });

  it('can filter by department using the dropdown in the filter panel', () => {
    renderPeopleList();

    // Open filters panel
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    // Select "Sales" department
    const departmentSelect = screen.getByDisplayValue('All Departments');
    fireEvent.change(departmentSelect, { target: { value: 'Sales' } });

    const table = screen.getByRole('table');
    expect(within(table).getByText('bob@co.com')).toBeInTheDocument();
    expect(within(table).queryByText('alice@co.com')).not.toBeInTheDocument();
  });

  // ── Additional tests: Empty state ─────────────────────────────────────

  it('shows empty state when store has no people', () => {
    useStore.setState({ people: [] });
    renderPeopleList();

    expect(screen.getByText('No people found')).toBeInTheDocument();
  });

  // ── Additional tests: IT Cost display ─────────────────────────────────

  it('displays per-person IT costs in the table', () => {
    renderPeopleList();

    expect(screen.getByText('$2,000')).toBeInTheDocument();
    expect(screen.getByText('$4,500')).toBeInTheDocument();
  });

  it('shows average IT cost per person in the stat card', () => {
    renderPeopleList();

    // avg = 6500 / 3 = 2167 rounded
    expect(screen.getByText(/\$2,167 avg\/person/)).toBeInTheDocument();
  });
});
