import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Download, Search, Filter, Users,
  DollarSign, Building2, UserCheck, UserMinus,
} from 'lucide-react';
import { DataTable, type Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { useStore } from '../../store/useStore';
import { exportToCSV } from '../../utils/csvExport';
import type { Person, PersonStatus } from '../../types';
import { clsx } from 'clsx';
import { format } from 'date-fns';

const COLUMNS: Column<Person>[] = [
  { key: 'name', label: 'Name', sortable: true, render: (r) => (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
        {r.name.split(' ').map(n => n[0]).join('')}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-gray-900">{r.name}</p>
        <p className="text-[11px] text-gray-400">{r.email}</p>
      </div>
    </div>
  )},
  { key: 'department', label: 'Department', sortable: true, render: (r) => (
    <span className="text-[12px] font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md">{r.department}</span>
  )},
  { key: 'title', label: 'Title', sortable: true },
  { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
  { key: 'location', label: 'Location', sortable: true },
  { key: 'startDate', label: 'Start Date', sortable: true, render: (r) => (
    <span className="text-sm">{format(new Date(r.startDate), 'MMM d, yyyy')}</span>
  )},
  { key: 'managerName', label: 'Manager', sortable: true, render: (r) => r.managerName || <span className="text-gray-300">—</span> },
  { key: 'assetsAssigned', label: 'Assets', sortable: true, render: (r) => (
    <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
      {r.assetsAssigned}
    </span>
  )},
  { key: 'licensesAssigned', label: 'Licenses', sortable: true, render: (r) => (
    <span className="inline-flex items-center justify-center w-7 h-7 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold">
      {r.licensesAssigned}
    </span>
  )},
  { key: 'totalItCost', label: 'IT Cost', sortable: true, render: (r) => (
    <span className="text-sm font-semibold text-gray-800 tabular-nums">${(r.totalItCost || 0).toLocaleString()}</span>
  )},
];

const STATUSES: PersonStatus[] = ['Active', 'Onboarding', 'Offboarding', 'Offboarded'];

// Avatar gradient colors by department for visual variety
const DEPT_COLORS: Record<string, string> = {
  Engineering: 'from-blue-400 to-indigo-600',
  Sales: 'from-emerald-400 to-teal-600',
  Marketing: 'from-pink-400 to-rose-600',
  Finance: 'from-amber-400 to-orange-600',
  HR: 'from-violet-400 to-purple-600',
  Operations: 'from-cyan-400 to-sky-600',
  IT: 'from-blue-500 to-cyan-600',
};

export function PeopleList() {
  const navigate = useNavigate();
  const { people, addPerson, addToast, currentUserRole } = useStore();
  const canEdit = currentUserRole !== 'Read Only' && currentUserRole !== 'Finance';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PersonStatus | ''>('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [newPerson, setNewPerson] = useState<Partial<Person>>({
    status: 'Active', assetsAssigned: 0, licensesAssigned: 0, totalItCost: 0,
  });

  const departments = [...new Set(people.map((p) => p.department))].sort();

  const filtered = useMemo(() => {
    return people.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (deptFilter && p.department !== deptFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [people, statusFilter, deptFilter, search]);

  function handleAddPerson() {
    const errors: Record<string, boolean> = {};
    if (!newPerson.name?.trim()) errors.name = true;
    if (!newPerson.email?.trim()) errors.email = true;
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    addPerson({
      id: `p${Date.now()}`,
      name: newPerson.name!,
      email: newPerson.email!,
      department: newPerson.department || '',
      title: newPerson.title || '',
      status: newPerson.status as PersonStatus || 'Active',
      location: newPerson.location || '',
      startDate: newPerson.startDate || new Date().toISOString().split('T')[0],
      assetsAssigned: 0,
      licensesAssigned: 0,
      totalItCost: 0,
    });
    setShowAddModal(false);
    addToast({ type: 'success', message: `${newPerson.name} added successfully` });
    setNewPerson({ status: 'Active', assetsAssigned: 0, licensesAssigned: 0, totalItCost: 0 });
  }

  const activeCount = people.filter(p => p.status === 'Active').length;
  const onboarding = people.filter(p => p.status === 'Onboarding');
  const offboarding = people.filter(p => p.status === 'Offboarding');
  const totalItCost = people.reduce((s, p) => s + (p.totalItCost || 0), 0);
  const locationsSet = [...new Set(people.map(p => p.location))];

  // Department stats
  const deptStats = useMemo(() => {
    const map = new Map<string, { count: number; cost: number; assetsTotal: number; licensesTotal: number }>();
    for (const p of people) {
      const d = p.department || 'Unknown';
      const prev = map.get(d) || { count: 0, cost: 0, assetsTotal: 0, licensesTotal: 0 };
      map.set(d, {
        count: prev.count + 1,
        cost: prev.cost + (p.totalItCost || 0),
        assetsTotal: prev.assetsTotal + p.assetsAssigned,
        licensesTotal: prev.licensesTotal + p.licensesAssigned,
      });
    }
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, stats]) => ({ name, ...stats }));
  }, [people]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">People</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {activeCount} active · {onboarding.length} onboarding · {offboarding.length} offboarding
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => {
            exportToCSV(
              filtered as unknown as Record<string, unknown>[],
              [
                { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' },
                { key: 'department', label: 'Department' }, { key: 'title', label: 'Title' },
                { key: 'status', label: 'Status' }, { key: 'location', label: 'Location' },
                { key: 'startDate', label: 'Start Date' }, { key: 'managerName', label: 'Manager' },
                { key: 'assetsAssigned', label: 'Assets' }, { key: 'licensesAssigned', label: 'Licenses' },
                { key: 'totalItCost', label: 'IT Cost' },
              ],
              'people'
            );
            addToast({ type: 'success', message: `Exported ${filtered.length} people to CSV` });
          }}>
            <Download size={15} /> Export
          </button>
          {canEdit && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <Plus size={15} /> Add Person
            </button>
          )}
        </div>
      </div>

      {/* Summary stat cards — Apple-style rounded blocks with generous spacing */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total People', value: people.length.toString(), sub: `${locationsSet.length} locations`, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Onboarding', value: onboarding.length.toString(), sub: onboarding.length > 0 ? `${onboarding.map(p => p.name).slice(0, 2).join(', ')}${onboarding.length > 2 ? '...' : ''}` : 'No active onboarding', icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Offboarding', value: offboarding.length.toString(), sub: offboarding.length > 0 ? `${offboarding.map(p => p.name).slice(0, 2).join(', ')}${offboarding.length > 2 ? '...' : ''}` : 'No active offboarding', icon: UserMinus, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Total IT Cost', value: `$${totalItCost.toLocaleString()}`, sub: `$${Math.round(totalItCost / Math.max(people.length, 1)).toLocaleString()} avg/person`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200/60 p-5">
            <div className="flex items-center gap-3">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', bg)}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-gray-900 leading-tight mt-0.5">{value}</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-3 truncate">{sub}</p>
          </div>
        ))}
      </div>

      {/* Department breakdown — horizontal scrolling cards */}
      <div>
        <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Building2 size={12} /> Departments
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {deptStats.map((dept) => {
            const gradient = DEPT_COLORS[dept.name] || 'from-gray-400 to-gray-600';
            const isActive = deptFilter === dept.name;
            return (
              <button
                key={dept.name}
                onClick={() => setDeptFilter(isActive ? '' : dept.name)}
                className={clsx(
                  'flex-shrink-0 bg-white rounded-xl border p-4 min-w-[180px] text-left transition-all duration-150',
                  isActive
                    ? 'border-blue-300 shadow-md shadow-blue-100'
                    : 'border-gray-200/60 hover:border-gray-300 hover:shadow-sm'
                )}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={clsx('w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold', gradient)}>
                    {dept.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-gray-900 leading-tight">{dept.name}</p>
                    <p className="text-[10px] text-gray-400">{dept.count} {dept.count === 1 ? 'person' : 'people'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-gray-400">Assets</span>
                    <p className="font-semibold text-gray-700">{dept.assetsTotal}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Licenses</span>
                    <p className="font-semibold text-gray-700">{dept.licensesTotal}</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 text-[10px]">
                  <span className="text-gray-400">IT Cost: </span>
                  <span className="font-bold text-gray-700">${dept.cost.toLocaleString()}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['', ...STATUSES] as (PersonStatus | '')[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              'px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border',
              statusFilter === s
                ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200/80 hover:border-gray-300 hover:shadow-sm'
            )}
          >
            {s || 'All'} {s && `(${people.filter(p => p.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-150 bg-gray-50/50"
            />
          </div>

          <button onClick={() => setShowFilters(!showFilters)} className={clsx('btn-secondary', showFilters && 'bg-blue-50 border-blue-200 text-blue-700')}>
            <Filter size={14} /> Filters
            {deptFilter && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-0.5" />}
          </button>

          {deptFilter && (
            <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
              <Building2 size={11} /> {deptFilter}
              <button onClick={() => setDeptFilter('')} className="ml-1 text-blue-400 hover:text-blue-600">&times;</button>
            </span>
          )}
        </div>

        {showFilters && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Department:</label>
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1">
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            {deptFilter && <button onClick={() => setDeptFilter('')} className="text-xs text-blue-600">Clear</button>}
          </div>
        )}

        <DataTable
          data={filtered}
          columns={COLUMNS}
          onRowClick={(row) => { void navigate(`/people/${row.id}`); }}
          emptyState={
            <EmptyState
              icon={Users}
              title="No people found"
              description="Add employees to track their assets, licenses, and IT costs"
              action={{ label: '+ Add Person', onClick: () => setShowAddModal(true) }}
            />
          }
        />
      </div>

      {/* Add Person Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Person"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAddPerson}>Add Person</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Full Name <span className="text-red-500">*</span></label>
            <input className={clsx('input', formErrors.name && 'border-red-400 ring-1 ring-red-400')} placeholder="e.g. Jane Smith" value={newPerson.name || ''} onChange={(e) => { setNewPerson(p => ({ ...p, name: e.target.value })); setFormErrors(f => ({ ...f, name: false })); }} />
            {formErrors.name && <p className="text-xs text-red-500 mt-1">Name is required</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Email <span className="text-red-500">*</span></label>
            <input type="email" className={clsx('input', formErrors.email && 'border-red-400 ring-1 ring-red-400')} placeholder="jane@company.com" value={newPerson.email || ''} onChange={(e) => { setNewPerson(p => ({ ...p, email: e.target.value })); setFormErrors(f => ({ ...f, email: false })); }} />
            {formErrors.email && <p className="text-xs text-red-500 mt-1">Email is required</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Department</label>
            <input className="input" placeholder="Engineering, Sales..." value={newPerson.department || ''} onChange={(e) => setNewPerson(p => ({ ...p, department: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Title</label>
            <input className="input" placeholder="Job title" value={newPerson.title || ''} onChange={(e) => setNewPerson(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
            <select className="select" value={newPerson.status} onChange={(e) => setNewPerson(p => ({ ...p, status: e.target.value as PersonStatus }))}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Location</label>
            <input className="input" placeholder="Office location" value={newPerson.location || ''} onChange={(e) => setNewPerson(p => ({ ...p, location: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Start Date</label>
            <input type="date" className="input" value={newPerson.startDate || ''} onChange={(e) => setNewPerson(p => ({ ...p, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Phone</label>
            <input className="input" placeholder="+1 (555) 000-0000" value={newPerson.phone || ''} onChange={(e) => setNewPerson(p => ({ ...p, phone: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
