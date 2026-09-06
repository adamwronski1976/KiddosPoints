# ⭐ KiddosPoints for Home Assistant (Domowy Menedżer Obowiązków i Punktów)

[![HACS Badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/default)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.1+-blue.svg)](https://www.home-assistant.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **KiddosPoints** to kompletny, zgrywalizowany system zarządzania domowymi obowiązkami dla dzieci i rodziny w Home Assistant.  
> Zawiera zaawansowaną integrację Python (backend) oraz interaktywną kartę Lovelace w Lit Element (frontend) z blokadą kodem PIN, systemem akceptacji przez rodziców, sklepem nagród oraz przydziałem czasu przed komputerem.

---

## ✨ Główne Możliwości

- 🏆 **Grywalizacja i Punkty:** Zdobywanie punktów za wykonane zadania domowe (zmywarka, odkurzanie, lekcje, śmieci).
- 🛡️ **System Weryfikacji (Akceptacja Rodzica):** Dziecko klika *„Zgłoś wykonanie”*, a rodzic otrzymuje powiadomienie PUSH w aplikacji HA i zatwierdza lub odrzuca wykonane zadanie jednym kliknięciem.
- 🔒 **Blokada Kodem PIN:** Zabezpieczenie profili przed nieuprawnionym klikaniem przez rodzeństwo na wspólnych tabletach ściennych.
- 🎁 **Sklep z Nagrodami:** Dzieci mogą wymieniać uzbierane punkty na realne nagrody (np. dodatkowy czas gry na komputerze, wyjście do kina, kieszonkowe).
- 💻 **Zarządzanie Czasem Ekranowym (PC Time):** Tabela i limity czasu przed monitorem powiązane ze statystykami.
- 📅 **Harmonogram Tygodniowy i Miesięczny:** Pełny panel zarządzania grafikiem oraz eksport/import do formatu Excel (.xlsx) i JSON.
- 📱 **Natywna Karta Lovelace:** Szybka, lekka, responsywna karta dashboardu stworzona w Lit (kompatybilna z motywami jasnymi/ciemnymi i aplikacją mobilną).

---

## 🚀 Instalacja

Karta Lovelace jest wbudowana w integrację (serwowana bezpośrednio z
`custom_components/chore_manager/frontend/`) — **jedna instalacja wystarcza**,
bez ręcznego kopiowania plików do `/config/www` i bez dodawania zasobu w
Ustawieniach → Pulpity → Zasoby.

### Sposób 1: Przez HACS (Zalecany)

1. W Home Assistant otwórz **HACS** → **Integracje** → Trzy kropki w prawym górnym rogu → **Niestandardowe repozytoria**.
2. Wklej URL swojego repozytorium GitHub i wybierz kategorię: `Integration`.
3. Kliknij **Pobierz** i zrestartuj Home Assistant.
4. Po restarcie karta jest od razu dostępna jako `type: custom:chore-manager-card` — bez dodatkowych kroków.

### Sposób 2: Instalacja Ręczna

1. Skopiuj katalog `custom_components/chore_manager/` (razem z podfolderem `frontend/`) do swojego folderu Home Assistant: `/config/custom_components/chore_manager/`.
2. Zrestartuj Home Assistant.

---

## ⚙️ Konfiguracja

### 1. Dodanie integracji w Home Assistant

W Home Assistant przejdź do **Ustawienia** → **Urządzenia i usługi** → **Dodaj integrację** → Wyszukaj **KiddosPoints**.

### 2. Karta Lovelace (Dashboard)

Dodaj kartę niestandardową do swojego pulpitu w widoku YAML:

```yaml
type: custom:chore-manager-card
title: KiddosPoints
show_rewards: true
show_pc_time: true
```

---

## 🛠️ Dostępne Usługi (Services)

Integracja udostępnia zestaw usług w `Developer Tools` -> `Services`:

| Usługa | Opis | Parametry |
|---|---|---|
| `chore_manager.complete_task` | Zgłoszenie wykonania zadania | `user`, `task_id`, `points`, `requires_approval` |
| `chore_manager.approve_task` | Zatwierdzenie zadania przez rodzica | `user`, `task_id`, `points` |
| `chore_manager.reject_task` | Odrzucenie zadania | `user`, `task_id`, `reason` |
| `chore_manager.claim_reward` | Odebranie nagrody ze sklepu | `user`, `reward_id`, `cost` |
| `chore_manager.add_points` | Ręczna modyfikacja punktów | `user`, `points` |
| `chore_manager.reset_points` | Wyzerowanie punktów użytkownika | `user` |

---

## 🔔 Przykłady Automatyzacji (Powiadomienia PUSH)

### Powiadomienie rodzica, gdy dziecko zgłasza wykonanie zadania:

```yaml
alias: "Powiadomienie: Zadanie do zatwierdzenia"
trigger:
  - platform: event
    event_type: chore_manager_task_completed
    event_data:
      status: pending_approval
action:
  - service: notify.notify
    data:
      title: "🧹 Nowe zadanie do zatwierdzenia!"
      message: "{{ trigger.event.data.user }} wykonał(a) zadanie '{{ trigger.event.data.task_name }}' (+{{ trigger.event.data.points }} pkt)."
      data:
        actions:
          - action: "APPROVE_TASK"
            title: "Zatwierdź"
          - action: "REJECT_TASK"
            title: "Odrzuć"
```

---

## 📂 Struktura Projektu

```text
├── custom_components/
│   └── chore_manager/
│       ├── __init__.py        # Rejestracja usług, zdarzeń i karty Lovelace w HA
│       ├── config_flow.py     # Konfiguracja przez UI w Home Assistant
│       ├── const.py           # Stałe i konfiguracja
│       ├── manifest.json      # Metadane komponentu HA
│       ├── sensor.py          # Sensory punktacji i oczekujących zadań
│       ├── services.yaml      # Dokumentacja parametrów usług w HA
│       └── frontend/          # Skompilowana karta Lovelace, serwowana wprost
│                               # przez integrację (bez /config/www)
├── lovelace/
│   └── chore-manager-card.js  # Skompilowana karta Lit do wrzucenia do /config/www/
├── src/
│   ├── chore-manager-card.ts  # Kod źródłowy karty Lovelace (Lit Element)
│   ├── components/            # Komponenty panelu administracyjnego React
│   ├── store.ts               # Stan aplikacji
│   └── types.ts               # Typy TypeScript
├── hacs.json                  # Integracja z HACS
└── README.md                  # Dokumentacja
```

---

## 📄 Licencja

Projekt wydany na licencji [MIT](LICENSE). Zapraszamy do zgłaszania Issues i Pull Requestów!
