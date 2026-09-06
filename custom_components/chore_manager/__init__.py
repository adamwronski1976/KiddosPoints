"""Główny moduł integracji Chore Manager w Home Assistant."""
import logging
import time
import uuid
from datetime import date, timedelta
from pathlib import Path
from homeassistant.core import HomeAssistant, ServiceCall, CoreState, EVENT_HOMEASSISTANT_STARTED
from homeassistant.helpers.typing import ConfigType
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.storage import Store
from homeassistant.helpers.event import async_call_later, async_track_time_change
from homeassistant.components.http import StaticPathConfig
from homeassistant.util import dt as dt_util
from .const import (
    DOMAIN,
    STORAGE_KEY,
    STORAGE_VERSION,
    SERVICE_COMPLETE_TASK,
    SERVICE_APPROVE_TASK,
    SERVICE_REJECT_TASK,
    SERVICE_CLAIM_REWARD,
    SERVICE_ADD_POINTS,
    SERVICE_RESET_POINTS,
    SERVICE_UPDATE_CONFIG,
    SERVICE_SET_PERIODIC_SCHEDULE,
    SERVICE_CLEAR_PERIODIC_SCHEDULE,
    PERIODIC_PERIODS,
    EVENT_TASK_COMPLETED,
    EVENT_TASK_APPROVED,
    EVENT_TASK_REJECTED,
    EVENT_REWARD_CLAIMED,
)

_LOGGER = logging.getLogger(__name__)

PLATFORMS = ["sensor", "todo"]

# Ile ostatnich wpisów historii punktów trzymamy (starsze są odrzucane, żeby
# magazyn nie rósł w nieskończoność).
HISTORY_LIMIT = 200

# Stan startowy magazynu przy pierwszym uruchomieniu integracji: żadnych
# zahardkodowanych domowników — tylko jedno konto administratora "Gadget".
DEFAULT_DATA = {
    "users": [
        {
            "id": "gadget",
            "name": "Gadget",
            "haEntityId": "sensor.chore_points_gadget",
            "role": "admin",
            "requiresApproval": False,
            "notifyOnNewTask": False,
            "notifyOnReward": False,
        }
    ],
    "tasks": [],
    "rewards": [],
    "penalties": [],
    "taskRows": {},
    "completions": {},
    "computerSlots": {},
    "customSchedule": {},
    # Harmonogram niestandardowy per przypisanie (row_id): rozliczany w okresie
    # (miesiąc/rok) zamiast konkretnych dni tygodnia, np. "2 razy w miesiącu".
    # Patrz _next_periodic_date/_ensure_occurrences.
    "periodicSchedules": {},
    "pending_approvals": [],
    "points": {},
    "history": [],
    # Konkretne, wyznaczone-z-terminem wystąpienia cyklicznych przypisań
    # z Harmonogramu (patrz _ensure_occurrences) - jedna aktywna pozycja na
    # przypisanie na raz ("leniwe" generowanie, bez nieskończonej listy).
    "occurrences": {},
}

# Klucze konfiguracji, które panel administracyjny może aktualizować przez
# usługę update_config. "users" jest obsługiwany osobno (może tworzyć nowe encje).
_PATCHABLE_KEYS = [
    "tasks",
    "rewards",
    "penalties",
    "taskRows",
    "completions",
    "computerSlots",
    "customSchedule",
    "periodicSchedules",
]


# Wersja dołączonych zasobów frontendu (karty Lovelace). Bump przy każdej
# zmianie plików w frontend/, żeby przeglądarki i rejestr zasobów Lovelace nie
# trzymały starej wersji ze swojego cache (dopisywane jako ?v= do URL-a).
FRONTEND_VERSION = "1.5.1"
FRONTEND_URL_BASE = "/chore_manager_static"
FRONTEND_MODULES = [
    {"filename": "chore-manager-card.js", "version": FRONTEND_VERSION},
    {"filename": "pending-approvals-card.js", "version": FRONTEND_VERSION},
]


class _JSModuleRegistration:
    """Serwuje karty Lovelace dołączone do integracji (frontend/) i rejestruje
    je jako zasoby Lovelace w trybie storage - bez ręcznego kopiowania do
    /config/www i bez ręcznego dodawania zasobu w Ustawieniach → Pulpity →
    Zasoby. Aktualizacja integracji przez HACS aktualizuje też kartę.
    Wzorzec za: https://gist.github.com/KipK/3cf706ac89573432803aaa2f5ca40492
    """

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.lovelace = hass.data.get("lovelace")

    async def async_register(self) -> None:
        await self._async_register_path()
        # Nazwa atrybutu trybu Lovelace zmieniała się między wersjami HA -
        # sprawdzamy oba warianty, domyślnie zakładając "yaml" (bez rejestracji).
        mode = getattr(self.lovelace, "mode", getattr(self.lovelace, "resource_mode", "yaml"))
        if mode == "storage":
            await self._async_wait_for_lovelace_resources()
        else:
            _LOGGER.debug(
                "Lovelace w trybie '%s' (nie 'storage') - pomijam automatyczną "
                "rejestrację zasobu, dodaj go ręcznie w Ustawieniach → Pulpity → Zasoby.",
                mode,
            )

    async def _async_register_path(self) -> None:
        frontend_dir = Path(__file__).parent / "frontend"
        try:
            await self.hass.http.async_register_static_paths([
                StaticPathConfig(FRONTEND_URL_BASE, str(frontend_dir), False)
            ])
        except RuntimeError:
            # Już zarejestrowane (np. przeładowanie wpisu konfiguracji) - OK.
            pass

    async def _async_wait_for_lovelace_resources(self) -> None:
        async def _check_loaded(_now) -> None:
            if self.lovelace.resources.loaded:
                await self._async_register_modules()
            else:
                async_call_later(self.hass, 5, _check_loaded)

        await _check_loaded(None)

    async def _async_register_modules(self) -> None:
        existing = [
            r for r in self.lovelace.resources.async_items()
            if r["url"].startswith(FRONTEND_URL_BASE)
        ]
        for module in FRONTEND_MODULES:
            url = f"{FRONTEND_URL_BASE}/{module['filename']}"
            match = next((r for r in existing if r["url"].split("?")[0] == url), None)
            if match is None:
                await self.lovelace.resources.async_create_item(
                    {"res_type": "module", "url": f"{url}?v={module['version']}"}
                )
            elif match["url"] != f"{url}?v={module['version']}":
                await self.lovelace.resources.async_update_item(
                    match["id"], {"res_type": "module", "url": f"{url}?v={module['version']}"}
                )


