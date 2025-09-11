from homeassistant.components.switch import SwitchEntity
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from .const import DOMAIN
import logging
import asyncio
_LOGGER = logging.getLogger(__name__)

SWITCH_ENTITY_ID = "switch.climate_manager_automation_enable"

class ClimateManagerAutomationSwitch(SwitchEntity, RestoreEntity):
    def __init__(self, hass, coordinator):
        self._hass = hass
        self._coordinator = coordinator
        self._is_on = True
        
        # Entity ID fisso basato sul nome corrente (non deve mai cambiare!)
        name = coordinator.current_name
        # Pulizia più robusta del nome per entity_id
        import re
        name_slug = re.sub(r'[^\w]', '_', str(name).lower())
        name_slug = re.sub(r'_+', '_', name_slug).strip('_')
        self.entity_id = f"switch.climate_manager_automation_enable_{name_slug}"
        
        # Unique ID fisso per raggruppare con le altre entità
        self._attr_unique_id = f"climate_manager_{coordinator.entry_id}_automation_switch"
        # Registra callback per aggiornamento nome (solo il friendly name, non l'entity_id)
        coordinator.register_name_change_callback(self._update_name)

    @property
    def name(self):
        """Nome dinamico basato sulla configurazione corrente"""
        name = self._coordinator.current_name
        # Ottieni la lingua configurata
        lang = (self._coordinator.options.get("lingua") or 
               self._coordinator.config.get("lingua", "it"))
        
        # Traduzioni per il nome dell'entità
        if lang == "it":
            entity_name = "Automazione"
        else:
            entity_name = "Automation"
        
        return f"climate_manager_{entity_name} {name}"

    @property
    def device_info(self):
        name = self._coordinator.current_name
        return {
            "identifiers": {(DOMAIN, self._coordinator.entry_id)},
            "name": f"Climate Manager {name}",
            "manufacturer": "Climate Manager",
            "model": "Climate Automation",
            "sw_version": "1.0",
        }

    @property
    def is_on(self):
        return self._is_on

    async def async_turn_on(self, **kwargs):
        self._is_on = True
        self.async_write_ha_state()
        self._coordinator.automation_enabled = True
        self._coordinator._automation_disabled_manually = False  # Reset flag disabilitazione manuale
        # Notifica immediatamente il sensore di stato automazione
        self._coordinator._notify_automation_status_callbacks()

    async def async_turn_off(self, **kwargs):
        self._is_on = False
        self.async_write_ha_state()
        self._coordinator.automation_enabled = False
        self._coordinator._automation_disabled_manually = True  # Flag per disabilitazione manuale
        # Notifica immediatamente il sensore di stato automazione
        self._coordinator._notify_automation_status_callbacks()

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        state = await self.async_get_last_state()
        if state is not None:
            self._is_on = state.state == "on"
            self._coordinator.automation_enabled = self._is_on
            # Notifica immediatamente il sensore di stato automazione
            self._coordinator._notify_automation_status_callbacks()

    async def _update_name(self):
        """Aggiorna il nome dell'entità quando cambia la configurazione"""
        self.async_write_ha_state()

    @property
    def unique_id(self):
        return self._attr_unique_id


