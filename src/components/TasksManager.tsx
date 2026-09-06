import React, { useState } from 'react';
import { Task, TaskRow } from '../types';
import { guessTaskIcon } from '../iconGuess';
import { ClipboardList, Plus, Pencil, Trash2 } from 'lucide-react';

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

  const renderForm = (title: string) => (
    <div className="mb-6 bg-emerald-50/50 p-6 rounded-xl border border-emerald-100">
      <h3 className="font-semibold text-lg text-slate-800 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-[80px_1fr_100px] gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ikona</label>
          <input
            type="text"
            value={form.icon}
            onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
            placeholder={guessTaskIcon(form.name)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-center text-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa zadania</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="np. Wyniesienie śmieci"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Punkty</label>
          <input
            type="number"
            min={0}
            value={form.points}
            onChange={e => setForm(f => ({ ...f, points: parseInt(e.target.value, 10) || 0 }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Opis (opcjonalnie)</label>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          rows={2}
          placeholder="Dodatkowe wskazówki, np. jak dokładnie wykonać zadanie..."
        />
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <button onClick={cancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
          Anuluj
        </button>
        <button onClick={save} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700">
          {editingId ? 'Zapisz zmiany' : 'Dodaj zadanie'}
        </button>
      </div>
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
          <p className="text-sm text-slate-500 mt-1">Katalog obowiązków: nazwa, opis, ikona i punkty. Przypisania osób do zadań ustawiasz w Harmonogramie.</p>
        </div>
        {!isAdding && !editingId && (
          <button onClick={startAdd} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" /> Dodaj zadanie
          </button>
        )}
      </div>

      <div className="p-6">
        {isAdding && renderForm('Nowe zadanie')}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(task => (
            editingId === task.id ? (
              <div key={task.id} className="md:col-span-2 lg:col-span-3">
                {renderForm('Edytuj zadanie')}
              </div>
            ) : (
              <div key={task.id} className="flex flex-col gap-2 p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-2xl leading-none">{task.icon || '📌'}</span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{task.name}</h3>
                      {task.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(task)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Edytuj">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onRemoveTask(task.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Usuń">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{task.points} pkt</span>
                  <span className="text-slate-400">{assignedCount(task.id)} os. przypisanych</span>
                </div>
              </div>
            )
          ))}
          {tasks.length === 0 && !isAdding && (
            <div className="col-span-full text-center text-sm text-slate-400 italic py-8">Brak zadań — dodaj pierwsze powyżej.</div>
          )}
        </div>
      </div>
    </div>
  );
};
