import voluptuous as vol
from collections import OrderedDict
import logging
import uuid
import json
import os
from datetime import datetime

from homeassistant import config_entries
from homeassistant.const import CONF_NAME
from homeassistant.core import callback
from homeassistant.helpers.storage import Store

_LOGGER = logging.getLogger(__name__)
from homeassistant.helpers.selector import (
  EntitySelector,
  EntitySelectorConfig,
  NumberSelector,
  NumberSelectorConfig,
  BooleanSelector,
  TextSelector,
  TextSelectorConfig,
  TimeSelector,
  TimeSelectorConfig,
  SelectSelector,
  SelectSelectorConfig,
)

from .const import (
  DOMAIN,
  CONF_DELAY_BEFORE_OFF,
  CONF_DELAY_BEFORE_ON,
  CONF_CLIMATE_POWER_SENSOR,
  CONF_TIMER_ON_MINUTES,
  CONF_TIMER_OFF_MINUTES,
  CONF_TIMER_ON_NOTIFICATION_MINUTES,
  CONF_TIMER_OFF_HVAC_MODE_SELECTOR,
  CONF_TIMER_OFF_FAN_MODE_SELECTOR,
  ALEXA_MESSAGES,
)

# === GESTIONE MODELLI/TEMPLATE ===
TEMPLATES_STORAGE_KEY = "climate_manager_templates"
TEMPLATES_STORAGE_VERSION = 1

async def _get_templates_store(hass):
  """Ottiene lo store per i template"""
  return Store(hass, TEMPLATES_STORAGE_VERSION, TEMPLATES_STORAGE_KEY)

async def _load_templates(hass):
  """Carica i template salvati"""
  store = await _get_templates_store(hass)
  data = await store.async_load()
  return data.get("templates", {}) if data else {}

async def _save_templates(hass, templates):
  """Salva i template"""
  store = await _get_templates_store(hass)
  await store.async_save({"templates": templates})

async def _save_template(hass, template_name, config_data):
  """Salva un singolo template"""
  try:
    # Verifica che hass sia disponibile
    if not hass:
      raise ValueError("HomeAssistant instance non disponibile")
    
    # Verifica che template_name sia valido
    if not template_name or not isinstance(template_name, str):
      raise ValueError("Nome template non valido")
    
    # Verifica che config_data sia valido
    if not config_data or not isinstance(config_data, dict):
      raise ValueError("Dati configurazione non validi")
    
    templates = await _load_templates(hass)
    
    # Rimuovi dati sensibili/specifici che non devono essere nel template
    template_data = dict(config_data)
    sensitive_keys = [
      CONF_NAME, "climate_entity"
    ]
    
    for key in sensitive_keys:
      template_data.pop(key, None)
    
    # Aggiungi metadati
    template_data["_template_metadata"] = {
      "name": template_name,
      "created_at": datetime.now().isoformat(),
      "version": "1.0"
    }
    
    templates[template_name] = template_data
    await _save_templates(hass, templates)
    
    _LOGGER.info(f"Template '{template_name}' salvato con successo - {len(template_data)} campi")
    
  except Exception as e:
    _LOGGER.error(f"Errore critico nel salvare template '{template_name}': {e}")
    raise

async def _delete_template(hass, template_name):
  """Elimina un template"""
  templates = await _load_templates(hass)
  templates.pop(template_name, None)
  await _save_templates(hass, templates)

async def _get_template_options(hass):
  """Ottiene le opzioni per il selettore di template"""
  templates = await _load_templates(hass)
  options = []
  
  for name, data in templates.items():
    metadata = data.get("_template_metadata", {})
    created_at = metadata.get("created_at", "")
    if created_at:
      try:
        created_date = datetime.fromisoformat(created_at).strftime("%d/%m/%Y %H:%M")
      except:
        created_date = created_at
    else:
      created_date = "Data sconosciuta"
    
    options.append({
      "value": name,
      "label": f"{name} (creato: {created_date})"
    })
  
  return sorted(options, key=lambda x: x["label"])

# ---- costanti chiavi ----
CONF_CLIMATE           = "climate_entity"
CONF_WINDOW_SENSORS    = "window_sensors"
CONF_TEMP_SENSOR       = "temperature_sensor"
CONF_ROOM_NAME         = "room_name"
CONF_TIMEOUT           = "timeout"
CONF_SEASON            = "season"
CONF_ALEXA             = "alexa_media"
CONF_PUSH              = "push_targets"
CONF_MESSAGES          = "messages"
CONF_NOTIFY_TIME_START = "notification_time_start"
CONF_NOTIFY_TIME_END   = "notification_time_end"
CONF_FAN_MODE_SUMMER   = "fan_mode_summer"
CONF_FAN_MODE_WINTER   = "fan_mode_winter"
CONF_HVAC_MODE_SUMMER  = "hvac_mode_summer"
CONF_HVAC_MODE_WINTER  = "hvac_mode_winter"
SUMMER_TEMP_THRESHOLD  = "summer_temp_threshold"
WINTER_TEMP_THRESHOLD  = "winter_temp_threshold"

# default fallback
DEFAULT_HVAC = ["auto", "cool", "heat", "fan_only", "dry", "off"]
DEFAULT_FAN  = ["auto", "low", "medium", "high"]

def dropdown(options):
  return SelectSelector(
    SelectSelectorConfig(
      options=options,
      mode="dropdown"          # ⬅️ forza menu a tendina
    )
  )

