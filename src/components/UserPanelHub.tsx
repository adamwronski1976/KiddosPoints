import React, { useMemo, useState } from 'react';
import { User, Task, TaskRow, Completions, HistoryEntry, PendingApproval, Reward, Person } from '../types';
import { HomeAssistantLike } from '../haStore';
import { UserSettingsForm } from './UserSettingsForm';
import { UserPanel } from './UserPanel';
import { UserCircle2, Plus, ChevronDown } from 'lucide-react';

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
  rewards: Reward[];
  history: HistoryEntry[];
  pendingApprovals: PendingApproval[];
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
  onReset: () => void;
  onAssign: (taskId: string, userId: string) => void;
  pointActions?: {
    approveApproval: (a: PendingApproval) => void;
    rejectApproval: (a: PendingApproval, reason?: string) => void;
    addPointsToUser: (haEntityId: string, points: number, reason?: string) => void;
    resetUserPoints: (haEntityId: string) => void;
  };
}

/** Jedna zakładka "Panel użytkownika": selektor osoby + dodawanie nowego konta
 *  + pełny osobisty panel wybranej osoby (łącznie z edycją jej ustawień). */
export const UserPanelHub: React.FC<Props> = ({
  users, tasks, taskRows, completions, customSchedule, rewards, history, pendingApprovals, hass,
  onAddUser, onUpdateUser, onRemoveUser,
  onAddRow, onUpdateRow, onRemoveRow, onToggleCompletion, onToggleWeeklyPattern, onToggleCustomSchedule,
  onReset, onAssign, pointActions
}) => {
  const [selectedId, setSelectedId] = useState<string>(users[0]?.id || '');
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <UserCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <div className="relative flex-1 max-w-sm">
            <select
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setIsAdding(false); }}
              className="w-full appearance-none px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              {users.length === 0 && <option value="">Brak użytkowników</option>}
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <button
          onClick={() => { setIsAdding(a => !a); setNewForm(EMPTY_FORM); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex-shrink-0"
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

      {selectedUser && (
        <UserPanel
          key={selectedUser.id}
          user={selectedUser}
          users={users}
          tasks={tasks}
          taskRows={taskRows}
          completions={completions}
          customSchedule={customSchedule}
          rewards={rewards}
          history={history}
          pendingApprovals={pendingApprovals}
          hass={hass}
          onAddRow={onAddRow}
          onUpdateRow={onUpdateRow}
          onRemoveRow={onRemoveRow}
          onToggleCompletion={onToggleCompletion}
          onToggleWeeklyPattern={onToggleWeeklyPattern}
          onToggleCustomSchedule={onToggleCustomSchedule}
          onReset={onReset}
          onAssign={onAssign}
          pointActions={pointActions}
          onUpdateUser={onUpdateUser}
          onRemoveUser={id => {
            onRemoveUser(id);
            const remaining = users.filter(u => u.id !== id);
            setSelectedId(remaining[0]?.id || '');
          }}
        />
      )}
    </div>
  );
};
