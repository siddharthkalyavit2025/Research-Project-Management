import React, { useState, useEffect } from 'react';
import {
  Flag,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Briefcase,
} from 'lucide-react';
import { milestonesApi, projectsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import { Modal, ConfirmDialog } from '../components/common/Modal';

export default function MilestonesPage({ addToast }) {
  const { canManage, isAdmin } = useAuth();
  const [milestones, setMilestones] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeMs, setActiveMs] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [msToDelete, setMsToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    milestone_id: '',
    milestone_name: '',
    milestone_description: '',
    target_date: '',
    milestone_status: 'Pending',
    project_id: '',
  });

  const loadMilestones = async () => {
    setLoading(true);
    try {
      const data = await milestonesApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        project_id: projectFilter || undefined,
      });
      setMilestones(data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch milestones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await projectsApi.list({});
      setProjects(data);
      if (data.length > 0 && !formData.project_id) {
        setFormData((prev) => ({ ...prev, project_id: data[0].project_id }));
      }
    } catch (err) {
      console.warn('Failed to load projects:', err);
    }
  };

  useEffect(() => {
    loadMilestones();
  }, [search, statusFilter, projectFilter]);

  useEffect(() => {
    loadProjects();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setActiveMs(null);
    setFormData({
      milestone_id: '',
      milestone_name: '',
      milestone_description: '',
      target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      milestone_status: 'Pending',
      project_id: projects[0]?.project_id || '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (m) => {
    setIsEditing(true);
    setActiveMs(m);
    setFormData({
      milestone_id: m.milestone_id,
      milestone_name: m.milestone_name,
      milestone_description: m.milestone_description || '',
      target_date: m.target_date || '',
      milestone_status: m.milestone_status || 'Pending',
      project_id: m.project_id,
    });
    setModalOpen(true);
  };

  const handleQuickStatus = async (m, nextStatus) => {
    try {
      await milestonesApi.update(m.milestone_id, { milestone_status: nextStatus });
      addToast(`Milestone updated to ${nextStatus}`, 'success');
      loadMilestones();
    } catch (err) {
      addToast(err.message || 'Failed to update milestone status', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        milestone_name: formData.milestone_name,
        milestone_description: formData.milestone_description || undefined,
        target_date: formData.target_date || undefined,
        milestone_status: formData.milestone_status,
        project_id: parseInt(formData.project_id, 10),
      };

      if (isEditing) {
        await milestonesApi.update(activeMs.milestone_id, payload);
        addToast('Milestone updated successfully', 'success');
      } else {
        if (formData.milestone_id) {
          payload.milestone_id = parseInt(formData.milestone_id, 10);
        }
        await milestonesApi.create(payload);
        addToast('Milestone scheduled successfully', 'success');
      }
      setModalOpen(false);
      loadMilestones();
    } catch (err) {
      addToast(err.message || 'Operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!msToDelete) return;
    setActionLoading(true);
    try {
      await milestonesApi.delete(msToDelete.milestone_id);
      addToast(`Milestone '${msToDelete.milestone_name}' deleted`, 'success');
      setDeleteConfirmOpen(false);
      loadMilestones();
    } catch (err) {
      addToast(err.message || 'Could not delete milestone', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="Search milestone deliverable, desc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: '160px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
          </select>

          <select
            className="form-select"
            style={{ width: '180px' }}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                {p.project_name}
              </option>
            ))}
          </select>

          <button className="btn btn-secondary" onClick={loadMilestones} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {canManage && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>Create Milestone</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Milestone Deliverable</th>
              <th>Target Date</th>
              <th>Timeline Status</th>
              <th>Associated Project</th>
              <th>Laboratory</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Loading milestones...
                </td>
              </tr>
            ) : milestones.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No milestones found.
                </td>
              </tr>
            ) : (
              milestones.map((m) => (
                <tr key={m.milestone_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-dim)' }}>
                    #{m.milestone_id}
                  </td>
                  <td style={{ fontWeight: 600, maxWidth: '280px' }}>
                    <div>{m.milestone_name}</div>
                    {m.milestone_description && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '2px',
                        }}
                      >
                        {m.milestone_description}
                      </div>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
                    <div style={{ fontWeight: 600, color: m.is_overdue ? '#fb7185' : 'var(--text-main)' }}>
                      {m.target_date || 'Open'}
                    </div>
                    {m.is_overdue && (
                      <span className="badge badge-danger" style={{ marginTop: '2px', padding: '1px 6px' }}>
                        Overdue
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>
                      <StatusBadge status={m.milestone_status} />
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{m.project_name}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{m.lab_name}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {/* Quick mark done */}
                      {m.milestone_status !== 'Completed' && (
                        <button
                          className="btn-icon"
                          onClick={() => handleQuickStatus(m, 'Completed')}
                          title="Mark Completed"
                          style={{ color: 'var(--accent-emerald)' }}
                        >
                          <CheckCircle size={15} />
                        </button>
                      )}
                      <button className="btn-icon" onClick={() => handleOpenEdit(m)} title="Edit Milestone">
                        <Edit2 size={15} />
                      </button>
                      {canManage && (
                        <button
                          className="btn-icon"
                          onClick={() => {
                            setMsToDelete(m);
                            setDeleteConfirmOpen(true);
                          }}
                          title="Delete Milestone"
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

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? `Edit Milestone #${activeMs?.milestone_id}` : 'Create Milestone'}
      >
        <form onSubmit={handleSubmit}>
          {!isEditing && (
            <div className="form-group">
              <label className="form-label">Milestone ID (Optional)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 806"
                value={formData.milestone_id}
                onChange={(e) => setFormData({ ...formData, milestone_id: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Milestone Deliverable / Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Phase 2 Clinical Trial Results"
              value={formData.milestone_name}
              onChange={(e) => setFormData({ ...formData, milestone_name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description / Scope</label>
            <textarea
              className="form-textarea"
              placeholder="Detailed description of objectives, key results, deliverables..."
              value={formData.milestone_description}
              onChange={(e) => setFormData({ ...formData, milestone_description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Target Completion Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Milestone Status</label>
              <select
                className="form-select"
                value={formData.milestone_status}
                onChange={(e) => setFormData({ ...formData, milestone_status: e.target.value })}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Associated Project *</label>
            <select
              required
              className="form-select"
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            >
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  #{p.project_id} - {p.project_name} ({p.lab_name})
                </option>
              ))}
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : isEditing ? 'Update Milestone' : 'Save Milestone'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Milestone"
        message={`Delete '${msToDelete?.milestone_name}'?`}
        confirmText="Confirm Delete"
        loading={actionLoading}
      />
    </div>
  );
}
