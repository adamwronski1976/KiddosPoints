import React, { useState } from 'react';
import { Reward } from '../types';
import { Gift, Plus } from 'lucide-react';

interface RewardsProps {
  rewards: Reward[];
  customCosts: Record<string, number>;
  onUpdateCost: (rewardId: string, cost: number) => void;
  onAddReward: (name: string, points: number) => void;
}

export const Rewards: React.FC<RewardsProps> = ({ rewards, customCosts, onUpdateCost, onAddReward }) => {
  const [newName, setNewName] = useState("");
  const [newPoints, setNewPoints] = useState(10);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddReward(newName.trim(), newPoints);
      setNewName("");
      setNewPoints(10);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col w-full">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gift className="w-6 h-6 text-pink-600" />
          <h2 className="text-lg font-semibold text-slate-800">Cennik Nagród i Bonusów</h2>
        </div>
      </div>
      
      <div className="p-0 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nagroda</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-32">Koszt (pkt)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {rewards.map(reward => {
              const displayCost = customCosts[reward.id] !== undefined ? customCosts[reward.id] : reward.points;
              
              return (
                <tr key={reward.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 whitespace-normal text-sm font-medium text-slate-900">
                    {reward.name}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-right">
                    <input 
                      type="number"
                      min="0"
                      className="w-20 text-right border-slate-300 rounded-md shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm"
                      value={displayCost}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 0) {
                          onUpdateCost(reward.id, val);
                        }
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
        <form onSubmit={handleAdd} className="flex gap-3 items-end max-w-2xl">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">Nowa nagroda</label>
            <input 
              type="text" 
              className="w-full border-slate-300 rounded-md shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              placeholder="Nazwa nagrody..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Punkty</label>
            <input 
              type="number" 
              min="0"
              className="w-24 border-slate-300 rounded-md shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              value={newPoints}
              onChange={e => setNewPoints(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <button 
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <Plus className="w-4 h-4" /> Dodaj
          </button>
        </form>
      </div>
    </div>
  );
};
