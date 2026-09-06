import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useAppStore } from './store';
import { useHaConfigStore, HomeAssistantLike } from './haStore';
import { Summary } from './components/Summary';
import { Schedule } from './components/Schedule';
import { TasksManager } from './components/TasksManager';
import { RewardsManager } from './components/RewardsManager';
import { PenaltiesManager } from './components/PenaltiesManager';
import { ComputerTime } from './components/ComputerTime';
import { HistoryLog } from './components/HistoryLog';
import { UserPanelHub } from './components/UserPanelHub';
import { DownloadCloud, UploadCloud, Settings, ShieldCheck } from 'lucide-react';
import './chore-manager-card';

const NO_HASS: HomeAssistantLike = { states: {}, callService: () => {} };

interface AppProps {
  /** Prawdziwy obiekt hass, gdy panel jest osadzony w Home Assistant.
   *  Bez niego (np. `npm run dev`) panel działa na lokalnym mocku. */
  hass?: HomeAssistantLike;
}

export default function App({ hass }: AppProps) {
  const cardRef = useRef<HTMLElement>(null);
  const localStore = useAppStore();
  const haStore = useHaConfigStore(hass ?? NO_HASS);
  const {
    state,
    addTask,
    addReward,
    addPenalty,
    addTaskRow,
    updateTaskRowPerson,
    removeTaskRow,
    toggleCompletion,
    toggleWeeklyPattern,
    removeTask,
    updateComputerSlot,
    toggleCustomSchedule,
    importData,
    resetData,
    addUser,
    updateUser,
    removeUser,
    assignUserToTask,
    updateTask,
    updateReward,
    removeReward,
    updatePenalty,
    removePenalty
  } = hass ? haStore : localStore;

  // Akcje punktowe (zatwierdzanie, ręczna korekta) - dostępne tylko z prawdziwym
  // hass, bo wołają realne usługi chore_manager, a nie update_config.
  const pointActions = hass ? {
    approveApproval: haStore.approveApproval,
    rejectApproval: haStore.rejectApproval,
    addPointsToUser: haStore.addPointsToUser,
    resetUserPoints: haStore.resetUserPoints,
  } : undefined;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'admin' | 'tasks' | 'rewards' | 'penalties' | 'user' | 'lovelace'>('admin');

  // Stan punktów tymczasowych/dynamicznych dla symulatora HA
  const [userPointsOverride, setUserPointsOverride] = useState<Record<string, number>>({});
  const [pendingApprovals, setPendingApprovals] = useState<Array<{
    id: string;
    user: string;
    user_name: string;
    task_id: string;
    task_name: string;
    points: number;
  }>>([
    {
      id: 'sub_sample',
      user: 'sensor.chore_points_adam',
      user_name: 'Adam',
      task_id: 't2',
      task_name: 'Opróżnienie zmywarki',
      points: 15
    }
  ]);

  // Obliczenie punktów bazowych ze store
  const computedPoints = useMemo(() => {
    const map: Record<string, number> = {};
    state.users.forEach(u => {
      let earned = 0;
      state.tasks.forEach(task => {
        const rows = state.taskRows[task.id] || [];
        rows.forEach(row => {
          if (row.person === u.id || row.person === u.name) {
            for (let day = 1; day <= 31; day++) {
              if (state.completions[`${row.id}_${day}`]) {
                earned += task.points;
              }
            }
          }
        });
      });
      map[u.haEntityId || `sensor.chore_points_${u.id}`] = (userPointsOverride[u.id] !== undefined)
        ? userPointsOverride[u.id]
        : earned;
    });
    return map;
  }, [state.users, state.tasks, state.taskRows, state.completions, userPointsOverride]);

  // Przygotowanie mocka Home Assistant (hass)
  const hassMock = useMemo(() => {
    const states: Record<string, any> = {};

    // Sensory punktacji użytkowników
    state.users.forEach(u => {
      const entityId = u.haEntityId || `sensor.chore_points_${u.id}`;
      const pts = computedPoints[entityId] ?? 0;
      states[entityId] = {
        state: pts.toString(),
        attributes: {
          friendly_name: u.name,
          role: u.role,
          requires_approval: u.requiresApproval,
          pin: u.pinCode || '',
          icon: 'mdi:star-circle'
        }
      };
    });

    // Lista zadań (todo.chore_tasks)
    const today = new Date().getDate();
    const tasksForCard: any[] = [];
    state.tasks.forEach(task => {
      const rows = state.taskRows[task.id] || [];
      rows.forEach(row => {
        const assignedUser = state.users.find(u => u.id === row.person || u.name === row.person);
        tasksForCard.push({
          id: `${task.id}_${row.id}`,
          name: task.name,
          points: task.points,
          assigned_to: assignedUser ? assignedUser.name : (row.person || 'Wszyscy')
        });
      });
    });

    states['todo.chore_tasks'] = {
      state: tasksForCard.length.toString(),
      attributes: {
        tasks: tasksForCard
      }
    };

    // Sensor nagród (sensor.chore_rewards)
    states['sensor.chore_rewards'] = {
      state: state.rewards.length.toString(),
      attributes: {
        rewards: state.rewards.map(r => ({
          ...r,
          title: r.name,
          cost: r.points
        }))
      }
    };

    // Sensor oczekujących akceptacji (sensor.chore_manager_pending_approvals)
    states['sensor.chore_manager_pending_approvals'] = {
      state: pendingApprovals.length.toString(),
      attributes: {
        items: pendingApprovals
      }
    };

    // Sensor czasu komputera (sensor.chore_pc_time)
    const pcSlots: any[] = [];
    state.users.filter(u => u.role === 'child').forEach(child => {
      const slotVal = state.computerSlots[`${child.id}_${today}`];
      const minutes = slotVal !== undefined ? slotVal * 30 : 60;
      pcSlots.push({
        name: child.name,
        minutes: minutes
      });
    });
    states['sensor.chore_pc_time'] = {
      state: pcSlots.length.toString(),
      attributes: {
        slots: pcSlots
      }
    };

    return {
      states,
      callService: (domain: string, service: string, data: any) => {
        if (domain === 'chore_manager') {
          if (service === 'complete_task') {
            const userObj = state.users.find(u => u.haEntityId === data.user || u.id === data.user);
            const userName = userObj ? userObj.name : 'Użytkownik';

            if (data.requires_approval) {
              setPendingApprovals(prev => [
                ...prev,
                {
                  id: `sub_${Date.now()}`,
                  user: data.user,
                  user_name: userName,
                  task_id: data.task_id,
                  task_name: data.task_name || 'Wykonane zadanie',
                  points: data.points || 10
                }
              ]);
            } else {
              // Bezpośrednie dodanie punktów
              const targetId = userObj ? userObj.id : data.user;
              setUserPointsOverride(prev => ({
                ...prev,
                [targetId]: (prev[targetId] ?? computedPoints[data.user] ?? 0) + data.points
              }));
            }
          } else if (service === 'approve_task') {
            setPendingApprovals(prev => prev.filter(p => !(p.task_id === data.task_id && p.user === data.user)));
            const userObj = state.users.find(u => u.haEntityId === data.user || u.id === data.user);
            const targetId = userObj ? userObj.id : data.user;
            setUserPointsOverride(prev => ({
              ...prev,
              [targetId]: (prev[targetId] ?? computedPoints[data.user] ?? 0) + data.points
            }));
          } else if (service === 'reject_task') {
            setPendingApprovals(prev => prev.filter(p => !(p.task_id === data.task_id && p.user === data.user)));
          } else if (service === 'claim_reward') {
            const userObj = state.users.find(u => u.haEntityId === data.user || u.id === data.user);
            const targetId = userObj ? userObj.id : data.user;
            setUserPointsOverride(prev => ({
              ...prev,
              [targetId]: Math.max(0, (prev[targetId] ?? computedPoints[data.user] ?? 0) - data.cost)
            }));
          } else if (service === 'add_points') {
            const userObj = state.users.find(u => u.haEntityId === data.user || u.id === data.user);
            const targetId = userObj ? userObj.id : data.user;
            setUserPointsOverride(prev => ({
              ...prev,
              [targetId]: Math.max(0, (prev[targetId] ?? computedPoints[data.user] ?? 0) + data.points)
            }));
          } else if (service === 'reset_points') {
            const userObj = state.users.find(u => u.haEntityId === data.user || u.id === data.user);
            const targetId = userObj ? userObj.id : data.user;
            setUserPointsOverride(prev => ({
              ...prev,
              [targetId]: 0
            }));
          }
        }
      }
    };
  }, [state, computedPoints, pendingApprovals]);

  // Synchronizacja Lit komponentu z mockiem HASS
  useEffect(() => {
    if (cardRef.current && activeTab === 'lovelace') {
      const card = cardRef.current as any;
      card.setConfig({
        title: 'KiddosPoints - Obowiązki i Nagrody',
        show_rewards: true,
        show_pc_time: true
      });
      card.hass = hass ?? hassMock;
    }
  }, [hass, hassMock, activeTab]);

  const handleExportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "chore_manager_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const success = importData(json);
        if (success) {
          alert("Pomyślnie wczytano dane z kopii zapasowej!");
        } else {
          alert("Błąd: Nieprawidłowy format pliku.");
        }
      } catch (err) {
        alert("Błąd podczas wczytywania pliku JSON.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-12 w-full">
      <header className="bg-white shadow-sm mb-6 w-full sticky top-0 z-30 border-b border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              ⭐
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                KiddosPoints for Home Assistant
              </h1>
              <p className="text-xs text-slate-500">Integracja Python + Karta Lovelace w Lit + Panel Zarządzania</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap gap-y-1">
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'admin' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Panel Zarządzania (SPA)
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'tasks' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Zadania
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'rewards' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Nagrody
            </button>
            <button
              onClick={() => setActiveTab('penalties')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'penalties' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Kary
            </button>
            <button
              onClick={() => setActiveTab('user')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'user' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Panel użytkownika
            </button>
            <button
              onClick={() => setActiveTab('lovelace')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'lovelace' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Karta Lovelace (Podgląd HA)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImportBackup} />
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 shadow-sm text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50">
              <UploadCloud className="w-3.5 h-3.5" /> Wczytaj
            </button>
            <button onClick={handleExportBackup} className="inline-flex items-center gap-1.5 px-3 py-2 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700">
              <DownloadCloud className="w-3.5 h-3.5" /> Zapisz
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8">
        
        {/* WIDOK 1: KARTA LOVELACE (PODGLĄD DASHBOARDU HA) */}
        {activeTab === 'lovelace' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 p-4 rounded-xl flex items-start gap-3 shadow-sm">
              <ShieldCheck className="w-5 h-5 mt-0.5 text-indigo-600 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Interaktywny Symulator Dashboardu Lovelace</p>
                <p className="text-slate-600">
                  Poniższy element to dokładnie skompilowany plik <code>chore-manager-card.js</code> działający w silniku Lit Element. Wybierz profil (np. <strong>Adam</strong> lub <strong>Tata z PIN-em 1234</strong>), oznacz zadanie, sprawdź weryfikację rodzica lub odbierz nagrodę w sklepie!
                </p>
              </div>
            </div>
            
            <div 
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl transition-all" 
              style={{ 
                '--primary-color': '#3b82f6', 
                '--ha-card-background': '#1e293b', 
                '--card-background-color': '#0f172a',
                '--primary-text-color': '#f8fafc', 
                '--secondary-text-color': '#94a3b8', 
                '--secondary-background-color': '#1e293b', 
                '--divider-color': '#334155' 
              } as React.CSSProperties}
            >
              {/* @ts-ignore */}
              <chore-manager-card ref={cardRef}></chore-manager-card>
            </div>
          </div>
        )}

        {/* WIDOK 2: ZADANIA */}
        {activeTab === 'tasks' && (
          <div className="pb-12">
            <TasksManager
              tasks={state.tasks}
              taskRows={state.taskRows}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onRemoveTask={removeTask}
            />
          </div>
        )}

        {/* WIDOK 3: NAGRODY */}
        {activeTab === 'rewards' && (
          <div className="pb-12">
            <RewardsManager
              rewards={state.rewards}
              onAddReward={addReward}
              onUpdateReward={updateReward}
              onRemoveReward={removeReward}
            />
          </div>
        )}

        {/* WIDOK 3b: KARY */}
        {activeTab === 'penalties' && (
          <div className="pb-12">
            <PenaltiesManager
              penalties={state.penalties}
              onAddPenalty={addPenalty}
              onUpdatePenalty={updatePenalty}
              onRemovePenalty={removePenalty}
            />
          </div>
        )}

        {/* WIDOK 4: PANEL UŻYTKOWNIKA (selektor + pełny panel osoby) */}
        {activeTab === 'user' && (
          <div className="pb-12">
            <UserPanelHub
              users={state.users}
              tasks={state.tasks}
              taskRows={state.taskRows}
              completions={state.completions}
              customSchedule={state.customSchedule}
              rewards={state.rewards}
              history={state.history}
              pendingApprovals={state.pendingApprovals}
              overdue={state.overdue}
              hass={hass}
              onAddUser={addUser}
              onUpdateUser={updateUser}
              onRemoveUser={removeUser}
              onAddRow={addTaskRow}
              onUpdateRow={updateTaskRowPerson}
              onRemoveRow={removeTaskRow}
              onToggleCompletion={toggleCompletion}
              onToggleWeeklyPattern={toggleWeeklyPattern}
              onToggleCustomSchedule={toggleCustomSchedule}
              onReset={resetData}
              onAssign={assignUserToTask}
              pointActions={pointActions}
            />
          </div>
        )}

        {/* WIDOK 5: GŁÓWNY PANEL ZARZĄDZANIA - przegląd ogólny + harmonogram + czas PC */}
        {activeTab === 'admin' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 p-4 rounded-xl flex items-start gap-3">
              <Settings className="w-5 h-5 mt-0.5 text-indigo-600 shrink-0" />
              <p className="text-sm">
                <strong>Panel Zarządzania:</strong> Przegląd punktów wszystkich domowników i pełny harmonogram. Katalogiem zadań i nagród zarządzasz w osobnych zakładkach, a ustawieniami konkretnej osoby w Panelu użytkownika.
              </p>
            </div>

            <section className="w-full">
              <Summary
                users={state.users}
                tasks={state.tasks}
                taskRows={state.taskRows}
                completions={state.completions}
                overdue={state.overdue}
              />
            </section>

            <section className="w-full">
              <Schedule
                users={state.users}
                viewMode="week"
                tasks={state.tasks}
                taskRows={state.taskRows}
                completions={state.completions}
                customSchedule={state.customSchedule}
                isWeeklyPattern={true}
                onAddRow={addTaskRow}
                onUpdateRow={updateTaskRowPerson}
                onRemoveRow={removeTaskRow}
                onToggleCompletion={toggleCompletion}
                onToggleWeeklyPattern={toggleWeeklyPattern}
                onToggleCustomSchedule={toggleCustomSchedule}
                onReset={resetData}
              />
            </section>

            <section className="w-full">
              <Schedule
                users={state.users}
                viewMode="month"
                tasks={state.tasks}
                taskRows={state.taskRows}
                completions={state.completions}
                customSchedule={state.customSchedule}
                onAddRow={addTaskRow}
                onUpdateRow={updateTaskRowPerson}
                onRemoveRow={removeTaskRow}
                onToggleCompletion={toggleCompletion}
                onToggleCustomSchedule={toggleCustomSchedule}
                onReset={resetData}
              />
            </section>

            <section className="w-full">
              <ComputerTime
                users={state.users}
                computerSlots={state.computerSlots}
                onUpdateSlot={updateComputerSlot}
              />
            </section>

            <section className="w-full pb-12">
              <HistoryLog history={state.history} users={state.users} title="Historia postaci — wszyscy" />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
