import React from 'react';
import { Database, ShieldCheck, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from './StatusBadge';

const tabTitles = {
  dashboard: 'Executive Dashboard & Metrics',
  labs: 'Research Laboratories Management',
  projects: 'Research Projects Portfolio',
  researchers: 'Researchers Directory',
  teams: 'Research Teams & Project Leads',
  funding: 'Funding Sources & Sponsors',
  grants: 'Research Grants & Awards',
  equipment: 'Laboratory Equipment & Instruments',
  milestones: 'Project Milestones & Deliverables',
  users: 'System User Administration',
  profile: 'Account Profile & Researcher Identity',
};

export default function Navbar({ currentTab, onRefresh, isRefreshing }) {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h1 className="page-title">{tabTitles[currentTab] || 'Management Portal'}</h1>
      </div>

      <div className="navbar-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <Database size={13} />
            <span>Oracle 11g XE Connected</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <RoleBadge role={user?.role} />
          <button
            className="btn btn-secondary"
            onClick={logout}
            style={{ padding: '6px 12px', fontSize: '12.5px' }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
