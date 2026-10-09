import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Briefcase,
  Users,
  Users2,
  Coins,
  Award,
  Wrench,
  Flag,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Building,
} from 'lucide-react';
import { dashboardApi } from '../api/client';
import StatusBadge from '../components/common/StatusBadge';

export default function DashboardPage({ setTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardApi.get();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 16px' }} />
        <p>Loading real-time analytics from Oracle Database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <AlertTriangle size={36} style={{ color: 'var(--accent-rose)', margin: '0 auto 12px' }} />
        <h3 style={{ marginBottom: '8px' }}>Failed to Load Dashboard</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error}</p>
        <button className="btn btn-primary" onClick={loadData}>
          Try Again
        </button>
      </div>
    );
  }

  const { counts, project_status, milestone_status, lab_budgets, recent_projects, upcoming_milestones, funding_by_type } = data || {};

  return (
    <div>
      {/* Header bar with refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>System Overview</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Live aggregated metrics and laboratory performance statistics
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={loadData}
          disabled={loading}
          style={{ fontSize: '12.5px' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Top Highlight Financial Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(17, 24, 39, 0.85))',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--primary-light)', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Active Grant Funding
              </p>
              <h2 style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px' }}>
                {formatCurrency(counts?.total_funding_amount)}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Across {counts?.total_grants} allocated research grants
              </p>
            </div>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-light)',
              }}
            >
              <Coins size={28} />
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(17, 24, 39, 0.85))',
            border: '1px solid rgba(6, 182, 212, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Allocated Lab Budget
              </p>
              <h2 style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px' }}>
                {formatCurrency(counts?.total_allocated_budget)}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Distributed across {counts?.total_labs} operational laboratories
              </p>
            </div>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'rgba(6, 182, 212, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <Building size={28} />
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(17, 24, 39, 0.85))',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--accent-emerald)', textTransform: 'uppercase', fontWeight: 600 }}>
                Research Personnel & Teams
              </p>
              <h2 style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px' }}>
                {counts?.total_researchers}{' '}
                <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-muted)' }}>
                  Scientists
                </span>
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Organized into {counts?.total_teams} collaborative research teams
              </p>
            </div>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-emerald)',
              }}
            >
              <Users size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => setTab('labs')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <p>Laboratories</p>
            <h2>{counts?.total_labs}</h2>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <FlaskConical size={24} />
          </div>
        </div>

        <div className="stat-card" onClick={() => setTab('projects')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <p>Projects</p>
            <h2>{counts?.total_projects}</h2>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
            <Briefcase size={24} />
          </div>
        </div>

        <div className="stat-card" onClick={() => setTab('researchers')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <p>Researchers</p>
            <h2>{counts?.total_researchers}</h2>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card" onClick={() => setTab('teams')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <p>Teams</p>
            <h2>{counts?.total_teams}</h2>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
            <Users2 size={24} />
          </div>
        </div>

        <div className="stat-card" onClick={() => setTab('funding')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <p>Funding Sponsors</p>
            <h2>{counts?.total_funding_sources}</h2>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Coins size={24} />
          </div>
        </div>

        <div className="stat-card" onClick={() => setTab('grants')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <p>Grants Awarded</p>
            <h2>{counts?.total_grants}</h2>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
            <Award size={24} />
          </div>
        </div>

        <div className="stat-card" onClick={() => setTab('equipment')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <p>Equipment Units</p>
            <h2>{counts?.total_equipment}</h2>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' }}>
            <Wrench size={24} />
          </div>
        </div>

        <div className="stat-card" onClick={() => setTab('milestones')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <p>Project Milestones</p>
            <h2>{counts?.total_milestones}</h2>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' }}>
            <Flag size={24} />
          </div>
        </div>
      </div>

      {/* Analytics Breakdown Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Project Status Chart Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Project Status Portfolio</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {counts?.total_projects} total
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }}></span>
                  Ongoing Projects
                </span>
                <span style={{ fontWeight: 600 }}>{project_status?.ongoing || 0}</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${counts?.total_projects ? ((project_status?.ongoing || 0) / counts.total_projects) * 100 : 0}%`,
                    background: '#6366f1',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }}></span>
                  Completed Projects
                </span>
                <span style={{ fontWeight: 600 }}>{project_status?.completed || 0}</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${counts?.total_projects ? ((project_status?.completed || 0) / counts.total_projects) * 100 : 0}%`,
                    background: '#10b981',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }}></span>
                  Planning
                </span>
                <span style={{ fontWeight: 600 }}>{project_status?.planning || 0}</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${counts?.total_projects ? ((project_status?.planning || 0) / counts.total_projects) * 100 : 0}%`,
                    background: '#f59e0b',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f43f5e' }}></span>
                  Cancelled
                </span>
                <span style={{ fontWeight: 600 }}>{project_status?.cancelled || 0}</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${counts?.total_projects ? ((project_status?.cancelled || 0) / counts.total_projects) * 100 : 0}%`,
                    background: '#f43f5e',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Health Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Milestone Progress & Health</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {counts?.total_milestones} milestones
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px' }}>
            <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ color: '#34d399', fontSize: '12px', fontWeight: 600 }}>Completed</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>{milestone_status?.completed || 0}</div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <div style={{ color: '#818cf8', fontSize: '12px', fontWeight: 600 }}>In Progress</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>{milestone_status?.in_progress || 0}</div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 600 }}>Pending</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>{milestone_status?.pending || 0}</div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(244, 63, 94, 0.08)', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
              <div style={{ color: '#fb7185', fontSize: '12px', fontWeight: 600 }}>Overdue</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>{milestone_status?.overdue || 0}</div>
            </div>
          </div>
        </div>

        {/* Funding by Type Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Funding by Sponsor Type</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Distribution
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {funding_by_type?.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{item.funding_type}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {item.grant_count} Grant{item.grant_count > 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--primary-light)', fontSize: '14px' }}>
                  {formatCurrency(item.total_amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Columns: Lab Budgets & Upcoming Milestones */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Lab Budgets Summary */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Laboratory Budgets & Capacity</h3>
            <button
              className="btn btn-secondary"
              onClick={() => setTab('labs')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              View Labs
            </button>
          </div>

          <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Laboratory</th>
                  <th>Discipline</th>
                  <th>Allocated Budget</th>
                  <th>Projects</th>
                  <th>Equipment</th>
                </tr>
              </thead>
              <tbody>
                {lab_budgets?.map((lab) => (
                  <tr key={lab.lab_code}>
                    <td style={{ fontWeight: 600 }}>{lab.lab_name}</td>
                    <td>
                      <span className="badge badge-secondary">{lab.discipline}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {formatCurrency(lab.allocated_budget)}
                    </td>
                    <td>{lab.project_count}</td>
                    <td>{lab.equipment_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Upcoming Target Milestones</h3>
            <button
              className="btn btn-secondary"
              onClick={() => setTab('milestones')}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              View All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upcoming_milestones?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                No pending milestones.
              </p>
            ) : (
              upcoming_milestones?.map((m) => (
                <div
                  key={m.milestone_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: m.is_overdue ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                        color: m.is_overdue ? '#fb7185' : '#818cf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Flag size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{m.milestone_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {m.project_name} &bull; {m.lab_name}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {m.target_date || 'No Date'}
                    </div>
                    <div style={{ marginTop: '2px' }}>
                      {m.is_overdue ? (
                        <span className="badge badge-danger">Overdue</span>
                      ) : (
                        <StatusBadge status={m.milestone_status} />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
