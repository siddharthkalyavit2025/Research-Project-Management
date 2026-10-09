import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Building,
  DollarSign,
  AlertCircle,
  Briefcase,
  Wrench,
} from 'lucide-react';
import { labsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { DetailDrawer } from '../components/common/DetailDrawer';

export default function LabsPage({ addToast }) {
  const { canManage, isAdmin } = useAuth();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Drawer state
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeLab, setActiveLab] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [labToDelete, setLabToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    lab_code: '',
    lab_name: '',
    discipline: '',
    allocated_budget: 0,
    lab_location: '',
    lab_status: 'Active',
  });

  const loadLabs = async () => {
    setLoading(true);
    try {
      const data = await labsApi.list({
        search: search || undefined,
        discipline: disciplineFilter || undefined,
        status: statusFilter || undefined,
      });
      setLabs(data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch laboratories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabs();
  }, [search, disciplineFilter, statusFilter]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setActiveLab(null);
    setFormData({
      lab_code: '',
      lab_name: '',
      discipline: 'Genetics',
      allocated_budget: 2500000,
      lab_location: 'Block A, Level 2',
      lab_status: 'Active',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (lab) => {
    setIsEditing(true);
    setActiveLab(lab);
    setFormData({
      lab_code: lab.lab_code,
      lab_name: lab.lab_name,
      discipline: lab.discipline,
      allocated_budget: lab.allocated_budget,
      lab_location: lab.lab_location || '',
      lab_status: lab.lab_status || 'Active',
    });
    setModalOpen(true);
  };

  const handleOpenDetail = async (lab) => {
    try {
      const full = await labsApi.get(lab.lab_code);
      setDetailData(full);
      setDrawerOpen(true);
    } catch (err) {
      addToast(err.message || 'Failed to load details', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (isEditing) {
        await labsApi.update(activeLab.lab_code, {
          lab_name: formData.lab_name,
          discipline: formData.discipline,
          allocated_budget: parseFloat(formData.allocated_budget),
          lab_location: formData.lab_location,
          lab_status: formData.lab_status,
        });
        addToast('Laboratory updated successfully', 'success');
      } else {
        const payload = {
          lab_name: formData.lab_name,
          discipline: formData.discipline,
          allocated_budget: parseFloat(formData.allocated_budget),
          lab_location: formData.lab_location,
          lab_status: formData.lab_status,
        };
        if (formData.lab_code) {
          payload.lab_code = parseInt(formData.lab_code, 10);
        }
        await labsApi.create(payload);
        addToast('Laboratory created successfully', 'success');
      }
      setModalOpen(false);
      loadLabs();
    } catch (err) {
      addToast(err.message || 'Operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!labToDelete) return;
    setActionLoading(true);
    try {
      await labsApi.delete(labToDelete.lab_code);
      addToast(`Laboratory ${labToDelete.lab_name} deleted`, 'success');
      setDeleteConfirmOpen(false);
      loadLabs();
    } catch (err) {
      addToast(err.message || 'Could not delete laboratory', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div>
      {/* Action & Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="Search lab name, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: '160px' }}
            value={disciplineFilter}
            onChange={(e) => setDisciplineFilter(e.target.value)}
          >
            <option value="">All Disciplines</option>
            <option value="Genetics">Genetics</option>
            <option value="Physics">Physics</option>
            <option value="Neurology">Neurology</option>
            <option value="Agriculture">Agriculture</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Robotics">Robotics</option>
          </select>

          <select
            className="form-select"
            style={{ width: '140px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Maintenance">Maintenance</option>
          </select>

          <button className="btn btn-secondary" onClick={loadLabs} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {canManage && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>Add Laboratory</span>
            </button>
          )}
        </div>
      </div>

      {/* Laboratories Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Laboratory Name</th>
              <th>Discipline</th>
              <th>Allocated Budget</th>
              <th>Location</th>
              <th>Status</th>
              <th>Projects</th>
              <th>Equipment</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Loading laboratories from Oracle...
                </td>
              </tr>
            ) : labs.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No laboratories found matching criteria.
                </td>
              </tr>
            ) : (
              labs.map((lab) => (
                <tr key={lab.lab_code}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-dim)' }}>
                    #{lab.lab_code}
                  </td>
                  <td style={{ fontWeight: 600 }}>{lab.lab_name}</td>
                  <td>
                    <span className="badge badge-secondary">{lab.discipline}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {formatCurrency(lab.allocated_budget)}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{lab.lab_location || '—'}</td>
                  <td>
                    <StatusBadge status={lab.lab_status} />
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{lab.project_count}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{lab.equipment_count}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenDetail(lab)}
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>
                      {canManage && (
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenEdit(lab)}
                          title="Edit Laboratory"
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="btn-icon"
                          onClick={() => {
                            setLabToDelete(lab);
                            setDeleteConfirmOpen(true);
                          }}
                          title="Delete Laboratory"
                          style={{ color: 'var(--accent-rose)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Laboratory Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? `Edit Laboratory #${activeLab?.lab_code}` : 'Add New Laboratory'}
      >
        <form onSubmit={handleSubmit}>
          {!isEditing && (
            <div className="form-group">
              <label className="form-label">
                Laboratory Code (Optional - Auto-assigned if empty)
              </label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 106"
                value={formData.lab_code}
                onChange={(e) => setFormData({ ...formData, lab_code: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Laboratory Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Advanced Photonics Center"
              value={formData.lab_name}
              onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Discipline *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Genetics, Physics"
                value={formData.discipline}
                onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Allocated Budget ($) *</label>
              <input
                type="number"
                required
                min="0"
                step="1000"
                className="form-input"
                value={formData.allocated_budget}
                onChange={(e) => setFormData({ ...formData, allocated_budget: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Location / Room</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Block A, Room 302"
                value={formData.lab_location}
                onChange={(e) => setFormData({ ...formData, lab_location: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={formData.lab_status}
                onChange={(e) => setFormData({ ...formData, lab_status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Saving to Oracle...' : isEditing ? 'Update Lab' : 'Create Lab'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Details Slide-Over Drawer */}
      <DetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={detailData?.lab_name || 'Laboratory Details'}
        subtitle={`Lab Code: #${detailData?.lab_code} • ${detailData?.discipline}`}
      >
        {detailData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Meta summary card */}
            <div
              style={{
                padding: '18px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '14px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Budget
                </span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {formatCurrency(detailData.allocated_budget)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Status
                </span>
                <div style={{ marginTop: '2px' }}>
                  <StatusBadge status={detailData.lab_status} />
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Location
                </span>
                <div style={{ fontWeight: 500, fontSize: '13px' }}>
                  {detailData.lab_location || 'Not Specified'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Equipment Value
                </span>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--primary-light)' }}>
                  {formatCurrency(detailData.total_equipment_value)}
                </div>
              </div>
            </div>

            {/* Associated Projects Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Briefcase size={16} style={{ color: 'var(--primary-light)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
                  Associated Research Projects ({detailData.projects?.length || 0})
                </h3>
              </div>
              {detailData.projects?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No projects registered under this lab.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {detailData.projects?.map((proj) => (
                    <div
                      key={proj.project_id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{proj.project_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Duration: {proj.duration_months} mo &bull; {proj.start_date || 'N/A'} to {proj.end_date || 'N/A'}
                        </div>
                      </div>
                      <StatusBadge status={proj.project_status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Associated Equipment Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Wrench size={16} style={{ color: 'var(--accent-cyan)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
                  Laboratory Equipment ({detailData.equipment?.length || 0})
                </h3>
              </div>
              {detailData.equipment?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No equipment assigned to this lab.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {detailData.equipment?.map((eq) => (
                    <div
                      key={eq.equipment_id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{eq.equipment_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {eq.equipment_type} &bull; Cost: {formatCurrency(eq.equipment_cost)}
                        </div>
                      </div>
                      <StatusBadge status={eq.availability_status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Laboratory"
        message={`Are you sure you want to delete '${labToDelete?.lab_name}' (#${labToDelete?.lab_code})? Note: If this laboratory has existing projects or equipment, the Oracle foreign key constraints will safely prevent deletion.`}
        confirmText="Confirm Delete"
        loading={actionLoading}
      />
    </div>
  );
}
