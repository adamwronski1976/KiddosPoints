import React, { useState } from 'react';
import { Reward } from '../types';
import { guessRewardIcon } from '../iconGuess';
import { MdiIcon } from './MdiIcon';
import { colorForId } from '../colorPalette';
import { Gift, Plus, Pencil, Trash2, Check, X } from 'lucide-react';

interface Props {
  rewards: Reward[];
  onAddReward: (reward: Omit<Reward, 'id'>) => void;
  onUpdateReward: (rewardId: string, updates: Partial<Reward>) => void;
  onRemoveReward: (rewardId: string) => void;
}

const EMPTY_FORM = { name: '', description: '', points: 10, icon: '' };

export const RewardsManager: React.FC<Props> = ({ rewards, onAddReward, onUpdateReward, onRemoveReward }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const startAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setIsAdding(true);
  };

  const startEdit = (reward: Reward) => {
    setForm({ name: reward.name, description: reward.description || '', points: reward.points, icon: reward.icon || '' });
    setEditingId(reward.id);
    setIsAdding(false);
  };

  const cancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = () => {
    if (!form.name.trim()) return;
    const icon = form.icon.trim() || guessRewardIcon(form.name);
    const payload = { name: form.name.trim(), description: form.description.trim() || undefined, points: form.points, icon };
    if (editingId) {
      onUpdateReward(editingId, payload);
    } else {
      onAddReward(payload);
    }
    cancel();
  };

  const editRow = (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-2 px-4 py-2.5 bg-pink-50/60 border-b border-pink-100">
      <MdiIcon icon={form.icon || guessRewardIcon(form.name)} className="text-2xl text-pink-600 flex-shrink-0" />
      <input
        type="text"
        value={form.icon}
        onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
        placeholder="mdi:..."
        className="w-32 flex-shrink-0 px-2 py-1.5 border border-slate-300 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
      />
      <input
        type="text"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder="Nazwa nagrody"
        autoFocus
        className="flex-1 min-w-[140px] px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
      />
      <input
        type="text"
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        placeholder="Opis (opcjonalnie)"
        className="flex-1 min-w-[140px] px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
      />
      <input
        type="number"
        min={0}
        value={form.points}
        onChange={e => setForm(f => ({ ...f, points: parseInt(e.target.value, 10) || 0 }))}
        className="w-20 flex-shrink-0 px-2 py-1.5 border border-slate-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-pink-500"
      />
      <button onClick={save} className="p-1.5 text-pink-600 hover:bg-pink-100 rounded-lg flex-shrink-0" title="Zapisz">
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
            <Gift className="w-6 h-6 text-pink-600" />
            Nagrody ({rewards.length})
          </h2>
          <p className="text-sm text-slate-500 mt-1">Sklep z nagrodami: ikona mdi, nazwa, opis i koszt w punktach.</p>
        </div>
        {!isAdding && !editingId && (
          <button onClick={startAdd} className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors">
            <Plus className="w-4 h-4" /> Dodaj nagrodę
          </button>
        )}
      </div>

      <div>
        {isAdding && editRow}

        {rewards.length === 0 && !isAdding ? (
          <div className="text-center text-sm text-slate-400 italic py-8">Brak nagród — dodaj pierwszą powyżej.</div>
        ) : (
          rewards.map(reward => (
            editingId === reward.id ? (
              <div key={reward.id}>{editRow}</div>
            ) : (
              <div key={reward.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 group">
                <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colorForId(reward.id).bg}`}>
                  <MdiIcon icon={reward.icon || 'mdi:gift-outline'} className={`text-lg ${colorForId(reward.id).text}`} />
                </span>
                <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-slate-800">{reward.name}</span>
                  {reward.description && <span className="text-xs text-slate-400 truncate">{reward.description}</span>}
                </div>
                <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0">{reward.points} pkt</span>
                <button onClick={() => startEdit(reward)} className="p-1.5 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="Edytuj">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => onRemoveReward(reward.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="Usuń">
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
