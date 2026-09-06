export interface User {
  id: string;
  name: string;
  haEntityId: string;
  role: 'admin' | 'child' | 'member';
  requiresApproval: boolean;
  notifyOnNewTask: boolean;
  notifyOnReward: boolean;
  pinCode?: string;
  /** Opcjonalne powiązanie z prawdziwą osobą Home Assistant (np. "person.adam"),
   *  używane do pokazania jej zdjęcia/imienia. Etykiety grupowe (Rodzice,
   *  Dzieci, Wszyscy) nie mają odpowiednika i zostawiają to pole puste. */
  personEntityId?: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  /** entity_id sensora punktów użytkownika, np. sensor.chore_points_adam */
  user: string;
  delta: number;
  new_total: number;
  reason: string;
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
