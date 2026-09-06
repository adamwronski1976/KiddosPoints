import React, { useState } from 'react';
import { Penalty } from '../types';
import { guessPenaltyIcon } from '../iconGuess';
import { MdiIcon } from './MdiIcon';
import { colorForId } from '../colorPalette';
import { AlertTriangle, Plus, Pencil, Trash2, Check, X } from 'lucide-react';

interface Props {
  penalties: Penalty[];
  onAddPenalty: (penalty: Omit<Penalty, 'id'>) => void;
  onUpdatePenalty: (penaltyId: string, updates: Partial<Penalty>) => void;
  onRemovePenalty: (penaltyId: string) => void;
}

const EMPTY_FORM = { name: '', description: '', points: 3, icon: '' };

export const PenaltiesManager: React.FC<Props> = ({ penalties, onAddPenalty, onUpdatePenalty, onRemovePenalty }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const startAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setIsAdding(true);
  };

  const startEdit = (penalty: Penalty) => {
    setForm({ name: penalty.name, description: penalty.description || '', points: penalty.points, icon: penalty.icon || '' });
    setEditingId(penalty.id);
    setIsAdding(false);
  };

  const cancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = () => {
    if (!form.name.trim()) return;
    const icon = form.icon.trim() || guessPenaltyIcon(form.name);
    const payload = { name: form.name.trim(), description: form.description.trim() || undefined, points: form.points, icon };
    if (editingId) {
      onUpdatePenalty(editingId, payload);
    } else {
      onAddPenalty(payload);
    }
    cancel();
  };

  const editRow = (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-2 px-4 py-2.5 bg-red-50/60 border-b border-red-100">
      <MdiIcon icon={form.icon || guessPenaltyIcon(form.name)} className="text-2xl text-red-600 flex-shrink-0" />
      <input
        type="text"
        value={form.icon}
        onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
        placeholder="mdi:..."
        className="w-32 flex-shrink-0 px-2 py-1.5 border border-slate-300 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      <input
        type="text"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder="Nazwa kary"
        autoFocus
        className="flex-1 min-w-[140px] px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      <input
        type="text"
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        placeholder="Opis (opcjonalnie)"
        className="flex-1 min-w-[140px] px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      <input
        type="number"
        min={0}
        value={form.points}
        onChange={e => setForm(f => ({ ...f, points: parseInt(e.target.value, 10) || 0 }))}
        className="w-20 flex-shrink-0 px-2 py-1.5 border border-slate-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      <button onClick={save} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg flex-shrink-0" title="Zapisz">
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
            <AlertTriangle className="w-6 h-6 text-red-600" />
            Kary ({penalties.length})
          </h2>
          <p className="text-sm text-slate-500 mt-1">Katalog kar: ikona mdi, nazwa, opis i liczba punktów odejmowana za dane zdarzenie.</p>
        </div>
        {!isAdding && !editingId && (
          <button onClick={startAdd} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
            <Plus className="w-4 h-4" /> Dodaj karę
          </button>
        )}
      </div>

      <div>
        {isAdding && editRow}

        {penalties.length === 0 && !isAdding ? (
          <div className="text-center text-sm text-slate-400 italic py-8">Brak kar — dodaj pierwszą powyżej.</div>
        ) : (
          penalties.map(penalty => (
            editingId === penalty.id ? (
              <div key={penalty.id}>{editRow}</div>
            ) : (
              <div key={penalty.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 group">
                <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colorForId(penalty.id).bg}`}>
                  <MdiIcon icon={penalty.icon || 'mdi:alert-circle-outline'} className={`text-lg ${colorForId(penalty.id).text}`} />
                </span>
                <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-slate-800">{penalty.name}</span>
                  {penalty.description && <span className="text-xs text-slate-400 truncate">{penalty.description}</span>}
                </div>
                <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0">-{penalty.points} pkt</span>
                <button onClick={() => startEdit(penalty)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="Edytuj">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => onRemovePenalty(penalty.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="Usuń">
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
