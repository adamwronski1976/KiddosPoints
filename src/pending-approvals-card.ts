import { LitElement, html, css } from 'lit';

/** Samodzielna karta tylko do kolejki "Do zatwierdzenia" - wydzielona z
 *  chore-manager-card, żeby dało się ją postawić osobno (np. na głównej
 *  zakładce "Rodzina") bez całego panelu zadań/nagród/PIN-ów. Dla każdej
 *  pozycji: Zatwierdź (od razu) albo Odrzuć (wymaga rozwinięcia pola na
 *  komentarz - trafia do usługi reject_task jako "reason" i ląduje w
 *  Historii postaci dziecka, więc wie, co poprawić). */
export class PendingApprovalsCard extends LitElement {
  hass: any;
  config: any;
  _rejectingId: string | null;
  _rejectComment: string;

  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _rejectingId: { type: String, state: true },
      _rejectComment: { type: String, state: true },
    };
  }

  constructor() {
    super();
    this.config = {};
    this._rejectingId = null;
    this._rejectComment = '';
  }

  setConfig(config: any) {
    this.config = { title: 'Do zatwierdzenia', ...config };
  }

  getCardSize() {
    return 3;
  }

  _items() {
    const entity = this.hass?.states?.['sensor.chore_manager_pending_approvals'];
    return (entity?.attributes?.items) || [];
  }

  _approve(p: any) {
    this.hass.callService('chore_manager', 'approve_task', {
      task_id: p.task_id,
      user: p.user,
      points: p.points || 0,
    });
  }

  _startReject(p: any) {
    this._rejectingId = p.id;
    this._rejectComment = '';
  }

  _cancelReject() {
    this._rejectingId = null;
    this._rejectComment = '';
  }

  _confirmReject(p: any) {
    this.hass.callService('chore_manager', 'reject_task', {
      task_id: p.task_id,
      user: p.user,
      reason: this._rejectComment.trim() || 'Niewykonane poprawnie',
    });
    this._rejectingId = null;
    this._rejectComment = '';
  }

  render() {
    if (!this.hass) return html``;
    const items = this._items();

    return html`
      <ha-card .header=${this.config.title}>
        <div class="content">
          ${items.length === 0 ? html`
            <div class="empty-state">
              <div class="empty-icon">✅</div>
              <div>Brak zgłoszeń oczekujących na zatwierdzenie.</div>
            </div>
          ` : items.map((p: any) => html`
            <div class="item">
              <div class="item-row">
                <ha-icon icon=${p.task_icon || 'mdi:checkbox-marked-circle-outline'}></ha-icon>
                <div class="item-info">
                  <div class="task-name">${p.task_name || p.task_id}</div>
                  <div class="meta">Zgłosił(a): <strong>${p.user_name || p.user}</strong> · +${p.points} pkt</div>
                </div>
                ${this._rejectingId !== p.id ? html`
                  <div class="actions">
                    <button class="btn-reject" @click=${() => this._startReject(p)}>Odrzuć</button>
                    <button class="btn-approve" @click=${() => this._approve(p)}>Zatwierdź</button>
                  </div>
                ` : ''}
              </div>
              ${this._rejectingId === p.id ? html`
                <div class="reject-panel">
                  <input
                    type="text"
                    placeholder="Komentarz dla dziecka (opcjonalnie) - co poprawić?"
                    .value=${this._rejectComment}
                    @input=${(e: any) => { this._rejectComment = e.target.value; }}
                  />
                  <div class="reject-actions">
                    <button class="btn-cancel" @click=${() => this._cancelReject()}>Anuluj</button>
                    <button class="btn-reject-confirm" @click=${() => this._confirmReject(p)}>Odrzuć zadanie</button>
                  </div>
                </div>
              ` : ''}
            </div>
          `)}
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      .content {
        padding: 8px 16px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .empty-state {
        text-align: center;
        padding: 24px 8px;
        color: var(--secondary-text-color, #94a3b8);
      }
      .empty-icon {
        font-size: 28px;
        margin-bottom: 6px;
      }
      .item {
        background: rgba(234, 179, 8, 0.08);
        border: 1px solid rgba(234, 179, 8, 0.3);
        border-radius: 10px;
        padding: 10px 12px;
      }
      .item-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .item-info {
        flex: 1;
        min-width: 0;
      }
      .task-name {
        font-weight: 600;
        font-size: 14px;
      }
      .meta {
        font-size: 11px;
        color: var(--secondary-text-color, #94a3b8);
      }
      .actions {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
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
      .reject-panel {
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .reject-panel input {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        border-radius: 6px;
        border: 1px solid var(--divider-color, rgba(127,127,127,0.3));
        background: var(--card-background-color, white);
        color: var(--primary-text-color, black);
        font-size: 13px;
      }
      .reject-actions {
        display: flex;
        justify-content: flex-end;
        gap: 6px;
      }
      .btn-cancel {
        background: transparent;
        color: var(--secondary-text-color, #94a3b8);
        border: 1px solid var(--divider-color, rgba(127,127,127,0.3));
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-reject-confirm {
        background: #ef4444;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
    `;
  }
}

customElements.define('pending-approvals-card', PendingApprovalsCard);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'pending-approvals-card',
  name: 'KiddosPoints - Do zatwierdzenia',
  description: 'Kolejka zadań oczekujących na zatwierdzenie rodzica, z odrzuceniem po komentarzu.',
});
