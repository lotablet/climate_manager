"""Number entities for Climate Manager."""

import logging
import re
from homeassistant.components.number import NumberEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.entity_registry import async_get as async_get_entity_registry

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up timer on notification number entity from config entry."""
    coordinator = hass.data[DOMAIN][config_entry.entry_id]["coordinator"]
    
    entities = [
        ClimateManagerTimerOnNotificationNumber(coordinator),
    ]
    
    async_add_entities(entities)
    
    # Forza l'abilitazione delle entità nel registry se sono disabilitate
    entity_registry = async_get_entity_registry(hass)
    
    for entity in entities:
        if hasattr(entity, 'entity_id') and entity.entity_id:
            registry_entry = entity_registry.async_get(entity.entity_id)
            if registry_entry and registry_entry.disabled_by == "config_entry":
                entity_registry.async_update_entity(
                    entity.entity_id, disabled_by=None
                )


class ClimateManagerTimerOnNotificationNumber(NumberEntity):
    """Number entity for timer on notification minutes."""

    def __init__(self, coordinator):
        """Initialize the number entity."""
        self._coordinator = coordinator
        self._coordinator.register_name_change_callback(self._update_name)
        
        name = self._coordinator.current_name
        name_slug = re.sub(r'[^\w]', '_', str(name).lower())
        name_slug = re.sub(r'_+', '_', name_slug).strip('_')
        
        self._attr_unique_id = f"climate_manager_timer_on_notification_{name_slug}"
        self.entity_id = f"number.climate_manager_timer_on_notification_{name_slug}"
        self._attr_has_entity_name = False
        self._attr_entity_registry_enabled_default = True

    @property
    def name(self):
        """Return the name of the number entity."""
        # Ottieni la lingua configurata
        lang = (self._coordinator.options.get("lingua") or 
               self._coordinator.config.get("lingua", "it"))
        
        # Traduzioni per il nome dell'entità
        if lang == "it":
            entity_name = "Timer Accensione Notifica"
        else:
            entity_name = "Timer On Notification"
        
        return f"climate_manager_{entity_name} {self._coordinator.current_name}"

    @property
    def device_info(self):
        """Return device information."""
        return {
            "identifiers": {("climate_manager", self._coordinator.entry_id)},
            "name": f"Climate Manager {self._coordinator.current_name}",
            "manufacturer": "Climate Manager",
            "model": "Climate Automation",
            "sw_version": "1.0",
        }

    @property
    def native_value(self):
        """Return the current value."""
        return self._coordinator.get_option("timer_on_notification_minutes", 0)

    @property
    def native_min_value(self):
        """Return the minimum value."""
        return 0

    @property
    def native_max_value(self):
        """Return the maximum value."""
        return 720  # 6 ore

    @property
    def native_step(self):
        """Return the step value."""
        return 1

    @property
    def native_unit_of_measurement(self):
        """Return the unit of measurement."""
        return "min"

    @property
    def icon(self):
        """Return the icon for the number entity."""
        return "mdi:clock-alert"

    async def async_set_native_value(self, value: float) -> None:
        """Set the value."""
        # Salva il valore persistentemente nel config entry
        import copy
        
        # Aggiorna le opzioni locali
        self._coordinator._update_options_safely({"timer_on_notification_minutes": int(value)})
        
        # Salva persistentemente nel config entry
        entry = self.hass.config_entries.async_get_entry(self._coordinator.entry_id)
        if entry:
            new_options = copy.deepcopy(dict(entry.options))
            new_options["timer_on_notification_minutes"] = int(value)
            
            self.hass.config_entries.async_update_entry(
                entry, options=new_options
            )
        
        self.async_write_ha_state()

    async def _update_name(self):
        """Update entity name when coordinator name changes."""
        self.async_write_ha_state() 