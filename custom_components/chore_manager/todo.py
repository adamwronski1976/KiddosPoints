"""Natywne listy 'do zrobienia' Home Assistant, zsynchronizowane z Harmonogramem
panelu KiddosPoints:
- 'todo.chore_tasks_<id>' - osobista, aktywna lista każdej osoby (tworzona
  dynamicznie tak samo jak sensor punktów tej osoby),
- 'todo.chore_tasks' - zbiorcza lista wszystkich (zachowana dla kompatybilności
  wstecznej z kartą Lovelace, która czyta z niej cały katalog zadań),
- 'todo.chore_pending_approval' - jedna wspólna kolejka do akceptacji przez
  rodzica (rozbijanie jej per dziecko rozdrabniałoby jeden proces przeglądu).
Pozycja NIGDY nie znika bezpowrotnie przy odhaczeniu/odrzuceniu - przenosi się
między listami (patrz _complete_occurrence/_reject_occurrence w __init__.py)."""
import uuid
from datetime import date
from homeassistant.components.todo import (
    TodoItem,
    TodoItemStatus,
    TodoListEntity,
    TodoListEntityFeature,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from .const import DOMAIN, SERVICE_APPROVE_TASK, SERVICE_REJECT_TASK
from . import _complete_occurrence, _uncomplete_occurrence, _create_adhoc_occurrence, _delete_occurrence


def _stored_data(hass: HomeAssistant) -> dict:
    return hass.data.get(DOMAIN, {}).get("data", {})


def _find_user(hass: HomeAssistant, user_id: str) -> dict:
    for user in _stored_data(hass).get("users", []):
        if user.get("id") == user_id:
            return user
    return {}


def _task_and_user(data: dict, occ: dict):
    task = next((t for t in data.get("tasks", []) if t.get("id") == occ.get("task_id")), None)
    user = next((u for u in data.get("users", []) if u.get("id") == occ.get("person")), None)
    return task, user


# Natywna lista "todo" Home Assistant renderuje pozycje jako czysty tekst -
# TodoItem nie ma pola ikony, więc karta todo-list nie pokaże mdi:* użytego
# w panelu KiddosPoints. Emoji to zwykły znak unicode, więc działa wszędzie
# (todo-list, powiadomienia, dowolna karta) bez potrzeby biblioteki ikon -
# stąd mapowanie mdi:* -> emoji tylko na potrzeby podpisu w todo.
_ICON_TO_EMOJI = {
    "mdi:dishwasher": "🍽️",
    "mdi:washing-machine": "🧺",
    "mdi:toilet": "🚽",
    "mdi:shower-head": "🚿",
    "mdi:bed-outline": "🛏️",
    "mdi:bed": "🛏️",
    "mdi:trash-can": "🗑️",
    "mdi:trash-can-outline": "🗑️",
    "mdi:recycle": "♻️",
    "mdi:mower": "🌱",
    "mdi:rake": "🍂",
    "mdi:snowflake": "❄️",
    "mdi:mop": "🧹",
    "mdi:door": "🚪",
    "mdi:feather": "🪶",
    "mdi:desk": "🗄️",
    "mdi:basket-outline": "🧺",
    "mdi:sprout": "🌱",
    "mdi:tumble-dryer-alert": "🧺",
    "mdi:silverware-clean": "🍴",
    "mdi:tumble-dryer": "🌀",
    "mdi:fish": "🐟",
    "mdi:table-furniture": "🪑",
    "mdi:stairs": "🪜",
    "mdi:mirror": "🪞",
    "mdi:light-switch": "💡",
    "mdi:air-filter": "🌬️",
    "mdi:wardrobe": "🧥",
    "mdi:garage": "🚗",
    "mdi:scissors-cutting": "✂️",
    "mdi:countertop": "🍳",
    "mdi:sofa": "🛋️",
    "mdi:bookshelf": "📚",
    "mdi:spray-bottle": "🧴",
    "mdi:shoe-sneaker": "👟",
    "mdi:notebook-edit": "📓",
    "mdi:school": "🏫",
    "mdi:bag-personal": "🎒",
    "mdi:book-open-page-variant": "📖",
    "mdi:flag-variant-outline": "🇬🇧",
    "mdi:translate": "🌐",
    "mdi:dumbbell": "🏋️",
    "mdi:code-braces": "💻",
    "mdi:account-group": "👥",
    "mdi:badminton": "🏸",
    "mdi:swim": "🏊",
    "mdi:checkbox-marked-circle-outline": "✅",
}


def _icon_prefix(task: dict | None) -> str:
    if not task:
        return ""
    emoji = _ICON_TO_EMOJI.get(task.get("icon", ""))
    return f"{emoji} " if emoji else ""


def _occurrence_summary(data: dict, occ: dict, include_person: bool) -> str:
    if occ.get("adhoc"):
        return occ.get("summary", "Zadanie")
    task, user = _task_and_user(data, occ)
    task_name = _icon_prefix(task) + (task.get("name") if task else occ.get("task_id"))
    if not include_person:
        return task_name
    user_name = user.get("name") if user else occ.get("person")
    return f"{task_name} — {user_name}"


def _occurrence_description(data: dict, occ: dict) -> str | None:
    if occ.get("adhoc"):
        return None
    task, _ = _task_and_user(data, occ)
    if not task:
        return None
    parts = []
    if occ.get("reject_reason"):
        # Widoczne wprost na zadaniu (nie tylko w historii), żeby dziecko od
        # razu wiedziało, co poprawić przy ponownym zgłoszeniu.
        parts.append(f"⚠️ Odrzucono: {occ['reject_reason']}")
    parts.append(f"{task.get('points', 0)} pkt")
    if task.get("description"):
        parts.append(task["description"])
    return " · ".join(parts)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities):
    hass.data.setdefault(DOMAIN, {})["todo_add_entities"] = async_add_entities

    entities = [ChoreTodoListEntity(None), ChorePendingApprovalTodoEntity()]
    for user in _stored_data(hass).get("users", []):
        entities.append(ChoreTodoListEntity(user))
    async_add_entities(entities)


