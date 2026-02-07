import React from 'react';
import type { Project } from '../types';


interface Event {
  start: string;
  end: string;
  title: string;
  type: string;
}

interface AdminAgendaWidgetProps {
  projects: Project[];
  allEvents?: Event[];
}

const AdminAgendaWidget: React.FC<AdminAgendaWidgetProps> = ({ projects, allEvents }) => {
  const events = allEvents ?? projects.flatMap(p => p.agenda || []);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
      <div className="space-y-6">
        {events.length > 0 ? (
          events.map((event, idx) => {
            const eventDate = new Date(event.start);
            return (
              <div key={idx} className="flex gap-4 group cursor-pointer">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-[9px] font-bold text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <span>{eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
                    <span className="text-xs leading-tight">{eventDate.getDate()}</span>
                  </div>
                  {idx < events.length - 1 && <div className="w-[1px] flex-1 bg-slate-100 mt-2"></div>}
                </div>
                <div className="pb-6">
                  <p className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{event.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                    {new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} -
                    {new Date(event.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                  <div className="mt-2">
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">{event.type}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center py-12 text-slate-400 italic text-xs font-medium">No appointments scheduled.</p>
        )}
      </div>
    </div>
  );
};

export default AdminAgendaWidget;

