import { useMemo } from 'react';
import { TaskRow, Completions, Person, User } from './types';

const CONFIG_ENTITY = 'sensor.chore_manager_config';

export interface HomeAssistantLike {
  states: Record<string, { state: string; attributes: Record<string, any> }>;
  callService: (domain: string, service: string, data?: Record<string, any>) => void;
}

interface HaAppState {
  users: User[];
  tasks: { id: string; name: string; points: number }[];
  rewards: { id: string; name: string; points: number }[];
  taskRows: Record<string, TaskRow[]>;
  completions: Completions;
  customRewardCosts: Record<string, number>;
  customTaskPoints: Record<string, number>;
  computerSlots: Record<string, number>;
  customSchedule: Record<string, boolean>;
}

const EMPTY_STATE: HaAppState = {
  users: [],
  tasks: [],
  rewards: [],
  taskRows: {},
  completions: {},
  customRewardCosts: {},
  customTaskPoints: {},
  computerSlots: {},
  customSchedule: {},
};

/**
 * Odpowiednik useAppStore, ale zamiast localStorage czyta/pisze konfigurację
 * do prawdziwego Home Assistant: stan pochodzi z atrybutów encji
 * sensor.chore_manager_config, a mutacje wołają usługę
 * chore_manager.update_config, więc są widoczne od razu na każdym urządzeniu.
 */
export function useHaConfigStore(hass: HomeAssistantLike) {
  const state: HaAppState = useMemo(() => {
    const attrs = hass.states[CONFIG_ENTITY]?.attributes;
    if (!attrs) return EMPTY_STATE;
    return {
      users: attrs.users || [],
      tasks: attrs.tasks || [],
      rewards: attrs.rewards || [],
      taskRows: attrs.taskRows || {},
      completions: attrs.completions || {},
      customRewardCosts: attrs.customRewardCosts || {},
      customTaskPoints: attrs.customTaskPoints || {},
      computerSlots: attrs.computerSlots || {},
      customSchedule: attrs.customSchedule || {},
    };
  }, [hass.states[CONFIG_ENTITY]]);

  const patch = (partial: Record<string, any>) => {
    hass.callService('chore_manager', 'update_config', { patch: partial });
  };

  const addTask = (name: string, points: number) => {
    const newId = `t_custom_${Date.now()}`;
    patch({
      tasks: [...state.tasks, { id: newId, name, points }],
      taskRows: { ...state.taskRows, [newId]: [{ id: `${newId}_0`, person: '' }] },
    });
  };

  const addReward = (name: string, points: number) => {
    const newId = `r_custom_${Date.now()}`;
    patch({ rewards: [...state.rewards, { id: newId, name, points }] });
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

  const updateRewardCost = (rewardId: string, cost: number) => {
    patch({ customRewardCosts: { ...state.customRewardCosts, [rewardId]: cost } });
  };

  const updateTaskPoints = (taskId: string, points: number) => {
    patch({ customTaskPoints: { ...state.customTaskPoints, [taskId]: points } });
  };

  const updateTaskName = (taskId: string, newName: string) => {
    patch({ tasks: state.tasks.map(t => (t.id === taskId ? { ...t, name: newName } : t)) });
  };

  const removeTask = (taskId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to zadanie całkowicie?')) return;
    const newTaskRows = { ...state.taskRows };
    delete newTaskRows[taskId];
    patch({ tasks: state.tasks.filter(t => t.id !== taskId), taskRows: newTaskRows });
  };

  const updateComputerSlot = (person: string, day: number, slots: number) => {
    patch({ computerSlots: { ...state.computerSlots, [`${person}_${day}`]: slots } });
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
    if (importedState.customRewardCosts) next.customRewardCosts = importedState.customRewardCosts;
    if (importedState.customTaskPoints) next.customTaskPoints = importedState.customTaskPoints;
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
      customRewardCosts: {},
      customTaskPoints: {},
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
    patch({ users: state.users.filter(u => u.id !== id) });
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
    updateRewardCost,
    updateTaskPoints,
    updateTaskName,
    removeTask,
    updateComputerSlot,
    toggleCustomSchedule,
    importData,
    resetData,
  };
}
