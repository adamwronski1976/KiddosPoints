import React from 'react';
import { Monitor } from 'lucide-react';
import { User } from '../types';

interface ComputerTimeProps {
  computerSlots: Record<string, number>;
  onUpdateSlot: (personId: string, day: number, slots: number) => void;
  users: User[];
}

export const ComputerTime: React.FC<ComputerTimeProps> = ({ computerSlots, onUpdateSlot, users }) => {
  const kids = users.filter(u => u.role === 'child');
  const days = [1, 2, 3, 4, 5, 6, 7];
  const dayNames = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

  if (kids.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col w-full mb-8">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
        <Monitor className="w-6 h-6 text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-800">Czas przed komputerem ({kids.map(k => k.name).join(', ')})</h2>
      </div>
      <div className="p-0 overflow-auto max-h-[60vh]">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-slate-50 sticky top-0 z-20 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-r border-slate-200 bg-slate-50 sticky left-0 z-30 w-48 shadow-[1px_0_0_0_rgba(226,232,240,1)]">Osoba</th>
              {days.map((day, idx) => {
                const isWeekend = idx >= 5;
                return (
                  <th key={day} className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider ${isWeekend ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
                    {dayNames[idx]}
                    <div className={`text-[8px] font-normal normal-case leading-none mt-1 ${isWeekend ? 'text-amber-600' : 'text-slate-400'}`}>Ilość slotów (30 min)</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white">
            {kids.map((person, personIdx) => (
              <tr key={person.id} className="hover:bg-slate-50 transition-colors group">
                <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 border-r border-slate-200 sticky left-0 bg-white z-10 group-hover:bg-slate-50 shadow-[1px_0_0_0_rgba(226,232,240,1)] ${personIdx === kids.length - 1 ? 'border-b border-slate-200' : 'border-b border-slate-100'}`}>
                  {person.name}
                </td>
                {days.map((day, dayIdx) => {
                  const isWeekend = dayIdx >= 5;
                  const val = computerSlots[`${person.id}_${day}`] || 0;
                  return (
                    <td key={day} className={`px-2 py-2 whitespace-nowrap text-center ${personIdx === kids.length - 1 ? 'border-b border-slate-200' : 'border-b border-slate-100'} ${isWeekend ? 'bg-amber-50/50 hover:bg-amber-100/50' : 'bg-white hover:bg-slate-50/50'}`}>
                      <input
                        type="number"
                        min="0"
                        className="w-16 text-center border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm font-semibold bg-white/50"
                        value={val === 0 ? "" : val}
                        placeholder="0"
                        onChange={(e) => {
                          const slots = parseInt(e.target.value, 10) || 0;
                          onUpdateSlot(person.id, day, slots);
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
