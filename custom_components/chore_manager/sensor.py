"""Obsługa sensorów punktacji w Home Assistant."""
from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from .const import DOMAIN

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities):
    """Konfiguracja sensorów na podstawie Config Entry."""
    default_users = [
        {"name": "Adam", "id": "adam"},
        {"name": "Nina", "id": "nina"},
        {"name": "Tata", "id": "tata"},
        {"name": "Mama", "id": "mama"},
    ]
    
    entities = []
    for u in default_users:
        entities.append(ChorePointsSensor(u["name"], u["id"]))
    
    entities.append(ChorePendingCountSensor())
    async_add_entities(entities, update_before_add=True)


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    """Konfiguracja sensorów przez YAML (dla kompatybilności wstecznej)."""
    users = config.get("users", ["adam", "nina", "tata", "mama"])
    entities = [ChorePointsSensor(u.capitalize(), u.lower()) for u in users]
    entities.append(ChorePendingCountSensor())
    async_add_entities(entities)


class ChorePointsSensor(SensorEntity):
    """Reprezentacja punktów konkretnego członka rodziny."""

    _attr_state_class = SensorStateClass.TOTAL
    _attr_icon = "mdi:star-circle"
    _attr_native_unit_of_measurement = "pkt"

    def __init__(self, name: str, user_id: str):
        self._attr_name = f"Punkty {name}"
        self._attr_unique_id = f"chore_points_{user_id}"
        self.entity_id = f"sensor.chore_points_{user_id}"
        self._state = 0
        self._user_id = user_id

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

    @property
    def native_value(self):
        if self.hass and DOMAIN in self.hass.data and "data" in self.hass.data[DOMAIN]:
            return len(self.hass.data[DOMAIN]["data"].get("pending_approvals", []))
        return self._state

    @property
    def extra_state_attributes(self):
        """Lista oczekujących zadań ze szczegółami dla karty Lovelace."""
        items = []
        if self.hass and DOMAIN in self.hass.data and "data" in self.hass.data[DOMAIN]:
            items = self.hass.data[DOMAIN]["data"].get("pending_approvals", [])
        return {"items": items}