class ClimateManagerTimerOnSwitch(SwitchEntity, RestoreEntity):
    def __init__(self, hass, coordinator):
        self._hass = hass
        self._coordinator = coordinator
        self._is_on = False
        self._timer_task = None
        
        # Entity ID fisso
        name = coordinator.current_name
        import re
        name_slug = re.sub(r'[^\w]', '_', str(name).lower())
        name_slug = re.sub(r'_+', '_', name_slug).strip('_')
        self.entity_id = f"switch.climate_manager_timer_on_{name_slug}"
        
        self._attr_unique_id = f"climate_manager_{coordinator.entry_id}_timer_on_switch"
        coordinator.register_name_change_callback(self._update_name)

    @property
    def name(self):
        name = self._coordinator.current_name
        # Ottieni la lingua configurata
        lang = (self._coordinator.options.get("lingua") or 
               self._coordinator.config.get("lingua", "it"))
        
        # Traduzioni per il nome dell'entità
        if lang == "it":
            entity_name = "Timer Accensione"
        else:
            entity_name = "Turn-on Timer"
        
        return f"climate_manager_{entity_name} {name}"

    @property
    def device_info(self):
        name = self._coordinator.current_name
        return {
            "identifiers": {(DOMAIN, self._coordinator.entry_id)},
            "name": f"Climate Manager {name}",
            "manufacturer": "Climate Manager",
            "model": "Climate Automation",
            "sw_version": "1.0",
        }

    @property
    def is_on(self):
        return self._is_on

    @property
    def extra_state_attributes(self):
        minutes = self._coordinator.get_option("timer_on_minutes", 10)
        attrs = {
            "timer_minutes": minutes,
            "timer_running": self._is_on
        }
        
        # Leggi dal sensore countdown se disponibile
        timer_sensor = self._find_timer_sensor()
        if timer_sensor:
            attrs["remaining_seconds"] = getattr(timer_sensor, '_remaining_seconds', 0)
            attrs["countdown_state"] = getattr(timer_sensor, 'state', '00:00:00')
        
        return attrs

    async def async_turn_on(self, **kwargs):
        if self._is_on:  # Timer già attivo
            return
            
        self._is_on = True
        minutes = self._coordinator.get_option("timer_on_minutes", 10)
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Timer ON switch attivato per {minutes} minuti")
        
        # Trova e avvia il sensore countdown timer (con retry)
        timer_sensor = None
        for attempt in range(5):  # Prova 5 volte
            timer_sensor = self._find_timer_sensor()
            if timer_sensor:
                break
            logger.warning(f"Tentativo {attempt + 1}/5: sensore timer non trovato, riprovo...")
            await asyncio.sleep(0.5)  # Aspetta 500ms
        
        if timer_sensor:
            if hasattr(timer_sensor, 'start_timer'):
                logger.info(f"Avvio timer sensor: {timer_sensor.entity_id}")
                await timer_sensor.start_timer(minutes)
            else:
                logger.error(f"Sensore trovato ma senza metodo start_timer: {timer_sensor}")
        else:
            logger.error("Nessun sensore timer trovato dopo 5 tentativi!")
        
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs):
        if not self._is_on:
            return
            
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Timer ON switch spento manualmente per {self._coordinator.current_name}")
            
        self._is_on = False
        
        # Ferma il sensore countdown timer
        timer_sensor = self._find_timer_sensor()
        if timer_sensor and hasattr(timer_sensor, 'stop_timer'):
            logger.info(f"Fermando timer sensor ON: {timer_sensor.entity_id}")
            await timer_sensor.stop_timer()
        else:
            logger.warning(f"Timer sensor ON non trovato o senza metodo stop_timer")
            
        self.async_write_ha_state()

    def _find_timer_sensor(self):
        """Trova il sensore countdown timer associato"""
        try:
            # Metodo diretto: cerca il sensore con unique_id corrispondente
            expected_unique_id = f"climate_manager_{self._coordinator.entry_id}_timer_on_countdown"
            
            # Cerca nelle entità sensor salvate
            entry_data = self._hass.data.get("climate_manager", {}).get(self._coordinator.entry_id, {})
            entities_data = entry_data.get("entities", {})
            sensor_entities = entities_data.get("sensor", [])
            
            for entity in sensor_entities:
                if (hasattr(entity, '_attr_unique_id') and 
                    entity._attr_unique_id == expected_unique_id):
                    return entity
            
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Errore ricerca timer sensor ON: {e}")
        return None

    async def _update_name(self):
        self.async_write_ha_state()

    @property
    def unique_id(self):
        return self._attr_unique_id


