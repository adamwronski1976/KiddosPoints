import { LitElement, html, css } from 'lit';

export class ChoreManagerCard extends LitElement {
  hass: any;
  config: any;
  _selectedUserId: string;
  _activeTab: string;
  _pinInput: string;
  _pinError: string;
  _unlockedUsers: Record<string, boolean>;
  _pendingPinUser: any;
  _notification: string;

  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _selectedUserId: { type: String, state: true },
      _activeTab: { type: String, state: true },
      _pinInput: { type: String, state: true },
      _pinError: { type: String, state: true },
      _unlockedUsers: { type: Object, state: true }, // Set of unlocked user IDs
      _pendingPinUser: { type: Object, state: true },
      _notification: { type: String, state: true }
    };
  }

  constructor() {
    super();
    this.config = {};
    this._selectedUserId = '';
    this._activeTab = 'tasks';
    this._pinInput = '';
    this._pinError = '';
    this._unlockedUsers = {};
    this._pendingPinUser = null;
    this._notification = '';
  }

  setConfig(config: any) {
    if (!config) {
      throw new Error("Brak konfiguracji karty");
    }
    this.config = {
      title: 'KiddosPoints - Zadania i Nagrody',
      show_rewards: true,
      show_pc_time: true,
      ...config
    };
  }

  getCardSize() {
    return 5;
  }

  _showToast(msg: string) {
    this._notification = msg;
    setTimeout(() => {
      this._notification = '';
    }, 3500);
  }

  _selectUser(user: any) {
    if (this._selectedUserId === user.id) {
      this._selectedUserId = '';
      return;
    }

    // Jeśli użytkownik ma PIN i nie został jeszcze odblokowany w tej sesji
    if (user.pinCode && !this._unlockedUsers[user.id]) {
      this._pendingPinUser = user;
      this._pinInput = '';
      this._pinError = '';
      return;
    }

    this._selectedUserId = user.id;
  }

  _verifyPin() {
    if (!this._pendingPinUser) return;
    if (this._pinInput === this._pendingPinUser.pinCode) {
      const userName = this._pendingPinUser.name;
      this._unlockedUsers = { ...this._unlockedUsers, [this._pendingPinUser.id]: true };
      this._selectedUserId = this._pendingPinUser.id;
      this._pendingPinUser = null;
      this._pinInput = '';
      this._pinError = '';
      this._showToast(`Zalogowano jako ${userName}!`);
    } else {
      this._pinError = 'Nieprawidłowy kod PIN!';
      this._pinInput = '';
    }
  }

  _cancelPin() {
    this._pendingPinUser = null;
    this._pinInput = '';
    this._pinError = '';
  }

  _completeTask(task: any) {
    if (!this._selectedUserId) {
      this._showToast("Wybierz swój profil powyżej, aby oznaczyć zadanie!");
      return;
    }

    const currentUser = this._getCurrentUser();
    if (!currentUser) return;

    const requiresApproval = currentUser.requiresApproval ?? (currentUser.role === 'child');

    this.hass.callService('chore_manager', 'complete_task', {
      task_id: task.id,
      task_name: task.name,
      user: currentUser.haEntityId || currentUser.id,
      points: task.points || 10,
      requires_approval: requiresApproval
    });

    if (requiresApproval) {
      this._showToast(`Zadanie "${task.name}" zgłoszone do zatwierdzenia przez rodzica!`);
    } else {
      this._showToast(`Świetna robota! +${task.points || 10} pkt przyznane!`);
    }
  }

  _approveTask(pending: any) {
    const currentUser = this._getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      this._showToast("Tylko administrator może zatwierdzać zadania!");
      return;
    }

    this.hass.callService('chore_manager', 'approve_task', {
      task_id: pending.task_id,
      user: pending.user,
      points: pending.points || 10
    });

    this._showToast(`Zatwierdzono zadanie! Przyznano +${pending.points} pkt.`);
  }

  _rejectTask(pending: any) {
    const currentUser = this._getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      this._showToast("Tylko administrator może odrzucać zadania!");
      return;
    }

    this.hass.callService('chore_manager', 'reject_task', {
      task_id: pending.task_id,
      user: pending.user,
      reason: 'Wymaga poprawy'
    });

    this._showToast("Zadanie odrzucone.");
  }

  _claimReward(reward: any) {
    const currentUser = this._getCurrentUser();
    if (!currentUser) {
      this._showToast("Najpierw wybierz swój profil!");
      return;
    }

    const rewardTitle = reward.title || reward.name || 'Nagroda';
    const rewardCost = reward.cost ?? reward.points ?? 0;
    const points = currentUser.points || 0;
    if (points < rewardCost) {
      this._showToast(`Brakuje Ci jeszcze ${rewardCost - points} pkt na tę nagrodę!`);
      return;
    }

    this.hass.callService('chore_manager', 'claim_reward', {
      reward_id: reward.id,
      reward_name: rewardTitle,
      cost: rewardCost,
      user: currentUser.haEntityId || currentUser.id
    });

    this._showToast(`Nagroda "${rewardTitle}" odebrana! Miłego korzystania!`);
  }

  _getCurrentUser() {
    const users = this._getUsers();
    return users.find(u => u.id === this._selectedUserId);
  }

  _getUsers() {
    if (!this.hass || !this.hass.states) return [];

    // Pobieramy użytkowników ze stanów HA
    const users: any[] = [];
    Object.keys(this.hass.states).forEach(entityId => {
      if (entityId.startsWith('sensor.chore_points_')) {
        const stateObj = this.hass.states[entityId];
        const rawName = stateObj.attributes.friendly_name || entityId.replace('sensor.chore_points_', '');
        users.push({
          id: entityId,
          haEntityId: entityId,
          name: rawName,
          points: parseInt(stateObj.state, 10) || 0,
          role: stateObj.attributes.role || (rawName.toLowerCase().includes('tata') || rawName.toLowerCase().includes('mama') ? 'admin' : 'child'),
          requiresApproval: stateObj.attributes.requires_approval ?? !rawName.toLowerCase().includes('tata'),
          pinCode: stateObj.attributes.pin || (stateObj.attributes.role === 'admin' ? '1234' : ''),
          avatar: stateObj.attributes.avatar || ''
        });
      }
    });

    return users;
  }

  _getTasks() {
    if (!this.hass || !this.hass.states) return [];
    const todoList = this.hass.states['todo.chore_tasks'];
    return (todoList && todoList.attributes && todoList.attributes.tasks) || [];
  }

  _getPendingApprovals() {
    if (!this.hass || !this.hass.states) return [];
    const pendingEntity = this.hass.states['sensor.chore_manager_pending_approvals'];
    return (pendingEntity && pendingEntity.attributes && pendingEntity.attributes.items) || [];
  }

  _getRewards() {
    if (!this.hass || !this.hass.states) return [];
    const rewardsEntity = this.hass.states['sensor.chore_rewards'];
    if (rewardsEntity && rewardsEntity.attributes && rewardsEntity.attributes.rewards) {
      return rewardsEntity.attributes.rewards;
    }
    // Domyślne nagrody w razie braku sensora
    return [
      { id: 'r1', title: '1h Komputera / Gry', cost: 50, icon: 'mdi:laptop' },
      { id: 'r2', title: 'Wybór obiadu', cost: 100, icon: 'mdi:food' },
      { id: 'r3', title: 'Wyjście do Kina', cost: 200, icon: 'mdi:movie' },
      { id: 'r4', title: 'Kieszonkowe 20 zł', cost: 150, icon: 'mdi:cash' }
    ];
  }

  _getPcTime() {
    if (!this.hass || !this.hass.states) return [];
    const pcEntity = this.hass.states['sensor.chore_pc_time'];
    return (pcEntity && pcEntity.attributes && pcEntity.attributes.slots) || [];
  }

  render() {
    if (!this.hass) {
      return html`<ha-card><div class="loading">Ładowanie danych Home Assistant...</div></ha-card>`;
    }

    const title = this.config.title || 'Domowy Manager Zadań';
    const users = this._getUsers();
    const tasks = this._getTasks();
    const pending = this._getPendingApprovals();
    const rewards = this._getRewards();
    const pcTime = this._getPcTime();
    const currentUser = this._getCurrentUser();

    return html`
      <ha-card>
        <!-- TOAST POWIADOMIENIA -->
        ${this._notification ? html`
          <div class="toast-message">
            ${this._notification}
          </div>
        ` : ''}

        <!-- MODAL WPISYWANIA KODU PIN -->
        ${this._pendingPinUser ? html`
          <div class="pin-modal-overlay">
            <div class="pin-modal-box">
              <div class="pin-title">Podaj PIN dla ${this._pendingPinUser.name}</div>
              <p class="pin-subtitle">Profil jest zabezpieczony 4-cyfrowym kodem</p>
              
              <div class="pin-display">
                ${['', '', '', ''].map((_, idx) => html`
                  <span class="pin-dot ${this._pinInput.length > idx ? 'filled' : ''}"></span>
                `)}
              </div>

              ${this._pinError ? html`<div class="pin-error">${this._pinError}</div>` : ''}

              <!-- KLAWIATURA PIN -->
              <div class="pin-keypad">
                ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => html`
                  <button 
                    class="pin-key" 
                    @click=${() => {
                      if (this._pinInput.length < 4) {
                        this._pinInput += num.toString();
                        if (this._pinInput.length === 4) {
                          setTimeout(() => this._verifyPin(), 150);
                        }
                      }
                    }}
                  >
                    ${num}
                  </button>
                `)}
                <button class="pin-key action" @click=${() => this._cancelPin()}>Anuluj</button>
                <button 
                  class="pin-key" 
                  @click=${() => {
                    if (this._pinInput.length < 4) {
                      this._pinInput += '0';
                      if (this._pinInput.length === 4) {
                        setTimeout(() => this._verifyPin(), 150);
                      }
                    }
                  }}
                >
                  0
                </button>
                <button 
                  class="pin-key action" 
                  @click=${() => { this._pinInput = this._pinInput.slice(0, -1); }}
                >
                  ⌫
                </button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- NAGŁÓWEK KARTY -->
        <div class="card-header">
          <div class="header-title-row">
            <h2 class="card-title">${title}</h2>
            ${currentUser ? html`
              <span class="current-role-badge ${currentUser.role}">
                ${currentUser.role === 'admin' ? '🛡️ Administrator' : '⭐ Podopieczny'}
              </span>
            ` : ''}
          </div>
          
          <!-- LISTA PROFILI DOMOWNIKÓW -->
          <div class="users-bar">
            ${users.map(u => {
              const isSelected = this._selectedUserId === u.id;
              return html`
                <div 
                  class="user-pill ${isSelected ? 'active' : ''}" 
                  @click=${() => this._selectUser(u)}
                >
                  <div class="user-avatar">
                    ${u.name.charAt(0).toUpperCase()}
                  </div>
                  <div class="user-details">
                    <span class="user-name">${u.name}</span>
                    <span class="user-points-text">${u.points} pkt</span>
                  </div>
                  ${u.pinCode ? html`<span class="pin-indicator" title="Wymaga PIN">🔒</span>` : ''}
                </div>
              `;
            })}
          </div>
        </div>

        <!-- ZAKŁADKI KARTY (TABS) -->
        <div class="tabs-nav">
          <button 
            class="tab-btn ${this._activeTab === 'tasks' ? 'active' : ''}" 
            @click=${() => { this._activeTab = 'tasks'; }}
          >
            🧹 Zadania (${tasks.length})
          </button>
          
          <button 
            class="tab-btn ${this._activeTab === 'approvals' ? 'active' : ''}" 
            @click=${() => { this._activeTab = 'approvals'; }}
          >
            ⏳ Do akceptacji ${pending.length > 0 ? html`<span class="badge-count">${pending.length}</span>` : ''}
          </button>

          ${this.config.show_rewards !== false ? html`
            <button 
              class="tab-btn ${this._activeTab === 'rewards' ? 'active' : ''}" 
              @click=${() => { this._activeTab = 'rewards'; }}
            >
              🎁 Sklep (${rewards.length})
            </button>
          ` : ''}

          ${this.config.show_pc_time !== false ? html`
            <button 
              class="tab-btn ${this._activeTab === 'pctime' ? 'active' : ''}" 
              @click=${() => { this._activeTab = 'pctime'; }}
            >
              💻 Czas PC
            </button>
          ` : ''}
        </div>

        <!-- ZAWARTOŚĆ AKTYWNEJ ZAKŁADKI -->
        <div class="tab-content">
          
          <!-- ZAKŁADKA 1: ZADANIA -->
          ${this._activeTab === 'tasks' ? html`
            <div class="tasks-container">
              ${tasks.length === 0 ? html`
                <div class="empty-state">
                  <div class="empty-icon">🎉</div>
                  <div class="empty-text">Wszystkie zadania wykonane! Wspaniale!</div>
                </div>
              ` : tasks.map(t => {
                return html`
                  <div class="task-card">
                    <div class="task-info">
                      <div class="task-title-row">
                        <span class="task-title">${t.name}</span>
                        <span class="task-badge">+${t.points || 10} pkt</span>
                      </div>
                      ${t.assigned_to ? html`<div class="task-assignee">Przydzielone: <strong>${t.assigned_to}</strong></div>` : ''}
                    </div>
                    <button 
                      class="btn-action ${!this._selectedUserId ? 'btn-disabled' : ''}" 
                      @click=${() => this._completeTask(t)}
                    >
                      ${currentUser && (currentUser.requiresApproval ?? currentUser.role === 'child') ? 'Zgłoś wykonanie' : 'Zrobione!'}
                    </button>
                  </div>
                `;
              })}
            </div>
          ` : ''}

          <!-- ZAKŁADKA 2: DO AKCEPTACJI -->
          ${this._activeTab === 'approvals' ? html`
            <div class="approvals-container">
              ${pending.length === 0 ? html`
                <div class="empty-state">
                  <div class="empty-icon">✅</div>
                  <div class="empty-text">Brak zgłoszeń oczekujących na weryfikację rodziców.</div>
                </div>
              ` : pending.map(p => {
                const isAdmin = currentUser && currentUser.role === 'admin';
                return html`
                  <div class="approval-card">
                    <div class="approval-info">
                      <div class="approval-task-name">${p.task_name || p.task_id}</div>
                      <div class="approval-meta">
                        Zgłosił(a): <strong>${p.user_name || p.user}</strong> • Nagroda: <strong>+${p.points} pkt</strong>
                      </div>
                    </div>
                    ${isAdmin ? html`
                      <div class="approval-actions">
                        <button class="btn-reject" @click=${() => this._rejectTask(p)}>Odrzuć</button>
                        <button class="btn-approve" @click=${() => this._approveTask(p)}>Zatwierdź</button>
                      </div>
                    ` : html`
                      <span class="approval-waiting-badge">Oczekuje na rodzica</span>
                    `}
                  </div>
                `;
              })}
            </div>
          ` : ''}

          <!-- ZAKŁADKA 3: SKLEP Z NAGRODAMI -->
          ${this._activeTab === 'rewards' ? html`
            <div class="rewards-grid">
              ${rewards.map(r => {
                const title = r.title || r.name || 'Nagroda';
                const cost = r.cost ?? r.points ?? 0;
                const userPoints = currentUser ? currentUser.points : 0;
                const canAfford = currentUser && userPoints >= cost;
                return html`
                  <div class="reward-item ${canAfford ? 'can-afford' : ''}">
                    <div class="reward-top">
                      <span class="reward-title">${title}</span>
                      <span class="reward-cost">${cost} pkt</span>
                    </div>
                    <p class="reward-hint">
                      ${currentUser ? (canAfford ? 'Możesz odebrać!' : `Brakuje ${cost - userPoints} pkt`) : 'Wybierz profil'}
                    </p>
                    <button 
                      class="btn-reward ${!canAfford ? 'btn-disabled' : ''}" 
                      ?disabled=${!canAfford}
                      @click=${() => this._claimReward(r)}
                    >
                      Odbierz nagrodę
                    </button>
                  </div>
                `;
              })}
            </div>
          ` : ''}

          <!-- ZAKŁADKA 4: CZAS PC -->
          ${this._activeTab === 'pctime' ? html`
            <div class="pc-time-container">
              <p class="section-desc">Przydział czasu gry / komputera na dzisiaj według zdobytych punktów i harmonogramu:</p>
              ${pcTime.length === 0 ? html`
                <div class="empty-state">Brak skonfigurowanych limitów czasu PC.</div>
              ` : pcTime.map((slot: any) => html`
                <div class="pc-slot-row">
                  <span class="pc-person-name">💻 ${slot.name}</span>
                  <span class="pc-hours-badge">${slot.minutes || 60} minut</span>
                </div>
              `)}
            </div>
          ` : ''}

        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
        font-family: var(--ha-card-header-font-family, inherit);
      }
      ha-card {
        background: var(--ha-card-background, var(--card-background-color, #1e1e24));
        border-radius: var(--ha-card-border-radius, 16px);
        box-shadow: var(--ha-card-box-shadow, 0 4px 20px rgba(0,0,0,0.15));
        color: var(--primary-text-color, #f1f5f9);
        overflow: hidden;
        position: relative;
      }
      .toast-message {
        position: absolute;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--primary-color, #3b82f6);
        color: white;
        padding: 8px 18px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        z-index: 100;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: fadeIn 0.2s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -10px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
      .card-header {
        padding: 18px 20px 14px 20px;
        border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.08));
      }
      .header-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
      }
      .card-title {
        margin: 0;
        font-size: 19px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .current-role-badge {
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 20px;
        font-weight: 600;
      }
      .current-role-badge.admin {
        background: rgba(168, 85, 247, 0.2);
        color: #c084fc;
        border: 1px solid rgba(168, 85, 247, 0.4);
      }
      .current-role-badge.child {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
        border: 1px solid rgba(59, 130, 246, 0.4);
      }
      .users-bar {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        padding-bottom: 4px;
        scrollbar-width: none;
      }
      .users-bar::-webkit-scrollbar {
        display: none;
      }
      .user-pill {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--secondary-background-color, rgba(255,255,255,0.06));
        border: 2px solid transparent;
        padding: 6px 12px 6px 6px;
        border-radius: 28px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        min-width: max-content;
      }
      .user-pill:hover {
        background: var(--divider-color, rgba(255,255,255,0.12));
      }
      .user-pill.active {
        border-color: var(--primary-color, #3b82f6);
        background: rgba(59, 130, 246, 0.15);
      }
      .user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--primary-color, #3b82f6);
        color: white;
        font-weight: bold;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .user-details {
        display: flex;
        flex-direction: column;
      }
      .user-name {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.1;
      }
      .user-points-text {
        font-size: 11px;
        color: var(--primary-color, #3b82f6);
        font-weight: 700;
      }
      .pin-indicator {
        font-size: 11px;
      }

      /* TABS NAVIGATION */
      .tabs-nav {
        display: flex;
        background: var(--secondary-background-color, rgba(255,255,255,0.03));
        border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.08));
        overflow-x: auto;
      }
      .tab-btn {
        flex: 1;
        padding: 12px 8px;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--secondary-text-color, #94a3b8);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        white-space: nowrap;
      }
      .tab-btn:hover {
        color: var(--primary-text-color, #ffffff);
      }
      .tab-btn.active {
        color: var(--primary-color, #3b82f6);
        border-bottom-color: var(--primary-color, #3b82f6);
      }
      .badge-count {
        background: var(--error-color, #ef4444);
        color: white;
        border-radius: 10px;
        padding: 1px 6px;
        font-size: 10px;
        font-weight: bold;
      }

      /* CONTENT AREA */
      .tab-content {
        padding: 16px 20px 20px 20px;
      }
      .tasks-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .task-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        border: 1px solid var(--divider-color, rgba(255,255,255,0.08));
        border-radius: 12px;
        padding: 12px 16px;
        transition: transform 0.15s, background 0.15s;
      }
      .task-card:hover {
        background: var(--divider-color, rgba(255,255,255,0.08));
      }
      .task-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .task-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .task-title {
        font-weight: 600;
        font-size: 14px;
      }
      .task-badge {
        background: rgba(34, 197, 94, 0.18);
        color: #4ade80;
        font-weight: bold;
        font-size: 11px;
        padding: 2px 7px;
        border-radius: 12px;
      }
      .task-assignee {
        font-size: 11px;
        color: var(--secondary-text-color, #94a3b8);
      }
      .btn-action {
        background: var(--primary-color, #3b82f6);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s, transform 0.1s;
      }
      .btn-action:hover:not(.btn-disabled) {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .btn-disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      /* APPROVALS */
      .approvals-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .approval-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        border-radius: 12px;
        padding: 12px 16px;
        border: 1px solid rgba(234, 179, 8, 0.3);
      }
      .approval-task-name {
        font-weight: 600;
        font-size: 14px;
      }
      .approval-meta {
        font-size: 11px;
        color: var(--secondary-text-color, #94a3b8);
      }
      .approval-actions {
        display: flex;
        gap: 6px;
      }
      .btn-approve {
        background: #22c55e;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-reject {
        background: #ef4444;
        color: white;
        border: none;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .approval-waiting-badge {
        font-size: 11px;
        color: #eab308;
        background: rgba(234, 179, 8, 0.15);
        padding: 4px 10px;
        border-radius: 12px;
        font-weight: 600;
      }

      /* REWARDS */
      .rewards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 12px;
      }
      .reward-item {
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        border: 1px solid var(--divider-color, rgba(255,255,255,0.08));
        border-radius: 12px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .reward-item.can-afford {
        border-color: rgba(34, 197, 94, 0.4);
      }
      .reward-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 6px;
      }
      .reward-title {
        font-weight: 600;
        font-size: 13px;
      }
      .reward-cost {
        font-weight: 800;
        color: #eab308;
        font-size: 13px;
      }
      .reward-hint {
        font-size: 11px;
        color: var(--secondary-text-color, #94a3b8);
        margin: 0 0 10px 0;
      }
      .btn-reward {
        background: var(--primary-color, #3b82f6);
        color: white;
        border: none;
        padding: 8px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      /* PC TIME */
      .pc-time-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .section-desc {
        font-size: 12px;
        color: var(--secondary-text-color, #94a3b8);
        margin: 0 0 6px 0;
      }
      .pc-slot-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        padding: 12px 16px;
        border-radius: 10px;
      }
      .pc-person-name {
        font-weight: 600;
        font-size: 14px;
      }
      .pc-hours-badge {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
        font-weight: bold;
        font-size: 12px;
        padding: 3px 10px;
        border-radius: 12px;
      }

      .empty-state {
        text-align: center;
        padding: 32px 16px;
        color: var(--secondary-text-color, #94a3b8);
      }
      .empty-icon {
        font-size: 32px;
        margin-bottom: 6px;
      }
      .empty-text {
        font-size: 13px;
      }

      /* PIN MODAL */
      .pin-modal-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.85);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
        padding: 20px;
      }
      .pin-modal-box {
        background: var(--card-background-color, #1e293b);
        border: 1px solid var(--divider-color, rgba(255,255,255,0.1));
        padding: 24px;
        border-radius: 20px;
        width: 100%;
        max-width: 280px;
        text-align: center;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      }
      .pin-title {
        font-weight: 700;
        font-size: 16px;
        margin-bottom: 4px;
      }
      .pin-subtitle {
        font-size: 12px;
        color: var(--secondary-text-color, #94a3b8);
        margin: 0 0 16px 0;
      }
      .pin-display {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-bottom: 14px;
      }
      .pin-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid var(--primary-color, #3b82f6);
        transition: background 0.15s;
      }
      .pin-dot.filled {
        background: var(--primary-color, #3b82f6);
      }
      .pin-error {
        color: #ef4444;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      .pin-keypad {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .pin-key {
        background: rgba(255,255,255,0.08);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s, transform 0.05s;
      }
      .pin-key:hover {
        background: rgba(255,255,255,0.15);
      }
      .pin-key:active {
        transform: scale(0.95);
      }
      .pin-key.action {
        font-size: 12px;
        background: transparent;
        color: var(--secondary-text-color, #94a3b8);
      }
    `;
  }
}

// Rejestracja Custom Elementu
if (!customElements.get('chore-manager-card')) {
  customElements.define('chore-manager-card', ChoreManagerCard);
}

// Rejestracja w konfiguratorze kart Home Assistant
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "chore-manager-card",
  name: "KiddosPoints (Lovelace Card)",
  preview: true,
  description: "Zarządzanie zadaniami domowymi, punktami, akceptacją rodzica i sklepem z nagrodami."
});
