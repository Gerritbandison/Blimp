import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Download, Filter, Search, Trash2, Archive,
  Monitor, SlidersHorizontal, Upload, Edit3,
  Laptop, Smartphone, Server, Printer, Network, Package,
  LayoutGrid, List, ChevronDown, ChevronRight, MapPin, User,
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

// ─── Grouped view helpers ─────────────────────────────────────────────────────

type GroupMode = 'category' | 'location';

const TYPE_ORDER: AssetType[] = ['Laptop', 'Desktop', 'Server', 'Phone', 'Tablet', 'Monitor', 'Printer', 'Network', 'Peripheral', 'Other'];
const CATEGORY_ORDER = ['Laptops', 'Monitors', 'Peripherals', 'Printers', 'Docks', 'Desktops', 'Servers', 'Network', 'Other'];
const LOCATION_ORDER = ['New York', 'Kansas City', 'Conshohocken', 'Remote'];

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  Laptop:     { icon: <Laptop size={13} />,     color: 'text-blue-600',   bg: 'bg-blue-50' },
  Desktop:    { icon: <Monitor size={13} />,    color: 'text-violet-600', bg: 'bg-violet-50' },
  Server:     { icon: <Server size={13} />,     color: 'text-slate-600',  bg: 'bg-slate-50' },
  Phone:      { icon: <Smartphone size={13} />, color: 'text-emerald-600',bg: 'bg-emerald-50' },
  Tablet:     { icon: <Smartphone size={13} />, color: 'text-teal-600',   bg: 'bg-teal-50' },
  Monitor:    { icon: <Monitor size={13} />,    color: 'text-indigo-600', bg: 'bg-indigo-50' },
  Printer:    { icon: <Printer size={13} />,    color: 'text-orange-600', bg: 'bg-orange-50' },
  Network:    { icon: <Network size={13} />,    color: 'text-cyan-600',   bg: 'bg-cyan-50' },
  Peripheral: { icon: <Package size={13} />,    color: 'text-amber-600',  bg: 'bg-amber-50' },
  Other:      { icon: <Package size={13} />,    color: 'text-gray-500',   bg: 'bg-gray-50' },
};

interface GroupBlock {
  groupLabel: string;
  /** For location mode: sub-groups by type. For category mode: empty (assets rendered flat). */
  subGroups: { subLabel: string; assets: Asset[] }[];
  /** Only populated for category mode: all assets in this category shown flat. */
  flatAssets: Asset[];
  totalCost: number;
  totalCount: number;
}