class ChoreTodoListEntity(TodoListEntity):
    """Lista wystąpień zadań. Bez `user` (person=None) to zbiorcza lista
    wszystkich domowników (`todo.chore_tasks`, zachowana dla karty Lovelace);
    z `user` to osobista lista danej osoby (`todo.chore_tasks_<id>`),
    tworzona/usuwana dynamicznie razem z użytkownikiem."""

    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.DELETE_TODO_ITEM
        | TodoListEntityFeature.SET_DUE_DATE_ON_ITEM
    )

    def __init__(self, user: dict | None):
        self._user_id = user.get("id") if user else None
        self._initial_name = user.get("name") if user else None
        if user:
            self.entity_id = f"todo.chore_tasks_{self._user_id}"
            self._attr_unique_id = f"chore_manager_tasks_{self._user_id}"
            self._attr_icon = "mdi:checkbox-marked-outline"
        else:
            self.entity_id = "todo.chore_tasks"
            self._attr_unique_id = "chore_manager_tasks"
            self._attr_name = "Zadania domowe (wszyscy)"
            self._attr_icon = "mdi:checkbox-multiple-marked-outline"

    async def async_added_to_hass(self):
        domain_data = self.hass.data.setdefault(DOMAIN, {})
        if self._user_id:
            domain_data.setdefault("todo_entities", {})[self._user_id] = self
        else:
            domain_data["todo_entity"] = self

    @property
    def name(self):
        """Dla listy osobistej nazwa czytana na żywo z magazynu, żeby zmiana
        imienia w panelu była widoczna od razu (bez ponownego tworzenia encji)."""
        if not self._user_id:
            return self._attr_name
        if not self.hass:
            return f"Zadania — {self._initial_name}"
        user = _find_user(self.hass, self._user_id)
        return f"Zadania — {user.get('name', self._initial_name)}"

    @property
    def todo_items(self):
        data = _stored_data(self.hass) if self.hass else {}
        items = []
        for occ_id, occ in data.get("occurrences", {}).items():
            if occ.get("status") not in ("open", "awaiting_award"):
                continue
            if self._user_id and occ.get("person") != self._user_id:
                continue
            due = None
            if occ.get("due"):
                try:
                    due = date.fromisoformat(occ["due"])
                except ValueError:
                    due = None
            items.append(TodoItem(
                uid=occ_id,
                summary=_occurrence_summary(data, occ, include_person=self._user_id is None),
                status=TodoItemStatus.COMPLETED if occ.get("status") == "awaiting_award" else TodoItemStatus.NEEDS_ACTION,
                due=due,
                description=_occurrence_description(data, occ),
            ))
        return items

    @property
    def extra_state_attributes(self):
        """Zachowane WYŁĄCZNIE na liście zbiorczej dla kompatybilności z kartą
        Lovelace (chore-manager-card.js), która czyta CAŁY katalog zadań
        z atrybutu (niezależnie od wystąpień)."""
        if self._user_id:
            return {}
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
        await _create_adhoc_occurrence(self.hass, item.summary, person=self._user_id)

    async def async_update_todo_item(self, item: TodoItem) -> None:
        data = _stored_data(self.hass)
        occ = data.get("occurrences", {}).get(item.uid)
        if not occ:
            return
        current_status = TodoItemStatus.COMPLETED if occ.get("status") == "awaiting_award" else TodoItemStatus.NEEDS_ACTION

        if occ.get("adhoc"):
            if item.status == TodoItemStatus.COMPLETED:
                await _delete_occurrence(self.hass, item.uid)
                return
            if item.summary is not None:
                occ["summary"] = item.summary
                await self._persist_and_refresh()
            return

        if item.status == TodoItemStatus.COMPLETED and current_status != TodoItemStatus.COMPLETED:
            await _complete_occurrence(self.hass, item.uid)
        elif item.status == TodoItemStatus.NEEDS_ACTION and current_status == TodoItemStatus.COMPLETED:
            await _uncomplete_occurrence(self.hass, item.uid)

    async def async_delete_todo_items(self, uids: list) -> None:
        for uid in uids:
            await _delete_occurrence(self.hass, uid)

    async def _persist_and_refresh(self) -> None:
        domain_data = self.hass.data.get(DOMAIN, {})
        store = domain_data.get("store")
        if store and "data" in domain_data:
            await store.async_save(domain_data["data"])
        self.async_write_ha_state()


