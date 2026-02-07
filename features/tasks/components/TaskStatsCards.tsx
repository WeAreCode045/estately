import { Bell, CheckSquare, Clock } from 'lucide-react';
import React from 'react';

interface TaskStatsCardsProps {
  overdueCount: number;
  dueSoonCount: number;
  totalPendingCount: number;
}

/**
 * TaskStatsCards - Display task statistics
 *
 * Pure presentational component
 */
const TaskStatsCards: React.FC<TaskStatsCardsProps> = ({
  overdueCount,
  dueSoonCount,
  totalPendingCount
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatsCard
        icon={<Clock size={20}/>}
        label="Overdue"
        count={overdueCount}
        color="red"
      />
      <StatsCard
        icon={<Bell size={20}/>}
        label="Due Soon"
        count={dueSoonCount}
        color="blue"
      />
      <StatsCard
        icon={<CheckSquare size={20}/>}
        label="Total Pending"
        count={totalPendingCount}
        color="amber"
      />
    </div>
  );
};

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: 'blue' | 'red' | 'amber';
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, label, count, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100'
  };

  return (
    <div className={`p-6 border rounded-3xl ${colors[color]} flex items-center justify-between`}>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white/50 rounded-2xl shadow-sm">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
            {label}
          </p>
          <p className="text-2xl font-black">{count}</p>
        </div>
      </div>
    </div>
  );
};

export default TaskStatsCards;
