import React from 'react';
import { User, ShieldCheck, Mail, Database, Check, X, Calendar, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from '../components/common/StatusBadge';

export default function ProfilePage() {
  const { user, isAdmin, isLabManager, isResearcher } = useAuth();

  const permissions = [
    { module: 'View Dashboard & Aggregates', admin: true, manager: true, researcher: true },
    { module: 'View Labs, Projects, Researchers', admin: true, manager: true, researcher: true },
    { module: 'Create & Edit Laboratories', admin: true, manager: true, researcher: false },
    { module: 'Create & Edit Projects', admin: true, manager: true, researcher: false },
    { module: 'Create & Edit Teams', admin: true, manager: true, researcher: false },
    { module: 'Manage Equipment & Availability', admin: true, manager: true, researcher: false },
    { module: 'Update Project Milestones', admin: true, manager: true, researcher: true },
    { module: 'Award Grants & Manage Funding', admin: true, manager: true, researcher: false },
    { module: 'Delete Records (Labs, Projects, etc.)', admin: true, manager: false, researcher: false },
    { module: 'User & Security Administration', admin: true, manager: false, researcher: false },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* User Info Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 700,
              color: 'white',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
            }}
          >
            {user?.full_name?.charAt(0) || 'U'}
          </div>

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700 }}>{user?.full_name}</h2>
              <RoleBadge role={user?.role} />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginTop: '4px' }}>
              {user?.email}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                padding: '8px 14px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Account ID
              </div>
              <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>#{user?.user_id}</div>
            </div>

            <div
              style={{
                padding: '8px 14px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Linked Scientist
              </div>
              <div style={{ fontWeight: 600, color: user?.researcher_name ? 'var(--accent-cyan)' : 'var(--text-dim)' }}>
                {user?.researcher_name || 'Independent'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Permissions Matrix */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Role-Based Access Control (RBAC) Permissions Matrix</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Active Role: <strong style={{ color: 'white' }}>{user?.role}</strong>
          </span>
        </div>

        <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Operation / Capability</th>
                <th style={{ textAlign: 'center' }}>Admin</th>
                <th style={{ textAlign: 'center' }}>Lab Manager</th>
                <th style={{ textAlign: 'center' }}>Researcher</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((p, idx) => {
                const isUserAllowed =
                  (isAdmin && p.admin) || (isLabManager && p.manager) || (isResearcher && p.researcher);
                return (
                  <tr
                    key={idx}
                    style={{
                      background: isUserAllowed ? 'rgba(99, 102, 241, 0.03)' : 'transparent',
                    }}
                  >
                    <td style={{ fontWeight: 500 }}>{p.module}</td>
                    <td style={{ textAlign: 'center' }}>
                      {p.admin ? (
                        <Check size={16} style={{ color: 'var(--accent-emerald)', margin: '0 auto' }} />
                      ) : (
                        <X size={16} style={{ color: 'var(--text-dim)', margin: '0 auto' }} />
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {p.manager ? (
                        <Check size={16} style={{ color: 'var(--accent-emerald)', margin: '0 auto' }} />
                      ) : (
                        <X size={16} style={{ color: 'var(--text-dim)', margin: '0 auto' }} />
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {p.researcher ? (
                        <Check size={16} style={{ color: 'var(--accent-emerald)', margin: '0 auto' }} />
                      ) : (
                        <X size={16} style={{ color: 'var(--text-dim)', margin: '0 auto' }} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Architecture & Oracle Status */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '14px' }}>
          System Environment & Database Architecture
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Database Server</div>
            <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>Oracle Database 11.2 XE</div>
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Oracle Connectivity</div>
            <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>python-oracledb 2.6 (Thick mode)</div>
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Password Cryptography</div>
            <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>Argon2id (RFC 9106)</div>
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Backend Framework</div>
            <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>FastAPI + Pydantic v2</div>
          </div>
        </div>
      </div>
    </div>
  );
}