def _get_notify_services(hass):
  """Ottiene tutti i servizi notify disponibili in Home Assistant"""
  notify_services = []
  
  # Ottieni tutti i servizi notify dal registry
  if hasattr(hass, 'services'):
    services = hass.services.async_services()
    notify_domain = services.get('notify', {})
    
    for service_name in notify_domain.keys():
      # Escludi il servizio generico 'notify' e 'persistent_notification'
      if service_name not in ['notify', 'persistent_notification']:
        display_name = service_name.replace('_', ' ').title()
        notify_services.append({
          "value": service_name,
          "label": f"{display_name} (notify.{service_name})"
        })
  
  # Ordina alfabeticamente
  notify_services.sort(key=lambda x: x["label"])
  
  return notify_services

def _convert_push_targets_to_list(push_targets_str):
  """Converte la stringa push_targets in lista per il selettore"""
  if not push_targets_str:
    return []
  
  # Rimuovi il prefisso 'notify.' se presente e splitta per virgola
  targets = []
  for target in push_targets_str.split(','):
    target = target.strip()
    if target.startswith('notify.'):
      target = target[7:]  # Rimuovi 'notify.'
    if target:
      targets.append(target)
  
  _LOGGER.debug(f"_convert_push_targets_to_list: {push_targets_str} -> {targets}")
  return targets

def _convert_list_to_push_targets(targets_list):
  """Converte la lista dal selettore in stringa push_targets"""
  if not targets_list:
    return ""
  
  # Aggiungi il prefisso 'notify.' se necessario
  formatted_targets = []
  for target in targets_list:
    # Se il target è già un servizio completo (notify.xxx), usalo così com'è
    if target.startswith('notify.'):
      formatted_targets.append(target)
    else:
      # Altrimenti aggiungi il prefisso notify.
      formatted_targets.append(f"notify.{target}")
  
  result = ', '.join(formatted_targets)
  _LOGGER.debug(f"_convert_list_to_push_targets: {targets_list} -> {result}")
  return result

class ClimateManagerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
  VERSION = 1

  def __init__(self):
    """Initialize the config flow."""
    super().__init__()
    self.climate_entity_id = None
    self.selected_language = None
    self.selected_template = None

  # ---------- STEP 1: Climate Entity ----------
  async def async_step_user(self, user_input=None):
    if user_input is not None:
      # Controlla se l'utente vuole importare da un modello
      if user_input.get("use_template", False):
        # Salva i dati di base
        self.climate_entity_id = user_input["climate_entity"]
        self.selected_language = user_input.get("lingua", "it")
        
        return await self.async_step_import_template()
      else:
        # Configurazione normale
        self.climate_entity_id = user_input["climate_entity"]
        self.selected_language = user_input.get("lingua", "it")
        
        return await self.async_step_options()

    return self.async_show_form(
      step_id="user", 
      data_schema=self._get_basic_schema()
    )

  # ---------- STEP: Importa da modello ----------
  async def async_step_import_template(self, user_input=None):
    """Step per importare da un modello esistente"""
    if user_input is not None:
      # Controlla se l'utente vuole gestire i template
      if user_input.get("manage_templates", False):
        return await self.async_step_manage_templates()
      
      # Controlla se l'utente vuole saltare
      if user_input.get("skip_template", False):
        return await self.async_step_options()
      
      template_name = user_input.get("template_name")
      if template_name:
        # Salva il template selezionato e vai al passo di personalizzazione
        self.selected_template = template_name
        return await self.async_step_customize_template()
      
      return await self.async_step_options()
    
    # Ottieni i template disponibili
    template_options = await _get_template_options(self.hass)
    
    if not template_options:
      # Nessun template disponibile, vai alla configurazione normale
      return await self.async_step_options()
    
    schema = vol.Schema({
      vol.Required("template_name", description={"translation_key": "template_name"}): 
        SelectSelector(SelectSelectorConfig(options=template_options, mode="dropdown")),
      vol.Optional("manage_templates", default=False, description={"translation_key": "manage_templates"}): BooleanSelector(),
      vol.Optional("skip_template", default=False, description={"translation_key": "skip_template"}): BooleanSelector(),
    })
    
    return self.async_show_form(
      step_id="import_template", 
      data_schema=schema
    )

  # ---------- STEP: Personalizza template ----------
  async def async_step_customize_template(self, user_input=None):
    """Step per personalizzare i campi specifici del template"""
    if user_input is not None:
      # Carica il template
      templates = await _load_templates(self.hass)
      template_data = templates.get(self.selected_template, {})
      
      if template_data:
        # Rimuovi i metadati del template
        template_data.pop("_template_metadata", None)
        
        # Sovrascrivi con i dati personalizzati dall'utente
        # Prima gestisci la conversione dei push targets
        if CONF_PUSH in user_input:
          push_targets_list = user_input[CONF_PUSH]
          user_input[CONF_PUSH] = _convert_list_to_push_targets(push_targets_list)
        
        # Gestisci i sensori opzionali
        temp_sensor = user_input.get(CONF_TEMP_SENSOR)
        if temp_sensor in [None, "", "None"]:
          user_input[CONF_TEMP_SENSOR] = "__NONE__"
        
        # Gestisci anche il sensore di accensione clima
        climate_power_sensor = user_input.get(CONF_CLIMATE_POWER_SENSOR)
        if climate_power_sensor in [None, "", "None"]:
          user_input[CONF_CLIMATE_POWER_SENSOR] = None
        
        template_data.update(user_input)
        
        # Aggiungi i dati di base
        template_data.update({
          "climate_entity": self.climate_entity_id,
          "lingua": self.selected_language
        })
        
        # Imposta il nome dal friendly_name dell'entità climate
        climate_state = self.hass.states.get(self.climate_entity_id)
        if climate_state:
          template_data[CONF_NAME] = climate_state.attributes.get("friendly_name", self.climate_entity_id)
        else:
          template_data[CONF_NAME] = self.climate_entity_id
        
        return self.async_create_entry(
          title=template_data[CONF_NAME],
          data=template_data
        )
      
      return await self.async_step_options()
    
    # Ottieni lista sensori di temperatura per SelectSelector
    temp_sensor_options = [{"value": "", "label": " "}]
    if hasattr(self, "hass"):
      for state in self.hass.states.async_all():
        if state.entity_id.startswith("sensor.") and state.attributes.get("unit_of_measurement") in ["°C", "°F"]:
          friendly_name = state.attributes.get("friendly_name", state.entity_id)
          temp_sensor_options.append({"value": state.entity_id, "label": f"{friendly_name} ({state.entity_id})"})

    # Ottieni lista servizi notify disponibili
    notify_services = []
    if hasattr(self, "hass"):
      notify_services = _get_notify_services(self.hass)
    
    # Schema solo con i campi da personalizzare
    # Ottieni lista sensori binary_sensor e sensor per SelectSelector (sensore accensione clima)
    climate_power_sensor_options = [{"value": "", "label": "Nessuno"}]
    if hasattr(self, "hass"):
      for state in self.hass.states.async_all():
        if (state.entity_id.startswith("binary_sensor.") or 
            (state.entity_id.startswith("sensor.") and state.attributes.get("device_class") in ["power", "energy", "running"])):
          friendly_name = state.attributes.get("friendly_name", state.entity_id)
          climate_power_sensor_options.append({"value": state.entity_id, "label": f"{friendly_name} ({state.entity_id})"})

    schema = vol.Schema({
      vol.Required(CONF_WINDOW_SENSORS, description={"translation_key": "window_sensors"}): EntitySelector(EntitySelectorConfig(domain=["binary_sensor"], multiple=True)),
      vol.Optional(CONF_TEMP_SENSOR, description={"translation_key": "temperature_sensor"}, default=""): SelectSelector(SelectSelectorConfig(options=temp_sensor_options, mode="dropdown")),
      vol.Optional(CONF_CLIMATE_POWER_SENSOR, description={"translation_key": "climate_power_sensor"}, default=""): SelectSelector(SelectSelectorConfig(options=climate_power_sensor_options, mode="dropdown")),
      vol.Optional(CONF_ROOM_NAME, description={"translation_key": "room_name"}): TextSelector(TextSelectorConfig()),
      vol.Required(CONF_ALEXA, description={"translation_key": "alexa_media"}): EntitySelector(EntitySelectorConfig(domain=["media_player"], multiple=True)),
      vol.Optional(CONF_PUSH, description={"translation_key": "push_targets"}): SelectSelector(SelectSelectorConfig(options=notify_services, multiple=True, mode="dropdown")),
    })
    
    return self.async_show_form(
      step_id="customize_template", 
      data_schema=schema
    )

  # ---------- STEP: Gestione template ----------
  async def async_step_manage_templates(self, user_input=None):
    """Step per gestire i template esistenti"""
    if user_input is not None:
      action = user_input.get("action")
      template_name = user_input.get("template_name")
      
      if action == "delete" and template_name:
        try:
          await _delete_template(self.hass, template_name)
          _LOGGER.info(f"Modello '{template_name}' eliminato con successo")
        except Exception as e:
          _LOGGER.error(f"Errore nell'eliminare il modello '{template_name}': {e}")
        
        # Ricarica la pagina per aggiornare la lista
        return await self.async_step_manage_templates()
      
      elif action == "rename" and template_name:
        new_name = user_input.get("new_template_name", "").strip()
        if new_name:
          try:
            templates = await _load_templates(self.hass)
            if template_name in templates:
              # Copia con nuovo nome
              template_data = templates[template_name]
              template_data["_template_metadata"]["name"] = new_name
              templates[new_name] = template_data
              # Elimina il vecchio
              del templates[template_name]
              await _save_templates(self.hass, templates)
              _LOGGER.info(f"Modello rinominato da '{template_name}' a '{new_name}'")
          except Exception as e:
            _LOGGER.error(f"Errore nel rinominare il modello: {e}")
        
        # Ricarica la pagina
        return await self.async_step_manage_templates()
      
      elif action == "back":
        return await self.async_step_import_template()
    
    # Ottieni i template disponibili
    template_options = await _get_template_options(self.hass)
    
    if not template_options:
      # Nessun template, torna indietro
      return await self.async_step_import_template()
    
    schema = vol.Schema({
      vol.Required("template_name", description={"translation_key": "template_name"}): 
        SelectSelector(SelectSelectorConfig(options=template_options, mode="dropdown")),
      vol.Required("action", description={"translation_key": "template_action"}): 
        SelectSelector(SelectSelectorConfig(options=[
          {"value": "delete", "label": "🗑️ Elimina modello"},
          {"value": "rename", "label": "✏️ Rinomina modello"},
          {"value": "back", "label": "⬅️ Torna indietro"}
        ], mode="dropdown")),
      vol.Optional("new_template_name", description={"translation_key": "new_template_name"}): 
        TextSelector(TextSelectorConfig()),
    })
    
    return self.async_show_form(
      step_id="manage_templates", 
      data_schema=schema
    )

  def _get_basic_schema(self):
    """Schema per la configurazione di base."""
    return vol.Schema({
      vol.Required("climate_entity", description={"translation_key": "climate_entity"}): EntitySelector(EntitySelectorConfig(domain=["climate"])),
      vol.Required("lingua", default="it", description={"translation_key": "lingua"}): SelectSelector(SelectSelectorConfig(options=[{"value": "it", "label": "Italiano"}, {"value": "en", "label": "English"}], mode="dropdown")),
      vol.Optional("use_template", default=False, description={"translation_key": "use_template"}): BooleanSelector(),
    })

  # ---------- STEP 2: tutte le altre opzioni ----------
  async def async_step_options(self, user_input=None):
    errors = {}
    climate_entity_id = getattr(self, "climate_entity_id", None)
    fan_modes  = DEFAULT_FAN.copy()
    hvac_modes = DEFAULT_HVAC.copy()
    if climate_entity_id and hasattr(self, "hass"):
      state = self.hass.states.get(climate_entity_id)
      if state:
        fan_modes  = state.attributes.get("fan_modes",  fan_modes)
        hvac_modes = state.attributes.get("hvac_modes", hvac_modes)

    # Ottieni lista sensori di temperatura per SelectSelector
    temp_sensor_options = [{"value": "", "label": " "}]
    if hasattr(self, "hass"):
      for state in self.hass.states.async_all():
        if state.entity_id.startswith("sensor.") and state.attributes.get("unit_of_measurement") in ["°C", "°F"]:
          friendly_name = state.attributes.get("friendly_name", state.entity_id)
          temp_sensor_options.append({"value": state.entity_id, "label": f"{friendly_name} ({state.entity_id})"})

    # Ottieni lista servizi notify disponibili
    notify_services = []
    if hasattr(self, "hass"):
      notify_services = _get_notify_services(self.hass)
    
    # Ottieni lista sensori binary_sensor e sensor per SelectSelector (sensore accensione clima)
    climate_power_sensor_options = [{"value": "", "label": " "}]
    if hasattr(self, "hass"):
      for state in self.hass.states.async_all():
        if (state.entity_id.startswith("binary_sensor.") or 
            (state.entity_id.startswith("sensor.") and state.attributes.get("device_class") in ["power", "energy", "running"])):
          friendly_name = state.attributes.get("friendly_name", state.entity_id)
          climate_power_sensor_options.append({"value": state.entity_id, "label": f"{friendly_name} ({state.entity_id})"})

    lang = getattr(self, "selected_language", "it")
    messages = ALEXA_MESSAGES.get(lang, ALEXA_MESSAGES["en"])
    
    message_fields = []
    for k, default_msg in messages.items():
      enable_key_alexa = f"enable_msg_{k}_alexa"
      enable_key_push  = f"enable_msg_{k}_push"
      msg_key          = f"msg_{k}"
      message_fields.append((vol.Optional(enable_key_alexa, default=True, description={"translation_key": enable_key_alexa}), BooleanSelector(),))
      message_fields.append((vol.Optional(enable_key_push, default=True, description={"translation_key": enable_key_push}), BooleanSelector(),))
      message_fields.append((vol.Required(msg_key, default=default_msg, description={"translation_key": msg_key}), TextSelector(TextSelectorConfig(multiline=True)),))

    # ---- schema completo senza 'name' ----
    data_schema = vol.Schema({
      # === SALVA COME MODELLO ===
      vol.Optional("save_as_template", default=False, description={"translation_key": "save_as_template"}): BooleanSelector(),
      vol.Optional("template_name_save", description={"translation_key": "template_name_save"}): TextSelector(TextSelectorConfig()),
      
      # === ENTITÀ PRINCIPALI ===
      vol.Required(CONF_CLIMATE, description={"translation_key": "climate_entity"}, default=self.climate_entity_id): EntitySelector(EntitySelectorConfig(domain=["climate"])),
      vol.Optional(CONF_TEMP_SENSOR, description={"translation_key": "temperature_sensor"}, default=""): SelectSelector(SelectSelectorConfig(options=temp_sensor_options, mode="dropdown")),
      vol.Optional(CONF_CLIMATE_POWER_SENSOR, description={"translation_key": "climate_power_sensor"}, default=""): SelectSelector(SelectSelectorConfig(options=climate_power_sensor_options, mode="dropdown")),
      vol.Required(CONF_WINDOW_SENSORS, description={"translation_key": "window_sensors"}): EntitySelector(EntitySelectorConfig(domain=["binary_sensor"], multiple=True)),
      
      # === NOME STANZA PER NOTIFICHE ===
      vol.Optional(CONF_ROOM_NAME, description={"translation_key": "room_name"}): TextSelector(TextSelectorConfig()),

      # === NOTIFICHE ===
      vol.Required(CONF_ALEXA, description={"translation_key": "alexa_media"}): EntitySelector(EntitySelectorConfig(domain=["media_player"], multiple=True)),
      vol.Optional(CONF_PUSH, description={"translation_key": "push_targets"}): SelectSelector(SelectSelectorConfig(options=notify_services, multiple=True, mode="dropdown")),

      # === TEMPORIZZAZIONI ===
      vol.Required(CONF_TIMEOUT, description={"translation_key": "timeout"}, default=15): NumberSelector(NumberSelectorConfig(min=0, max=1440, step=1, unit_of_measurement="min")),
      vol.Required(CONF_DELAY_BEFORE_OFF, description={"translation_key": "delay_before_off"}, default=0): NumberSelector(NumberSelectorConfig(min=0, max=86400, step=1, unit_of_measurement="s")),
      vol.Required(CONF_DELAY_BEFORE_ON, description={"translation_key": "delay_before_on"}, default=0): NumberSelector(NumberSelectorConfig(min=0, max=86400, step=1, unit_of_measurement="s")),
      vol.Optional(CONF_TIMER_ON_NOTIFICATION_MINUTES, description={"translation_key": "timer_on_notification_minutes"}, default=0): NumberSelector(NumberSelectorConfig(min=0, max=1440, step=1, unit_of_measurement="min")),

      # === MODALITÀ STAGIONALI ===
      vol.Required(CONF_SEASON, description={"translation_key": "season"}, default="auto"): dropdown(["auto", "summer", "winter"]),
      vol.Optional(CONF_HVAC_MODE_SUMMER, description={"translation_key": "hvac_mode_summer"}, default=hvac_modes[0]): dropdown(hvac_modes),
      vol.Optional(CONF_HVAC_MODE_WINTER, description={"translation_key": "hvac_mode_winter"}, default=hvac_modes[0]): dropdown(hvac_modes),
      vol.Optional(CONF_FAN_MODE_SUMMER, description={"translation_key": "fan_mode_summer"}, default=fan_modes[0]): dropdown(fan_modes),
      vol.Optional(CONF_FAN_MODE_WINTER, description={"translation_key": "fan_mode_winter"}, default=fan_modes[0]): dropdown(fan_modes),

      # === TEMPERATURE ===
      vol.Required("temperature_summer", description={"translation_key": "temperature_summer"}, default=21): NumberSelector(NumberSelectorConfig(min=17, max=30, step=1, unit_of_measurement="°C")),
      vol.Required("temperature_winter", description={"translation_key": "temperature_winter"}, default=21): NumberSelector(NumberSelectorConfig(min=17, max=30, step=1, unit_of_measurement="°C")),
      vol.Required(SUMMER_TEMP_THRESHOLD, description={"translation_key": "summer_temp_threshold"}, default=19): NumberSelector(NumberSelectorConfig(min=-20, max=50, step=1, unit_of_measurement="°C")),
      vol.Required(WINTER_TEMP_THRESHOLD, description={"translation_key": "winter_temp_threshold"}, default=25): NumberSelector(NumberSelectorConfig(min=-20, max=50, step=1, unit_of_measurement="°C")),
      
      # === ORARI NOTIFICHE ===
      vol.Optional("notification_time_start_alexa", description={"translation_key": "notification_time_start_alexa"}, default="08:00"): TimeSelector(TimeSelectorConfig()),
      vol.Optional("notification_time_end_alexa", description={"translation_key": "notification_time_end_alexa"}, default="22:00"): TimeSelector(TimeSelectorConfig()),
      vol.Optional("notification_time_start_push", description={"translation_key": "notification_time_start_push"}, default="08:00"): TimeSelector(TimeSelectorConfig()),
      vol.Optional("notification_time_end_push", description={"translation_key": "notification_time_end_push"}, default="22:00"): TimeSelector(TimeSelectorConfig()),

      
        **dict(message_fields)
    })

    if user_input is not None:
      # Controlla se l'utente vuole salvare come modello
      save_as_template = user_input.pop("save_as_template", False)
      template_name = user_input.pop("template_name_save", "")
      
      # PRE-VALIDAZIONE: pulisci i campi opzionali se vuoti per evitare errori EntitySelector
      temp_sensor_raw = user_input.get(CONF_TEMP_SENSOR)
      if temp_sensor_raw in [None, "", "None"]:
        user_input[CONF_TEMP_SENSOR] = None  # Rimuovi completamente il campo se vuoto
      
      # Gestisci anche il sensore di accensione clima
      climate_power_sensor_raw = user_input.get(CONF_CLIMATE_POWER_SENSOR)
      if climate_power_sensor_raw in [None, "", "None"]:
        user_input[CONF_CLIMATE_POWER_SENSOR] = None  # Rimuovi completamente il campo se vuoto
      
      msgs  = {k: user_input.pop(f"msg_{k}")          for k in messages}
      enab_alexa = {k: user_input.pop(f"enable_msg_{k}_alexa", True) for k in messages}
      enab_push  = {k: user_input.pop(f"enable_msg_{k}_push", True) for k in messages}
      
      # Gestisci il sensore di temperatura
      temp_sensor = user_input.get(CONF_TEMP_SENSOR)
      
      # Se nessun sensore selezionato o selezionato "Nessuno", salva "__NONE__"
      if temp_sensor in [None, "", "None"]:
        user_input[CONF_TEMP_SENSOR] = "__NONE__"
      
      # Converti la lista di servizi notify in stringa per compatibilità
      push_targets_list = user_input.get(CONF_PUSH, [])
      user_input[CONF_PUSH] = _convert_list_to_push_targets(push_targets_list)
      
      user_input[CONF_MESSAGES] = msgs
      user_input["enable_msgs_alexa"] = enab_alexa
      user_input["enable_msgs_push"] = enab_push
      user_input[CONF_CLIMATE] = self.climate_entity_id
      user_input["lingua"] = lang
      
      # Imposta valori di default per i timer rimossi (gestiti dalla card)
      user_input[CONF_TIMER_ON_MINUTES] = 10
      user_input[CONF_TIMER_OFF_MINUTES] = 60
      
      # Imposta name dal friendly_name dell'entità climate per il setup iniziale
      climate_state = self.hass.states.get(self.climate_entity_id)
      if climate_state:
        user_input[CONF_NAME] = climate_state.attributes.get("friendly_name", self.climate_entity_id)
      else:
        user_input[CONF_NAME] = self.climate_entity_id
      
      # Salva come modello se richiesto
      if save_as_template and template_name:
        try:
          # Assicurati che template_name sia valido
          if not template_name or template_name.strip() == "":
            _LOGGER.error("Nome template vuoto o non valido")
          else:
            # Crea una copia pulita dei dati per il template
            template_data = dict(user_input)
            
            # Verifica che i dati essenziali siano presenti
            if not template_data.get(CONF_CLIMATE):
              _LOGGER.error("Dati clima mancanti per il template")
            else:
              await _save_template(self.hass, template_name.strip(), template_data)
              _LOGGER.info(f"Modello '{template_name}' salvato con successo durante la configurazione iniziale")
        except Exception as e:
          _LOGGER.error(f"Errore nel salvare il modello '{template_name}' durante la configurazione iniziale: {e}")
          import traceback
          _LOGGER.error(f"Traceback completo: {traceback.format_exc()}")
      
      return self.async_create_entry(
        title=user_input[CONF_NAME],
        data=user_input
      )

    return self.async_show_form(step_id="options", data_schema=data_schema, errors=errors)

  # ---- importa da YAML (non usato) ----
  async def async_step_import(self, user_input=None):
    return await self.async_step_user(user_input)

  # ---- option-flow dopo l'installazione ----
  @staticmethod
  @callback
  def async_get_options_flow(config_entry):
    return OptionsFlowHandler(config_entry)


