import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  Briefcase,
  Users2,
} from 'lucide-react';
import { researchersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { DetailDrawer } from '../components/common/DetailDrawer';

export default function ResearchersPage({ addToast }) {
  const { canManage, isAdmin } = useAuth();
  const [researchers, setResearchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeRes, setActiveRes] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resToDelete, setResToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    researcher_id: '',
    researcher_name: '',
    email: '',
    specialization: '',
    contact_number: '',
    researcher_role: 'Researcher',
  });

  const loadResearchers = async () => {
    setLoading(true);
    try {
      const data = await researchersApi.list({
        search: search || undefined,
        role: roleFilter || undefined,
      });
      setResearchers(data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch researchers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResearchers();
  }, [search, roleFilter]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setActiveRes(null);
    setFormData({
      researcher_id: '',
      researcher_name: '',
      email: '',
      specialization: '',
      contact_number: '',
      researcher_role: 'Researcher',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (res) => {
    setIsEditing(true);
    setActiveRes(res);
    setFormData({
      researcher_id: res.researcher_id,
      researcher_name: res.researcher_name,
      email: res.email,
      specialization: res.specialization || '',
      contact_number: res.contact_number || '',
      researcher_role: res.researcher_role || 'Researcher',
    });
    setModalOpen(true);
  };

  const handleOpenDetail = async (res) => {
    try {
      const full = await researchersApi.get(res.researcher_id);
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
      const payload = {
        researcher_name: formData.researcher_name,
        email: formData.email,
        specialization: formData.specialization || undefined,
        contact_number: formData.contact_number || undefined,
        researcher_role: formData.researcher_role,
      };

      if (isEditing) {
        await researchersApi.update(activeRes.researcher_id, payload);
        addToast('Researcher updated successfully', 'success');
      } else {
        if (formData.researcher_id) {
          payload.researcher_id = parseInt(formData.researcher_id, 10);
        }
        await researchersApi.create(payload);
        addToast('Researcher added successfully', 'success');
      }
      setModalOpen(false);
      loadResearchers();
    } catch (err) {
      addToast(err.message || 'Operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!resToDelete) return;
    setActionLoading(true);
    try {
      await researchersApi.delete(resToDelete.researcher_id);
      addToast(`Researcher '${resToDelete.researcher_name}' deleted`, 'success');
      setDeleteConfirmOpen(false);
      loadResearchers();
    } catch (err) {
      addToast(err.message || 'Could not delete researcher', 'error');
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
            placeholder="Search name, specialization, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: '180px' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="Lead Researcher">Lead Researcher</option>
            <option value="Senior Researcher">Senior Researcher</option>
            <option value="Researcher">Researcher</option>
          </select>

          <button className="btn btn-secondary" onClick={loadResearchers} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {canManage && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>Add Researcher</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Specialization</th>
              <th>Contact Number</th>
              <th>Role</th>
              <th>Teams Led</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Loading researchers...
                </td>
              </tr>
            ) : researchers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No researchers found.
                </td>
              </tr>
            ) : (
              researchers.map((res) => (
                <tr key={res.researcher_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-dim)' }}>
                    #{res.researcher_id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{res.researcher_name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{res.email}</td>
                  <td>
                    <span className="badge badge-info">{res.specialization || 'General'}</span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
                    {res.contact_number || '—'}
                  </td>
                  <td>
                    <span className="badge badge-secondary">{res.researcher_role}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{res.teams_led_count}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button className="btn-icon" onClick={() => handleOpenDetail(res)} title="View Profile">
                        <Eye size={15} />
                      </button>
                      {canManage && (
                        <button className="btn-icon" onClick={() => handleOpenEdit(res)} title="Edit">
                          <Edit2 size={15} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="btn-icon"
                          onClick={() => {
                            setResToDelete(res);
                            setDeleteConfirmOpen(true);
                          }}
                          title="Delete"
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
        title={isEditing ? `Edit Researcher #${activeRes?.researcher_id}` : 'Add Researcher'}
      >
        <form onSubmit={handleSubmit}>
          {!isEditing && (
            <div className="form-group">
              <label className="form-label">Researcher ID (Optional - Auto-assigned)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 306"
                value={formData.researcher_id}
                onChange={(e) => setFormData({ ...formData, researcher_id: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Dr. Maya Angelou"
              value={formData.researcher_name}
              onChange={(e) => setFormData({ ...formData, researcher_name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="maya@research.org"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 9876500099"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Specialization</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Molecular Biology"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Researcher Role</label>
              <select
                className="form-select"
                value={formData.researcher_role}
                onChange={(e) => setFormData({ ...formData, researcher_role: e.target.value })}
              >
                <option value="Lead Researcher">Lead Researcher</option>
                <option value="Senior Researcher">Senior Researcher</option>
                <option value="Researcher">Researcher</option>
                <option value="Postdoc Fellow">Postdoc Fellow</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : isEditing ? 'Update Profile' : 'Save Researcher'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Drawer */}
      <DetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={detailData?.researcher_name || 'Researcher Profile'}
        subtitle={`ID: #${detailData?.researcher_id} • ${detailData?.researcher_role}`}
      >
        {detailData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                  Email
                </span>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{detailData.email}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Contact
                </span>
                <div style={{ fontWeight: 500, fontSize: '13px' }}>{detailData.contact_number || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Field / Specialization
                </span>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--accent-cyan)' }}>
                  {detailData.specialization || 'Not Specified'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Teams Led
                </span>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{detailData.teams_led_count} teams</div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Users2 size={16} style={{ color: 'var(--accent-purple)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Teams Led by This Scientist</h3>
              </div>
              {detailData.teams?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>This researcher is not leading any team.</p>
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
                          Project: {t.project_name}
                        </div>
                      </div>
                      <span className="badge badge-secondary">{t.team_size} members</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DetailDrawer>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Researcher"
        message={`Delete ${resToDelete?.researcher_name}? Note: If this researcher leads teams, deletion will be safely rejected by Oracle FK constraints.`}
        confirmText="Confirm Delete"
        loading={actionLoading}
      />
    </div>
  );
}
