import { useState, useEffect } from 'react';
import { TaskRow, Completions, Person, Task, Reward, User, HistoryEntry, PendingApproval } from './types';
import { TASKS, REWARDS } from './data';

interface AppState {
  users: User[];
  tasks: Task[];
  rewards: Reward[];
  taskRows: Record<string, TaskRow[]>;
  completions: Completions;
  computerSlots: Record<string, number>;
  customSchedule: Record<string, boolean>;
  /** Zawsze pusta w trybie lokalnym — dziennik zmian punktów prowadzi tylko
   *  backend HA (useHaConfigStore). Obecna tu wyłącznie po to, by komponenty
   *  mogły czytać state.history niezależnie od tego, który store jest aktywny. */
  history: HistoryEntry[];
  /** Zawsze pusta lokalnie — kolejka akceptacji żyje tylko po stronie HA. */
  pendingApprovals: PendingApproval[];
}

const DEFAULT_USERS: User[] = [
  { id: 'u_adam', name: 'Adam', haEntityId: 'sensor.chore_points_adam', role: 'child', requiresApproval: true, notifyOnNewTask: true, notifyOnReward: true },
  { id: 'u_nina', name: 'Nina', haEntityId: 'sensor.chore_points_nina', role: 'child', requiresApproval: true, notifyOnNewTask: true, notifyOnReward: true },
  { id: 'u_tata', name: 'Tata', haEntityId: 'sensor.chore_points_tata', role: 'admin', requiresApproval: false, notifyOnNewTask: false, notifyOnReward: false },
  { id: 'u_mama', name: 'Mama', haEntityId: 'sensor.chore_points_mama', role: 'admin', requiresApproval: false, notifyOnNewTask: false, notifyOnReward: false },
];

const DEFAULT_STATE: AppState = {
  users: DEFAULT_USERS,
  tasks: TASKS,
  rewards: REWARDS,
  taskRows: TASKS.reduce((acc, task) => {
    acc[task.id] = [{ id: `${task.id}_0`, person: "" }];
    return acc;
  }, {} as Record<string, TaskRow[]>),
  completions: {},
  computerSlots: {},
  customSchedule: {},
  history: [],
  pendingApprovals: []
};

