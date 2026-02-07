import * as React from 'react';

interface AdminStatsGridProps {
  stats: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
  }[];
}

const AdminStatsGrid: React.FC<AdminStatsGridProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
            {stat.icon}
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

export default AdminStatsGrid;

