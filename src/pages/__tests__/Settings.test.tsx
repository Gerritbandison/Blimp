import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Settings } from '../Settings';

// ─── Render helper ──────────────────────────────────────────────────────────

function renderSettings() {
  return render(
    <BrowserRouter>
      <Settings />
    </BrowserRouter>
  );
}

/**
 * Helper: click a settings nav item by label text to switch sections.
 */
function clickNavItem(label: string) {
  const navButtons = screen.getAllByRole('button');
  const navButton = navButtons.find((btn) => btn.textContent?.trim() === label);
  if (!navButton) throw new Error(`Settings nav item "${label}" not found`);
  fireEvent.click(navButton);
}

// ─── Setup / Teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  useStore.setState({
    people: [],
    assets: [],
    apps: [],
    currentUserRole: 'Admin',
    currentUserName: 'Admin User',
    toasts: [],
    activityLog: [],
    notifications: [],
    orgUsers: [
      { id: 'u1', name: 'Admin User', email: 'admin@blimp.io', role: 'Admin', status: 'Active' },
      { id: 'u2', name: 'Finance User', email: 'finance@blimp.io', role: 'Finance', status: 'Active' },
      { id: 'u3', name: 'IT Manager', email: 'itm@blimp.io', role: 'IT Manager', status: 'Active' },
    ],
    customFields: [],
    companySettings: {
      name: 'Test Co',
      domain: 'test.co',
      currency: 'USD',
      fiscalYearStart: 'January',
      timezone: 'America/New_York',
      plan: 'Business',
    },
    notificationSettings: {
      renewalReminder: true,
      renewalDays: 30,
      warrantyExpiry: true,
      warrantyDays: 60,
      lowStock: true,
      onboarding: true,
      offboarding: true,
      shadowIt: true,
    },
    theme: 'light',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Settings page', () => {

  // ── 1. Renders settings page with section tabs ────────────────────────

  it('renders the settings sidebar with navigation items', () => {
    renderSettings();

    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Custom Fields')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('API Access')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
  });

  it('renders the "Settings" label in the sidebar', () => {
    renderSettings();

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows Company section by default', () => {
    renderSettings();

    expect(screen.getByText('Company Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure your organization details')).toBeInTheDocument();
  });

  it('renders the Asset Statuses nav item', () => {
    renderSettings();

    expect(screen.getByText('Asset Statuses')).toBeInTheDocument();
  });

  // ── 2. Company settings section shows and edits company name ──────────

  it('displays the company name in the input field', () => {
    renderSettings();

    const nameInput = screen.getByDisplayValue('Test Co');
    expect(nameInput).toBeInTheDocument();
  });

  it('displays the company domain in the input field', () => {
    renderSettings();

    const domainInput = screen.getByDisplayValue('test.co');
    expect(domainInput).toBeInTheDocument();
  });

  it('displays the currency selector with correct value', () => {
    renderSettings();

    const currencySelect = screen.getByDisplayValue('USD');
    expect(currencySelect).toBeInTheDocument();
  });

  it('displays the timezone selector with correct value', () => {
    renderSettings();

    const timezoneSelect = screen.getByDisplayValue('America/New_York');
    expect(timezoneSelect).toBeInTheDocument();
  });

  it('displays the fiscal year start selector', () => {
    renderSettings();

    const fiscalSelect = screen.getByDisplayValue('January');
    expect(fiscalSelect).toBeInTheDocument();
  });

  it('updates company name when changed', async () => {
    const user = userEvent.setup();
    renderSettings();

    const nameInput = screen.getByDisplayValue('Test Co');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Company');

    const storeState = useStore.getState();
    expect(storeState.companySettings.name).toBe('New Company');
  });

  it('updates company domain when changed', async () => {
    const user = userEvent.setup();
    renderSettings();

    const domainInput = screen.getByDisplayValue('test.co');
    await user.clear(domainInput);
    await user.type(domainInput, 'newdomain.com');

    const storeState = useStore.getState();
    expect(storeState.companySettings.domain).toBe('newdomain.com');
  });

  it('shows "Save Changes" button in company section', () => {
    renderSettings();

    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('adds a toast when "Save Changes" is clicked in company section', () => {
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    const storeState = useStore.getState();
    const lastToast = storeState.toasts[storeState.toasts.length - 1];
    expect(lastToast.type).toBe('success');
    expect(lastToast.message).toContain('Company settings saved');
  });

  it('displays all company settings labels', () => {
    renderSettings();

    expect(screen.getByText('Company Name')).toBeInTheDocument();
    expect(screen.getByText('Domain')).toBeInTheDocument();
    expect(screen.getByText('Default Currency')).toBeInTheDocument();
    expect(screen.getByText('Fiscal Year Start')).toBeInTheDocument();
    expect(screen.getByText('Timezone')).toBeInTheDocument();
  });

  // ── 3. Users section shows org users ──────────────────────────────────

  it('displays user management section when nav item is clicked', () => {
    renderSettings();

    clickNavItem('User Management');

    expect(screen.getAllByText('User Management').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/3 members/)).toBeInTheDocument();
  });

  it('shows org users in the team members list', () => {
    renderSettings();

    clickNavItem('User Management');

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin@blimp.io')).toBeInTheDocument();
    expect(screen.getByText('Finance User')).toBeInTheDocument();
    expect(screen.getByText('finance@blimp.io')).toBeInTheDocument();
    expect(screen.getAllByText('IT Manager').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('itm@blimp.io')).toBeInTheDocument();
  });

  it('shows role dropdown for each user', () => {
    renderSettings();

    clickNavItem('User Management');

    // Each user has a role dropdown. There are 3 users, plus the "Your Current Role" dropdown
    const selects = screen.getAllByRole('combobox');
    // At least 3 user role dropdowns + 1 current role dropdown = 4
    expect(selects.length).toBeGreaterThanOrEqual(4);
  });

  it('shows role cards with descriptions', () => {
    renderSettings();

    clickNavItem('User Management');

    expect(screen.getAllByText('Full access to all modules, settings, and billing').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Read-only access to all modules').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Team Members heading', () => {
    renderSettings();

    clickNavItem('User Management');

    expect(screen.getByText('Team Members')).toBeInTheDocument();
  });

  it('updates user role when dropdown is changed', () => {
    renderSettings();

    clickNavItem('User Management');

    // Find the role dropdown for Finance User (value should be 'Finance')
    const selects = screen.getAllByDisplayValue('Finance');
    expect(selects.length).toBeGreaterThanOrEqual(1);

    // Change the role to 'Read Only'
    fireEvent.change(selects[0], { target: { value: 'Read Only' } });

    const storeState = useStore.getState();
    const financeUser = storeState.orgUsers.find(u => u.id === 'u2');
    expect(financeUser?.role).toBe('Read Only');
  });

  it('shows current role switcher with description', () => {
    renderSettings();

    clickNavItem('User Management');

    expect(screen.getByText('Your Current Role')).toBeInTheDocument();
    expect(screen.getByText(/Switch roles to preview/)).toBeInTheDocument();
  });

  // ── 4. Invite User button opens modal ─────────────────────────────────

  it('shows "Invite User" button in user management section', () => {
    renderSettings();

    clickNavItem('User Management');

    expect(screen.getByRole('button', { name: /invite user/i })).toBeInTheDocument();
  });

  it('opens invite user modal when "Invite User" is clicked', () => {
    renderSettings();

    clickNavItem('User Management');
    fireEvent.click(screen.getByRole('button', { name: /invite user/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Invite Team Member')).toBeInTheDocument();
  });

  it('shows email and role fields in the invite modal', () => {
    renderSettings();

    clickNavItem('User Management');
    fireEvent.click(screen.getByRole('button', { name: /invite user/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Email Address')).toBeInTheDocument();
    expect(within(dialog).getByText('Role')).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('colleague@company.com')).toBeInTheDocument();
  });

  it('shows "Send Invite" button in the invite modal', () => {
    renderSettings();

    clickNavItem('User Management');
    fireEvent.click(screen.getByRole('button', { name: /invite user/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /send invite/i })).toBeInTheDocument();
  });

  it('closes the invite modal when "Cancel" is clicked', () => {
    renderSettings();

    clickNavItem('User Management');
    fireEvent.click(screen.getByRole('button', { name: /invite user/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('adds a toast when invite is submitted with email', async () => {
    const user = userEvent.setup();
    renderSettings();

    clickNavItem('User Management');
    fireEvent.click(screen.getByRole('button', { name: /invite user/i }));

    const dialog = screen.getByRole('dialog');
    const emailInput = within(dialog).getByPlaceholderText('colleague@company.com');
    await user.type(emailInput, 'newuser@company.com');

    fireEvent.click(within(dialog).getByRole('button', { name: /send invite/i }));

    const storeState = useStore.getState();
    const lastToast = storeState.toasts[storeState.toasts.length - 1];
    expect(lastToast.type).toBe('success');
    expect(lastToast.message).toContain('newuser@company.com');
  });

  it('shows role description in the invite modal', () => {
    renderSettings();

    clickNavItem('User Management');
    fireEvent.click(screen.getByRole('button', { name: /invite user/i }));

    const dialog = screen.getByRole('dialog');
    // Default role is 'Read Only', so its description should be shown
    expect(within(dialog).getByText('Read-only access to all modules')).toBeInTheDocument();
  });

  // ── 5. Custom Fields section shows and adds fields ────────────────────

  it('displays custom fields section when nav item is clicked', () => {
    renderSettings();

    clickNavItem('Custom Fields');

    expect(screen.getAllByText('Custom Fields').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Add custom data fields to assets, apps, and people')).toBeInTheDocument();
  });

  it('shows built-in fields in the custom fields section', () => {
    renderSettings();

    clickNavItem('Custom Fields');

    // Built-in asset fields
    expect(screen.getByText('Department')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Purchase Order')).toBeInTheDocument();

    // Built-in app fields
    expect(screen.getByText('Vendor Contact')).toBeInTheDocument();

    // Built-in people fields
    expect(screen.getByText('Phone')).toBeInTheDocument();
  });

  it('shows "Built-in" badges for built-in fields', () => {
    renderSettings();

    clickNavItem('Custom Fields');

    const builtInBadges = screen.getAllByText('Built-in');
    expect(builtInBadges.length).toBeGreaterThanOrEqual(5);
  });

  it('shows module sections (Assets, Apps, People)', () => {
    renderSettings();

    clickNavItem('Custom Fields');

    expect(screen.getByText('Assets Fields')).toBeInTheDocument();
    expect(screen.getByText('Apps Fields')).toBeInTheDocument();
    expect(screen.getByText('People Fields')).toBeInTheDocument();
  });

  it('shows "Add Field" button', () => {
    renderSettings();

    clickNavItem('Custom Fields');

    expect(screen.getByRole('button', { name: /add field/i })).toBeInTheDocument();
  });

  it('opens add field modal when "Add Field" button is clicked', () => {
    renderSettings();

    clickNavItem('Custom Fields');
    fireEvent.click(screen.getByRole('button', { name: /add field/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add Custom Field')).toBeInTheDocument();
  });

  it('shows field name, type, module, and required inputs in the add field modal', () => {
    renderSettings();

    clickNavItem('Custom Fields');
    fireEvent.click(screen.getByRole('button', { name: /add field/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Field Name')).toBeInTheDocument();
    expect(within(dialog).getByText('Type')).toBeInTheDocument();
    expect(within(dialog).getByText('Module')).toBeInTheDocument();
    expect(within(dialog).getByText('Required field')).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('e.g. Asset Color')).toBeInTheDocument();
  });

  it('adds a custom field when form is submitted', async () => {
    const user = userEvent.setup();
    renderSettings();

    clickNavItem('Custom Fields');
    fireEvent.click(screen.getByRole('button', { name: /add field/i }));

    const dialog = screen.getByRole('dialog');
    const nameInput = within(dialog).getByPlaceholderText('e.g. Asset Color');
    await user.type(nameInput, 'Serial Tag');

    fireEvent.click(within(dialog).getByRole('button', { name: /create field/i }));

    // Modal should close
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Field should appear in the list
    const storeState = useStore.getState();
    expect(storeState.customFields).toHaveLength(1);
    expect(storeState.customFields[0].name).toBe('Serial Tag');
  });

  it('shows the newly added custom field with "Custom" badge', async () => {
    const user = userEvent.setup();
    renderSettings();

    clickNavItem('Custom Fields');
    fireEvent.click(screen.getByRole('button', { name: /add field/i }));

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('e.g. Asset Color'), 'My Custom Field');

    fireEvent.click(within(dialog).getByRole('button', { name: /create field/i }));

    expect(screen.getByText('My Custom Field')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('adds a toast when a custom field is created', async () => {
    const user = userEvent.setup();
    renderSettings();

    clickNavItem('Custom Fields');
    fireEvent.click(screen.getByRole('button', { name: /add field/i }));

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('e.g. Asset Color'), 'Test Field');

    fireEvent.click(within(dialog).getByRole('button', { name: /create field/i }));

    const storeState = useStore.getState();
    const lastToast = storeState.toasts[storeState.toasts.length - 1];
    expect(lastToast.type).toBe('success');
    expect(lastToast.message).toContain('Test Field');
    expect(lastToast.message).toContain('created');
  });

  it('does not add field when name is empty', () => {
    renderSettings();

    clickNavItem('Custom Fields');
    fireEvent.click(screen.getByRole('button', { name: /add field/i }));

    const dialog = screen.getByRole('dialog');
    // Submit without entering a name
    fireEvent.click(within(dialog).getByRole('button', { name: /create field/i }));

    const storeState = useStore.getState();
    expect(storeState.customFields).toHaveLength(0);
  });

  it('shows "Add custom field" placeholder links for each module', () => {
    renderSettings();

    clickNavItem('Custom Fields');

    expect(screen.getByText('Add custom field to Assets')).toBeInTheDocument();
    expect(screen.getByText('Add custom field to Apps')).toBeInTheDocument();
    expect(screen.getByText('Add custom field to People')).toBeInTheDocument();
  });

  // ── 6. Notification toggles render and can be toggled ─────────────────

  it('displays notification settings section when nav item is clicked', () => {
    renderSettings();

    clickNavItem('Notifications');

    expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure when and how you receive alerts')).toBeInTheDocument();
  });

  it('shows all notification toggle labels', () => {
    renderSettings();

    clickNavItem('Notifications');

    expect(screen.getByText('License Renewal Reminders')).toBeInTheDocument();
    expect(screen.getByText('Warranty Expiry Alerts')).toBeInTheDocument();
    expect(screen.getByText('Low Stock Alerts')).toBeInTheDocument();
    expect(screen.getByText('Onboarding Tasks')).toBeInTheDocument();
    expect(screen.getByText('Offboarding Tasks')).toBeInTheDocument();
    expect(screen.getByText('Shadow IT Detection')).toBeInTheDocument();
  });

  it('shows notification descriptions', () => {
    renderSettings();

    clickNavItem('Notifications');

    expect(screen.getByText('Get notified before license renewals')).toBeInTheDocument();
    expect(screen.getByText('Get notified before warranty expiration')).toBeInTheDocument();
    expect(screen.getByText('Alert when asset stock drops below threshold')).toBeInTheDocument();
    expect(screen.getByText('Reminders for pending onboarding steps')).toBeInTheDocument();
    expect(screen.getByText('Reminders for pending offboarding steps')).toBeInTheDocument();
    expect(screen.getByText('Alert when new unregistered apps are detected')).toBeInTheDocument();
  });

  it('renders toggle buttons for each notification setting', () => {
    renderSettings();

    clickNavItem('Notifications');

    // Toggle buttons are rendered as <button> with role not explicitly set
    // They have bg-blue-600 or bg-gray-200 class for on/off
    // All 6 notification settings are initially enabled (bg-blue-600)
    const toggleButtons = screen.getAllByRole('button').filter(
      (btn) => btn.className.includes('rounded-full') && (btn.className.includes('bg-blue-600') || btn.className.includes('bg-gray-200'))
    );
    expect(toggleButtons.length).toBe(6);
  });

  it('toggles a notification setting when clicked', () => {
    renderSettings();

    clickNavItem('Notifications');

    // Find the toggle for "Low Stock Alerts" — all toggles start as blue-600 (enabled)
    // We toggle lowStock off
    const toggleButtons = screen.getAllByRole('button').filter(
      (btn) => btn.className.includes('rounded-full') && btn.className.includes('bg-blue-600') && btn.className.includes('w-10')
    );
    expect(toggleButtons.length).toBeGreaterThanOrEqual(1);

    // Click the third toggle (lowStock is the 3rd notification setting)
    fireEvent.click(toggleButtons[2]);

    const storeState = useStore.getState();
    expect(storeState.notificationSettings.lowStock).toBe(false);
  });

  it('toggles renewalReminder off and back on', () => {
    renderSettings();

    clickNavItem('Notifications');

    const toggleButtons = screen.getAllByRole('button').filter(
      (btn) => btn.className.includes('rounded-full') && btn.className.includes('bg-blue-600') && btn.className.includes('w-10')
    );

    // Click first toggle (renewalReminder) to disable
    fireEvent.click(toggleButtons[0]);
    expect(useStore.getState().notificationSettings.renewalReminder).toBe(false);

    // Now find the gray (disabled) toggle and click it back
    const disabledToggle = screen.getAllByRole('button').filter(
      (btn) => btn.className.includes('rounded-full') && btn.className.includes('bg-gray-200') && btn.className.includes('w-10')
    );
    expect(disabledToggle.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(disabledToggle[0]);

    expect(useStore.getState().notificationSettings.renewalReminder).toBe(true);
  });

  it('shows "Save Preferences" button in notification section', () => {
    renderSettings();

    clickNavItem('Notifications');

    expect(screen.getByRole('button', { name: /save preferences/i })).toBeInTheDocument();
  });

  it('adds a toast when "Save Preferences" is clicked', () => {
    renderSettings();

    clickNavItem('Notifications');
    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    const storeState = useStore.getState();
    const lastToast = storeState.toasts[storeState.toasts.length - 1];
    expect(lastToast.type).toBe('success');
    expect(lastToast.message).toContain('Notification preferences saved');
  });

  it('shows "days before" inputs for renewal and warranty settings', () => {
    renderSettings();

    clickNavItem('Notifications');

    // renewalDays = 30, warrantyDays = 60
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    expect(screen.getByDisplayValue('60')).toBeInTheDocument();
    // "days before" text should appear twice
    const daysBefore = screen.getAllByText('days before');
    expect(daysBefore.length).toBe(2);
  });

  // ── 7. Appearance section shows theme options ─────────────────────────

  it('displays appearance section when nav item is clicked', () => {
    renderSettings();

    clickNavItem('Appearance');

    expect(screen.getAllByText('Appearance').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Customize the look and feel of your workspace')).toBeInTheDocument();
  });

  it('shows theme heading', () => {
    renderSettings();

    clickNavItem('Appearance');

    expect(screen.getByText('Theme')).toBeInTheDocument();
  });

  it('shows all three theme options', () => {
    renderSettings();

    clickNavItem('Appearance');

    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('shows theme descriptions', () => {
    renderSettings();

    clickNavItem('Appearance');

    expect(screen.getByText('Clean light interface')).toBeInTheDocument();
    expect(screen.getByText('Easy on the eyes')).toBeInTheDocument();
    expect(screen.getByText('Follow OS setting')).toBeInTheDocument();
  });

  it('highlights the current theme (light by default)', () => {
    renderSettings();

    clickNavItem('Appearance');

    // The Light button should have border-blue-500 to indicate it is active
    const lightButton = screen.getByText('Light').closest('button');
    expect(lightButton?.className).toContain('border-blue-500');
  });

  it('changes theme to dark when Dark option is clicked', () => {
    renderSettings();

    clickNavItem('Appearance');

    const darkButton = screen.getByText('Dark').closest('button');
    expect(darkButton).toBeTruthy();
    fireEvent.click(darkButton!);

    const storeState = useStore.getState();
    expect(storeState.theme).toBe('dark');
  });

  it('changes theme to system when System option is clicked', () => {
    renderSettings();

    clickNavItem('Appearance');

    const systemButton = screen.getByText('System').closest('button');
    expect(systemButton).toBeTruthy();
    fireEvent.click(systemButton!);

    const storeState = useStore.getState();
    expect(storeState.theme).toBe('system');
  });

  it('adds a toast when theme is changed', () => {
    renderSettings();

    clickNavItem('Appearance');

    const darkButton = screen.getByText('Dark').closest('button');
    fireEvent.click(darkButton!);

    const storeState = useStore.getState();
    const lastToast = storeState.toasts[storeState.toasts.length - 1];
    expect(lastToast.type).toBe('success');
    expect(lastToast.message).toContain('Dark');
  });

  it('highlights dark theme button after switching to dark', () => {
    renderSettings();

    clickNavItem('Appearance');

    const darkButton = screen.getByText('Dark').closest('button');
    fireEvent.click(darkButton!);

    expect(darkButton?.className).toContain('border-blue-500');
    // Light should no longer be active
    const lightButton = screen.getByText('Light').closest('button');
    expect(lightButton?.className).not.toContain('border-blue-500');
  });

  it('shows keyboard shortcuts section in appearance', () => {
    renderSettings();

    clickNavItem('Appearance');

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Open global search')).toBeInTheDocument();
    expect(screen.getByText('Close modals and dropdowns')).toBeInTheDocument();
  });

  // ── Additional tests: Section navigation ──────────────────────────────

  it('switches between sections when nav items are clicked', () => {
    renderSettings();

    // Start on Company
    expect(screen.getByText('Company Settings')).toBeInTheDocument();

    // Switch to Billing
    clickNavItem('Billing');
    expect(screen.getAllByText('Billing').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Business')).toBeInTheDocument();
    expect(screen.getAllByText('$299').length).toBeGreaterThanOrEqual(1);

    // Switch to API Access
    clickNavItem('API Access');
    expect(screen.getAllByText('API Access').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('API Keys')).toBeInTheDocument();
  });

  it('shows billing plan details in billing section', () => {
    renderSettings();

    clickNavItem('Billing');

    expect(screen.getByText('Current Plan')).toBeInTheDocument();
    expect(screen.getByText('Business')).toBeInTheDocument();
    expect(screen.getAllByText('$299').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/per month/i)).toBeInTheDocument();
  });

  it('shows usage meters in billing section', () => {
    renderSettings();

    clickNavItem('Billing');

    expect(screen.getByText('Usage')).toBeInTheDocument();
    expect(screen.getByText('100 / 500')).toBeInTheDocument();
    expect(screen.getByText('6 / 50')).toBeInTheDocument();
  });

  it('shows API section with Generate Key button', () => {
    renderSettings();

    clickNavItem('API Access');

    expect(screen.getByText('API Keys')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate key/i })).toBeInTheDocument();
  });

  it('shows empty API key state initially', () => {
    renderSettings();

    clickNavItem('API Access');

    expect(screen.getByText('No API key generated yet')).toBeInTheDocument();
  });

  it('shows asset statuses section with default statuses', () => {
    renderSettings();

    clickNavItem('Asset Statuses');

    expect(screen.getAllByText('Asset Statuses').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Deployed')).toBeInTheDocument();
    expect(screen.getByText('In Stock')).toBeInTheDocument();
    expect(screen.getByText('In Repair')).toBeInTheDocument();
    expect(screen.getByText('Retired')).toBeInTheDocument();
    expect(screen.getByText('Lost')).toBeInTheDocument();
  });

  it('shows Agent section with configuration options', () => {
    renderSettings();

    clickNavItem('Agent');

    expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
    expect(screen.getByText('Data Collection')).toBeInTheDocument();
    expect(screen.getByText('Push Schedule')).toBeInTheDocument();
    expect(screen.getByText('Data Retention')).toBeInTheDocument();
    expect(screen.getByText('Deployment')).toBeInTheDocument();
  });

  it('shows agent data collection toggles', () => {
    renderSettings();

    clickNavItem('Agent');

    expect(screen.getByText('Peripheral Detection')).toBeInTheDocument();
    expect(screen.getByText('EDID Display Detection')).toBeInTheDocument();
    expect(screen.getByText('Network Information')).toBeInTheDocument();
  });
});