function groupAssets(assets: Asset[], mode: GroupMode): GroupBlock[] {
  if (mode === 'category') {
    const byCategory = new Map<string, Asset[]>();
    for (const a of assets) {
      const cat = a.category || a.type || 'Other';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(a);
    }
    return [...byCategory.entries()]
      .sort(([a], [b]) => {
        const ai = CATEGORY_ORDER.indexOf(a);
        const bi = CATEGORY_ORDER.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .map(([cat, catAssets]) => ({
        groupLabel: cat,
        subGroups: [],
        flatAssets: catAssets,
        totalCost: catAssets.reduce((s, a) => s + a.cost, 0),
        totalCount: catAssets.length,
      }));
  }

  // location mode: location → type → assets
  const byLocation = new Map<string, Map<string, Asset[]>>();
  for (const a of assets) {
    const loc = a.location || 'Unknown';
    if (!byLocation.has(loc)) byLocation.set(loc, new Map());
    const byType = byLocation.get(loc)!;
    if (!byType.has(a.type)) byType.set(a.type, []);
    byType.get(a.type)!.push(a);
  }
  return [...byLocation.entries()]
    .sort(([a], [b]) => {
      const ai = LOCATION_ORDER.indexOf(a);
      const bi = LOCATION_ORDER.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    })
    .map(([loc, byType]) => {
      const subGroups = TYPE_ORDER
        .filter((t) => byType.has(t))
        .map((t) => ({ subLabel: t, assets: byType.get(t)! }));
      const allAssets = [...byType.values()].flat();
      return {
        groupLabel: loc,
        subGroups,
        flatAssets: [],
        totalCost: allAssets.reduce((s, a) => s + a.cost, 0),
        totalCount: allAssets.length,
      };
    });
}

function sourceLabel(src?: string): string | null {
  if (!src || src === 'Manual') return null;
  if (src.includes('Intune')) return 'Intune';
  if (src.includes('Ninja')) return 'Ninja';
  if (src.includes('Agent')) return 'Agent';
  return src;
}

function AssetCard({ asset, onClick }: { asset: Asset; onClick: () => void }) {
  const meta = TYPE_META[asset.type] ?? TYPE_META.Other;
  const warrantyDays = Math.ceil((new Date(asset.warrantyExpiry).getTime() - Date.now()) / 86400000);
  const warrantyWarning = asset.warrantyExpiry && warrantyDays < 90;
  const srcLabel = sourceLabel(asset.detectionSource);
  const hasSecurityData = asset.antivirusName || asset.mdmProvider || asset.currentUser;
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-200/60 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-300 transition-all duration-200 cursor-pointer group"
    >
      {/* Top: Icon + Name + Status */}
      <div className="flex items-start gap-3.5">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', meta.bg)}>
          <span className={clsx(meta.color, 'scale-110')}>{meta.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors leading-tight">{asset.name}</p>
          <p className="text-[11px] text-gray-400 truncate mt-0.5">{asset.make} · {asset.model}</p>
        </div>
        <StatusBadge status={asset.status} />
      </div>

      {/* Middle: Key details */}
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2">
        <div className="flex items-center gap-1.5 text-[11px]">
          <User size={10} className="shrink-0 text-gray-300" />
          {asset.assignedTo
            ? <span className="truncate font-medium text-gray-700">{asset.assignedTo}</span>
            : <span className="text-gray-300 italic">Unassigned</span>}
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <MapPin size={10} className="shrink-0 text-gray-300" />
          <span className="truncate text-gray-500">{asset.location}</span>
        </div>
        {asset.os && (
          <div className="col-span-2 text-[10px] text-gray-400 truncate">{asset.os}</div>
        )}
      </div>

      {/* Security indicators for agent-scanned devices */}
      {hasSecurityData && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {asset.antivirusEnabled != null && (
            <span className={clsx(
              'inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
              asset.antivirusEnabled ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
            )}>
              {asset.antivirusEnabled ? 'AV' : 'No AV'}
            </span>
          )}
          {asset.firewallEnabled != null && (
            <span className={clsx(
              'inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
              asset.firewallEnabled ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
            )}>
              {asset.firewallEnabled ? 'FW' : 'No FW'}
            </span>
          )}
          {asset.mdmProvider && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500">
              MDM
            </span>
          )}
          {asset.entraJoined && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500">
              Entra
            </span>
          )}
        </div>
      )}

      {/* Footer: Tag + Source + Cost */}
      <div className="mt-4 pt-3 border-t border-gray-100/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <code className="text-[10px] bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded-md font-mono">{asset.tag}</code>
          {srcLabel && (
            <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wide">
              {srcLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {warrantyWarning && (
            <span className={clsx('text-[10px] font-semibold', warrantyDays < 0 ? 'text-red-500' : 'text-amber-500')}>
              {warrantyDays < 0 ? 'Expired' : `${warrantyDays}d`}
            </span>
          )}
          <span className="text-[12px] font-bold text-gray-800 tabular-nums">
            ${asset.cost.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AssetList() {
  const navigate = useNavigate();
  const { assets, people, deleteAsset, updateAsset, bulkUpdateAssets, importAssets, addToast, currentUserRole } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<AssetType | ''>('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<string[]>(['serial', 'detectionSource']);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({ status: 'In Stock', type: 'Laptop', currency: 'USD', cost: 0 });

  const [searchParams, setSearchParams] = useSearchParams();
  const groupBy: GroupMode = (searchParams.get('group') as GroupMode) ?? 'category';

  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  function setGroupBy(mode: GroupMode) {
    setCollapsedGroups(new Set()); // reset collapse when switching mode
    setSearchParams((prev) => { prev.set('group', mode); return prev; }, { replace: true });
  }

  // Bulk edit state
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkLocation, setBulkLocation] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');

  // CSV import state
  const [showImport, setShowImport] = useState(false);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [importStep, setImportStep] = useState<'upload' | 'map' | 'preview'>('upload');

  const locations = [...new Set(assets.map((a) => a.location))];
  const sources = [...new Set(assets.map((a) => {
    const s = a.detectionSource || 'Manual';
    return s.includes('Agent') ? 'Blimp Agent' : s;
  }))].sort();

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (typeFilter && a.type !== typeFilter) return false;
      if (locationFilter && a.location !== locationFilter) return false;
      if (sourceFilter) {
        const src = a.detectionSource || 'Manual';
        const normalized = src.includes('Agent') ? 'Blimp Agent' : src;
        if (normalized !== sourceFilter) return false;
      }
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
  }, [assets, statusFilter, typeFilter, locationFilter, sourceFilter, search]);

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

  const isReadOnly = currentUserRole === 'Read Only';
  const isFinance = currentUserRole === 'Finance';
  const canEdit = !isReadOnly && !isFinance;

  function handleBulkEdit() {
    const updates: Partial<Asset> = {};
    if (bulkStatus) updates.status = bulkStatus as AssetStatus;
    if (bulkLocation) updates.location = bulkLocation;
    if (bulkAssignee) {
      const person = people.find(p => p.id === bulkAssignee);
      if (person) {
        updates.assignedTo = person.name;
        updates.assignedToId = person.id;
      }
    }
    if (Object.keys(updates).length === 0) return;
    bulkUpdateAssets(selectedIds, updates);
    addToast({ type: 'success', message: `Updated ${selectedIds.length} asset(s)` });
    setSelectedIds([]);
    setShowBulkEdit(false);
    setBulkStatus('');
    setBulkLocation('');
    setBulkAssignee('');
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        addToast({ type: 'error', message: 'CSV must have a header row and at least one data row' });
        return;
      }
      const parseRow = (row: string) => {
        const result: string[] = [];
        let cur = '';
        let inQuote = false;
        for (const ch of row) {
          if (ch === '"') { inQuote = !inQuote; }
          else if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = ''; }
          else { cur += ch; }
        }
        result.push(cur.trim());
        return result;
      };
      const headers = parseRow(lines[0]);
      const rows = lines.slice(1).map(parseRow);
      setCsvHeaders(headers);
      setCsvData(rows);
      // Auto-map columns by name matching
      const fieldMap: Record<string, string> = {
        'asset tag': 'tag', 'tag': 'tag', 'name': 'name', 'asset name': 'name',
        'type': 'type', 'make': 'make', 'manufacturer': 'make', 'brand': 'make',
        'model': 'model', 'serial': 'serial', 'serial number': 'serial', 'serial #': 'serial',
        'status': 'status', 'assigned to': 'assignedTo', 'assignee': 'assignedTo',
        'location': 'location', 'purchase date': 'purchaseDate', 'purchased': 'purchaseDate',
        'warranty expiry': 'warrantyExpiry', 'warranty': 'warrantyExpiry',
        'cost': 'cost', 'price': 'cost', 'vendor': 'vendor', 'supplier': 'vendor',
      };
      const autoMap: Record<string, string> = {};
      headers.forEach((h, i) => {
        const match = fieldMap[h.toLowerCase()];
        if (match) autoMap[String(i)] = match;
      });
      setColumnMap(autoMap);
      setImportStep('map');
    };
    reader.readAsText(file);
  }

  function handleImportConfirm() {
    const imported: Asset[] = csvData.map((row, idx) => {
      const getValue = (field: string) => {
        const colIdx = Object.entries(columnMap).find(([, v]) => v === field)?.[0];
        return colIdx !== undefined ? row[Number(colIdx)] || '' : '';
      };
      return {
        id: `imp${Date.now()}-${idx}`,
        tag: getValue('tag') || `IMP-${String(idx + 1).padStart(4, '0')}`,
        name: getValue('name') || 'Unnamed Asset',
        type: (getValue('type') as AssetType) || 'Other',
        make: getValue('make'),
        model: getValue('model'),
        serial: getValue('serial'),
        status: (getValue('status') as AssetStatus) || 'In Stock',
        assignedTo: getValue('assignedTo') || undefined,
        location: getValue('location') || '',
        purchaseDate: getValue('purchaseDate') || new Date().toISOString().split('T')[0],
        warrantyExpiry: getValue('warrantyExpiry') || '',
        cost: parseFloat(getValue('cost')) || 0,
        currency: 'USD',
        vendor: getValue('vendor') || undefined,
        detectionSource: 'Manual',
      };
    });
    importAssets(imported);
    addToast({ type: 'success', message: `Imported ${imported.length} assets from CSV` });
    setShowImport(false);
    setCsvData([]);
    setCsvHeaders([]);
    setColumnMap({});
    setImportStep('upload');
  }

  const IMPORT_FIELDS = [
    { value: '', label: '— Skip —' },
    { value: 'tag', label: 'Asset Tag' }, { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' }, { value: 'make', label: 'Make' },
    { value: 'model', label: 'Model' }, { value: 'serial', label: 'Serial #' },
    { value: 'status', label: 'Status' }, { value: 'assignedTo', label: 'Assigned To' },
    { value: 'location', label: 'Location' }, { value: 'purchaseDate', label: 'Purchase Date' },
    { value: 'warrantyExpiry', label: 'Warranty Expiry' },
    { value: 'cost', label: 'Cost' }, { value: 'vendor', label: 'Vendor' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Assets</h1>
          <p className="text-[13px] text-gray-500 mt-1">{assets.length} total assets · {assets.filter(a => a.status === 'Deployed').length} deployed</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button className="btn-secondary" onClick={() => setShowImport(true)}>
              <Upload size={15} /> Import
            </button>
          )}
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
          {canEdit && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <Plus size={15} /> Add Asset
            </button>
          )}
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['', ...ASSET_STATUSES] as (AssetStatus | '')[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border',
              statusFilter === s
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200/80 hover:border-gray-300 hover:shadow-sm'
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
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-150"
            />
          </div>

          {/* View mode toggle */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grouped')}
              title="Grouped view"
              className={clsx('px-2.5 py-1.5 flex items-center gap-1 text-xs font-medium transition-colors', viewMode === 'grouped' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50')}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={clsx('px-2.5 py-1.5 flex items-center gap-1 text-xs font-medium transition-colors border-l border-gray-200', viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50')}
            >
              <List size={14} />
            </button>
          </div>

          {/* Group By selector — only shown in grouped view */}
          {viewMode === 'grouped' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-medium">Group by</span>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                {(['category', 'location'] as GroupMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setGroupBy(mode)}
                    className={clsx(
                      'px-2.5 py-1.5 text-xs font-medium capitalize transition-colors',
                      mode !== 'category' && 'border-l border-gray-200',
                      groupBy === mode ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    {mode === 'category' ? 'Category' : 'Location'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => setShowFilters(!showFilters)} className={clsx('btn-secondary', showFilters && 'bg-blue-50 border-blue-200 text-blue-700')}>
            <Filter size={14} /> Filters
            {(typeFilter || locationFilter || sourceFilter) && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-0.5" />}
          </button>

          {viewMode === 'list' && (
            <button onClick={() => setShowColumnPicker(!showColumnPicker)} className="btn-secondary">
              <SlidersHorizontal size={14} /> Columns
            </button>
          )}

          {/* Bulk actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500">{selectedIds.length} selected</span>
              {canEdit && (
                <button className="btn-secondary" onClick={() => setShowBulkEdit(true)}>
                  <Edit3 size={14} /> Bulk Edit
                </button>
              )}
              {canEdit && (
                <button className="btn-secondary" onClick={handleBulkRetire}>
                  <Archive size={14} /> Retire
                </button>
              )}
              {canEdit && (
                <button className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 size={14} /> Delete
                </button>
              )}
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
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Source:</label>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Sources</option>
                {sources.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {(typeFilter || locationFilter || sourceFilter) && (
              <button onClick={() => { setTypeFilter(''); setLocationFilter(''); setSourceFilter(''); }} className="text-xs text-blue-600 hover:text-blue-700">
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

        {/* Table (list mode) */}
        {viewMode === 'list' && (
          <DataTable
            data={filtered}
            columns={visibleColumns}
            onRowClick={(row) => { void navigate(`/assets/${row.id}`); }}
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
        )}
      </div>

      {/* Grouped blocks (grouped mode) */}
      {viewMode === 'grouped' && (() => {
        const groups = groupAssets(filtered, groupBy);
        if (groups.length === 0) {
          return (
            <div className="bg-white rounded-2xl border border-gray-200/60 p-16 text-center">
              <Monitor size={40} className="text-gray-200 mx-auto mb-4" />
              <p className="text-sm font-semibold text-gray-500">No assets found</p>
              <p className="text-xs text-gray-400 mt-1.5">
                {search || statusFilter || typeFilter ? 'Try adjusting your search or filters' : 'Add your first asset to get started'}
              </p>
            </div>
          );
        }
        return (
          <div key={groupBy} className="space-y-6">
            {groups.map(({ groupLabel, subGroups, flatAssets, totalCost, totalCount }) => {
              const isCollapsed = collapsedGroups.has(groupLabel);
              const toggleCollapse = () => setCollapsedGroups((prev) => {
                const next = new Set(prev);
                next.has(groupLabel) ? next.delete(groupLabel) : next.add(groupLabel);
                return next;
              });
              const headerMeta = groupBy === 'location'
                ? { icon: <MapPin size={15} className="text-blue-500" />, bg: 'bg-blue-50' }
                : (() => { const m = TYPE_META[groupLabel] ?? TYPE_META.Other; return { icon: <span className={m.color}>{m.icon}</span>, bg: m.bg }; })();
              const deployed = (flatAssets.length ? flatAssets : subGroups.flatMap(s => s.assets)).filter(a => a.status === 'Deployed').length;

              return (
                <div key={groupLabel} className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden">
                  {/* Group header — clean Apple-style section */}
                  <button
                    onClick={toggleCollapse}
                    className="w-full flex items-center gap-3.5 px-6 py-4 hover:bg-gray-50/50 transition-colors text-left"
                  >
                    <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', headerMeta.bg)}>
                      {headerMeta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[15px] font-semibold text-gray-900">{groupLabel}</span>
                        <span className="text-[12px] text-gray-400 font-medium">{totalCount}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                        <span>{deployed} deployed</span>
                        <span className="text-gray-200">|</span>
                        <span>${totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} total value</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {groupBy === 'location' && subGroups.slice(0, 3).map(({ subLabel, assets: ta }) => {
                        const m = TYPE_META[subLabel] ?? TYPE_META.Other;
                        return (
                          <span key={subLabel} className={clsx('flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg', m.bg, m.color)}>
                            {m.icon} {ta.length}
                          </span>
                        );
                      })}
                      {isCollapsed
                        ? <ChevronRight size={16} className="text-gray-300 shrink-0" />
                        : <ChevronDown size={16} className="text-gray-300 shrink-0" />
                      }
                    </div>
                  </button>

                  {/* Content */}
                  {!isCollapsed && (
                    <>
                      <div className="h-px bg-gray-100" />
                      {groupBy === 'category'
                        ? (
                          <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {flatAssets.map((asset) => (
                                <AssetCard
                                  key={asset.id}
                                  asset={asset}
                                  onClick={() => { void navigate(`/assets/${asset.id}`); }}
                                />
                              ))}
                            </div>
                          </div>
                        )
                        : (
                          <div className="divide-y divide-gray-50">
                            {subGroups.map(({ subLabel, assets: typeAssets }) => {
                              const meta = TYPE_META[subLabel] ?? TYPE_META.Other;
                              return (
                                <div key={subLabel} className="p-6">
                                  <div className="flex items-center gap-2.5 mb-4">
                                    <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center', meta.bg)}>
                                      <span className={meta.color}>{meta.icon}</span>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-700">{subLabel}s</span>
                                    <span className="text-[11px] text-gray-300 font-medium">{typeAssets.length}</span>
                                    <div className="flex-1 h-px bg-gray-100 ml-2" />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {typeAssets.map((asset) => (
                                      <AssetCard
                                        key={asset.id}
                                        asset={asset}
                                        onClick={() => { void navigate(`/assets/${asset.id}`); }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )
                      }
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

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

      {/* Bulk Edit Modal */}
      <Modal
        open={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        title={`Bulk Edit — ${selectedIds.length} asset(s)`}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowBulkEdit(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleBulkEdit}>Apply Changes</button>
          </>
        }
      >
        <p className="text-sm text-gray-500 mb-4">Only fields you change will be updated. Leave blank to keep current values.</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
            <select className="select" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
              <option value="">— No change —</option>
              {ASSET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Location</label>
            <select className="select" value={bulkLocation} onChange={(e) => setBulkLocation(e.target.value)}>
              <option value="">— No change —</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Assign To</label>
            <select className="select" value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)}>
              <option value="">— No change —</option>
              {people.filter(p => p.status === 'Active').map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.department})</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* CSV Import Wizard */}
      <Modal
        open={showImport}
        onClose={() => { setShowImport(false); setImportStep('upload'); setCsvData([]); setCsvHeaders([]); setColumnMap({}); }}
        title={`Import Assets — ${importStep === 'upload' ? 'Upload CSV' : importStep === 'map' ? 'Map Columns' : 'Preview'}`}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => {
              if (importStep === 'map') { setImportStep('upload'); setCsvData([]); setCsvHeaders([]); setColumnMap({}); }
              else if (importStep === 'preview') setImportStep('map');
              else { setShowImport(false); }
            }}>
              {importStep === 'upload' ? 'Cancel' : 'Back'}
            </button>
            {importStep === 'map' && (
              <button className="btn-primary" onClick={() => setImportStep('preview')}>
                Preview ({csvData.length} rows)
              </button>
            )}
            {importStep === 'preview' && (
              <button className="btn-primary" onClick={handleImportConfirm}>
                Import {csvData.length} Assets
              </button>
            )}
          </>
        }
      >
        {importStep === 'upload' && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
            <Upload size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-1">Drag & drop a CSV file or click to browse</p>
            <p className="text-xs text-gray-400 mb-4">Supports .csv files with a header row</p>
            <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
              <Upload size={14} /> Choose File
              <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
            </label>
          </div>
        )}

        {importStep === 'map' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Map each CSV column to an asset field. Unmapped columns will be skipped.</p>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">CSV Column</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Sample Data</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Maps To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {csvHeaders.map((h, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-medium text-gray-900">{h}</td>
                      <td className="py-2 px-3 text-gray-500 truncate max-w-[200px]">{csvData[0]?.[i] || '—'}</td>
                      <td className="py-2 px-3">
                        <select
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1 w-full"
                          value={columnMap[String(i)] || ''}
                          onChange={(e) => setColumnMap(m => ({ ...m, [String(i)]: e.target.value }))}
                        >
                          {IMPORT_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {importStep === 'preview' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Review the first 5 rows before importing.</p>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.entries(columnMap).filter(([, v]) => v).map(([colIdx, field]) => (
                      <th key={colIdx} className="text-left py-2 px-3 text-xs font-medium text-gray-500 whitespace-nowrap">
                        {IMPORT_FIELDS.find(f => f.value === field)?.label || field}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {csvData.slice(0, 5).map((row, ri) => (
                    <tr key={ri}>
                      {Object.entries(columnMap).filter(([, v]) => v).map(([colIdx]) => (
                        <td key={colIdx} className="py-2 px-3 text-gray-700 truncate max-w-[200px]">
                          {row[Number(colIdx)] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {csvData.length > 5 && (
              <p className="text-xs text-gray-400 text-center">... and {csvData.length - 5} more rows</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
