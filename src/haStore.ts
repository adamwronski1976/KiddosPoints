import { useMemo } from 'react';
import { TaskRow, Completions, Person, User, HistoryEntry, PendingApproval, Task, Reward } from './types';

const CONFIG_ENTITY = 'sensor.chore_manager_config';
const HISTORY_ENTITY = 'sensor.chore_manager_history';
const PENDING_ENTITY = 'sensor.chore_manager_pending_approvals';

export interface HomeAssistantLike {
  states: Record<string, { state: string; attributes: Record<string, any> }>;
  callService: (domain: string, service: string, data?: Record<string, any>) => void;
}

interface HaAppState {
  users: User[];
  tasks: Task[];
  rewards: Reward[];
  taskRows: Record<string, TaskRow[]>;
  completions: Completions;
  computerSlots: Record<string, number>;
  customSchedule: Record<string, boolean>;
  history: HistoryEntry[];
  pendingApprovals: PendingApproval[];
}

const EMPTY_STATE: HaAppState = {
  users: [],
  tasks: [],
  rewards: [],
  taskRows: {},
  completions: {},
  computerSlots: {},
  customSchedule: {},
  history: [],
  pendingApprovals: [],
};

/**
 * Odpowiednik useAppStore, ale zamiast localStorage czyta/pisze konfigurację
 * do prawdziwego Home Assistant: stan pochodzi z atrybutów encji
 * sensor.chore_manager_config (+ sensor.chore_manager_history dla dziennika
 * punktów), a mutacje wołają usługę chore_manager.update_config, więc są
 * widoczne od razu na każdym urządzeniu.
 */
