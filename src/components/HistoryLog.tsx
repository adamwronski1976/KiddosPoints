import React from 'react';
import { HistoryEntry, User } from '../types';
import { History, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface Props {
  history: HistoryEntry[];
  users: User[];
}

export const HistoryLog: React.FC<Props> = ({ history, users }) => {
  const userName = (entityId: string) => {
    const user = users.find(u => u.haEntityId === entityId);
    return user ? user.name : entityId;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
        <History className="w-6 h-6 text-slate-600" />
        <h2 className="text-lg font-semibold text-slate-800">Historia zmian punktów</h2>
      </div>

      <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
        {history.length === 0 ? (
          <div className="p-6 text-sm text-slate-400 italic text-center">
            Brak zapisanych zmian punktów. Historia wypełnia się przy wykonanych zadaniach, akceptacjach i odebranych nagrodach.
          </div>
        ) : (
          history.map(entry => (
            <div key={entry.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50">
              {entry.delta >= 0 ? (
                <ArrowUpCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              ) : (
                <ArrowDownCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">
                  {userName(entry.user)} — {entry.reason}
                </div>
                <div className="text-xs text-slate-400">{formatTime(entry.timestamp)}</div>
              </div>
              <div className={`text-sm font-bold ${entry.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {entry.delta >= 0 ? '+' : ''}{entry.delta} pkt
              </div>
              <div className="text-xs text-slate-400 w-20 text-right">= {entry.new_total} pkt</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
