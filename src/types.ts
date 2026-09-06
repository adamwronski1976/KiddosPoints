export interface User {
  id: string;
  name: string;
  haEntityId: string;
  role: 'admin' | 'child' | 'member';
  requiresApproval: boolean;
  notifyOnNewTask: boolean;
  notifyOnReward: boolean;
  /** Usługa HA doręczająca powiadomienia temu użytkownikowi, np.
   *  "notify.mobile_app_adams_iphone" (aplikacja) lub "notify.telegram_adam"
   *  (komunikator). Puste = brak wybranego kanału, powiadomienia nie są wysyłane
   *  mimo włączonych powyższych przełączników. */
  notifyService?: string;
  pinCode?: string;
  /** Opcjonalne powiązanie z prawdziwą osobą Home Assistant (np. "person.adam"),
   *  używane do pokazania jej zdjęcia/imienia. Etykiety grupowe (Rodzice,
   *  Dzieci, Wszyscy) nie mają odpowiednika i zostawiają to pole puste. */
  personEntityId?: string;
}

export interface PendingApproval {
  id: string;
  /** entity_id sensora punktów użytkownika */
  user: string;
  task_id: string;
  task_name: string;
  points: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  /** entity_id sensora punktów użytkownika, np. sensor.chore_points_adam */
  user: string;
  /** Czytelny opis zdarzenia - jedyne pole zawsze obecne (punkty, przypisania,
   *  zmiany ustawień, harmonogram - wszystko ląduje w "Historii postaci"). */
  reason: string;
  /** Obecne tylko przy zdarzeniach zmieniających punkty. */
  delta?: number;
  new_total?: number;
}

export interface OverdueItem {
  id: string;
  /** entity_id sensora punktów użytkownika */
  user: string;
  user_name: string;
  task_id: string;
  task_name: string;
  due: string;
  days_overdue: number;
}

export type Person = string;

export interface Task {
  id: string;
  name: string;
  points: number;
  description?: string;
  /** Emoji jako ikona - proste, przenośne, nie wymaga biblioteki ikon. */
  icon?: string;
}

export interface Reward {
  id: string;
  name: string;
  points: number;
  description?: string;
  icon?: string;
}

export interface Penalty {
  id: string;
  name: string;
  /** Liczba punktów odejmowana za to zdarzenie (wartość dodatnia). */
  points: number;
  description?: string;
  icon?: string;
}

export interface TaskRow {
  id: string;
  person: Person;
}

/** Harmonogram niestandardowy rozliczany w okresie (np. "2 razy w miesiącu"),
 *  zamiast konkretnych dni tygodnia - kluczowany po id wiersza (TaskRow.id),
 *  wzajemnie wykluczający się z harmonogramem tygodniowym dla tego wiersza. */
export interface PeriodicSchedule {
  times_per_period: number;
  period: 'month' | 'year';
}

// Completions stores if a task row is completed on a specific day (e.g. `${rowId}_${dayIndex}`)
export type Completions = Record<string, boolean>;
