export interface User {
  id: string;
  name: string;
  haEntityId: string;
  role: 'admin' | 'child' | 'member';
  requiresApproval: boolean;
  notifyOnNewTask: boolean;
  notifyOnReward: boolean;
  pinCode?: string;
}

export type Person = string;

export interface Task {
  id: string;
  name: string;
  points: number;
}

export interface Reward {
  id: string;
  name: string;
  points: number;
}

export interface TaskRow {
  id: string;
  person: Person;
}

// Completions stores if a task row is completed on a specific day (e.g. `${rowId}_${dayIndex}`)
export type Completions = Record<string, boolean>;
