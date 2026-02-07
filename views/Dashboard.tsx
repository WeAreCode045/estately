import React from 'react';
import type { Project, TaskTemplate, User } from '../types';
import { UserRole } from '../types';
import AdminDashboard from './AdminDashboard';
import UserDashboard from './UserDashboard';

interface DashboardProps {
  projects: Project[];
  user: User;
  allUsers: User[];
  taskTemplates?: TaskTemplate[];
  onRefresh?: () => void;
}

/**
 * DashboardRouter - Routes to the appropriate dashboard based on user role
 *
 * Admin/Agent users get the full Agency Dashboard with project management capabilities
 * Seller/Buyer users get a simplified Client Dashboard focused on their personal project
 */
const Dashboard: React.FC<DashboardProps> = ({
  projects,
  user,
  allUsers,
  taskTemplates,
  onRefresh
}) => {
  // Debug: Log user role for troubleshooting
  React.useEffect(() => {
    console.log('Dashboard User Role:', user.role, 'Type:', typeof user.role);
    console.log('UserRole.ADMIN:', UserRole.ADMIN);
    console.log('Match:', user.role === UserRole.ADMIN);
  }, [user.role]);

  // Check if user has admin/agent privileges
  // Handle both enum values and string values (case-insensitive)
  const userRoleStr = typeof user.role === 'string' ? user.role.toLowerCase() : '';
  const isAdminOrAgent =
    user.role === UserRole.ADMIN ||
    user.role === UserRole.AGENT ||
    userRoleStr === 'admin' ||
    userRoleStr === 'agent';

  if (isAdminOrAgent) {
    return (
      <AdminDashboard
        projects={projects}
        user={user}
        allUsers={allUsers}
        taskTemplates={taskTemplates}
        onRefresh={onRefresh}
      />
    );
  }

  // For SELLER and BUYER roles, show the user dashboard
  if (user.role === UserRole.SELLER || user.role === UserRole.BUYER) {
    return (
      <UserDashboard
        projects={projects}
        user={user}
        allUsers={allUsers}
        taskTemplates={taskTemplates}
        onRefresh={onRefresh}
      />
    );
  }

  // Fallback: If role is unknown, default to user dashboard
  return (
    <UserDashboard
      projects={projects}
      user={user}
      allUsers={allUsers}
      taskTemplates={taskTemplates}
      onRefresh={onRefresh}
    />
  );
};

export default Dashboard;
