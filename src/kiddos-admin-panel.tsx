import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import App from './App';
import type { HomeAssistantLike } from './haStore';
import cssText from './index.css?inline';

/**
 * Karta Lovelace osadzająca cały panel administracyjny (React SPA) wewnątrz
 * Home Assistant. Otrzymuje prawdziwy obiekt `hass` tak samo jak każda inna
 * karta niestandardowa, dzięki czemu panel czyta i zapisuje konfigurację
 * bezpośrednio w backendzie integracji zamiast w localStorage.
 */
class KiddosAdminPanel extends HTMLElement {
  private root: Root | null = null;
  private mountPoint: HTMLDivElement | null = null;
  private _hass: HomeAssistantLike | undefined;

  setConfig(_config: Record<string, unknown>) {
    // Karta nie wymaga żadnej konfiguracji — cała treść pochodzi z hass.
  }

  set hass(hass: HomeAssistantLike) {
    this._hass = hass;
    this.render();
  }

  get hass() {
    return this._hass as HomeAssistantLike;
  }

  getCardSize() {
    return 30;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = cssText;
      shadow.appendChild(style);
      this.mountPoint = document.createElement('div');
      shadow.appendChild(this.mountPoint);
      this.root = createRoot(this.mountPoint);
    }
    this.render();
  }

  disconnectedCallback() {
    this.root?.unmount();
    this.root = null;
  }

  private render() {
    if (!this.root) return;
    this.root.render(<App hass={this._hass} />);
  }
}

customElements.get('kiddos-admin-panel') || customElements.define('kiddos-admin-panel', KiddosAdminPanel);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'kiddos-admin-panel',
  name: 'KiddosPoints (Panel administracyjny)',
  preview: false,
  description: 'Pełny panel zarządzania zadaniami, użytkownikami, nagrodami i harmonogramem KiddosPoints.',
});
