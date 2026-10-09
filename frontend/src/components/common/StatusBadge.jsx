import React from 'react';

export default function StatusBadge({ status, type }) {
  if (!status) return null;

  const normalized = status.toString().toLowerCase().trim();

  let badgeClass = 'badge-secondary';

  if (['active', 'completed', 'available', 'done'].includes(normalized)) {
    badgeClass = 'badge-success';
  } else if (['ongoing', 'in progress', 'in-progress'].includes(normalized)) {
    badgeClass = 'badge-info';
  } else if (['pending', 'planning', 'under maintenance', 'maintenance'].includes(normalized)) {
    badgeClass = 'badge-warning';
  } else if (['cancelled', 'overdue', 'inactive', 'retired', 'in use'].includes(normalized)) {
    badgeClass = normalized === 'in use' ? 'badge-info' : 'badge-danger';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}></span>
      {status}
    </span>
  );
}

export function RoleBadge({ role }) {
  if (!role) return null;
  const normalized = role.toLowerCase().replace(/\s+/g, '-');
  return (
    <span className={`role-badge ${normalized}`}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}></span>
      {role}
    </span>
  );
}
