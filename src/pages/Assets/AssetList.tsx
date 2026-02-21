import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Download, Filter, Search, Trash2, Archive,
  Monitor, SlidersHorizontal
} from 'lucide-react';
import { DataTable, type Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useStore } from '../../store/useStore';
import { EmptyState } from '../../components/common/EmptyState';
import { exportToCSV } from '../../utils/csvExport';
import type { Asset, AssetStatus, AssetType } from '../../types';
import { clsx } from 'clsx';
import { format } from 'date-fns';

const ALL_COLUMNS: Column<Asset>[] = [
  { key: 'tag', label: 'Asset Tag', sortable: true },
  { key: 'name', label: 'Name', sortable: true, render: (r) => (
    <div>
      <p className="font-medium text-gray-900">{r.name}</p>
      <p className="text-xs text-gray-400">{r.make} {r.model}</p>
    </div>
  )},
  { key: 'type', label: 'Type', sortable: true },
  { key: 'serial', label: 'Serial #', sortable: true },
  { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
  { key: 'assignedTo', label: 'Assigned To', sortable: true, render: (r) => r.assignedTo ? (
    <span className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-medium flex-shrink-0">
        {r.assignedTo.split(' ').map(n => n[0]).join('')}
      </div>
      <span className="text-sm">{r.assignedTo}</span>
    </span>
  ) : <span className="text-gray-400 text-sm">Unassigned</span> },
  { key: 'location', label: 'Location', sortable: true },
  { key: 'purchaseDate', label: 'Purchase Date', sortable: true, render: (r) => (
    <span className="text-sm">{format(new Date(r.purchaseDate), 'MMM d, yyyy')}</span>
  )},
  { key: 'warrantyExpiry', label: 'Warranty Expiry', sortable: true, render: (r) => {
    const days = Math.ceil((new Date(r.warrantyExpiry).getTime() - Date.now()) / 86400000);
    return (
      <span className={clsx('text-sm', days < 0 ? 'text-red-600' : days < 90 ? 'text-yellow-600' : 'text-gray-700')}>
        {format(new Date(r.warrantyExpiry), 'MMM d, yyyy')}
        {days < 90 && days >= 0 && <span className="text-xs ml-1">({days}d)</span>}
        {days < 0 && <span className="text-xs ml-1">(Expired)</span>}
      </span>
    );
  }},
  { key: 'cost', label: 'Cost', sortable: true, render: (r) => (
    <span className="font-medium">${r.cost.toLocaleString()}</span>
  )},
  { key: 'detectionSource', label: 'Source', sortable: true, render: (r) => (
    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{r.detectionSource || 'Manual'}</span>
  )},
];

const ASSET_STATUSES: AssetStatus[] = ['Deployed', 'In Stock', 'In Repair', 'Retired', 'Lost'];
const ASSET_TYPES: AssetType[] = ['Laptop', 'Monitor', 'Phone', 'Tablet', 'Desktop', 'Server', 'Printer', 'Network', 'Peripheral', 'Other'];

export function AssetList() {
  const navigate = useNavigate();
  const { assets, deleteAsset, updateAsset, addToast } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<AssetType | ''>('');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<string[]>(['serial', 'detectionSource']);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({ status: 'In Stock', type: 'Laptop', currency: 'USD', cost: 0 });

  const locations = [...new Set(assets.map((a) => a.location))];

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (typeFilter && a.type !== typeFilter) return false;
      if (locationFilter && a.location !== locationFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.tag.toLowerCase().includes(q) ||
          a.serial.toLowerCase().includes(q) ||
          a.make.toLowerCase().includes(q) ||
          (a.assignedTo?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [assets, statusFilter, typeFilter, locationFilter, search]);

  const visibleColumns = ALL_COLUMNS.map((c) => ({ ...c, hidden: hiddenCols.includes(String(c.key)) }));

  function handleBulkDelete() {
    selectedIds.forEach((id) => deleteAsset(id));
    setSelectedIds([]);
    addToast({ type: 'success', message: `${selectedIds.length} asset(s) deleted` });
  }

  function handleBulkRetire() {
    selectedIds.forEach((id) => updateAsset(id, { status: 'Retired' }));
    setSelectedIds([]);
    addToast({ type: 'success', message: `${selectedIds.length} asset(s) retired` });
  }

  function handleAddAsset() {
    const errors: Record<string, boolean> = {};
    if (!newAsset.tag?.trim()) errors.tag = true;
    if (!newAsset.name?.trim()) errors.name = true;
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const id = `a${Date.now()}`;
    useStore.getState().addAsset({
      id,
      tag: newAsset.tag!,
      name: newAsset.name!,
      type: newAsset.type as AssetType || 'Laptop',
      make: newAsset.make || '',
      model: newAsset.model || '',
      serial: newAsset.serial || '',
      status: newAsset.status as AssetStatus || 'In Stock',
      location: newAsset.location || 'New York HQ',
      purchaseDate: newAsset.purchaseDate || new Date().toISOString().split('T')[0],
      warrantyExpiry: newAsset.warrantyExpiry || '',
      cost: newAsset.cost || 0,
      currency: 'USD',
      vendor: newAsset.vendor,
      notes: newAsset.notes,
      detectionSource: 'Manual',
    });
    setShowAddModal(false);
    setNewAsset({ status: 'In Stock', type: 'Laptop', currency: 'USD', cost: 0 });
    addToast({ type: 'success', message: `Asset "${newAsset.name}" created successfully` });
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{assets.length} total assets · {assets.filter(a => a.status === 'Deployed').length} deployed</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => {
            exportToCSV(
              filtered as unknown as Record<string, unknown>[],
              [
                { key: 'tag', label: 'Asset Tag' }, { key: 'name', label: 'Name' },
                { key: 'type', label: 'Type' }, { key: 'make', label: 'Make' },
                { key: 'model', label: 'Model' }, { key: 'serial', label: 'Serial' },
                { key: 'status', label: 'Status' }, { key: 'assignedTo', label: 'Assigned To' },
                { key: 'location', label: 'Location' }, { key: 'purchaseDate', label: 'Purchase Date' },
                { key: 'warrantyExpiry', label: 'Warranty Expiry' }, { key: 'cost', label: 'Cost' },
                { key: 'vendor', label: 'Vendor' },
              ],
              'assets'
            );
            addToast({ type: 'success', message: `Exported ${filtered.length} assets to CSV` });
          }}>
            <Download size={15} /> Export
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={15} /> Add Asset
          </button>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['', ...ASSET_STATUSES] as (AssetStatus | '')[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
              statusFilter === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            )}
          >
            {s || 'All'} {s && `(${assets.filter(a => a.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button onClick={() => setShowFilters(!showFilters)} className={clsx('btn-secondary', showFilters && 'bg-blue-50 border-blue-200 text-blue-700')}>
            <Filter size={14} /> Filters
            {(typeFilter || locationFilter) && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-0.5" />}
          </button>

          <button onClick={() => setShowColumnPicker(!showColumnPicker)} className="btn-secondary">
            <SlidersHorizontal size={14} /> Columns
          </button>

          {/* Bulk actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500">{selectedIds.length} selected</span>
              <button className="btn-secondary" onClick={handleBulkRetire}>
                <Archive size={14} /> Retire
              </button>
              <button className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Type:</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AssetType | '')} className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Types</option>
                {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Location:</label>
              <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Locations</option>
                {locations.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {(typeFilter || locationFilter) && (
              <button onClick={() => { setTypeFilter(''); setLocationFilter(''); }} className="text-xs text-blue-600 hover:text-blue-700">
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Column picker dropdown */}
        {showColumnPicker && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <p className="text-xs font-semibold text-gray-500 mb-2">VISIBLE COLUMNS</p>
            <div className="flex flex-wrap gap-2">
              {ALL_COLUMNS.map((col) => (
                <label key={String(col.key)} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!hiddenCols.includes(String(col.key))}
                    onChange={(e) => {
                      setHiddenCols(e.target.checked
                        ? hiddenCols.filter(k => k !== String(col.key))
                        : [...hiddenCols, String(col.key)]
                      );
                    }}
                    className="w-3.5 h-3.5 rounded"
                  />
                  <span className="text-xs text-gray-600">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <DataTable
          data={filtered}
          columns={visibleColumns}
          onRowClick={(row) => navigate(`/assets/${row.id}`)}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyState={
            <EmptyState
              icon={Monitor}
              title="No assets found"
              description={search || statusFilter || typeFilter ? 'Try adjusting your search or filters' : 'Add your first asset to get started'}
              action={!search && !statusFilter && !typeFilter ? { label: '+ Add Asset', onClick: () => setShowAddModal(true) } : undefined}
            />
          }
        />
      </div>

      {/* Add Asset Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Asset"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAddAsset}>Create Asset</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Asset Tag <span className="text-red-500">*</span></label>
            <input className={clsx('input', formErrors.tag && 'border-red-400 ring-1 ring-red-400')} placeholder="AST-XXXX" value={newAsset.tag || ''} onChange={(e) => { setNewAsset(p => ({ ...p, tag: e.target.value })); setFormErrors(f => ({ ...f, tag: false })); }} />
            {formErrors.tag && <p className="text-xs text-red-500 mt-1">Asset tag is required</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Asset Name <span className="text-red-500">*</span></label>
            <input className={clsx('input', formErrors.name && 'border-red-400 ring-1 ring-red-400')} placeholder="e.g. MacBook Pro 14" value={newAsset.name || ''} onChange={(e) => { setNewAsset(p => ({ ...p, name: e.target.value })); setFormErrors(f => ({ ...f, name: false })); }} />
            {formErrors.name && <p className="text-xs text-red-500 mt-1">Asset name is required</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Type</label>
            <select className="select" value={newAsset.type} onChange={(e) => setNewAsset(p => ({ ...p, type: e.target.value as AssetType }))}>
              {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
            <select className="select" value={newAsset.status} onChange={(e) => setNewAsset(p => ({ ...p, status: e.target.value as AssetStatus }))}>
              {ASSET_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Make</label>
            <input className="input" placeholder="Apple, Dell, Lenovo..." value={newAsset.make || ''} onChange={(e) => setNewAsset(p => ({ ...p, make: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Model</label>
            <input className="input" placeholder="Model name" value={newAsset.model || ''} onChange={(e) => setNewAsset(p => ({ ...p, model: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Serial Number</label>
            <input className="input" placeholder="SN-XXXXX" value={newAsset.serial || ''} onChange={(e) => setNewAsset(p => ({ ...p, serial: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Location</label>
            <input className="input" placeholder="Office location" value={newAsset.location || ''} onChange={(e) => setNewAsset(p => ({ ...p, location: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Purchase Date</label>
            <input type="date" className="input" value={newAsset.purchaseDate || ''} onChange={(e) => setNewAsset(p => ({ ...p, purchaseDate: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Warranty Expiry</label>
            <input type="date" className="input" value={newAsset.warrantyExpiry || ''} onChange={(e) => setNewAsset(p => ({ ...p, warrantyExpiry: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Cost (USD)</label>
            <input type="number" className="input" placeholder="0.00" value={newAsset.cost || ''} onChange={(e) => setNewAsset(p => ({ ...p, cost: parseFloat(e.target.value) }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Vendor</label>
            <input className="input" placeholder="Vendor name" value={newAsset.vendor || ''} onChange={(e) => setNewAsset(p => ({ ...p, vendor: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-700 mb-1 block">Notes</label>
            <textarea className="input resize-none" rows={2} placeholder="Additional notes..." value={newAsset.notes || ''} onChange={(e) => setNewAsset(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Assets"
        message={`Are you sure you want to delete ${selectedIds.length} asset${selectedIds.length !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.length} asset${selectedIds.length !== 1 ? 's' : ''}`}
      />
    </div>
  );
}
