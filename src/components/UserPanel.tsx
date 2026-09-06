import React, { useMemo, useState } from 'react';
import { User, Task, TaskRow, Completions, HistoryEntry, PendingApproval, Reward, Person, OverdueItem, PeriodicSchedule } from '../types';
import { HomeAssistantLike } from '../haStore';
import { Schedule } from './Schedule';
import { HistoryLog } from './HistoryLog';
import { UserSettingsForm } from './UserSettingsForm';
import { MdiIcon } from './MdiIcon';
import {
  Shield, ShieldAlert, Star, Gift, ClipboardList, ClipboardCheck, CalendarClock,
  CheckCircle2, XCircle, PlusCircle, MinusCircle, RotateCcw, Link2, Settings2, Trash2
} from 'lucide-react';

interface Props {
  user: User;
  users: User[];
  tasks: Task[];
  taskRows: Record<string, TaskRow[]>;
  completions: Completions;
  customSchedule: Record<string, boolean>;
  periodicSchedules: Record<string, PeriodicSchedule>;
  rewards: Reward[];
  history: HistoryEntry[];
  pendingApprovals: PendingApproval[];
  overdue?: OverdueItem[];
  hass?: HomeAssistantLike;
  onAddRow: (taskId: string) => void;
  onUpdateRow: (taskId: string, rowId: string, person: Person) => void;
  onRemoveRow: (taskId: string, rowId: string) => void;
  onToggleCompletion: (rowId: string, dayIndex: number, completed: boolean) => void;
  onToggleWeeklyPattern: (rowId: string, dayIndex: number, completed: boolean) => void;
  onToggleCustomSchedule: (taskId: string) => void;
  onSetPeriodicSchedule: (taskId: string, personId: string, timesPerPeriod: number, period: 'month' | 'year') => void;
  onClearPeriodicSchedule: (taskId: string, personId: string) => void;
  onReset: () => void;
  onAssign: (taskId: string, userId: string) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onRemoveUser: (id: string) => void;
  pointActions?: {
    approveApproval: (a: PendingApproval) => void;
    rejectApproval: (a: PendingApproval, reason?: string) => void;
    addPointsToUser: (haEntityId: string, points: number, reason?: string) => void;
    resetUserPoints: (haEntityId: string) => void;
  };
}

