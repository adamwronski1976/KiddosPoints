import React, { useMemo } from 'react';
import { User } from '../types';
import { HomeAssistantLike } from '../haStore';
import { Link2, Bell } from 'lucide-react';

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[^\x00-\x7F]/g, '').replace(/[^a-z0-9]/g, '');

interface Props {
  formData: Omit<User, 'id'>;
  onChange: (updates: Partial<Omit<User, 'id'>>) => void;
  hass?: HomeAssistantLike;
  /** Przy tworzeniu nowego użytkownika encja HA jest wyliczana ze slugu imienia;
   *  przy edycji istniejącego zostaje ustalona (żeby nie urwać powiązania z
   *  już istniejącym sensorem punktów). */
  isNew: boolean;
}

/** Kompletny formularz ustawień chore-usera (rola, PIN, powiadomienia,
 *  powiązanie z person.*) - współdzielony przez "Dodaj użytkownika" (Panel
 *  użytkownika) i edycję istniejącego konta w jego osobistym panelu. */
export const UserSettingsForm: React.FC<Props> = ({ formData, onChange, hass, isNew }) => {
  const personEntities = useMemo(() => {
    if (!hass) return [];
    return Object.entries(hass.states)
      .filter(([id]) => id.startsWith('person.'))
      .map(([id, s]) => ({
        id,
        name: s.attributes.friendly_name || id,
      }));
  }, [hass]);

  // Kanały powiadomień dostępne w tym HA, podzielone na "Aplikacja mobilna"
  // (notify.mobile_app_*) i "Komunikator" (Telegram, Signal, Pushover, ...).
  // Te, których nazwa pasuje do imienia/powiązanej osoby, lądują na górze listy
  // jako "Sugerowane" - najlepsze przybliżenie "tylko to, co przypisane do niego"
  // bez dostępu do rejestru urządzeń z poziomu karty Lovelace.
  const notifyChannels = useMemo(() => {
    const services = hass?.services?.notify || {};
    const nameSlug = slug(formData.name || '');
    const personSlug = formData.personEntityId ? slug(formData.personEntityId.replace('person.', '')) : '';

    const all = Object.keys(services)
      .filter(key => key !== 'notify' && key !== 'persistent_notification')
      .map(key => {
        const isApp = key.startsWith('mobile_app_');
        const matches = (nameSlug && key.includes(nameSlug)) || (personSlug && key.includes(personSlug));
        return {
          service: `notify.${key}`,
          label: services[key]?.name || key,
          isApp,
          suggested: matches,
        };
      });

    return {
      suggested: all.filter(c => c.suggested),
      app: all.filter(c => !c.suggested && c.isApp),
      other: all.filter(c => !c.suggested && !c.isApp),
    };
  }, [hass, formData.name, formData.personEntityId]);

  const hasAnyNotifyChannel = notifyChannels.suggested.length + notifyChannels.app.length + notifyChannels.other.length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Imię / Nazwa Wyświetlana</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => {
            const val = e.target.value;
            const cleanSlug = val
              .toLowerCase()
              .normalize('NFD')
              .replace(/[^\x00-\x7F]/g, '')
              .replace(/[^a-z0-9]/g, '_');
            const shouldAutoUpdateEntity = isNew && (!formData.haEntityId || formData.haEntityId.startsWith('sensor.chore_points_'));
            onChange({ name: val, ...(shouldAutoUpdateEntity ? { haEntityId: `sensor.chore_points_${cleanSlug}` } : {}) });
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
          disabled={!isNew}
          onChange={e => onChange({ haEntityId: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-400"
          placeholder="sensor.chore_points_zosia"
        />
        {!isNew && <p className="text-[11px] text-slate-400 mt-1">Nie można zmienić encji istniejącego konta.</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Rola w systemie</label>
        <select
          value={formData.role}
          onChange={e => {
            const newRole = e.target.value as User['role'];
            onChange({ role: newRole, requiresApproval: newRole === 'child' });
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
          onChange={e => onChange({ pinCode: e.target.value.replace(/\D/g, '') })}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
          placeholder="4 cyfry lub puste"
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-slate-400" /> Powiąż z osobą Home Assistant (opcjonalnie)
        </label>
        <select
          value={formData.personEntityId || ''}
          onChange={e => onChange({ personEntityId: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={personEntities.length === 0}
        >
          <option value="">— brak (etykieta grupowa lub bez person.*) —</option>
          {personEntities.map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
          ))}
        </select>
        {personEntities.length === 0 && (
          <p className="text-xs text-slate-400 mt-1">
            Dostępne tylko wewnątrz Home Assistant — brak wykrytych encji person.*.
          </p>
        )}
      </div>

      <div className="md:col-span-2 space-y-3 mt-2">
        <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
          <input
            type="checkbox"
            checked={formData.requiresApproval}
            onChange={e => onChange({ requiresApproval: e.target.checked })}
            className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
          />
          <div>
            <span className="block text-sm font-semibold text-slate-800">Wymaga akceptacji (Zatwierdzanie zadań)</span>
            <span className="block text-xs text-slate-500">Jeśli włączone, po kliknięciu "Zrobione", zadanie wymaga potwierdzenia przez admina zanim przyznane zostaną punkty.</span>
          </div>
        </label>

        <div className="p-3 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center gap-1.5 mb-2">
            <Bell className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-800">Kanał powiadomień</span>
          </div>
          {hasAnyNotifyChannel ? (
            <>
              <select
                value={formData.notifyService || ''}
                onChange={e => onChange({ notifyService: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">— brak (nie wysyłaj) —</option>
                {notifyChannels.suggested.length > 0 && (
                  <optgroup label="⭐ Sugerowane">
                    {notifyChannels.suggested.map(c => (
                      <option key={c.service} value={c.service}>{c.label}</option>
                    ))}
                  </optgroup>
                )}
                {notifyChannels.app.length > 0 && (
                  <optgroup label="📱 Aplikacja mobilna">
                    {notifyChannels.app.map(c => (
                      <option key={c.service} value={c.service}>{c.label}</option>
                    ))}
                  </optgroup>
                )}
                {notifyChannels.other.length > 0 && (
                  <optgroup label="💬 Komunikator / inne">
                    {notifyChannels.other.map(c => (
                      <option key={c.service} value={c.service}>{c.label}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Wybiera, którą usługą HA (aplikacja mobilna, Telegram, itp.) będą doręczane poniższe powiadomienia. Puste = brak wysyłki.
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400">
              {hass ? 'Brak skonfigurowanych usług notify w tym HA.' : 'Dostępne tylko wewnątrz Home Assistant.'}
            </p>
          )}

          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notifyOnNewTask}
                onChange={e => onChange({ notifyOnNewTask: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">Nowe przypisane zadanie</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notifyOnReward}
                onChange={e => onChange({ notifyOnReward: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">Odebrana nagroda</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