class ClimateManagerTimerOffSwitch(SwitchEntity, RestoreEntity):
    def __init__(self, hass, coordinator):
        self._hass = hass
        self._coordinator = coordinator
        self._is_on = False
        self._timer_task = None
        
        # Entity ID fisso
        name = coordinator.current_name
        import re
        name_slug = re.sub(r'[^\w]', '_', str(name).lower())
        name_slug = re.sub(r'_+', '_', name_slug).strip('_')
        self.entity_id = f"switch.climate_manager_timer_off_{name_slug}"
        
        self._attr_unique_id = f"climate_manager_{coordinator.entry_id}_timer_off_switch"
        coordinator.register_name_change_callback(self._update_name)

    @property
    def name(self):
        name = self._coordinator.current_name
        # Ottieni la lingua configurata
        lang = (self._coordinator.options.get("lingua") or 
               self._coordinator.config.get("lingua", "it"))
        
        # Traduzioni per il nome dell'entità
        if lang == "it":
            entity_name = "Timer Spegnimento"
        else:
            entity_name = "Turn-off Timer"
        
        return f"climate_manager_{entity_name} {name}"

    @property
    def device_info(self):
        name = self._coordinator.current_name
        return {
            "identifiers": {(DOMAIN, self._coordinator.entry_id)},
            "name": f"Climate Manager {name}",
            "manufacturer": "Climate Manager",
            "model": "Climate Automation",
            "sw_version": "1.0",
        }

    @property
    def is_on(self):
        return self._is_on

    @property
    def extra_state_attributes(self):
        minutes = self._coordinator.get_option("timer_off_minutes", 60)
        attrs = {
            "timer_minutes": minutes,
            "timer_running": self._is_on
        }
        
        # Leggi dal sensore countdown se disponibile
        timer_sensor = self._find_timer_sensor()
        if timer_sensor:
            attrs["remaining_seconds"] = getattr(timer_sensor, '_remaining_seconds', 0)
            attrs["countdown_state"] = getattr(timer_sensor, 'state', '00:00:00')
        
        return attrs

    async def async_turn_on(self, **kwargs):
        if self._is_on:  # Timer già attivo
            return
            
        self._is_on = True
        minutes = self._coordinator.get_option("timer_off_minutes", 60)
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Timer OFF switch attivato per {minutes} minuti")
        
        # Trova e avvia il sensore countdown timer (con retry)
        timer_sensor = None
        for attempt in range(5):  # Prova 5 volte
            timer_sensor = self._find_timer_sensor()
            if timer_sensor:
                break
            logger.warning(f"Tentativo {attempt + 1}/5: sensore timer non trovato, riprovo...")
            await asyncio.sleep(0.5)  # Aspetta 500ms
        
        if timer_sensor:
            if hasattr(timer_sensor, 'start_timer'):
                logger.info(f"Avvio timer sensor: {timer_sensor.entity_id}")
                await timer_sensor.start_timer(minutes)
            else:
                logger.error(f"Sensore trovato ma senza metodo start_timer: {timer_sensor}")
        else:
            logger.error("Nessun sensore timer trovato dopo 5 tentativi!")
        
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs):
        if not self._is_on:
            return
            
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Timer OFF switch spento manualmente per {self._coordinator.current_name}")
            
        self._is_on = False
        
        # Ferma il sensore countdown timer
        timer_sensor = self._find_timer_sensor()
        if timer_sensor and hasattr(timer_sensor, 'stop_timer'):
            logger.info(f"Fermando timer sensor OFF: {timer_sensor.entity_id}")
            await timer_sensor.stop_timer()
        else:
            logger.warning(f"Timer sensor OFF non trovato o senza metodo stop_timer")
            
        self.async_write_ha_state()

    def _find_timer_sensor(self):
        """Trova il sensore countdown timer associato"""
        try:
            # Metodo diretto: cerca il sensore con unique_id corrispondente
            expected_unique_id = f"climate_manager_{self._coordinator.entry_id}_timer_off_countdown"
            
            # Cerca nelle entità sensor salvate
            entry_data = self._hass.data.get("climate_manager", {}).get(self._coordinator.entry_id, {})
            entities_data = entry_data.get("entities", {})
            sensor_entities = entities_data.get("sensor", [])
            
            for entity in sensor_entities:
                if (hasattr(entity, '_attr_unique_id') and 
                    entity._attr_unique_id == expected_unique_id):
                    return entity
            
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Errore ricerca timer sensor OFF: {e}")
        return None

    async def _update_name(self):
        self.async_write_ha_state()

    @property
    def unique_id(self):
        return self._attr_unique_id


