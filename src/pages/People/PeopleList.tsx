import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Search, Filter, Users } from 'lucide-react';
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
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {r.name.split(' ').map(n => n[0]).join('')}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{r.name}</p>
        <p className="text-xs text-gray-400">{r.email}</p>
      </div>
    </div>
  )},
  { key: 'department', label: 'Department', sortable: true },
  { key: 'title', label: 'Title', sortable: true },
  { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
  { key: 'location', label: 'Location', sortable: true },
  { key: 'startDate', label: 'Start Date', sortable: true, render: (r) => (
    <span className="text-sm">{format(new Date(r.startDate), 'MMM d, yyyy')}</span>
  )},
  { key: 'managerName', label: 'Manager', sortable: true, render: (r) => r.managerName || <span className="text-gray-400">—</span> },
  { key: 'assetsAssigned', label: 'Assets', sortable: true, render: (r) => (
    <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
      {r.assetsAssigned}
    </span>
  )},
  { key: 'licensesAssigned', label: 'Licenses', sortable: true, render: (r) => (
    <span className="inline-flex items-center justify-center w-7 h-7 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold">
      {r.licensesAssigned}
    </span>
  )},
  { key: 'totalItCost', label: 'IT Cost', sortable: true, render: (r) => (
    <span className="text-sm font-medium text-gray-700">${(r.totalItCost || 0).toLocaleString()}/yr</span>
  )},
];

const STATUSES: PersonStatus[] = ['Active', 'Onboarding', 'Offboarding', 'Offboarded'];

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

  const departments = [...new Set(people.map((p) => p.department))];

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

  const onboarding = people.filter(p => p.status === 'Onboarding');
  const offboarding = people.filter(p => p.status === 'Offboarding');

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">People</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {people.filter(p => p.status === 'Active').length} active · {onboarding.length} onboarding · {offboarding.length} offboarding
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

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['', ...STATUSES] as (PersonStatus | '')[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
              statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            )}
          >
            {s || 'All'} {s && `(${people.filter(p => p.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button onClick={() => setShowFilters(!showFilters)} className={clsx('btn-secondary', showFilters && 'bg-blue-50 border-blue-200 text-blue-700')}>
            <Filter size={14} /> Filters
            {deptFilter && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-0.5" />}
          </button>
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
          onRowClick={(row) => navigate(`/people/${row.id}`)}
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
