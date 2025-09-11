"""Sensor platform for Climate Manager integration."""
import asyncio
from homeassistant.helpers.entity import Entity
from homeassistant.core import callback
from . import DOMAIN
from homeassistant.const import UnitOfTemperature
from homeassistant.helpers.event import async_track_time_interval
from datetime import timedelta
from collections import OrderedDict

async def async_setup_entry(hass, config_entry, async_add_entities):
    coordinator = hass.data["climate_manager"][config_entry.entry_id]["coordinator"]
    entities = [
        ClimatePrevStateSensor(coordinator),
        ClimateManagerSettingsSensor(coordinator),
        ClimateManagerTimerOnSensor(coordinator),
        ClimateManagerTimerOffSensor(coordinator),
        ClimateManagerTimerOnNotificationSensor(coordinator),
        ClimateManagerAutomationStatusSensor(coordinator),
    ]
    
    # Salva le entità per accesso da altre piattaforme
    if "entities" not in hass.data["climate_manager"][config_entry.entry_id]:
        hass.data["climate_manager"][config_entry.entry_id]["entities"] = {}
    hass.data["climate_manager"][config_entry.entry_id]["entities"]["sensor"] = entities
    
    async_add_entities(entities)

class ClimatePrevStateSensor(Entity):
    def __init__(self, coordinator):
        self._coordinator = coordinator
        self._attr_unique_id = f"climate_manager_{coordinator.entry_id}_prev_state"
        coordinator.register_prev_state_callback(self._force_update)
        # Registra callback per aggiornamento nome
        coordinator.register_name_change_callback(self._update_name)

    @property
    def name(self):
        name = self._coordinator.current_name
        # Ottieni la lingua configurata
        lang = (self._coordinator.options.get("lingua") or 
               self._coordinator.config.get("lingua", "it"))
        
        # Traduzioni per il nome dell'entità
        if lang == "it":
            entity_name = "Stato Clima Precedente"
        else:
            entity_name = "Previous Climate State"
        
        return f"climate_manager_{entity_name} {name}"

    def _force_update(self):
        self.async_write_ha_state()

    async def _update_name(self):
        """Aggiorna il nome dell'entità quando cambia la configurazione"""
        self.async_write_ha_state()

    @property
    def state(self):
        prev = self._coordinator._climate_prev_state
        if not prev:
            return "waiting"
        return f"{prev.get('hvac_mode','')} {prev.get('temperature','')}"

    @property
    def device_info(self):
        """Raggruppa con le altre entità della stessa config entry."""
        name = self._coordinator.current_name
        return {
            "identifiers": {("climate_manager", self._coordinator.entry_id)},
            "name": f"Climate Manager {name}",
            "manufacturer": "Climate Manager",
            "model": "Climate Automation",
            "sw_version": "1.0",
        }


class ClimateManagerTimerOnSensor(Entity):
    """Sensore per il countdown del timer di accensione"""
    
    def __init__(self, coordinator):
        self._coordinator = coordinator
        self._attr_unique_id = f"climate_manager_{coordinator.entry_id}_timer_on_countdown"
        self._is_running = False
        self._remaining_seconds = 0
        self._total_seconds = 0
        self._timer_task = None
        coordinator.register_name_change_callback(self._update_name)

    @property
    def name(self):
        name = self._coordinator.current_name
        # Ottieni la lingua configurata
        lang = (self._coordinator.options.get("lingua") or 
               self._coordinator.config.get("lingua", "it"))
        
        # Traduzioni per il nome dell'entità
        if lang == "it":
            entity_name = "Timer Accensione Countdown"
        else:
            entity_name = "Turn-on Timer Countdown"
        
        return f"climate_manager_{entity_name} {name}"

    @property
    def state(self):
        if not self._is_running:
            return "00:00:00"
        
        hours = int(self._remaining_seconds // 3600)
        minutes = int((self._remaining_seconds % 3600) // 60)
        seconds = int(self._remaining_seconds % 60)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    @property
    def extra_state_attributes(self):
        return {
            "is_running": self._is_running,
            "remaining_seconds": self._remaining_seconds,
            "total_seconds": self._total_seconds,
            "progress_percent": int((self._remaining_seconds / self._total_seconds) * 100) if self._total_seconds > 0 else 0
        }

    @property
    def icon(self):
        return "mdi:timer-play" if self._is_running else "mdi:timer-off"

    @property
    def device_info(self):
        name = self._coordinator.current_name
        return {
            "identifiers": {("climate_manager", self._coordinator.entry_id)},
            "name": f"Climate Manager {name}",
            "manufacturer": "Climate Manager",
            "model": "Climate Automation",
            "sw_version": "1.0",
        }

    async def start_timer(self, minutes):
        """Avvia il countdown"""
        # CONTROLLO ANTI-DUPLICAZIONE: se già running, ferma il timer precedente prima
        if self._is_running:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"[{self._coordinator.current_name}] Timer ON già attivo, fermo il precedente")
            await self.stop_timer()
            
        # CONTROLLO TASK: se c'è ancora un task attivo, cancellalo
        if self._timer_task and not self._timer_task.done():
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"[{self._coordinator.current_name}] Task timer ON ancora attivo, lo cancello")
            self._timer_task.cancel()
            try:
                await self._timer_task
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.warning(f"[{self._coordinator.current_name}] Errore cancellazione task precedente: {e}")
            
        self._total_seconds = minutes * 60
        self._remaining_seconds = self._total_seconds
        self._is_running = True
        
        # Avvia il task del countdown
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[{self._coordinator.current_name}] Avvio timer ON per {minutes} minuti")
        self._timer_task = asyncio.create_task(self._run_countdown())
        self.async_write_ha_state()

    async def stop_timer(self):
        """Ferma il countdown"""
        if not self._is_running:
            return
            
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[{self._coordinator.current_name}] Timer ON fermato manualmente")
            
        self._is_running = False
        self._remaining_seconds = 0
        
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
            try:
                await self._timer_task
            except asyncio.CancelledError:
                logger.info(f"[{self._coordinator.current_name}] Task timer ON cancellato correttamente")
            
        self.async_write_ha_state()

    async def _run_countdown(self):
        """Esegue il countdown ogni secondo"""
        try:
            while self._remaining_seconds > 0 and self._is_running:
                await asyncio.sleep(1)
                
                # CONTROLLO AGGIUNTIVO: verifica se il timer è stato fermato durante il sleep
                if not self._is_running:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.info(f"[{self._coordinator.current_name}] Timer ON fermato durante countdown, esco")
                    return
                    
                self._remaining_seconds -= 1
                self.async_write_ha_state()
                
            # CONTROLLO TRIPLO prima di eseguire lo spegnimento
            if self._remaining_seconds <= 0 and self._is_running and not self._timer_task.cancelled():
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"[{self._coordinator.current_name}] Timer ON scaduto - Accensione clima")
                
                # Timer scaduto - accendi il clima con la modalità configurata
                try:
                    # Determina la modalità HVAC corretta basata sulla stagione
                    season = await self._coordinator._get_season()
                    
                    if season == "summer":
                        hvac_mode = self._coordinator.get_option("hvac_mode_summer", "cool")
                        temperature = float(self._coordinator.get_option("temperature_summer", 21))
                        fan_mode = self._coordinator.fan_mode_summer
                    elif season == "winter":
                        hvac_mode = self._coordinator.get_option("hvac_mode_winter", "heat")
                        temperature = float(self._coordinator.get_option("temperature_winter", 21))
                        fan_mode = self._coordinator.fan_mode_winter
                    else:
                        # Fallback su impostazioni estate
                        hvac_mode = self._coordinator.get_option("hvac_mode_summer", "cool")
                        temperature = float(self._coordinator.get_option("temperature_summer", 21))
                        fan_mode = self._coordinator.fan_mode_summer
                    
                    # Controlla compatibilità modalità
                    if not self._coordinator._check_hvac_mode_compatibility(hvac_mode):
                        hvac_mode = "cool"  # Fallback
                    
                    if fan_mode and not self._coordinator._check_fan_mode_compatibility(fan_mode):
                        fan_mode = None
                    
                    logger.info(f"[{self._coordinator.current_name}] Timer ON scaduto - Accensione clima: modalità {hvac_mode}, temperatura {temperature}°C, stagione {season}")
                    
                    # Accendi il clima con la modalità corretta
                    await self._coordinator.hass.services.async_call(
                        'climate', 'set_hvac_mode', 
                        {'entity_id': self._coordinator.climate_entity, 'hvac_mode': hvac_mode}
                    )
                    
                    # Imposta temperatura
                    await self._coordinator.hass.services.async_call(
                        'climate', 'set_temperature', 
                        {'entity_id': self._coordinator.climate_entity, 'temperature': temperature}
                    )
                    
                    # Imposta ventola se supportata
                    if fan_mode:
                        await self._coordinator.hass.services.async_call(
                            'climate', 'set_fan_mode', 
                            {'entity_id': self._coordinator.climate_entity, 'fan_mode': fan_mode}
                        )
                        
                except Exception as e:
                    logger.error(f"[{self._coordinator.current_name}] Errore durante accensione clima da timer: {e}")
                
                # Spegni lo switch timer associato
                name = self._coordinator.current_name
                import re
                name_slug = re.sub(r'[^\w]', '_', str(name).lower())
                name_slug = re.sub(r'_+', '_', name_slug).strip('_')
                switch_id = f"switch.climate_manager_timer_on_{name_slug}"
                
                await self._coordinator.hass.services.async_call(
                    'switch', 'turn_off', 
                    {'entity_id': switch_id}
                )
                
                logger.info(f"[{self._coordinator.current_name}] Timer ON completato con successo")
            else:
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"[{self._coordinator.current_name}] Timer ON non eseguito: running={self._is_running}, remaining={self._remaining_seconds}, cancelled={self._timer_task.cancelled() if self._timer_task else 'None'}")
                
            # Ferma il timer in ogni caso
            self._is_running = False
            self.async_write_ha_state()
                
        except asyncio.CancelledError:
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"[{self._coordinator.current_name}] Timer ON cancellato correttamente via CancelledError")
            self._is_running = False
            self.async_write_ha_state()
            raise

    async def _update_name(self):
        self.async_write_ha_state()


