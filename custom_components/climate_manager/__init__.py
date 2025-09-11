"""Climate Manager integration for Home Assistant."""

import logging
import os
from pathlib import Path
import asyncio

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry as ConfigType

from . import utils

from .const import DOMAIN, PLATFORMS
from .coordinator import ClimateManagerCoordinator

async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
  """Set up Climate Manager from yaml (not used)."""
  # Solo UI/config_flow
  
  # Pulisci la vecchia installazione della card
  await _cleanup_old_card_installation(hass)
  
  # Registra automaticamente la card Lovelace se esiste
  await _register_lovelace_card_if_exists(hass)
  
  return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
  """Set up Climate Manager from a config entry."""
  if DOMAIN not in hass.data:
    hass.data[DOMAIN] = {}



  coordinator = ClimateManagerCoordinator(
    hass, entry.entry_id, entry.data, entry.options
  )
  
  hass.data[DOMAIN][entry.entry_id] = {
    "coordinator": coordinator
  }

  await coordinator.async_config_entry_first_refresh()

  # NUOVA API multipiattaforma
  await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

  entry.async_on_unload(entry.add_update_listener(options_update_listener))

  # ---- REGISTRAZIONE SERVIZI CUSTOM ----
  async def _find_entry_id(call):
    # Permetti sia entity_id che entry_id
    entry_id = call.data.get("entry_id")
    entity_id = call.data.get("entity_id")
    if entry_id:
      return entry_id
    if entity_id:
      # entity_id -> entry_id
      for eid, data in hass.data[DOMAIN].items():
        coord = data["coordinator"]
        if coord.climate_entity == entity_id:
          return eid
    raise ValueError("entry_id o entity_id richiesto")

  async def _update_options(entry_id, updates):
    entry = next((e for e in hass.config_entries.async_entries(DOMAIN) if e.entry_id == entry_id), None)
    if not entry:
      raise ValueError(f"Config entry {entry_id} non trovata")
    # Crea una copia mutabile delle opzioni
    new_options = dict(entry.options) if entry.options else {}
    new_options.update(updates)
    hass.config_entries.async_update_entry(entry, options=new_options)
    # Aggiorna anche il coordinator live
    coord = hass.data[DOMAIN][entry_id]["coordinator"]
    await coord.async_set_options(new_options)
    # Sincronizza con il sensore settings corrente per avere sempre i valori aggiornati
    await coord.refresh_settings_from_sensor()

  # --- set_season ---
  async def handle_set_season(call):
    entry_id = await _find_entry_id(call)
    season = call.data["season"]
    await _update_options(entry_id, {"season": season})
    await hass.data[DOMAIN][entry_id]["coordinator"]._update_season()

  hass.services.async_register(DOMAIN, "set_season", handle_set_season)

  # --- set_timer ---
  async def handle_set_timer(call):
    entry_id = await _find_entry_id(call)
    updates = {}
    for k in ["timeout", "delay_before_off", "delay_before_on"]:
      if k in call.data:
        updates[k] = call.data[k]
    await _update_options(entry_id, updates)

  hass.services.async_register(DOMAIN, "set_timer", handle_set_timer)

  # --- set_fan_mode ---
  async def handle_set_fan_mode(call):
    entry_id = await _find_entry_id(call)
    for season in ["summer", "winter"]:
      key = f"fan_mode_{season}"
      if key in call.data:
        await _update_options(entry_id, {key: call.data[key]})

  hass.services.async_register(DOMAIN, "set_fan_mode", handle_set_fan_mode)

  # --- set_temperature ---
  async def handle_set_temperature(call):
    entry_id = await _find_entry_id(call)
    for season in ["summer", "winter"]:
      key = f"temperature_{season}"
      if key in call.data:
        await _update_options(entry_id, {key: call.data[key]})

  hass.services.async_register(DOMAIN, "set_temperature", handle_set_temperature)

  # --- set_hvac_mode ---
  async def handle_set_hvac_mode(call):
    entry_id = await _find_entry_id(call)
    for season in ["summer", "winter"]:
      key = f"hvac_mode_{season}"
      if key in call.data:
        await _update_options(entry_id, {key: call.data[key]})

  hass.services.async_register(DOMAIN, "set_hvac_mode", handle_set_hvac_mode)

  # --- set_notification_switch ---
  async def handle_set_notification_switch(call):
    entry_id = await _find_entry_id(call)
    msg_type = call.data["msg_type"]  # es: "window_open"
    channel = call.data["channel"]    # "alexa" o "push"
    value = call.data["value"]        # True/False
    key = f"enable_msgs_{channel}"
    entry = next((e for e in hass.config_entries.async_entries(DOMAIN) if e.entry_id == entry_id), None)
    # Crea una copia mutabile delle opzioni
    options = dict(entry.options) if entry.options else {}
    # Ottieni il valore esistente, gestendo il caso di set errato
    existing_value = options.get(key, {})
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
    await _update_options(entry_id, {key: d})

  hass.services.async_register(DOMAIN, "set_notification_switch", handle_set_notification_switch)

  # --- set_notification_time_range ---
  async def handle_set_notification_time_range(call):
    entry_id = await _find_entry_id(call)
    updates = {}
    # Push
    if "start_push" in call.data:
      updates["notification_time_start_push"] = call.data["start_push"]
    if "end_push" in call.data:
      updates["notification_time_end_push"] = call.data["end_push"]
    # Alexa
    if "start_alexa" in call.data:
      updates["notification_time_start_alexa"] = call.data["start_alexa"]
    if "end_alexa" in call.data:
      updates["notification_time_end_alexa"] = call.data["end_alexa"]
    await _update_options(entry_id, updates)

  hass.services.async_register(DOMAIN, "set_notification_time_range", handle_set_notification_time_range)

  # --- set_push_targets ---
  async def handle_set_push_targets(call):
    entry_id = await _find_entry_id(call)
    targets = call.data["targets"]
    await _update_options(entry_id, {"push_targets": targets})

  hass.services.async_register(DOMAIN, "set_push_targets", handle_set_push_targets)

  # --- set_room_name ---
  async def handle_set_room_name(call):
    entry_id = await _find_entry_id(call)
    room_name = call.data["room_name"]
    await _update_options(entry_id, {"room_name": room_name})

  hass.services.async_register(DOMAIN, "set_room_name", handle_set_room_name)

  # --- set_message ---
  async def handle_set_message(call):
    entry_id = await _find_entry_id(call)
    key = call.data["key"]  # es: msg_window_open
    value = call.data["value"]
    await _update_options(entry_id, {key: value})

  hass.services.async_register(DOMAIN, "set_message", handle_set_message)

  # --- set_option (generico per qualsiasi chiave) ---
  async def handle_set_option(call):
    entry_id = await _find_entry_id(call)
    key = call.data["key"]
    value = call.data["value"]
    await _update_options(entry_id, {key: value})

  hass.services.async_register(DOMAIN, "set_option", handle_set_option)

  # --- enable_automations ---
  async def handle_enable_automations(call):
    entry_id = await _find_entry_id(call)
    await hass.data[DOMAIN][entry_id]["coordinator"].enable_automations(manual_reactivation=True)

  hass.services.async_register(DOMAIN, "enable_automations", handle_enable_automations)



  # --- disable_automations ---
  async def handle_disable_automations(call):
    entry_id = await _find_entry_id(call)
    coordinator = hass.data[DOMAIN][entry_id]["coordinator"]
    coordinator.automation_enabled = False
    coordinator._automation_disabled_by_shutdown = False  # Non è da spegnimento ma da comando manuale
    
    # Ferma tutti i timer attivi (switch timer)
    await coordinator._stop_user_timers()
    
    # Ferma anche i countdown dei sensori timer direttamente
    await coordinator._stop_timer_countdown_sensors()
    
    # Ferma anche i timer delle finestre 
    await coordinator._stop_window_timers()
    
    # Notifica i callback
    coordinator._notify_automation_status_callbacks()

  hass.services.async_register(DOMAIN, "disable_automations", handle_disable_automations)

  # --- GESTORE EVENTI NOTIFICHE INTERATTIVE ---
  async def handle_mobile_app_notification_action(event):
    """Gestisce le azioni delle notifiche interattive dall'app mobile"""
    action = event.data.get("action", "")
    
    # Log per debug
    logging.getLogger(__name__).info(f"Climate Manager: Ricevuta azione notifica: {action}, event data: {event.data}")
    
    # PROTEZIONE CONTRO EVENTI DUPLICATI
    action_key = f"{action}_{event.data.get('actionData', {}).get('entity_id', 'unknown')}"
    if '_mobile_actions_processed' not in hass.data[DOMAIN]:
      hass.data[DOMAIN]['_mobile_actions_processed'] = {}
    
    import time
    current_time = time.time()
    
    # Se la stessa azione è stata processata negli ultimi 2 secondi, ignora
    if action_key in hass.data[DOMAIN]['_mobile_actions_processed']:
      last_processed = hass.data[DOMAIN]['_mobile_actions_processed'][action_key]
      if current_time - last_processed < 2.0:  # 2 secondi di debounce
        logging.getLogger(__name__).info(f"Climate Manager: Azione già processata di recente, ignoro: {action_key}")
        return
    
    # Marca questa azione come processata
    hass.data[DOMAIN]['_mobile_actions_processed'][action_key] = current_time
    
    # Pulizia periodica delle azioni vecchie (mantieni solo gli ultimi 10 secondi)
    keys_to_remove = []
    for key, timestamp in hass.data[DOMAIN]['_mobile_actions_processed'].items():
      if current_time - timestamp > 10.0:
        keys_to_remove.append(key)
    for key in keys_to_remove:
      del hass.data[DOMAIN]['_mobile_actions_processed'][key]
    
    if action.startswith("TURN_OFF_CLIMATE_"):
      entry_id = action.replace("TURN_OFF_CLIMATE_", "")
      if entry_id in hass.data[DOMAIN]:
        coordinator = hass.data[DOMAIN][entry_id]["coordinator"]
        try:
          # Spegni il clima
          await hass.services.async_call(
            'climate', 'set_hvac_mode', 
            {'entity_id': coordinator.climate_entity, 'hvac_mode': 'off'}
          )
          
          # Ferma il timer di notifica
          timer_sensor = await coordinator._get_timer_on_notification_sensor()
          if timer_sensor:
            await timer_sensor.stop_timer()
          
          # Invia notifica di conferma SOLO UNA VOLTA
          room_name = coordinator.get_option("room_name", "Stanza")
          
          # Traduci il messaggio di conferma
          lang = (coordinator.options.get("lingua") or 
                 coordinator.config.get("lingua", "it"))
          if lang == "en":
            confirm_msg = f"✅ Climate turned off in {room_name}"
          else:
            confirm_msg = f"✅ Clima spento in {room_name}"
          
          await coordinator._notify_push_only(confirm_msg, "timer_action_confirm")
          
        except Exception as e:
          logging.getLogger(__name__).error(f"Errore spegnimento clima da notifica: {e}")
    
    elif action.startswith("IGNORE_CLIMATE_"):
      entry_id = action.replace("IGNORE_CLIMATE_", "")
      if entry_id in hass.data[DOMAIN]:
        coordinator = hass.data[DOMAIN][entry_id]["coordinator"]
        try:
          # Ferma il timer di notifica per evitare spam
          timer_sensor = await coordinator._get_timer_on_notification_sensor()
          if timer_sensor:
            await timer_sensor.stop_timer()
          
          # Invia notifica di conferma SOLO UNA VOLTA
          room_name = coordinator.get_option("room_name", "Stanza")
          
          # Traduci il messaggio di conferma
          lang = (coordinator.options.get("lingua") or 
                 coordinator.config.get("lingua", "it"))
          if lang == "en":
            confirm_msg = f"ℹ️ Climate left on in {room_name}"
          else:
            confirm_msg = f"ℹ️ Clima lasciato acceso in {room_name}"
          
          await coordinator._notify_push_only(confirm_msg, "timer_action_confirm")
          
        except Exception as e:
          logging.getLogger(__name__).error(f"Errore gestione ignore clima da notifica: {e}")
    else:
      # Log per debug se l'azione non è riconosciuta
      logging.getLogger(__name__).warning(f"Climate Manager: Azione non riconosciuta: {action}")

  # Registra UN SOLO listener generico per tutte le notifiche mobile
  hass.bus.async_listen("mobile_app_notification_action", handle_mobile_app_notification_action)
  
  # RIMOSSI i listener duplicati per evitare eventi multipli:
  # hass.bus.async_listen("ios.notification_action_fired", handle_mobile_app_notification_action) 
  # hass.bus.async_listen("android.notification_action_fired", handle_mobile_app_notification_action)
  
  # --- GESTORE CALLBACK TELEGRAM ---
  async def handle_telegram_callback(event):
    """Gestisce i callback di Telegram per le notifiche interattive"""
    command = event.data.get("command", "")
    message_id = event.data.get("message", {}).get("message_id")
    chat_id = event.data.get("chat_id")
    
    # Log per debug
    logging.getLogger(__name__).info(f"Climate Manager: Ricevuto callback Telegram: {command}, message_id: {message_id}, chat_id: {chat_id}")
    
    # Protezione contro callback multipli usando message_id come chiave
    callback_key = f"{chat_id}_{message_id}_{command}"
    if '_telegram_callbacks_processed' not in hass.data[DOMAIN]:
      hass.data[DOMAIN]['_telegram_callbacks_processed'] = set()
    
    if callback_key in hass.data[DOMAIN]['_telegram_callbacks_processed']:
      logging.getLogger(__name__).info(f"Climate Manager: Callback già processato, ignoro: {callback_key}")
      return
    
    hass.data[DOMAIN]['_telegram_callbacks_processed'].add(callback_key)
    
    if command.startswith("/turn_off_climate_"):
      entry_id = command.replace("/turn_off_climate_", "")
      if entry_id in hass.data[DOMAIN]:
        coordinator = hass.data[DOMAIN][entry_id]["coordinator"]
        try:
          # Rimuovi i pulsanti dal messaggio originale
          if message_id and chat_id:
            try:
              await hass.services.async_call(
                'telegram_bot', 'edit_replymarkup',
                {
                  'message_id': message_id,
                  'chat_id': chat_id,
                  'inline_keyboard': []
                }
              )
            except Exception:
              # Ignora errori di "message not modified"
              pass
          
          # Spegni il clima
          await hass.services.async_call(
            'climate', 'set_hvac_mode', 
            {'entity_id': coordinator.climate_entity, 'hvac_mode': 'off'}
          )
          
          # Ferma il timer di notifica
          timer_sensor = await coordinator._get_timer_on_notification_sensor()
          if timer_sensor:
            await timer_sensor.stop_timer()
          
          # Ferma anche i timer di spegnimento (countdown)
          await coordinator._stop_timer_countdown_sensors()
          
          # Notifica di conferma gestita dal coordinatore (non più qui per evitare duplicati)
          
        except Exception as e:
          logging.getLogger(__name__).error(f"Errore spegnimento clima da Telegram: {e}")
    
    elif command.startswith("/ignore_climate_"):
      entry_id = command.replace("/ignore_climate_", "")
      if entry_id in hass.data[DOMAIN]:
        coordinator = hass.data[DOMAIN][entry_id]["coordinator"]
        try:
          # Rimuovi i pulsanti dal messaggio originale
          if message_id and chat_id:
            try:
              await hass.services.async_call(
                'telegram_bot', 'edit_replymarkup',
                {
                  'message_id': message_id,
                  'chat_id': chat_id,
                  'inline_keyboard': []
                }
              )
            except Exception:
              # Ignora errori di "message not modified"
              pass
          
          # Ferma il timer di notifica per evitare spam
          timer_sensor = await coordinator._get_timer_on_notification_sensor()
          if timer_sensor:
            await timer_sensor.stop_timer()
          
          # Notifica di conferma gestita dal coordinatore (non più qui per evitare duplicati)
          
        except Exception as e:
          logging.getLogger(__name__).error(f"Errore gestione ignore clima da Telegram: {e}")

  # Registra il listener per i callback di Telegram
  hass.bus.async_listen("telegram_callback", handle_telegram_callback)

  return True



