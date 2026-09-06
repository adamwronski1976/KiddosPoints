import React, { useRef, useState } from 'react';
import { Completions, Person, TaskRow, Task, User, PeriodicSchedule } from '../types';
import { Calendar, Download, RefreshCw, Plus, Minus, ChevronLeft, ChevronRight, Repeat, X } from 'lucide-react';
import { MdiIcon } from './MdiIcon';
import { colorForId } from '../colorPalette';
import * as XLSX from 'xlsx';

const MONTH_NAMES = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
const MONTH_NAMES_GENITIVE = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const DAY_LETTERS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

/** Granice (początek, koniec-wyłącznie) okresu miesięcznego/rocznego
 *  zawierającego podany dzień - lustrzane odbicie backendowego
 *  `_period_bounds` (custom_components/chore_manager/__init__.py). */
function periodBounds(day: Date, period: 'month' | 'year'): [Date, Date] {
  if (period === 'year') return [new Date(day.getFullYear(), 0, 1), new Date(day.getFullYear() + 1, 0, 1)];
  return [new Date(day.getFullYear(), day.getMonth(), 1), new Date(day.getFullYear(), day.getMonth() + 1, 1)];
}

/** Rozkłada `timesPerPeriod` terminów równomiernie w obrębie bieżącego okresu -
 *  lustrzane odbicie backendowego `_next_periodic_date`, żeby podgląd w
 *  formularzu pokazywał realne terminy wyliczane przez integrację. */
function computePeriodicSlots(today: Date, timesPerPeriod: number, period: 'month' | 'year'): Date[] {
  const n = Math.max(1, timesPerPeriod);
  const [pStart, pEnd] = periodBounds(today, period);
  const periodLen = Math.round((pEnd.getTime() - pStart.getTime()) / 86400000);
  const slots: Date[] = [];
  for (let k = 0; k < n; k++) {
    const offset = Math.max(0, Math.round(((k + 1) * periodLen) / n) - 1);
    const d = new Date(pStart);
    d.setDate(d.getDate() + offset);
    slots.push(d);
  }
  return slots;
}

const formatSlotDate = (d: Date) => `${d.getDate()} ${MONTH_NAMES_GENITIVE[d.getMonth()]}`;

interface ScheduleProps {
  users: User[];
  tasks: Task[];
  taskRows: Record<string, TaskRow[]>;
  completions: Completions;
  customSchedule: Record<string, boolean>;
  /** Harmonogram niestandardowy rozliczany w okresie (np. "2 razy w miesiącu"),
   *  kluczowany po id wiersza (TaskRow.id) - wzajemnie wykluczający się z
   *  harmonogramem tygodniowym dla danego przypisania. */
  periodicSchedules: Record<string, PeriodicSchedule>;
  /** Gdy podane, pokazuje tylko wiersze przypisane do tego użytkownika (i tylko
   *  zadania, w których w ogóle występuje) - używane przez panel osobisty. */
  personId?: string;
  personName?: string;
  onAddRow: (taskId: string) => void;
  onUpdateRow: (taskId: string, rowId: string, person: Person) => void;
  onRemoveRow: (taskId: string, rowId: string) => void;
  onToggleCompletion: (rowId: string, dayIndex: number, completed: boolean) => void;
  onToggleWeeklyPattern?: (rowId: string, dayIndex: number, completed: boolean) => void;
  onToggleCustomSchedule: (taskId: string) => void;
  onSetPeriodicSchedule: (taskId: string, personId: string, timesPerPeriod: number, period: 'month' | 'year') => void;
  onClearPeriodicSchedule: (taskId: string, personId: string) => void;
  onReset: () => void;
}

// Zarządzanie samą listą zadań (nazwa, opis, ikona, punkty, dodawanie/usuwanie)
// przeniesione do zakładki "Zadania" (TasksManager) - ten komponent to już
// wyłącznie siatka przypisań i checklista wykonania.
//
// Harmonogram jest wzorcem powtarzającym się co tydzień/miesiąc (dzień 1 =
// zawsze poniedziałek dla danych - to się NIE zmienia). Widok miesięczny
// dostaje jednak nawigację po prawdziwych miesiącach: poprawną liczbę dni
// (28-31) i poprawne wyrównanie dni tygodnia dla wybranego miesiąca/roku,
// wyłącznie na potrzeby podglądu/etykiet - zaznaczenia nadal odnoszą się do
// tego samego, powtarzalnego "dnia 1-31" niezależnie od podglądanego miesiąca.
const PERIOD_LABELS: Record<'month' | 'year', string> = { month: 'miesiąc', year: 'rok' };

