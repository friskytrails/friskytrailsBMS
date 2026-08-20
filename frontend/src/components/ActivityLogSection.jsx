import React from 'react';
import { Activity, CheckCircle, Clock, User, Mail, DollarSign, Edit } from 'lucide-react';

const ActivityLogSection = ({ logs }) => {
  const getLogIcon = (taskName) => {
    const name = taskName.toLowerCase();
    if (name.includes('payment')) return <DollarSign className="w-4 h-4 text-emerald-500" />;
    if (name.includes('mail') || name.includes('whatsapp')) return <Mail className="w-4 h-4 text-blue-500" />;
    if (name.includes('assign') || name.includes('user')) return <User className="w-4 h-4 text-purple-500" />;
    if (name.includes('edit') || name.includes('update')) return <Edit className="w-4 h-4 text-orange-500" />;
    if (name.includes('create')) return <CheckCircle className="w-4 h-4 text-indigo-500" />;
    return <Activity className="w-4 h-4 text-[#00A89E]" />;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col h-full min-h-[400px]">
      <h2 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-800 pb-2">
        <Activity className="w-5 h-5 text-[#00A89E]" />
        <span>Activity Logs</span>
      </h2>

      {logs && logs.length > 0 ? (
        <div className="flex-grow overflow-y-auto pr-2 space-y-6 max-h-[500px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <div className="relative border-l-2 border-slate-800 ml-3 space-y-6 pb-4">
            {logs.map((log, index) => {
              const isLast = index === logs.length - 1;
              return (
                <div key={log.id || index} className="relative pl-6">
                  {/* Timeline Dot with Icon */}
                  <div className={`absolute -left-[17px] top-0.5 w-8 h-8 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-sm ${
                    log.completed ? 'bg-slate-950' : 'bg-slate-900 border-dashed border-slate-700'
                  }`}>
                    {log.completed ? getLogIcon(log.taskName) : <Clock className="w-4 h-4 text-slate-500" />}
                  </div>

                  <div className="flex flex-col bg-slate-950/40 border border-slate-800 rounded-xl p-4 transition-all hover:bg-slate-950/60 shadow-sm">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className={`text-sm font-bold ${log.completed ? 'text-slate-200' : 'text-slate-400'}`}>
                        {log.taskName}
                      </h4>
                      {log.timestamp && (
                        <span className="text-[10px] text-slate-500 whitespace-nowrap bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                          {new Date(log.timestamp).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-2">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[11px] font-semibold text-slate-400">
                        {log.updatedBy || 'Auto / System'}
                      </span>
                    </div>

                    {!log.completed && (
                      <span className="inline-block mt-2 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 self-start">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10">
          <Activity className="w-8 h-8 opacity-30 mb-2" />
          <p className="text-xs">No activity logs available.</p>
        </div>
      )}
    </div>
  );
};

export default ActivityLogSection;
