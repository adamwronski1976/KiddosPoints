import React, { useState } from 'react';
import { Reward } from '../types';
import { guessRewardIcon } from '../iconGuess';
import { Gift, Plus, Pencil, Trash2 } from 'lucide-react';

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

  const renderForm = (title: string) => (
    <div className="mb-6 bg-pink-50/50 p-6 rounded-xl border border-pink-100">
      <h3 className="font-semibold text-lg text-slate-800 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-[80px_1fr_100px] gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ikona</label>
          <input
            type="text"
            value={form.icon}
            onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
            placeholder={guessRewardIcon(form.name)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-center text-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa nagrody</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="np. Wyjście do kina"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Koszt (pkt)</label>
          <input
            type="number"
            min={0}
            value={form.points}
            onChange={e => setForm(f => ({ ...f, points: parseInt(e.target.value, 10) || 0 }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Opis (opcjonalnie)</label>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
          rows={2}
          placeholder="Szczegóły nagrody..."
        />
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <button onClick={cancel} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
          Anuluj
        </button>
        <button onClick={save} className="px-4 py-2 text-sm font-medium text-white bg-pink-600 rounded-md hover:bg-pink-700">
          {editingId ? 'Zapisz zmiany' : 'Dodaj nagrodę'}
        </button>
      </div>
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
          <p className="text-sm text-slate-500 mt-1">Sklep z nagrodami: nazwa, opis, ikona i koszt w punktach.</p>
        </div>
        {!isAdding && !editingId && (
          <button onClick={startAdd} className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors">
            <Plus className="w-4 h-4" /> Dodaj nagrodę
          </button>
        )}
      </div>

      <div className="p-6">
        {isAdding && renderForm('Nowa nagroda')}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map(reward => (
            editingId === reward.id ? (
              <div key={reward.id} className="md:col-span-2 lg:col-span-3">
                {renderForm('Edytuj nagrodę')}
              </div>
            ) : (
              <div key={reward.id} className="flex flex-col gap-2 p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-2xl leading-none">{reward.icon || '🎁'}</span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{reward.name}</h3>
                      {reward.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{reward.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(reward)} className="p-1.5 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg" title="Edytuj">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onRemoveReward(reward.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Usuń">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full font-bold text-xs w-fit">{reward.points} pkt</span>
              </div>
            )
          ))}
          {rewards.length === 0 && !isAdding && (
            <div className="col-span-full text-center text-sm text-slate-400 italic py-8">Brak nagród — dodaj pierwszą powyżej.</div>
          )}
        </div>
      </div>
    </div>
  );
};
