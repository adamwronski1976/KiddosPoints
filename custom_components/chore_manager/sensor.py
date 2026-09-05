"""Obsługa sensorów punktacji i konfiguracji w Home Assistant."""
from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from .const import DOMAIN


def _stored_data(hass: HomeAssistant) -> dict:
    """Zwraca współdzielony słownik danych integracji (pusty, jeśli jeszcze nie załadowany)."""
    return hass.data.get(DOMAIN, {}).get("data", {})


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities):
    """Konfiguracja sensorów na podstawie Config Entry."""
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN]["sensor_add_entities"] = async_add_entities

    data = _stored_data(hass)
    users = data.get("users", [])

    entities = [ChorePointsSensor(hass, u) for u in users]
    entities.append(ChorePendingCountSensor())
    entities.append(ChoreConfigSensor())
    async_add_entities(entities, update_before_add=True)


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    """Konfiguracja sensorów przez YAML (dla kompatybilności wstecznej)."""
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN]["sensor_add_entities"] = async_add_entities

    data = _stored_data(hass)
    users = data.get("users", [])
    entities = [ChorePointsSensor(hass, u) for u in users]
    entities.append(ChorePendingCountSensor())
    entities.append(ChoreConfigSensor())
    async_add_entities(entities)


class ChorePointsSensor(SensorEntity):
    """Reprezentacja punktów konkretnego członka rodziny."""

    _attr_state_class = SensorStateClass.TOTAL
    _attr_icon = "mdi:star-circle"
    _attr_native_unit_of_measurement = "pkt"

    def __init__(self, hass: HomeAssistant, user: dict):
        user_id = user["id"]
        name = user.get("name", user_id)
        self._attr_name = f"Punkty {name}"
        self._attr_unique_id = f"chore_points_{user_id}"
        self.entity_id = user.get("haEntityId") or f"sensor.chore_points_{user_id}"
        self._user_id = user_id
        # Odtworzenie ostatniej wartości punktów z magazynu integracji (przetrwanie restartu).
        stored_points = _stored_data(hass).get("points", {})
        self._state = stored_points.get(self.entity_id, 0)

    async def async_added_to_hass(self):
        """Rejestracja instancji encji, by __init__.py mógł pchać do niej aktualizacje."""
        self.hass.data.setdefault(DOMAIN, {}).setdefault("points_entities", {})[self.entity_id] = self

    def set_points(self, points: int) -> None:
        """Ustawia wartość punktów i publikuje nowy stan encji."""
        self._state = points
        self.async_write_ha_state()

    @property
    def native_value(self):
        return self._state

    @property
    def extra_state_attributes(self):
        """Dodatkowe atrybuty: poziom, ranga, ukończone zadania."""
        points = self._state
        level = (points // 100) + 1
        return {
            "user_id": self._user_id,
            "level": level,
            "rank": self._get_rank(level),
            "points_to_next_level": 100 - (points % 100),
        }

    def _get_rank(self, level: int) -> str:
        if level >= 10:
            return "Mistrz Domu"
        if level >= 7:
            return "Ekspert Porządków"
        if level >= 4:
            return "Pomocnik Rodziny"
        if level >= 2:
            return "Młodszy Kadet"
        return "Nowicjusz"


class ChorePendingCountSensor(SensorEntity):
    """Sensor zliczający zadania czekające na zatwierdzenie przez rodziców."""

    _attr_name = "Oczekujące na zatwierdzenie"
    _attr_unique_id = "chore_manager_pending_approvals"
    _attr_icon = "mdi:clock-alert-outline"
    _attr_native_unit_of_measurement = "zadań"

    def __init__(self):
        self.entity_id = "sensor.chore_manager_pending_approvals"
        self._state = 0

    async def async_added_to_hass(self):
        self.hass.data.setdefault(DOMAIN, {})["pending_entity"] = self

    @property
    def native_value(self):
        return len(_stored_data(self.hass).get("pending_approvals", [])) if self.hass else self._state

    @property
    def extra_state_attributes(self):
        """Lista oczekujących zadań ze szczegółami dla karty Lovelace."""
        items = _stored_data(self.hass).get("pending_approvals", []) if self.hass else []
        return {"items": items}


class ChoreConfigSensor(SensorEntity):
    """Sensor-magazyn: udostępnia cały konfigurowalny stan (użytkownicy, zadania,
    nagrody, harmonogram) panelowi administracyjnemu jako atrybuty encji."""

    _attr_name = "KiddosPoints - Konfiguracja"
    _attr_unique_id = "chore_manager_config"
    _attr_icon = "mdi:cog"

    def __init__(self):
        self.entity_id = "sensor.chore_manager_config"

    async def async_added_to_hass(self):
        self.hass.data.setdefault(DOMAIN, {})["config_entity"] = self

    @property
    def native_value(self):
        data = _stored_data(self.hass) if self.hass else {}
        return len(data.get("tasks", []))

    @property
    def extra_state_attributes(self):
        data = _stored_data(self.hass) if self.hass else {}
        return {
            "users": data.get("users", []),
            "tasks": data.get("tasks", []),
            "rewards": data.get("rewards", []),
            "taskRows": data.get("taskRows", {}),
            "completions": data.get("completions", {}),
            "customRewardCosts": data.get("customRewardCosts", {}),
            "customTaskPoints": data.get("customTaskPoints", {}),
            "computerSlots": data.get("computerSlots", {}),
            "customSchedule": data.get("customSchedule", {}),
        }