class ChorePendingApprovalTodoEntity(TodoListEntity):
    """Jedna wspólna lista wystąpień czekających na akceptację rodzica -
    kolejka przeglądu, celowo NIE rozbita per dziecko. Odhaczenie tutaj =
    zatwierdzenie (nalicza punkty); usunięcie = odrzucenie (wraca na osobistą
    listę aktywną tej osoby, NIGDY nie znika)."""

    _attr_name = "Do zatwierdzenia"
    _attr_unique_id = "chore_manager_pending_approval_todo"
    _attr_icon = "mdi:clipboard-check-outline"
    _attr_supported_features = (
        TodoListEntityFeature.UPDATE_TODO_ITEM | TodoListEntityFeature.DELETE_TODO_ITEM
    )

    def __init__(self):
        self.entity_id = "todo.chore_pending_approval"

    async def async_added_to_hass(self):
        self.hass.data.setdefault(DOMAIN, {})["pending_todo_entity"] = self

    @property
    def todo_items(self):
        data = _stored_data(self.hass) if self.hass else {}
        items = []
        for occ_id, occ in data.get("occurrences", {}).items():
            if occ.get("status") != "pending_approval":
                continue
            items.append(TodoItem(
                uid=occ_id,
                summary=_occurrence_summary(data, occ, include_person=True),
                status=TodoItemStatus.NEEDS_ACTION,
                description=_occurrence_description(data, occ),
            ))
        return items

    async def async_update_todo_item(self, item: TodoItem) -> None:
        if item.status != TodoItemStatus.COMPLETED:
            return
        data = _stored_data(self.hass)
        occ = data.get("occurrences", {}).get(item.uid)
        if not occ:
            return
        task, user = _task_and_user(data, occ)
        if not task or not user:
            return
        await self.hass.services.async_call(
            DOMAIN, SERVICE_APPROVE_TASK,
            {"user": user.get("haEntityId"), "task_id": occ.get("task_id"), "points": task.get("points", 0)},
            blocking=True,
        )

    async def async_delete_todo_items(self, uids: list) -> None:
        data = _stored_data(self.hass)
        for uid in uids:
            occ = data.get("occurrences", {}).get(uid)
            if not occ:
                continue
            task, user = _task_and_user(data, occ)
            if not task or not user:
                continue
            await self.hass.services.async_call(
                DOMAIN, SERVICE_REJECT_TASK,
                {"user": user.get("haEntityId"), "task_id": occ.get("task_id"), "reason": "Odrzucono z listy"},
                blocking=True,
            )
