import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Coins,
  Users2,
  Flag,
  Calendar,
  Clock,
} from 'lucide-react';
import { projectsApi, labsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { DetailDrawer } from '../components/common/DetailDrawer';

export default function ProjectsPage({ addToast }) {
  const { canManage, isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [labFilter, setLabFilter] = useState('');

  // Modals & Drawer
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeProj, setActiveProj] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projToDelete, setProjToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    project_id: '',
    project_name: '',
    project_description: '',
    team_leads_count: 1,
    duration_months: 12,
    start_date: '',
    end_date: '',
    project_status: 'Ongoing',
    lab_code: '',
  });

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        lab_code: labFilter || undefined,
      });
      setProjects(data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLabs = async () => {
    try {
      const data = await labsApi.list({});
      setLabs(data);
      if (data.length > 0 && !formData.lab_code) {
        setFormData((prev) => ({ ...prev, lab_code: data[0].lab_code }));
      }
    } catch (err) {
      console.warn('Failed to fetch labs for dropdown:', err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [search, statusFilter, labFilter]);

  useEffect(() => {
    loadLabs();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setActiveProj(null);
    setFormData({
      project_id: '',
      project_name: '',
      project_description: '',
      team_leads_count: 1,
      duration_months: 24,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      project_status: 'Ongoing',
      lab_code: labs[0]?.lab_code || '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (proj) => {
    setIsEditing(true);
    setActiveProj(proj);
    setFormData({
      project_id: proj.project_id,
      project_name: proj.project_name,
      project_description: proj.project_description || '',
      team_leads_count: proj.team_leads_count,
      duration_months: proj.duration_months,
      start_date: proj.start_date || '',
      end_date: proj.end_date || '',
      project_status: proj.project_status || 'Ongoing',
      lab_code: proj.lab_code,
    });
    setModalOpen(true);
  };

  const handleOpenDetail = async (proj) => {
    try {
      const full = await projectsApi.get(proj.project_id);
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
      if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
        throw new Error('Project end date cannot be earlier than start date');
      }

      const payload = {
        project_name: formData.project_name,
        project_description: formData.project_description || undefined,
        team_leads_count: parseInt(formData.team_leads_count, 10),
        duration_months: parseInt(formData.duration_months, 10),
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        project_status: formData.project_status,
        lab_code: parseInt(formData.lab_code, 10),
      };

      if (isEditing) {
        await projectsApi.update(activeProj.project_id, payload);
        addToast('Project updated successfully', 'success');
      } else {
        if (formData.project_id) {
          payload.project_id = parseInt(formData.project_id, 10);
        }
        await projectsApi.create(payload);
        addToast('Project created successfully', 'success');
      }
      setModalOpen(false);
      loadProjects();
    } catch (err) {
      addToast(err.message || 'Operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!projToDelete) return;
    setActionLoading(true);
    try {
      await projectsApi.delete(projToDelete.project_id);
      addToast(`Project '${projToDelete.project_name}' deleted`, 'success');
      setDeleteConfirmOpen(false);
      loadProjects();
    } catch (err) {
      addToast(err.message || 'Could not delete project', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div>
      {/* Controls */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="Search project name, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: '150px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Planning">Planning</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            className="form-select"
            style={{ width: '180px' }}
            value={labFilter}
            onChange={(e) => setLabFilter(e.target.value)}
          >
            <option value="">All Laboratories</option>
            {labs.map((l) => (
              <option key={l.lab_code} value={l.lab_code}>
                {l.lab_name}
              </option>
            ))}
          </select>

          <button className="btn btn-secondary" onClick={loadProjects} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {canManage && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Projects Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Project Name</th>
              <th>Host Laboratory</th>
              <th>Duration</th>
              <th>Timeline</th>
              <th>Status</th>
              <th>Total Funding</th>
              <th>Teams</th>
              <th>Milestones</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Loading research projects from Oracle...
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No research projects found matching criteria.
                </td>
              </tr>
            ) : (
              projects.map((proj) => (
                <tr key={proj.project_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-dim)' }}>
                    #{proj.project_id}
                  </td>
                  <td style={{ fontWeight: 600, maxWidth: '240px' }}>
                    <div>{proj.project_name}</div>
                    {proj.project_description && (
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
                        {proj.project_description}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{proj.lab_name}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>{proj.discipline}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{proj.duration_months} mo</span>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    <div>{proj.start_date || '—'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>to {proj.end_date || 'Open'}</div>
                  </td>
                  <td>
                    <StatusBadge status={proj.project_status} />
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--primary-light)' }}>
                    {formatCurrency(proj.total_funding)}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{proj.team_count}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>
                      {proj.completed_milestones} / {proj.milestone_count}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenDetail(proj)}
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>
                      {canManage && (
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenEdit(proj)}
                          title="Edit Project"
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="btn-icon"
                          onClick={() => {
                            setProjToDelete(proj);
                            setDeleteConfirmOpen(true);
                          }}
                          title="Delete Project"
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

      {/* Modal: Add/Edit Project */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? `Edit Project #${activeProj?.project_id}` : 'Create Research Project'}
        maxWidth={680}
      >
        <form onSubmit={handleSubmit}>
          {!isEditing && (
            <div className="form-group">
              <label className="form-label">Project ID (Optional - Auto-assigned if empty)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 206"
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Neural Prosthetics Interface V2"
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Project Description</label>
            <textarea
              className="form-textarea"
              placeholder="Summary of research scope, objectives, methodology..."
              value={formData.project_description}
              onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Host Laboratory *</label>
              <select
                required
                className="form-select"
                value={formData.lab_code}
                onChange={(e) => setFormData({ ...formData, lab_code: e.target.value })}
              >
                {labs.map((l) => (
                  <option key={l.lab_code} value={l.lab_code}>
                    {l.lab_name} ({l.discipline})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={formData.project_status}
                onChange={(e) => setFormData({ ...formData, project_status: e.target.value })}
              >
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Planning">Planning</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Team Leads Count (min 1) *</label>
              <input
                type="number"
                required
                min="1"
                className="form-input"
                value={formData.team_leads_count}
                onChange={(e) => setFormData({ ...formData, team_leads_count: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Duration (Months) *</label>
              <input
                type="number"
                required
                min="1"
                className="form-input"
                value={formData.duration_months}
                onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : isEditing ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Drawer */}
      <DetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={detailData?.project_name || 'Project Details'}
        subtitle={`Project ID: #${detailData?.project_id} • ${detailData?.lab_name}`}
      >
        {detailData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Total Grants Awarded
                </span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-light)' }}>
                  {formatCurrency(detailData.total_funding)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Status
                </span>
                <div style={{ marginTop: '2px' }}>
                  <StatusBadge status={detailData.project_status} />
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Timeline
                </span>
                <div style={{ fontSize: '12.5px', fontWeight: 500 }}>
                  {detailData.start_date || 'N/A'} &rarr; {detailData.end_date || 'Open'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Duration
                </span>
                <div style={{ fontSize: '12.5px', fontWeight: 500 }}>
                  {detailData.duration_months} Months ({detailData.team_leads_count} Leads)
                </div>
              </div>
            </div>

            {detailData.project_description && (
              <div>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>
                  Project Description
                </h4>
                <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                  {detailData.project_description}
                </p>
              </div>
            )}

            {/* Teams */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Users2 size={16} style={{ color: 'var(--accent-purple)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
                  Assigned Research Teams ({detailData.teams?.length || 0})
                </h3>
              </div>
              {detailData.teams?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No teams assigned.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detailData.teams?.map((t) => (
                    <div
                      key={t.team_id}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{t.team_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Lead: {t.team_lead_name} ({t.team_lead_email})
                        </div>
                      </div>
                      <span className="badge badge-secondary">{t.team_size} Members</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grants */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Coins size={16} style={{ color: 'var(--accent-amber)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
                  Received Grants ({detailData.grants?.length || 0})
                </h3>
              </div>
              {detailData.grants?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No grants received.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detailData.grants?.map((g) => (
                    <div
                      key={g.grant_id}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{g.grant_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {g.funding_source_name} ({g.funding_type}) &bull; {g.grant_date}
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {formatCurrency(g.grant_amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Milestones */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Flag size={16} style={{ color: 'var(--accent-rose)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
                  Project Milestones ({detailData.milestones?.length || 0})
                </h3>
              </div>
              {detailData.milestones?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No milestones created yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detailData.milestones?.map((m) => (
                    <div
                      key={m.milestone_id}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{m.milestone_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Target: {m.target_date || 'Open'}
                        </div>
                      </div>
                      <StatusBadge status={m.milestone_status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete '${projToDelete?.project_name}' (#${projToDelete?.project_id})? Note: If teams, grants, or milestones depend on this project, deletion will be blocked by Oracle constraints.`}
        confirmText="Confirm Delete"
        loading={actionLoading}
      />
    </div>
  );
}
