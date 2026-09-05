"""Przepływ konfiguracji UI dla integracji Chore Manager."""
from __future__ import annotations
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from .const import DOMAIN, NAME

class ChoreManagerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Obsługa przepływu konfiguracji dla Chore Manager."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Pierwszy krok konfiguracji integracji z poziomu UI."""
        errors = {}

        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            return self.async_create_entry(title=NAME, data=user_input)

        schema = vol.Schema({
            vol.Optional("default_approval", default=True): bool,
        })

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors,
            description_placeholders={"name": NAME}
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return ChoreManagerOptionsFlow(config_entry)


class ChoreManagerOptionsFlow(config_entries.OptionsFlow):
    """Obsługa opcji integracji."""

    def __init__(self, config_entry):
        self.config_entry = config_entry

    async def async_step_init(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        schema = vol.Schema({
            vol.Optional(
                "default_approval",
                default=self.config_entry.options.get("default_approval", True)
            ): bool,
        })

        return self.async_show_form(step_id="init", data_schema=schema)
