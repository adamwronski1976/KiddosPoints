import React, { useState } from 'react';
import { Task, TaskRow } from '../types';
import { guessTaskIcon } from '../iconGuess';
import { MdiIcon } from './MdiIcon';
import { colorForId } from '../colorPalette';
import { ClipboardList, Plus, Pencil, Trash2, Check, X } from 'lucide-react';

interface Props {
  tasks: Task[];
  taskRows: Record<string, TaskRow[]>;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onRemoveTask: (taskId: string) => void;
}

const EMPTY_FORM = { name: '', description: '', points: 1, icon: '' };

export const TasksManager: React.FC<Props> = ({ tasks, taskRows, onAddTask, onUpdateTask, onRemoveTask }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const startAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setIsAdding(true);
  };

  const startEdit = (task: Task) => {
    setForm({ name: task.name, description: task.description || '', points: task.points, icon: task.icon || '' });
    setEditingId(task.id);
    setIsAdding(false);
  };

  const cancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = () => {
    if (!form.name.trim()) return;
    const icon = form.icon.trim() || guessTaskIcon(form.name);
    const payload = { name: form.name.trim(), description: form.description.trim() || undefined, points: form.points, icon };
    if (editingId) {
      onUpdateTask(editingId, payload);
    } else {
      onAddTask(payload);
    }
    cancel();
  };

  const assignedCount = (taskId: string) => (taskRows[taskId] || []).filter(r => r.person).length;

  const editRow = (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-2 px-4 py-2.5 bg-emerald-50/60 border-b border-emerald-100">
      <MdiIcon icon={form.icon || guessTaskIcon(form.name)} className="text-2xl text-emerald-600 flex-shrink-0" />
      <input
        type="text"
        value={form.icon}
        onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
        placeholder="mdi:..."
        className="w-32 flex-shrink-0 px-2 py-1.5 border border-slate-300 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <input
        type="text"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder="Nazwa zadania"
        autoFocus
        className="flex-1 min-w-[140px] px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <input
        type="text"
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        placeholder="Opis (opcjonalnie)"
        className="flex-1 min-w-[140px] px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <input
        type="number"
        min={0}
        value={form.points}
        onChange={e => setForm(f => ({ ...f, points: parseInt(e.target.value, 10) || 0 }))}
        className="w-20 flex-shrink-0 px-2 py-1.5 border border-slate-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <button onClick={save} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg flex-shrink-0" title="Zapisz">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={cancel} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg flex-shrink-0" title="Anuluj">
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-emerald-600" />
            Zadania ({tasks.length})
          </h2>
          <p className="text-sm text-slate-500 mt-1">Katalog obowiązków: ikona mdi, nazwa, opis i punkty. Przypisania osób ustawiasz w Harmonogramie.</p>
        </div>
        {!isAdding && !editingId && (
          <button onClick={startAdd} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" /> Dodaj zadanie
          </button>
        )}
      </div>

      <div>
        {isAdding && editRow}

        {tasks.length === 0 && !isAdding ? (
          <div className="text-center text-sm text-slate-400 italic py-8">Brak zadań — dodaj pierwsze powyżej.</div>
        ) : (
          tasks.map(task => (
            editingId === task.id ? (
              <div key={task.id}>{editRow}</div>
            ) : (
              <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 group">
                <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colorForId(task.id).bg}`}>
                  <MdiIcon icon={task.icon || 'mdi:checkbox-marked-circle-outline'} className={`text-lg ${colorForId(task.id).text}`} />
                </span>
                <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-slate-800">{task.name}</span>
                  {task.description && <span className="text-xs text-slate-400 truncate">{task.description}</span>}
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0 hidden sm:inline">{assignedCount(task.id)} os.</span>
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0">{task.points} pkt</span>
                <button onClick={() => startEdit(task)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="Edytuj">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => onRemoveTask(task.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="Usuń">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          ))
        )}
      </div>
    </div>
  );
};
