import React, { useState, useEffect } from 'react';
import {
  Users2,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  User,
  Briefcase,
} from 'lucide-react';
import { teamsApi, researchersApi, projectsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Modal, ConfirmDialog } from '../components/common/Modal';

export default function TeamsPage({ addToast }) {
  const { canManage, isAdmin } = useAuth();
  const [teams, setTeams] = useState([]);
  const [researchers, setResearchers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTeam, setActiveTeam] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    team_id: '',
    team_name: '',
    team_size: 5,
    team_lead_id: '',
    project_id: '',
  });

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await teamsApi.list({ search: search || undefined });
      setTeams(data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch teams', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [resList, projList] = await Promise.all([
        researchersApi.list({}),
        projectsApi.list({}),
      ]);
      setResearchers(resList);
      setProjects(projList);
      if (resList.length > 0 && projList.length > 0) {
        setFormData((prev) => ({
          ...prev,
          team_lead_id: resList[0].researcher_id,
          project_id: projList[0].project_id,
        }));
      }
    } catch (err) {
      console.warn('Failed to load dependency dropdowns:', err);
    }
  };

  useEffect(() => {
    loadTeams();
  }, [search]);

  useEffect(() => {
    loadDependencies();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setActiveTeam(null);
    setFormData({
      team_id: '',
      team_name: '',
      team_size: 6,
      team_lead_id: researchers[0]?.researcher_id || '',
      project_id: projects[0]?.project_id || '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setIsEditing(true);
    setActiveTeam(t);
    setFormData({
      team_id: t.team_id,
      team_name: t.team_name,
      team_size: t.team_size,
      team_lead_id: t.team_lead_id,
      project_id: t.project_id,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        team_name: formData.team_name,
        team_size: parseInt(formData.team_size, 10),
        team_lead_id: parseInt(formData.team_lead_id, 10),
        project_id: parseInt(formData.project_id, 10),
      };

      if (isEditing) {
        await teamsApi.update(activeTeam.team_id, payload);
        addToast('Team updated successfully', 'success');
      } else {
        if (formData.team_id) {
          payload.team_id = parseInt(formData.team_id, 10);
        }
        await teamsApi.create(payload);
        addToast('Team created successfully', 'success');
      }
      setModalOpen(false);
      loadTeams();
    } catch (err) {
      addToast(err.message || 'Operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!teamToDelete) return;
    setActionLoading(true);
    try {
      await teamsApi.delete(teamToDelete.team_id);
      addToast(`Team '${teamToDelete.team_name}' deleted`, 'success');
      setDeleteConfirmOpen(false);
      loadTeams();
    } catch (err) {
      addToast(err.message || 'Could not delete team', 'error');
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
            placeholder="Search team name, lead, project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={loadTeams} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {canManage && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>Create Research Team</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Team Name</th>
              <th>Team Size</th>
              <th>Team Lead Researcher</th>
              <th>Assigned Research Project</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Loading research teams...
                </td>
              </tr>
            ) : teams.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No research teams found.
                </td>
              </tr>
            ) : (
              teams.map((t) => (
                <tr key={t.team_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-dim)' }}>
                    #{t.team_id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{t.team_name}</td>
                  <td>
                    <span className="badge badge-info">{t.team_size} Scientists</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.team_lead_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.team_lead_email}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{t.project_name}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {canManage && (
                        <button className="btn-icon" onClick={() => handleOpenEdit(t)} title="Edit Team">
                          <Edit2 size={15} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="btn-icon"
                          onClick={() => {
                            setTeamToDelete(t);
                            setDeleteConfirmOpen(true);
                          }}
                          title="Delete Team"
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
        title={isEditing ? `Edit Team #${activeTeam?.team_id}` : 'Create Research Team'}
      >
        <form onSubmit={handleSubmit}>
          {!isEditing && (
            <div className="form-group">
              <label className="form-label">Team ID (Optional)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 406"
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Team Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Genomic Sequencing Group"
              value={formData.team_name}
              onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Team Size (min 1) *</label>
            <input
              type="number"
              required
              min="1"
              className="form-input"
              value={formData.team_size}
              onChange={(e) => setFormData({ ...formData, team_size: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Lead Researcher *</label>
            <select
              required
              className="form-select"
              value={formData.team_lead_id}
              onChange={(e) => setFormData({ ...formData, team_lead_id: e.target.value })}
            >
              {researchers.map((r) => (
                <option key={r.researcher_id} value={r.researcher_id}>
                  {r.researcher_name} ({r.researcher_role}) - {r.email}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Research Project *</label>
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
              {actionLoading ? 'Saving...' : isEditing ? 'Update Team' : 'Save Team'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Team"
        message={`Delete '${teamToDelete?.team_name}'?`}
        confirmText="Confirm Delete"
        loading={actionLoading}
      />
    </div>
  );
}
