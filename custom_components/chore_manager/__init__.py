"""Główny moduł integracji Chore Manager w Home Assistant."""
import logging
import time
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers.typing import ConfigType
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.storage import Store
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
    "taskRows": {},
    "completions": {},
    "computerSlots": {},
    "customSchedule": {},
    "pending_approvals": [],
    "points": {},
    "history": [],
}

# Klucze konfiguracji, które panel administracyjny może aktualizować przez
# usługę update_config. "users" jest obsługiwany osobno (może tworzyć nowe encje).
_PATCHABLE_KEYS = [
    "tasks",
    "rewards",
    "taskRows",
    "completions",
    "computerSlots",
    "customSchedule",
]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Konfiguracja integracji Chore Manager z poziomu configuration.yaml."""
    hass.data.setdefault(DOMAIN, {})
    await _async_setup_services(hass)
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

    hass.data[DOMAIN]["store"] = store
    hass.data[DOMAIN]["data"] = data
    hass.data[DOMAIN]["entry"] = entry

    await _async_setup_services(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Rozładowanie wpisu integracji."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
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

        # Usunięcie z kolejki oczekujących
        if "data" in hass.data.get(DOMAIN, {}):
            pending = hass.data[DOMAIN]["data"].get("pending_approvals", [])
            hass.data[DOMAIN]["data"]["pending_approvals"] = [
                p for p in pending if not (p.get("task_id") == task_id and p.get("user") == user_entity_id)
            ]
            await _persist(hass)
            _refresh_pending_sensor(hass)

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

        # Usunięcie z kolejki oczekujących
        if "data" in hass.data.get(DOMAIN, {}):
            pending = hass.data[DOMAIN]["data"].get("pending_approvals", [])
            hass.data[DOMAIN]["data"]["pending_approvals"] = [
                p for p in pending if not (p.get("task_id") == task_id and p.get("user") == user_entity_id)
            ]
            await _persist(hass)
            _refresh_pending_sensor(hass)

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
            _refresh_todo_entity(hass)

    # Rejestracja wszystkich serwisów
    hass.services.async_register(DOMAIN, SERVICE_COMPLETE_TASK, handle_complete_task)
    hass.services.async_register(DOMAIN, SERVICE_APPROVE_TASK, handle_approve_task)
    hass.services.async_register(DOMAIN, SERVICE_REJECT_TASK, handle_reject_task)
    hass.services.async_register(DOMAIN, SERVICE_CLAIM_REWARD, handle_claim_reward)
    hass.services.async_register(DOMAIN, SERVICE_ADD_POINTS, handle_add_points)
    hass.services.async_register(DOMAIN, SERVICE_RESET_POINTS, handle_reset_points)
    hass.services.async_register(DOMAIN, SERVICE_UPDATE_CONFIG, handle_update_config)


async def _persist(hass: HomeAssistant) -> None:
    """Zapisuje bieżący stan magazynu na dysk."""
    domain_data = hass.data.get(DOMAIN, {})
    if "store" in domain_data and "data" in domain_data:
        await domain_data["store"].async_save(domain_data["data"])


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


def _refresh_todo_entity(hass: HomeAssistant) -> None:
    entity = hass.data.get(DOMAIN, {}).get("todo_entity")
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
    """Tworzy realne, trwałe sensory punktów dla nowo dodanych użytkowników."""
    add_entities = hass.data.get(DOMAIN, {}).get("sensor_add_entities")
    points_entities = hass.data.get(DOMAIN, {}).setdefault("points_entities", {})

    new_entities = []
    for user in users:
        entity_id = user.get("haEntityId") or f"sensor.chore_points_{user['id']}"
        user.setdefault("haEntityId", entity_id)
        if entity_id not in points_entities and add_entities is not None:
            # Import lokalny, by uniknąć cyklu importów przy starcie integracji.
            from .sensor import ChorePointsSensor
            new_entities.append(ChorePointsSensor(hass, user))

    if new_entities:
        add_entities(new_entities, update_before_add=True)


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
