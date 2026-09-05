import React, { useState } from 'react';
import { User } from '../types';
import { Shield, ShieldAlert, User as UserIcon, Settings2, Trash2, Edit2, Plus, Bell } from 'lucide-react';

interface Props {
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onRemoveUser: (id: string) => void;
}

export function UserManagement({ users, onAddUser, onUpdateUser, onRemoveUser }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<User, 'id'>>({
    name: '',
    haEntityId: 'sensor.chore_points_',
    role: 'child',
    requiresApproval: true,
    notifyOnNewTask: true,
    notifyOnReward: true,
    pinCode: '',
  });

  const handleSave = () => {
    if (!formData.name || !formData.haEntityId) {
      alert('Imię oraz encja Home Assistant są wymagane!');
      return;
    }
    
    if (editingId) {
      onUpdateUser(editingId, formData);
      setEditingId(null);
    } else {
      onAddUser(formData);
      setIsAdding(false);
    }
    
    setFormData({
      name: '',
      haEntityId: 'sensor.chore_points_',
      role: 'child',
      requiresApproval: true,
      notifyOnNewTask: true,
      notifyOnReward: true,
      pinCode: '',
    });
  };

  const startEdit = (user: User) => {
    setFormData(user);
    setEditingId(user.id);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({
      name: '',
      haEntityId: 'sensor.chore_points_',
      role: 'child',
      requiresApproval: true,
      notifyOnNewTask: true,
      notifyOnReward: true,
      pinCode: '',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-indigo-600" />
            Zarządzanie Użytkownikami i HA
          </h2>
          <p className="text-sm text-slate-500 mt-1">Konfiguruj dostęp, role, powiązania z Home Assistant oraz wymogi akceptacji zadań.</p>
        </div>
        {!isAdding && !editingId && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Dodaj Użytkownika
          </button>
        )}
      </div>

      <div className="p-6">
        {(isAdding || editingId) && (
          <div className="mb-8 bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
            <h3 className="font-semibold text-lg text-slate-800 mb-4">
              {editingId ? 'Edytuj Użytkownika' : 'Nowy Użytkownik'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Imię / Nazwa Wyświetlana</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData(f => {
                      const cleanSlug = val
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]/g, "_");
                      const shouldAutoUpdateEntity = !editingId && (!f.haEntityId || f.haEntityId.startsWith('sensor.chore_points_'));
                      return {
                        ...f,
                        name: val,
                        haEntityId: shouldAutoUpdateEntity ? `sensor.chore_points_${cleanSlug}` : f.haEntityId
                      };
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="np. Zosia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Encja HA (Points Sensor)</label>
                <input
                  type="text"
                  value={formData.haEntityId}
                  onChange={e => setFormData(f => ({ ...f, haEntityId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  placeholder="sensor.chore_points_zosia"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rola w systemie</label>
                <select
                  value={formData.role}
                  onChange={e => {
                    const newRole = e.target.value as any;
                    setFormData(f => ({
                      ...f,
                      role: newRole,
                      requiresApproval: newRole === 'child'
                    }));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="child">Dziecko (Podopieczny)</option>
                  <option value="member">Członek Rodziny</option>
                  <option value="admin">Administrator (Rodzic)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PIN Blokady (Lovelace)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.pinCode || ''}
                  onChange={e => setFormData(f => ({ ...f, pinCode: e.target.value.replace(/\D/g, '') }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  placeholder="4 cyfry lub puste"
                />
              </div>

              <div className="md:col-span-2 space-y-3 mt-2">
                <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formData.requiresApproval}
                    onChange={e => setFormData(f => ({ ...f, requiresApproval: e.target.checked }))}
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-slate-800">Wymaga akceptacji (Zatwierdzanie zadań)</span>
                    <span className="block text-xs text-slate-500">Jeśli włączone, po kliknięciu "Zrobione", zadanie wymaga potwierdzenia przez admina zanim przyznane zostaną punkty.</span>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formData.notifyOnNewTask}
                    onChange={e => setFormData(f => ({ ...f, notifyOnNewTask: e.target.checked }))}
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-slate-800">Powiadomienia w HA (Nowe zadania)</span>
                    <span className="block text-xs text-slate-500">Wyślij powiadomienie przez HA Mobile App, gdy przypisane zostanie nowe zadanie.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={cancelEdit}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                {editingId ? 'Zapisz zmiany' : 'Dodaj użytkownika'}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {users.map(user => (
            <div key={user.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-800 text-lg">{user.name}</h3>
                  {user.role === 'admin' && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>}
                  {user.requiresApproval && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Weryfikacja</span>}
                </div>
                <div className="text-sm font-mono text-slate-500 mb-3 flex items-center gap-1">
                  <UserIcon className="w-3 h-3" /> {user.haEntityId}
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.notifyOnNewTask && <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded border border-blue-100 flex items-center gap-1"><Bell className="w-3 h-3" /> Powiadomienia włączone</span>}
                  {user.pinCode && <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded border border-slate-200">Zabezpieczone PIN</span>}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <button 
                  onClick={() => startEdit(user)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Edytuj"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onRemoveUser(user.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Usuń"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