class ClimateManagerTimerOffSensor(Entity):
    """Sensore per il countdown del timer di spegnimento"""
    
    def __init__(self, coordinator):
        self._coordinator = coordinator
        self._attr_unique_id = f"climate_manager_{coordinator.entry_id}_timer_off_countdown"
        self._is_running = False
        self._remaining_seconds = 0
        self._total_seconds = 0
        self._timer_task = None
        coordinator.register_name_change_callback(self._update_name)

    @property
    def name(self):
        name = self._coordinator.current_name
        # Ottieni la lingua configurata
        lang = (self._coordinator.options.get("lingua") or 
               self._coordinator.config.get("lingua", "it"))
        
        # Traduzioni per il nome dell'entità
        if lang == "it":
            entity_name = "Timer Spegnimento Countdown"
        else:
            entity_name = "Turn-off Timer Countdown"
        
        return f"climate_manager_{entity_name} {name}"

    @property
    def state(self):
        if not self._is_running:
            return "00:00:00"
        
        hours = int(self._remaining_seconds // 3600)
        minutes = int((self._remaining_seconds % 3600) // 60)
        seconds = int(self._remaining_seconds % 60)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    @property
    def extra_state_attributes(self):
        return {
            "is_running": self._is_running,
            "remaining_seconds": self._remaining_seconds,
            "total_seconds": self._total_seconds,
            "progress_percent": int((self._remaining_seconds / self._total_seconds) * 100) if self._total_seconds > 0 else 0
        }

    @property
    def icon(self):
        return "mdi:timer-off" if self._is_running else "mdi:timer"

    @property
    def device_info(self):
        name = self._coordinator.current_name
        return {
            "identifiers": {("climate_manager", self._coordinator.entry_id)},
            "name": f"Climate Manager {name}",
            "manufacturer": "Climate Manager",
            "model": "Climate Automation",
            "sw_version": "1.0",
        }

    async def start_timer(self, minutes):
        """Avvia il countdown"""
        # CONTROLLO ANTI-DUPLICAZIONE: se già running, ferma il timer precedente prima
        if self._is_running:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"[{self._coordinator.current_name}] Timer OFF già attivo, ferma il precedente")
            await self.stop_timer()
            
        # CONTROLLO TASK: se c'è ancora un task attivo, cancellalo
        if self._timer_task and not self._timer_task.done():
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"[{self._coordinator.current_name}] Task timer OFF ancora attivo, lo cancello")
            self._timer_task.cancel()
            try:
                await self._timer_task
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.warning(f"[{self._coordinator.current_name}] Errore cancellazione task precedente: {e}")
            
        self._total_seconds = minutes * 60
        self._remaining_seconds = self._total_seconds
        self._is_running = True
        
        # Avvia il task del countdown
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[{self._coordinator.current_name}] Avvio timer OFF per {minutes} minuti")
        self._timer_task = asyncio.create_task(self._run_countdown())
        self.async_write_ha_state()

    async def stop_timer(self):
        """Ferma il countdown"""
        if not self._is_running:
            return
            
        import logging
        logger = logging.getLogger(__name__)
        
        # Log per debug: chi ha chiamato stop_timer
        import traceback
        stack = traceback.format_stack()
        logger.info(f"[{self._coordinator.current_name}] Timer OFF fermato manualmente - chiamato da: {stack[-2].strip()}")
            
        # FERMA IMMEDIATAMENTE il timer
        self._is_running = False
        self._remaining_seconds = 0
        
        # Cancella il task PRIMA di fare altro per evitare race conditions
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
        
        # Reset impostazioni override quando timer si ferma
        self._coordinator.clear_locked_settings_override()
        
        # RIPRISTINA LE IMPOSTAZIONI GLOBALI quando timer si ferma
        await self._restore_global_settings()
        
        # Aspetta che il task sia effettivamente cancellato
        if self._timer_task and not self._timer_task.done():
            try:
                await self._timer_task
            except asyncio.CancelledError:
                logger.info(f"[{self._coordinator.current_name}] Task timer OFF cancellato correttamente")
            except Exception as e:
                logger.warning(f"[{self._coordinator.current_name}] Errore cancellazione task timer OFF: {e}")
            
        # Forza aggiornamento stato
        self.async_write_ha_state()
        
        logger.info(f"[{self._coordinator.current_name}] Timer OFF completamente fermato")

    async def _run_countdown(self):
        """Esegue il countdown ogni secondo"""
        try:
            while self._remaining_seconds > 0 and self._is_running:
                await asyncio.sleep(1)
                
                # CONTROLLO AGGIUNTIVO: verifica se il timer è stato fermato durante il sleep
                if not self._is_running:
                    return
                
                # CONTROLLO CRITICO: verifica se il clima è ancora acceso E se è spegnimento manuale
                climate_state = self._coordinator.hass.states.get(self._coordinator.climate_entity)
                if not climate_state or climate_state.state == "off":
                    # Il timer si ferma SOLO se è spegnimento manuale (NON per automazioni finestre)
                    # Controlla se ci sono timer finestre attivi o se è spegnimento interno
                    window_timers_active = (
                        hasattr(self._coordinator, '_window_timer') and self._coordinator._window_timer or
                        hasattr(self._coordinator, '_window_off_timer') and self._coordinator._window_off_timer or
                        hasattr(self._coordinator, '_window_on_timer') and self._coordinator._window_on_timer or
                        self._coordinator._window_open or
                        self._coordinator._restore_in_progress or
                        self._coordinator._internal_shutdown
                    )
                    
                    if not window_timers_active:
                        # Nessuna automazione finestre attiva: spegnimento manuale
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.info(f"[{self._coordinator.current_name}] Timer OFF fermato: clima spento manualmente")
                        self._is_running = False
                        self._remaining_seconds = 0
                        if self._timer_task and not self._timer_task.done():
                            self._timer_task.cancel()
                        self.async_write_ha_state()
                        return
                    # Se ci sono automazioni finestre attive, continua il timer normalmente
                
                # CONTROLLO AGGIUNTIVO: verifica se il timer switch è stato spento manualmente
                name = self._coordinator.current_name
                import re
                name_slug = re.sub(r'[^\w]', '_', str(name).lower())
                name_slug = re.sub(r'_+', '_', name_slug).strip('_')
                switch_id = f"switch.climate_manager_timer_off_{name_slug}"
                
                switch_state = self._coordinator.hass.states.get(switch_id)
                if not switch_state or switch_state.state == "off":
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.info(f"[{self._coordinator.current_name}] Timer OFF fermato: switch timer disattivato")
                    self._is_running = False
                    self._remaining_seconds = 0
                    if self._timer_task and not self._timer_task.done():
                        self._timer_task.cancel()
                    self.async_write_ha_state()
                    return
                    
                self._remaining_seconds -= 1
                self.async_write_ha_state()
                
            # CONTROLLO TRIPLO prima di eseguire l'azione
            if self._remaining_seconds <= 0 and self._is_running and not self._timer_task.cancelled():
                
                # CONTROLLO CRITICO: verifica se fermato prima di qualsiasi azione
                if not self._is_running:
                    return
                
                # Ottieni la modalità configurata per il timer di spegnimento dai selector
                timer_off_mode = self._coordinator.get_option("timer_off_hvac_mode_selector", "off")
                
                # CONTROLLO CRITICO: verifica di nuovo dopo aver ottenuto le opzioni
                if not self._is_running:
                    return
                
                # Imposta flag per indicare che è un'azione interna
                self._coordinator._internal_shutdown = True
                
                # IMPORTANTE: Imposta flag per evitare conflitti con blocco impostazioni
                self._coordinator._timer_in_action = True
                
                try:
                    # CONTROLLO CRITICO: verifica prima di ogni chiamata di servizio
                    if not self._is_running:
                        return
                        
                    if timer_off_mode == "off":
                        # Modalità classica: spegni il clima
                        await self._coordinator.hass.services.async_call(
                            'climate', 'set_hvac_mode', 
                            {'entity_id': self._coordinator.climate_entity, 'hvac_mode': 'off'}
                        )
                        
                    else:
                        # Modalità specifica: imposta la modalità scelta
                        await self._coordinator.hass.services.async_call(
                            'climate', 'set_hvac_mode', 
                            {'entity_id': self._coordinator.climate_entity, 'hvac_mode': timer_off_mode}
                        )
                        
                        # CONTROLLO CRITICO: verifica dopo il cambio modalità
                        if not self._is_running:
                            return
                        
                        # Se non è modalità "off", imposta anche temperatura e ventola appropriate
                        if timer_off_mode != "off":
                            season = await self._coordinator._get_season()
                            
                            # CONTROLLO CRITICO: verifica dopo get_season
                            if not self._is_running:
                                return
                            
                            if season == "summer":
                                temperature = float(self._coordinator.get_option("temperature_summer", 21))
                                default_fan_mode = self._coordinator.fan_mode_summer
                            else:
                                temperature = float(self._coordinator.get_option("temperature_winter", 21))
                                default_fan_mode = self._coordinator.fan_mode_winter
                            
                            # CONTROLLO CRITICO: verifica prima di impostare temperatura
                            if not self._is_running:
                                return
                            
                            # Imposta temperatura
                            await self._coordinator.hass.services.async_call(
                                'climate', 'set_temperature', 
                                {'entity_id': self._coordinator.climate_entity, 'temperature': temperature}
                            )
                            
                            # CONTROLLO CRITICO: verifica dopo impostazione temperatura
                            if not self._is_running:
                                return
                            
                            # Determina la modalità ventola da usare dal selector
                            timer_fan_mode = self._coordinator.get_option("timer_off_fan_mode_selector", "auto")
                            
                            # Se è impostato su "auto", usa la modalità ventola della stagione
                            if timer_fan_mode == "auto":
                                fan_mode_to_use = default_fan_mode
                            else:
                                fan_mode_to_use = timer_fan_mode
                            
                            # CONTROLLO CRITICO: verifica prima di impostare ventola
                            if not self._is_running:
                                return
                            
                            # Imposta ventola se supportata
                            if fan_mode_to_use and self._coordinator._check_fan_mode_compatibility(fan_mode_to_use):
                                await self._coordinator.hass.services.async_call(
                                    'climate', 'set_fan_mode', 
                                    {'entity_id': self._coordinator.climate_entity, 'fan_mode': fan_mode_to_use}
                                )
                                
                                # CONTROLLO CRITICO: verifica dopo impostazione ventola
                                if not self._is_running:
                                    return
                        
                            # MEMORIZZA LE IMPOSTAZIONI DEL TIMER per il blocco impostazioni
                            self._coordinator.set_locked_settings_override(
                                hvac_mode=timer_off_mode,
                                temperature=temperature,
                                fan_mode=fan_mode_to_use,
                                preset_mode=None  # Preset mode non gestito nei timer per ora
                            )
                        
                        
                except Exception:
                    # Reset flag anche in caso di errore
                    self._coordinator._timer_in_action = False
                    pass
                
                # LOGICA CICLICA: Se la modalità non è "off", riavvia il timer invece di spegnerlo
                if timer_off_mode != "off":
                    
                    # CONTROLLO CRITICO: verifica se il timer è stato fermato durante l'azione
                    if not self._is_running:
                        return
                    
                    # Notifica riavvio timer

                    
                    from .const import get_alexa_messages
                # Usa la lingua configurata nel componente, non quella di Home Assistant
                lang = (self._coordinator.options.get("lingua") or 
                       self._coordinator.config.get("lingua", "it"))
                messages = get_alexa_messages(lang)
                
                # Traduci la modalità per il messaggio
                mode_translations = {
                    "it": {
                        "heat": "riscaldamento",
                        "cool": "raffreddamento", 
                        "heat_cool": "riscaldamento/raffreddamento",
                        "auto": "automatico",
                        "dry": "deumidificazione",
                        "fan_only": "ventilazione"
                    },
                    "en": {
                        "heat": "heating",
                        "cool": "cooling",
                        "heat_cool": "heating/cooling", 
                        "auto": "automatic",
                        "dry": "dry",
                        "fan_only": "fan only"
                    }
                }
                
                mode_text = mode_translations.get(lang, mode_translations["en"]).get(timer_off_mode, timer_off_mode)
                
                template = messages.get("timer_off_mode_executed", "Timer di spegnimento eseguito in {{room}}, passaggio a modalità {{mode}}.")
                message = self._coordinator._render_message(
                    template,
                    room=self._coordinator.current_name,
                    mode=mode_text
                )
                
                # Non inviare notifica per cambio modalità - solo per spegnimento definitivo
                # await self._coordinator._notify(message, "timer_off_executed")
                
                # CONTROLLO CRITICO: verifica di nuovo se il timer è stato fermato
                if not self._is_running:
                    return
                
                # CONTROLLO CRITICO: verifica se il clima è ancora acceso prima di riavviare
                climate_state = self._coordinator.hass.states.get(self._coordinator.climate_entity)
                if not climate_state or climate_state.state == "off":
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.info(f"[{self._coordinator.current_name}] Timer ciclico NON riavviato: clima spento")
                    self._is_running = False
                    self._remaining_seconds = 0
                    self.async_write_ha_state()
                    return
                
                    # Riavvia il timer ciclico
                    minutes = self._coordinator.get_option("timer_off_minutes", 60)
                    self._total_seconds = minutes * 60
                    self._remaining_seconds = self._total_seconds
                    # Il timer resta attivo (_is_running rimane True)
                    self.async_write_ha_state()
                    
                    # Rimuovi il flag dopo 5 secondi per permettere al blocco impostazioni di riattivare
                    from homeassistant.helpers.event import async_call_later
                    async_call_later(self._coordinator.hass, 5, self._reset_timer_action_flag)
                    
                # CONTROLLO FINALE: verifica un'ultima volta prima di riavviare il countdown
                if not self._is_running:
                    return
                
                # CONTROLLO AGGIUNTIVO: verifica se il task è stato cancellato
                if self._timer_task and self._timer_task.cancelled():
                    return
                
                # CONTROLLO FINALE ANTI-DUPLICAZIONE: verifica se ci sono già timer attivi
                import logging
                logger = logging.getLogger(__name__)
                
                # Controlla se il timer switch è ancora attivo
                name = self._coordinator.current_name
                import re
                name_slug = re.sub(r'[^\w]', '_', str(name).lower())
                name_slug = re.sub(r'_+', '_', name_slug).strip('_')
                switch_id = f"switch.climate_manager_timer_off_{name_slug}"
                
                switch_state = self._coordinator.hass.states.get(switch_id)
                if not switch_state or switch_state.state == "off":
                    logger.info(f"[{self._coordinator.current_name}] Timer ciclico NON riavviato: switch timer disattivato")
                    self._is_running = False
                    self._remaining_seconds = 0
                    self.async_write_ha_state()
                    return
                
                # Invece di ricorsione diretta, usa un nuovo task per evitare race conditions
                logger.info(f"[{self._coordinator.current_name}] Timer ciclico riavviato per {minutes} minuti")
                self._timer_task = asyncio.create_task(self._run_countdown())
                return
                
            else:
                # Modalità "off" - comportamento standard: spegni definitivamente
                # Spegni lo switch timer associato
                name = self._coordinator.current_name
                import re
                name_slug = re.sub(r'[^\w]', '_', str(name).lower())
                name_slug = re.sub(r'_+', '_', name_slug).strip('_')
                switch_id = f"switch.climate_manager_timer_off_{name_slug}"
                
                await self._coordinator.hass.services.async_call(
                    'switch', 'turn_off', 
                    {'entity_id': switch_id}
                )
                
                # Notifica spegnimento definitivo
                from .const import get_alexa_messages
                # Usa la lingua configurata nel componente, non quella di Home Assistant
                lang = (self._coordinator.options.get("lingua") or 
                       self._coordinator.config.get("lingua", "it"))
                messages = get_alexa_messages(lang)
                
                template = messages.get("timer_off_executed", "Timer di spegnimento eseguito in {{room}}, clima spento.")
                message = self._coordinator._render_message(
                    template,
                    room=self._coordinator.current_name
                )
                
                await self._coordinator._notify(message, "timer_off_executed")
                
                # Rimuovi il flag anche per spegnimento definitivo
                from homeassistant.helpers.event import async_call_later
                async_call_later(self._coordinator.hass, 5, self._reset_timer_action_flag)
            
            # Ferma il timer
            self._is_running = False
            self.async_write_ha_state()
                
        except asyncio.CancelledError:
            self._is_running = False
            self.async_write_ha_state()
            # Reset flag anche in caso di cancellazione
            self._coordinator._timer_in_action = False
            raise

    async def _update_name(self):
        self.async_write_ha_state()
    
    def _reset_timer_action_flag(self, *_):
        """Reset del flag timer in azione per permettere al blocco impostazioni di funzionare"""
        self._coordinator._timer_in_action = False
    
    async def _restore_global_settings(self):
        """Ripristina le impostazioni globali configurate per la stagione quando timer si ferma"""
        try:
            # Controlla se il clima è acceso
            climate_state = self._coordinator.hass.states.get(self._coordinator.climate_entity)
            if not climate_state or climate_state.state == "off":
                return
            
            # Ottieni le impostazioni globali per la stagione corrente
            season = await self._coordinator._get_season()
            
            if season == "summer":
                target_hvac_mode = self._coordinator.get_option("hvac_mode_summer", "cool")
                target_temperature = float(self._coordinator.get_option("temperature_summer", 21))
                target_fan_mode = self._coordinator.fan_mode_summer
            elif season == "winter":
                target_hvac_mode = self._coordinator.get_option("hvac_mode_winter", "heat")
                target_temperature = float(self._coordinator.get_option("temperature_winter", 21))
                target_fan_mode = self._coordinator.fan_mode_winter
            else:
                # Fallback su estate
                target_hvac_mode = self._coordinator.get_option("hvac_mode_summer", "cool")
                target_temperature = float(self._coordinator.get_option("temperature_summer", 21))
                target_fan_mode = self._coordinator.fan_mode_summer
            
            # Verifica compatibilità e applica le impostazioni
            if self._coordinator._check_hvac_mode_compatibility(target_hvac_mode):
                await self._coordinator.hass.services.async_call(
                    'climate', 'set_hvac_mode',
                    {'entity_id': self._coordinator.climate_entity, 'hvac_mode': target_hvac_mode}
                )
            
            await self._coordinator.hass.services.async_call(
                'climate', 'set_temperature',
                {'entity_id': self._coordinator.climate_entity, 'temperature': target_temperature}
            )
            
            if target_fan_mode and self._coordinator._check_fan_mode_compatibility(target_fan_mode):
                await self._coordinator.hass.services.async_call(
                    'climate', 'set_fan_mode',
                    {'entity_id': self._coordinator.climate_entity, 'fan_mode': target_fan_mode}
                )
            
        except Exception:
            pass

