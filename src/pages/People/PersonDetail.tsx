import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, X, Mail, Phone, MapPin, Calendar, CheckSquare, Square,
  Monitor, AppWindow, DollarSign, FileText, CheckCircle, AlertTriangle, Package
} from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Tabs } from '../../components/common/Tabs';
import { useStore } from '../../store/useStore';
import { mockOnboardingKits } from '../../data/mockData';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import type { PersonStatus } from '../../types';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'assets', label: 'Assets' },
  { id: 'apps', label: 'Apps & Licenses' },
  { id: 'financial', label: 'Financial' },
  { id: 'documents', label: 'Documents' },
  { id: 'activity', label: 'Activity' },
];

const PERSON_STATUSES: PersonStatus[] = ['Active', 'Onboarding', 'Offboarding', 'Offboarded'];

export function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { people, assets, apps, updatePerson, addToast } = useStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [showKitModal, setShowKitModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const person = people.find((p) => p.id === id) ?? null;

  const [draft, setDraft] = useState({
    name: '', email: '', phone: '', department: '', title: '',
    location: '', status: '' as PersonStatus, managerName: '',
  });

  useEffect(() => {
    if (person) {
      setDraft({
        name: person.name, email: person.email, phone: person.phone || '',
        department: person.department, title: person.title,
        location: person.location, status: person.status,
        managerName: person.managerName || '',
      });
    }
  }, [person]);

  const assignedAssets = assets.filter((a) => a.assignedToId === person?.id);
  const isOnboarding = person?.status === 'Onboarding';
  const isOffboarding = person?.status === 'Offboarding';

  const taskCategoryColor: Record<string, string> = {
    Hardware: 'bg-blue-100 text-blue-700',
    Software: 'bg-purple-100 text-purple-700',
    Access: 'bg-green-100 text-green-700',
    Admin: 'bg-gray-100 text-gray-600',
    Security: 'bg-red-100 text-red-700',
  };

  function toggleOnboardingTask(taskId: string) {
    if (!person) return;
    const updated = (person.onboardingTasks || []).map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    updatePerson(person.id, { onboardingTasks: updated });
  }

  function toggleOffboardingTask(taskId: string) {
    if (!person) return;
    const updated = (person.offboardingTasks || []).map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    updatePerson(person.id, { offboardingTasks: updated });
  }

  const onboardingCompleted = (person?.onboardingTasks || []).filter((t) => t.completed).length;
  const onboardingTotal = (person?.onboardingTasks || []).length;

  if (!person) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500">Person not found</p>
        <button onClick={() => navigate('/people')} className="btn-primary mt-4">Back to People</button>
      </div>
    );
  }

  const offboardingCompleted = (person.offboardingTasks || []).filter((t) => t.completed).length;
  const offboardingTotal = (person.offboardingTasks || []).length;

  function handleSave() {
    updatePerson(person!.id, {
      name: draft.name, email: draft.email, phone: draft.phone || undefined,
      department: draft.department, title: draft.title,
      location: draft.location, status: draft.status,
      managerName: draft.managerName || undefined,
    });
    setIsEditing(false);
    addToast({ type: 'success', message: `${draft.name} updated successfully` });
  }

  function handleCancel() {
    setDraft({
      name: person!.name, email: person!.email, phone: person!.phone || '',
      department: person!.department, title: person!.title,
      location: person!.location, status: person!.status,
      managerName: person!.managerName || '',
    });
    setIsEditing(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/people')} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
            <ArrowLeft size={16} />
          </button>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {person.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{person.name}</h1>
              <StatusBadge status={person.status} size="md" />
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap text-sm text-gray-500">
              <span>{person.title}</span>
              <span>·</span>
              <span>{person.department}</span>
              {person.email && <span className="flex items-center gap-1"><Mail size={12} /> {person.email}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOnboarding && (
              <button onClick={() => setShowKitModal(true)} className="btn-secondary">
                <Package size={14} /> Apply Kit
              </button>
            )}
            {isEditing ? (
              <>
                <button onClick={handleCancel} className="btn-secondary"><X size={14} /> Cancel</button>
                <button onClick={handleSave} className="btn-primary"><Save size={14} /> Save</button>
              </>
            ) : (
              <button className="btn-primary" onClick={() => setIsEditing(true)}>Edit</button>
            )}
          </div>
        </div>

        {isOnboarding && onboardingTotal > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-blue-500" style={{ width: `${(onboardingCompleted / onboardingTotal) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">{onboardingCompleted}/{onboardingTotal} tasks complete</span>
          </div>
        )}
        {isOffboarding && offboardingTotal > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-orange-500" style={{ width: `${(offboardingCompleted / offboardingTotal) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">{offboardingCompleted}/{offboardingTotal} tasks complete</span>
          </div>
        )}

        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mt-4" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-medium text-gray-500 mb-1 block">Name</label><input className="input" value={draft.name} onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} /></div>
                    <div><label className="text-xs font-medium text-gray-500 mb-1 block">Email</label><input className="input" value={draft.email} onChange={(e) => setDraft(d => ({ ...d, email: e.target.value }))} /></div>
                    <div><label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label><input className="input" value={draft.phone} onChange={(e) => setDraft(d => ({ ...d, phone: e.target.value }))} /></div>
                    <div><label className="text-xs font-medium text-gray-500 mb-1 block">Location</label><input className="input" value={draft.location} onChange={(e) => setDraft(d => ({ ...d, location: e.target.value }))} /></div>
                    <div><label className="text-xs font-medium text-gray-500 mb-1 block">Department</label><input className="input" value={draft.department} onChange={(e) => setDraft(d => ({ ...d, department: e.target.value }))} /></div>
                    <div><label className="text-xs font-medium text-gray-500 mb-1 block">Title</label><input className="input" value={draft.title} onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))} /></div>
                    <div><label className="text-xs font-medium text-gray-500 mb-1 block">Status</label><select className="select" value={draft.status} onChange={(e) => setDraft(d => ({ ...d, status: e.target.value as PersonStatus }))}>{PERSON_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                    <div><label className="text-xs font-medium text-gray-500 mb-1 block">Manager</label><input className="input" value={draft.managerName} onChange={(e) => setDraft(d => ({ ...d, managerName: e.target.value }))} /></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Email', value: person.email, icon: Mail },
                      { label: 'Phone', value: person.phone || '—', icon: Phone },
                      { label: 'Location', value: person.location, icon: MapPin },
                      { label: 'Start Date', value: format(new Date(person.startDate), 'MMM d, yyyy'), icon: Calendar },
                      { label: 'Manager', value: person.managerName || '—', icon: null },
                      { label: 'Department', value: person.department, icon: null },
                      { label: 'Title', value: person.title, icon: null },
                      { label: 'Status', value: person.status, icon: null },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label}>
                        <p className="text-xs font-medium text-gray-500">{label}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {Icon && <Icon size={12} className="text-gray-400" />}
                          <p className="text-sm font-medium text-gray-900">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isOnboarding && person.onboardingTasks && person.onboardingTasks.length > 0 && (
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <CheckSquare size={16} className="text-blue-500" /> Onboarding Checklist
                    </h3>
                    <span className="text-xs text-gray-500 bg-blue-50 px-2 py-0.5 rounded-full">{onboardingCompleted}/{onboardingTotal}</span>
                  </div>
                  <div className="space-y-2">
                    {person.onboardingTasks.map((task) => (
                      <div key={task.id} onClick={() => toggleOnboardingTask(task.id)} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                        {task.completed ? <CheckCircle size={16} className="text-green-500 flex-shrink-0" /> : <Square size={16} className="text-gray-300 flex-shrink-0" />}
                        <span className={clsx('text-sm flex-1', task.completed ? 'line-through text-gray-400' : 'text-gray-700')}>{task.task}</span>
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', taskCategoryColor[task.category])}>{task.category}</span>
                        {task.dueDate && <span className="text-xs text-gray-400">Due {format(new Date(task.dueDate), 'MMM d')}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isOffboarding && person.offboardingTasks && person.offboardingTasks.length > 0 && (
                <div className="card p-5 border-orange-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-orange-500" /> Offboarding Checklist
                    </h3>
                    <span className="text-xs text-gray-500 bg-orange-50 px-2 py-0.5 rounded-full">{offboardingCompleted}/{offboardingTotal}</span>
                  </div>
                  <div className="space-y-2">
                    {person.offboardingTasks.map((task) => (
                      <div key={task.id} onClick={() => toggleOffboardingTask(task.id)} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-orange-50 cursor-pointer transition-colors">
                        {task.completed ? <CheckCircle size={16} className="text-green-500 flex-shrink-0" /> : <Square size={16} className="text-gray-300 flex-shrink-0" />}
                        <span className={clsx('text-sm flex-1', task.completed ? 'line-through text-gray-400' : 'text-gray-700')}>{task.task}</span>
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', taskCategoryColor[task.category])}>{task.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">IT Summary</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Monitor size={14} className="text-blue-500" /><span className="text-sm text-gray-600">Assets</span></div><span className="text-sm font-bold text-gray-900">{person.assetsAssigned}</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><AppWindow size={14} className="text-purple-500" /><span className="text-sm text-gray-600">Licenses</span></div><span className="text-sm font-bold text-gray-900">{person.licensesAssigned}</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><DollarSign size={14} className="text-green-500" /><span className="text-sm text-gray-600">Annual IT Cost</span></div><span className="text-sm font-bold text-gray-900">${(person.totalItCost || 0).toLocaleString()}</span></div>
                </div>
              </div>
              {person.endDate && (
                <div className="card p-5 border-red-200 bg-red-50">
                  <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Offboarding Date</h3>
                  <p className="text-sm font-bold text-red-700">{format(new Date(person.endDate), 'MMMM d, yyyy')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Assigned Assets ({assignedAssets.length})</h3>
            {assignedAssets.length === 0 ? (
              <div className="text-center py-12 text-gray-400"><Monitor size={32} className="mx-auto mb-2" /><p className="text-sm">No assets assigned</p></div>
            ) : (
              <div className="divide-y divide-gray-50">
                {assignedAssets.map((asset) => (
                  <div key={asset.id} onClick={() => navigate(`/assets/${asset.id}`)} className="flex items-center gap-4 py-3 hover:bg-gray-50 cursor-pointer rounded-lg px-2 -mx-2 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"><Monitor size={14} className="text-blue-600" /></div>
                    <div className="flex-1"><p className="text-sm font-medium text-gray-900">{asset.name}</p><p className="text-xs text-gray-500">{asset.tag} · {asset.make} {asset.model}</p></div>
                    <StatusBadge status={asset.status} />
                    <span className="text-xs text-gray-400">{asset.location}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'apps' && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">App Access & Licenses ({person.licensesAssigned})</h3>
            <div className="divide-y divide-gray-50">
              {apps.slice(0, person.licensesAssigned).map((app) => (
                <div key={app.id} onClick={() => navigate(`/apps/${app.id}`)} className="flex items-center gap-4 py-3 hover:bg-gray-50 cursor-pointer rounded-lg px-2 -mx-2 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{app.name.substring(0, 2).toUpperCase()}</div>
                  <div className="flex-1"><p className="text-sm font-medium text-gray-900">{app.name}</p><p className="text-xs text-gray-500">{app.vendor} · {app.licenseType}</p></div>
                  <StatusBadge status="Active" />
                  <span className="text-xs text-gray-400">${app.costPerLicense}/mo</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="card p-5 max-w-2xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">IT Cost Breakdown</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center gap-2"><Monitor size={15} className="text-blue-500" /><span className="text-sm text-gray-700">Hardware Assets</span></div>
                <span className="text-sm font-semibold text-gray-900">${assignedAssets.reduce((s, a) => s + a.cost, 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center gap-2"><AppWindow size={15} className="text-purple-500" /><span className="text-sm text-gray-700">Software Licenses (annual)</span></div>
                <span className="text-sm font-semibold text-gray-900">${apps.slice(0, person.licensesAssigned).reduce((s, a) => s + a.costPerLicense * 12, 0).toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between py-3 bg-gray-50 rounded-lg px-3">
                <span className="text-sm font-semibold text-gray-900">Total Annual IT Cost</span>
                <span className="text-base font-bold text-blue-600">${(person.totalItCost || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="card p-6 max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
              <button className="btn-primary" onClick={() => addToast({ type: 'info', message: 'File upload coming soon' })}><FileText size={14} /> Upload</button>
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
              <FileText size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No documents uploaded</p>
              <p className="text-xs text-gray-400 mt-1">Agreements, equipment receipts, return forms</p>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="card p-5 max-w-2xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity Log</h3>
            <div className="space-y-3">
              {[
                { action: 'Person Created', user: 'Grace Kim', date: person.startDate, details: `${person.name} added to system` },
                { action: 'Status Changed', user: 'Grace Kim', date: '2024-02-15', details: `Status set to ${person.status}` },
                { action: 'Asset Assigned', user: 'Tom Admin', date: '2024-01-20', details: 'MacBook Pro 14" assigned' },
              ].map((entry, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50">
                  <CheckCircle size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                    <p className="text-xs text-gray-500">{entry.details}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{entry.user} · {format(new Date(entry.date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Onboarding Kit Modal */}
      {showKitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowKitModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-900">Apply Onboarding Kit</h2></div>
            <div className="p-6 space-y-3">
              {mockOnboardingKits.map((kit) => (
                <div key={kit.id} onClick={() => { addToast({ type: 'success', message: `"${kit.name}" applied to ${person.name}` }); setShowKitModal(false); }}
                  className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0"><Package size={18} className="text-blue-600" /></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{kit.name}</p>
                    <p className="text-xs text-gray-500">{kit.role} · {kit.department}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {kit.assets.map((a, i) => (<span key={i} className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">{a.model}</span>))}
                      {kit.apps.map((a) => (<span key={a.appId} className="text-xs bg-purple-100 text-purple-700 rounded px-1.5 py-0.5">{a.appName}</span>))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