# ------------------------------------------------------------------
#                   OPTION FLOW (pulsante Configura)
# ------------------------------------------------------------------
class OptionsFlowHandler(config_entries.OptionsFlow):
  def __init__(self, config_entry):
    super().__init__()

  async def async_step_init(self, user_input=None):
    options = {**self.config_entry.data, **self.config_entry.options}
    lang = options.get("lingua", getattr(self.hass.config, "language", "en")[:2])
    messages = ALEXA_MESSAGES.get(lang, ALEXA_MESSAGES["en"])
    fan_modes  = DEFAULT_FAN.copy()
    hvac_modes = DEFAULT_HVAC.copy()
    climate_id = options.get(CONF_CLIMATE)
    if climate_id and hasattr(self, "hass"):
      state = self.hass.states.get(climate_id)
      if state:
        fan_modes  = state.attributes.get("fan_modes",  fan_modes)
        hvac_modes = state.attributes.get("hvac_modes", hvac_modes)
    fan_default  = options.get(CONF_FAN_MODE_SUMMER,  fan_modes[0])
    hvac_default = options.get(CONF_HVAC_MODE_SUMMER, hvac_modes[0])

    # Ottieni lista sensori di temperatura per SelectSelector
    temp_sensor_options = [{"value": "", "label": " "}]
    for state in self.hass.states.async_all():
      if state.entity_id.startswith("sensor.") and state.attributes.get("unit_of_measurement") in ["°C", "°F"]:
        friendly_name = state.attributes.get("friendly_name", state.entity_id)
        temp_sensor_options.append({"value": state.entity_id, "label": f"{friendly_name} ({state.entity_id})"})
    
    # Ottieni lista servizi notify disponibili
    notify_services = _get_notify_services(self.hass)
    
    # Gestione sensore temperatura 
    current_temp_sensor = options.get(CONF_TEMP_SENSOR, "")
    _LOGGER.debug(f"DEBUG: current_temp_sensor from options = '{current_temp_sensor}' (type: {type(current_temp_sensor)})")
    
    # Se è "__NONE__", mostra "Nessuno" come default
    temp_sensor_default = "" if current_temp_sensor == "__NONE__" else current_temp_sensor
    
    # Ottieni lista sensori binary_sensor e sensor per SelectSelector (sensore accensione clima)
    climate_power_sensor_options = [{"value": "", "label": " "}]
    for state in self.hass.states.async_all():
      if (state.entity_id.startswith("binary_sensor.") or 
          (state.entity_id.startswith("sensor.") and state.attributes.get("device_class") in ["power", "energy", "running"])):
        friendly_name = state.attributes.get("friendly_name", state.entity_id)
        climate_power_sensor_options.append({"value": state.entity_id, "label": f"{friendly_name} ({state.entity_id})"})
    
    # Gestione sensore accensione clima - mostra valore corrente o "Nessuno"
    current_climate_power_sensor = options.get(CONF_CLIMATE_POWER_SENSOR, "")
    climate_power_sensor_default = current_climate_power_sensor if current_climate_power_sensor else ""
    
    # Gestione push targets - converti da stringa a lista per il selettore
    current_push_targets = options.get(CONF_PUSH, "")
    push_targets_default = _convert_push_targets_to_list(current_push_targets)
    message_fields = []
    for k, default_msg in messages.items():
      enable_key_alexa = f"enable_msg_{k}_alexa"
      enable_key_push  = f"enable_msg_{k}_push"
      msg_key          = f"msg_{k}"
      message_fields.append((vol.Optional(enable_key_alexa, default=options.get("enable_msgs_alexa", {}).get(k, True), description={"translation_key": enable_key_alexa}), BooleanSelector(),))
      message_fields.append((vol.Optional(enable_key_push, default=options.get("enable_msgs_push", {}).get(k, True), description={"translation_key": enable_key_push}), BooleanSelector(),))
      message_fields.append((vol.Required(msg_key, default=options.get(CONF_MESSAGES, {}).get(k, default_msg), description={"translation_key": msg_key}), TextSelector(TextSelectorConfig(multiline=True)),))
    schema = vol.Schema(OrderedDict([
      # === GESTIONE MODELLI ===
      (vol.Optional("save_as_template", default=False, description={"translation_key": "save_as_template"}), BooleanSelector()),
      (vol.Optional("template_name_save", description={"translation_key": "template_name_save"}), TextSelector(TextSelectorConfig())),
      
      # === ENTITÀ PRINCIPALI ===
      (vol.Required(CONF_CLIMATE, description={"translation_key": "climate_entity"}, default=climate_id), EntitySelector(EntitySelectorConfig(domain=["climate"]))),
      (vol.Optional(CONF_TEMP_SENSOR, description={"translation_key": "temperature_sensor"}, default=temp_sensor_default), SelectSelector(SelectSelectorConfig(options=temp_sensor_options, mode="dropdown"))),
      (vol.Optional(CONF_CLIMATE_POWER_SENSOR, description={"translation_key": "climate_power_sensor"}, default=climate_power_sensor_default), SelectSelector(SelectSelectorConfig(options=climate_power_sensor_options, mode="dropdown"))),
      (vol.Required(CONF_WINDOW_SENSORS, description={"translation_key": "window_sensors"}, default=options.get(CONF_WINDOW_SENSORS, [])), EntitySelector(EntitySelectorConfig(domain=["binary_sensor"], multiple=True))),
      
      # === NOME STANZA PER NOTIFICHE ===
      (vol.Optional(CONF_ROOM_NAME, description={"translation_key": "room_name"}, default=options.get(CONF_ROOM_NAME, "")), TextSelector(TextSelectorConfig())),

      # === NOTIFICHE ===
      (vol.Required(CONF_ALEXA, description={"translation_key": "alexa_media"}, default=options.get(CONF_ALEXA, [])), EntitySelector(EntitySelectorConfig(domain=["media_player"], multiple=True))),
      (vol.Optional(CONF_PUSH, description={"translation_key": "push_targets"}, default=push_targets_default), SelectSelector(SelectSelectorConfig(options=notify_services, multiple=True, mode="dropdown"))),

      # === TEMPORIZZAZIONI ===
      (vol.Required(CONF_TIMEOUT, description={"translation_key": "timeout"}, default=options.get(CONF_TIMEOUT, 15)), NumberSelector(NumberSelectorConfig(min=0, max=1440, step=1, unit_of_measurement="min"))),
      (vol.Required(CONF_DELAY_BEFORE_OFF, description={"translation_key": "delay_before_off"}, default=options.get(CONF_DELAY_BEFORE_OFF, 0)), NumberSelector(NumberSelectorConfig(min=0, max=86400, step=1, unit_of_measurement="s"))),
      (vol.Required(CONF_DELAY_BEFORE_ON, description={"translation_key": "delay_before_on"}, default=options.get(CONF_DELAY_BEFORE_ON, 0)), NumberSelector(NumberSelectorConfig(min=0, max=86400, step=1, unit_of_measurement="s"))),
      (vol.Optional(CONF_TIMER_ON_NOTIFICATION_MINUTES, description={"translation_key": "timer_on_notification_minutes"}, default=options.get(CONF_TIMER_ON_NOTIFICATION_MINUTES, 0)), NumberSelector(NumberSelectorConfig(min=0, max=1440, step=1, unit_of_measurement="min"))),

      # === MODALITÀ STAGIONALI ===
      (vol.Required(CONF_SEASON, description={"translation_key": "season"}, default=options.get(CONF_SEASON, "auto")), dropdown(["auto", "summer", "winter"])),
      (vol.Optional(CONF_HVAC_MODE_SUMMER, description={"translation_key": "hvac_mode_summer"}, default=hvac_default), dropdown(hvac_modes)),
      (vol.Optional(CONF_HVAC_MODE_WINTER, description={"translation_key": "hvac_mode_winter"}, default=options.get(CONF_HVAC_MODE_WINTER, hvac_default)), dropdown(hvac_modes)),
      (vol.Optional(CONF_FAN_MODE_SUMMER, description={"translation_key": "fan_mode_summer"}, default=fan_default), dropdown(fan_modes)),
      (vol.Optional(CONF_FAN_MODE_WINTER, description={"translation_key": "fan_mode_winter"}, default=options.get(CONF_FAN_MODE_WINTER, fan_default)), dropdown(fan_modes)),

      # === TEMPERATURE ===
      (vol.Required("temperature_summer", description={"translation_key": "temperature_summer"}, default=options.get("temperature_summer", 21)), NumberSelector(NumberSelectorConfig(min=17, max=30, step=1, unit_of_measurement="°C"))),
      (vol.Required("temperature_winter", description={"translation_key": "temperature_winter"}, default=options.get("temperature_winter", 21)), NumberSelector(NumberSelectorConfig(min=17, max=30, step=1, unit_of_measurement="°C"))),
      (vol.Required(SUMMER_TEMP_THRESHOLD, description={"translation_key": "summer_temp_threshold"}, default=options.get(SUMMER_TEMP_THRESHOLD, 19)), NumberSelector(NumberSelectorConfig(min=-20, max=50, step=1, unit_of_measurement="°C"))),
      (vol.Required(WINTER_TEMP_THRESHOLD, description={"translation_key": "winter_temp_threshold"}, default=options.get(WINTER_TEMP_THRESHOLD, 25)), NumberSelector(NumberSelectorConfig(min=-20, max=50, step=1, unit_of_measurement="°C"))),
      
      # === ORARI NOTIFICHE ===
      (vol.Optional("notification_time_start_alexa", description={"translation_key": "notification_time_start_alexa"}, default=options.get("notification_time_start_alexa", "08:00")), TimeSelector(TimeSelectorConfig())),
      (vol.Optional("notification_time_end_alexa", description={"translation_key": "notification_time_end_alexa"}, default=options.get("notification_time_end_alexa", "22:00")), TimeSelector(TimeSelectorConfig())),
      (vol.Optional("notification_time_start_push", description={"translation_key": "notification_time_start_push"}, default=options.get("notification_time_start_push", "08:00")), TimeSelector(TimeSelectorConfig())),
      (vol.Optional("notification_time_end_push", description={"translation_key": "notification_time_end_push"}, default=options.get("notification_time_end_push", "22:00")), TimeSelector(TimeSelectorConfig())),

      
          *message_fields
    ]))
    if user_input is not None:
      # Controlla se l'utente vuole salvare come modello
      save_as_template = user_input.pop("save_as_template", False)
      template_name = user_input.pop("template_name_save", "")
      
      # PRE-VALIDAZIONE: pulisci i campi opzionali se vuoti per evitare errori EntitySelector
      temp_sensor_raw = user_input.get(CONF_TEMP_SENSOR)
      if temp_sensor_raw in [None, "", "None"]:
        user_input[CONF_TEMP_SENSOR] = None  # Rimuovi completamente il campo se vuoto
      
      # Gestisci anche il sensore di accensione clima
      climate_power_sensor_raw = user_input.get(CONF_CLIMATE_POWER_SENSOR)
      if climate_power_sensor_raw in [None, "", "None"]:
        user_input[CONF_CLIMATE_POWER_SENSOR] = None  # Rimuovi completamente il campo se vuoto
      
      msgs  = {k: user_input.pop(f"msg_{k}")          for k in messages}
      enab_alexa = {k: user_input.pop(f"enable_msg_{k}_alexa", True) for k in messages}
      enab_push  = {k: user_input.pop(f"enable_msg_{k}_push", True) for k in messages}
      
      # Gestisci il sensore di temperatura
      temp_sensor = user_input.get(CONF_TEMP_SENSOR)
      
      # Se nessun sensore selezionato o selezionato "Nessuno", salva "__NONE__"
      if temp_sensor in [None, "", "None"]:
        user_input[CONF_TEMP_SENSOR] = "__NONE__"
      
      # Converti la lista di servizi notify in stringa per compatibilità
      push_targets_list = user_input.get(CONF_PUSH, [])
      user_input[CONF_PUSH] = _convert_list_to_push_targets(push_targets_list)
      
      # NON sovrascrivere il nome se l'utente l'ha inserito manualmente
      # user_input[CONF_NAME] contiene già il valore inserito dall'utente
      user_input[CONF_MESSAGES] = msgs
      user_input["enable_msgs_alexa"] = enab_alexa
      user_input["enable_msgs_push"] = enab_push
      
      # Mantieni i valori esistenti per i timer rimossi (gestiti dalla card)
      user_input[CONF_TIMER_ON_MINUTES] = options.get(CONF_TIMER_ON_MINUTES, 10)
      user_input[CONF_TIMER_OFF_MINUTES] = options.get(CONF_TIMER_OFF_MINUTES, 60)
      
      # Salva come modello se richiesto
      if save_as_template and template_name:
        try:
          # Assicurati che template_name sia valido
          if not template_name or template_name.strip() == "":
            _LOGGER.error("Nome template vuoto o non valido durante la configurazione")
          else:
            # Aggiungi i dati mancanti per il template
            template_data = {**options, **user_input}
            
            # Verifica che i dati essenziali siano presenti
            if not template_data.get(CONF_CLIMATE):
              _LOGGER.error("Dati clima mancanti per il template durante la configurazione")
            else:
              await _save_template(self.hass, template_name.strip(), template_data)
              _LOGGER.info(f"Modello '{template_name}' salvato con successo durante la configurazione")
        except Exception as e:
          _LOGGER.error(f"Errore nel salvare il modello '{template_name}' durante la configurazione: {e}")
          import traceback
          _LOGGER.error(f"Traceback completo configurazione: {traceback.format_exc()}")
      
      return self.async_create_entry(data=user_input)
    return self.async_show_form(step_id="init", data_schema=schema)