class ClimateManagerTimerOnNotificationSensor(Entity):
    """Sensore per il timer di notifica di accensione - conta quanto tempo il clima è acceso"""
    
    def __init__(self, coordinator):
        self._coordinator = coordinator
        self._attr_unique_id = f"climate_manager_{coordinator.entry_id}_timer_on_notification"
        self._is_running = False
        self._is_paused = False  # Nuovo flag per pausa
        self._elapsed_seconds = 0
        self._start_time = None
        self._pause_time = None  # Tempo di inizio pausa
        self._timer_task = None
        self._notification_sent = False
        coordinator.register_name_change_callback(self._update_name)

    @property
    def name(self):
        name = self._coordinator.current_name
        # Ottieni la lingua configurata
        lang = (self._coordinator.options.get("lingua") or 
               self._coordinator.config.get("lingua", "it"))
        
        # Traduzioni per il nome dell'entità
        if lang == "it":
            entity_name = "Timer Accensione Notifica"
        else:
            entity_name = "Turn-on Timer Notification"
        
        return f"climate_manager_{entity_name} {name}"

    @property
    def state(self):
        if not self._is_running:
            return "00:00:00"
        
        hours = int(self._elapsed_seconds // 3600)
        minutes = int((self._elapsed_seconds % 3600) // 60)
        seconds = int(self._elapsed_seconds % 60)
        status = " (PAUSED)" if self._is_paused else ""
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}{status}"

    @property
    def extra_state_attributes(self):
        notification_minutes = self._coordinator.get_option("timer_on_notification_minutes", 0)
        return {
            "is_running": self._is_running,
            "is_paused": self._is_paused,
            "elapsed_seconds": self._elapsed_seconds,
            "notification_minutes": notification_minutes,
            "notification_sent": self._notification_sent,
            "notification_enabled": notification_minutes > 0
        }

    @property
    def icon(self):
        if self._is_paused:
            return "mdi:clock-pause"
        elif self._is_running:
            return "mdi:clock-check"
        else:
            return "mdi:clock-outline"

    @property
    def device_info(self):
        name = self._coordinator.current_name
        return {
            "identifiers": {("climate_manager", self._coordinator.entry_id)},
            "name": f"Climate Manager {name}",
            "manufacturer": "Climate Manager",
            "model": "Climate Automation",
            "sw_version": "1.0",
        }

    async def start_timer(self):
        """Avvia il contatore quando il clima si accende"""
        if self._is_running:
            return
            
        import datetime
        import logging
        logger = logging.getLogger(__name__)
    
        self._start_time = datetime.datetime.now()
        self._elapsed_seconds = 0
        self._is_running = True
        self._is_paused = False
        self._pause_time = None
        self._notification_sent = False
        
        logger.info(f"[{self._coordinator.current_name}] Timer notifica accensione avviato alle {self._start_time}")
        
        # Avvia il task del contatore
        self._timer_task = asyncio.create_task(self._run_counter())
        self.async_write_ha_state()

    async def pause_timer(self):
        """Mette in pausa il timer (per apertura finestra)"""
        if not self._is_running or self._is_paused:
            return
            
        import datetime
        import logging
        logger = logging.getLogger(__name__)
        
        self._is_paused = True
        self._pause_time = datetime.datetime.now()
        
        logger.info(f"[{self._coordinator.current_name}] Timer notifica accensione messo in pausa alle {self._pause_time} (tempo accumulato: {self._elapsed_seconds}s)")
        self.async_write_ha_state()

    async def resume_timer(self):
        """Riprende il timer dalla pausa (per chiusura finestra)"""
        if not self._is_running or not self._is_paused:
            return
            
        import datetime
        import logging
        logger = logging.getLogger(__name__)
        
        self._is_paused = False
        resume_time = datetime.datetime.now()
        
        logger.info(f"[{self._coordinator.current_name}] Timer notifica accensione ripreso alle {resume_time} (tempo accumulato: {self._elapsed_seconds}s)")
        self._pause_time = None
        self.async_write_ha_state()

    async def stop_timer(self):
        """Ferma il contatore quando il clima si spegne definitivamente"""
        if not self._is_running:
            return
            
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[{self._coordinator.current_name}] Timer notifica accensione fermato definitivamente")
            
        self._is_running = False
        self._is_paused = False
        self._elapsed_seconds = 0
        self._start_time = None
        self._pause_time = None
        self._notification_sent = False
        
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
            try:
                await self._timer_task
            except asyncio.CancelledError:
                logger.info(f"[{self._coordinator.current_name}] Task timer notifica accensione cancellato")
            
        self.async_write_ha_state()

    async def _run_counter(self):
        """Esegue il contatore ogni secondo"""
        try:
            while self._is_running:
                await asyncio.sleep(1)
                
                if not self._is_running:
                    return
                
                # CONTROLLO AGGIUNTIVO: Verifica che il clima sia ancora acceso
                climate_state = self._coordinator.hass.states.get(self._coordinator.climate_entity)
                if not climate_state or climate_state.state == "off":
                    # CONTROLLO TIMEOUT FINESTRE: Se il timeout finestre è scaduto, ferma definitivamente
                    if getattr(self._coordinator, '_window_timeout_expired', False):
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.info(f"[{self._coordinator.current_name}] 🔴 Timer notifica fermato: timeout finestre scaduto")
                        await self.stop_timer()
                        return
                    
                    # CONTROLLO AUTOMAZIONI: Se le automazioni sono disabilitate per spegnimento manuale, ferma definitivamente
                    if not self._coordinator.automation_enabled or self._coordinator.are_automations_disabled_by_shutdown():
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.info(f"[{self._coordinator.current_name}] 🔴 Timer notifica fermato definitivamente: spegnimento manuale")
                        await self.stop_timer()
                        return
                    
                    # ALTRIMENTI: Spegnimento per finestra (anche se finestra ora chiusa) - metti in pausa
                    if not self._is_paused:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.info(f"[{self._coordinator.current_name}] ⏸️ Timer notifica in pausa: clima spento (finestra)")
                        await self.pause_timer()
                    # Continua il loop ma non incrementare il contatore
                    continue
                else:
                    # Clima acceso: se era in pausa, riprendi automaticamente
                    if self._is_paused:
                        await self.resume_timer()
                
                # Incrementa il contatore solo se non è in pausa
                if not self._is_paused:
                    self._elapsed_seconds += 1
                    
                    # Controlla se è ora di inviare la notifica
                    notification_minutes = self._coordinator.get_option("timer_on_notification_minutes", 0)
                    if (notification_minutes > 0 and 
                        self._elapsed_seconds >= notification_minutes * 60 and 
                        not self._notification_sent):
                        
                        await self._send_notification(notification_minutes)
                        self._notification_sent = True
                
                self.async_write_ha_state()
                
        except asyncio.CancelledError:
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"[{self._coordinator.current_name}] Counter timer notifica accensione cancellato")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"[{self._coordinator.current_name}] Errore nel counter timer notifica accensione: {e}")

    async def _send_notification(self, minutes):
        """Invia la notifica interattiva quando il timer scade"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            room_name = self._coordinator.get_option("room_name", "Stanza")
            
            # Ottieni il messaggio personalizzato o usa quello di default
            messages = self._coordinator.messages
            msg_template = messages.get("timer_on_notification", "Clima acceso da {{minutes}} minuti in {{room}}")
            
            # Usa il sistema di template del coordinator per renderizzare correttamente
            message = self._coordinator._render_message(
                msg_template,
                room=room_name,
                extra={"minutes": minutes}
            )
            
            logger.info(f"[{room_name}] Invio notifica interattiva timer accensione: {message}")
            
            # Invia notifiche interattive solo su Push (non Alexa)
            await self._send_interactive_notifications(message, room_name)
                    
        except Exception as e:
            logger.error(f"[{self._coordinator.current_name}] Errore invio notifica timer accensione: {e}")

    async def _send_interactive_notifications(self, message, room_name):
        """Invia notifiche interattive con pulsanti SI/NO"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # Controllo debounce per evitare notifiche interattive duplicate
            import time
            import hashlib
            
            # Crea un hash unico per questa specifica notifica
            notification_hash = hashlib.md5(f"{message}_{self._coordinator.entry_id}_{room_name}".encode()).hexdigest()
            current_time = time.time()
            
            # Controlla se abbiamo già inviato questa notifica di recente (debounce 5 secondi)
            if hasattr(self, '_last_interactive_notifications'):
                if notification_hash in self._last_interactive_notifications:
                    time_diff = current_time - self._last_interactive_notifications[notification_hash]
                    if time_diff < 5:  # 5 secondi di debounce
                        logger.info(f"[{room_name}] Notifica interattiva ignorata (debounce): {message}")
                        return
            else:
                self._last_interactive_notifications = {}
            
            # Registra questa notifica nel cache
            self._last_interactive_notifications[notification_hash] = current_time
            
            # Pulisci cache vecchie (più di 1 minuto)
            self._last_interactive_notifications = {
                k: v for k, v in self._last_interactive_notifications.items() 
                if current_time - v < 60
            }
            
            # Ottieni i servizi di notifica configurati
            push_targets = self._coordinator.get_option("push_targets", "")
            
            if not push_targets:
                logger.warning(f"[{room_name}] Nessun servizio push configurato per notifiche interattive")
                return
                
            # Genera un ID prevedibile per questa notifica (per poterla cancellare)
            notification_id = f"climate_timer_{self._coordinator.entry_id}"
            
            # Traduci i pulsanti in base alla lingua configurata
            lang = (self._coordinator.options.get("lingua") or 
                   self._coordinator.config.get("lingua", "it"))
            
            if lang == "it":
                button_turn_off = "SPEGNI"
                button_leave_on = "LASCIA ACCESO"
            else:
                button_turn_off = "TURN OFF"
                button_leave_on = "LEAVE ON"
            
            # Prepara i pulsanti per la notifica
            action_data = {
                "actions": [
                    {
                        "action": f"TURN_OFF_CLIMATE_{self._coordinator.entry_id}",
                        "title": button_turn_off
                    },
                    {
                        "action": f"IGNORE_CLIMATE_{self._coordinator.entry_id}",
                        "title": button_leave_on
                    }
                ]
            }
            
            # Invia notifica a tutti i servizi push configurati (evita duplicati)
            sent_targets = set()
            for target in push_targets.split(','):
                target = target.strip()
                if target and target not in sent_targets:
                    sent_targets.add(target)
                    
                    # Rimuovi il prefisso "notify." se presente per evitare duplicati
                    clean_target = target.replace("notify.", "") if target.startswith("notify.") else target
                    service_name = f"notify.{clean_target}"
                    
                    try:
                        if "telegram" in clean_target.lower():
                            # Telegram: messaggio con pulsanti inline (sintassi corretta)
                            await self._coordinator.hass.services.async_call(
                                'notify', clean_target,
                                {
                                    'title': f"🔥 Climate Manager - {room_name}",
                                    'message': message,
                                    'data': {
                                        'inline_keyboard': [
                                            f"{button_turn_off}:/turn_off_climate_{self._coordinator.entry_id}, {button_leave_on}:/ignore_climate_{self._coordinator.entry_id}"
                                        ]
                                    }
                                }
                            )
                            logger.info(f"[{room_name}] Notifica Telegram con pulsanti inviata a {service_name}")
                        else:
                            # Home Assistant app: messaggio con pulsanti interattivi
                            await self._coordinator.hass.services.async_call(
                                'notify', clean_target,
                                {
                                    'message': message,
                                    'title': f"🔥 Climate Manager - {room_name}",
                                    'data': {
                                        'tag': notification_id,
                                        'persistent': True,
                                        'actions': action_data["actions"],
                                        'category': 'actionable'
                                    }
                                }
                            )
                        logger.info(f"[{room_name}] Notifica interattiva inviata a {service_name}")
                        
                    except Exception as e:
                        logger.error(f"[{room_name}] Errore invio notifica a {service_name}: {e}")
                            
        except Exception as e:
            logger.error(f"[{room_name}] Errore invio notifiche interattive: {e}")

    async def _update_name(self):
        """Update entity name when coordinator name changes."""
        self.async_write_ha_state()

