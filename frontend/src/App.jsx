import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LabsPage from './pages/LabsPage';
import ProjectsPage from './pages/ProjectsPage';
import ResearchersPage from './pages/ResearchersPage';
import TeamsPage from './pages/TeamsPage';
import FundingPage from './pages/FundingPage';
import GrantsPage from './pages/GrantsPage';
import EquipmentPage from './pages/EquipmentPage';
import MilestonesPage from './pages/MilestonesPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';

import Sidebar from './components/common/Sidebar';
import Navbar from './components/common/Navbar';
import { ToastContainer } from './components/common/DetailDrawer';

export default function App() {
  const { isAuthenticated, loading, isAdmin } = useAuth();
  const [currentTab, setTab] = useState('dashboard');
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', title = '') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          color: 'var(--text-muted)',
          fontSize: '15px',
        }}
      >
        Initializing secure connection to Oracle Database...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  const renderActivePage = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage setTab={setTab} addToast={addToast} />;
      case 'labs':
        return <LabsPage addToast={addToast} />;
      case 'projects':
        return <ProjectsPage addToast={addToast} />;
      case 'researchers':
        return <ResearchersPage addToast={addToast} />;
      case 'teams':
        return <TeamsPage addToast={addToast} />;
      case 'funding':
        return <FundingPage addToast={addToast} />;
      case 'grants':
        return <GrantsPage addToast={addToast} />;
      case 'equipment':
        return <EquipmentPage addToast={addToast} />;
      case 'milestones':
        return <MilestonesPage addToast={addToast} />;
      case 'users':
        return isAdmin ? <UsersPage addToast={addToast} /> : <DashboardPage setTab={setTab} addToast={addToast} />;
      case 'profile':
        return <ProfilePage addToast={addToast} />;
      default:
        return <DashboardPage setTab={setTab} addToast={addToast} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} setTab={setTab} />
      <div className="main-content">
        <Navbar currentTab={currentTab} />
        <main className="page-wrapper">
          {renderActivePage()}
        </main>
      </div>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