export function useAppStore() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('domowy-manager-state-v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          users: parsed.users || DEFAULT_STATE.users,
          tasks: parsed.tasks || DEFAULT_STATE.tasks,
          rewards: parsed.rewards || DEFAULT_STATE.rewards,
          taskRows: parsed.taskRows || DEFAULT_STATE.taskRows,
          completions: parsed.completions || DEFAULT_STATE.completions,
          computerSlots: parsed.computerSlots || DEFAULT_STATE.computerSlots,
          customSchedule: parsed.customSchedule || DEFAULT_STATE.customSchedule,
          history: DEFAULT_STATE.history
        };
      } catch (e) {
        console.error('Failed to parse saved state', e);
      }
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    localStorage.setItem('domowy-manager-state-v3', JSON.stringify(state));
  }, [state]);

  const addTask = (name: string, points: number) => {
    const newId = `t_custom_${Date.now()}`;
    setState(prev => ({
      ...prev,
      tasks: [...prev.tasks, { id: newId, name, points }],
      taskRows: { ...prev.taskRows, [newId]: [{ id: `${newId}_0`, person: "" }] }
    }));
  };

  const addReward = (name: string, points: number) => {
    const newId = `r_custom_${Date.now()}`;
    setState(prev => ({
      ...prev,
      rewards: [...prev.rewards, { id: newId, name, points }]
    }));
  };

  const addTaskRow = (taskId: string) => {
    setState(prev => {
      const rows = prev.taskRows[taskId] || [];
      return {
        ...prev,
        taskRows: {
          ...prev.taskRows,
          [taskId]: [...rows, { id: `${taskId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, person: "" }]
        }
      };
    });
  };

  const updateTaskRowPerson = (taskId: string, rowId: string, person: Person) => {
    setState(prev => {
      const rows = prev.taskRows[taskId] || [];
      return {
        ...prev,
        taskRows: {
          ...prev.taskRows,
          [taskId]: rows.map(r => r.id === rowId ? { ...r, person } : r)
        }
      };
    });
  };

  const removeTaskRow = (taskId: string, rowId: string) => {
    setState(prev => {
      const rows = prev.taskRows[taskId] || [];
      if (rows.length <= 1) return prev; // Keep at least one row
      
      // We should also clean up completions for this row, but leaving them is harmless as long as rowId is unique
      return {
        ...prev,
        taskRows: {
          ...prev.taskRows,
          [taskId]: rows.filter(r => r.id !== rowId)
        }
      };
    });
  };

  const toggleCompletion = (rowId: string, dayIndex: number, completed: boolean) => {
    setState(prev => {
      const key = `${rowId}_${dayIndex}`;
      const newCompletions = { ...prev.completions };
      if (completed) {
        newCompletions[key] = true;
      } else {
        delete newCompletions[key];
      }
      return { ...prev, completions: newCompletions };
    });
  };

  const toggleWeeklyPattern = (rowId: string, dayIndex: number, completed: boolean) => {
    setState(prev => {
      const newCompletions = { ...prev.completions };
      // Update this day and all subsequent days that fall on the same day of the week
      for (let d = dayIndex; d <= 31; d += 7) {
        const key = `${rowId}_${d}`;
        if (completed) {
          newCompletions[key] = true;
        } else {
          delete newCompletions[key];
        }
      }
      return { ...prev, completions: newCompletions };
    });
  };

  const updateRewardCost = (rewardId: string, cost: number) => {
    setState(prev => ({
      ...prev,
      rewards: prev.rewards.map(r => (r.id === rewardId ? { ...r, points: cost } : r))
    }));
  };

  const updateTaskPoints = (taskId: string, points: number) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => (t.id === taskId ? { ...t, points } : t))
    }));
  };

  const updateTaskName = (taskId: string, newName: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, name: newName } : t)
    }));
  };

  const removeTask = (taskId: string) => {
    if (confirm('Czy na pewno chcesz usunąć to zadanie całkowicie?')) {
      setState(prev => {
        const newTasks = prev.tasks.filter(t => t.id !== taskId);
        const newTaskRows = { ...prev.taskRows };
        delete newTaskRows[taskId];
        return {
          ...prev,
          tasks: newTasks,
          taskRows: newTaskRows
        };
      });
    }
  };

  const updateComputerSlot = (person: string, day: number, slots: number) => {
    setState(prev => ({
      ...prev,
      computerSlots: {
        ...prev.computerSlots,
        [`${person}_${day}`]: slots
      }
    }));
  };

  const toggleCustomSchedule = (taskId: string) => {
    setState(prev => ({
      ...prev,
      customSchedule: {
        ...prev.customSchedule,
        [taskId]: !prev.customSchedule[taskId]
      }
    }));
  };

  const assignUserToTask = (taskId: string, userId: string) => {
    setState(prev => {
      const rows = prev.taskRows[taskId] || [];
      const emptyRow = rows.find(r => !r.person);
      const newRows = emptyRow
        ? rows.map(r => (r.id === emptyRow.id ? { ...r, person: userId } : r))
        : [...rows, { id: `${taskId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, person: userId }];
      return { ...prev, taskRows: { ...prev.taskRows, [taskId]: newRows } };
    });
  };

  const unassignUserFromTask = (taskId: string, userId: string) => {
    setState(prev => {
      const rows = prev.taskRows[taskId] || [];
      const newRows = rows.length <= 1
        ? rows.map(r => (r.person === userId ? { ...r, person: '' } : r))
        : rows.filter(r => r.person !== userId);
      return { ...prev, taskRows: { ...prev.taskRows, [taskId]: newRows } };
    });
  };

  const importData = (importedState: Partial<AppState>) => {
    if (!importedState || typeof importedState !== 'object') return false;
    
    setState(prev => ({
      ...prev,
      users: (importedState.users && Array.isArray(importedState.users) && importedState.users.length > 0) ? importedState.users : prev.users,
      tasks: (importedState.tasks && Array.isArray(importedState.tasks) && importedState.tasks.length > 0) ? importedState.tasks : prev.tasks,
      rewards: (importedState.rewards && Array.isArray(importedState.rewards) && importedState.rewards.length > 0) ? importedState.rewards : prev.rewards,
      taskRows: importedState.taskRows || prev.taskRows,
      completions: importedState.completions || prev.completions,
      computerSlots: importedState.computerSlots || prev.computerSlots,
      customSchedule: importedState.customSchedule || prev.customSchedule
    }));
    return true;
  };

  const resetData = () => {
    if (confirm('Czy na pewno chcesz zresetować wszystkie postępy i rozpocząć od nowa?')) {
      setState(DEFAULT_STATE);
    }
  };

  const addUser = (user: Omit<User, 'id'>) => {
    setState(prev => ({
      ...prev,
      users: [...prev.users, { ...user, id: `u_${Date.now()}` }]
    }));
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => (u.id === id ? { ...u, ...updates } : u))
    }));
  };

  const removeUser = (id: string) => {
    if (state.users.length <= 1) {
      alert('W systemie musi pozostać co najmniej jeden użytkownik!');
      return;
    }
    if (confirm('Czy na pewno chcesz usunąć tego użytkownika? Jego dane mogą pozostać w historii.')) {
      setState(prev => {
        const newTaskRows: Record<string, TaskRow[]> = {};
        for (const [taskId, rows] of Object.entries(prev.taskRows)) {
          newTaskRows[taskId] = rows.map(r => (r.person === id ? { ...r, person: '' } : r));
        }
        return {
          ...prev,
          users: prev.users.filter(u => u.id !== id),
          taskRows: newTaskRows
        };
      });
    }
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
    assignUserToTask,
    unassignUserFromTask,
    importData,
    resetData
  };
}