async def _register_lovelace_card_if_exists(hass: HomeAssistant) -> None:
  """Registra automaticamente la card Lovelace se il file esiste."""
  
  try:
    # 1. Serve lovelace card
    path = Path(__file__).parent / "www"
    
    # Controlla se il file della card esiste
    if not (path / "climate-manager-card.js").exists():
      return
      
    utils.register_static_path(
      hass.http.app,
      "/climate_manager/www/climate-manager-card.js",
      path / "climate-manager-card.js",
    )
    
    # 2. Add card to resources
    version = getattr(hass.data["integrations"][DOMAIN], "version", 0)
    await utils.init_resource(
      hass, "/climate_manager/www/climate-manager-card.js", str(version)
    )
    
    logging.getLogger(__name__).info(f"Climate Manager card registrata: /climate_manager/www/climate-manager-card.js")
      
  except Exception as e:
    logging.getLogger(__name__).error(f"Errore registrazione risorsa Lovelace: {e}")
    # Non interrompere il setup per errori di registrazione


async def _cleanup_old_card_installation(hass: HomeAssistant) -> None:
  """Rimuove la vecchia installazione della card da /config/www/ e pulisce le risorse."""
  
  try:
    # Percorso del vecchio file nella cartella www globale
    old_card_path = Path(hass.config.config_dir) / "www" / "climate-manager-card.js"
    
    # Se il vecchio file esiste, rimuovilo
    if old_card_path.exists():
      old_card_path.unlink()
      logging.getLogger(__name__).info(f"Rimosso vecchio file card: {old_card_path}")
    
    # Pulisci le vecchie risorse Lovelace
    try:
      # Attendi che lovelace sia caricato
      for _ in range(5):
        try:
          resources = hass.data["lovelace"].resources
          break
        except (KeyError, AttributeError):
          await asyncio.sleep(1)
      
      if "lovelace" in hass.data and hasattr(hass.data["lovelace"], "resources"):
        resources = hass.data["lovelace"].resources
        await resources.async_get_info()
        
        # Cerca e rimuovi le vecchie risorse
        old_urls = [
          "/local/climate-manager-card.js",
          "/local/climate-manager-card.js?v=",
        ]
        
        items_to_remove = []
        for item in resources.async_items():
          item_url = item.get("url", "")
          for old_url in old_urls:
            if item_url.startswith(old_url):
              items_to_remove.append(item["id"])
              break
        
        # Rimuovi le vecchie risorse
        for item_id in items_to_remove:
          await resources.async_delete_item(item_id)
          logging.getLogger(__name__).info(f"Rimossa vecchia risorsa Lovelace: {item_id}")
    
    except Exception as e:
      logging.getLogger(__name__).debug(f"Errore pulizia risorse Lovelace: {e}")
      
  except Exception as e:
    logging.getLogger(__name__).debug(f"Errore pulizia vecchia installazione: {e}")


async def options_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
  await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
  """Unload a config entry."""
  unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

  if unloaded:
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator = data["coordinator"]
    
    coordinator.remove_listeners()
    
    hass.data[DOMAIN].pop(entry.entry_id)

  return unloaded
