DOMAIN = "climate_manager"
PLATFORMS = ["sensor", "switch", "select", "number"]
CONF_DELAY_BEFORE_OFF = "delay_before_off"
CONF_DELAY_BEFORE_ON = "delay_before_on"
CONF_CLIMATE_POWER_SENSOR = "climate_power_sensor"

# === COSTANTI TIMER ===
CONF_TIMER_ON_MINUTES = "timer_on_minutes"
CONF_TIMER_OFF_MINUTES = "timer_off_minutes"
CONF_TIMER_ON_NOTIFICATION_MINUTES = "timer_on_notification_minutes"
CONF_TIMER_OFF_HVAC_MODE_SELECTOR = "timer_off_hvac_mode_selector"
CONF_TIMER_OFF_FAN_MODE_SELECTOR = "timer_off_fan_mode_selector"

# === COSTANTI SISTEMA ===
DEFAULT_CHECK_TIMEOUT_SEC = 10

ALEXA_MESSAGES = {
    "it": {
        "window_open": "Clima spento in {{room}}, finestra aperta.",
        "resume": "Clima ripristinato in {{room}}, {{mode}}, ventola {{fan}}, {{temp}}.",
        "window_open_long": "Automazione spenta in {{room}}.",
        "window_blocked": "Clima bloccato per finestra aperta in {{room}}.",
        "climate_blocked_temp": "Temperatura non valida in {{room}}, {{sensor}}.",
        "climate_blocked_summer": "Temperatura {{sensor}} in {{room}} sotto soglia {{threshold}}, clima non acceso.",
        "climate_blocked_winter": "Temperatura {{sensor}} in {{room}} sopra soglia {{threshold}}, clima non acceso.",
        "climate_on_ok": "Clima acceso in {{room}}, {{mode}} {{fan}} {{temp}}.",
        "timer_off_executed": "Timer di spegnimento eseguito in {{room}}, clima spento.",
        "timer_off_mode_executed": "Timer di spegnimento eseguito in {{room}}, passaggio a modalità {{mode}}.",
        "timer_on_notification": "Clima acceso da {{minutes}} minuti in {{room}}"
    },
    "en": {
        "window_open": "Climate off in {{room}}, window open.",
        "resume": "Climate restored in {{room}}, {{mode_en}}, fan {{fan_en}}, {{temp_en}}.",
        "window_open_long": "Automation turned off in {{room}}.",
        "window_blocked": "Climate blocked for open window in {{room}}.",
        "climate_blocked_temp": "Climate blocked in {{room}}, invalid temp, {{sensor_en}}.",
        "climate_blocked_summer": "Climate blocked in {{room}}, temp {{sensor_en}} below threshold {{threshold}}, climate off.",
        "climate_blocked_winter": "Climate blocked in {{room}}, temp {{sensor_en}} above threshold {{threshold}}, climate off.",
        "climate_on_ok": "Climate on in {{room}}, {{mode_en}} {{fan_en}} {{temp_en}}.",
        "timer_off_executed": "Turn-off timer executed in {{room}}, climate turned off.",
        "timer_off_mode_executed": "Turn-off timer executed in {{room}}, switching to {{mode}} mode.",
        "timer_on_notification": "Climate on from {{minutes}} minutes in {{room}}"
    }
}

def get_alexa_messages(lang="en"):
    return ALEXA_MESSAGES.get(lang, ALEXA_MESSAGES["en"]) 