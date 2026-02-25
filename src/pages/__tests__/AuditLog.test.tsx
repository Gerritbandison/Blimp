import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuditLog } from '../AuditLog';
import { useStore } from '../../store/useStore';

const exportToCSVMock = vi.fn();
vi.mock('../../utils/csvExport', () => ({
  exportToCSV: (...args: unknown[]) => exportToCSVMock(...args),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderAuditLog() {
  return render(
    <BrowserRouter>
      <AuditLog />
    </BrowserRouter>
  );
}

const mockActivity = [
  {
    id: 'act1',
    timestamp: new Date().toISOString(),
    action: 'Asset Created',
    user: 'Admin',
    details: 'Laptop added to inventory',
    module: 'Assets',
    entityId: 'a1',
    entityName: 'Dell XPS 15',
  },
  {
    id: 'act2',
    timestamp: new Date().toISOString(),
    action: 'Person Onboarded',
    user: 'HR Manager',
    details: 'New hire started',
    module: 'People',
    entityId: 'p1',
    entityName: 'Alice Johnson',
  },
  {
    id: 'act3',
    timestamp: new Date(Date.now() - 40 * 86400000).toISOString(),
    action: 'App License Added',
    user: 'Admin',
    details: 'Slack license purchased',
    module: 'Apps',
    entityId: 'app1',
    entityName: 'Slack',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({
    activityLog: mockActivity,
    toasts: [],
  });
});

describe('AuditLog', () => {
  // ── 1. Renders page heading ─────────────────────────────────────────────

  it('renders the Audit Log heading', () => {
    renderAuditLog();
    expect(screen.getByRole('heading', { name: /audit log/i })).toBeInTheDocument();
  });

  it('shows total entry count in subtitle', () => {
    renderAuditLog();
    expect(screen.getByText(/3 total entries/)).toBeInTheDocument();
  });

  // ── 2. Shows log entries ────────────────────────────────────────────────

  it('renders all activity log entries', () => {
    renderAuditLog();
    expect(screen.getByText('Asset Created')).toBeInTheDocument();
    expect(screen.getByText('Person Onboarded')).toBeInTheDocument();
    expect(screen.getByText('App License Added')).toBeInTheDocument();
  });

  it('shows entry details', () => {
    renderAuditLog();
    expect(screen.getByText('Laptop added to inventory')).toBeInTheDocument();
    expect(screen.getByText('New hire started')).toBeInTheDocument();
  });

  it('shows user names', () => {
    renderAuditLog();
    expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('HR Manager')).toBeInTheDocument();
  });

  it('shows module badges', () => {
    renderAuditLog();
    expect(screen.getAllByText('Assets').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('People').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Apps').length).toBeGreaterThanOrEqual(1);
  });

  it('shows entity names', () => {
    renderAuditLog();
    expect(screen.getByText('Dell XPS 15')).toBeInTheDocument();
    expect(screen.getByText('Slack')).toBeInTheDocument();
  });

  // ── 3. Search functionality ─────────────────────────────────────────────

  it('has a search input', () => {
    renderAuditLog();
    expect(screen.getByPlaceholderText(/search actions/i)).toBeInTheDocument();
  });

  it('filters entries when searching by action', () => {
    renderAuditLog();
    const searchInput = screen.getByPlaceholderText(/search actions/i);
    fireEvent.change(searchInput, { target: { value: 'Asset Created' } });

    expect(screen.getByText('Asset Created')).toBeInTheDocument();
    expect(screen.queryByText('Person Onboarded')).not.toBeInTheDocument();
    expect(screen.queryByText('App License Added')).not.toBeInTheDocument();
  });

  it('filters entries when searching by user', () => {
    renderAuditLog();
    const searchInput = screen.getByPlaceholderText(/search actions/i);
    fireEvent.change(searchInput, { target: { value: 'HR Manager' } });

    expect(screen.getByText('Person Onboarded')).toBeInTheDocument();
    expect(screen.queryByText('Asset Created')).not.toBeInTheDocument();
  });

  it('filters entries when searching by entity name', () => {
    renderAuditLog();
    const searchInput = screen.getByPlaceholderText(/search actions/i);
    fireEvent.change(searchInput, { target: { value: 'Slack' } });

    expect(screen.getByText('App License Added')).toBeInTheDocument();
    expect(screen.queryByText('Asset Created')).not.toBeInTheDocument();
  });

  it('shows empty state when search has no matches', () => {
    renderAuditLog();
    const searchInput = screen.getByPlaceholderText(/search actions/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent-xyz' } });

    expect(screen.getByText('No audit entries found')).toBeInTheDocument();
  });

  // ── 4. Date range filter pills ──────────────────────────────────────────

  it('renders date range filter pills', () => {
    renderAuditLog();
    expect(screen.getByText('All time')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Last 90 days')).toBeInTheDocument();
  });

  it('filters by date range when pill is clicked', () => {
    renderAuditLog();
    // "Last 7 days" should hide the 40-day-old entry
    fireEvent.click(screen.getByText('Last 7 days'));

    expect(screen.getByText('Asset Created')).toBeInTheDocument();
    expect(screen.getByText('Person Onboarded')).toBeInTheDocument();
    expect(screen.queryByText('App License Added')).not.toBeInTheDocument();
  });

  it('shows all entries again when "All time" is clicked', () => {
    renderAuditLog();
    fireEvent.click(screen.getByText('Last 7 days'));
    fireEvent.click(screen.getByText('All time'));

    expect(screen.getByText('Asset Created')).toBeInTheDocument();
    expect(screen.getByText('App License Added')).toBeInTheDocument();
  });

  // ── 5. Filters panel ───────────────────────────────────────────────────

  it('toggles filter panel when Filters button is clicked', () => {
    renderAuditLog();
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filtersButton);

    expect(screen.getByText('All Modules')).toBeInTheDocument();
    expect(screen.getByText('All Users')).toBeInTheDocument();
  });

  it('filters by module using dropdown', () => {
    renderAuditLog();
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    const moduleSelect = screen.getByDisplayValue('All Modules');
    fireEvent.change(moduleSelect, { target: { value: 'Assets' } });

    expect(screen.getByText('Asset Created')).toBeInTheDocument();
    expect(screen.queryByText('Person Onboarded')).not.toBeInTheDocument();
  });

  it('filters by user using dropdown', () => {
    renderAuditLog();
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    const userSelect = screen.getByDisplayValue('All Users');
    fireEvent.change(userSelect, { target: { value: 'HR Manager' } });

    expect(screen.getByText('Person Onboarded')).toBeInTheDocument();
    expect(screen.queryByText('Asset Created')).not.toBeInTheDocument();
  });

  // ── 6. Export button ────────────────────────────────────────────────────

  it('renders Export button', () => {
    renderAuditLog();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('calls exportToCSV when Export is clicked', () => {
    renderAuditLog();
    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    expect(exportToCSVMock).toHaveBeenCalledTimes(1);
    const firstArg = exportToCSVMock.mock.calls[0][0] as unknown[];
    expect(firstArg).toHaveLength(3);
    expect(exportToCSVMock.mock.calls[0][2]).toBe('audit-log');
  });

  it('adds toast after export', () => {
    renderAuditLog();
    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    const storeState = useStore.getState();
    expect(storeState.toasts.length).toBeGreaterThanOrEqual(1);
    expect(storeState.toasts[storeState.toasts.length - 1].message).toContain('Exported');
  });

  // ── 7. Entry count display ──────────────────────────────────────────────

  it('shows filtered entry count', () => {
    renderAuditLog();
    expect(screen.getByText('3 entries')).toBeInTheDocument();
  });

  // ── 8. Clickable entries navigate ───────────────────────────────────────

  it('navigates when an entry with entityId is clicked', () => {
    renderAuditLog();
    // Click the first entry (Asset Created with entityId 'a1')
    fireEvent.click(screen.getByText('Asset Created'));
    expect(mockNavigate).toHaveBeenCalledWith('/assets/a1');
  });

  // ── 9. Empty state ─────────────────────────────────────────────────────

  it('shows empty state when no activity log entries exist', () => {
    useStore.setState({ activityLog: [] });
    renderAuditLog();
    expect(screen.getByText('No audit entries found')).toBeInTheDocument();
  });
});
