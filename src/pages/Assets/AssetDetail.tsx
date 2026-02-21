import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, QrCode,
  MapPin, User, Calendar,
  AlertTriangle, CheckCircle, Clock, FileText
} from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Tabs } from '../../components/common/Tabs';
import { useStore } from '../../store/useStore';
import { format } from 'date-fns';
import { clsx } from 'clsx';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'lifecycle', label: 'Lifecycle' },
  { id: 'financial', label: 'Financial' },
  { id: 'documents', label: 'Documents' },
  { id: 'linked', label: 'Linked Items' },
  { id: 'activity', label: 'Activity Log' },
];

export function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { assets, addToast } = useStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);

  const asset = assets.find((a) => a.id === id);
  if (!asset) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-gray-500">Asset not found</p>
        <button onClick={() => navigate('/assets')} className="btn-primary mt-4">Back to Assets</button>
      </div>
    );
  }

  const warrantyDays = Math.ceil((new Date(asset.warrantyExpiry).getTime() - Date.now()) / 86400000);
  const usefulLife = asset.depreciation?.usefulLife || 3;
  const residualValue = asset.depreciation?.residualValue || 0;
  const annualDepreciation = (asset.cost - residualValue) / usefulLife;
  const yearsOwned = (Date.now() - new Date(asset.purchaseDate).getTime()) / (365.25 * 24 * 3600 * 1000);
  const bookValue = Math.max(residualValue, asset.cost - annualDepreciation * yearsOwned);

  const lifecycle = asset.lifecycle || [
    { id: 'l1', date: asset.purchaseDate, event: 'Purchased', description: `Purchased for $${asset.cost.toLocaleString()}`, user: 'IT Team' },
    ...(asset.status === 'Deployed' ? [{ id: 'l2', date: asset.purchaseDate, event: 'Deployed', description: `Assigned to ${asset.assignedTo || 'unknown'}`, user: 'IT Admin' }] : []),
    ...(asset.status === 'In Repair' ? [{ id: 'l3', date: new Date().toISOString().split('T')[0], event: 'In Repair', description: asset.notes || 'Sent for repair', user: 'IT Admin' }] : []),
    ...(asset.status === 'Retired' ? [{ id: 'l4', date: new Date().toISOString().split('T')[0], event: 'Retired', description: 'Asset retired from service', user: 'IT Admin' }] : []),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/assets')} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 truncate">{asset.name}</h1>
              <StatusBadge status={asset.status} size="md" />
              <span className="text-sm font-mono text-gray-400">{asset.tag}</span>
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              {asset.assignedTo && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <User size={13} /> {asset.assignedTo}
                </span>
              )}
              {asset.location && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin size={13} /> {asset.location}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <Calendar size={13} /> Purchased {format(new Date(asset.purchaseDate), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={() => addToast({ type: 'info', message: 'QR code generated — ready to print' })}>
              <QrCode size={14} /> QR Label
            </button>
            <button onClick={() => setIsEditing(!isEditing)} className="btn-primary">
              <Edit2 size={14} /> {isEditing ? 'Save' : 'Edit'}
            </button>
          </div>
        </div>

        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mt-4" />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main info */}
            <div className="lg:col-span-2 space-y-5">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Specifications</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Make', value: asset.make },
                    { label: 'Model', value: asset.model },
                    { label: 'Type', value: asset.type },
                    { label: 'Serial Number', value: asset.serial || '—' },
                    ...(asset.os ? [{ label: 'Operating System', value: asset.os }] : []),
                    ...(asset.ram ? [{ label: 'RAM', value: asset.ram }] : []),
                    ...(asset.storage ? [{ label: 'Storage', value: asset.storage }] : []),
                    ...(asset.screenSize ? [{ label: 'Screen Size', value: asset.screenSize }] : []),
                    { label: 'Location', value: asset.location },
                    { label: 'Department', value: asset.department || '—' },
                    { label: 'Category', value: asset.category || '—' },
                    { label: 'Detection Source', value: asset.detectionSource || 'Manual' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs font-medium text-gray-500">{label}</p>
                      <p className="text-sm text-gray-900 mt-0.5 font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {asset.notes && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600">{asset.notes}</p>
                </div>
              )}

              {/* Tags */}
              {asset.tags && asset.tags.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {asset.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar cards */}
            <div className="space-y-4">
              {/* Assignee */}
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Assigned To</h3>
                {asset.assignedTo ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {asset.assignedTo.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{asset.assignedTo}</p>
                      <p className="text-xs text-gray-500">Since {format(new Date(asset.purchaseDate), 'MMM yyyy')}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Unassigned</p>
                )}
              </div>

              {/* Warranty */}
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Warranty</h3>
                <div className="flex items-center gap-2 mb-2">
                  {warrantyDays < 0 ? (
                    <AlertTriangle size={16} className="text-red-500" />
                  ) : warrantyDays < 90 ? (
                    <Clock size={16} className="text-yellow-500" />
                  ) : (
                    <CheckCircle size={16} className="text-green-500" />
                  )}
                  <p className={clsx('text-sm font-medium',
                    warrantyDays < 0 ? 'text-red-600' : warrantyDays < 90 ? 'text-yellow-600' : 'text-green-600'
                  )}>
                    {warrantyDays < 0 ? 'Expired' : `${warrantyDays} days remaining`}
                  </p>
                </div>
                <p className="text-xs text-gray-500">Expires {format(new Date(asset.warrantyExpiry), 'MMM d, yyyy')}</p>
              </div>

              {/* Quick Financial */}
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Financial</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Purchase Price</span>
                    <span className="text-xs font-semibold text-gray-900">${asset.cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Book Value</span>
                    <span className="text-xs font-semibold text-blue-600">${bookValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Depreciation/yr</span>
                    <span className="text-xs font-semibold text-gray-900">${annualDepreciation.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                  </div>
                  {asset.vendor && (
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Vendor</span>
                      <span className="text-xs font-semibold text-gray-900">{asset.vendor}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lifecycle' && (
          <div className="card p-6 max-w-2xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-6">Asset Lifecycle</h3>
            <div className="relative">
              {lifecycle.map((event, i) => (
                <div key={event.id} className="flex gap-4 pb-6 relative">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center z-10',
                      i === lifecycle.length - 1 ? 'bg-blue-600' : 'bg-white border-2 border-blue-300'
                    )}>
                      {i === lifecycle.length - 1
                        ? <CheckCircle size={14} className="text-white" />
                        : <div className="w-2 h-2 rounded-full bg-blue-400" />
                      }
                    </div>
                    {i < lifecycle.length - 1 && (
                      <div className="w-0.5 flex-1 bg-blue-100 mt-1" style={{ minHeight: '32px' }} />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-baseline gap-3">
                      <p className="text-sm font-semibold text-gray-900">{event.event}</p>
                      <span className="text-xs text-gray-400">{format(new Date(event.date), 'MMM d, yyyy')}</span>
                    </div>
                    {event.description && <p className="text-sm text-gray-600 mt-0.5">{event.description}</p>}
                    {event.user && <p className="text-xs text-gray-400 mt-1">By {event.user}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Purchase & Ownership</h3>
              <div className="space-y-3">
                {[
                  { label: 'Purchase Price', value: `$${asset.cost.toLocaleString()}` },
                  { label: 'Purchase Date', value: format(new Date(asset.purchaseDate), 'MMM d, yyyy') },
                  { label: 'Vendor', value: asset.vendor || '—' },
                  { label: 'PO Number', value: asset.poNumber || '—' },
                  { label: 'Currency', value: asset.currency },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Depreciation Schedule</h3>
              <div className="space-y-3">
                {[
                  { label: 'Method', value: 'Straight-Line' },
                  { label: 'Useful Life', value: `${usefulLife} years` },
                  { label: 'Annual Depreciation', value: `$${annualDepreciation.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` },
                  { label: 'Residual Value', value: `$${residualValue.toLocaleString()}` },
                  { label: 'Current Book Value', value: `$${bookValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>

              {/* Depreciation bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Depreciated</span>
                  <span>{((1 - bookValue / asset.cost) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (1 - bookValue / asset.cost) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>$0</span>
                  <span>${asset.cost.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="card p-6 max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
              <button className="btn-primary" onClick={() => addToast({ type: 'info', message: 'File upload coming soon' })}>
                <FileText size={14} /> Upload Document
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
              <FileText size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No documents uploaded</p>
              <p className="text-xs text-gray-400 mt-1">Upload receipts, warranties, photos, or any other documents</p>
            </div>
          </div>
        )}

        {activeTab === 'linked' && (
          <div className="card p-6 max-w-2xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Linked Items</h3>
            <div className="space-y-3">
              {asset.linkedApps && asset.linkedApps.length > 0 ? (
                asset.linkedApps.map((appId) => (
                  <div key={appId} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                    <span className="text-sm text-gray-700">App: {appId}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No linked items</p>
                  <p className="text-xs mt-1">Link software licenses, peripherals, or related assets</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="card p-6 max-w-2xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity Log</h3>
            <div className="space-y-3">
              {(asset.activityLog || [
                { id: 'a1', timestamp: asset.purchaseDate + 'T10:00:00Z', action: 'Asset Created', user: 'IT Team', details: 'Asset added to inventory' },
                { id: 'a2', timestamp: new Date().toISOString(), action: 'Record Viewed', user: 'Tom Admin', details: 'Detail page viewed' },
              ]).map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 py-2 border-b border-gray-50">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={12} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                    {entry.details && <p className="text-xs text-gray-500">{entry.details}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {entry.user} · {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
