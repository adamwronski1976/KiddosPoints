"""Główny moduł integracji Chore Manager w Home Assistant."""
import logging
import time
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers.typing import ConfigType
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.storage import Store
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
    "customRewardCosts": {},
    "customTaskPoints": {},
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
    "customRewardCosts",
    "customTaskPoints",
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
        await _add_points_to_entity(hass, user_entity_id, points)
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

        await _add_points_to_entity(hass, user_entity_id, points)
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

        await _add_points_to_entity(hass, user_entity_id, -cost)

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
        await _add_points_to_entity(hass, user_entity_id, points)

    async def handle_reset_points(call: ServiceCall):
        """Zresetowanie punktów danego użytkownika do zera."""
        user_entity_id = call.data.get("user")
        user_state = hass.states.get(user_entity_id)
        if user_state:
            await _set_points_for_entity(hass, user_entity_id, 0)

    async def handle_update_config(call: ServiceCall):
        """Scala fragment (patch) konfiguracji panelu administracyjnego z magazynem."""
        patch = call.data.get("patch") or {}
        if "data" not in hass.data.get(DOMAIN, {}):
            return
        data = hass.data[DOMAIN]["data"]

        for key in _PATCHABLE_KEYS:
            if key in patch:
                data[key] = patch[key]

        if "users" in patch:
            await _sync_users(hass, patch["users"])
            data["users"] = patch["users"]

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


async def _set_points_for_entity(hass: HomeAssistant, user_entity_id: str, points: int) -> None:
    """Ustawia dokładną wartość punktów danej encji, z zapisem do magazynu."""
    points = max(0, points)
    points_entities = hass.data.get(DOMAIN, {}).get("points_entities", {})
    entity = points_entities.get(user_entity_id)
    if entity is not None:
        entity.set_points(points)
    else:
        user_state = hass.states.get(user_entity_id)
        attrs = dict(user_state.attributes) if user_state else {
            "icon": "mdi:star-circle",
            "friendly_name": user_entity_id.replace("sensor.chore_points_", "").capitalize(),
        }
        hass.states.async_set(user_entity_id, points, attrs)

    domain_data = hass.data.get(DOMAIN, {})
    if "data" in domain_data:
        domain_data["data"].setdefault("points", {})[user_entity_id] = points
        await _persist(hass)


async def _add_points_to_entity(hass: HomeAssistant, user_entity_id: str, points: int) -> None:
    """Pomocnicza funkcja do modyfikacji stanu punktów sensora (z trwałym zapisem)."""
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
    await _set_points_for_entity(hass, user_entity_id, new_points)