class ClimateManagerLockSettingsSwitch(SwitchEntity, RestoreEntity):
    def __init__(self, hass, coordinator):
        self._hass = hass
        self._coordinator = coordinator
        self._is_on = False
        
        # Entity ID fisso
        name = coordinator.current_name
        import re
        name_slug = re.sub(r'[^\w]', '_', str(name).lower())
        name_slug = re.sub(r'_+', '_', name_slug).strip('_')
        self.entity_id = f"switch.climate_manager_lock_settings_{name_slug}"
        
        self._attr_unique_id = f"climate_manager_{coordinator.entry_id}_lock_settings_switch"
        coordinator.register_name_change_callback(self._update_name)

    @property
    def name(self):
        name = self._coordinator.current_name
        # Ottieni la lingua configurata
        lang = (self._coordinator.options.get("lingua") or 
               self._coordinator.config.get("lingua", "it"))
        
        # Traduzioni per il nome dell'entità
        if lang == "it":
            entity_name = "Blocco Impostazioni"
        else:
            entity_name = "Lock Settings"
        
        return f"climate_manager_{entity_name} {name}"

    @property
    def device_info(self):
        name = self._coordinator.current_name
        return {
            "identifiers": {(DOMAIN, self._coordinator.entry_id)},
            "name": f"Climate Manager {name}",
            "manufacturer": "Climate Manager",
            "model": "Climate Automation",
            "sw_version": "1.0",
        }

    @property
    def is_on(self):
        return self._is_on

    @property
    def icon(self):
        return "mdi:lock" if self._is_on else "mdi:lock-open-variant"

    @property
    def extra_state_attributes(self):
        return {
            "description": "Blocca le impostazioni del clima nella configurazione corrente",
            "lock_settings_enabled": self._is_on,
            "protected_settings": "hvac_mode, temperature, fan_mode"
        }

    async def async_turn_on(self, **kwargs):
        self._is_on = True
        self.async_write_ha_state()
        
        # Notifica al coordinator che le impostazioni sono bloccate
        self._coordinator._settings_locked = True
        
        # Forza immediatamente le impostazioni configurate
        await self._coordinator._enforce_locked_settings()

    async def async_turn_off(self, **kwargs):
        self._is_on = False
        self.async_write_ha_state()
        
        # Notifica al coordinator che le impostazioni sono sbloccate
        self._coordinator._settings_locked = False
        
        # Reset impostazioni override quando blocco si disattiva
        self._coordinator.clear_locked_settings_override()

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        state = await self.async_get_last_state()
        if state is not None:
            self._is_on = state.state == "on"
            # Sincronizza lo stato con il coordinator
            self._coordinator._settings_locked = self._is_on

    async def _update_name(self):
        self.async_write_ha_state()

    @property
    def unique_id(self):
        return self._attr_unique_id


class ClimateManagerAutoTimerSwitch(SwitchEntity, RestoreEntity):
    def __init__(self, hass, coordinator):
        self._hass = hass
        self._coordinator = coordinator
        self._is_on = False
        
        # Entity ID fisso
        name = coordinator.current_name
        import re
        name_slug = re.sub(r'[^\w]', '_', str(name).lower())
        name_slug = re.sub(r'_+', '_', name_slug).strip('_')
        self.entity_id = f"switch.climate_manager_auto_timer_{name_slug}"
        
        self._attr_unique_id = f"climate_manager_{coordinator.entry_id}_auto_timer_switch"
        coordinator.register_name_change_callback(self._update_name)

    @property
    def name(self):
        name = self._coordinator.current_name
        # Ottieni la lingua configurata
        lang = (self._coordinator.options.get("lingua") or 
               self._coordinator.config.get("lingua", "it"))
        
        # Traduzioni per il nome dell'entità
        if lang == "it":
            entity_name = "Timer Automatico"
        else:
            entity_name = "Automatic Timer"
        
        return f"climate_manager_{entity_name} {name}"

    @property
    def device_info(self):
        name = self._coordinator.current_name
        return {
            "identifiers": {(DOMAIN, self._coordinator.entry_id)},
            "name": f"Climate Manager {name}",
            "manufacturer": "Climate Manager",
            "model": "Climate Automation",
            "sw_version": "1.0",
        }

    @property
    def is_on(self):
        return self._is_on

    @property
    def icon(self):
        return "mdi:timer-cog" if self._is_on else "mdi:timer-cog-outline"

    @property
    def extra_state_attributes(self):
        return {
            "description": "Avvia automaticamente il timer di spegnimento quando si accende il clima",
            "auto_timer_enabled": self._is_on
        }

    async def async_turn_on(self, **kwargs):
        self._is_on = True
        self.async_write_ha_state()
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Auto Timer attivato per {self._coordinator.current_name}")

    async def async_turn_off(self, **kwargs):
        self._is_on = False
        self.async_write_ha_state()
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Auto Timer disattivato per {self._coordinator.current_name}")

    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        state = await self.async_get_last_state()
        if state is not None:
            self._is_on = state.state == "on"

    async def _update_name(self):
        self.async_write_ha_state()

    @property
    def unique_id(self):
        return self._attr_unique_id


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback):
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    switches = [
        ClimateManagerAutomationSwitch(hass, coordinator),
        ClimateManagerTimerOnSwitch(hass, coordinator),
        ClimateManagerTimerOffSwitch(hass, coordinator),
        ClimateManagerAutoTimerSwitch(hass, coordinator),
        ClimateManagerLockSettingsSwitch(hass, coordinator)
    ]
    
    # Salva le entità per accesso da altre piattaforme
    if "entities" not in hass.data[DOMAIN][entry.entry_id]:
        hass.data[DOMAIN][entry.entry_id]["entities"] = {}
    hass.data[DOMAIN][entry.entry_id]["entities"]["switch"] = switches
    
    async_add_entities(switches, True)

# In __init__.py dovrai aggiungere la piattaforma switch e istanziare questo switch passando il coordinator. 