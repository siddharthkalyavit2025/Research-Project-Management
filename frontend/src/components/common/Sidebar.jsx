import React from 'react';
import {
  LayoutDashboard,
  FlaskConical,
  Briefcase,
  Users2,
  Users,
  Coins,
  Award,
  Wrench,
  Flag,
  UserCog,
  User,
  LogOut,
  Database,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from './StatusBadge';

export default function Sidebar({ currentTab, setTab }) {
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'labs', label: 'Laboratories', icon: FlaskConical },
    { id: 'projects', label: 'Research Projects', icon: Briefcase },
    { id: 'researchers', label: 'Researchers', icon: Users },
    { id: 'teams', label: 'Research Teams', icon: Users2 },
    { id: 'funding', label: 'Funding Sources', icon: Coins },
    { id: 'grants', label: 'Grants', icon: Award },
    { id: 'equipment', label: 'Equipment', icon: Wrench },
    { id: 'milestones', label: 'Milestones', icon: Flag },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">
          <Database size={22} />
        </div>
        <div className="logo-text">
          <h1>Nexus Research</h1>
          <p>Oracle DBMS Lab</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Core Modules</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </div>
          );
        })}

        {isAdmin && (
          <>
            <div className="nav-section-title" style={{ marginTop: '12px' }}>
              Administration
            </div>
            <div
              className={`nav-item ${currentTab === 'users' ? 'active' : ''}`}
              onClick={() => setTab('users')}
            >
              <UserCog size={18} />
              <span>User Management</span>
            </div>
          </>
        )}

        <div className="nav-section-title" style={{ marginTop: '12px' }}>
          Personal
        </div>
        <div
          className={`nav-item ${currentTab === 'profile' ? 'active' : ''}`}
          onClick={() => setTab('profile')}
        >
          <User size={18} />
          <span>My Profile</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-mini-card">
          <div className="avatar">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div className="user-details" style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.full_name}
            </div>
            <div style={{ marginTop: '3px' }}>
              <RoleBadge role={user?.role} />
            </div>
          </div>
          <button
            className="btn-icon"
            onClick={logout}
            title="Logout"
            style={{ width: '30px', height: '30px' }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