export const UserPanel: React.FC<Props> = ({
  user, users, tasks, taskRows, completions, customSchedule, periodicSchedules, rewards, history, pendingApprovals, overdue = [], hass,
  onAddRow, onUpdateRow, onRemoveRow, onToggleCompletion, onToggleWeeklyPattern, onToggleCustomSchedule,
  onSetPeriodicSchedule, onClearPeriodicSchedule,
  onReset, onAssign, onUpdateUser, onRemoveUser, pointActions
}) => {
  const [adjustPoints, setAdjustPoints] = useState(10);
  const [adjustReason, setAdjustReason] = useState('');
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Omit<User, 'id'>>(user);

  const liveSensor = hass?.states[user.haEntityId];
  const livePoints = liveSensor ? parseInt(liveSensor.state, 10) || 0 : null;
  const level = liveSensor?.attributes.level ?? (livePoints !== null ? Math.floor(livePoints / 100) + 1 : null);
  const rank = liveSensor?.attributes.rank ?? null;
  const pointsToNext = liveSensor?.attributes.points_to_next_level ?? null;

  const linkedPerson = useMemo(() => {
    if (!hass || !user.personEntityId) return undefined;
    const s = hass.states[user.personEntityId];
    return s ? { name: s.attributes.friendly_name || user.personEntityId, picture: s.attributes.entity_picture as string | undefined } : undefined;
  }, [hass, user.personEntityId]);

  const myPending = useMemo(
    () => pendingApprovals.filter(p => p.user === user.haEntityId),
    [pendingApprovals, user.haEntityId]
  );

  const myOverdue = useMemo(
    () => overdue.filter(o => o.user === user.haEntityId),
    [overdue, user.haEntityId]
  );

  const myHistory = useMemo(
    () => history.filter(h => h.user === user.haEntityId),
    [history, user.haEntityId]
  );

  const assignedTaskIds = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      if ((taskRows[t.id] || []).some(r => r.person === user.id)) set.add(t.id);
    });
    return set;
  }, [tasks, taskRows, user.id]);

  const unassignedTasks = tasks.filter(t => !assignedTaskIds.has(t.id));

  const affordableRewards = livePoints !== null ? rewards.filter(r => r.points <= livePoints) : [];

  const startEditSettings = () => {
    setSettingsForm(user);
    setIsEditingSettings(true);
  };

  const saveSettings = () => {
    onUpdateUser(user.id, settingsForm);
    setIsEditingSettings(false);
  };

  const handleDelete = () => onRemoveUser(user.id);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* NAGŁÓWEK OSOBY */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        {linkedPerson?.picture ? (
          <img src={linkedPerson.picture} alt={user.name} className="w-20 h-20 rounded-full object-cover border border-slate-200 flex-shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-3xl flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
            {user.role === 'admin' && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>}
            {user.requiresApproval && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Weryfikacja</span>}
            {linkedPerson && <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Link2 className="w-3 h-3" /> {user.personEntityId}</span>}
          </div>
          <div className="flex items-center gap-4 flex-wrap text-sm text-slate-500">
            <span className="font-mono text-xs">{user.haEntityId}</span>
            {myPending.length > 0 && (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <ClipboardCheck className="w-4 h-4" /> {myPending.length} do zatwierdzenia
              </span>
            )}
            {myOverdue.length > 0 && (
              <span className="text-red-600 font-semibold flex items-center gap-1">
                <CalendarClock className="w-4 h-4" /> {myOverdue.length} zaległych
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <div className="text-4xl font-black text-indigo-600 flex items-center gap-2 justify-end">
              <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
              {livePoints !== null ? livePoints : '—'}
            </div>
            {rank && <div className="text-xs text-slate-500 mt-1">Poziom {level} — {rank}</div>}
            {pointsToNext !== null && <div className="text-[11px] text-slate-400">{pointsToNext} pkt do kolejnego poziomu</div>}
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={startEditSettings}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Ustawienia konta"
            >
              <Settings2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Usuń użytkownika"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* USTAWIENIA KONTA (przeniesione z głównej strony) */}
      {isEditingSettings && (
        <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
          <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-200 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-800">Ustawienia konta</h3>
          </div>
          <div className="p-6">
            <UserSettingsForm
              formData={settingsForm}
              onChange={updates => setSettingsForm(f => ({ ...f, ...updates }))}
              hass={hass}
              isNew={false}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setIsEditingSettings(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                Anuluj
              </button>
              <button onClick={saveSettings} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                Zapisz zmiany
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZALEGŁE ZADANIA - nie znikają, tylko czekają na wykonanie na liście todo.chore_tasks */}
      {myOverdue.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
          <div className="bg-red-50 px-5 py-3 border-b border-red-200 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-slate-800">Zaległe zadania ({myOverdue.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {myOverdue.map(o => (
              <div key={o.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span className="text-slate-700">{o.task_name}</span>
                <span className="text-red-600 font-semibold text-xs">{o.days_overdue} dni po terminie</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AKCJE PUNKTOWE + DO ZATWIERDZENIA */}
      {pointActions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myPending.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
              <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-slate-800">Do zatwierdzenia</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {myPending.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{p.task_name}</div>
                      <div className="text-xs text-slate-400">+{p.points} pkt</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => pointActions.rejectApproval(p)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Odrzuć">
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button onClick={() => pointActions.approveApproval(p)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Zatwierdź">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-800">Ręczna korekta punktów</h3>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  className="w-24 border-slate-300 rounded-md shadow-sm text-sm"
                  value={adjustPoints}
                  onChange={e => setAdjustPoints(parseInt(e.target.value, 10) || 0)}
                />
                <input
                  type="text"
                  placeholder="Powód (opcjonalnie)"
                  className="flex-1 border-slate-300 rounded-md shadow-sm text-sm"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => pointActions.addPointsToUser(user.haEntityId, adjustPoints, adjustReason || undefined)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700"
                >
                  <PlusCircle className="w-4 h-4" /> Dodaj
                </button>
                <button
                  onClick={() => pointActions.addPointsToUser(user.haEntityId, -Math.abs(adjustPoints), adjustReason || undefined)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-md hover:bg-red-100 border border-red-200"
                >
                  <MinusCircle className="w-4 h-4" /> Odejmij
                </button>
                <button
                  onClick={() => pointActions.resetUserPoints(user.haEntityId)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-md hover:bg-slate-200"
                  title="Wyzeruj punkty"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NA CO STAĆ TERAZ */}
      {livePoints !== null && rewards.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
            <Gift className="w-5 h-5 text-pink-600" />
            <h3 className="font-semibold text-slate-800">Na co stać {user.name} teraz ({affordableRewards.length}/{rewards.length})</h3>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {rewards.map(r => (
              <span
                key={r.id}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium flex items-center gap-1 ${
                  r.points <= livePoints
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                <MdiIcon icon={r.icon || 'mdi:gift-outline'} className="text-sm" /> {r.name} — {r.points} pkt
              </span>
            ))}
          </div>
        </div>
      )}

      {/* PRZYPISYWANIE ZADAŃ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800">Przypisz kolejne zadanie ({unassignedTasks.length} dostępnych)</h3>
        </div>
        <div className="p-4 flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
          {unassignedTasks.length === 0 ? (
            <span className="text-sm text-slate-400 italic">Wszystkie zadania mają już przypisaną osobę.</span>
          ) : (
            unassignedTasks.map(t => (
              <button
                key={t.id}
                onClick={() => onAssign(t.id, user.id)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-600 font-medium transition-colors"
              >
                <MdiIcon icon={t.icon || 'mdi:checkbox-marked-circle-outline'} className="text-sm" /> {t.name} ({t.points} pkt)
              </button>
            ))
          )}
        </div>
      </div>

      {/* HARMONOGRAM - dokładnie ten sam komponent co panel główny, przefiltrowany */}
      <Schedule
        users={users}
        tasks={tasks}
        taskRows={taskRows}
        completions={completions}
        customSchedule={customSchedule}
        periodicSchedules={periodicSchedules}
        personId={user.id}
        personName={user.name}
        onAddRow={onAddRow}
        onUpdateRow={onUpdateRow}
        onRemoveRow={onRemoveRow}
        onToggleCompletion={onToggleCompletion}
        onToggleWeeklyPattern={onToggleWeeklyPattern}
        onToggleCustomSchedule={onToggleCustomSchedule}
        onSetPeriodicSchedule={onSetPeriodicSchedule}
        onClearPeriodicSchedule={onClearPeriodicSchedule}
        onReset={onReset}
      />

      {/* HISTORIA POSTACI - wszystko, co kiedykolwiek dotyczyło tego konta */}
      <HistoryLog history={myHistory} users={users} title={`Historia postaci — ${user.name}`} />
    </div>
  );
};
