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
  // Check if user has admin/agent privileges
  const isAdminOrAgent = user.role === UserRole.ADMIN || user.role === UserRole.AGENT;

  if (isAdminOrAgent) {
    return (
      <AdminDashboard
        projects={projects}
        user={user}
        allUsers={allUsers}
        taskTemplates={taskTemplates}
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