class ClimateManagerSettingsSensor(Entity):
    def __init__(self, coordinator):
        self._coordinator = coordinator
        self._attr_unique_id = f"climate_manager_{coordinator.entry_id}_settings"
        # Registra callback per aggiornamento nome
        coordinator.register_name_change_callback(self._update_name)
        # Registra callback per aggiornamento stato finestre
        coordinator.register_window_state_callback(self._force_update)

    @property
    def name(self):
        name = self._coordinator.current_name
        # Ottieni la lingua configurata
        lang = (self._coordinator.options.get("lingua") or 
               self._coordinator.config.get("lingua", "it"))
        
        # Traduzioni per il nome dell'entità
        if lang == "it":
            entity_name = "Impostazioni"
        else:
            entity_name = "Settings"
        
        return f"climate_manager_{entity_name} {name}"

    async def _update_name(self):
        """Aggiorna il nome dell'entità quando cambia la configurazione"""
        self.async_write_ha_state()

    def _force_update(self):
        """Forza l'aggiornamento dello stato quando cambiano le finestre"""
        self.async_write_ha_state()

    def _find_automation_switch(self):
        """Trova lo switch di automazione realmente esistente per questo coordinator"""
        try:
            # Import del registry qui per evitare errori di importazione
            from homeassistant.helpers import entity_registry as er
            
            # Ottieni l'entity registry
            entity_registry = er.async_get(self._coordinator.hass)
            
            # Cerca tutte le entità di questo config entry
            entries = er.async_entries_for_config_entry(entity_registry, self._coordinator.entry_id)
            for entity_entry in entries:
                if (entity_entry.domain == 'switch' and 
                    'climate_manager_automation_enable' in entity_entry.entity_id):
                    return entity_entry.entity_id
                    
        except Exception as e:
            pass
        
        # Se non trova nessuno switch esistente, genera quello teorico dal nome corrente
        name = self._coordinator.current_name or "unknown"
        import re
        name_slug = re.sub(r'[^\w]', '_', str(name).lower())
        name_slug = re.sub(r'_+', '_', name_slug).strip('_')
        return f"switch.climate_manager_automation_enable_{name_slug}"

    def _find_lock_settings_switch(self):
        """Trova lo switch "Blocca Impostazioni" per questo coordinator"""
        try:
            # Import del registry qui per evitare errori di importazione
            from homeassistant.helpers import entity_registry as er
            
            # Ottieni l'entity registry
            entity_registry = er.async_get(self._coordinator.hass)
            
            # Cerca tutte le entità di questo config entry
            entries = er.async_entries_for_config_entry(entity_registry, self._coordinator.entry_id)
            for entity_entry in entries:
                if (entity_entry.domain == 'switch' and 
                    'climate_manager_lock_settings' in entity_entry.entity_id):
                    return entity_entry.entity_id
                    
        except Exception as e:
            pass
        
        # Se non trova nessuno switch esistente, genera quello teorico dal nome corrente
        name = self._coordinator.current_name or "unknown"
        import re
        name_slug = re.sub(r'[^\w]', '_', str(name).lower())
        name_slug = re.sub(r'_+', '_', name_slug).strip('_')
        return f"switch.climate_manager_lock_settings_{name_slug}"

    @property
    def state(self):
        return "settings"

    @property
    def extra_state_attributes(self):
        c = self._coordinator
        opts = c.options or {}
        conf = c.config or {}
        # Attributi ordinati per categoria
        attrs = OrderedDict()
        
        # Funzione helper per aggiungere solo valori non-None
        def add_if_exists(key, value):
            if value is not None:
                attrs[key] = value
        
        # --- Identità ---
        add_if_exists("name", c.current_name)
        add_if_exists("room_name", opts.get("room_name") or conf.get("room_name"))
        add_if_exists("climate_entity", c.climate_entity)
        
        # --- Switch associato ---
        # Cerca lo switch effettivamente esistente per questo coordinator
        automation_switch = self._find_automation_switch()
        if automation_switch:
            attrs["automation_switch"] = automation_switch
        
        # Aggiungi informazione sul lock settings switch
        lock_settings_switch = self._find_lock_settings_switch()
        if lock_settings_switch:
            attrs["lock_settings_switch"] = lock_settings_switch
            attrs["settings_locked"] = getattr(c, '_settings_locked', False)
        
        # --- Sensori e dispositivi ---
        window_sensors = opts.get("window_sensors") or conf.get("window_sensors")
        if window_sensors:  # Solo se configurato
            attrs["window_sensors"] = window_sensors
            # Aggiungi lo stato del gruppo finestre (on=aperte, off=chiuse)
            attrs["window_group_state"] = "on" if c._window_open else "off"
            # Aggiungi informazione sul timeout delle finestre
            attrs["window_timeout_expired"] = c.window_timeout_expired
            # Aggiungi informazioni sui timer attivi
            attrs["window_timer_active"] = c._window_timer is not None
            attrs["window_off_timer_active"] = c._window_off_timer is not None
            attrs["window_on_timer_active"] = c._window_on_timer is not None
            
        temp_sensor = opts.get("temperature_sensor") or conf.get("temperature_sensor")
        # Gestisci stringa speciale "__NONE__" come None
        if temp_sensor == "__NONE__":
            temp_sensor = None
        if temp_sensor:  # Solo se configurato
            attrs["temperature_sensor"] = temp_sensor
            
        climate_power_sensor = opts.get("climate_power_sensor") or conf.get("climate_power_sensor")
        if climate_power_sensor:  # Solo se configurato
            attrs["climate_power_sensor"] = climate_power_sensor
            
        # Aggiungi la temperatura corrente letta dal custom component
        current_temp = c._get_current_temperature()
        if current_temp is not None:
            attrs["current_temperature"] = current_temp
            
        add_if_exists("alexa_media", conf.get("alexa_media"))
        add_if_exists("push_targets", opts.get("push_targets") or conf.get("push_targets"))
        
        # --- Modalità e impostazioni clima ---
        add_if_exists("season", opts.get("season") or conf.get("season"))
        add_if_exists("hvac_mode_summer", opts.get("hvac_mode_summer") or conf.get("hvac_mode_summer"))
        add_if_exists("hvac_mode_winter", opts.get("hvac_mode_winter") or conf.get("hvac_mode_winter"))
        add_if_exists("fan_mode_summer", opts.get("fan_mode_summer") or conf.get("fan_mode_summer"))
        add_if_exists("fan_mode_winter", opts.get("fan_mode_winter") or conf.get("fan_mode_winter"))
        add_if_exists("temperature_summer", opts.get("temperature_summer") or conf.get("temperature_summer"))
        add_if_exists("temperature_winter", opts.get("temperature_winter") or conf.get("temperature_winter"))
        
        # --- Soglie ---
        add_if_exists("summer_temp_threshold", opts.get("summer_temp_threshold") or conf.get("summer_temp_threshold"))
        add_if_exists("winter_temp_threshold", opts.get("winter_temp_threshold") or conf.get("winter_temp_threshold"))
        
        # --- Timer ---
        add_if_exists("timeout", opts.get("timeout") or conf.get("timeout"))
        add_if_exists("delay_before_off", opts.get("delay_before_off") or conf.get("delay_before_off"))
        add_if_exists("delay_before_on", opts.get("delay_before_on") or conf.get("delay_before_on"))
        
        # --- Timer Accensione/Spegnimento ---
        add_if_exists("timer_on_minutes", opts.get("timer_on_minutes") or conf.get("timer_on_minutes"))
        add_if_exists("timer_off_minutes", opts.get("timer_off_minutes") or conf.get("timer_off_minutes"))
        add_if_exists("timer_off_hvac_mode_selector", opts.get("timer_off_hvac_mode_selector", "off"))
        add_if_exists("timer_off_fan_mode_selector", opts.get("timer_off_fan_mode_selector", "auto"))
        
        # Stato dei timer (se sono attivi)
        if hasattr(c, '_timer_on_remaining'):
            attrs["timer_on_remaining"] = c._timer_on_remaining
        if hasattr(c, '_timer_off_remaining'):
            attrs["timer_off_remaining"] = c._timer_off_remaining
        
        # --- Notifiche ---
        add_if_exists("notification_time_start_alexa", opts.get("notification_time_start_alexa") or conf.get("notification_time_start_alexa"))
        add_if_exists("notification_time_end_alexa", opts.get("notification_time_end_alexa") or conf.get("notification_time_end_alexa"))
        add_if_exists("notification_time_start_push", opts.get("notification_time_start_push") or conf.get("notification_time_start_push"))
        add_if_exists("notification_time_end_push", opts.get("notification_time_end_push") or conf.get("notification_time_end_push"))
        
        # --- Abilitazione messaggi ---
        add_if_exists("enable_msgs_alexa", opts.get("enable_msgs_alexa") or conf.get("enable_msgs_alexa"))
        add_if_exists("enable_msgs_push", opts.get("enable_msgs_push") or conf.get("enable_msgs_push"))
        
        # --- Messaggi personalizzati ---
        add_if_exists("messages", opts.get("messages") or conf.get("messages"))
        
        # --- Lingua ---
        add_if_exists("lingua", opts.get("lingua") or conf.get("lingua"))
        
        return attrs

    @property
    def device_info(self):
        """Raggruppa con le altre entità della stessa config entry."""
        name = self._coordinator.current_name
        return {
            "identifiers": {("climate_manager", self._coordinator.entry_id)},
            "name": f"Climate Manager {name}",
            "manufacturer": "Climate Manager",
            "model": "Climate Automation",
            "sw_version": "1.0",
        }


