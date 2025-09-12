import asyncio
import logging
from datetime import timedelta, datetime, time as dt_time

from homeassistant.helpers.event import async_track_state_change_event, async_call_later
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.update_coordinator import CoordinatorEntity, DataUpdateCoordinator
from .const import ALEXA_MESSAGES

_LOGGER = logging.getLogger(__name__)

class ClimateManagerCoordinator(DataUpdateCoordinator):
    def __init__(self, hass: HomeAssistant, entry_id: str, config: dict, options: dict = None):
        self._remove_listeners = []  # Inizializza subito
        super().__init__(hass, _LOGGER, name=f"ClimateManagerCoordinator_{entry_id}")
        self.hass = hass
        self.entry_id = entry_id
        self.config = config
        self._options = options or {}
        self.automation_enabled = True  # <--- AGGIUNTO
        self._automation_disabled_by_shutdown = False  # Flag per tracciare se automazioni disabilitate da spegnimento manuale
        self._automation_disabled_manually = False  # Flag per tracciare se automazioni disabilitate manualmente dall'utente
        # Entities
        self.climate_entity = options.get("climate_entity") or config.get("climate_entity")
        if not self.climate_entity:
            raise ValueError("climate_entity mancante nel config entry")
        ws = config["window_sensors"]
        if isinstance(ws, str):
            ws = [e.strip() for e in ws.split(",") if e.strip()]
        self.window_entities = ws
        temp_sensor = options.get("temperature_sensor") or config.get("temperature_sensor")
        # Gestisci stringa speciale "__NONE__" come None
        self.temperature_sensor = None if temp_sensor == "__NONE__" else temp_sensor
        self.climate_power_sensor = options.get("climate_power_sensor") or config.get("climate_power_sensor")
        # Gestisci stringhe vuote come None
        if self.climate_power_sensor == "":
            self.climate_power_sensor = None
        self.season_entity = config.get("season_entity")
        self.alexa_media = config.get("alexa_media", [])
        # push_targets ora viene letto dinamicamente nella property
        self._alexa_targets = [f"alexa_media_{entity.split('.')[-1]}" for entity in self.alexa_media]
        # Customization
        self.targets = config.get("targets", {})
        self.notify_enabled = config.get("notify", True)
        self.season_mode = options.get("season") or config.get("season", "auto")
        self._fan_mode_summer = self.get_option("fan_mode_summer", "medium")
        self._fan_mode_winter = self.get_option("fan_mode_winter", "medium")
        # State
        self._window_open = False
        self._climate_prev_state = None
        self._window_timer = None
        self._window_off_timer = None
        self._window_on_timer = None
        self._auto_season = None
        self._ignore_next_state_change = False
        self._window_timeout_expired = False
        self._on_timer = None
        self._on_timer_end = None
        self._skip_next_on_ok = False
        self._restore_in_progress = False
        self._syncing_from_binary_sensor = False  # Flag per evitare loop notifiche
        self._timer_callbacks = []
        self._prev_state_callbacks = []
        self._automation_status_callbacks = []  # Callback per aggiornamenti stato automazioni
        self._configuring_climate = False  # Nuovo flag per tracciare configurazione in corso
        self._internal_shutdown = False  # Flag per distinguere spegnimenti interni (automazione) da esterni (manuali)
        self._last_shutdown_time = 0  # Timestamp ultimo spegnimento per evitare elaborazioni multiple
        self._shutdown_already_processed = False  # Flag per evitare doppia elaborazione dello stesso spegnimento
        self._last_valid_window_states = {}  # Traccia l'ultimo stato valido di ogni sensore finestra
        self._settings_locked = False  # Flag per bloccare le impostazioni del clima
        self._timer_in_action = False  # Flag per evitare conflitti tra timer e blocco impostazioni
        self._locked_settings_override = None  # Impostazioni temporanee del timer da proteggere
        self.update_window_entities()  # <-- Aggiorna e logga subito la lista finestre
        # Aggiorna subito la stagione effettiva
        hass.loop.create_task(self._update_season())

    def get_option(self, key, default=None):
        # Per ora disabilito la lettura real-time dal sensore settings per evitare problemi event loop
        # TODO: Implementare cache del sensore settings aggiornato tramite listener
        # Prima priorità: options locali (modifiche temporanee)
        if self._options and key in self._options:
            return self._options[key]
        # Seconda priorità: config iniziale
        if key in self.config:
            return self.config[key] 
        return default
    def _find_settings_sensor(self):
        """Trova il sensore settings associato a questa climate entity"""
        # Temporaneamente disabilitato per evitare problemi event loop
        return None
    @property
    def current_name(self):
        """Restituisce il nome corrente, prima dalle options poi dal config"""
        return self.get_option("name") or self.get_option("climate_entity") or self.entry_id
    @property
    def window_open_timeout(self):
        return int(self.get_option("timeout", 15)) * 60
    @property
    def messages(self):
        return self.get_option("messages", {})
    @property
    def fan_mode_summer(self):
        return self._fan_mode_summer
    @property
    def fan_mode_winter(self):
        return self._fan_mode_winter
    @property
    def push_targets(self):
        raw = self.get_option("push_targets", "") or ""
        # Assicurati che sia una stringa, anche se vuota
        if raw is None:
            raw = ""
        targets = [t.strip() for t in raw.split(",") if t.strip()]
        # NON aggiungere i target Alexa ai push targets!
        # Gli Alexa targets sono gestiti separatamente
        return targets
    @property
    def delay_before_off(self):
        return int(self.get_option("delay_before_off", 0))
    @property
    def delay_before_on(self):
        return int(self.get_option("delay_before_on", 0))
    def is_msg_enabled(self, key, channel):
        if channel == "alexa":
            return self.get_option("enable_msgs_alexa", {}).get(key, True)
        if channel == "push":
            return self.get_option("enable_msgs_push", {}).get(key, True)
        return True
    def _is_notification_time(self, channel=None):
        now = datetime.now().time()
        if channel == "alexa":
            start = self._get_time("notification_time_start_alexa", "08:00")
            end = self._get_time("notification_time_end_alexa", "22:00")
        elif channel == "push":
            start = self._get_time("notification_time_start_push", "08:00")
            end = self._get_time("notification_time_end_push", "22:00")
        else:
            start = self._get_time("notification_time_start", "08:00")
            end = self._get_time("notification_time_end", "22:00")
        if start <= end:
            return start <= now <= end
        else:
            return now >= start or now <= end
    def _get_time(self, key, default):
        val = self.get_option(key, default)
        parts = val.split(":")
        h, m = int(parts[0]), int(parts[1])
        return dt_time(h, m)
    async def async_config_entry_first_refresh(self):
        # Aggiorna e logga la lista finestre anche qui, per sicurezza
        self.update_window_entities()
        # NON creo più il binary_sensor di gruppo custom
        entities = self.window_entities
        hass = self.hass
        # Listener su tutte le finestre
        def update_group_state(*_):
            # Usa la stessa logica di filtro per stati validi, con ultimo stato valido per sensori offline
            window_states = []
            for ent in entities:
                state = hass.states.get(ent)
                if state and state.state not in ("unknown", "unavailable"):
                    # Sensore online: aggiorna l'ultimo stato valido e usa quello corrente
                    is_open = state.state == "on"
                    self._last_valid_window_states[ent] = is_open
                    window_states.append(is_open)
                elif ent in self._last_valid_window_states:
                    # Sensore offline: usa l'ultimo stato valido noto
                    window_states.append(self._last_valid_window_states[ent])
                else:
                    # Sensore mai visto prima: assume chiuso per sicurezza
                    window_states.append(False)
            
            if window_states:
                any_open = any(window_states)
                self._window_open = any_open
                self._notify_window_state_callbacks()
        # Aggiorna subito e ogni volta che cambia una finestra
        update_group_state()
        for ent in entities:
            self._remove_listeners.append(
                async_track_state_change_event(hass, [ent], self._handle_window_state)
            )
        self._remove_listeners.append(
            async_track_state_change_event(
                self.hass, [self.climate_entity], self._handle_climate_state
            )
        )
        # Aggiungi listener per il sensore di temperatura o per il climate entity
        if self.temperature_sensor:
            # Se c'è un sensore esterno, usa quello
            self._remove_listeners.append(
                async_track_state_change_event(
                    self.hass, [self.temperature_sensor], self._handle_temperature_state
                )
            )
        else:
            # Se non c'è sensore esterno, ascolta il climate entity per temperature changes
            # Il listener per climate_entity è già aggiunto sopra, ma aggiungiamo un flag per sapere che dobbiamo monitorare anche la temperatura
            pass
        # Aggiungi listener per il binary sensor di accensione clima (opzionale)
        if self.climate_power_sensor:
            self._remove_listeners.append(
                async_track_state_change_event(
                    self.hass, [self.climate_power_sensor], self._handle_climate_power_state
                )
            )
        await self._update_season()  # Imposta stagione all'avvio
        async_call_later(self.hass, 1, self._schedule_season_update)
        # RIPRISTINO TIMER DOPO RIAVVIO: controlla se il clima è acceso e riavvia auto timer se necessario
        async_call_later(self.hass, 5, self._restore_timers_after_restart)
        
        # Listener per azioni interattive delle notifiche push
        self._remove_listeners.append(
            self.hass.bus.async_listen(
                "mobile_app_notification_action", self._handle_notification_action
            )
        )
    @callback
    async def _handle_window_state(self, event):
        # Controllo direttamente tutte le finestre, usando l'ultimo stato valido per quelle offline
        window_states = []
        for ent in self.window_entities:
            state = self.hass.states.get(ent)
            if state and state.state not in ("unknown", "unavailable"):
                # Sensore online: aggiorna l'ultimo stato valido e usa quello corrente
                is_open = state.state == "on"
                self._last_valid_window_states[ent] = is_open
                window_states.append(is_open)
            elif ent in self._last_valid_window_states:
                # Sensore offline: usa l'ultimo stato valido noto
                window_states.append(self._last_valid_window_states[ent])
            else:
                # Sensore mai visto prima: assume chiuso per sicurezza
                window_states.append(False)
        
        # Se non ci sono finestre configurate, mantieni lo stato corrente
        if not window_states:
            return
            
        any_open = any(window_states)
        # Evita notifiche ripetute per lo stesso stato
        if any_open == self._window_open:
            return
        
        # Log dettagliato del cambio stato finestre
        opened_windows = [ent for ent, state in zip(self.window_entities, window_states) if state]
        closed_windows = [ent for ent, state in zip(self.window_entities, window_states) if not state]
        
        if any_open:
            _LOGGER.info(f"[{self.current_name}] 🪟 FINESTRE APERTE: {', '.join(opened_windows)}")
            if closed_windows:
                _LOGGER.info(f"[{self.current_name}] 🪟 Finestre chiuse: {', '.join(closed_windows)}")
            await self._on_window_open(reset_timer=True)
        elif not any_open and self._window_open:
            _LOGGER.info(f"[{self.current_name}] 🪟 TUTTE LE FINESTRE CHIUSE")
            await self._on_window_closed()
        
        self._window_open = any_open
        self._notify_window_state_callbacks()
    @callback
    async def _handle_climate_state(self, event):
        # Se sincronizzazione in corso, non gestire eventi
        if self._syncing_from_binary_sensor:
            return
        if self._ignore_next_state_change:
            self._ignore_next_state_change = False
            return
        new = event.data.get("new_state")
        old = event.data.get("old_state")
        if new is None or old is None:
            return
        new_state = new.state
        old_state = old.state
        # CONTROLLO AGGIUNTO: Non intervenire se il nuovo stato non è valido
        if new_state in ("unknown", "unavailable"):
            return
        # Se non c'è un sensore di temperatura esterno, monitora i cambiamenti di temperatura dal climate entity
        if not self.temperature_sensor and new_state != "off" and old_state != "off":
            # Controlla se è cambiata la temperatura corrente nel climate entity
            old_temp = None
            new_temp = None
            temp_attributes = ['current_temperature', 'current_temp', 'ambient_temperature', 'room_temperature', 'inside_temperature', 'temp']
            for attr in temp_attributes:
                if old.attributes.get(attr) is not None:
                    try:
                        old_temp = float(old.attributes.get(attr))
                        break
                    except Exception:
                        continue
            
            for attr in temp_attributes:
                if new.attributes.get(attr) is not None:
                    try:
                        new_temp = float(new.attributes.get(attr))
                        break
                    except Exception:
                        continue
            
            # Se è cambiata la temperatura, simula un evento temperature_state per i controlli soglia
            if old_temp != new_temp and new_temp is not None:
                # Simula l'evento per il controllo soglie
                temp_event = {
                    "new_state": type('obj', (object,), {
                        'state': str(new_temp), 
                        'attributes': {}
                    })(),
                    "old_state": type('obj', (object,), {
                        'state': str(old_temp) if old_temp is not None else "unknown", 
                        'attributes': {}
                    })()
                }
                await self._handle_temperature_state(temp_event)
            
        # Intervieni se si passa da 'off' a una modalità attiva VALIDA
        # e non c'è un binary sensor configurato (per evitare doppie notifiche)
        if old_state == "off" and new_state != "off" and not self.climate_power_sensor:
            _LOGGER.info(f"[{self.current_name}] 🔥 CLIMA ACCESO (da climate entity): {old_state} → {new_state}")
            self._shutdown_already_processed = False  # Reset flag per nuovo ciclo
            await self._on_climate_turned_on()
            # Avvia il timer di notifica di accensione SOLO se non è già in corso
            await self._start_timer_on_notification_if_needed()
        
        # Intervieni se si passa da una modalità attiva a 'off' (spegnimento)
        elif old_state != "off" and new_state == "off":
            _LOGGER.info(f"[{self.current_name}] ❄️ CLIMA SPENTO: {old_state} → {new_state}")
            _LOGGER.info(f"[{self.current_name}] ❄️ Spegnimento interno: {self._internal_shutdown}, Già processato: {self._shutdown_already_processed}")
            # LOGICA SEMPLIFICATA: Ferma sempre i timer quando il clima viene spento,
            # indipendentemente dalla causa (manuale o automatica)
            
            # Il timer di notifica si gestisce automaticamente nel sensore
            # (pausa per finestra aperta, stop per altri spegnimenti)
            _LOGGER.info(f"[{self.current_name}] 🔴 Spegnimento clima rilevato - timer notifica si autogestisce")
            
            # Evita doppia elaborazione dello stesso spegnimento (per eventi multipli ravvicinati)
            if self._shutdown_already_processed:
                if self.climate_power_sensor:
                    # Con binary sensor, questo è il SECONDO evento (binary sensor)
                    # Mantieni la logica del flag _internal_shutdown e poi resettalo
                    if self._internal_shutdown:
                        _LOGGER.info(f"[{self.current_name}] 🤖 SECONDO EVENTO - SPEGNIMENTO AUTOMATICO confermato da binary sensor")
                        self._internal_shutdown = False  # Reset flag dopo il secondo evento
                        return
                    else:
                        _LOGGER.info(f"[{self.current_name}] 👤 SECONDO EVENTO - SPEGNIMENTO MANUALE confermato da binary sensor")
                        await self.disable_automations_by_shutdown()  # Spegnimento esterno, disattiva automazioni e timer
                        return
                else:
                    # Senza binary sensor, blocca eventi duplicati
                    return
            
            self._shutdown_already_processed = True
            
            # Questo è il PRIMO evento
            # Distingui tra spegnimento interno (automazione) ed esterno (manuale/fisico)
            if self._internal_shutdown:
                _LOGGER.info(f"[{self.current_name}] 🤖 PRIMO EVENTO - SPEGNIMENTO AUTOMATICO (automazione) - Timer utente mantenuti")
                # Spegnimento interno (automazione): NON fermare i timer dell'utente
                # Con binary sensor, NON resettare il flag (aspetta il secondo evento)
                # Senza binary sensor, resetta subito MA SOLO DOPO aver evitato di fermare i timer
                if not self.climate_power_sensor:
                    self._internal_shutdown = False  # Reset flag solo se NON c'è binary sensor
                # IMPORTANTE: NON fermare i timer per spegnimento interno, esci subito
                return
            else:
                _LOGGER.info(f"[{self.current_name}] 👤 PRIMO EVENTO - SPEGNIMENTO MANUALE - Timer utente fermati, automazioni disabilitate")
                # Spegnimento esterno (manuale): ferma i timer dell'utente
                await self._stop_timer_countdown_sensors()
                
                # Primo evento di spegnimento esterno
                if not self.climate_power_sensor:
                    # Senza binary sensor, disattiva subito le automazioni
                    await self.disable_automations_by_shutdown()
                # Con binary sensor, aspetta il secondo evento per fermare le altre automazioni

        # CONTROLLO BLOCCO IMPOSTAZIONI: se le impostazioni sono bloccate, ripristina la configurazione
        # MA SOLO se NON è il timer che sta applicando le sue impostazioni (il timer ha priorità)
        if self._settings_locked and new_state != "off" and not self._timer_in_action:
            # Usa un delay per evitare conflitti con l'evento in corso
            from homeassistant.helpers.event import async_call_later
            async_call_later(self.hass, 2, self._check_and_restore_locked_settings)

    def _get_current_temperature(self):
        """Ottiene la temperatura corrente dal sensore esterno o dall'entità climate"""
        
        # Prima priorità: sensore di temperatura esterno specificato
        if self.temperature_sensor:
            state = self.hass.states.get(self.temperature_sensor)
            if state and state.state not in ("unknown", "unavailable"):
                try:
                    return float(state.state)
                except Exception:
                    pass
        
        # Seconda priorità: temperatura dall'entità climate
        climate_state = self.hass.states.get(self.climate_entity)
        if climate_state:
            # Lista degli attributi possibili per la temperatura corrente, in ordine di priorità
            temp_attributes = [
                'current_temperature',  # Standard Home Assistant
                'current_temp',         # Alternativo comune
                'ambient_temperature',  # Alcuni sistemi
                'room_temperature',     # Alcuni sistemi
                'inside_temperature',   # Alcuni sistemi
                'temp'                  # Abbreviato (solo se non è target)
            ]
            
            for attr in temp_attributes:
                temp_value = climate_state.attributes.get(attr)
                if temp_value is not None:
                    try:
                        temp_float = float(temp_value)
                        # Controllo di sicurezza: se l'attributo è 'temp', verifica che non sia uguale alla temperatura target
                        if attr == 'temp':
                            target_temp = climate_state.attributes.get('temperature')
                            if target_temp is not None and abs(temp_float - float(target_temp)) < 0.1:
                                continue
                        
                        return temp_float
                    except Exception:
                        continue
        
        return None

    @callback
    async def _handle_temperature_state(self, event):
        """Gestisce i cambiamenti di temperatura e controlla le soglie"""
        # Se automazione disabilitata, non gestire eventi
        if not self.automation_enabled:
            return
        
        # Gestione compatibilità: event può essere un vero evento Home Assistant o un dict simulato
        if hasattr(event, 'data'):
            # Evento reale da listener
            new = event.data.get("new_state")
            old = event.data.get("old_state")
        else:
            # Evento simulato (dict)
            new = event.get("new_state") 
            old = event.get("old_state")
        if new is None:
            return
            
        # Controlla solo se la temperatura è valida
        if new.state in ("unknown", "unavailable"):
            return
            
        try:
            temp = float(new.state)
        except (ValueError, TypeError):
            return
        
        # Controlla solo se il clima è acceso
        climate_state = self.hass.states.get(self.climate_entity)
        if not climate_state or climate_state.state == "off":
            return
            
        # Ottieni stagione e soglie
        season = await self._get_season()
        summer_threshold = float(self.get_option("summer_temp_threshold", 19))
        winter_threshold = float(self.get_option("winter_temp_threshold", 25))
        
        should_turn_off = False
        threshold_value = None
        season_mode = None
        
        # Controlla soglie in base alla stagione
        if season == "summer" and temp < summer_threshold:
            should_turn_off = True
            threshold_value = summer_threshold
            season_mode = "summer"
        elif season == "winter" and temp > winter_threshold:
            should_turn_off = True
            threshold_value = winter_threshold
            season_mode = "winter"
            
        if should_turn_off:
            # Spegnimento per soglia temperatura: ferma anche i timer switch dell'utente
            # NON impostare _internal_shutdown = True perché vogliamo fermare i timer
            self._ignore_next_state_change = True
            await self.hass.services.async_call(
                "climate", "turn_off", {"entity_id": self.climate_entity}, blocking=True
            )
            
            # Invia notifica
            msg_key = f"climate_blocked_{season_mode}"
            msg_tpl = self.messages.get(msg_key, f"Clima spento: temperatura fuori soglia ({threshold_value}°C).")
            msg = self._render_message(
                msg_tpl, 
                mode=season_mode, 
                temp=temp, 
                sensor=temp, 
                threshold=threshold_value
            )
            
            if self.is_msg_enabled(msg_key, "alexa") or self.is_msg_enabled(msg_key, "push"):
                await self._notify(msg, msg_key)

    @callback
    async def _handle_climate_power_state(self, event):
        """Gestisce i cambiamenti del binary sensor di accensione clima (per condizionatori non smart)"""
        # IMPORTANTE: Non controllare automation_enabled qui per permettere la riattivazione automatica
        # quando il clima viene riacceso dopo spegnimento manuale
            
        # CONTROLLO FLAG IGNORE: Se dobbiamo ignorare il prossimo cambio di stato, salta
        if self._ignore_next_state_change:
            self._ignore_next_state_change = False
            return
            
        old_state = event.data.get("old_state")
        new_state = event.data.get("new_state")
        
        if not new_state or new_state.state == "unavailable":
            return
            
        # Se il binary sensor passa da off a on, verifica se c'è discrepanza con HA
        if (old_state and old_state.state == "off" and new_state.state == "on") or \
           (not old_state and new_state.state == "on"):
            
            # Controlla lo stato attuale dell'entità climate in HA
            climate_state = self.hass.states.get(self.climate_entity)
            
            if climate_state and climate_state.state == "off":
                # DISCREPANZA: Binary sensor ON ma climate in HA OFF
                # Questo significa accensione fisica diretta (telecomando)
                
                # CONTROLLO FINESTRA: Se finestra aperta, NON sincronizzare, ma gestisci blocco
                if self._window_open:
                    await self._on_climate_turned_on()  # Gestisce il blocco finestra
                    return
                
                # Imposta flag per evitare loop di notifiche
                self._syncing_from_binary_sensor = True
                
                try:
                    # Sincronizzazione VIRTUALE (solo stato in HA, nessun comando fisico)
                    await self._sync_climate_entity_virtual()
                    
                    # Esegui controlli e notifiche
                    await self._on_climate_turned_on()
                    
                    # Avvia il timer di notifica di accensione SOLO se non è già in corso
                    await self._start_timer_on_notification_if_needed()
                finally:
                    # Rimuovi flag DOPO tutto per evitare interferenze
                    self._syncing_from_binary_sensor = False
                

            else:
                # Binary sensor ON e clima già ON in HA
                # Potrebbe essere un'accensione da HA che stava aspettando conferma dal binary sensor
                await self._on_climate_turned_on()
                # Avvia il timer di notifica di accensione SOLO se non è già in corso
                await self._start_timer_on_notification_if_needed()
        
        # Se il binary sensor passa da on a off, spegni l'entità climate in HA
        elif old_state and old_state.state == "on" and new_state.state == "off":
            
            # Il timer di notifica si autogestisce (pausa/stop automatico)
            
            # NOTA: NON impostare _internal_shutdown = True perché questo è spegnimento fisico/esterno
            # La logica in _handle_climate_state() si occuperà di fermare i timer switch
            
            # Spegni l'entità climate in Home Assistant per sincronizzarla
            self._ignore_next_state_change = True
            await self.hass.services.async_call(
                "climate", "turn_off", {"entity_id": self.climate_entity}, blocking=True
            )

    @callback
    async def _handle_notification_action(self, event):
        """Gestisce le azioni interattive delle notifiche push"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            action = event.data.get("action", "")
            
            # Verifica se l'azione è per questo coordinator
            if not action.endswith(f"_{self.entry_id}"):
                return
            
            room_name = self.get_option("room_name", self.current_name)
            
            # Ottieni la lingua configurata per i messaggi
            lang = (self.options.get("lingua") or 
                   self.config.get("lingua", "it"))
            
            if action.startswith(f"TURN_OFF_CLIMATE_{self.entry_id}"):
                # Azione: SPEGNI il clima
                logger.info(f"[{room_name}] Azione interattiva: Spegnimento clima richiesto")
                
                try:
                    # Spegni il clima
                    self._ignore_next_state_change = True
                    await self.hass.services.async_call(
                        "climate", "turn_off", 
                        {"entity_id": self.climate_entity}, 
                        blocking=True
                    )
                    
                    # Ferma il timer di notifica di accensione
                    await self._stop_timer_on_notification()
                    
                    # Cancella solo la notifica originale (conferma gestita da __init__.py)
                    await self._clear_notification()
                    
                    logger.info(f"[{room_name}] Clima spento tramite azione interattiva")
                    
                except Exception as e:
                    logger.error(f"[{room_name}] Errore spegnimento clima da notifica: {e}")
                    
            elif action.startswith(f"IGNORE_CLIMATE_{self.entry_id}"):
                # Azione: LASCIA ACCESO il clima
                logger.info(f"[{room_name}] Azione interattiva: Clima lasciato acceso")
                
                try:
                    # Ferma il timer di notifica corrente
                    await self._stop_timer_on_notification()
                    
                    # Riavvia il timer di notifica da zero
                    await self._start_timer_on_notification()
                    
                    # Cancella solo la notifica originale (conferma gestita da __init__.py)
                    await self._clear_notification()
                    
                    logger.info(f"[{room_name}] Timer notifica fermato e riavviato tramite azione interattiva")
                    
                except Exception as e:
                    logger.error(f"[{room_name}] Errore gestione azione ignora: {e}")
                    
        except Exception as e:
            logger.error(f"[{self.current_name}] Errore gestione azione notifica: {e}")

    async def _sync_climate_entity_virtual(self):
        """Sincronizzazione VIRTUALE: aggiorna solo lo stato in HA senza inviare comandi fisici"""
        try:
            # Determina configurazione stagionale per mostrare stato corretto
            season = await self._get_season()
            
            if season == "summer":
                hvac_mode = self.get_option("hvac_mode_summer", "cool")
                temperature = float(self.get_option("temperature_summer", 21))
                fan_mode = self.fan_mode_summer
            elif season == "winter":
                hvac_mode = self.get_option("hvac_mode_winter", "heat")
                temperature = float(self.get_option("temperature_winter", 21))
                fan_mode = self.fan_mode_winter
            else:
                hvac_mode = self.get_option("hvac_mode_summer", "cool")
                temperature = float(self.get_option("temperature_summer", 21))
                fan_mode = self.fan_mode_summer
            
            # Controlla compatibilità
            if not self._check_hvac_mode_compatibility(hvac_mode):
                hvac_mode = "cool"
            
            if fan_mode and not self._check_fan_mode_compatibility(fan_mode):
                fan_mode = None
            
            # SOLO aggiornamento stato virtuale - NO comandi fisici
            # Questo serve per allineare l'interfaccia HA con la realtà fisica
            self._ignore_next_state_change = True
            
            # Imposta modalità (comando virtuale che non influenza il dispositivo fisico)
            await self.hass.services.async_call(
                "climate", "set_hvac_mode", 
                {"entity_id": self.climate_entity, "hvac_mode": hvac_mode}, 
                blocking=True
            )
            
            # Imposta temperatura
            await self.hass.services.async_call(
                "climate", "set_temperature", 
                {"entity_id": self.climate_entity, "temperature": temperature}, 
                blocking=True
            )
            
            # Imposta ventola se supportata
            if fan_mode:
                await self.hass.services.async_call(
                    "climate", "set_fan_mode", 
                    {"entity_id": self.climate_entity, "fan_mode": fan_mode}, 
                    blocking=True
                )
            
            # VERIFICA E RETRY per sincronizzazione virtuale con binary sensor
            await self._verify_and_retry_climate_settings(hvac_mode, temperature, fan_mode)
            
        except Exception as e:
            pass



    async def _sync_climate_entity(self):
        """Sincronizza l'entità climate con il condizionatore fisico applicando la configurazione stagionale"""
        try:
            # Determina stagione e configurazione
            season = await self._get_season()
            
            if season == "summer":
                hvac_mode = self.get_option("hvac_mode_summer", "cool")
                temperature = float(self.get_option("temperature_summer", 21))
                fan_mode = self.fan_mode_summer
            elif season == "winter":
                hvac_mode = self.get_option("hvac_mode_winter", "heat")
                temperature = float(self.get_option("temperature_winter", 21))
                fan_mode = self.fan_mode_winter
            else:
                # Fallback su impostazioni estate
                hvac_mode = self.get_option("hvac_mode_summer", "cool")
                temperature = float(self.get_option("temperature_summer", 21))
                fan_mode = self.fan_mode_summer
            
            # Controlla compatibilità modalità
            if not self._check_hvac_mode_compatibility(hvac_mode):
                hvac_mode = "cool"  # Fallback
            
            if fan_mode and not self._check_fan_mode_compatibility(fan_mode):
                fan_mode = None
            
            # Accendi il clima con la modalità corretta
            
            # Ignora il prossimo cambio di stato per evitare loop
            self._ignore_next_state_change = True
            
            await self.hass.services.async_call(
                "climate", "set_hvac_mode", 
                {"entity_id": self.climate_entity, "hvac_mode": hvac_mode}, 
                blocking=True
            )
            
            # Imposta temperatura
            await self.hass.services.async_call(
                "climate", "set_temperature", 
                {"entity_id": self.climate_entity, "temperature": temperature}, 
                blocking=True
            )
            
            # Imposta ventola se supportata
            if fan_mode:
                await self.hass.services.async_call(
                    "climate", "set_fan_mode", 
                    {"entity_id": self.climate_entity, "fan_mode": fan_mode}, 
                    blocking=True
                )
            
            # VERIFICA E RETRY per sincronizzazione normale (senza binary sensor)
            await self._verify_and_retry_climate_settings(hvac_mode, temperature, fan_mode)
                
        except Exception as e:
            pass

    def register_timer_callback(self, cb):
        self._timer_callbacks.append(cb)

    def _notify_timer_callbacks(self):
        for cb in self._timer_callbacks:
            try:
                cb()
            except Exception:
                pass

    def register_prev_state_callback(self, cb):
        if not hasattr(self, '_prev_state_callbacks'):
            self._prev_state_callbacks = []
        self._prev_state_callbacks.append(cb)

    def _notify_prev_state_callbacks(self):
        if hasattr(self, '_prev_state_callbacks'):
            for cb in self._prev_state_callbacks:
                try:
                    cb()
                except Exception:
                    pass

    def register_window_state_callback(self, cb):
        if not hasattr(self, '_window_state_callbacks'):
            self._window_state_callbacks = []
        self._window_state_callbacks.append(cb)

    def _notify_window_state_callbacks(self):
        if hasattr(self, '_window_state_callbacks'):
            for cb in self._window_state_callbacks:
                try:
                    cb()
                except Exception:
                    pass

    def register_automation_status_callback(self, cb):
        if not hasattr(self, '_automation_status_callbacks'):
            self._automation_status_callbacks = []
        self._automation_status_callbacks.append(cb)

    def _notify_automation_status_callbacks(self):
        if hasattr(self, '_automation_status_callbacks'):
            for cb in self._automation_status_callbacks:
                try:
                    cb()
                except Exception:
                    pass

    def _force_update_settings_sensor(self):
        """Forza l'aggiornamento del sensore settings"""
        try:
            # Cerca il sensore settings tra le entità
            entry_data = self.hass.data.get("climate_manager", {}).get(self.entry_id, {})
            entities_data = entry_data.get("entities", {})
            sensor_entities = entities_data.get("sensor", [])
            
            for sensor in sensor_entities:
                if hasattr(sensor, '_attr_unique_id') and sensor._attr_unique_id.endswith('_settings'):
                    sensor._force_update()
                    break
                    
        except Exception as e:
            _LOGGER.error(f"Climate Manager: Errore aggiornando sensore settings: {e}")

    async def _on_window_open(self, reset_timer=False):
        climate_state = self.hass.states.get(self.climate_entity)
        current_hvac = climate_state.state if climate_state else "unknown"
        
        _LOGGER.info(f"[{self.current_name}] 🪟 GESTIONE FINESTRA APERTA - Stato clima: {current_hvac}")
        _LOGGER.info(f"[{self.current_name}] 🪟 Automazioni abilitate: {self.automation_enabled}, Reset timer: {reset_timer}")
        timeout_status = f"{self.window_open_timeout}s" if self.window_open_timeout > 0 else "DISABILITATO"
        _LOGGER.info(f"[{self.current_name}] 🪟 Delay spegnimento: {self.delay_before_off}s, Timeout finestre: {timeout_status}")
        
        if not self.automation_enabled:
            _LOGGER.info(f"[{self.current_name}] 🪟 Automazioni disabilitate - Nessuna azione")
            return
            
        # FERMA TIMER RIACCENSIONE (window_on_timer) se in corso
        if self._window_on_timer:
            _LOGGER.info(f"[{self.current_name}] 🪟 Fermato timer riaccensione finestre")
            self._window_on_timer()
            self._window_on_timer = None
            self._notify_timer_callbacks()
        
        if climate_state:
            if climate_state.state == "off":
                _LOGGER.info(f"[{self.current_name}] 🪟 Clima già spento - Nessuna azione necessaria")
                return
            # SALVA STATO PRECEDENTE
            prev_state = {
                "hvac_mode": climate_state.state,
                "temperature": climate_state.attributes.get("temperature"),
                "fan_mode": climate_state.attributes.get("fan_mode")
            }
            _LOGGER.info(f"[{self.current_name}] 💾 Salvato stato precedente: {prev_state}")
            self._climate_prev_state = prev_state
            self._notify_prev_state_callbacks()
            
        # TIMER GLOBALE: timeout massimo finestra aperta
        if self._window_timer:
            self._window_timer()
            self._window_timer = None
            self._notify_timer_callbacks()
        
        # TIMER SPEGNIMENTO: delay_before_off
        sensor_val = self._get_current_temperature()
        async def do_turn_off(_):
            # Spegnimento automazione interna (finestra aperta) - flag già impostato prima
            # Prova prima con turn_off, poi fallback su set_hvac_mode
            try:
                await self.hass.services.async_call(
                    "climate", "turn_off", {"entity_id": self.climate_entity}, blocking=True
                )
            except Exception as e:
                try:
                    await self.hass.services.async_call(
                        "climate", "set_hvac_mode", {"entity_id": self.climate_entity, "hvac_mode": "off"}, blocking=True
                    )
                except Exception as e2:
                    return
            
            # Controlla se il clima è già spento (potrebbe essere istantaneo)
            await asyncio.sleep(0.5)  # Piccolo ritardo per permettere al cambio di stato di propagarsi
            current_state = self.hass.states.get(self.climate_entity)
            
            if current_state and current_state.state == "off":
                pass
                
                # Se c'è binary sensor, aspetta che si aggiorni a "off"
                if self.climate_power_sensor:
                    await self._wait_for_binary_sensor_state_change("off", timeout=30.0)
            else:
                # Aspetta il cambio di stato a OFF tramite polling e listener
                climate_off_event = asyncio.Event()
                timeout_timer = None
                
                def on_climate_off(event):
                    entity_id = event.data.get("entity_id")
                    if entity_id == self.climate_entity:
                        new_state = event.data.get("new_state")
                        
                        if new_state and new_state.state == "off":
                            climate_off_event.set()
                
                def on_timeout(_):
                    climate_off_event.set()
                
                # Polling alternativo ogni 0.5 secondi
                async def polling_check():
                    for i in range(20):  # 10 secondi totali
                        await asyncio.sleep(0.5)
                        check_state = self.hass.states.get(self.climate_entity)
                        if check_state and check_state.state == "off":
                            climate_off_event.set()
                            return
                
                # Registra listener per cambio stato clima
                unsub_listener = self.hass.bus.async_listen(
                    "state_changed", 
                    on_climate_off
                )
                
                # Timer di sicurezza 10 secondi
                timeout_timer = async_call_later(self.hass, 30, on_timeout)
                
                # Avvia polling in background
                polling_task = asyncio.create_task(polling_check())
                
                try:
                    # Aspetta il cambio di stato a OFF o timeout
                    await climate_off_event.wait()
                    
                    # Se c'è binary sensor, aspetta che si aggiorni a "off"
                    if self.climate_power_sensor:
                        await self._wait_for_binary_sensor_state_change("off", timeout=30.0)
                finally:
                    # Pulisci listener, timer e task
                    unsub_listener()
                    if timeout_timer:
                        timeout_timer()
                    if not polling_task.done():
                        polling_task.cancel()
            
            # Ora invia la notifica
            msg = self.messages.get("window_open", "Clima spento per finestra aperta.")
            msg = self._render_message(
                msg,
                mode=self.season_mode,
                temp=self.get_option("temperature_summer" if self.season_mode=="summer" else "temperature_winter", None),
                fan=self.fan_mode_summer if self.season_mode=="summer" else self.fan_mode_winter,
                sensor=sensor_val,
                threshold=self.get_option("summer_temp_threshold" if self.season_mode=="summer" else "winter_temp_threshold", None)
            )
            if self.is_msg_enabled("window_open", "alexa") or self.is_msg_enabled("window_open", "push"):
                await self._notify(msg, "window_open")
        # Ferma eventuale timer spegnimento precedente
        if self._window_off_timer:
            _LOGGER.info(f"[{self.current_name}] 🪟 Fermato timer spegnimento precedente")
            self._window_off_timer()
            self._window_off_timer = None
            self._notify_timer_callbacks()
            
        # Imposta flag spegnimento interno PRIMA di avviare il processo
        self._internal_shutdown = True
        _LOGGER.info(f"[{self.current_name}] 🪟 Impostato flag spegnimento interno")
        
        # Avvia timer spegnimento con delay configurato
        if self.delay_before_off > 0:
            _LOGGER.info(f"[{self.current_name}] ⏰ Avviato timer spegnimento con delay: {self.delay_before_off}s")
            self._window_off_timer = async_call_later(self.hass, self.delay_before_off, do_turn_off)
        else:
            _LOGGER.info(f"[{self.current_name}] ⚡ Spegnimento immediato (nessun delay)")
            await do_turn_off(None)
        
        # TIMER GLOBALE: avvia solo DOPO aver iniziato processo spegnimento E solo se timeout > 0
        if self.window_open_timeout > 0:
            _LOGGER.info(f"[{self.current_name}] ⏰ Avviato timer globale finestre: {self.window_open_timeout}s")
            self._window_timer = async_call_later(
                self.hass, self.window_open_timeout, self._on_window_timeout
            )
            self._notify_timer_callbacks()
        else:
            _LOGGER.info(f"[{self.current_name}] ⏸️ Timer globale finestre disabilitato (timeout=0)")
            self._window_timer = None

    def _translate_mode(self, mode):
        # Traduzioni modalità HVAC
        translations = {
            "auto": "automatico",
            "cool": "raffrescamento",
            "heat": "riscaldamento",
            "fan_only": "ventilazione",
            "dry": "deumidificazione",
            "off": "spento",
            "summer": "estate",
            "winter": "inverno"
        }
        return translations.get(str(mode), str(mode))

    def _translate_fan_mode(self, fan):
        # Traduzioni fan mode
        translations = {
            "auto": "automatico",
            "low": "bassa",
            "medium": "media",
            "high": "alta"
        }
        return translations.get(str(fan), str(fan))

    def _translate_mode_en(self, mode):
        # Traduzioni modalità HVAC in inglese
        translations = {
            "auto": "auto",
            "cool": "cooling",
            "heat": "heating",
            "fan_only": "fan only",
            "dry": "dry",
            "off": "off",
            "summer": "summer",
            "winter": "winter"
        }
        return translations.get(str(mode), str(mode))

    def _translate_fan_mode_en(self, fan):
        # Traduzioni fan mode in inglese
        translations = {
            "auto": "auto",
            "low": "low",
            "medium": "medium",
            "high": "high"
        }
        return translations.get(str(fan), str(fan))

    def _render_message(self, template, mode=None, temp=None, fan=None, sensor=None, threshold=None, room=None, extra=None, version=None):
        msg = template
        if mode is not None:
            msg = msg.replace("{{mode}}", self._translate_mode(mode))
            msg = msg.replace("{{mode_en}}", self._translate_mode_en(mode))
        if temp is not None:
            temp_str = f"{int(round(float(temp)))} °"
            msg = msg.replace("{{temp}}", temp_str)
            msg = msg.replace("{{temp_en}}", temp_str)
        if sensor is not None:
            sensor_str = f"{int(round(float(sensor)))} °"
            msg = msg.replace("{{sensor}}", sensor_str)
            msg = msg.replace("{{sensor_en}}", sensor_str)
        if threshold is not None:
            threshold_str = f"{int(round(float(threshold)))} °"
            msg = msg.replace("{{threshold}}", threshold_str)
        if fan is not None:
            msg = msg.replace("{{fan}}", self._translate_fan_mode(fan))
            msg = msg.replace("{{fan_en}}", self._translate_fan_mode_en(fan))
        if version is not None:
            msg = msg.replace("{{version}}", str(version))
        if extra:
            for k, v in extra.items():
                msg = msg.replace(f"{{{{{k}}}}}", str(v))
        # Usa room_name se disponibile, altrimenti room esplicitamente passato, altrimenti current_name
        if room is not None:
            room_name = room
        else:
            room_name = self.get_option("room_name") or self.current_name
        msg = msg.replace("{{room}}", room_name)
        return msg

    async def _on_window_closed(self):
        climate_state = self.hass.states.get(self.climate_entity)
        current_hvac = climate_state.state if climate_state else "unknown"
        
        _LOGGER.info(f"[{self.current_name}] 🪟 FINESTRE CHIUSE - Stato clima: {current_hvac}")
        _LOGGER.info(f"[{self.current_name}] 🪟 Automazioni abilitate: {self.automation_enabled}")
        _LOGGER.info(f"[{self.current_name}] 🪟 Timeout scaduto: {self._window_timeout_expired}, Stato salvato: {self._climate_prev_state is not None}")
        
        if not self.automation_enabled:
            _LOGGER.info(f"[{self.current_name}] 🪟 Automazioni disabilitate - Nessun ripristino")
            return
            
        # Ferma TIMER GLOBALE (timeout massimo)
        if self._window_timer:
            _LOGGER.info(f"[{self.current_name}] 🪟 Fermato timer globale finestre")
            self._window_timer()
            self._window_timer = None
            self._notify_timer_callbacks()
        
        # Ferma TIMER SPEGNIMENTO (delay_before_off)
        if self._window_off_timer:
            _LOGGER.info(f"[{self.current_name}] 🪟 Fermato timer spegnimento finestre")
            self._window_off_timer()
            self._window_off_timer = None
            self._notify_timer_callbacks()
        
        # CONTROLLO SICURO dello stato clima
        if not climate_state:
            _LOGGER.warning(f"[{self.current_name}] 🪟 Stato clima non disponibile")
            return
            
        # Se il clima NON è stato spento (timer1 non scaduto), non fare nulla!
        if climate_state.state != "off":
            _LOGGER.info(f"[{self.current_name}] 🪟 Clima ancora acceso ({current_hvac}) - Nessun ripristino necessario")
            self._window_timeout_expired = False
            return
            
        # CONTROLLO DECISIONE: se è scaduto il timer globale (window_timeout_expired), NON fare nulla
        if self._window_timeout_expired:
            _LOGGER.info(f"[{self.current_name}] 🪟 Timeout finestre scaduto - Nessun ripristino")
            return
            
        # CONTROLLO: se non c'è stato salvato, non fare nulla
        if not self._climate_prev_state:
            _LOGGER.info(f"[{self.current_name}] 🪟 Nessuno stato precedente salvato - Nessun ripristino")
            return
            
        # CONDIZIONI SODDISFATTE: Timer globale NON scaduto + Clima spento + Stato salvato
        prev_mode = self._climate_prev_state.get("hvac_mode", "unknown")
        prev_temp = self._climate_prev_state.get("temperature", "unknown")
        prev_fan = self._climate_prev_state.get("fan_mode", "unknown")
        
        _LOGGER.info(f"[{self.current_name}] 🔄 AVVIO RIPRISTINO - Stato precedente: {prev_mode}, {prev_temp}°C, {prev_fan}")
        _LOGGER.info(f"[{self.current_name}] 🔄 Delay ripristino: {self.delay_before_on}s")
        
        self._window_timeout_expired = False
        
        async def do_restore(_):
            self._restore_in_progress = True
            
            mode = self._climate_prev_state.get("hvac_mode", "auto")
            temp = self._climate_prev_state.get("temperature")
            fan = self._climate_prev_state.get("fan_mode")
            sensor_val = self._get_current_temperature()
            
            # VALIDAZIONE COMPATIBILITÀ
            mode_valid = self._check_hvac_mode_compatibility(mode) if mode else False
            fan_valid = self._check_fan_mode_compatibility(fan) if fan else True  # fan può essere None
            temp_valid = temp is not None and isinstance(temp, (int, float)) and 10 <= temp <= 35
            
            if not mode_valid:
                # Pulizia e uscita
                self._climate_prev_state = None
                self._restore_in_progress = False
                self._notify_prev_state_callbacks()
                return
                
            # Ripristino robusto con controlli di successo
            async def restore_in_background():
                restore_success = False
                # IMPOSTA FLAG TEMPORIZZATO per evitare notifiche duplicate durante ripristino
                # Blocca notifiche per 10 secondi dall'inizio del ripristino
                self._skip_until_time = asyncio.get_event_loop().time() + 10.0
                try:
                    # 1. Imposta modalità HVAC
                    if mode and mode != "off":
                        await self.hass.services.async_call(
                            "climate", "set_hvac_mode", 
                            {"entity_id": self.climate_entity, "hvac_mode": mode}, 
                            blocking=True
                        )
                        await asyncio.sleep(0.5)
                        
                        # Verifica che la modalità sia stata impostata
                        check_state = self.hass.states.get(self.climate_entity)
                        if not check_state or check_state.state != mode:
                            raise Exception(f"Modalità {mode} non applicata correttamente")
                    
                    # 2. Imposta temperatura
                    if temp_valid:
                        await self.hass.services.async_call(
                            "climate", "set_temperature", 
                            {"entity_id": self.climate_entity, "temperature": temp}, 
                            blocking=True
                        )
                        await asyncio.sleep(0.3)
                    
                    # 3. Imposta ventola (se supportata)
                    if fan and fan_valid:
                        await self.hass.services.async_call(
                            "climate", "set_fan_mode", 
                            {"entity_id": self.climate_entity, "fan_mode": fan}, 
                            blocking=True
                        )
                        await asyncio.sleep(0.3)
                    # Attesa finale per stabilizzazione
                    await asyncio.sleep(1.0)
                    # VERIFICA FINALE del ripristino
                    final_state = self.hass.states.get(self.climate_entity)
                    if final_state and final_state.state not in ("off", "unknown", "unavailable"):
                        restore_success = True
                        # Se c'è binary sensor, aspetta che si aggiorni a "on" prima di inviare notifica
                        if self.climate_power_sensor:
                            binary_confirmed = await self._wait_for_binary_sensor_state_change("on", timeout=30.0)
                        # Invia messaggio di ripristino
                        msg_tpl = self.messages.get("resume", "Ripristino clima in modalità {{mode}} (ventola: {{fan}}) temperatura {{temp}}")
                        msg = self._render_message(
                            msg_tpl,
                            mode=mode,
                            temp=temp,
                            fan=fan,
                            sensor=sensor_val,
                            threshold=self.get_option("summer_temp_threshold" if self.season_mode=="summer" else "winter_temp_threshold", None)
                        )
                        if self.is_msg_enabled("resume", "alexa") or self.is_msg_enabled("resume", "push"):
                            await self._notify(msg, "resume")
                    else:
                        pass
                        
                except Exception as e:
                    restore_success = False
                finally:
                    # Pulizia sempre eseguita
                    # Rimuovi flag temporizzato
                    if hasattr(self, '_skip_until_time'):
                        delattr(self, '_skip_until_time')
                    self._climate_prev_state = None
                    self._restore_in_progress = False
                    self._notify_prev_state_callbacks()
            
            # Avvia il ripristino in background
            _LOGGER.info(f"[{self.current_name}] 🔄 Avviato ripristino in background")
            asyncio.create_task(restore_in_background())
            self._notify_timer_callbacks()
        
        # Avvia ripristino con o senza delay
        if not self._window_timeout_expired:
            # Ferma eventuale timer di ripristino precedente
            if self._window_on_timer:
                _LOGGER.info(f"[{self.current_name}] 🔄 Fermato timer ripristino precedente")
                self._window_on_timer()
                self._window_on_timer = None
                
            if self.delay_before_on > 0:
                _LOGGER.info(f"[{self.current_name}] ⏰ Avviato timer ripristino con delay: {self.delay_before_on}s")
                self._window_on_timer = async_call_later(self.hass, self.delay_before_on, do_restore)
            else:
                _LOGGER.info(f"[{self.current_name}] ⚡ Ripristino immediato (nessun delay)")
                await do_restore(None)
            self._notify_timer_callbacks()

    async def _on_window_timeout(self, *_):
        if not self.automation_enabled:
            return
        
        # FERMA tutti i timer attivi
        if self._window_on_timer:
            self._window_on_timer()
            self._window_on_timer = None
        
        # FERMA DEFINITIVAMENTE il timer di notifica accensione
        # Quando scade il timeout finestre, l'automazione "rinuncia" al ripristino
        _LOGGER.info(f"[{self.current_name}] 🔴 Timeout finestre scaduto - Fermando timer notifica definitivamente")
        await self._stop_timer_on_notification()
            
        sensor_val = self._get_current_temperature()
        msg = self.messages.get("window_open_long", "Finestra aperta troppo a lungo. Clima non ripristinato.")
        msg = self._render_message(
            msg,
            mode=self.season_mode,
            temp=self.get_option("temperature_summer" if self.season_mode=="summer" else "temperature_winter", None),
            fan=self.fan_mode_summer if self.season_mode=="summer" else self.fan_mode_winter,
            sensor=sensor_val,
            threshold=self.get_option("summer_temp_threshold" if self.season_mode=="summer" else "winter_temp_threshold", None)
        )
        if self.is_msg_enabled("window_open_long", "alexa") or self.is_msg_enabled("window_open_long", "push"):
            await self._notify(msg, "window_open_long")
            
        # Pulizia stato
        self._climate_prev_state = None
        self._notify_prev_state_callbacks()
        self._window_timer = None
        self._window_timeout_expired = True
        self._notify_timer_callbacks()

    async def _on_climate_turned_on(self):
        climate_state = self.hass.states.get(self.climate_entity)
        current_hvac = climate_state.state if climate_state else "unknown"
        current_temp = climate_state.attributes.get("temperature") if climate_state else None
        current_fan = climate_state.attributes.get("fan_mode") if climate_state else None
        
        _LOGGER.info(f"[{self.current_name}] 🔥 CLIMA ACCESO - Stato: {current_hvac}, Temp: {current_temp}°C, Fan: {current_fan}")
        _LOGGER.info(f"[{self.current_name}] 🔥 Automazioni abilitate: {self.automation_enabled}, Disabilitate da spegnimento: {self._automation_disabled_by_shutdown}")
        _LOGGER.info(f"[{self.current_name}] 🔥 Finestre aperte: {self._window_open}, Configurazione in corso: {self._configuring_climate}")
        _LOGGER.info(f"[{self.current_name}] 🔥 Ripristino in corso: {self._restore_in_progress}")
        
        # IMPORTANTE: NON riattivare automaticamente le automazioni se erano state disabilitate da spegnimento manuale
        # Le automazioni devono essere riattivate SOLO quando l'utente riaccende MANUALMENTE il clima
        # Il ripristino automatico delle finestre NON deve riattivare le automazioni
        if self._automation_disabled_by_shutdown and not self._restore_in_progress:
            # Questo è un accensione manuale dell'utente (non ripristino automatico)
            _LOGGER.info(f"[{self.current_name}] 🔄 Riattivazione automatica delle automazioni (accensione manuale)")
            await self.enable_automations(manual_reactivation=False)
        elif self._automation_disabled_by_shutdown and self._restore_in_progress:
            # Questo è un ripristino automatico - NON riattivare le automazioni
            _LOGGER.info(f"[{self.current_name}] 🚫 Ripristino automatico ignorato - Automazioni rimangono disabilitate (spegnimento manuale precedente)")
            return
        
        # Se l'automazione è disabilitata, non fare nulla
        if not self.automation_enabled:
            return
            
        # CONTROLLO PRIORITARIO: Se dobbiamo saltare le notifiche (ripristino in corso)
        if hasattr(self, '_skip_until_time') and asyncio.get_event_loop().time() < self._skip_until_time:
            return
        elif self._skip_next_on_ok:
            self._skip_next_on_ok = False
            return
            
        # Se configurazione già in corso, non fare nulla per evitare doppie notifiche
        if self._configuring_climate:
            return
            
        # PROTEZIONE ANTI-DUPLICATI: Evita solo chiamate identiche ravvicinate
        current_time = asyncio.get_event_loop().time()
        call_context = f"window_open:{self._window_open}_syncing:{self._syncing_from_binary_sensor}"
        
        if (hasattr(self, '_last_on_climate_call') and 
            hasattr(self, '_last_call_context') and
            (current_time - self._last_on_climate_call) < 1.0 and 
            self._last_call_context == call_context):
            return
            
        self._last_on_climate_call = current_time
        self._last_call_context = call_context
            
        # CONTROLLO FINESTRE - Se una finestra è aperta, spegni subito il clima
        if self._window_open:
            # SALVA lo stato SOLO se non è già salvato (mantieni quello originale)
            if not self._climate_prev_state:
                climate_state = self.hass.states.get(self.climate_entity)
                if climate_state and climate_state.state != "off":
                    self._climate_prev_state = {
                        "hvac_mode": climate_state.state,
                        "temperature": climate_state.attributes.get("temperature"),
                        "fan_mode": climate_state.attributes.get("fan_mode")
                    }
                    self._notify_prev_state_callbacks()
                    
                    # AVVIA Timer3 SOLO se non già attivo E solo se timeout > 0
                    if not self._window_timer and self.window_open_timeout > 0:
                        _LOGGER.info(f"[{self.current_name}] ⏰ Avviato timer globale finestre (finestra aperta durante accensione): {self.window_open_timeout}s")
                        self._window_timer = async_call_later(
                            self.hass, self.window_open_timeout, self._on_window_timeout
                        )
                        self._notify_timer_callbacks()
                    elif self.window_open_timeout <= 0:
                        _LOGGER.info(f"[{self.current_name}] ⏸️ Timer globale finestre disabilitato (timeout=0)")
                        self._window_timer = None
            
            # Spegni il clima e aspetta la conferma prima di inviare la notifica
            sensor_val = self._get_current_temperature()
            
            async def do_turn_off_and_notify():
                # Spegnimento automazione interna (finestra bloccata)
                self._internal_shutdown = True
                # Prova prima con turn_off, poi fallback su set_hvac_mode
                try:
                    await self.hass.services.async_call(
                        "climate", "turn_off", {"entity_id": self.climate_entity}, blocking=True
                    )
                except Exception as e:
                    try:
                        await self.hass.services.async_call(
                            "climate", "set_hvac_mode", {"entity_id": self.climate_entity, "hvac_mode": "off"}, blocking=True
                        )
                    except Exception as e2:
                        return
                
                # Controlla se il clima è già spento (potrebbe essere istantaneo)
                await asyncio.sleep(0.5)  # Piccolo ritardo per permettere al cambio di stato di propagarsi
                current_state = self.hass.states.get(self.climate_entity)
                
                if current_state and current_state.state == "off":
                    pass
                    
                    # Se c'è binary sensor, aspetta che si aggiorni a "off"
                    if self.climate_power_sensor:
                        await self._wait_for_binary_sensor_state_change("off", timeout=30.0)
                else:
                    # Aspetta il cambio di stato a OFF tramite polling e listener
                    climate_off_event = asyncio.Event()
                    timeout_timer = None
                    
                    def on_climate_off(event):
                        entity_id = event.data.get("entity_id")
                        if entity_id == self.climate_entity:
                            new_state = event.data.get("new_state")
                            
                            if new_state and new_state.state == "off":
                                climate_off_event.set()
                    
                    def on_timeout(_):
                        climate_off_event.set()
                    
                    # Polling alternativo ogni 0.5 secondi
                    async def polling_check():
                        for i in range(20):  # 10 secondi totali
                            await asyncio.sleep(0.5)
                            check_state = self.hass.states.get(self.climate_entity)
                            if check_state and check_state.state == "off":
                                climate_off_event.set()
                                return
                    
                    # Registra listener per cambio stato clima
                    unsub_listener = self.hass.bus.async_listen(
                        "state_changed", 
                        on_climate_off
                    )
                    
                    # Timer di sicurezza 10 secondi
                    timeout_timer = async_call_later(self.hass, 10, on_timeout)
                    
                    # Avvia polling in background
                    polling_task = asyncio.create_task(polling_check())
                    
                    try:
                        # Aspetta il cambio di stato a OFF o timeout
                        await climate_off_event.wait()
                        
                        # Se c'è binary sensor, aspetta che si aggiorni a "off"
                        if self.climate_power_sensor:
                            await self._wait_for_binary_sensor_state_change("off", timeout=30.0)
                    finally:
                        # Pulisci listener, timer e task
                        unsub_listener()
                        if timeout_timer:
                            timeout_timer()
                        if not polling_task.done():
                            polling_task.cancel()
                
                # Ora invia la notifica
                # Usa messaggio specifico per clima bloccato all'accensione
                msg = self.messages.get("window_blocked", "Clima bloccato per finestra aperta.")
                if not msg or msg == "Clima bloccato per finestra aperta.":
                    # Fallback: usa messaggio diverso dal normale window_open
                    msg = "Clima bloccato per finestra aperta."
                
                msg = self._render_message(
                    msg,
                    mode=self.season_mode,
                    temp=self.get_option("temperature_summer" if self.season_mode=="summer" else "temperature_winter", None),
                    fan=self.fan_mode_summer if self.season_mode=="summer" else self.fan_mode_winter,
                    sensor=sensor_val,
                    threshold=self.get_option("summer_temp_threshold" if self.season_mode=="summer" else "winter_temp_threshold", None)
                )
                
                # Controlla se window_blocked è abilitato per almeno un canale
                if self.is_msg_enabled("window_blocked", "alexa") or self.is_msg_enabled("window_blocked", "push"):
                    await self._notify(msg, "window_blocked")
            
            self._ignore_next_state_change = True
            await do_turn_off_and_notify()
            return
        
        # Controllo rapido del clima senza bloccare
        climate_state = self.hass.states.get(self.climate_entity)
        
        # Verifica la coerenza tra clima e binary sensor (SOLO se configurato)
        if self.climate_power_sensor and not self._syncing_from_binary_sensor:
            power_state = self.hass.states.get(self.climate_power_sensor)
            
            # CASO 1: Clima ON ma binary sensor OFF - attendi conferma
            if climate_state and climate_state.state != "off" and power_state and power_state.state != "on":
                # Non procedere finché il binary sensor non conferma
                return
                
            # CASO 2: Clima OFF ma binary sensor ON - sincronizza
            elif (not climate_state or climate_state.state == "off") and power_state and power_state.state == "on":
                # Sincronizza lo stato del clima con il binary sensor
                self._syncing_from_binary_sensor = True
                try:
                    await self._sync_climate_entity_virtual()
                finally:
                    self._syncing_from_binary_sensor = False
        
        # Verifica finale che il clima sia acceso
        if not climate_state or climate_state.state == "off":
            # Se il clima non è ancora acceso, esce senza bloccare
            return
                
        # Controlli temperatura
        sensor_val = self._get_current_temperature()
        
        season = await self._get_season()
        summer_threshold = float(self.get_option("summer_temp_threshold", 19))
        winter_threshold = float(self.get_option("winter_temp_threshold", 25))
        
        # Controllo temperatura valida
        if sensor_val is None:
            # Spegnimento per sensore temperatura non valido: ferma anche i timer switch
            # NON impostare _internal_shutdown = True perché vogliamo fermare i timer
            self._ignore_next_state_change = True
            await self.hass.services.async_call(
                "climate", "turn_off", {"entity_id": self.climate_entity}, blocking=True
            )
            msg = self.messages.get("climate_blocked_temp", "Clima spento: sensore temperatura non valido.")
            msg = self._render_message(msg, mode=season)
            if self.is_msg_enabled("climate_blocked_temp", "alexa") or self.is_msg_enabled("climate_blocked_temp", "push"):
                await self._notify(msg, "climate_blocked_temp")
            return
        
        # Controllo soglie stagionali
        should_turn_off = False
        threshold_value = None
        season_mode = None
        
        if season == "summer" and sensor_val < summer_threshold:
            should_turn_off = True
            threshold_value = summer_threshold
            season_mode = "summer"
        elif season == "winter" and sensor_val > winter_threshold:
            should_turn_off = True
            threshold_value = winter_threshold
            season_mode = "winter"
            
        if should_turn_off:
            # Spegnimento per soglia stagionale: ferma anche i timer switch dell'utente
            # NON impostare _internal_shutdown = True perché vogliamo fermare i timer
            self._ignore_next_state_change = True
            await self.hass.services.async_call(
                "climate", "turn_off", {"entity_id": self.climate_entity}, blocking=True
            )
            msg_key = f"climate_blocked_{season_mode}"
            msg_tpl = self.messages.get(msg_key, f"Clima spento: temperatura fuori soglia ({threshold_value}°C).")
            msg = self._render_message(
                msg_tpl, 
                mode=season_mode, 
                temp=sensor_val, 
                sensor=sensor_val, 
                threshold=threshold_value
            )
            if self.is_msg_enabled(msg_key, "alexa") or self.is_msg_enabled(msg_key, "push"):
                await self._notify(msg, msg_key)
            return
        
        # --- CONFIGURAZIONE AUTOMATICA CLIMA ---
        # Ottieni configurazione stagionale
        if season == "summer":
            hvac_mode = self.get_option("hvac_mode_summer", "cool")
            temperature = float(self.get_option("temperature_summer", 21))
            fan_mode = self.fan_mode_summer
            pass
        elif season == "winter":
            hvac_mode = self.get_option("hvac_mode_winter", "heat")
            temperature = float(self.get_option("temperature_winter", 21))
            fan_mode = self.fan_mode_winter
        else:
            return
            
        # Controlla compatibilità modalità PRIMA di applicare
        if not self._check_hvac_mode_compatibility(hvac_mode):
            return
        
        if fan_mode and not self._check_fan_mode_compatibility(fan_mode):
            fan_mode = None
        
        # --- CONFIGURAZIONE NON BLOCCANTE ---
        # Crea un task in background per la configurazione, senza bloccare i comandi dell'utente
        self._configuring_climate = True  # Imposta flag configurazione in corso
        
        async def configure_in_background():
            try:
                # 1. Imposta modalità HVAC
                await self.hass.services.async_call(
                    "climate", "set_hvac_mode", 
                    {"entity_id": self.climate_entity, "hvac_mode": hvac_mode}, 
                    blocking=False
                )
                await asyncio.sleep(0.3)
                
                # 2. Imposta temperatura
                await self.hass.services.async_call(
                    "climate", "set_temperature", 
                    {"entity_id": self.climate_entity, "temperature": temperature}, 
                    blocking=False
                )
                await asyncio.sleep(0.3)
                
                # 3. Imposta ventola (se configurata e supportata)
                if fan_mode:
                    await self.hass.services.async_call(
                        "climate", "set_fan_mode", 
                        {"entity_id": self.climate_entity, "fan_mode": fan_mode}, 
                        blocking=False
                    )
                    await asyncio.sleep(0.3)
                
                # 4. VERIFICA E RETRY - Controlla che le impostazioni siano state applicate
                success = await self._verify_and_retry_climate_settings(hvac_mode, temperature, fan_mode)
                
                # Se c'è binary sensor, aspetta che si aggiorni a "on"
                if self.climate_power_sensor:
                    await self._wait_for_binary_sensor_state_change("on", timeout=30.0)
                
                # --- MESSAGGIO FINALE ---
                # Se la finestra è appena stata chiusa, salta il messaggio (per evitare doppi messaggi)
                if self._skip_next_on_ok:
                    self._skip_next_on_ok = False
                    return
                
                # CONTROLLO AGGIUNTO: Verifica finale che il clima sia effettivamente acceso
                final_climate_state = self.hass.states.get(self.climate_entity)
                if not final_climate_state or final_climate_state.state in ("off", "unknown", "unavailable"):
                    # Il clima non è in uno stato valido, non inviare messaggio
                    return
                
                # Messaggio personalizzato accensione (modificato per includere stato verifica)
                msg_tpl = self.messages.get("climate_on_ok", "Acceso clima in modalità {{mode}} ventola {{fan}} temperatura {{temp}}")
                if success:
                    # Aggiunge informazione sul successo della verifica
                    msg = self._render_message(
                        msg_tpl + " ✓",
                        mode=hvac_mode,
                        temp=temperature,
                        fan=fan_mode,
                        sensor=sensor_val,
                        threshold=self.get_option("summer_temp_threshold" if season=="summer" else "winter_temp_threshold", None)
                    )
                else:
                    # Aggiunge warning se la verifica è fallita
                    msg = self._render_message(
                        msg_tpl + " ⚠️ (verificare impostazioni)",
                        mode=hvac_mode,
                        temp=temperature,
                        fan=fan_mode,
                        sensor=sensor_val,
                        threshold=self.get_option("summer_temp_threshold" if season=="summer" else "winter_temp_threshold", None)
                    )
                
                # Invia notifica solo se abilitata
                if (self.is_msg_enabled("climate_on_ok", "alexa") or self.is_msg_enabled("climate_on_ok", "push")):
                    await self._notify(msg, "climate_on_ok")
                
                # --- AUTO TIMER LOGIC ---
                # Se l'auto timer è attivo, avvia automaticamente il timer di spegnimento
                await self._check_and_start_auto_timer()
            finally:
                self._configuring_climate = False  # Resetta flag alla fine
        
        # Avvia configurazione in background
        asyncio.create_task(configure_in_background())

    async def _verify_and_retry_climate_settings(self, expected_hvac_mode, expected_temperature, expected_fan_mode):
        """Verifica che le impostazioni del clima siano corrette e riprova fino a 5 volte se necessario
        
        Args:
            expected_hvac_mode: Modalità HVAC attesa
            expected_temperature: Temperatura attesa
            expected_fan_mode: Modalità ventola attesa
            
        Returns:
            bool: True se le impostazioni sono corrette, False altrimenti
        """
        max_retries = 24
        retry_interval = 5.0  # 5 secondi tra ogni retry (24 retry in 120 secondi = 2 minuti)
        
        for retry in range(max_retries):
            # Aspetta un po' prima del controllo per dare tempo al dispositivo di sincronizzarsi
            if retry == 0:
                await asyncio.sleep(2.0)  # Prima verifica dopo 2 secondi
            else:
                await asyncio.sleep(retry_interval)
            
            # Verifica lo stato attuale
            climate_state = self.hass.states.get(self.climate_entity)
            if not climate_state or climate_state.state in ("off", "unknown", "unavailable"):
                _LOGGER.warning(f"Climate entity {self.climate_entity} non disponibile durante verifica (retry {retry + 1}/{max_retries})")
                continue
            
            # Controlla ogni impostazione
            hvac_ok = climate_state.state == expected_hvac_mode
            temp_ok = True
            fan_ok = True
            
            if expected_temperature is not None:
                actual_temp = climate_state.attributes.get("temperature")
                temp_ok = actual_temp is not None and abs(float(actual_temp) - float(expected_temperature)) < 0.5
            
            if expected_fan_mode is not None:
                actual_fan = climate_state.attributes.get("fan_mode")
                fan_ok = actual_fan == expected_fan_mode
            
            # Se tutto è OK, esci con successo
            if hvac_ok and temp_ok and fan_ok:
                _LOGGER.info(f"Impostazioni clima verificate con successo (retry {retry + 1}/{max_retries})")
                return True
            
            # Se non è l'ultimo retry, prova a correggere le impostazioni
            if retry < max_retries - 1:
                _LOGGER.warning(f"Impostazioni clima non corrette (retry {retry + 1}/{max_retries}). HVAC: {hvac_ok}, Temp: {temp_ok}, Fan: {fan_ok}")
                
                try:
                    # Reimposta solo le impostazioni che non sono corrette
                    if not hvac_ok:
                        await self.hass.services.async_call(
                            "climate", "set_hvac_mode",
                            {"entity_id": self.climate_entity, "hvac_mode": expected_hvac_mode},
                            blocking=False
                        )
                        await asyncio.sleep(0.3)
                    
                    if not temp_ok and expected_temperature is not None:
                        await self.hass.services.async_call(
                            "climate", "set_temperature",
                            {"entity_id": self.climate_entity, "temperature": expected_temperature},
                            blocking=False
                        )
                        await asyncio.sleep(0.3)
                    
                    if not fan_ok and expected_fan_mode is not None:
                        await self.hass.services.async_call(
                            "climate", "set_fan_mode",
                            {"entity_id": self.climate_entity, "fan_mode": expected_fan_mode},
                            blocking=False
                        )
                        await asyncio.sleep(0.3)
                        
                except Exception as e:
                    _LOGGER.error(f"Errore durante retry impostazioni clima: {e}")
            else:
                _LOGGER.error(f"FALLIMENTO: Impostazioni clima non applicate dopo {max_retries} tentativi. HVAC: {hvac_ok}, Temp: {temp_ok}, Fan: {fan_ok}")
        
        return False

    async def _restore_timers_after_restart(self, *_):
        """Ripristina i timer switch dopo un riavvio di Home Assistant
        
        Controlla se il clima è acceso e se dovrebbe esserci un timer attivo,
        e lo riavvia automaticamente.
        
        IMPORTANTE: Se il clima è acceso al riavvio, abilita automaticamente l'automazione
        SOLO se lo switch automazione è abilitato.
        """
        try:
            # Controlla se il clima è acceso
            climate_state = self.hass.states.get(self.climate_entity)
            is_climate_on = climate_state and climate_state.state != "off"
            
            _LOGGER.info(f"[{self.current_name}] 🔄 Ripristino al riavvio - Clima: {climate_state.state if climate_state else 'unknown'}, Automazione: {self.automation_enabled}")
            
            # CONTROLLO FONDAMENTALE: Verifica lo stato dello switch automazione
            automation_switch_enabled = False
            switch_found = False
            
            try:
                # Cerca lo switch automazione tra le entità
                entry_data = self.hass.data.get("climate_manager", {}).get(self.entry_id, {})
                entities_data = entry_data.get("entities", {})
                switch_entities = entities_data.get("switch", [])
                
                for switch in switch_entities:
                    if hasattr(switch, '_attr_unique_id') and switch._attr_unique_id.endswith('_automation_switch'):
                        automation_switch_enabled = switch.is_on
                        switch_found = True
                        _LOGGER.info(f"[{self.current_name}] 🔄 Switch automazione trovato - Stato: {'ON' if automation_switch_enabled else 'OFF'}")
                        break
                else:
                    # Switch non trovato - probabilmente entità non ancora caricate al riavvio
                    _LOGGER.debug(f"[{self.current_name}] 🔄 Switch automazione non ancora caricato - Ritento tra 10 secondi")
                    switch_found = False
                    automation_switch_enabled = False
                    
            except Exception as e:
                _LOGGER.error(f"[{self.current_name}] 🔄 Errore controllo switch automazione: {e}")
                automation_switch_enabled = False
                switch_found = False
            
            # Se lo switch non è stato trovato, probabilmente le entità non sono ancora caricate
            # Riprogramma un nuovo tentativo tra 10 secondi
            if not switch_found:
                _LOGGER.debug(f"[{self.current_name}] 🔄 Riprogrammando controllo switch automazione tra 10 secondi")
                async_call_later(self.hass, 10, self._restore_timers_after_restart)
                return
            
            # LOGICA PRINCIPALE: Lo switch automazione è il comando supremo
            if not automation_switch_enabled:
                _LOGGER.info(f"[{self.current_name}] 🔄 Switch automazione OFF - Automazione rimane DISABILITATA")
                # Assicurati che l'automazione sia disabilitata se lo switch è OFF
                if self.automation_enabled:
                    self.automation_enabled = False
                    self._notify_automation_status_callbacks()
                return
            
            # Se arriviamo qui, lo switch automazione è ON
            # LOGICA AL RIAVVIO: Se il clima è acceso E lo switch è ON, abilita automaticamente l'automazione
            # SOLO se non è stata disabilitata manualmente dall'utente
            if is_climate_on and not self.automation_enabled and not self._automation_disabled_manually:
                _LOGGER.info(f"[{self.current_name}] 🔄 Clima acceso al riavvio + Switch ON - Abilitazione automatica automazione")
                self.automation_enabled = True
                self._automation_disabled_by_shutdown = False
                # Notifica i callback per aggiornare subito il sensore
                self._notify_automation_status_callbacks()
                
                # Avvia anche il timer di notifica se configurato
                await self._start_timer_on_notification_if_needed()
            elif is_climate_on and not self.automation_enabled and self._automation_disabled_manually:
                _LOGGER.info(f"[{self.current_name}] 🔄 Clima acceso al riavvio + Switch ON - Automazione mantenuta DISABILITATA (disabilitazione manuale utente)")
            elif not is_climate_on:
                _LOGGER.info(f"[{self.current_name}] 🔄 Switch ON ma clima spento - Nessuna azione")
            
            # Se l'automazione non è abilitata, non fare altro
            if not self.automation_enabled:
                return
                
            # Se il clima è spento, non fare altro
            if not is_climate_on:
                return
                
            # Controlla se la finestra è aperta (non avviare timer se finestra aperta)
            if self._window_open:
                _LOGGER.info(f"[{self.current_name}] 🔄 Finestra aperta al riavvio - Timer non avviati")
                return
                
            # Usa la logica esistente per controllare e avviare l'auto timer
            await self._check_and_start_auto_timer()
            
        except Exception as e:
            _LOGGER.error(f"[{self.current_name}] Errore durante ripristino al riavvio: {e}")

    async def _check_and_start_auto_timer(self):
        """Controlla se l'auto timer è attivo e avvia il timer di spegnimento"""
        try:
            # Cerca lo switch auto timer
            entry_data = self.hass.data.get("climate_manager", {}).get(self.entry_id, {})
            entities_data = entry_data.get("entities", {})
            switch_entities = entities_data.get("switch", [])
            
            auto_timer_switch = None
            for switch in switch_entities:
                if hasattr(switch, '_attr_unique_id') and switch._attr_unique_id.endswith('_auto_timer_switch'):
                    auto_timer_switch = switch
                    break
            
            if not auto_timer_switch or not auto_timer_switch.is_on:
                return  # Auto timer non trovato o non attivo
            
            # Cerca il timer OFF switch
            timer_off_switch = None
            for switch in switch_entities:
                if hasattr(switch, '_attr_unique_id') and switch._attr_unique_id.endswith('_timer_off_switch'):
                    timer_off_switch = switch
                    break
            
            if not timer_off_switch:
                return
            
            # Se il timer OFF è già attivo, non fare nulla
            if timer_off_switch.is_on:
                return
            
            # Avvia il timer OFF
            await timer_off_switch.async_turn_on()
            
        except Exception as e:
            pass

    async def _stop_user_timers(self):
        """Ferma i timer switch dell'utente quando il clima viene spento manualmente
        
        NOTA: NON ferma i timer dell'automazione finestre (_window_timer, _window_off_timer, _window_on_timer)
        che devono continuare a funzionare per la logica interna dell'automazione.
        """
        try:
            # Cerca tutti gli switch timer
            entry_data = self.hass.data.get("climate_manager", {}).get(self.entry_id, {})
            entities_data = entry_data.get("entities", {})
            switch_entities = entities_data.get("switch", [])
            
            timer_stopped = False
            
            # Ferma il timer di spegnimento se attivo
            for switch in switch_entities:
                if hasattr(switch, '_attr_unique_id') and switch._attr_unique_id.endswith('_timer_off_switch'):
                    if switch.is_on:
                        await switch.async_turn_off()
                        timer_stopped = True
                    break
            
            # Ferma il timer di accensione se attivo
            for switch in switch_entities:
                if hasattr(switch, '_attr_unique_id') and switch._attr_unique_id.endswith('_timer_on_switch'):
                    if switch.is_on:
                        await switch.async_turn_off()
                        timer_stopped = True
                    break
            
            
        except Exception as e:
            pass

    async def disable_automations_by_shutdown(self):
        """Disattiva le automazioni quando il condizionatore viene spento manualmente"""
        if self.automation_enabled:
            _LOGGER.info(f"[{self.current_name}] 🚫 DISABILITATE AUTOMAZIONI (spegnimento manuale)")
            self.automation_enabled = False
            self._automation_disabled_by_shutdown = True
            
            # Ferma tutti i timer attivi (switch timer)
            _LOGGER.info(f"[{self.current_name}] 🚫 Fermati timer utente")
            await self._stop_user_timers()
            
            # IMPORTANTE: Ferma anche i timer delle finestre per spegnimento manuale
            _LOGGER.info(f"[{self.current_name}] 🚫 Fermati timer finestre")
            await self._stop_window_timers()
            
            # Notifica disabilitata su richiesta utente
            # (nessuna notifica inviata)
            
            _LOGGER.info(f"[{self.current_name}] 🚫 Automazioni disattivate per spegnimento manuale")
            
            # Notifica i callback
            self._notify_automation_status_callbacks()

    async def _stop_timer_countdown_sensors(self):
        """Ferma i sensori di countdown dei timer"""
        try:
            # Ottieni le entità sensore per questo config entry
            entities = self.hass.data["climate_manager"][self.entry_id]["entities"]["sensor"]
            
            # Ferma il timer ON
            for entity in entities:
                if hasattr(entity, '_attr_unique_id') and "timer_on_countdown" in entity._attr_unique_id:
                    await entity.stop_timer()
                    break
            
            # Ferma il timer OFF
            for entity in entities:
                if hasattr(entity, '_attr_unique_id') and "timer_off_countdown" in entity._attr_unique_id:
                    await entity.stop_timer()
                    break
                    
        except Exception as e:
            _LOGGER.error(f"[{self.current_name}] Errore durante stop timer countdown sensors: {e}")

    async def _get_timer_on_notification_sensor(self):
        """Ottiene il sensore timer di notifica di accensione"""
        try:
            entities = self.hass.data["climate_manager"][self.entry_id]["entities"]["sensor"]
            for entity in entities:
                if hasattr(entity, '_attr_unique_id') and "timer_on_notification" in entity._attr_unique_id:
                    return entity
        except Exception as e:
            _LOGGER.error(f"[{self.current_name}] Errore durante ricerca timer notification sensor: {e}")
        return None

    async def _start_timer_on_notification(self):
        """Avvia il timer di notifica di accensione"""
        notification_minutes = self.get_option("timer_on_notification_minutes", 0)
        _LOGGER.info(f"[{self.current_name}] Tentativo avvio timer notifica: {notification_minutes} minuti")
        
        if notification_minutes > 0:
            sensor = await self._get_timer_on_notification_sensor()
            if sensor:
                await sensor.start_timer()
                _LOGGER.info(f"[{self.current_name}] Timer notifica accensione avviato per {notification_minutes} minuti")
            else:
                _LOGGER.error(f"[{self.current_name}] Sensore timer notifica non trovato!")
        else:
            _LOGGER.info(f"[{self.current_name}] Timer notifica accensione non avviato: {notification_minutes} minuti (0 = disabilitato)")

    async def _start_timer_on_notification_if_needed(self):
        """Avvia il timer di notifica di accensione SOLO se non è già in corso"""
        notification_minutes = self.get_option("timer_on_notification_minutes", 0)
        
        if notification_minutes > 0:
            sensor = await self._get_timer_on_notification_sensor()
            if sensor:
                # Controlla se il timer è già in corso
                if getattr(sensor, '_is_running', False):
                    _LOGGER.info(f"[{self.current_name}] Timer notifica già in corso - NON riavviato (tempo accumulato: {getattr(sensor, '_elapsed_seconds', 0)}s)")
                    return
                else:
                    # Timer non in corso, avvialo
                    await sensor.start_timer()
                    _LOGGER.info(f"[{self.current_name}] Timer notifica accensione avviato per {notification_minutes} minuti")
            else:
                _LOGGER.error(f"[{self.current_name}] Sensore timer notifica non trovato!")
        else:
            _LOGGER.info(f"[{self.current_name}] Timer notifica accensione non avviato: {notification_minutes} minuti (0 = disabilitato)")

    async def _stop_timer_on_notification(self):
        """Ferma il timer di notifica di accensione"""
        try:
            sensor = await self._get_timer_on_notification_sensor()
            if sensor:
                await sensor.stop_timer()
                _LOGGER.info(f"[{self.current_name}] ✅ Timer notifica accensione fermato con successo")
            else:
                _LOGGER.warning(f"[{self.current_name}] ⚠️ Sensore timer notifica accensione non trovato per fermarlo")
        except Exception as e:
            _LOGGER.error(f"[{self.current_name}] ❌ Errore fermando timer notifica accensione: {e}")
            import traceback
            _LOGGER.error(f"Traceback: {traceback.format_exc()}")

    async def _stop_window_timers(self):
        """Ferma tutti i timer dell'automazione finestre quando clima spento manualmente"""
        try:
            timers_stopped = []
            
            # Ferma il timer di spegnimento finestra se attivo
            if hasattr(self, '_window_off_timer') and self._window_off_timer:
                self._window_off_timer()
                self._window_off_timer = None
                timers_stopped.append("Timer spegnimento finestra")
            
            # Ferma il timer di accensione finestra se attivo  
            if hasattr(self, '_window_on_timer') and self._window_on_timer:
                self._window_on_timer()
                self._window_on_timer = None
                timers_stopped.append("Timer accensione finestra")
            
            # Ferma il timer generico finestra se attivo
            if hasattr(self, '_window_timer') and self._window_timer:
                self._window_timer()
                self._window_timer = None
                timers_stopped.append("Timer finestra")
            
            if timers_stopped:
                _LOGGER.info(f"Climate Manager: Timer finestre fermati per spegnimento manuale: {', '.join(timers_stopped)}")
                
        except Exception as e:
            _LOGGER.error(f"Climate Manager: Errore fermando timer finestre: {e}")

    async def enable_automations(self, manual_reactivation=False):
        """Riattiva le automazioni"""
        if not self.automation_enabled:
            _LOGGER.info(f"[{self.current_name}] ✅ RIABILITATE AUTOMAZIONI")
            self.automation_enabled = True
            
            if manual_reactivation:
                _LOGGER.info(f"[{self.current_name}] ✅ Riattivazione manuale")
                self._automation_disabled_by_shutdown = False
                self._automation_disabled_manually = False  # Reset flag disabilitazione manuale
                
                # Notifica disabilitata
                # (nessuna notifica inviata)
                
            else:
                # Reset automatico (esempio: quando il clima viene riacceso)
                if self._automation_disabled_by_shutdown:
                    _LOGGER.info(f"[{self.current_name}] ✅ Riattivazione automatica (clima riacceso)")
                    self._automation_disabled_by_shutdown = False
                    
                    # (nessuna notifica inviata)
                    
            
            # Notifica i callback in entrambi i casi
            self._notify_automation_status_callbacks()
    
    def are_automations_disabled_by_shutdown(self):
        """Verifica se le automazioni sono state disabilitate da uno spegnimento manuale"""
        return self._automation_disabled_by_shutdown

    async def _notify(self, message: str, key: str = None):
        if not self.automation_enabled:
            return
        
        _LOGGER.debug(f"[{self.current_name}] _notify chiamata con messaggio: {message}, key: {key}")
        _LOGGER.debug(f"[{self.current_name}] _alexa_targets: {self._alexa_targets}")
        _LOGGER.debug(f"[{self.current_name}] push_targets: {self.push_targets}")
        
        # Notifica Alexa - solo se configurata e abilitata per questo messaggio
        if key and self.is_msg_enabled(key, "alexa") and self._alexa_targets:
            if self._is_notification_time("alexa"):
                _LOGGER.debug(f"[{self.current_name}] Invio notifica Alexa a: {self._alexa_targets}")
                for target in self._alexa_targets:
                    data = {"message": message}
                    try:
                        # Controllo per nuovo sistema notify Alexa
                        notify_entity = await self._get_alexa_notify_entity(target)
                        if notify_entity:
                            # Usa il nuovo sistema notify.send_message
                            await self.hass.services.async_call(
                                "notify", "send_message",
                                {
                                    "message": message,
                                    "entity_id": notify_entity
                                },
                                blocking=False
                            )
                            _LOGGER.debug(f"[{self.current_name}] Notifica Alexa (nuovo sistema) inviata a: {notify_entity}")
                        else:
                            # Usa il vecchio sistema alexa_media
                            await self.hass.services.async_call(
                                "notify", target,
                                data,
                                blocking=False
                            )
                            _LOGGER.debug(f"[{self.current_name}] Notifica Alexa (vecchio sistema) inviata a: notify.{target}")
                    except Exception as e:
                        _LOGGER.error(f"[{self.current_name}] Errore notifica Alexa notify.{target}: {e}")
        
        # Notifica Push - solo se configurata e abilitata per questo messaggio  
        if key and self.is_msg_enabled(key, "push") and self.push_targets:
            if self._is_notification_time("push"):
                for target in self.push_targets:
                    # Rimuovi il prefisso 'notify.' se presente
                    service_name = target
                    if service_name.startswith('notify.'):
                        service_name = service_name[7:]  # Rimuovi 'notify.'
                    
                    data = {"message": message}
                    try:
                        await self.hass.services.async_call(
                            "notify", service_name,
                            data,
                            blocking=False
                        )
                        _LOGGER.debug(f"[{self.current_name}] Notifica Push inviata a: notify.{service_name}")
                    except Exception as e:
                        _LOGGER.error(f"[{self.current_name}] Errore notifica Push notify.{service_name}: {e}")

    async def _get_alexa_notify_entity(self, alexa_target):
        """
        Rileva se esiste un'entità notify per il nuovo sistema Alexa.
        Controlla per entità con suffisso _speak e _announce.
        
        Args:
            alexa_target: Target nel formato alexa_media_{device}
            
        Returns:
            str: Entity ID dell'entità notify se trovata, None altrimenti
        """
        # Estrai il nome del dispositivo dal target alexa_media
        if not alexa_target.startswith("alexa_media_"):
            return None
            
        device_name = alexa_target.replace("alexa_media_", "")
        
        # Controlla se esistono entità notify con i nuovi suffissi
        possible_entities = [
            f"notify.{device_name}_speak",
            f"notify.{device_name}_announce"
        ]
        
        for entity_id in possible_entities:
            if self.hass.states.get(entity_id) is not None:
                _LOGGER.debug(f"[{self.current_name}] Trovata entità notify Alexa: {entity_id}")
                return entity_id
                
        _LOGGER.debug(f"[{self.current_name}] Nessuna entità notify trovata per {device_name}, uso sistema legacy")
        return None

    async def _notify_push_only(self, message: str, key: str = None):
        """Invia notifiche solo tramite push (non Alexa) - per conferme azioni interattive"""
        if not self.automation_enabled:
            return
        
        # PROTEZIONE CONTRO NOTIFICHE DUPLICATE PER CONFERME
        if key == "timer_action_confirm":
            # Controlla se questa notifica è già stata inviata di recente
            if not hasattr(self, '_last_confirm_notifications'):
                self._last_confirm_notifications = {}
            
            import time
            current_time = time.time()
            message_hash = hash(f"{message}_{self.entry_id}")
            
            # Se la stessa notifica è stata inviata negli ultimi 3 secondi, ignora
            if message_hash in self._last_confirm_notifications:
                last_sent = self._last_confirm_notifications[message_hash]
                if current_time - last_sent < 3.0:  # 3 secondi di debounce per conferme
                    return
            
            # Marca questa notifica come inviata
            self._last_confirm_notifications[message_hash] = current_time
            
            # Pulizia periodica delle notifiche vecchie
            keys_to_remove = []
            for msg_hash, timestamp in self._last_confirm_notifications.items():
                if current_time - timestamp > 10.0:  # Rimuovi dopo 10 secondi
                    keys_to_remove.append(msg_hash)
            for msg_hash in keys_to_remove:
                del self._last_confirm_notifications[msg_hash]
        
        # Notifica Push - solo se configurata e abilitata per questo messaggio  
        if self.push_targets:
            if self._is_notification_time("push"):
                for target in self.push_targets:
                    # Rimuovi il prefisso 'notify.' se presente
                    service_name = target
                    if service_name.startswith('notify.'):
                        service_name = service_name[7:]  # Rimuovi 'notify.'
                    
                    data = {"message": message}
                    try:
                        await self.hass.services.async_call(
                            "notify", service_name,
                            data,
                            blocking=False
                        )
                    except Exception:
                        pass

    async def _clear_notification(self):
        """Cancella solo la notifica originale senza inviare conferma"""
        if not self.automation_enabled:
            return
            
        # Cancella notifica Push - solo se configurata
        if self.push_targets:
            for target in self.push_targets:
                # Rimuovi il prefisso 'notify.' se presente
                service_name = target
                if service_name.startswith('notify.'):
                    service_name = service_name[7:]  # Rimuovi 'notify.'
                
                try:
                    if "telegram" in service_name.lower():
                        # Per Telegram: non possiamo cancellare messaggi precedenti
                        pass
                    else:
                        # Per notifiche push: cancella la notifica originale
                        try:
                            await self.hass.services.async_call(
                                "notify", service_name,
                                {
                                    "message": "clear_notification",
                                    "data": {
                                        "tag": f"climate_timer_{self.entry_id}"  # Cancella la notifica specifica
                                    }
                                },
                                blocking=False
                            )
                        except Exception:
                            pass  # Ignora errori di cancellazione
                            
                except Exception:
                    pass

    async def _clear_and_notify_push(self, message: str):
        """Cancella la notifica originale e invia una nuova notifica di conferma"""
        if not self.automation_enabled:
            return
        
        # Notifica Push - solo se configurata
        if self.push_targets:
            # Genera un ID per la nuova notifica
            import uuid
            new_notification_id = f"climate_confirm_{uuid.uuid4().hex[:8]}"
            
            for target in self.push_targets:
                # Rimuovi il prefisso 'notify.' se presente
                service_name = target
                if service_name.startswith('notify.'):
                    service_name = service_name[7:]  # Rimuovi 'notify.'
                
                try:
                    if "telegram" in service_name.lower():
                        # Per Telegram: invia solo messaggio di conferma (non possiamo cancellare messaggi precedenti)
                        await self.hass.services.async_call(
                            "notify", service_name,
                            {
                                "message": message,
                                "title": f"🔥 Climate Manager - {self.current_name}"
                            },
                            blocking=False
                        )
                    else:
                        # Per notifiche push: prima cancella la notifica originale, poi invia conferma
                        # Cancella la notifica con tag specifico
                        try:
                            await self.hass.services.async_call(
                                "notify", service_name,
                                {
                                    "message": "clear_notification",
                                    "data": {
                                        "tag": f"climate_timer_{self.entry_id}"  # Cancella la notifica specifica
                                    }
                                },
                                blocking=False
                            )
                        except Exception:
                            pass  # Ignora errori di cancellazione
                        
                        # Invia nuova notifica di conferma
                        await self.hass.services.async_call(
                            "notify", service_name,
                            {
                                "message": message,
                                "title": f"🔥 Climate Manager - {self.current_name}",
                                "data": {
                                    "tag": new_notification_id,
                                    "persistent": False  # Non persistente per conferma
                                }
                            },
                            blocking=False
                        )
                    
                except Exception:
                    pass

    async def _update_season(self, *_):
        if self.season_mode == "auto":
            month = datetime.now().month
            if 4 <= month <= 9:
                self._auto_season = "summer"
            else:
                self._auto_season = "winter"
        else:
            self._auto_season = self.season_mode

    async def _get_season(self):
        if self._auto_season:
            return self._auto_season
        await self._update_season()
        return self._auto_season

    async def _schedule_season_update(self, *_):
        await self._update_season()
        # Aggiorna ogni notte alle 3
        now = datetime.now()
        tomorrow = (now + timedelta(days=1)).replace(hour=3, minute=0, second=0, microsecond=0)
        seconds = (tomorrow - now).total_seconds()
        async_call_later(self.hass, seconds, self._schedule_season_update)

    def remove_listeners(self):
        for remove in self._remove_listeners:
            remove()
        self._remove_listeners = []

    def _update_options_safely(self, updates):
        """Aggiorna self._options in modo sicuro, gestendo i mappingproxy"""
        try:
            # Se self._options non esiste o è None, crealo
            if self._options is None:
                self._options = {}
            
            # Se è un mappingproxy, crea una copia mutabile
            if hasattr(self._options, '_data'):  # È un mappingproxy
                self._options = dict(self._options)
            
            # Gestisci esplicitamente i valori vuoti
            for key, value in updates.items():
                # Se il valore è None o stringa vuota, imposta esplicitamente una stringa vuota
                if key == "push_targets" and (value is None or value == ""):
                    self._options[key] = ""
                else:
                    self._options[key] = value
        except (TypeError, AttributeError):
            # Fallback: crea un nuovo dizionario
            current = dict(self._options) if self._options else {}
            current.update(updates)
            self._options = current

    @property
    def window_timeout_expired(self):
        return self._window_timeout_expired

    # --- AGGIUNTA: metodi di update per servizi custom ---
    async def set_season(self, season):
        self._update_options_safely({"season": season})
        await self._update_season()

    async def set_timer(self, timeout=None, delay_before_off=None, delay_before_on=None):
        updates = {}
        if timeout is not None:
            updates["timeout"] = timeout
        if delay_before_off is not None:
            updates["delay_before_off"] = delay_before_off
        if delay_before_on is not None:
            updates["delay_before_on"] = delay_before_on
        if updates:
            self._update_options_safely(updates)

    async def set_fan_mode(self, fan_mode_summer=None, fan_mode_winter=None):
        updates = {}
        if fan_mode_summer is not None:
            updates["fan_mode_summer"] = fan_mode_summer
        if fan_mode_winter is not None:
            updates["fan_mode_winter"] = fan_mode_winter
        if updates:
            self._update_options_safely(updates)
        self._fan_mode_summer = self._options.get("fan_mode_summer", "medium")
        self._fan_mode_winter = self._options.get("fan_mode_winter", "medium")

    async def set_temperature(self, temperature_summer=None, temperature_winter=None):
        updates = {}
        if temperature_summer is not None:
            updates["temperature_summer"] = temperature_summer
        if temperature_winter is not None:
            updates["temperature_winter"] = temperature_winter
        if updates:
            self._update_options_safely(updates)

    async def set_hvac_mode(self, hvac_mode_summer=None, hvac_mode_winter=None):
        updates = {}
        if hvac_mode_summer is not None:
            updates["hvac_mode_summer"] = hvac_mode_summer
        if hvac_mode_winter is not None:
            updates["hvac_mode_winter"] = hvac_mode_winter
        if updates:
            self._update_options_safely(updates)
            
    async def set_preset_mode(self, preset_mode_summer=None, preset_mode_winter=None):
        updates = {}
        if preset_mode_summer is not None:
            updates["preset_mode_summer"] = preset_mode_summer
        if preset_mode_winter is not None:
            updates["preset_mode_winter"] = preset_mode_winter
        if updates:
            self._update_options_safely(updates)

    async def set_notification_switch(self, msg_type, channel, value):
        key = f"enable_msgs_{channel}"
        # Ottieni il valore esistente, gestendo il caso di set errato
        existing_value = self._options.get(key, {})
        if isinstance(existing_value, set):
            # Se è un set, inizializza con dizionario vuoto
            d = {}
        elif isinstance(existing_value, dict):
            # Se è un dizionario, crea una copia
            d = dict(existing_value)
        else:
            # Per qualsiasi altro tipo, inizializza con dizionario vuoto
            d = {}
        d[msg_type] = value
        self._update_options_safely({key: d})

    async def set_notification_time_range(self, start=None, end=None):
        updates = {}
        if start is not None:
            updates["notification_time_start"] = start
        if end is not None:
            updates["notification_time_end"] = end
        if updates:
            self._update_options_safely(updates)

    async def set_push_targets(self, targets):
        # Assicurati che targets sia una stringa, anche se vuota
        if targets is None:
            targets = ""
        self._update_options_safely({"push_targets": targets})

    def update_window_entities(self):
        # Aggiorna la lista delle entità finestra e i listener
        ws = self.config.get("window_sensors")
        if self._options and "window_sensors" in self._options:
            ws = self._options["window_sensors"]
        if isinstance(ws, str):
            ws = [e.strip() for e in ws.split(",") if e.strip()]
        self.window_entities = ws
        # Rimuovi vecchi listener
        self.remove_listeners()
        # Ri-registra i listener sulle nuove entità
        hass = self.hass
        def update_group_state(*_):
            # Usa la stessa logica di filtro per stati validi, con ultimo stato valido per sensori offline
            window_states = []
            for ent in self.window_entities:
                state = hass.states.get(ent)
                if state and state.state not in ("unknown", "unavailable"):
                    # Sensore online: aggiorna l'ultimo stato valido e usa quello corrente
                    is_open = state.state == "on"
                    self._last_valid_window_states[ent] = is_open
                    window_states.append(is_open)
                elif ent in self._last_valid_window_states:
                    # Sensore offline: usa l'ultimo stato valido noto
                    window_states.append(self._last_valid_window_states[ent])
                else:
                    # Sensore mai visto prima: assume chiuso per sicurezza
                    window_states.append(False)
            
            if window_states:
                any_open = any(window_states)
                self._window_open = any_open
                self._notify_window_state_callbacks()
        update_group_state()
        for ent in self.window_entities:
            self._remove_listeners.append(
                async_track_state_change_event(hass, [ent], self._handle_window_state)
            )
        self._remove_listeners.append(
            async_track_state_change_event(
                self.hass, [self.climate_entity], self._handle_climate_state
            )
        )
        # Aggiungi listener per il sensore di temperatura o per il climate entity
        if self.temperature_sensor:
            # Se c'è un sensore esterno, usa quello
            self._remove_listeners.append(
                async_track_state_change_event(
                    self.hass, [self.temperature_sensor], self._handle_temperature_state
                )
            )
        else:
            # Se non c'è sensore esterno, ascolta il climate entity per temperature changes
            # Il listener per climate_entity è già aggiunto sopra, ma aggiungiamo un flag per sapere che dobbiamo monitorare anche la temperatura
            pass
        # Aggiungi listener per il binary sensor di accensione clima (se configurato)
        if self.climate_power_sensor:
            self._remove_listeners.append(
                async_track_state_change_event(
                    self.hass, [self.climate_power_sensor], self._handle_climate_power_state
                )
            )

    @property
    def options(self):
        return self._options

    async def async_set_options(self, value):
        old_sensor = getattr(self, 'temperature_sensor', None)
        new_sensor = value.get("temperature_sensor", self.config.get("temperature_sensor"))
        # Gestisci stringa speciale "__NONE__" come None
        if new_sensor == "__NONE__":
            new_sensor = None
        if old_sensor != new_sensor:
            pass
        old_climate = getattr(self, 'climate_entity', None)
        new_climate = value.get("climate_entity", self.config.get("climate_entity"))
        if old_climate != new_climate:
            pass
        old_windows = getattr(self, 'window_entities', None)
        new_windows = value.get("window_sensors", self.config.get("window_sensors"))
        if old_windows != new_windows:
            pass
        old_alexa = getattr(self, 'alexa_media', None)
        new_alexa = value.get("alexa_media", self.config.get("alexa_media"))
        if old_alexa != new_alexa:
            pass
        old_power_sensor = getattr(self, 'climate_power_sensor', None)
        new_power_sensor = value.get("climate_power_sensor", self.config.get("climate_power_sensor"))
        # Gestisci stringhe vuote come None
        if new_power_sensor == "":
            new_power_sensor = None
        if old_power_sensor != new_power_sensor:
            pass
        old_season = getattr(self, 'season_mode', None)
        new_season = value.get("season", self.config.get("season", "auto"))
        if old_season != new_season:
            pass
        
        # Controlla se il nome è cambiato
        old_name = self.config.get("name")
        new_name = value.get("name")
        name_changed = old_name != new_name
        
        self.season_mode = new_season
        self._options = value
        self.temperature_sensor = new_sensor
        self.climate_entity = new_climate
        self.climate_power_sensor = new_power_sensor
        self.alexa_media = new_alexa
        
        # Se il nome è cambiato, aggiorna anche il config (non solo le options)
        if name_changed and new_name:
            # Aggiorna il config per riflettere il nuovo nome (crea una copia mutabile)
            new_config = dict(self.config)
            new_config["name"] = new_name
            self.config = new_config
            
            # Aggiorna anche il titolo del config entry
            entry = next((e for e in self.hass.config_entries.async_entries("climate_manager") if e.entry_id == self.entry_id), None)
            if entry:
                self.hass.config_entries.async_update_entry(entry, title=new_name)
            # Forza l'aggiornamento delle entità che usano il nome
            await self._update_entities_names()
        
        self.update_window_entities()
        await self._update_season()

    async def _update_entities_names(self):
        """Forza l'aggiornamento dei nomi delle entità quando il nome della configurazione cambia"""
        # Notifica a tutte le entità che il nome è cambiato
        # Questo triggererà l'aggiornamento della loro rappresentazione in Home Assistant
        for callback in getattr(self, '_name_change_callbacks', []):
            try:
                await callback()
            except Exception:
                pass
    
    def register_name_change_callback(self, callback):
        """Registra un callback per essere notificato quando il nome cambia"""
        if not hasattr(self, '_name_change_callbacks'):
            self._name_change_callbacks = []
        self._name_change_callbacks.append(callback)

    async def refresh_settings_from_sensor(self):
        """Aggiorna le options del coordinatore leggendo dal sensore settings corrente"""
        try:
            # Cerca il sensore settings associato a questa climate entity
            settings_entity_id = None
            for entity_id in self.hass.states.async_entity_ids():
                if entity_id.startswith('sensor.climate_manager_settings_'):
                    state_obj = self.hass.states.get(entity_id)
                    if (
                        state_obj and
                        hasattr(state_obj, 'attributes') and
                        state_obj.attributes and
                        state_obj.attributes.get('climate_entity') == self.climate_entity
                    ):
                        settings_entity_id = entity_id
                        break
            
            if settings_entity_id:
                settings_state = self.hass.states.get(settings_entity_id)
                if settings_state and settings_state.attributes:
                    # Aggiorna le options con i valori dal sensore settings
                    updates = {}
                    for key, value in settings_state.attributes.items():
                        if key not in ['friendly_name', 'unit_of_measurement', 'device_class']:
                            updates[key] = value
                    if updates:
                        self._update_options_safely(updates)
                    
                    # Aggiorna le proprietà cached
                    self._fan_mode_summer = self._options.get("fan_mode_summer", "medium")
                    self._fan_mode_winter = self._options.get("fan_mode_winter", "medium")
                    self.season_mode = self._options.get("season", "auto")
                    await self._update_season()
                    
                    return True
        except Exception:
            pass
            
        return False

    def _validate_climate_state(self, expected_hvac_mode=None, expected_temperature=None, expected_fan_mode=None):
        """Convalida che le impostazioni siano state applicate al clima"""
        climate_state = self.hass.states.get(self.climate_entity)
        if not climate_state:
            return False
        
        validation_ok = True
        available_hvac_modes = climate_state.attributes.get("hvac_modes", [])
        available_fan_modes = climate_state.attributes.get("fan_modes", [])
        
        # Controlla HVAC mode
        if expected_hvac_mode:
            actual_hvac = climate_state.state
            if actual_hvac != expected_hvac_mode:
                validation_ok = False
        
        # Controlla temperatura
        if expected_temperature:
            actual_temp = climate_state.attributes.get("temperature")
            if actual_temp != expected_temperature:
                validation_ok = False
        
        # Controlla fan mode
        if expected_fan_mode:
            actual_fan = climate_state.attributes.get("fan_mode")
            if actual_fan != expected_fan_mode:
                validation_ok = False
        
        return validation_ok

    def _check_hvac_mode_compatibility(self, hvac_mode):
        """Controlla se una modalità HVAC è supportata dal climate"""
        climate_state = self.hass.states.get(self.climate_entity)
        if not climate_state:
            return False
        
        available_hvac_modes = climate_state.attributes.get("hvac_modes", [])
        return hvac_mode in available_hvac_modes

    def _check_fan_mode_compatibility(self, fan_mode):
        """Controlla se una modalità fan è supportata dal climate"""
        climate_state = self.hass.states.get(self.climate_entity)
        if not climate_state:
            return False
        
        available_fan_modes = climate_state.attributes.get("fan_modes", [])
        return fan_mode in available_fan_modes

    def _check_preset_mode_compatibility(self, preset_mode):
        """Controlla se una modalità preset è supportata dal climate"""
        climate_state = self.hass.states.get(self.climate_entity)
        if not climate_state:
            return False
        
        available_preset_modes = climate_state.attributes.get("preset_modes", [])
        return preset_mode in available_preset_modes

    async def _wait_for_climate_state_change(self, timeout=5.0):
        """Aspetta che il climate entity cambi stato o che scada il timeout"""
        initial_state = self.hass.states.get(self.climate_entity)
        if not initial_state:
            return
        
        initial_hvac = initial_state.state
        initial_temp = initial_state.attributes.get("temperature")
        initial_fan = initial_state.attributes.get("fan_mode")
        
        start_time = asyncio.get_event_loop().time()
        
        while (asyncio.get_event_loop().time() - start_time) < timeout:
            await asyncio.sleep(0.1)  # Controlla ogni 100ms
            
            current_state = self.hass.states.get(self.climate_entity)
            if not current_state:
                continue
                
            current_hvac = current_state.state
            current_temp = current_state.attributes.get("temperature")
            current_fan = current_state.attributes.get("fan_mode")
            
            # Controlla se c'è stato un cambio in almeno uno degli attributi
            if (current_hvac != initial_hvac or 
                current_temp != initial_temp or 
                current_fan != initial_fan):
                return

    async def _wait_for_binary_sensor_state_change(self, expected_state, timeout=30.0):
        """Aspetta che il binary sensor cambi allo stato atteso o che scada il timeout"""
        if not self.climate_power_sensor:
            return False        
        start_time = asyncio.get_event_loop().time()
        
        while (asyncio.get_event_loop().time() - start_time) < timeout:
            await asyncio.sleep(0.2)  # Controlla ogni 200ms (più lento per sensori di potenza)
            
            current_state = self.hass.states.get(self.climate_power_sensor)
            if not current_state or current_state.state == "unavailable":
                continue
                
            if current_state.state == expected_state:
                return True
        
        return False

    async def _enforce_locked_settings(self):
        """Forza le impostazioni configurate quando il blocco è attivo - SOLO se il clima è già acceso"""
        if not self._settings_locked:
            return
            
        # CONTROLLO CRITICO: Non accendere il clima se è spento, solo mantenere le impostazioni quando è acceso
        climate_state = self.hass.states.get(self.climate_entity)
        if not climate_state or climate_state.state == "off":
            return
        
        try:
            # Ottieni le impostazioni configurate per la stagione corrente
            season = await self._get_season()
            
            if season == "summer":
                target_hvac_mode = self.get_option("hvac_mode_summer", "cool")
                target_temperature = float(self.get_option("temperature_summer", 21))
                target_fan_mode = self.fan_mode_summer
                target_preset_mode = self.get_option("preset_mode_summer", None)
            elif season == "winter":
                target_hvac_mode = self.get_option("hvac_mode_winter", "heat")
                target_temperature = float(self.get_option("temperature_winter", 21))
                target_fan_mode = self.fan_mode_winter
                target_preset_mode = self.get_option("preset_mode_winter", None)
            else:
                # Fallback su estate
                target_hvac_mode = self.get_option("hvac_mode_summer", "cool")
                target_temperature = float(self.get_option("temperature_summer", 21))
                target_fan_mode = self.fan_mode_summer
                target_preset_mode = self.get_option("preset_mode_summer", None)
            
            # Verifica compatibilità
            if not self._check_hvac_mode_compatibility(target_hvac_mode):
                return
                
            if target_fan_mode and not self._check_fan_mode_compatibility(target_fan_mode):
                target_fan_mode = None
                
            if target_preset_mode and not self._check_preset_mode_compatibility(target_preset_mode):
                target_preset_mode = None
            
            # Applica le impostazioni SOLO se il clima è già acceso
            await self.hass.services.async_call(
                'climate', 'set_hvac_mode',
                {'entity_id': self.climate_entity, 'hvac_mode': target_hvac_mode}
            )
            
            await self.hass.services.async_call(
                'climate', 'set_temperature',
                {'entity_id': self.climate_entity, 'temperature': target_temperature}
            )
            
            if target_fan_mode:
                await self.hass.services.async_call(
                    'climate', 'set_fan_mode',
                    {'entity_id': self.climate_entity, 'fan_mode': target_fan_mode}
                )
                
            if target_preset_mode:
                await self.hass.services.async_call(
                    'climate', 'set_preset_mode',
                    {'entity_id': self.climate_entity, 'preset_mode': target_preset_mode}
                )
            
        except Exception:
            pass

    async def _check_and_restore_locked_settings(self, *_):
        """Ripristina le impostazioni bloccate quando cambiano - SOLO se il clima è già acceso"""
        if not self._settings_locked:
            return
        
        # CONTROLLO CRITICO: Non accendere il clima se è spento, solo mantenere le impostazioni quando è acceso
        climate_state = self.hass.states.get(self.climate_entity)
        if not climate_state or climate_state.state == "off":
            return
        
        try:
            # PRIORITÀ: Se il timer ha impostato impostazioni temporanee, usa quelle
            if self._locked_settings_override:
                target_hvac_mode = self._locked_settings_override.get("hvac_mode")
                target_temperature = self._locked_settings_override.get("temperature")
                target_fan_mode = self._locked_settings_override.get("fan_mode")
                target_preset_mode = self._locked_settings_override.get("preset_mode")
            else:
                # Altrimenti usa le impostazioni configurate per la stagione corrente
                season = await self._get_season()
                
                if season == "summer":
                    target_hvac_mode = self.get_option("hvac_mode_summer", "cool")
                    target_temperature = float(self.get_option("temperature_summer", 21))
                    target_fan_mode = self.fan_mode_summer
                    target_preset_mode = self.get_option("preset_mode_summer", None)
                elif season == "winter":
                    target_hvac_mode = self.get_option("hvac_mode_winter", "heat")
                    target_temperature = float(self.get_option("temperature_winter", 21))
                    target_fan_mode = self.fan_mode_winter
                    target_preset_mode = self.get_option("preset_mode_winter", None)
                else:
                    # Fallback su estate
                    target_hvac_mode = self.get_option("hvac_mode_summer", "cool")
                    target_temperature = float(self.get_option("temperature_summer", 21))
                    target_fan_mode = self.fan_mode_summer
                    target_preset_mode = self.get_option("preset_mode_summer", None)
            
            # Verifica compatibilità
            if not self._check_hvac_mode_compatibility(target_hvac_mode):
                return
                
            if target_fan_mode and not self._check_fan_mode_compatibility(target_fan_mode):
                target_fan_mode = None
                
            if target_preset_mode and not self._check_preset_mode_compatibility(target_preset_mode):
                target_preset_mode = None
            
            # Applica le impostazioni SOLO se il clima è già acceso
            await self.hass.services.async_call(
                'climate', 'set_hvac_mode',
                {'entity_id': self.climate_entity, 'hvac_mode': target_hvac_mode}
            )
            
            await self.hass.services.async_call(
                'climate', 'set_temperature',
                {'entity_id': self.climate_entity, 'temperature': target_temperature}
            )
            
            if target_fan_mode:
                await self.hass.services.async_call(
                    'climate', 'set_fan_mode',
                    {'entity_id': self.climate_entity, 'fan_mode': target_fan_mode}
                )
                
            if target_preset_mode:
                await self.hass.services.async_call(
                    'climate', 'set_preset_mode',
                    {'entity_id': self.climate_entity, 'preset_mode': target_preset_mode}
                )
            
        except Exception:
            pass
    
    def set_locked_settings_override(self, hvac_mode, temperature, fan_mode, preset_mode=None):
        """Imposta impostazioni temporanee da proteggere con il blocco (per timer ciclico)"""
        if self._settings_locked:
            self._locked_settings_override = {
                "hvac_mode": hvac_mode,
                "temperature": temperature,
                "fan_mode": fan_mode,
                "preset_mode": preset_mode
            }
    
    def clear_locked_settings_override(self):
        """Rimuove le impostazioni temporanee del timer"""
        self._locked_settings_override = None