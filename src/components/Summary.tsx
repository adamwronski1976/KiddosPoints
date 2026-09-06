import React from 'react';
import { Completions, TaskRow, Task, User, OverdueItem } from '../types';
import { Award, CalendarClock } from 'lucide-react';

interface SummaryProps {
  tasks: Task[];
  taskRows: Record<string, TaskRow[]>;
  completions: Completions;
  users: User[];
  overdue?: OverdueItem[];
}

export const Summary: React.FC<SummaryProps> = ({ tasks, taskRows, completions, users, overdue = [] }) => {
  const overdueByUser = (haEntityId: string) => overdue.filter(o => o.user === haEntityId);
  const getPersonData = (user: User) => {
    const personTasks: Task[] = [];
    let earned = 0;

    tasks.forEach(task => {
      const rows = taskRows[task.id] || [];
      const pointsVal = task.points;
      let isApplicableToPerson = false;

      rows.forEach(row => {
        if (row.person === user.id || row.person === user.name) {
          isApplicableToPerson = true;
          for (let day = 1; day <= 31; day++) {
            if (completions[`${row.id}_${day}`]) {
              earned += pointsVal;
            }
          }
        }
      });

      if (isApplicableToPerson) {
        personTasks.push(task);
      }
    });

    return { tasks: personTasks, earned };
  };

  const renderCard = (user: User) => {
    const data = getPersonData(user);
    const myOverdue = overdueByUser(user.haEntityId);

    return (
      <div key={user.id} className="col-span-12 md:col-span-6 lg:col-span-3 bg-white rounded-lg p-5 border border-slate-200 flex flex-col shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
          <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
            {user.name}
            {myOverdue.length > 0 && (
              <span className="bg-red-100 text-red-700 text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <CalendarClock className="w-3 h-3" /> {myOverdue.length} zaległe
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-indigo-600">{data.earned} pkt</div>
          </div>
        </div>

        <div className="flex-1">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Przypisane Zadania ({data.tasks.length})</h4>
          <ul className="space-y-2 text-sm text-slate-600 max-h-[150px] overflow-y-auto pr-2">
            {data.tasks.length === 0 ? (
              <li className="text-slate-400 italic">Brak przypisanych zadań</li>
            ) : (
              data.tasks.map(t => (
                <li key={t.id} className="flex items-start gap-2 leading-tight">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>{t.name}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-slate-800">Zaległe u wszystkich ({overdue.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {overdue.map(o => (
              <div key={o.id} className="flex items-center justify-between px-6 py-2.5 text-sm">
                <span className="text-slate-700"><strong>{o.user_name}</strong> — {o.task_name}</span>
                <span className="text-red-600 font-semibold text-xs">{o.days_overdue} dni po terminie</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <Award className="w-6 h-6 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-800">Podsumowanie punktów</h2>
        </div>
        <div className="p-6 grid grid-cols-12 gap-4 bg-slate-50/50">
          {users.map(u => renderCard(u))}
        </div>
      </div>
    </div>
  );
};
