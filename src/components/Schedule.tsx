import React, { useRef, useState } from 'react';
import { Completions, Person, TaskRow, Task, User } from '../types';
import { Calendar, Download, RefreshCw, Plus, Minus, Pencil, Check, X, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ScheduleProps {
  viewMode: 'week' | 'month';
  users: User[];
  tasks: Task[];
  taskRows: Record<string, TaskRow[]>;
  completions: Completions;
  customTaskPoints: Record<string, number>;
  customSchedule: Record<string, boolean>;
  isWeeklyPattern?: boolean;
  onAddRow: (taskId: string) => void;
  onUpdateRow: (taskId: string, rowId: string, person: Person) => void;
  onRemoveRow: (taskId: string, rowId: string) => void;
  onToggleCompletion: (rowId: string, dayIndex: number, completed: boolean) => void;
  onToggleWeeklyPattern?: (rowId: string, dayIndex: number, completed: boolean) => void;
  onToggleCustomSchedule: (taskId: string) => void;
  onUpdateTaskPoints: (taskId: string, points: number) => void;
  onUpdateTaskName: (taskId: string, newName: string) => void;
  onRemoveTask: (taskId: string) => void;
  onAddTask: (name: string, points: number) => void;
  onReset: () => void;
}

export const Schedule: React.FC<ScheduleProps> = ({
  viewMode,
  users,
  tasks,
  taskRows,
  completions,
  customTaskPoints,
  customSchedule,
  isWeeklyPattern,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
  onToggleCompletion,
  onToggleWeeklyPattern,
  onToggleCustomSchedule,
  onUpdateTaskPoints,
  onUpdateTaskName,
  onRemoveTask,
  onAddTask,
  onReset
}) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const daysCount = viewMode === 'week' ? 7 : 31;
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);
  
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskPts, setNewTaskPts] = useState(1);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState("");

  const handleSaveTaskName = (taskId: string) => {
    if (editingTaskName.trim()) {
      onUpdateTaskName(taskId, editingTaskName.trim());
    }
    setEditingTaskId(null);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskName.trim()) {
      onAddTask(newTaskName.trim(), newTaskPts);
      setNewTaskName("");
      setNewTaskPts(1);
    }
  };

  const exportToExcel = () => {
    const headers = ['Zadanie', 'Osoba', 'Pkt', ...daysArray.map(d => {
      const dayName = ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'][(d - 1) % 7];
      return viewMode === 'week' ? dayName : `${dayName} ${d}`;
    })];
    
    const rows: any[] = [];
    
    tasks.forEach(task => {
      const taskRowsForTask = taskRows[task.id] || [];
      const pointsVal = customTaskPoints[task.id] !== undefined ? customTaskPoints[task.id] : task.points;
      
      taskRowsForTask.forEach((row) => {
        const user = users.find(u => u.id === row.person);
        const rowData: any[] = [
          task.name,
          user ? user.name : (row.person || ''),
          pointsVal
        ];
        
        daysArray.forEach(day => {
          const key = `${row.id}_${day}`;
          if (!row.person) {
            rowData.push('');
          } else {
            rowData.push(completions[key] ? 'TAK' : '');
          }
        });
        
        rows.push(rowData);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Harmonogram");
    XLSX.writeFile(wb, `Harmonogram_${viewMode === 'week' ? 'Tygodniowy' : 'Miesieczny'}.xlsx`);
  };

  const getRowMonthlySummary = (rowId: string) => {
    const dayNamesLong = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
    const dowMap = new Map<number, number[]>();
    for (let d = 1; d <= 31; d++) {
      if (completions[`${rowId}_${d}`]) {
        const dow = (d - 1) % 7;
        const occurrence = Math.ceil(d / 7);
        if (!dowMap.has(dow)) dowMap.set(dow, []);
        dowMap.get(dow)!.push(occurrence);
      }
    }

    if (dowMap.size === 0) return null;

    const parts: string[] = [];
    Array.from(dowMap.keys()).sort().forEach(dow => {
      const occurrences = dowMap.get(dow)!;
      parts.push(`${occurrences.join(',')} ${dayNamesLong[dow]}`);
    });
    
    return `${parts.join(', ')} miesiąca`;
  };

  const getPersonColor = (personId: string) => {
    // Basic hash based color or just generic
    const colors = ['text-blue-600', 'text-green-600', 'text-pink-600', 'text-slate-900', 'text-yellow-600', 'text-orange-600', 'text-purple-600', 'text-teal-600'];
    const idx = personId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[idx];
  };

  const getPersonCheckboxColor = (personId: string) => {
    const colors = ['accent-blue-500 focus:ring-blue-500', 'accent-green-500 focus:ring-green-500', 'accent-pink-500 focus:ring-pink-500', 'accent-slate-900 focus:ring-slate-900', 'accent-yellow-400 focus:ring-yellow-400', 'accent-orange-500 focus:ring-orange-500', 'accent-purple-500 focus:ring-purple-500', 'accent-teal-500 focus:ring-teal-500'];
    const idx = personId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[idx];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col w-full mb-8">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-800">
            Harmonogram ({viewMode === 'week' ? 'Tygodniowy' : 'Miesięczny'})
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Download className="w-4 h-4" /> Eksport XLS
          </button>
          {viewMode === 'week' && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <RefreshCw className="w-4 h-4" /> Resetuj wszystko
            </button>
          )}
        </div>
      </div>
      
      <div className="p-0 overflow-auto max-h-[70vh]">
        <table ref={tableRef} className="min-w-full divide-y divide-slate-200 border-separate border-spacing-0">
          <thead className="bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[200px] sticky left-0 top-0 bg-slate-50 z-30 border-r border-slate-200 shadow-[1px_0_0_0_rgba(226,232,240,1)]">Zadanie</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[140px] sticky top-0 bg-slate-50 z-20 border-r border-slate-200">Osoba</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50 z-20 border-r border-slate-200">Pkt</th>
              {daysArray.map(day => {
                const dayName = ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'][(day - 1) % 7];
                const isWeekend = dayName === 'Sb' || dayName === 'Nd';
                return (
                  <th key={day} scope="col" className={`px-1 py-3 text-center text-[10px] font-bold uppercase tracking-wider min-w-[40px] sticky top-0 z-20 ${isWeekend ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
                    <div>{dayName}</div>
                    {viewMode === 'month' && <div className={`text-[8px] font-normal leading-none mt-1 ${isWeekend ? 'text-amber-600' : 'text-slate-400'}`}>{day}</div>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white">
            {tasks.map((task, taskIndex) => {
              const rows = taskRows[task.id] || [];
              const isCustom = viewMode === 'week' && !!customSchedule[task.id];
              // Tło naprzemienne per-zadanie (nie per-wiersz) - pomaga odróżnić grupy
              // wierszy należące do różnych zadań. Pełna krycie (bez alfa), bo jedna
              // z kolumn jest "sticky" i musi zasłaniać przewijaną zawartość pod spodem.
              const groupBg = taskIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50';

              return (
                <React.Fragment key={task.id}>
                  {rows.map((row, rowIndex) => {
                    let wCnt = 0;
                    for (let d = 1; d <= 7; d++) {
                      if (completions[`${row.id}_${d}`]) wCnt++;
                    }
                    let mCnt = 0;
                    for (let d = 1; d <= 31; d++) {
                      if (completions[`${row.id}_${d}`]) mCnt++;
                    }
                    
                    return (
                    <tr key={row.id} className={`group transition-colors ${isCustom ? 'bg-slate-100' : `${groupBg} hover:bg-slate-100`}`}>

                      {/* Only render Task Name and Points for the first row of a task */}
                      {rowIndex === 0 && (
                        <td
                          rowSpan={rows.length}
                          className={`px-4 py-3 whitespace-normal text-sm font-medium text-slate-900 sticky left-0 z-10 border-r border-b-2 border-slate-300 shadow-[1px_0_0_0_rgba(226,232,240,1)] align-top ${isCustom ? 'bg-slate-100' : groupBg}`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              {editingTaskId === task.id ? (
                                <div className="flex items-center gap-1">
                                  <input 
                                    type="text"
                                    className="w-full text-sm border-slate-300 rounded px-2 py-1 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                                    value={editingTaskName}
                                    onChange={(e) => setEditingTaskName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveTaskName(task.id);
                                      if (e.key === 'Escape') setEditingTaskId(null);
                                    }}
                                    autoFocus
                                  />
                                  <button onClick={() => handleSaveTaskName(task.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setEditingTaskId(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 group/name">
                                  <span className="block">{task.name}</span>
                                  <button 
                                    onClick={() => {
                                      setEditingTaskId(task.id);
                                      setEditingTaskName(task.name);
                                    }}
                                    className="p-1 rounded opacity-0 group-hover/name:opacity-100 hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-all"
                                    title="Edytuj nazwę zadania"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => onRemoveTask(task.id)}
                                    className="p-1 rounded opacity-0 group-hover/name:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all ml-1"
                                    title="Usuń zadanie całkowicie"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <button 
                              onClick={() => onAddRow(task.id)}
                              className={`p-1 rounded-full text-emerald-600 hover:bg-emerald-100 flex-shrink-0 transition-colors ${isCustom ? 'opacity-50' : ''}`}
                              title="Dodaj osobę do zadania"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {viewMode === 'week' && (
                            <label className="flex items-center gap-1.5 mt-3 text-[11px] text-slate-600 cursor-pointer hover:text-slate-800 transition-colors">
                              <input 
                                type="checkbox" 
                                checked={isCustom}
                                onChange={() => onToggleCustomSchedule(task.id)}
                                className="rounded border-slate-300 w-3.5 h-3.5 accent-slate-600"
                              />
                              Niestandardowy harmonogram
                            </label>
                          )}
                        </td>
                      )}
                      
                      <td className={`px-2 py-2 whitespace-nowrap border-r align-top ${rowIndex === rows.length - 1 ? 'border-b-2 border-slate-300' : 'border-b border-slate-200'} ${isCustom ? 'bg-slate-100 border-slate-200 group-hover:bg-slate-200' : `${groupBg} border-slate-200 group-hover:bg-slate-100`}`}>
                        <div className="flex items-center gap-1">
                          <select
                            className="block w-full pl-2 pr-6 py-1 text-sm border-slate-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 rounded-md"
                            value={row.person || ""}
                            onChange={(e) => onUpdateRow(task.id, row.id, e.target.value as Person)}
                          >
                            <option value="" className="text-slate-400">- wybierz -</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                          {rows.length > 1 && (
                            <button
                              onClick={() => onRemoveRow(task.id, row.id)}
                              className="p-1 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 flex-shrink-0"
                              title="Usuń ten wiersz"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {row.person && (
                          <div className="mt-1.5 pl-1 flex flex-col gap-0.5">
                            <span className="text-[9.5px] text-slate-500 leading-tight">
                              Wykonywane: {wCnt} {wCnt === 1 ? 'raz' : 'razy'} w tyg., {mCnt} {mCnt === 1 ? 'raz' : 'razy'} w mies.
                            </span>
                            {isCustom && (
                              <span className={`text-[10px] font-semibold leading-tight ${getPersonColor(row.person)}`}>
                                {getRowMonthlySummary(row.id) || <span className="text-slate-400 font-normal italic">Brak przypisań w mies.</span>}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      
                      {rowIndex === 0 && (
                        <td
                          rowSpan={rows.length}
                          className={`px-2 py-3 whitespace-nowrap text-center border-r border-b-2 border-slate-300 align-top pt-2 ${isCustom ? 'bg-slate-100' : groupBg}`}
                        >
                          <input 
                            type="number"
                            min="0"
                            className="w-14 mx-auto text-center border-slate-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm font-semibold text-slate-600 bg-slate-50/50"
                            value={customTaskPoints[task.id] !== undefined ? customTaskPoints[task.id] : task.points}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 0) {
                                onUpdateTaskPoints(task.id, val);
                              }
                            }}
                          />
                        </td>
                      )}
                      
                      {daysArray.map(day => {
                        const key = `${row.id}_${day}`;
                        const isChecked = !!completions[key];
                        const dayName = ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'][(day - 1) % 7];
                        const isWeekend = dayName === 'Sb' || dayName === 'Nd';

                        let cellBg = isCustom
                          ? 'bg-slate-100 group-hover:bg-slate-200'
                          : (isWeekend ? 'bg-amber-50/60 group-hover:bg-amber-100/60' : `${groupBg} group-hover:bg-slate-100`);

                        let checkboxColor = row.person ? getPersonCheckboxColor(row.person) : 'accent-emerald-600 focus:ring-emerald-500';

                        return (
                          <td key={day} className={`px-1 py-2 whitespace-nowrap border-r border-slate-200 min-w-[40px] text-center ${rowIndex === rows.length - 1 ? 'border-b-2 border-slate-300' : 'border-b border-slate-100'} ${cellBg}`}>
                            <input
                              type="checkbox"
                              className={`w-5 h-5 mx-auto border-slate-300 rounded cursor-pointer ${isCustom ? 'opacity-40 cursor-not-allowed' : ''} disabled:opacity-30 ${checkboxColor}`}
                              checked={isChecked}
                              onChange={(e) => {
                                if (isCustom) return;
                                if (isWeeklyPattern && onToggleWeeklyPattern) {
                                  onToggleWeeklyPattern(row.id, day, e.target.checked);
                                } else {
                                  onToggleCompletion(row.id, day, e.target.checked);
                                }
                              }}
                              disabled={!row.person}
                              title={!row.person ? "Wybierz osobę najpierw" : ""}
                            />
                          </td>
                        );
                      })}
                    </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
        <form onSubmit={handleAddTask} className="flex gap-3 items-end max-w-2xl">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Nowe zadanie / obowiązek</label>
            <input 
              type="text" 
              className="w-full border-slate-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              placeholder="Nazwa zadania..."
              value={newTaskName}
              onChange={e => setNewTaskName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Punkty</label>
            <input 
              type="number" 
              min="0"
              className="w-24 border-slate-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              value={newTaskPts}
              onChange={e => setNewTaskPts(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <button 
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Plus className="w-4 h-4" /> Dodaj
          </button>
        </form>
      </div>
    </div>
  );
};
