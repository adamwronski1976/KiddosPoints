"""Standardowa lista 'do zrobienia' Home Assistant, zsynchronizowana z listą
zadań w panelu administracyjnym KiddosPoints."""
import uuid
from homeassistant.components.todo import (
    TodoItem,
    TodoItemStatus,
    TodoListEntity,
    TodoListEntityFeature,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from .const import DOMAIN


def _stored_data(hass: HomeAssistant) -> dict:
    return hass.data.get(DOMAIN, {}).get("data", {})


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities):
    async_add_entities([ChoreTodoListEntity()])


class ChoreTodoListEntity(TodoListEntity):
    """Lista zadań domowych jako standardowa encja 'todo' Home Assistant."""

    _attr_name = "Zadania domowe"
    _attr_unique_id = "chore_manager_tasks"
    _attr_icon = "mdi:checkbox-marked-outline"
    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.DELETE_TODO_ITEM
    )

    def __init__(self):
        self.entity_id = "todo.chore_tasks"

    async def async_added_to_hass(self):
        self.hass.data.setdefault(DOMAIN, {})["todo_entity"] = self

    @property
    def todo_items(self):
        tasks = _stored_data(self.hass).get("tasks", []) if self.hass else []
        return [
            TodoItem(
                uid=t["id"],
                summary=t["name"],
                status=TodoItemStatus.NEEDS_ACTION,
                description=f"{t.get('points', 0)} pkt",
            )
            for t in tasks
        ]

    @property
    def extra_state_attributes(self):
        """Zachowane dla kompatybilności z kartą Lovelace (chore-manager-card.js),
        która czyta listę zadań z atrybutu zamiast standardowego API todo."""
        data = _stored_data(self.hass) if self.hass else {}
        tasks = data.get("tasks", [])
        task_rows = data.get("taskRows", {})
        users_by_id = {u["id"]: u for u in data.get("users", [])}

        items = []
        for t in tasks:
            rows = task_rows.get(t["id"], [])
            if not rows:
                items.append({"id": t["id"], "name": t["name"], "points": t["points"], "assigned_to": "Wszyscy"})
                continue
            for row in rows:
                user = users_by_id.get(row.get("person"))
                items.append({
                    "id": f"{t['id']}_{row['id']}",
                    "name": t["name"],
                    "points": t["points"],
                    "assigned_to": user["name"] if user else (row.get("person") or "Wszyscy"),
                })
        return {"tasks": items}

    async def async_create_todo_item(self, item: TodoItem) -> None:
        data = _stored_data(self.hass)
        if "tasks" not in data:
            return
        new_id = f"t_todo_{uuid.uuid4().hex[:8]}"
        data["tasks"].append({"id": new_id, "name": item.summary, "points": 10})
        data.setdefault("taskRows", {})[new_id] = [{"id": f"{new_id}_r0", "person": ""}]
        await self._persist_and_refresh()

    async def async_update_todo_item(self, item: TodoItem) -> None:
        data = _stored_data(self.hass)
        for t in data.get("tasks", []):
            if t["id"] == item.uid:
                t["name"] = item.summary
        await self._persist_and_refresh()

    async def async_delete_todo_items(self, uids: list) -> None:
        data = _stored_data(self.hass)
        data["tasks"] = [t for t in data.get("tasks", []) if t["id"] not in uids]
        for uid in uids:
            data.get("taskRows", {}).pop(uid, None)
        await self._persist_and_refresh()

    async def _persist_and_refresh(self) -> None:
        domain_data = self.hass.data.get(DOMAIN, {})
        store = domain_data.get("store")
        if store and "data" in domain_data:
            await store.async_save(domain_data["data"])
        self.async_write_ha_state()
        config_entity = domain_data.get("config_entity")
        if config_entity is not None:
            config_entity.async_write_ha_state()
