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
    EVENT_TASK_COMPLETED,
    EVENT_TASK_APPROVED,
    EVENT_TASK_REJECTED,
    EVENT_REWARD_CLAIMED,
)

_LOGGER = logging.getLogger(__name__)

PLATFORMS = ["sensor"]

async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Konfiguracja integracji Chore Manager z poziomu configuration.yaml."""
    hass.data.setdefault(DOMAIN, {})
    await _async_setup_services(hass)
    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Konfiguracja integracji Chore Manager z poziomu UI (Config Entry)."""
    hass.data.setdefault(DOMAIN, {})
    store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
    data = await store.async_load() or {
        "users": {},
        "pending_approvals": [],
        "history": [],
    }
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
                if "store" in hass.data[DOMAIN]:
                    await hass.data[DOMAIN]["store"].async_save(hass.data[DOMAIN]["data"])

            hass.bus.async_fire(EVENT_TASK_COMPLETED, {
                "user": user_entity_id,
                "task_id": task_id,
                "task_name": task_name,
                "points": points,
                "status": "pending_approval"
            })
            return

        # Przyznanie punktów bezpośrednio
        _add_points_to_entity(hass, user_entity_id, points)
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
            if "store" in hass.data[DOMAIN]:
                await hass.data[DOMAIN]["store"].async_save(hass.data[DOMAIN]["data"])

        _add_points_to_entity(hass, user_entity_id, points)
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
            if "store" in hass.data[DOMAIN]:
                await hass.data[DOMAIN]["store"].async_save(hass.data[DOMAIN]["data"])

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

        new_points = current_points - cost
        hass.states.async_set(user_entity_id, new_points, user_state.attributes)

        hass.bus.async_fire(EVENT_REWARD_CLAIMED, {
            "user": user_entity_id,
            "reward_id": reward_id,
            "reward_name": reward_name,
            "cost": cost,
            "remaining_points": new_points
        })
        _LOGGER.info("Użytkownik %s odebrał nagrodę %s za %s pkt", user_entity_id, reward_name, cost)

    async def handle_add_points(call: ServiceCall):
        """Ręczne dodanie lub odjęcie punktów."""
        user_entity_id = call.data.get("user")
        points = call.data.get("points", 0)
        _add_points_to_entity(hass, user_entity_id, points)

    async def handle_reset_points(call: ServiceCall):
        """Zresetowanie punktów danego użytkownika do zera."""
        user_entity_id = call.data.get("user")
        user_state = hass.states.get(user_entity_id)
        if user_state:
            hass.states.async_set(user_entity_id, 0, user_state.attributes)

    # Rejestracja wszystkich serwisów
    hass.services.async_register(DOMAIN, SERVICE_COMPLETE_TASK, handle_complete_task)
    hass.services.async_register(DOMAIN, SERVICE_APPROVE_TASK, handle_approve_task)
    hass.services.async_register(DOMAIN, SERVICE_REJECT_TASK, handle_reject_task)
    hass.services.async_register(DOMAIN, SERVICE_CLAIM_REWARD, handle_claim_reward)
    hass.services.async_register(DOMAIN, SERVICE_ADD_POINTS, handle_add_points)
    hass.services.async_register(DOMAIN, SERVICE_RESET_POINTS, handle_reset_points)

def _add_points_to_entity(hass: HomeAssistant, user_entity_id: str, points: int):
    """Pomocnicza funkcja do modyfikacji stanu punktów sensora."""
    user_state = hass.states.get(user_entity_id)
    current_points = 0
    attrs = {"icon": "mdi:star-circle", "friendly_name": user_entity_id.replace("sensor.chore_points_", "").capitalize()}
    if user_state:
        try:
            current_points = int(user_state.state)
        except ValueError:
            current_points = 0
        attrs = dict(user_state.attributes)

    new_points = max(0, current_points + points)
    hass.states.async_set(user_entity_id, new_points, attrs)
