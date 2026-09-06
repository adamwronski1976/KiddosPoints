import React, { useMemo, useState } from 'react';
import { User, Task, TaskRow, Completions, HistoryEntry, PendingApproval, Reward, Person, OverdueItem, PeriodicSchedule } from '../types';
import { HomeAssistantLike } from '../haStore';
import { UserSettingsForm } from './UserSettingsForm';
import { UserPanel } from './UserPanel';
import { Summary } from './Summary';
import { UserCircle2, Plus, LayoutGrid, ShieldAlert } from 'lucide-react';

const EMPTY_FORM: Omit<User, 'id'> = {
  name: '',
  haEntityId: 'sensor.chore_points_',
  role: 'child',
  requiresApproval: true,
  notifyOnNewTask: true,
  notifyOnReward: true,
  pinCode: '',
  personEntityId: '',
};

interface Props {
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
  onAddUser: (user: Omit<User, 'id'>) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onRemoveUser: (id: string) => void;
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
  pointActions?: {
    approveApproval: (a: PendingApproval) => void;
    rejectApproval: (a: PendingApproval, reason?: string) => void;
    addPointsToUser: (haEntityId: string, points: number, reason?: string) => void;
    resetUserPoints: (haEntityId: string) => void;
  };
}

/** Jedna zakładka "Panel użytkownika": domyślnie podsumowanie wszystkich,
 *  z paskiem wyboru osoby (submenu) widocznym tylko dla adminów HA - zwykły
 *  domownik od razu widzi tylko swój panel, bez możliwości przełączenia się
 *  na kogoś innego. */
export const UserPanelHub: React.FC<Props> = ({
  users, tasks, taskRows, completions, customSchedule, periodicSchedules, rewards, history, pendingApprovals, overdue = [], hass,
  onAddUser, onUpdateUser, onRemoveUser,
  onAddRow, onUpdateRow, onRemoveRow, onToggleCompletion, onToggleWeeklyPattern, onToggleCustomSchedule,
  onSetPeriodicSchedule, onClearPeriodicSchedule,
  onReset, onAssign, pointActions
}) => {
  // Bez hass (podgląd lokalny) nikt nie jest "zalogowany" - domyślnie traktuj
  // jak admina, żeby podgląd dev pokazywał pełną funkcjonalność.
  const isAdmin = hass ? !!hass.user?.is_admin : true;

  // Domownik zalogowany do HA jako konto niebędące adminem: dopasuj go po
  // person.<x>.attributes.user_id === hass.user.id, potem po personEntityId usera.
  const myUser = useMemo(() => {
    if (!hass?.user) return undefined;
    const myPersonId = Object.entries(hass.states).find(
      ([id, s]) => id.startsWith('person.') && s.attributes.user_id === hass.user!.id
    )?.[0];
    if (!myPersonId) return undefined;
    return users.find(u => u.personEntityId === myPersonId);
  }, [hass, users]);

  const [selectedId, setSelectedId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState<Omit<User, 'id'>>(EMPTY_FORM);

  const selectedUser = useMemo(() => users.find(u => u.id === selectedId), [users, selectedId]);

  const handleAdd = () => {
    if (!newForm.name.trim()) {
      alert('Podaj imię nowego użytkownika.');
      return;
    }
    onAddUser(newForm);
    setNewForm(EMPTY_FORM);
    setIsAdding(false);
  };

  const userPanelProps = (user: User) => ({
    user,
    users,
    tasks,
    taskRows,
    completions,
    customSchedule,
    periodicSchedules,
    rewards,
    history,
    pendingApprovals,
    overdue,
    hass,
    onAddRow,
    onUpdateRow,
    onRemoveRow,
    onToggleCompletion,
    onToggleWeeklyPattern,
    onToggleCustomSchedule,
    onSetPeriodicSchedule,
    onClearPeriodicSchedule,
    onReset,
    onAssign,
    pointActions,
    onUpdateUser,
  });

  // NIE-ADMIN: brak przełącznika osoby, prosto trafia na swój panel.
  if (!isAdmin) {
    if (!myUser) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-8 text-center">
          <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-slate-600 text-sm">
            Nie znaleziono profilu KiddosPoints powiązanego z Twoim kontem Home Assistant.
            Poproś administratora, żeby powiązał Twoje konto z odpowiednim użytkownikiem (Panel użytkownika → Ustawienia konta → "Powiąż z osobą Home Assistant").
          </p>
        </div>
      );
    }
    return <UserPanel key={myUser.id} {...userPanelProps(myUser)} onRemoveUser={() => {}} />;
  }

  // ADMIN: pasek wyboru osoby (submenu) + podsumowanie jako widok domyślny.
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => { setSelectedId(''); setIsAdding(false); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${selectedId === '' && !isAdding ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <LayoutGrid className="w-4 h-4" /> Podsumowanie
        </button>
        <div className="w-px h-6 bg-slate-200 flex-shrink-0" />
        {users.map(u => (
          <button
            key={u.id}
            onClick={() => { setSelectedId(u.id); setIsAdding(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${selectedId === u.id && !isAdding ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <UserCircle2 className="w-4 h-4" /> {u.name}
          </button>
        ))}
        <button
          onClick={() => { setIsAdding(a => !a); setNewForm(EMPTY_FORM); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ml-auto flex-shrink-0 ${isAdding ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
        >
          <Plus className="w-4 h-4" /> Nowy użytkownik
        </button>
      </div>

      {isAdding && (
        <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
          <h3 className="font-semibold text-lg text-slate-800 mb-4">Nowy użytkownik</h3>
          <UserSettingsForm
            formData={newForm}
            onChange={updates => setNewForm(f => ({ ...f, ...updates }))}
            hass={hass}
            isNew={true}
          />
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
              Anuluj
            </button>
            <button onClick={handleAdd} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
              Dodaj użytkownika
            </button>
          </div>
        </div>
      )}

      {!isAdding && selectedId === '' && (
        <Summary users={users} tasks={tasks} taskRows={taskRows} completions={completions} overdue={overdue} />
      )}

      {!isAdding && selectedUser && (
        <UserPanel
          key={selectedUser.id}
          {...userPanelProps(selectedUser)}
          onRemoveUser={id => {
            onRemoveUser(id);
            setSelectedId('');
          }}
        />
      )}
    </div>
  );
};