export function useHaConfigStore(hass: HomeAssistantLike) {
  const state: HaAppState = useMemo(() => {
    const attrs = hass.states[CONFIG_ENTITY]?.attributes;
    const historyItems = hass.states[HISTORY_ENTITY]?.attributes?.items;
    const pendingItems = hass.states[PENDING_ENTITY]?.attributes?.items;
    if (!attrs) return EMPTY_STATE;
    return {
      users: attrs.users || [],
      tasks: attrs.tasks || [],
      rewards: attrs.rewards || [],
      taskRows: attrs.taskRows || {},
      completions: attrs.completions || {},
      computerSlots: attrs.computerSlots || {},
      customSchedule: attrs.customSchedule || {},
      history: historyItems || [],
      pendingApprovals: pendingItems || [],
    };
  }, [hass.states[CONFIG_ENTITY], hass.states[HISTORY_ENTITY], hass.states[PENDING_ENTITY]]);

  const patch = (partial: Record<string, any>) => {
    hass.callService('chore_manager', 'update_config', { patch: partial });
  };

  const addTask = (task: Omit<Task, 'id'>) => {
    const newId = `t_custom_${Date.now()}`;
    patch({
      tasks: [...state.tasks, { ...task, id: newId }],
      taskRows: { ...state.taskRows, [newId]: [{ id: `${newId}_0`, person: '' }] },
    });
  };

  const addReward = (reward: Omit<Reward, 'id'>) => {
    const newId = `r_custom_${Date.now()}`;
    patch({ rewards: [...state.rewards, { ...reward, id: newId }] });
  };

  const addTaskRow = (taskId: string) => {
    const rows = state.taskRows[taskId] || [];
    patch({
      taskRows: {
        ...state.taskRows,
        [taskId]: [...rows, { id: `${taskId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, person: '' }],
      },
    });
  };

  const updateTaskRowPerson = (taskId: string, rowId: string, person: Person) => {
    const rows = state.taskRows[taskId] || [];
    patch({
      taskRows: {
        ...state.taskRows,
        [taskId]: rows.map(r => (r.id === rowId ? { ...r, person } : r)),
      },
    });
  };

  const removeTaskRow = (taskId: string, rowId: string) => {
    const rows = state.taskRows[taskId] || [];
    if (rows.length <= 1) return;
    patch({
      taskRows: {
        ...state.taskRows,
        [taskId]: rows.filter(r => r.id !== rowId),
      },
    });
  };

  const toggleCompletion = (rowId: string, dayIndex: number, completed: boolean) => {
    const key = `${rowId}_${dayIndex}`;
    const newCompletions = { ...state.completions };
    if (completed) {
      newCompletions[key] = true;
    } else {
      delete newCompletions[key];
    }
    patch({ completions: newCompletions });
  };

  const toggleWeeklyPattern = (rowId: string, dayIndex: number, completed: boolean) => {
    const newCompletions = { ...state.completions };
    for (let d = dayIndex; d <= 31; d += 7) {
      const key = `${rowId}_${d}`;
      if (completed) {
        newCompletions[key] = true;
      } else {
        delete newCompletions[key];
      }
    }
    patch({ completions: newCompletions });
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    patch({ tasks: state.tasks.map(t => (t.id === taskId ? { ...t, ...updates } : t)) });
  };

  const updateReward = (rewardId: string, updates: Partial<Reward>) => {
    patch({ rewards: state.rewards.map(r => (r.id === rewardId ? { ...r, ...updates } : r)) });
  };

  const removeTask = (taskId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to zadanie całkowicie?')) return;
    const newTaskRows = { ...state.taskRows };
    delete newTaskRows[taskId];
    patch({ tasks: state.tasks.filter(t => t.id !== taskId), taskRows: newTaskRows });
  };

  const removeReward = (rewardId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę nagrodę?')) return;
    patch({ rewards: state.rewards.filter(r => r.id !== rewardId) });
  };

  const updateComputerSlot = (person: string, day: number, slots: number) => {
    patch({ computerSlots: { ...state.computerSlots, [`${person}_${day}`]: slots } });
  };

  const assignUserToTask = (taskId: string, userId: string) => {
    const rows = state.taskRows[taskId] || [];
    const emptyRow = rows.find(r => !r.person);
    const newRows = emptyRow
      ? rows.map(r => (r.id === emptyRow.id ? { ...r, person: userId } : r))
      : [...rows, { id: `${taskId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, person: userId }];
    patch({ taskRows: { ...state.taskRows, [taskId]: newRows } });
  };

  const unassignUserFromTask = (taskId: string, userId: string) => {
    const rows = state.taskRows[taskId] || [];
    const newRows = rows.length <= 1
      ? rows.map(r => (r.person === userId ? { ...r, person: '' } : r))
      : rows.filter(r => r.person !== userId);
    patch({ taskRows: { ...state.taskRows, [taskId]: newRows } });
  };

  const toggleCustomSchedule = (taskId: string) => {
    patch({ customSchedule: { ...state.customSchedule, [taskId]: !state.customSchedule[taskId] } });
  };

  const importData = (importedState: Partial<HaAppState>) => {
    if (!importedState || typeof importedState !== 'object') return false;
    const next: Record<string, any> = {};
    if (Array.isArray(importedState.users) && importedState.users.length > 0) next.users = importedState.users;
    if (Array.isArray(importedState.tasks) && importedState.tasks.length > 0) next.tasks = importedState.tasks;
    if (Array.isArray(importedState.rewards) && importedState.rewards.length > 0) next.rewards = importedState.rewards;
    if (importedState.taskRows) next.taskRows = importedState.taskRows;
    if (importedState.completions) next.completions = importedState.completions;
    if (importedState.computerSlots) next.computerSlots = importedState.computerSlots;
    if (importedState.customSchedule) next.customSchedule = importedState.customSchedule;
    patch(next);
    return true;
  };

  const resetData = () => {
    if (!confirm('Czy na pewno chcesz zresetować wszystkie postępy i rozpocząć od nowa?')) return;
    patch({
      tasks: [],
      rewards: [],
      taskRows: {},
      completions: {},
      computerSlots: {},
      customSchedule: {},
    });
  };

  const addUser = (user: Omit<User, 'id'>) => {
    const id = `u_${Date.now()}`;
    patch({ users: [...state.users, { ...user, id, haEntityId: `sensor.chore_points_${id}` }] });
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    patch({ users: state.users.map(u => (u.id === id ? { ...u, ...updates } : u)) });
  };

  const removeUser = (id: string) => {
    if (state.users.length <= 1) {
      alert('W systemie musi pozostać co najmniej jeden użytkownik!');
      return;
    }
    if (!confirm('Czy na pewno chcesz usunąć tego użytkownika? Jego dane mogą pozostać w historii.')) return;
    // Odepnij przypisania tego użytkownika w harmonogramie, żeby nie zostały
    // "osierocone" wiersze wskazujące na nieistniejące już id.
    const newTaskRows: Record<string, TaskRow[]> = {};
    for (const [taskId, rows] of Object.entries(state.taskRows)) {
      newTaskRows[taskId] = rows.map(r => (r.person === id ? { ...r, person: '' } : r));
    }
    patch({ users: state.users.filter(u => u.id !== id), taskRows: newTaskRows });
  };

  // Akcje punktowe wołające bezpośrednio prawdziwe usługi chore_manager
  // (nie update_config) - to ten sam kontrakt, którego używa karta Lovelace.
  const approveApproval = (approval: PendingApproval) => {
    hass.callService('chore_manager', 'approve_task', {
      user: approval.user,
      task_id: approval.task_id,
      points: approval.points,
    });
  };

  const rejectApproval = (approval: PendingApproval, reason?: string) => {
    hass.callService('chore_manager', 'reject_task', {
      user: approval.user,
      task_id: approval.task_id,
      reason: reason || 'Niewykonane poprawnie',
    });
  };

  const addPointsToUser = (haEntityId: string, points: number, reason?: string) => {
    hass.callService('chore_manager', 'add_points', { user: haEntityId, points, reason });
  };

  const resetUserPoints = (haEntityId: string) => {
    if (!confirm('Wyzerować punkty tego użytkownika?')) return;
    hass.callService('chore_manager', 'reset_points', { user: haEntityId });
  };

  return {
    state,
    addUser,
    updateUser,
    removeUser,
    addTask,
    addReward,
    addTaskRow,
    updateTaskRowPerson,
    removeTaskRow,
    toggleCompletion,
    toggleWeeklyPattern,
    removeTask,
    updateComputerSlot,
    toggleCustomSchedule,
    assignUserToTask,
    unassignUserFromTask,
    importData,
    resetData,
    approveApproval,
    rejectApproval,
    addPointsToUser,
    resetUserPoints,
    updateTask,
    updateReward,
    removeReward,
  };
}