export const Schedule: React.FC<ScheduleProps> = ({
  users,
  tasks,
  taskRows,
  completions,
  customSchedule,
  periodicSchedules,
  personId,
  personName,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
  onToggleCompletion,
  onToggleWeeklyPattern,
  onToggleCustomSchedule,
  onSetPeriodicSchedule,
  onClearPeriodicSchedule,
  onReset
}) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [calDate, setCalDate] = useState(() => new Date());
  // Generator reguł harmonogramu okresowego - popup modalny (zamiast
  // ciasnych kontrolek w wierszu), z podglądem realnych terminów wyliczanych
  // tak samo jak backend.
  const [periodicModal, setPeriodicModal] = useState<{
    taskId: string; taskName: string; rowId: string; personId: string; personName: string;
    draft: { times: number; period: 'month' | 'year' };
  } | null>(null);

  const openPeriodicModal = (task: Task, row: TaskRow, existing?: PeriodicSchedule) => {
    const person = users.find(u => u.id === row.person);
    setPeriodicModal({
      taskId: task.id,
      taskName: task.name,
      rowId: row.id,
      personId: row.person,
      personName: person?.name || row.person,
      draft: { times: existing?.times_per_period ?? 1, period: existing?.period ?? 'month' },
    });
  };

  const savePeriodicModal = () => {
    if (!periodicModal) return;
    onSetPeriodicSchedule(periodicModal.taskId, periodicModal.personId, periodicModal.draft.times, periodicModal.draft.period);
    setPeriodicModal(null);
  };

  const clearPeriodicModal = () => {
    if (!periodicModal) return;
    onClearPeriodicSchedule(periodicModal.taskId, periodicModal.personId);
    setPeriodicModal(null);
  };

  const isWeeklyPattern = mode === 'week';
  const displayYear = calDate.getFullYear();
  const displayMonthIdx = calDate.getMonth();
  const daysInMonth = new Date(displayYear, displayMonthIdx + 1, 0).getDate();
  // Dzień tygodnia 1. dnia wybranego miesiąca, indeksowany od poniedziałka (0).
  const firstWeekdayOfMonth = (new Date(displayYear, displayMonthIdx, 1).getDay() + 6) % 7;

  const daysCount = mode === 'week' ? 7 : daysInMonth;
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  /** Dzień tygodnia (0=Pn..6=Nd) dla pozycji `day` w aktualnym widoku - w
   *  trybie tygodniowym to zawsze prosty modulo, w miesięcznym uwzględnia
   *  realne wyrównanie wybranego miesiąca/roku. */
  const dowForDay = (day: number) => (mode === 'week' ? (day - 1) % 7 : (firstWeekdayOfMonth + day - 1) % 7);

  const navigateMonth = (delta: number) => {
    setCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const exportToExcel = () => {
    const headers = ['Zadanie', 'Osoba', 'Pkt', ...daysArray.map(d => {
      const dayName = DAY_LETTERS[dowForDay(d)];
      return mode === 'week' ? dayName : `${dayName} ${d}`;
    })];

    const rows: any[] = [];

    tasks.forEach(task => {
      const taskRowsForTask = taskRows[task.id] || [];
      const pointsVal = task.points;

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
    const suffix = mode === 'week' ? 'Tygodniowy' : `Miesieczny_${MONTH_NAMES[displayMonthIdx]}_${displayYear}`;
    XLSX.writeFile(wb, `Harmonogram_${suffix}.xlsx`);
  };

  const getPersonCheckboxColor = (personId: string) => {
    const colors = ['accent-blue-500 focus:ring-blue-500', 'accent-green-500 focus:ring-green-500', 'accent-pink-500 focus:ring-pink-500', 'accent-slate-900 focus:ring-slate-900', 'accent-yellow-400 focus:ring-yellow-400', 'accent-orange-500 focus:ring-orange-500', 'accent-purple-500 focus:ring-purple-500', 'accent-teal-500 focus:ring-teal-500'];
    const idx = personId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[idx];
  };

  return (
    <>
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col w-full mb-8">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Calendar className="w-6 h-6 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-800">
            Harmonogram{personName ? ` — ${personName}` : ''}
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setMode('week')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${mode === 'week' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Tydzień
            </button>
            <button
              onClick={() => setMode('month')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${mode === 'month' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Miesiąc
            </button>
          </div>
          {mode === 'month' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                title="Poprzedni miesiąc"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-700 min-w-[130px] text-center">
                {MONTH_NAMES[displayMonthIdx]} {displayYear}
              </span>
              <button
                onClick={() => navigateMonth(1)}
                className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                title="Następny miesiąc"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Download className="w-4 h-4" /> Eksport XLS
          </button>
          {mode === 'week' && !personId && (
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
                const dayName = DAY_LETTERS[dowForDay(day)];
                const isWeekend = dayName === 'Sb' || dayName === 'Nd';
                return (
                  <th key={day} scope="col" className={`px-1 py-3 text-center text-[10px] font-bold uppercase tracking-wider min-w-[40px] sticky top-0 z-20 ${isWeekend ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
                    <div>{dayName}</div>
                    {mode === 'month' && <div className={`text-[8px] font-normal leading-none mt-1 ${isWeekend ? 'text-amber-600' : 'text-slate-400'}`}>{day}</div>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white">
            {personId && !tasks.some(t => (taskRows[t.id] || []).some(r => r.person === personId)) && (
              <tr>
                <td colSpan={3 + daysArray.length} className="px-6 py-8 text-center text-sm text-slate-400 italic">
                  Brak przypisanych zadań. Przypisz zadanie w sekcji poniżej.
                </td>
              </tr>
            )}
            {tasks.map((task, taskIndex) => {
              const allRows = taskRows[task.id] || [];
              const rows = personId ? allRows.filter(r => r.person === personId) : allRows;
              if (personId && rows.length === 0) return null;
              const isCustom = mode === 'week' && !!customSchedule[task.id];
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
                    const periodic = periodicSchedules[row.id];
                    const isPeriodicRow = !!periodic;

                    return (
                    <tr key={row.id} className={`group transition-colors ${isCustom ? 'bg-slate-100' : `${groupBg} hover:bg-slate-100`}`}>

                      {/* Only render Task Name and Points for the first row of a task */}
                      {rowIndex === 0 && (
                        <td
                          rowSpan={rows.length}
                          className={`px-4 py-3 whitespace-normal text-sm font-medium text-slate-900 sticky left-0 z-10 border-r border-b-2 border-slate-300 shadow-[1px_0_0_0_rgba(226,232,240,1)] align-top ${isCustom ? 'bg-slate-100' : groupBg}`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 flex items-center gap-1.5">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${colorForId(task.id).bg}`}>
                                <MdiIcon icon={task.icon || 'mdi:checkbox-marked-circle-outline'} className={`text-sm leading-none ${colorForId(task.id).text}`} />
                              </span>
                              <span className="block">{task.name}</span>
                            </div>
                            {!personId && (
                              <button
                                onClick={() => onAddRow(task.id)}
                                className={`p-1 rounded-full text-emerald-600 hover:bg-emerald-100 flex-shrink-0 transition-colors ${isCustom ? 'opacity-50' : ''}`}
                                title="Dodaj osobę do zadania"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-[10px] text-slate-400 mt-1 leading-tight">{task.description}</p>
                          )}

                          {mode === 'week' && (
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
                          <div className="mt-1.5 pl-1 flex items-center gap-1.5 flex-wrap">
                            {isPeriodicRow ? (
                              <>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
                                  <Repeat className="w-2.5 h-2.5" />
                                  {periodic!.times_per_period}x / {PERIOD_LABELS[periodic!.period]}
                                </span>
                                <button
                                  onClick={() => openPeriodicModal(task, row, periodic)}
                                  className="text-[9.5px] text-violet-600 hover:text-violet-800 hover:underline"
                                >
                                  Edytuj
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => openPeriodicModal(task, row)}
                                className="group/stats inline-flex items-center gap-1 text-[9.5px] text-slate-500 hover:text-violet-700 leading-tight"
                                title="Kliknij, żeby ustawić harmonogram niestandardowy (X razy w miesiącu/roku)"
                              >
                                <span className="underline decoration-dotted underline-offset-2 group-hover/stats:decoration-violet-400">
                                  Wykonywane: {wCnt} {wCnt === 1 ? 'raz' : 'razy'} w tyg., {mCnt} {mCnt === 1 ? 'raz' : 'razy'} w mies.
                                </span>
                                <Repeat className="w-2.5 h-2.5 flex-shrink-0 opacity-0 group-hover/stats:opacity-100 transition-opacity" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {rowIndex === 0 && (
                        <td
                          rowSpan={rows.length}
                          className={`px-2 py-3 whitespace-nowrap text-center border-r border-b-2 border-slate-300 align-top pt-3 text-sm font-semibold text-slate-600 ${isCustom ? 'bg-slate-100' : groupBg}`}
                        >
                          {task.points}
                        </td>
                      )}

                      {daysArray.map(day => {
                        const key = `${row.id}_${day}`;
                        const isChecked = !!completions[key];
                        const dayName = DAY_LETTERS[dowForDay(day)];
                        const isWeekend = dayName === 'Sb' || dayName === 'Nd';

                        let cellBg = (isCustom || isPeriodicRow)
                          ? 'bg-slate-100 group-hover:bg-slate-200'
                          : (isWeekend ? 'bg-amber-50/60 group-hover:bg-amber-100/60' : `${groupBg} group-hover:bg-slate-100`);

                        let checkboxColor = row.person ? getPersonCheckboxColor(row.person) : 'accent-emerald-600 focus:ring-emerald-500';

                        return (
                          <td key={day} className={`px-1 py-2 whitespace-nowrap border-r border-slate-200 min-w-[40px] text-center ${rowIndex === rows.length - 1 ? 'border-b-2 border-slate-300' : 'border-b border-slate-100'} ${cellBg}`}>
                            <input
                              type="checkbox"
                              className={`w-5 h-5 mx-auto border-slate-300 rounded cursor-pointer ${(isCustom || isPeriodicRow) ? 'opacity-40 cursor-not-allowed' : ''} disabled:opacity-30 ${checkboxColor}`}
                              checked={isChecked}
                              onChange={(e) => {
                                if (isCustom || isPeriodicRow) return;
                                if (isWeeklyPattern && onToggleWeeklyPattern) {
                                  onToggleWeeklyPattern(row.id, day, e.target.checked);
                                } else {
                                  onToggleCompletion(row.id, day, e.target.checked);
                                }
                              }}
                              disabled={!row.person || isPeriodicRow}
                              title={!row.person ? "Wybierz osobę najpierw" : (isPeriodicRow ? "Harmonogram okresowy - terminy wylicza system" : "")}
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
    </div>

    {periodicModal && (() => {
      const isEditingExisting = !!periodicSchedules[periodicModal.rowId];
      const slots = computePeriodicSlots(new Date(), periodicModal.draft.times, periodicModal.draft.period);
      const periodNoun = periodicModal.draft.period === 'month' ? 'miesiącu' : 'roku';
      const periodPreviewNoun = periodicModal.draft.period === 'month' ? 'tym miesiącu' : 'tym roku';

      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 animate-in fade-in duration-150"
          onClick={() => setPeriodicModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-violet-600 flex-shrink-0" /> Harmonogram niestandardowy
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{periodicModal.taskName} — {periodicModal.personName}</p>
              </div>
              <button
                onClick={() => setPeriodicModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Typ powtarzania</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPeriodicModal(m => m && ({ ...m, draft: { ...m.draft, period: 'month' } }))}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${periodicModal.draft.period === 'month' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    Miesięczny
                  </button>
                  <button
                    onClick={() => setPeriodicModal(m => m && ({ ...m, draft: { ...m.draft, period: 'year' } }))}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${periodicModal.draft.period === 'year' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    Roczny
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Ile razy w {periodNoun}?
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={periodicModal.draft.times}
                  onChange={e => setPeriodicModal(m => m && ({ ...m, draft: { ...m.draft, times: Math.max(1, parseInt(e.target.value, 10) || 1) } }))}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-violet-700 mb-1">Podgląd</p>
                <p className="text-sm text-violet-900 leading-snug">
                  Zadanie pojawi się do wykonania <strong>{periodicModal.draft.times}×</strong> w {periodNoun}, terminy rozłożone równomiernie w okresie.
                </p>
                <p className="text-xs text-violet-700 mt-1.5">
                  Orientacyjnie w {periodPreviewNoun}: {slots.map(formatSlotDate).join(', ')}.
                </p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
              {isEditingExisting ? (
                <button onClick={clearPeriodicModal} className="text-sm font-medium text-red-600 hover:text-red-800">
                  Usuń harmonogram
                </button>
              ) : <span />}
              <div className="flex gap-2">
                <button
                  onClick={() => setPeriodicModal(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Anuluj
                </button>
                <button
                  onClick={savePeriodicModal}
                  className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700"
                >
                  Zapisz
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    })()}
    </>
  );
};
