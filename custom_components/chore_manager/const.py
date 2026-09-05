"""Stałe dla integracji KiddosPoints."""

DOMAIN = "chore_manager"
NAME = "KiddosPoints"
VERSION = "1.0.0"

# Konfiguracja i przechowywanie
STORAGE_KEY = "chore_manager_data"
STORAGE_VERSION = 1
CONF_USERS = "users"
CONF_REQUIRE_APPROVAL = "require_approval"

# Nazwy usług (Services)
SERVICE_COMPLETE_TASK = "complete_task"
SERVICE_APPROVE_TASK = "approve_task"
SERVICE_REJECT_TASK = "reject_task"
SERVICE_CLAIM_REWARD = "claim_reward"
SERVICE_ADD_POINTS = "add_points"
SERVICE_RESET_POINTS = "reset_points"

# Nazwy zdarzeń (Events)
EVENT_TASK_COMPLETED = "chore_manager_task_completed"
EVENT_TASK_APPROVED = "chore_manager_task_approved"
EVENT_TASK_REJECTED = "chore_manager_task_rejected"
EVENT_REWARD_CLAIMED = "chore_manager_reward_claimed"

# Domyślne wartości
DEFAULT_TASK_POINTS = 10
DEFAULT_ROLE = "child"
ROLE_ADMIN = "admin"
ROLE_CHILD = "child"
ROLE_MEMBER = "member"