async def _async_register_frontend(hass: HomeAssistant) -> None:
    """Uruchamia rejestrację karty - odłożoną do startu HA (Lovelace musi być
    już gotowy), zgodnie z wymaganiami wzorca JSModuleRegistration."""
    if hass.data.get(DOMAIN, {}).get("frontend_registered"):
        return
    hass.data.setdefault(DOMAIN, {})["frontend_registered"] = True

    async def _do_register(_event=None) -> None:
        await _JSModuleRegistration(hass).async_register()

    if hass.state == CoreState.running:
        await _do_register()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _do_register)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Konfiguracja integracji Chore Manager z poziomu configuration.yaml."""
    hass.data.setdefault(DOMAIN, {})
    await _async_setup_services(hass)
    await _async_register_frontend(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Konfiguracja integracji Chore Manager z poziomu UI (Config Entry)."""
    hass.data.setdefault(DOMAIN, {})
    store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
    data = await store.async_load()
    if not data:
        data = {**DEFAULT_DATA}
        await store.async_save(data)
    else:
        # Migracja starszych magazynów: usuń nieużywaną już warstwę nadpisań
        # punktów zadań/nagród (uproszczone do jednego pola `points`).
        data.pop("customTaskPoints", None)
        data.pop("customRewardCosts", None)
        data.setdefault("history", [])
        data.setdefault("occurrences", {})
        data.setdefault("periodicSchedules", {})
        data.setdefault("penalties", [])

    hass.data[DOMAIN]["store"] = store
    hass.data[DOMAIN]["data"] = data
    hass.data[DOMAIN]["entry"] = entry
    hass.data[DOMAIN].setdefault("pending_awards", {})

    await _async_setup_services(hass)
    await _async_register_frontend(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    await _ensure_occurrences(hass)
    unsub = async_track_time_change(
        hass, lambda now: hass.async_create_task(_ensure_occurrences(hass)),
        hour=0, minute=5, second=0,
    )
    hass.data[DOMAIN]["occurrence_timer_unsub"] = unsub
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Rozładowanie wpisu integracji."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        unsub = hass.data[DOMAIN].get("occurrence_timer_unsub")
        if unsub:
            unsub()
        for cancel in hass.data[DOMAIN].get("pending_awards", {}).values():
            cancel()
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok


async def _async_setup_services(hass: HomeAssistant) -> None:
    """Rejestracja usług Home Assistant dla Chore Manager."""
    if hass.services.has_service(DOMAIN, SERVICE_COMPLETE_TASK):
        return

    async def handle_complete_task(call: ServiceCall):
        """Obsługa ukończenia zadania przez użytkownika."""
        user_entity_id = call.data.get("user")
        task_id = call.data.get("task_id")
        task_name = call.data.get("task_name", task_id)
        points = call.data.get("points", 10)
        requires_approval = call.data.get("requires_approval", False)

        _LOGGER.info(
            "Zadanie %s ukończone przez %s (pkt: %s, weryfikacja: %s)",
            task_name, user_entity_id, points, requires_approval
        )

        if requires_approval:
            # Dodanie do kolejki oczekujących
            submission = {
                "id": f"sub_{task_id}_{int(time.time())}",
                "user": user_entity_id,
                "task_id": task_id,
                "task_name": task_name,
                "points": points,
            }
            if "data" in hass.data.get(DOMAIN, {}):
                hass.data[DOMAIN]["data"].setdefault("pending_approvals", []).append(submission)
                await _persist(hass)
                _refresh_pending_sensor(hass)

            hass.bus.async_fire(EVENT_TASK_COMPLETED, {
                "user": user_entity_id,
                "task_id": task_id,
                "task_name": task_name,
                "points": points,
                "status": "pending_approval"
            })
            return

        # Przyznanie punktów bezpośrednio
        await _add_points_to_entity(hass, user_entity_id, points, reason=f"Zadanie: {task_name}")
        hass.bus.async_fire(EVENT_TASK_COMPLETED, {
            "user": user_entity_id,
            "task_id": task_id,
            "task_name": task_name,
            "points": points,
            "status": "approved"
        })

    async def handle_approve_task(call: ServiceCall):
        """Zatwierdzenie zadania przez rodzica/administratora."""
        user_entity_id = call.data.get("user")
        task_id = call.data.get("task_id")
        points = call.data.get("points", 10)

        # Usunięcie z kolejki oczekujących (i powiązanego wystąpienia w todo, jeśli jest)
        removed = []
        if "data" in hass.data.get(DOMAIN, {}):
            data = hass.data[DOMAIN]["data"]
            pending = data.get("pending_approvals", [])
            removed = [p for p in pending if p.get("task_id") == task_id and p.get("user") == user_entity_id]
            data["pending_approvals"] = [p for p in pending if p not in removed]
            for p in removed:
                occ_id = p.get("occurrence_id")
                if occ_id and occ_id in data.get("occurrences", {}):
                    del data["occurrences"][occ_id]
            await _persist(hass)
            _refresh_pending_sensor(hass)
            if any(p.get("occurrence_id") for p in removed):
                _refresh_todo_entities(hass)
                _refresh_overdue_sensor(hass)
                _refresh_upcoming_sensor(hass)

        task_name = _task_name(hass, task_id) or task_id
        await _add_points_to_entity(hass, user_entity_id, points, reason=f"Zatwierdzono: {task_name}")
        hass.bus.async_fire(EVENT_TASK_APPROVED, {
            "user": user_entity_id,
            "task_id": task_id,
            "points": points
        })
        _LOGGER.info("Zadanie %s dla %s zatwierdzone (+%s pkt)", task_id, user_entity_id, points)

    async def handle_reject_task(call: ServiceCall):
        """Odrzucenie zadania przez administratora."""
        user_entity_id = call.data.get("user")
        task_id = call.data.get("task_id")
        reason = call.data.get("reason", "Niewykonane poprawnie")

        # Usunięcie z kolejki oczekujących - powiązane wystąpienie (jeśli jest)
        # wraca na aktywną listę todo, NIGDY nie znika bezpowrotnie.
        if "data" in hass.data.get(DOMAIN, {}):
            data = hass.data[DOMAIN]["data"]
            pending = data.get("pending_approvals", [])
            removed = [p for p in pending if p.get("task_id") == task_id and p.get("user") == user_entity_id]
            data["pending_approvals"] = [p for p in pending if p not in removed]
            for p in removed:
                occ_id = p.get("occurrence_id")
                occ = data.get("occurrences", {}).get(occ_id) if occ_id else None
                if occ:
                    occ["status"] = "open"
                    # Widoczne wprost na zadaniu (opis w todo), nie tylko w
                    # historii - dziecko od razu widzi, co poprawić.
                    occ["reject_reason"] = reason
            await _persist(hass)
            _refresh_pending_sensor(hass)
            if any(p.get("occurrence_id") for p in removed):
                _refresh_todo_entities(hass)
                _refresh_overdue_sensor(hass)
                _refresh_upcoming_sensor(hass)

        task_name = _task_name(hass, task_id) or task_id
        await _log_history(hass, user_entity_id, f"Odrzucono: {task_name} — {reason}")

        hass.bus.async_fire(EVENT_TASK_REJECTED, {
            "user": user_entity_id,
            "task_id": task_id,
            "reason": reason
        })
        _LOGGER.info("Zadanie %s dla %s odrzucone: %s", task_id, user_entity_id, reason)

    async def handle_claim_reward(call: ServiceCall):
        """Odebranie nagrody ze sklepu i potrącenie punktów."""
        user_entity_id = call.data.get("user")
        reward_id = call.data.get("reward_id")
        reward_name = call.data.get("reward_name", reward_id)
        cost = call.data.get("cost", 0)

        user_state = hass.states.get(user_entity_id)
        if not user_state:
            _LOGGER.warning("Nie znaleziono encji użytkownika: %s", user_entity_id)
            return

        try:
            current_points = int(user_state.state)
        except ValueError:
            current_points = 0

        if current_points < cost:
            _LOGGER.warning("Użytkownik %s nie ma wystarczająco punktów (%s < %s)", user_entity_id, current_points, cost)
            return

        await _add_points_to_entity(hass, user_entity_id, -cost, reason=f"Nagroda: {reward_name}")

        user = _find_user_by_entity(hass, user_entity_id)
        if user and user.get("notifyOnReward"):
            await _notify_user(hass, user, "Odebrano nagrodę", f"Odebrano nagrodę: {reward_name} (-{cost} pkt)")

        hass.bus.async_fire(EVENT_REWARD_CLAIMED, {
            "user": user_entity_id,
            "reward_id": reward_id,
            "reward_name": reward_name,
            "cost": cost,
            "remaining_points": current_points - cost
        })
        _LOGGER.info("Użytkownik %s odebrał nagrodę %s za %s pkt", user_entity_id, reward_name, cost)

    async def handle_add_points(call: ServiceCall):
        """Ręczne dodanie lub odjęcie punktów."""
        user_entity_id = call.data.get("user")
        points = call.data.get("points", 0)
        reason = call.data.get("reason") or "Ręczna korekta"
        await _add_points_to_entity(hass, user_entity_id, points, reason=reason)

    async def handle_reset_points(call: ServiceCall):
        """Zresetowanie punktów danego użytkownika do zera."""
        user_entity_id = call.data.get("user")
        user_state = hass.states.get(user_entity_id)
        if user_state:
            await _set_points_for_entity(hass, user_entity_id, 0, reason="Reset punktów")

    async def handle_update_config(call: ServiceCall):
        """Scala fragment (patch) konfiguracji panelu administracyjnego z magazynem
        i loguje do "Historii postaci" każdej dotkniętej osoby, co się zmieniło."""
        patch = call.data.get("patch") or {}
        if "data" not in hass.data.get(DOMAIN, {}):
            return
        data = hass.data[DOMAIN]["data"]

        # Migawki "przed" - potrzebne do policzenia, co się zmieniło.
        old_users = [dict(u) for u in data.get("users", [])]
        old_task_rows = {k: [dict(r) for r in v] for k, v in data.get("taskRows", {}).items()}
        old_completions = dict(data.get("completions", {}))

        for key in _PATCHABLE_KEYS:
            if key in patch:
                data[key] = patch[key]

        if "users" in patch:
            await _sync_users(hass, patch["users"])
            data["users"] = patch["users"]
            _refresh_all_points_sensors(hass)

        users_by_id = {u["id"]: u for u in data.get("users", [])}
        id_to_entity = {uid: u.get("haEntityId") for uid, u in users_by_id.items()}
        tasks_by_id = {t["id"]: t.get("name", t["id"]) for t in data.get("tasks", [])}

        if "users" in patch:
            await _log_settings_changes(hass, old_users, data["users"])
        if "taskRows" in patch:
            await _log_assignment_changes(hass, old_task_rows, data["taskRows"], tasks_by_id, users_by_id)
        if "completions" in patch:
            new_task_rows = data["taskRows"] if "taskRows" in patch else old_task_rows
            await _log_schedule_changes(hass, old_completions, data["completions"], new_task_rows, tasks_by_id, id_to_entity)

        await _persist(hass)
        _refresh_config_sensor(hass)
        if "tasks" in patch or "taskRows" in patch or "users" in patch:
            _refresh_todo_entities(hass)
        if "taskRows" in patch or "completions" in patch:
            await _ensure_occurrences(hass)

    async def handle_set_periodic_schedule(call: ServiceCall):
        """Ustawia harmonogram niestandardowy (rozliczany w okresie) dla danego
        przypisania (row_id), np. 'task_id=t3, person=u_adam, times_per_period=2,
        period=month' = 2 razy w miesiącu. Nadpisuje harmonogram tygodniowy dla
        tego przypisania - są wzajemnie wykluczające się."""
        task_id = call.data.get("task_id")
        person = call.data.get("person")
        times_per_period = call.data.get("times_per_period")
        period = call.data.get("period")

        if period not in PERIODIC_PERIODS:
            _LOGGER.warning("Nieprawidłowy okres harmonogramu: %s (dozwolone: %s)", period, PERIODIC_PERIODS)
            return
        try:
            times_per_period = int(times_per_period)
        except (TypeError, ValueError):
            _LOGGER.warning("Nieprawidłowa liczba wystąpień w okresie: %s", times_per_period)
            return
        if times_per_period < 1:
            _LOGGER.warning("Liczba wystąpień w okresie musi być >= 1, otrzymano: %s", times_per_period)
            return

        data = hass.data.get(DOMAIN, {}).get("data")
        if data is None:
            return
        row_id = None
        for row in data.get("taskRows", {}).get(task_id, []):
            if row.get("person") == person:
                row_id = row.get("id")
                break
        if not row_id:
            _LOGGER.warning("Nie znaleziono przypisania zadania %s dla %s", task_id, person)
            return

        data.setdefault("periodicSchedules", {})[row_id] = {
            "times_per_period": times_per_period,
            "period": period,
        }
        await _persist(hass)
        _refresh_config_sensor(hass)
        await _ensure_occurrences(hass)
        entity_id = _find_user(hass, person).get("haEntityId") if person else None
        if entity_id:
            task_name = _task_name(hass, task_id) or task_id
            await _log_history(
                hass, entity_id,
                f"Ustawiono harmonogram niestandardowy: {task_name} — {times_per_period}x / {period}",
            )

    async def handle_clear_periodic_schedule(call: ServiceCall):
        """Usuwa harmonogram niestandardowy z danego przypisania (wraca do
        harmonogramu tygodniowego, jeśli jakiś jest zaznaczony)."""
        task_id = call.data.get("task_id")
        person = call.data.get("person")
        data = hass.data.get(DOMAIN, {}).get("data")
        if data is None:
            return
        row_id = None
        for row in data.get("taskRows", {}).get(task_id, []):
            if row.get("person") == person:
                row_id = row.get("id")
                break
        if not row_id or row_id not in data.get("periodicSchedules", {}):
            return
        del data["periodicSchedules"][row_id]
        await _persist(hass)
        _refresh_config_sensor(hass)

    # Rejestracja wszystkich serwisów
    hass.services.async_register(DOMAIN, SERVICE_COMPLETE_TASK, handle_complete_task)
    hass.services.async_register(DOMAIN, SERVICE_APPROVE_TASK, handle_approve_task)
    hass.services.async_register(DOMAIN, SERVICE_REJECT_TASK, handle_reject_task)
    hass.services.async_register(DOMAIN, SERVICE_CLAIM_REWARD, handle_claim_reward)
    hass.services.async_register(DOMAIN, SERVICE_ADD_POINTS, handle_add_points)
    hass.services.async_register(DOMAIN, SERVICE_RESET_POINTS, handle_reset_points)
    hass.services.async_register(DOMAIN, SERVICE_UPDATE_CONFIG, handle_update_config)
    hass.services.async_register(DOMAIN, SERVICE_SET_PERIODIC_SCHEDULE, handle_set_periodic_schedule)
    hass.services.async_register(DOMAIN, SERVICE_CLEAR_PERIODIC_SCHEDULE, handle_clear_periodic_schedule)


async def _persist(hass: HomeAssistant) -> None:
    """Zapisuje bieżący stan magazynu na dysk."""
    domain_data = hass.data.get(DOMAIN, {})
    if "store" in domain_data and "data" in domain_data:
        await domain_data["store"].async_save(domain_data["data"])


def _find_user(hass: HomeAssistant, user_id: str) -> dict:
    data = hass.data.get(DOMAIN, {}).get("data", {})
    for user in data.get("users", []):
        if user.get("id") == user_id:
            return user
    return {}


def _find_user_by_entity(hass: HomeAssistant, user_entity_id: str) -> dict | None:
    data = hass.data.get(DOMAIN, {}).get("data", {})
    for user in data.get("users", []):
        if user.get("haEntityId") == user_entity_id:
            return user
    return None


async def _notify_user(hass: HomeAssistant, user: dict, title: str, message: str) -> None:
    """Wysyła powiadomienie wybranym przez użytkownika kanałem HA
    (notify.mobile_app_..., notify.telegram_..., itp.), jeśli skonfigurowany."""
    notify_service = user.get("notifyService")
    if not notify_service or not notify_service.startswith("notify."):
        return
    service = notify_service.split(".", 1)[1]
    try:
        await hass.services.async_call(
            "notify", service, {"title": title, "message": message}, blocking=False
        )
    except Exception:  # noqa: BLE001 - usługa notify mogła zniknąć/zmienić nazwę
        _LOGGER.warning("Nie udało się wysłać powiadomienia przez %s dla %s", notify_service, user.get("name"))


def _task_name(hass: HomeAssistant, task_id: str) -> str | None:
    data = hass.data.get(DOMAIN, {}).get("data", {})
    for task in data.get("tasks", []):
        if task.get("id") == task_id:
            return task.get("name")
    return None


def _refresh_pending_sensor(hass: HomeAssistant) -> None:
    entity = hass.data.get(DOMAIN, {}).get("pending_entity")
    if entity is not None:
        entity.async_write_ha_state()


def _refresh_config_sensor(hass: HomeAssistant) -> None:
    entity = hass.data.get(DOMAIN, {}).get("config_entity")
    if entity is not None:
        entity.async_write_ha_state()


def _refresh_todo_entities(hass: HomeAssistant) -> None:
    domain_data = hass.data.get(DOMAIN, {})
    for key in ("todo_entity", "pending_todo_entity"):
        entity = domain_data.get(key)
        if entity is not None:
            entity.async_write_ha_state()
    for entity in domain_data.get("todo_entities", {}).values():
        entity.async_write_ha_state()


def _refresh_overdue_sensor(hass: HomeAssistant) -> None:
    entity = hass.data.get(DOMAIN, {}).get("overdue_entity")
    if entity is not None:
        entity.async_write_ha_state()


def _refresh_upcoming_sensor(hass: HomeAssistant) -> None:
    entity = hass.data.get(DOMAIN, {}).get("upcoming_entity")
    if entity is not None:
        entity.async_write_ha_state()


def _refresh_all_points_sensors(hass: HomeAssistant) -> None:
    """Odświeża atrybuty (rola, PIN, powiadomienia, ...) na wszystkich sensorach
    punktów po edycji użytkowników w panelu - inaczej zmiana byłaby widoczna
    dopiero przy następnej zmianie punktów danej osoby."""
    for entity in hass.data.get(DOMAIN, {}).get("points_entities", {}).values():
        entity.async_write_ha_state()


def _refresh_history_sensor(hass: HomeAssistant) -> None:
    entity = hass.data.get(DOMAIN, {}).get("history_entity")
    if entity is not None:
        entity.async_write_ha_state()


async def _log_history(
    hass: HomeAssistant,
    user_entity_id: str,
    reason: str,
    delta: int | None = None,
    new_total: int | None = None,
) -> None:
    """Dopisuje wpis do "Historii postaci" - dziennika wszystkiego, co kiedykolwiek
    dotyczyło danego konta (punkty, przypisania zadań, zmiany ustawień, harmonogram).
    delta/new_total dotyczą tylko zdarzeń zmieniających punkty."""
    domain_data = hass.data.get(DOMAIN, {})
    if "data" not in domain_data:
        return
    data = domain_data["data"]
    entry = {
        "id": f"h_{int(time.time() * 1000)}_{user_entity_id}",
        "timestamp": dt_util.utcnow().isoformat(),
        "user": user_entity_id,
        "reason": reason,
    }
    if delta is not None:
        entry["delta"] = delta
        entry["new_total"] = new_total
    history = data.setdefault("history", [])
    history.append(entry)
    if len(history) > HISTORY_LIMIT:
        del history[: len(history) - HISTORY_LIMIT]
    await _persist(hass)
    _refresh_history_sensor(hass)


_ROLE_LABELS = {"admin": "Administrator", "child": "Dziecko", "member": "Członek rodziny"}
_DAY_NAMES = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"]
_MAX_DETAILED_SCHEDULE_ENTRIES = 5


async def _log_settings_changes(hass: HomeAssistant, old_users: list, new_users: list) -> None:
    """Loguje zmiany imienia/roli/PIN-u/powiązania z person.* dla każdego konta."""
    old_by_id = {u["id"]: u for u in old_users}
    for user in new_users:
        entity_id = user.get("haEntityId")
        if not entity_id:
            continue
        old = old_by_id.get(user["id"])
        if old is None:
            await _log_history(hass, entity_id, "Utworzono konto")
            continue
        if old.get("name") != user.get("name"):
            await _log_history(hass, entity_id, f"Zmieniono imię: {old.get('name')} → {user.get('name')}")
        if old.get("role") != user.get("role"):
            old_label = _ROLE_LABELS.get(old.get("role"), old.get("role"))
            new_label = _ROLE_LABELS.get(user.get("role"), user.get("role"))
            await _log_history(hass, entity_id, f"Zmieniono rolę: {old_label} → {new_label}")
        if bool(old.get("requiresApproval")) != bool(user.get("requiresApproval")):
            msg = "Włączono wymóg akceptacji zadań" if user.get("requiresApproval") else "Wyłączono wymóg akceptacji zadań"
            await _log_history(hass, entity_id, msg)
        if bool(old.get("pinCode")) != bool(user.get("pinCode")):
            await _log_history(hass, entity_id, "Ustawiono kod PIN" if user.get("pinCode") else "Usunięto kod PIN")
        if old.get("personEntityId") != user.get("personEntityId"):
            if user.get("personEntityId"):
                await _log_history(hass, entity_id, f"Powiązano z {user.get('personEntityId')}")
            else:
                await _log_history(hass, entity_id, "Usunięto powiązanie z Home Assistant")


async def _log_assignment_changes(
    hass: HomeAssistant, old_rows: dict, new_rows: dict, tasks_by_id: dict, users_by_id: dict
) -> None:
    """Loguje przypięcie/odpięcie osoby od zadania i powiadamia (jeśli włączone)."""
    for task_id in set(old_rows.keys()) | set(new_rows.keys()):
        old_persons = {r.get("person") for r in old_rows.get(task_id, []) if r.get("person")}
        new_persons = {r.get("person") for r in new_rows.get(task_id, []) if r.get("person")}
        task_name = tasks_by_id.get(task_id, task_id)
        for uid in new_persons - old_persons:
            user = users_by_id.get(uid)
            entity_id = user.get("haEntityId") if user else None
            if not entity_id:
                continue
            await _log_history(hass, entity_id, f"Przypisano do zadania: {task_name}")
            if user and user.get("notifyOnNewTask"):
                await _notify_user(hass, user, "Nowe zadanie", f"Przypisano Ci zadanie: {task_name}")
        for uid in old_persons - new_persons:
            entity_id = users_by_id.get(uid, {}).get("haEntityId")
            if entity_id:
                await _log_history(hass, entity_id, f"Odpięto od zadania: {task_name}")


async def _log_schedule_changes(
    hass: HomeAssistant, old_completions: dict, new_completions: dict, task_rows: dict, tasks_by_id: dict, id_to_entity: dict
) -> None:
    """Loguje odhaczenia/odznaczenia w harmonogramie. Przy dużej liczbie naraz
    (np. import) zapisuje jeden zbiorczy wpis zamiast zalewać historię."""
    changed_keys = set(old_completions.keys()) ^ set(new_completions.keys())
    if not changed_keys:
        return

    row_lookup = {}
    for task_id, rows in task_rows.items():
        for row in rows:
            row_lookup[row["id"]] = (task_id, row.get("person"))

    added: dict[str, list[str]] = {}
    removed: dict[str, list[str]] = {}
    for key in changed_keys:
        row_id, _, day_str = key.rpartition("_")
        info = row_lookup.get(row_id)
        if not info:
            continue
        task_id, person = info
        if not person:
            continue
        entity_id = id_to_entity.get(person)
        if not entity_id:
            continue
        task_name = tasks_by_id.get(task_id, task_id)
        try:
            day = int(day_str)
            day_label = f"{_DAY_NAMES[(day - 1) % 7]} (dzień {day})"
        except ValueError:
            day_label = day_str
        bucket = added if key in new_completions else removed
        bucket.setdefault(entity_id, []).append(f"{task_name} — {day_label}")

    for entity_id, items in added.items():
        if len(items) <= _MAX_DETAILED_SCHEDULE_ENTRIES:
            for item in items:
                await _log_history(hass, entity_id, f"Odhaczono w harmonogramie: {item}")
        else:
            await _log_history(hass, entity_id, f"Odhaczono {len(items)} pozycji w harmonogramie")
    for entity_id, items in removed.items():
        if len(items) <= _MAX_DETAILED_SCHEDULE_ENTRIES:
            for item in items:
                await _log_history(hass, entity_id, f"Odznaczono w harmonogramie: {item}")
        else:
            await _log_history(hass, entity_id, f"Odznaczono {len(items)} pozycji w harmonogramie")


async def _sync_users(hass: HomeAssistant, users: list) -> None:
    """Tworzy realne, trwałe sensory punktów ORAZ osobistą listę todo
    (todo.chore_tasks_<id>) dla nowo dodanych użytkowników."""
    add_entities = hass.data.get(DOMAIN, {}).get("sensor_add_entities")
    points_entities = hass.data.get(DOMAIN, {}).setdefault("points_entities", {})
    todo_add_entities = hass.data.get(DOMAIN, {}).get("todo_add_entities")
    todo_entities = hass.data.get(DOMAIN, {}).setdefault("todo_entities", {})

    new_sensor_entities = []
    new_todo_entities = []
    for user in users:
        entity_id = user.get("haEntityId") or f"sensor.chore_points_{user['id']}"
        user.setdefault("haEntityId", entity_id)
        if entity_id not in points_entities and add_entities is not None:
            # Import lokalny, by uniknąć cyklu importów przy starcie integracji.
            from .sensor import ChorePointsSensor
            new_sensor_entities.append(ChorePointsSensor(hass, user))
        if user["id"] not in todo_entities and todo_add_entities is not None:
            from .todo import ChoreTodoListEntity
            new_todo_entities.append(ChoreTodoListEntity(user))

    if new_sensor_entities:
        add_entities(new_sensor_entities, update_before_add=True)
    if new_todo_entities:
        todo_add_entities(new_todo_entities, update_before_add=True)


async def _set_points_for_entity(hass: HomeAssistant, user_entity_id: str, points: int, reason: str = "") -> None:
    """Ustawia dokładną wartość punktów danej encji, z zapisem do magazynu i historii."""
    points = max(0, points)
    points_entities = hass.data.get(DOMAIN, {}).get("points_entities", {})
    entity = points_entities.get(user_entity_id)

    if entity is not None:
        current_points = entity.native_value or 0
        entity.set_points(points)
    else:
        user_state = hass.states.get(user_entity_id)
        try:
            current_points = int(user_state.state) if user_state else 0
        except ValueError:
            current_points = 0
        attrs = dict(user_state.attributes) if user_state else {
            "icon": "mdi:star-circle",
            "friendly_name": user_entity_id.replace("sensor.chore_points_", "").capitalize(),
        }
        hass.states.async_set(user_entity_id, points, attrs)

    domain_data = hass.data.get(DOMAIN, {})
    if "data" in domain_data:
        domain_data["data"].setdefault("points", {})[user_entity_id] = points
        await _persist(hass)

    if reason:
        await _log_history(hass, user_entity_id, reason, delta=points - current_points, new_total=points)


async def _add_points_to_entity(hass: HomeAssistant, user_entity_id: str, points: int, reason: str = "") -> None:
    """Pomocnicza funkcja do modyfikacji stanu punktów sensora (z trwałym zapisem i historią)."""
    points_entities = hass.data.get(DOMAIN, {}).get("points_entities", {})
    entity = points_entities.get(user_entity_id)
    if entity is not None:
        current_points = entity.native_value or 0
    else:
        user_state = hass.states.get(user_entity_id)
        try:
            current_points = int(user_state.state) if user_state else 0
        except ValueError:
            current_points = 0

    new_points = max(0, current_points + points)
    await _set_points_for_entity(hass, user_entity_id, new_points, reason=reason)


# ---------------------------------------------------------------------------
# Wystąpienia zadań (occurrences): łączenie Harmonogramu z natywną listą todo
# ---------------------------------------------------------------------------
# Każda cyklicznie przypisana pozycja Harmonogramu (dzień tygodnia zaznaczony
# w widoku "Tygodniowy" - dokładnie te same checkboxy co dotąd) dostaje
# dokładnie JEDNO aktywne, terminowe wystąpienie na liście "todo.chore_tasks".
# Kolejne wystąpienie generuje się dopiero, gdy poprzednie zostanie
# rozstrzygnięte (zatwierdzone/odrzucone) - bez generowania listy w nieskończoność.
UNDO_WINDOW_SECONDS = 60


def _next_weekday_date(from_date: "date", weekdays: set) -> "date":
    """Najbliższa data (>= from_date) wypadająca na jeden z podanych dni
    tygodnia (1=Pn ... 7=Nd, zgodnie z resztą modułu - patrz _DAY_NAMES)."""
    for offset in range(0, 8):
        candidate = from_date + timedelta(days=offset)
        if (candidate.weekday() + 1) in weekdays:
            return candidate
    return from_date


def _period_bounds(day: "date", period: str) -> tuple["date", "date"]:
    """Zwraca (początek, koniec-wyłącznie) okresu miesięcznego/rocznego
    zawierającego podany dzień."""
    if period == "year":
        return date(day.year, 1, 1), date(day.year + 1, 1, 1)
    # "month" (domyślny/jedyny inny obsługiwany okres)
    if day.month == 12:
        return date(day.year, 12, 1), date(day.year + 1, 1, 1)
    return date(day.year, day.month, 1), date(day.year, day.month + 1, 1)


def _next_periodic_date(from_date: "date", times_per_period: int, period: str) -> "date":
    """Rozkłada `times_per_period` terminów równomiernie w obrębie okresu
    (miesiąc/rok) i zwraca najbliższy nieminięty (>= from_date). Np. 2 razy
    w miesiącu = terminy mniej więcej w połowie i na końcu miesiąca; 4 razy
    w roku = raz na kwartał. Gdy wszystkie terminy bieżącego okresu już minęły,
    zwraca pierwszy termin okresu następnego."""
    n = max(1, times_per_period)
    for _ in range(2):  # bieżący okres, a razie potrzeby - następny
        p_start, p_end = _period_bounds(from_date, period)
        period_len = (p_end - p_start).days
        for k in range(n):
            slot_due = p_start + timedelta(days=max(0, round((k + 1) * period_len / n) - 1))
            if slot_due >= from_date:
                return slot_due
        # wszystkie terminy tego okresu minęły -> sprawdź następny okres
        from_date = p_end
    return from_date


async def _ensure_occurrences(hass: HomeAssistant) -> None:
    """Dogenerowuje brakujące wystąpienia dla każdego cyklicznego przypisania
    z Harmonogramu (jedno aktywne wystąpienie naraz na przypisanie)."""
    domain_data = hass.data.get(DOMAIN, {})
    if "data" not in domain_data:
        return
    data = domain_data["data"]
    occurrences = data.setdefault("occurrences", {})
    today = dt_util.now().date()

    active_by_row: dict[str, bool] = {}
    for occ in occurrences.values():
        if occ.get("adhoc"):
            continue
        if occ.get("status") in ("open", "pending_approval", "awaiting_award"):
            active_by_row[occ.get("row_id")] = True

    changed = False
    for task in data.get("tasks", []):
        task_id = task.get("id")
        for row in data.get("taskRows", {}).get(task_id, []):
            person = row.get("person")
            row_id = row.get("id")
            if not person or not row_id or active_by_row.get(row_id):
                continue

            periodic = data.get("periodicSchedules", {}).get(row_id)
            if periodic:
                due = _next_periodic_date(
                    today, periodic.get("times_per_period", 1), periodic.get("period", "month")
                )
                schedule_type = "periodic"
            else:
                weekdays = {d for d in range(1, 8) if data.get("completions", {}).get(f"{row_id}_{d}")}
                if not weekdays:
                    continue
                due = _next_weekday_date(today, weekdays)
                schedule_type = "weekly"

            occ_id = f"occ_{row_id}_{due.isoformat()}"
            if occ_id in occurrences:
                continue
            occurrences[occ_id] = {
                "id": occ_id,
                "task_id": task_id,
                "row_id": row_id,
                "person": person,
                "due": due.isoformat(),
                "status": "open",
                "schedule_type": schedule_type,
                "created": dt_util.utcnow().isoformat(),
            }
            active_by_row[row_id] = True
            changed = True

    if changed:
        await _persist(hass)
    _refresh_todo_entities(hass)
    _refresh_overdue_sensor(hass)
    _refresh_upcoming_sensor(hass)


def _occurrence_context(hass: HomeAssistant, occ_id: str):
    """Zwraca (data, occ, task, user) dla danego wystąpienia, albo None jeśli
    nie istnieje/jest niespójne."""
    data = hass.data.get(DOMAIN, {}).get("data")
    if not data:
        return None
    occ = data.get("occurrences", {}).get(occ_id)
    if not occ:
        return None
    task = next((t for t in data.get("tasks", []) if t.get("id") == occ.get("task_id")), None)
    user = next((u for u in data.get("users", []) if u.get("id") == occ.get("person")), None)
    if not task or not user:
        return None
    return data, occ, task, user


async def _complete_occurrence(hass: HomeAssistant, occ_id: str) -> None:
    """Odhaczenie wystąpienia na aktywnej liście todo. Dla osób wymagających
    akceptacji przenosi je natychmiast na listę "Do zatwierdzenia" (przegląd
    rodzica pełni tu rolę zabezpieczenia). Dla pozostałych daje 60 sekund na
    cofnięcie (odznaczenie z powrotem), zanim punkty faktycznie się naliczą -
    ochrona przed przypadkowym kliknięciem."""
    ctx = _occurrence_context(hass, occ_id)
    if not ctx:
        return
    data, occ, task, user = ctx
    task_name = task.get("name", occ.get("task_id"))

    if user.get("requiresApproval"):
        occ["status"] = "pending_approval"
        submission = {
            "id": f"sub_{occ_id}",
            "user": user.get("haEntityId"),
            "task_id": occ.get("task_id"),
            "task_name": task_name,
            "points": task.get("points", 0),
            "occurrence_id": occ_id,
        }
        data.setdefault("pending_approvals", []).append(submission)
        await _persist(hass)
        _refresh_pending_sensor(hass)
        _refresh_todo_entities(hass)
        _refresh_overdue_sensor(hass)
        _refresh_upcoming_sensor(hass)
        hass.bus.async_fire(EVENT_TASK_COMPLETED, {
            "user": user.get("haEntityId"),
            "task_id": occ.get("task_id"),
            "task_name": task_name,
            "points": task.get("points", 0),
            "status": "pending_approval",
        })
        return

    occ["status"] = "awaiting_award"
    await _persist(hass)
    _refresh_todo_entities(hass)

    async def _finalize(_now) -> None:
        hass.data.get(DOMAIN, {}).get("pending_awards", {}).pop(occ_id, None)
        ctx2 = _occurrence_context(hass, occ_id)
        if not ctx2:
            return
        data2, occ2, task2, user2 = ctx2
        if occ2.get("status") != "awaiting_award":
            return
        del data2["occurrences"][occ_id]
        await _persist(hass)
        _refresh_todo_entities(hass)
        _refresh_overdue_sensor(hass)
        _refresh_upcoming_sensor(hass)
        await _add_points_to_entity(hass, user2.get("haEntityId"), task2.get("points", 0), reason=f"Zadanie: {task2.get('name')}")
        hass.bus.async_fire(EVENT_TASK_COMPLETED, {
            "user": user2.get("haEntityId"),
            "task_id": occ2.get("task_id"),
            "task_name": task2.get("name"),
            "points": task2.get("points", 0),
            "status": "approved",
        })

    cancel = async_call_later(hass, UNDO_WINDOW_SECONDS, _finalize)
    hass.data.setdefault(DOMAIN, {}).setdefault("pending_awards", {})[occ_id] = cancel


async def _uncomplete_occurrence(hass: HomeAssistant, occ_id: str) -> None:
    """Odznaczenie z powrotem w oknie 60 sekund - anuluje zaplanowane naliczenie
    punktów i przywraca wystąpienie jako otwarte."""
    cancel = hass.data.get(DOMAIN, {}).get("pending_awards", {}).pop(occ_id, None)
    if cancel:
        cancel()
    data = hass.data.get(DOMAIN, {}).get("data")
    if not data:
        return
    occ = data.get("occurrences", {}).get(occ_id)
    if occ and occ.get("status") == "awaiting_award":
        occ["status"] = "open"
        await _persist(hass)
        _refresh_todo_entities(hass)


async def _create_adhoc_occurrence(hass: HomeAssistant, summary: str, person: str | None = None) -> None:
    """Dodanie doraźnej pozycji przez natywny UI todo (Assist itp.) - poza
    systemem punktów. Jeśli dodana z osobistej listy danej osoby, zostaje na
    niej przypisana; z listy zbiorczej ("todo.chore_tasks") widoczna jest
    tylko tam."""
    data = hass.data.get(DOMAIN, {}).get("data")
    if data is None:
        return
    occ_id = f"occ_adhoc_{uuid.uuid4().hex[:8]}"
    occurrence = {
        "id": occ_id,
        "adhoc": True,
        "summary": summary,
        "status": "open",
        "created": dt_util.utcnow().isoformat(),
    }
    if person:
        occurrence["person"] = person
    data.setdefault("occurrences", {})[occ_id] = occurrence
    await _persist(hass)
    _refresh_todo_entities(hass)


async def _delete_occurrence(hass: HomeAssistant, occ_id: str) -> None:
    data = hass.data.get(DOMAIN, {}).get("data")
    if not data:
        return
    if occ_id in data.get("occurrences", {}):
        del data["occurrences"][occ_id]
        await _persist(hass)
        _refresh_todo_entities(hass)
        _refresh_overdue_sensor(hass)
        _refresh_upcoming_sensor(hass)
