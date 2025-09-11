"""Select entities for Climate Manager."""

import logging
import re
from homeassistant.components.select import SelectEntity
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
    """Set up timer off selector entities from config entry."""
    coordinator = hass.data[DOMAIN][config_entry.entry_id]["coordinator"]
    
    entities = [
        ClimateManagerTimerOffHvacModeSelect(coordinator),
        ClimateManagerTimerOffFanModeSelect(coordinator),
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


class ClimateManagerTimerOffHvacModeSelect(SelectEntity):
    """Select entity for timer off HVAC mode."""

    def __init__(self, coordinator):
        """Initialize the selector."""
        self._coordinator = coordinator
        self._coordinator.register_name_change_callback(self._update_name)
        
        name = self._coordinator.current_name
        name_slug = re.sub(r'[^\w]', '_', str(name).lower())
        name_slug = re.sub(r'_+', '_', name_slug).strip('_')
        
        self._attr_unique_id = f"climate_manager_timer_off_hvac_mode_{name_slug}"
        self.entity_id = f"select.climate_manager_timer_off_hvac_mode_{name_slug}"
        self._attr_has_entity_name = False
        self._attr_entity_registry_enabled_default = True

    @property
    def name(self):
        """Return the name of the select."""
        # Ottieni la lingua configurata
        lang = (self._coordinator.options.get("lingua") or 
               self._coordinator.config.get("lingua", "it"))
        
        # Traduzioni per il nome dell'entità
        if lang == "it":
            entity_name = "Timer Spegnimento Modalità HVAC"
        else:
            entity_name = "Timer Off HVAC Mode"
        
        return f"climate_manager_{entity_name} {self._coordinator.current_name}"

    @property
    def device_info(self):
        """Return device information."""
        return {
            "identifiers": {(DOMAIN, self._coordinator.entry_id)},
            "name": f"Climate Manager {self._coordinator.current_name}",
            "manufacturer": "Climate Manager",
            "model": "Climate Automation",
            "sw_version": "1.0",
        }

    @property
    def current_option(self):
        """Return the current selected option."""
        return self._coordinator.get_option("timer_off_hvac_mode_selector", "off")

    @property
    def options(self):
        """Return the list of available options."""
        # Ottieni le modalità disponibili dal climate entity
        climate_state = self._coordinator.hass.states.get(self._coordinator.climate_entity)
        if not climate_state:
            return ["off"]
        
        available_hvac_modes = climate_state.attributes.get("hvac_modes", ["off"])
        
        # Assicurati che "off" sia sempre la prima opzione
        if "off" not in available_hvac_modes:
            available_hvac_modes = ["off"] + available_hvac_modes
        else:
            # Rimuovi "off" e rimettilo all'inizio
            available_hvac_modes = [mode for mode in available_hvac_modes if mode != "off"]
            available_hvac_modes = ["off"] + available_hvac_modes
            
        return available_hvac_modes

    @property
    def icon(self):
        """Return the icon for the select."""
        return "mdi:hvac"

    async def async_select_option(self, option: str) -> None:
        """Change the selected option."""
        # Salva il valore persistentemente nel config entry
        import copy
        
        # Aggiorna le opzioni locali
        self._coordinator._update_options_safely({"timer_off_hvac_mode_selector": option})
        
        # Salva persistentemente nel config entry
        entry = self._coordinator.hass.config_entries.async_get_entry(self._coordinator.entry_id)
        if entry:
            new_options = copy.deepcopy(dict(entry.options))
            new_options["timer_off_hvac_mode_selector"] = option
            
            self._coordinator.hass.config_entries.async_update_entry(
                entry, options=new_options
            )
        
        self.async_write_ha_state()

    async def _update_name(self):
        """Update entity name when coordinator name changes."""
        self.async_write_ha_state()


class ClimateManagerTimerOffFanModeSelect(SelectEntity):
    """Select entity for timer off fan mode."""

    def __init__(self, coordinator):
        """Initialize the selector."""
        self._coordinator = coordinator
        self._coordinator.register_name_change_callback(self._update_name)
        
        name = self._coordinator.current_name
        name_slug = re.sub(r'[^\w]', '_', str(name).lower())
        name_slug = re.sub(r'_+', '_', name_slug).strip('_')
        
        self._attr_unique_id = f"climate_manager_timer_off_fan_mode_{name_slug}"
        self.entity_id = f"select.climate_manager_timer_off_fan_mode_{name_slug}"
        self._attr_has_entity_name = False
        self._attr_entity_registry_enabled_default = True

    @property
    def name(self):
        """Return the name of the select."""
        # Ottieni la lingua configurata
        lang = (self._coordinator.options.get("lingua") or 
               self._coordinator.config.get("lingua", "it"))
        
        # Traduzioni per il nome dell'entità
        if lang == "it":
            entity_name = "Timer Spegnimento Modalità Ventola"
        else:
            entity_name = "Timer Off Fan Mode"
        
        return f"climate_manager_{entity_name} {self._coordinator.current_name}"

    @property
    def device_info(self):
        """Return device information."""
        return {
            "identifiers": {(DOMAIN, self._coordinator.entry_id)},
            "name": f"Climate Manager {self._coordinator.current_name}",
            "manufacturer": "Climate Manager",
            "model": "Climate Automation",
            "sw_version": "1.0",
        }

    @property
    def current_option(self):
        """Return the current selected option."""
        return self._coordinator.get_option("timer_off_fan_mode_selector", "auto")

    @property
    def options(self):
        """Return the list of available options."""
        # Ottieni le modalità fan disponibili dal climate entity
        climate_state = self._coordinator.hass.states.get(self._coordinator.climate_entity)
        if not climate_state:
            return ["auto"]
        
        available_fan_modes = climate_state.attributes.get("fan_modes", ["auto"])
        
        # Assicurati che "auto" sia sempre la prima opzione
        if "auto" not in available_fan_modes:
            available_fan_modes = ["auto"] + available_fan_modes
        else:
            # Rimuovi "auto" e rimettilo all'inizio
            available_fan_modes = [mode for mode in available_fan_modes if mode != "auto"]
            available_fan_modes = ["auto"] + available_fan_modes
            
        return available_fan_modes

    @property
    def icon(self):
        """Return the icon for the select."""
        return "mdi:fan"

    async def async_select_option(self, option: str) -> None:
        """Change the selected option."""
        # Salva il valore persistentemente nel config entry
        import copy
        
        # Aggiorna le opzioni locali
        self._coordinator._update_options_safely({"timer_off_fan_mode_selector": option})
        
        # Salva persistentemente nel config entry
        entry = self._coordinator.hass.config_entries.async_get_entry(self._coordinator.entry_id)
        if entry:
            new_options = copy.deepcopy(dict(entry.options))
            new_options["timer_off_fan_mode_selector"] = option
            
            self._coordinator.hass.config_entries.async_update_entry(
                entry, options=new_options
            )
        
        self.async_write_ha_state()

    async def _update_name(self):
        """Update entity name when coordinator name changes."""
        self.async_write_ha_state() 