class ClimateManagerAutomationStatusSensor(Entity):
    """Sensore per lo stato delle automazioni Climate Manager"""
    
    def __init__(self, coordinator):
        self._coordinator = coordinator
        self._attr_unique_id = f"climate_manager_{coordinator.entry_id}_automation_status"
        # Registra callback per aggiornamento nome
        coordinator.register_name_change_callback(self._update_name)
        # Registra callback per aggiornamento stato automazioni
        coordinator.register_automation_status_callback(self._force_update)

    @property
    def name(self):
        """Nome dinamico basato sulla configurazione corrente"""
        name = self._coordinator.current_name
        # Ottieni la lingua configurata
        lang = (self._coordinator.options.get("lingua") or 
               self._coordinator.config.get("lingua", "it"))
        
        # Traduzioni per il nome dell'entità
        if lang == "it":
            entity_name = "Stato Automazione"
        else:
            entity_name = "Automation Status"
        
        return f"climate_manager_{entity_name} {name}"

    async def _update_name(self):
        """Aggiorna il nome dell'entità quando cambia la configurazione"""
        self.async_write_ha_state()

    def _force_update(self):
        """Forza l'aggiornamento dello stato quando cambia lo stato delle automazioni"""
        self.async_write_ha_state()

    @property
    def state(self):
        """Stato delle automazioni"""
        if self._coordinator.automation_enabled:
            return "enabled"
        else:
            return "disabled"

    @property
    def extra_state_attributes(self):
        """Attributi dello stato delle automazioni"""
        return {
            "automation_enabled": self._coordinator.automation_enabled,
            "disabled_by_shutdown": self._coordinator._automation_disabled_by_shutdown,
            "reason": self._get_disabled_reason(),
            "climate_entity": self._coordinator.climate_entity,
            "room_name": self._coordinator.get_option('room_name', 'questa stanza')
        }

    def _get_disabled_reason(self):
        """Restituisce il motivo della disattivazione"""
        if self._coordinator.automation_enabled:
            return None
        elif self._coordinator._automation_disabled_by_shutdown:
            return "spegnimento_manuale"
        else:
            return "disattivazione_manuale"

    @property
    def icon(self):
        """Icona basata sullo stato"""
        if self._coordinator.automation_enabled:
            return "mdi:robot"
        else:
            return "mdi:robot-off"

    @property
    def device_info(self):
        """Raggruppa con le altre entità della stessa config entry."""
        name = self._coordinator.current_name
        return {
            "identifiers": {("climate_manager", self._coordinator.entry_id)},
            "name": f"Climate Manager {name}",
            "manufacturer": "Climate Manager",
            "model": "Climate Automation",
            "sw_version": "1.0",
        }