import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { loadHaComponents, DEFAULT_HA_COMPONENTS } from 'https://cdn.jsdelivr.net/npm/@kipk/load-ha-components/+esm';
loadHaComponents([
  ...DEFAULT_HA_COMPONENTS,
  'ha-selector',
  'ha-textfield',
  'ha-icon-button',
  'ha-icon',
  'ha-combo-box',
]).catch(()=>{});

const CARD_VERSION = '1.0.0';
const TRANSLATIONS = {
  en: {
    to: "to",
    fan_speed: "Speed",
    cool: "Cool",
    heat: "Heat",
    fan_only: "Fan",
    dry: "Dry",
    auto: "Auto",
    heat_cool: "Heat/Cool",
    low: "Low",
    middle_low: "Medium-Low",
    away: "Away",
    none: "None",
    medium: "Medium",
    middle_high: "Medium-High",
    high: "High", 
    quiet: "Quiet",
    max: "Max",
    preset_mode: "Preset",
    comfort: "Comfort",
    eco: "Eco",
    ai: "AI",
    sleep: "Sleep",
    boost: "Boost",
    swing_mode: "Swing",
    off: "Off",
    on: "On",
    horizontal: "Horizontal",
    vertical: "Vertical",
    both: "Both",
    settings: "Settings",
    schedule_time: "Schedule time",
    season_mode: "Season mode",
    notifications: "Notifications",
    summer: "Summer",
    winter: "Winter",
    push_time_range: "Push notification time range",
    alexa_time_range: "Alexa notification time range",
    start_time: "Start time",
    end_time: "End time",
    automation_switch: "Climate Automation",
    lock_settings_switch: "Lock Settings",
    timer_on: "Turn On Timer",
    timer_off: "Turn Off Timer",
            timer_on_notification: "Interactive notification after too long on",
    auto_timer: "Auto Timer",
    timer_off_mode: "Mode",
    timer_off_fan_mode: "Fan Mode",
    timer_off_settings: "Settings",
    timer_start: "Start Timer",
    timer_stop: "Stop Timer",
    timer_minutes: "minutes",
    timer_active: "Timer Active",
    timer_inactive: "Timer Inactive",
    timer_remaining: "Remaining",
    threshold: "Turn off threshold",
    temperature_sensor: "Temperature Sensor (optional)",
    climate_entity: "Climate Entity",
    // Traduzioni popup notifiche
    alexa_notifications: "Alexa",
    push_notifications: "Push",
    custom_message: "Custom Message",
    custom_message_placeholder: "Enter custom message...",
    // Traduzioni tipi di messaggi
    window_open: "Window Open",
    window_open_long: "Window Timeout",
    resume: "Climate Resume",
    climate_blocked_temp: "Blocked: Invalid Temperature",
    climate_blocked_summer: "Blocked: Summer Mode",
    climate_blocked_winter: "Blocked: Winter Mode",
    climate_on_ok: "Climate On Confirmed",
    settings_sensor_missing: "Settings Sensor Missing"
  },
  it: {
    to: "a",
    fan_speed: "Velocità",
    cool: "Raffredda",
    heat: "Riscalda",
    fan_only: "Ventola",
    dry: "Deumidifica",
    auto: "Auto",
    heat_cool: "Riscalda/Raffredda",
    none: "None",
    low: "Bassa",
    middle_low: "Bassa-Media",
    medium: "Media",
    middle_high: "Media-Alta", 
    high: "Alta",
    quiet: "Silenzioso",
    max: "Massima",
    preset_mode: "Preset",
    comfort: "Comfort",
    away: "Away",
    eco: "Eco",
    ai: "IA",
    sleep: "Notte",
    boost: "Boost",
    swing_mode: "Swing",
    off: "Off",
    on: "Acceso",
    horizontal: "Orizzontale",
    vertical: "Verticale",
    both: "Entrambi",
    settings: "Impostazioni",
    schedule_time: "Fascia oraria",
    season_mode: "Stagione",
    notifications: "Notifiche",
    summer: "Estate",
    winter: "Inverno",
    push_time_range: "Fascia oraria notifiche push",
    alexa_time_range: "Fascia oraria notifiche Alexa",
    start_time: "Inizio",
    end_time: "Fine",
    automation_switch: "Automazione Clima",
    lock_settings_switch: "Blocca Impostazioni",
    timer_on: "Timer Accensione",
    timer_off: "Timer Spegnimento",
            timer_on_notification: "Notifica interattiva accensione da troppo tempo",
    auto_timer: "Auto Timer",
    timer_off_mode: "Modalità",
    timer_off_fan_mode: "Ventola",
    timer_off_settings: "Impostazioni di spegnimento",
    timer_start: "Avvia Timer",
    timer_stop: "Ferma Timer",
    timer_minutes: "minuti",
    timer_active: "Timer Attivo",
    timer_inactive: "Timer Inattivo",
    timer_remaining: "Rimanenti",
    threshold: "Soglia di spegnimento",
    temperature_sensor: "Sensore Temperatura (opzionale)",
    climate_entity: "Entità Clima",
    // Traduzioni popup notifiche
    alexa_notifications: "Alexa",
    push_notifications: "Push",
    custom_message: "Messaggio Personalizzato",
    custom_message_placeholder: "Inserisci messaggio personalizzato...",
    // Traduzioni tipi di messaggi
    window_open: "Finestra Aperta",
    window_open_long: "Timeout Finestra",
    resume: "Ripristino Clima",
    climate_blocked_temp: "Bloccato: Temperatura Non Valida",
    climate_blocked_summer: "Bloccato: Modalità Estate",
    climate_blocked_winter: "Bloccato: Modalità Inverno",
    climate_on_ok: "Clima Acceso Confermato",
    settings_sensor_missing: "Sensore Settings Mancante"
  }
};

class ClimateManagerCardEditor extends LitElement {
  constructor() {
    super();
    this._config = { entities: [] };
  }

  static properties = {
    hass:    { attribute: false },
    _config: { state: true },
  };

  /* ---------- CONFIG ---------- */
  setConfig(config) {
    const normalized = (config.entities || []).map(e =>
      typeof e === 'string' ? { entity: e, title: '' } : e
    );
    this._config = { ...config, entities: normalized };
  }

  set hass(h) { this._hass = h; }
  get hass()  { return this._hass; }

  _getLang() {
    return (this.hass && (this.hass.language || this.hass.locale?.language) || "en").substring(0, 2);
  }

  _tr(key) {
    const lang = this._getLang();
    return TRANSLATIONS[lang] && TRANSLATIONS[lang][key] || TRANSLATIONS["en"][key] || key;
  }

  _updateEntity(i, value) {
    const entities = [...this._config.entities];
    entities[i] = { ...entities[i], entity: value };
    this._updateConfig('entities', entities);
  }
  _updateTitle(i, value) {
    const entities = [...this._config.entities];
    entities[i] = { ...entities[i], title: value };
    this._updateConfig('entities', entities);
  }
  _addEntity()    { this._updateConfig('entities', [...this._config.entities, { entity:'', title:'' }]); }
  _removeEntity(i){ const e=[...this._config.entities]; e.splice(i,1); this._updateConfig('entities',e); }

  _updateConfig(k,v){
    this._config = { ...this._config, [k]: v };
    this.dispatchEvent(new CustomEvent('config-changed', { detail:{ config:this._config } }));
  }

  /* ---------- UI ---------- */
  static styles = css`
    .form        { display:flex; flex-direction:column; gap:12px; padding:16px }
    .entity-row  { position:relative; display:flex; flex-direction:column; gap:8px;
                   padding:12px; border:1px solid var(--divider-color); border-radius:8px;
                   background:var(--card-background-color); }
    ha-selector, ha-textfield { width:100% }
    ha-icon-button.remove      { position:absolute; top:6px; right:6px; }
    ha-button ha-icon          { margin-inline-end:4px; }
    .remove-btn {
      position:absolute;
      top:6px;
      right:6px;
      --mdc-icon-size: 20px;
      color: var(--error-color, #f44336);
      cursor:pointer;
      z-index:0;
    }
    .remove-btn:hover {
      filter: brightness(1.2);
    }
    .clima-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--primary-color, #4285f4);
      margin-bottom: 4px;
      margin-top: -8px;
      margin-left: 0;
      letter-spacing: 0.2px;
    }
    .add-entity-btn::part(base) {
        margin-top: 15px;
        background: var(--primary-color, #4285f4);
        color: #fff;
        border-radius: 7px;
        font-weight: 600;
        transition: filter 0.2s;
        box-shadow: 0 2px 8px 0 rgba(66,133,244,0.10);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 25px;
        height: 40px;
        /* padding: 0 22px; */
        font-size: 1.1rem;
        /* gap: 8px; */
        border-radius: 36px;
        width: 40px;
        margin-left: 10px;
    }
    ha-button ha-icon {
        margin-inline-end: unset !important;
    }  
    .add-entity-btn::part(label),
    .add-entity-btn::part(start),
    .add-entity-btn::part(end) {
      display: flex;
      align-items: center;
      line-height: 44px;
      height: 44px;
    }
    .add-entity-btn::part(base):hover {
      filter: brightness(1.1);
    }
  `;

  render() {
    if (!this._config) return html``;

    return html`
      <div class="form">
        <div class="field" style="margin-bottom:10px;">
          ${this._config.entities.map((item,i)=>html`
            <div class="entity-row">
              <div class="clima-label">${this._tr("climate_entity")} ${i + 1}</div>
              <ha-icon
                class="remove-btn"
                icon="mdi:delete"
                title="Elimina"
                @click=${() => this._removeEntity(i)}
              ></ha-icon>
              <ha-textfield
                label="Nome condizionatore (opzionale)"
                .value=${item.title ?? ''}
                @input=${e=>this._updateTitle(i,e.target.value)}
              ></ha-textfield>
              <ha-selector
                .hass=${this.hass}
                .selector=${{ entity:{ domain:'climate' } }}
                .value=${item.entity}
                @value-changed=${e=>this._updateEntity(i,e.detail.value)}
              ></ha-selector>
              <div class="clima-label">${this._tr("temperature_sensor")}</div>
              <ha-combo-box
                .hass=${this.hass}
                .items=${this._getTemperatureSensors()}
                .value=${item.temperature_sensor ?? ''}
                .label=${"Seleziona sensore..."}
                allow-custom-value
                @value-changed=${e=>this._updateTemperatureSensor(i,e.detail.value)}
              ></ha-combo-box>
            </div>
          `)}

          <ha-button class="add-entity-btn" outlined @click=${this._addEntity}>
            <ha-icon icon="mdi:plus"></ha-icon>
          </ha-button>
        </div>

        <div class="field" style="margin-bottom:20px; border-top: 1px solid #e0e0e0; padding-top: 15px;">
          <div class="clima-label" style="font-weight: bold; margin-bottom: 10px;">🎨 Tema Interfaccia</div>
          <ha-selector
            .hass=${this.hass}
            .selector=${{
              select: {
                              options: [
                { value: 'classic', label: 'Classic' },
                { value: 'modern', label: 'Modern' },
                { value: 'compact', label: 'Compact' },
                { value: 'cyberpunk', label: 'Cyberpunk' }
              ]
              }
            }}
            .value=${this._config.theme || 'classic'}
            @value-changed=${e => this._updateConfig('theme', e.detail.value)}
          ></ha-selector>
          <div style="font-size: 12px; color: #666; margin-top: 5px; font-style: italic;">
            Scegli lo stile dell'interfaccia: Classic per il design attuale, Modern per un look da vero condizionatore, Compact per un layout compatto con modalità sempre visibili
          </div>
        </div>
      </div>
    `;
  }

  _updateTemperatureSensor(i, value) {
    const entities = [...this._config.entities];
    entities[i] = { ...entities[i], temperature_sensor: value };
    this._updateConfig('entities', entities);
  }

  _getTemperatureSensors() {
    if (!this.hass) return [];

    return Object.entries(this.hass.states)
      .filter(([entityId, state]) =>
        entityId.startsWith('sensor.') &&
        state.attributes.device_class === 'temperature'
      )
      .map(([entityId, state]) => ({
        value: entityId,
        label: state.attributes.friendly_name || entityId
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
}

if (!customElements.get('climate-manager-card-editor')) {
  customElements.define('climate-manager-card-editor', ClimateManagerCardEditor);
}

class ClimateManagerCard extends LitElement {
  _optimisticRefreshTimer = null;
  static properties = {
    hass: { type: Object },
    config: { type: Object },
    _currentIndex: { type: Number },
    _showControls: { type: Boolean },
    _showSettings: { type: Boolean },
    _showNotifications: { type: Boolean },
    _pendingTemp: { type: Number },
    _scrollThreshold: { type: Number },
    _isScrolling: { type: Boolean },
    _debounceTimers: { type: Object },
    _optimisticTemp: { type: Number },
    _optimisticUntil: { type: Number },
    _optimisticMode: { type: String },
    _optimisticModeUntil: { type: Number },
    _optimisticFanSpeed: { type: String },
    _optimisticFanSpeedUntil: { type: Number },
    _optimisticPreset: { type: String },
    _optimisticPresetUntil: { type: Number },
    _optimisticSwing: { type: String },
    _optimisticSwingUntil: { type: Number },
    _optimisticTimerOnMinutes: { type: Object },
    _optimisticTimerOffMinutes: { type: Object },
    _theme: { type: String },
  };
  constructor() {
    super();
    this._currentIndex = 0;
    this._showControls = false;
    this.entities = [];
    this._showSettings = false;
    this._optimisticTemp = undefined;
    this._optimisticUntil = undefined;
    this._optimisticMode = undefined;
    this._optimisticModeUntil = undefined;
    this._optimisticFanSpeed = undefined;
    this._optimisticFanSpeedUntil = undefined;
    this._debounceTimeout = null;
    this._pendingTemp = undefined;
    this._lastPreset = null;
    this._lastSwing = null;
    this._optimisticRefreshTimer = null;
    this._optimisticPreset = undefined;
    this._optimisticPresetUntil = undefined;
    this._optimisticSwing = undefined;
    this._optimisticSwingUntil = undefined;
    // Touch swipe
    this._touchStartX = 0;
    // ... nel costruttore della classe ClimateManagerCard, aggiungi:
    this._schedule = { startTime: '08:00', endTime: '22:00', enabled: true };
    this._notificationsEnabled = false;
    this._SeasonSelect = this._SeasonSelect.bind(this);
    this._optimisticSeason = null;
    this._optimisticSeasonUntil = null;
    this._optimisticTimerOnMinutes = {};
    this._optimisticTimerOffMinutes = {};
    
    // Cache per evitare re-render continui del sensore settings
    this._settingsCache = {};
    this._settingsCacheTimeout = {};
    this._lastSettingsUpdate = {};
    
    // Debounce per gli input dei timer
    this._timerInputDebounce = {};
    
    // Gestione ritardo messaggio settings mancanti
    this._settingsWarningTimeout = {};
    this._showSettingsWarning = {};
    
    // Gestione menu espandibili timer off settings
    this._expandedTimerOffSettings = new Set();
  }

  static getConfigElement() {
    return document.createElement('climate-manager-card-editor');
  }

  _getLang() {
    return (this.hass && (this.hass.language || this.hass.locale?.language) || "en").substring(0, 2);
  }
  // Helper per trovare il sensore settings corretto per una climate entity - supporto bilingue
  _findSettingsSensorForClimate(climateEntity) {
    for (const [entityId, stateObj] of Object.entries(this.hass.states)) {
      if (
        (entityId.startsWith('sensor.climate_manager_settings_') || 
         entityId.startsWith('sensor.climate_manager_impostazioni_')) &&
        stateObj.attributes &&
        stateObj.attributes.climate_entity === climateEntity
      ) {
        return entityId;
      }
    }
    return null;
  }
  // Restituisce direttamente lo stato del sensore settings associato alla climate entity
  _getSettingsStateForClimate(climateEntity) {
    const now = Date.now();
    
    // Controlla se abbiamo una cache valida (valida per 1000ms durante la digitazione)
    if (this._settingsCache[climateEntity] && 
        this._lastSettingsUpdate[climateEntity] && 
        (now - this._lastSettingsUpdate[climateEntity]) < 1000) {
      return this._settingsCache[climateEntity];
    }
    
    // Cerca il sensore settings - supporto bilingue
    let settingsState = null;
    for (const [entityId, stateObj] of Object.entries(this.hass.states)) {
      if (
        (entityId.startsWith('sensor.climate_manager_settings_') ||
         entityId.startsWith('sensor.climate_manager_impostazioni_')) &&
        stateObj.attributes &&
        stateObj.attributes.climate_entity === climateEntity
      ) {
        settingsState = stateObj;
        break;
      }
    }
    
    // fallback generico se non trovato - bilingue
    if (!settingsState) {
      settingsState = this.hass.states['sensor.climate_manager_settings'] || 
                     this.hass.states['sensor.climate_manager_impostazioni'] || null;
    }
    
    // Aggiorna la cache
    this._settingsCache[climateEntity] = settingsState;
    this._lastSettingsUpdate[climateEntity] = now;
    
    // Imposta un timeout per pulire la cache dopo 2 secondi
    if (this._settingsCacheTimeout[climateEntity]) {
      clearTimeout(this._settingsCacheTimeout[climateEntity]);
    }
    this._settingsCacheTimeout[climateEntity] = setTimeout(() => {
      delete this._settingsCache[climateEntity];
      delete this._lastSettingsUpdate[climateEntity];
      delete this._settingsCacheTimeout[climateEntity];
    }, 2000);
    
    return settingsState;
  }

  // Invalida la cache del sensore settings per una specifica climate entity
  _invalidateSettingsCache(climateEntity) {
    if (this._settingsCacheTimeout[climateEntity]) {
      clearTimeout(this._settingsCacheTimeout[climateEntity]);
    }
    delete this._settingsCache[climateEntity];
    delete this._lastSettingsUpdate[climateEntity];
    delete this._settingsCacheTimeout[climateEntity];
  }

  // Debounce per gli input dei timer per evitare chiamate eccessive
  _debouncedTimerUpdate(entityId, key, value, delay = 300) {
    const debounceKey = `${entityId}_${key}`;
    
    // Cancella il timeout precedente se esiste
    if (this._timerInputDebounce[debounceKey]) {
      clearTimeout(this._timerInputDebounce[debounceKey]);
    }
    
    // Imposta il nuovo timeout
    this._timerInputDebounce[debounceKey] = setTimeout(() => {
      this.hass.callService('climate_manager', 'set_option', { 
        entity_id: entityId, 
        key: key, 
        value: value 
      });
      // Invalida la cache solo quando viene effettivamente inviata la chiamata
      this._invalidateSettingsCache(entityId);
      delete this._timerInputDebounce[debounceKey];
    }, delay);
  }

  // Gestisce il ritardo per mostrare il messaggio di warning settings mancanti
  _checkSettingsWarning(entityId, hasSettings) {
    // Se i settings esistono, nascondi il warning e cancella il timeout
    if (hasSettings) {
      this._showSettingsWarning[entityId] = false;
      if (this._settingsWarningTimeout[entityId]) {
        clearTimeout(this._settingsWarningTimeout[entityId]);
        delete this._settingsWarningTimeout[entityId];
      }
      return false;
    }
    
    // Se i settings non esistono e non abbiamo già un timeout attivo
    if (!this._settingsWarningTimeout[entityId]) {
      // Imposta il timeout per mostrare il warning dopo 1 secondo
      this._settingsWarningTimeout[entityId] = setTimeout(() => {
        this._showSettingsWarning[entityId] = true;
        this.requestUpdate();
        delete this._settingsWarningTimeout[entityId];
      }, 1000);
    }
    
    // Restituisce lo stato attuale del warning
    return this._showSettingsWarning[entityId] || false;
  }

  _findTimerOnSwitchForClimate(climateEntity) {
    // Cerca switch timer ON sia in italiano che inglese
    const entityIdSlug = climateEntity.replace(/^climate\./, '').replace(/\./g, '_');
    
    // Prova pattern inglese e italiano
    const patterns = [
      `switch.climate_manager_timer_on_${entityIdSlug}`,        // inglese
      `switch.climate_manager_timer_accensione_${entityIdSlug}` // italiano (se esiste)
    ];
    
    for (const pattern of patterns) {
      if (this.hass.states[pattern]) {
        return pattern;
      }
    }
    
    // Fallback avanzato: cerca switch correlati anche con nomi diversi
    const allTimerSwitches = Object.keys(this.hass.states).filter(entityId => 
      entityId.includes('switch.climate_manager') && entityId.includes('timer')
    );
    
    // STRATEGIA INTELLIGENTE: trova switch ON che potrebbero corrispondere
    const candidates = allTimerSwitches.filter(entityId => 
      (entityId.includes('_on_') || entityId.includes('_accensione_'))
    );
    
    // SCORING SYSTEM: trova il match migliore invece del primo
    const climateKeywords = entityIdSlug.toLowerCase().split('_');
    
    let bestMatch = null;
    let bestScore = 0;
    let bestMatchingKeywords = [];
    
    for (const candidate of candidates) {
      const candidateLower = candidate.toLowerCase();
      
      // Conta quante parole chiave corrispondono
      const matchingKeywords = climateKeywords.filter(keyword => 
        keyword.length > 2 && candidateLower.includes(keyword)
      );
      
      // CALCOLO SCORE: 
      // - +2 punti per ogni keyword corrispondente
      // - +5 punti bonus se tutte le keywords corrispondono (match perfetto)
      // - +3 punti bonus per match numerici esatti (1, 2, etc.)
      let score = matchingKeywords.length * 2;
      
      if (matchingKeywords.length === climateKeywords.length) {
        score += 5; // Bonus match perfetto
      }
      
      // Bonus per match numerici esatti (1, 2, 3, etc.)
      const numericKeywords = climateKeywords.filter(k => /^\d+$/.test(k));
      for (const numKey of numericKeywords) {
        if (candidateLower.includes(numKey)) {
          score += 3; // Bonus extra per numeri
        }
      }
      
      if (score > bestScore) {
        bestMatch = candidate;
        bestScore = score;
        bestMatchingKeywords = matchingKeywords;
      }
    }
    
    // Applica soglia minima solo al miglior match
    const minMatches = climateKeywords.length <= 2 ? 1 : Math.max(1, Math.floor(climateKeywords.length * 0.33));
    
    if (bestMatch && bestMatchingKeywords.length >= minMatches) {
      return bestMatch;
    }
    
    return null;
  }

  _findTimerOffSwitchForClimate(climateEntity) {
    // Cerca switch timer OFF sia in italiano che inglese
    const entityIdSlug = climateEntity.replace(/^climate\./, '').replace(/\./g, '_');
    
    // Prova pattern inglese e italiano
    const patterns = [
      `switch.climate_manager_timer_off_${entityIdSlug}`,         // inglese
      `switch.climate_manager_timer_spegnimento_${entityIdSlug}`  // italiano (se esiste)
    ];
    
    for (const pattern of patterns) {
      if (this.hass.states[pattern]) {
        return pattern;
      }
    }
    
    // Fallback avanzato: cerca switch correlati anche con nomi diversi
    const allTimerSwitches = Object.keys(this.hass.states).filter(entityId => 
      entityId.includes('switch.climate_manager') && entityId.includes('timer')
    );
    
    // STRATEGIA INTELLIGENTE: trova switch OFF che potrebbero corrispondere
    const candidates = allTimerSwitches.filter(entityId => 
      (entityId.includes('_off_') || entityId.includes('_spegnimento_'))
    );
    
    // SCORING SYSTEM per Timer OFF (uguale al Timer ON)
    const climateKeywords = entityIdSlug.toLowerCase().split('_');
    
    let bestMatch = null;
    let bestScore = 0;
    let bestMatchingKeywords = [];
    
    for (const candidate of candidates) {
      const candidateLower = candidate.toLowerCase();
      
      // Conta quante parole chiave corrispondono
      const matchingKeywords = climateKeywords.filter(keyword => 
        keyword.length > 2 && candidateLower.includes(keyword)
      );
      
      // Stesso calcolo score del Timer ON
      let score = matchingKeywords.length * 2;
      
      if (matchingKeywords.length === climateKeywords.length) {
        score += 5; // Bonus match perfetto
      }
      
      // Bonus per match numerici esatti
      const numericKeywords = climateKeywords.filter(k => /^\d+$/.test(k));
      for (const numKey of numericKeywords) {
        if (candidateLower.includes(numKey)) {
          score += 3; // Bonus extra per numeri
        }
      }
      
      if (score > bestScore) {
        bestMatch = candidate;
        bestScore = score;
        bestMatchingKeywords = matchingKeywords;
      }
    }
    
    // Applica soglia minima solo al miglior match
    const minMatches = climateKeywords.length <= 2 ? 1 : Math.max(1, Math.floor(climateKeywords.length * 0.33));
    
    if (bestMatch && bestMatchingKeywords.length >= minMatches) {
      return bestMatch;
    }
    
    return null;
  }

  _findTimerOnCountdownForClimate(climateEntity) {
    const entityIdSlug = climateEntity.replace(/^climate\./, '').replace(/\./g, '_');
    
    // Cerca il sensore countdown correlato usando gli switch come riferimento
    const timerOnSwitchId = this._findTimerOnSwitchForClimate(climateEntity);
    
    if (timerOnSwitchId) {
      // Estrae il suffisso dello switch e lo usa per il sensore - supporta entrambe le lingue
      let switchSuffix = '';
      if (timerOnSwitchId.includes('timer_on_')) {
        switchSuffix = timerOnSwitchId.replace('switch.climate_manager_timer_on_', '');
      } else if (timerOnSwitchId.includes('timer_accensione_')) {
        switchSuffix = timerOnSwitchId.replace('switch.climate_manager_timer_accensione_', '');
      }
      
      if (switchSuffix) {
        // COMBINAZIONI CROSS-LINGUE: Switch italiano + Sensore inglese (e viceversa)
        const sensorPatterns = [
          // Combinazione 1: Switch italiano -> Sensore italiano
          `sensor.climate_manager_timer_accensione_countdown_${switchSuffix}`,
          // Combinazione 2: Switch italiano -> Sensore inglese
          `sensor.climate_manager_timer_on_countdown_${switchSuffix}`,
          // Combinazione 3: Switch inglese -> Sensore inglese
          `sensor.climate_manager_timer_on_countdown_${switchSuffix}`,
          // Combinazione 4: Switch inglese -> Sensore italiano
          `sensor.climate_manager_timer_accensione_countdown_${switchSuffix}`,
        ];
        
        for (const pattern of sensorPatterns) {
          if (this.hass.states[pattern]) {
            return pattern;
          }
        }
      }
    }
    
    // Fallback avanzato: prova tutte le combinazioni possibili con entityIdSlug
    const allCombinations = [
      `sensor.climate_manager_timer_accensione_countdown_${entityIdSlug}`,
      `sensor.climate_manager_timer_on_countdown_${entityIdSlug}`,
    ];
    
    for (const pattern of allCombinations) {
      if (this.hass.states[pattern]) {
        return pattern;
      }
    }
    
    // Fallback finale: cerca per unique_id o pattern flessibile bilingue
    const result = Object.keys(this.hass.states).find(entityId => {
      const entity = this.hass.states[entityId];
      
      // Cerca per unique_id (inglese e italiano)
      if (entity?.attributes?.unique_id) {
        if (entity.attributes.unique_id.includes('timer_on_countdown') || 
            entity.attributes.unique_id.includes('timer_accensione_countdown')) {
          return true;
        }
      }
      
      // Pattern flessibile bilingue con controllo del climate specifico
      return (entityId.includes('sensor.climate_manager') && 
              entityId.includes('timer') && 
              (entityId.includes('accensione') || entityId.includes('_on_')) && 
              entityId.includes('countdown') &&
              entityId.toLowerCase().includes(entityIdSlug.toLowerCase()));
    });
    
    return result;
  }

  _findTimerOffCountdownForClimate(climateEntity) {
    const entityIdSlug = climateEntity.replace(/^climate\./, '').replace(/\./g, '_');
    
    // Cerca il sensore countdown correlato usando gli switch come riferimento
    const timerOffSwitchId = this._findTimerOffSwitchForClimate(climateEntity);
    
    if (timerOffSwitchId) {
      // Estrae il suffisso dello switch e lo usa per il sensore - supporta entrambe le lingue
      let switchSuffix = '';
      if (timerOffSwitchId.includes('timer_off_')) {
        switchSuffix = timerOffSwitchId.replace('switch.climate_manager_timer_off_', '');
      } else if (timerOffSwitchId.includes('timer_spegnimento_')) {
        switchSuffix = timerOffSwitchId.replace('switch.climate_manager_timer_spegnimento_', '');
      }
      
      if (switchSuffix) {
        // COMBINAZIONI CROSS-LINGUE: Switch italiano + Sensore inglese (e viceversa)
        const sensorPatterns = [
          // Combinazione 1: Switch italiano -> Sensore italiano
          `sensor.climate_manager_timer_spegnimento_countdown_${switchSuffix}`,
          // Combinazione 2: Switch italiano -> Sensore inglese
          `sensor.climate_manager_timer_off_countdown_${switchSuffix}`,
          // Combinazione 3: Switch inglese -> Sensore inglese
          `sensor.climate_manager_timer_off_countdown_${switchSuffix}`,
          // Combinazione 4: Switch inglese -> Sensore italiano
          `sensor.climate_manager_timer_spegnimento_countdown_${switchSuffix}`,
        ];
        
        for (const pattern of sensorPatterns) {
          if (this.hass.states[pattern]) {
            return pattern;
          }
        }
      }
    }
    
    // Fallback avanzato: prova tutte le combinazioni possibili con entityIdSlug
    const allCombinations = [
      `sensor.climate_manager_timer_spegnimento_countdown_${entityIdSlug}`,
      `sensor.climate_manager_timer_off_countdown_${entityIdSlug}`,
    ];
    
    for (const pattern of allCombinations) {
      if (this.hass.states[pattern]) {
        return pattern;
      }
    }
    
    // Fallback finale: cerca per unique_id o pattern flessibile bilingue
    const result = Object.keys(this.hass.states).find(entityId => {
      const entity = this.hass.states[entityId];
      
      // Cerca per unique_id (inglese e italiano)
      if (entity?.attributes?.unique_id) {
        if (entity.attributes.unique_id.includes('timer_off_countdown') || 
            entity.attributes.unique_id.includes('timer_spegnimento_countdown')) {
          return true;
        }
      }
      
      // Pattern flessibile bilingue con controllo del climate specifico
      return (entityId.includes('sensor.climate_manager') && 
              entityId.includes('timer') && 
              (entityId.includes('spegnimento') || entityId.includes('_off_')) && 
              entityId.includes('countdown') &&
              entityId.toLowerCase().includes(entityIdSlug.toLowerCase()));
    });
    
    return result;
  }

  _findTimerOnNotificationForClimate(climateEntity) {
    if (!climateEntity) return null;
    
    const entityIdSlug = climateEntity.replace('climate.', '').replace(/\./g, '_');
    
    // Cerca il sensore timer di notifica accensione
    const timerOnNotificationSensorId = `sensor.climate_manager_timer_on_notification_${entityIdSlug}`;
    if (this.hass.states[timerOnNotificationSensorId]) {
      return timerOnNotificationSensorId;
    }
    
    // Cerca tra tutte le entità per trovare il sensore corretto
    for (const entityId of Object.keys(this.hass.states)) {
      const entity = this.hass.states[entityId];
      if (entity.attributes.unique_id && 
          entity.attributes.unique_id.includes('timer_on_notification') &&
          entityId.includes(entityIdSlug)) {
        return entityId;
      }
    }
    
    return null;
  }

  _findTimerOnNotificationNumberForClimate(climateEntity) {
    if (!climateEntity) return null;
    
    const entityIdSlug = climateEntity.replace('climate.', '').replace(/\./g, '_');
    
    // Cerca l'entità number per il timer di notifica accensione
    const timerOnNotificationNumberId = `number.climate_manager_timer_on_notification_${entityIdSlug}`;
    if (this.hass.states[timerOnNotificationNumberId]) {
      return timerOnNotificationNumberId;
    }
    
    // Cerca tra tutte le entità per trovare l'entità number corretta
    for (const entityId of Object.keys(this.hass.states)) {
      const entity = this.hass.states[entityId];
      if (entity.attributes.unique_id && 
          entity.attributes.unique_id.includes('timer_on_notification') &&
          entityId.includes(entityIdSlug) &&
          entityId.startsWith('number.')) {
        return entityId;
      }
    }
    
    return null;
  }

  _findAutoTimerSwitchForClimate(climateEntity) {
    // Cerca auto timer switch sia per nomi italiani che inglesi
    const entityIdSlug = climateEntity.replace(/^climate\./, '').replace(/\./g, '_');
    
    // Prova pattern diretti
    const patterns = [
      `switch.climate_manager_auto_timer_${entityIdSlug}`,        // inglese
      `switch.climate_manager_timer_automatico_${entityIdSlug}`   // italiano (se esiste)
    ];
    
    for (const pattern of patterns) {
      if (this.hass.states[pattern]) {
        return pattern;
      }
    }
    
    // Fallback avanzato: cerca auto timer correlati anche con nomi diversi
    const allAutoTimerSwitches = Object.keys(this.hass.states).filter(entityId => 
      entityId.includes('switch.climate_manager') && 
      (entityId.includes('auto_timer') || entityId.includes('timer_automatico'))
    );
    
    // STRATEGIA INTELLIGENTE: trova auto timer che potrebbero corrispondere
    const candidates = allAutoTimerSwitches;
    
    // SCORING SYSTEM per Auto Timer (uguale agli altri)
    const climateKeywords = entityIdSlug.toLowerCase().split('_');
    
    let bestMatch = null;
    let bestScore = 0;
    let bestMatchingKeywords = [];
    
    for (const candidate of candidates) {
      const candidateLower = candidate.toLowerCase();
      
      // Conta quante parole chiave corrispondono
      const matchingKeywords = climateKeywords.filter(keyword => 
        keyword.length > 2 && candidateLower.includes(keyword)
      );
      
      // Stesso calcolo score degli altri timer
      let score = matchingKeywords.length * 2;
      
      if (matchingKeywords.length === climateKeywords.length) {
        score += 5; // Bonus match perfetto
      }
      
      // Bonus per match numerici esatti
      const numericKeywords = climateKeywords.filter(k => /^\d+$/.test(k));
      for (const numKey of numericKeywords) {
        if (candidateLower.includes(numKey)) {
          score += 3; // Bonus extra per numeri
        }
      }
      
      if (score > bestScore) {
        bestMatch = candidate;
        bestScore = score;
        bestMatchingKeywords = matchingKeywords;
      }
    }
    
    // Applica soglia minima solo al miglior match
    const minMatches = climateKeywords.length <= 2 ? 1 : Math.max(1, Math.floor(climateKeywords.length * 0.33));
    
    if (bestMatch && bestMatchingKeywords.length >= minMatches) {
      return bestMatch;
    }
    
    return null;
  }

  _findTimerOffHvacModeSelectForClimate(climateEntity) {
    // Cerca il selector HVAC mode per il timer off di questo climate entity
    const entityIdSlug = climateEntity.replace(/^climate\./, '').replace(/\./g, '_');
    
    // Prova pattern diretti
    const patterns = [
      `select.climate_manager_timer_off_hvac_mode_${entityIdSlug}`
    ];
    
    for (const pattern of patterns) {
      if (this.hass.states[pattern]) {
        return pattern;
      }
    }
    
    // Fallback: cerca tutti i selector timer off hvac mode
    const allSelectors = Object.keys(this.hass.states).filter(entityId => 
      entityId.startsWith('select.climate_manager_timer_off_hvac_mode_')
    );
    
    // Sistema di scoring come negli altri metodi
    const climateKeywords = entityIdSlug.toLowerCase().split('_');
    
    let bestMatch = null;
    let bestScore = 0;
    let bestMatchingKeywords = [];
    
    for (const candidate of allSelectors) {
      const candidateLower = candidate.toLowerCase();
      
      const matchingKeywords = climateKeywords.filter(keyword => 
        keyword.length > 2 && candidateLower.includes(keyword)
      );
      
      let score = matchingKeywords.length * 2;
      
      if (matchingKeywords.length === climateKeywords.length) {
        score += 5;
      }
      
      const numericKeywords = climateKeywords.filter(k => /^\d+$/.test(k));
      for (const numKey of numericKeywords) {
        if (candidateLower.includes(numKey)) {
          score += 3;
        }
      }
      
      if (score > bestScore) {
        bestMatch = candidate;
        bestScore = score;
        bestMatchingKeywords = matchingKeywords;
      }
    }
    
    const minMatches = climateKeywords.length <= 2 ? 1 : Math.max(1, Math.floor(climateKeywords.length * 0.33));
    
    if (bestMatch && bestMatchingKeywords.length >= minMatches) {
      return bestMatch;
    }
    
    return null;
  }

  _findTimerOffFanModeSelectForClimate(climateEntity) {
    // Cerca il selector fan mode per il timer off di questo climate entity
    const entityIdSlug = climateEntity.replace(/^climate\./, '').replace(/\./g, '_');
    
    // Prova pattern diretti
    const patterns = [
      `select.climate_manager_timer_off_fan_mode_${entityIdSlug}`
    ];
    
    for (const pattern of patterns) {
      if (this.hass.states[pattern]) {
        return pattern;
      }
    }
    
    // Fallback: cerca tutti i selector timer off fan mode
    const allSelectors = Object.keys(this.hass.states).filter(entityId => 
      entityId.startsWith('select.climate_manager_timer_off_fan_mode_')
    );
    
    // Sistema di scoring come negli altri metodi
    const climateKeywords = entityIdSlug.toLowerCase().split('_');
    
    let bestMatch = null;
    let bestScore = 0;
    let bestMatchingKeywords = [];
    
    for (const candidate of allSelectors) {
      const candidateLower = candidate.toLowerCase();
      
      const matchingKeywords = climateKeywords.filter(keyword => 
        keyword.length > 2 && candidateLower.includes(keyword)
      );
      
      let score = matchingKeywords.length * 2;
      
      if (matchingKeywords.length === climateKeywords.length) {
        score += 5;
      }
      
      const numericKeywords = climateKeywords.filter(k => /^\d+$/.test(k));
      for (const numKey of numericKeywords) {
        if (candidateLower.includes(numKey)) {
          score += 3;
        }
      }
      
      if (score > bestScore) {
        bestMatch = candidate;
        bestScore = score;
        bestMatchingKeywords = matchingKeywords;
      }
    }
    
    const minMatches = climateKeywords.length <= 2 ? 1 : Math.max(1, Math.floor(climateKeywords.length * 0.33));
    
    if (bestMatch && bestMatchingKeywords.length >= minMatches) {
      return bestMatch;
    }
    
    return null;
  }

  _toggleSettings(e) {
    e?.stopPropagation();
    this._showSettings = !this._showSettings;
    this._showNotifications = false; // Chiude il popup notifiche se aperto
    
    // Se si chiude il popup, pulisci i timeout dei warning
    if (!this._showSettings) {
      Object.keys(this._settingsWarningTimeout).forEach(entityId => {
        clearTimeout(this._settingsWarningTimeout[entityId]);
        delete this._settingsWarningTimeout[entityId];
        delete this._showSettingsWarning[entityId];
      });
    }
  }

  _toggleNotifications(e) {
    e?.stopPropagation();
    this._showNotifications = !this._showNotifications;
    this._showSettings = false; // Chiude il popup settings se aperto
    
    // Se si chiude il popup, pulisci i timeout dei warning
    if (!this._showNotifications) {
      Object.keys(this._settingsWarningTimeout).forEach(entityId => {
        clearTimeout(this._settingsWarningTimeout[entityId]);
        delete this._settingsWarningTimeout[entityId];
        delete this._showSettingsWarning[entityId];
      });
    }
  }

  renderNumber(numStr) {
    return numStr.split('').map(d =>
      DIGIT_SVG[d]
        ? html`<span class="digit-svg" .innerHTML=${DIGIT_SVG[d]}></span>`
        : html`<span class="digit-svg"></span>`
    );
  }
  firstUpdated() {
    // Touch events for swipe - già ottimizzati con passive: true
    // Le violazioni touchstart nella console vengono da ha-control-circular-slider (componenti HA)
    const wrapper = this.renderRoot.querySelector('.pages-wrapper');
    if (wrapper) {
      wrapper.addEventListener('touchstart', (e) => this._handleTouchStart(e), { passive: true });
      wrapper.addEventListener('touchmove', (e) => this._handleTouchMove(e), { passive: true });
    }
    
    // Initialize selector tracking for all entities
    this._initializeSelectorStates();
  }

  _initializeSelectorStates() {
    // Initialize tracking for all entities
    this.entities.forEach(entity => {
      const entityId = typeof entity === 'string' ? entity : entity.entity;
      
      // Initialize HVAC mode selector tracking
      const hvacSelector = this._findTimerOffHvacModeSelectForClimate(entityId);
      if (hvacSelector) {
        const hvacState = this.hass.states[hvacSelector];
        const lastHvacKey = `_lastHvacSelector_${entityId}`;
        this[lastHvacKey] = hvacState?.state || 'off';
      }
      
      // Initialize fan mode selector tracking
      const fanSelector = this._findTimerOffFanModeSelectForClimate(entityId);
      if (fanSelector) {
        const fanState = this.hass.states[fanSelector];
        const lastFanKey = `_lastFanSelector_${entityId}`;
        this[lastFanKey] = fanState?.state || 'auto';
      }
    });
  }

  _handleTouchStart(e) {
    this._touchStartX = e.touches[0].clientX;
  }
  _handleTouchMove(e) {
    if (!this._touchStartX) return;
    const touchEndX = e.touches[0].clientX;
    const diff = this._touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && this._currentIndex < this.entities.length - 1) {
        this._goToIndex(this._currentIndex + 1);
      } else if (diff < 0 && this._currentIndex > 0) {
        this._goToIndex(this._currentIndex - 1);
      }
      this._touchStartX = null;
    }
  }
  _goToIndex(idx) {
    // Reset stati ottimistici quando cambi entità
    this._pendingTemp = undefined;
    this._optimisticTemp = undefined;
    this._optimisticMode = undefined;

    // Pulisci i timeout dei warning settings quando cambi entità
    Object.keys(this._settingsWarningTimeout).forEach(entityId => {
      clearTimeout(this._settingsWarningTimeout[entityId]);
      delete this._settingsWarningTimeout[entityId];
      delete this._showSettingsWarning[entityId];
    });

    this._currentIndex = idx;
            this.requestUpdate();
    setTimeout(() => this._scrollToCurrent(), 10);
  }
  _scrollToCurrent() {
    const wrapper = this.renderRoot.querySelector('.pages-wrapper');
    const page = wrapper?.querySelector('.page');
    if (!wrapper || !page) return;
    const pos = this._currentIndex * page.offsetWidth;
    wrapper.scrollTo({ left: pos, behavior: 'smooth' });
  }
  _prevEntity() {
    if (this._currentIndex > 0) this._goToIndex(this._currentIndex - 1);
  }
  _nextEntity() {
    if (this._currentIndex < this.entities.length - 1) this._goToIndex(this._currentIndex + 1);
  }

  _tr(key) {
    const lang = this._getLang();
    return TRANSLATIONS[lang] && TRANSLATIONS[lang][key] || TRANSLATIONS["en"][key] || key;
  }

  setConfig(config) {
    if (
      !config.entities ||
      !Array.isArray(config.entities) ||
      !config.entities.length
    ) {
      throw new Error('Please define entities');
    }
    this.config   = config;
    this.entities = config.entities.filter(e =>
      (typeof e === 'string' && e) ||
      (typeof e === 'object'  && e.entity)
    );
    this._theme = config.theme || 'classic';
  }


  _handlePowerToggle(entityId) {
    const state = this.hass.states[entityId];
    if (state) {
      if (state.state === 'off') {
        // Recupera l'ultima modalità usata da localStorage, fallback su modalità supportata
        let lastMode = 'auto'; // Fallback più sicuro
        try {
          const stored = localStorage.getItem('smart_appliance_ac_last_mode_' + entityId);
          if (stored && typeof stored === 'string' && stored.trim() !== '') {
            lastMode = stored.trim();
          }
        } catch (e) {
          // Errore lettura localStorage
        }

        // Verifica che la modalità sia supportata dal dispositivo
        const supportedModes = state.attributes.hvac_modes || ['auto'];

        // Lista di modalità valide standard
        const validModes = ['off', 'heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only'];

        // Verifica tripla: supportata dal dispositivo, valida per HA, e non 'off'
        if (!supportedModes.includes(lastMode) || !validModes.includes(lastMode) || lastMode === 'off') {
          // Se non supportata, usa la prima modalità disponibile (escluso 'off')
          lastMode = supportedModes.find(mode => mode !== 'off' && validModes.includes(mode)) || 'auto';
        }

        // Assicurati che sia una stringa valida
        if (typeof lastMode !== 'string' || !validModes.includes(lastMode)) {
          lastMode = 'auto';
        }
        this.hass.callService('climate', 'set_hvac_mode', {
          entity_id: entityId,
          hvac_mode: lastMode
        });
      } else {
        this.hass.callService('climate', 'set_hvac_mode', {
          entity_id: entityId,
          hvac_mode: 'off'
        });
      }
    }
  }

  _getTempLimits(state) {
    return {
      min: state?.attributes?.min_temp ?? 16,
      max: state?.attributes?.max_temp ?? 30,
      step: state?.attributes?.target_temp_step ?? 0.5
    };
  }

  _setPendingTemp(entityId, newTemp) {
    const state = this.hass.states[entityId];
    const { min, max } = this._getTempLimits(state);
    newTemp = Math.max(min, Math.min(max, newTemp));
    this._pendingTemp = newTemp;
    this.requestUpdate();
    if (this._debounceTimeout) clearTimeout(this._debounceTimeout);
    this._debounceTimeout = setTimeout(() => {
      this._sendTemperature(entityId, newTemp);
    }, 1000);
  }

  _sendTemperature(entityId, temp) {
    this._optimisticTemp = temp;
    this._optimisticUntil = Date.now() + 8000;
    this._pendingTemp = undefined;
    this.hass.callService('climate', 'set_temperature', {
      entity_id: entityId,
      temperature: temp,
    });
    this.requestUpdate();
  }

  _handleTemperature(entityId, change) {
    const state = this.hass.states[entityId];
    if (!state) return;
    const { step } = this._getTempLimits(state);
    const current = (this._pendingTemp !== undefined)
      ? this._pendingTemp
      : ((this._optimisticTemp !== undefined && Date.now() < this._optimisticUntil)
          ? this._optimisticTemp
          : state.attributes.temperature) || 20;
    let newTemp = current + change * (step || 1);
    this._setPendingTemp(entityId, newTemp);
  }

  _checkTemperature(entityId, temp) {
    const state = this.hass.states[entityId];
    const realTemp = state.attributes.temperature;

    if (realTemp === temp) {
      // temperatura aggiornata, togli stato ottimistico
      this._isOptimistic = false;
      this._optimisticTemp = undefined;
      this.requestUpdate();
    } else {
      // riprova dopo 2 secondi se non aggiornata
      setTimeout(() => this._checkTemperature(entityId, temp), 2000);
    }
  }
  // --- HANDLE MODE ---
  _handleModeChange(entityId, mode) {
    // Salva la modalità valida in localStorage per il power toggle
    if (mode && mode !== 'off') {
      try {
        localStorage.setItem('smart_appliance_ac_last_mode_' + entityId, mode);
      } catch (e) {
        // Errore salvataggio localStorage
      }
    }

    this._optimisticMode = mode;
    this._optimisticModeUntil = Date.now() + 15000;
    this.requestUpdate();
    this.hass.callService('climate', 'set_hvac_mode', {
      entity_id: entityId,
      hvac_mode: mode
    });
  }

  // --- HANDLE FAN ---
  _handleFanSpeed(entityId, speed) {
    this._optimisticFanSpeed = speed;
    this._optimisticFanSpeedUntil = Date.now() + 15000;
    this.requestUpdate();
    this.hass.callService('climate', 'set_fan_mode', {
      entity_id: entityId,
      fan_mode: speed,
    });
  }
  _handlePresetMode(entityId, preset) {
    this._optimisticPreset = preset;
    this._optimisticPresetUntil = Date.now() + 15000;
    this.requestUpdate();
    this.hass.callService('climate', 'set_preset_mode', {
      entity_id: entityId,
      preset_mode: preset,
    });
  }
  _handleSwingMode(entityId, swing) {
    this._optimisticSwing = swing;
    this._optimisticSwingUntil = Date.now() + 15000;
    this.requestUpdate();
    this.hass.callService('climate', 'set_swing_mode', {
      entity_id: entityId,
      swing_mode: swing,
    });
  }
  _toggleControls() {
    this._showControls = !this._showControls;
    this.requestUpdate();
  }

  _getPresetIcon(mode) {
    switch (mode) {
      case 'eco':
        return 'mdi:leaf';
      case 'boost':
        return 'mdi:rocket';
      case 'sleep':
        return 'mdi:sleep';
      case 'away':
        return 'mdi:home-export-outline';
      case 'comfort':
        return 'mdi:sofa';
      case 'home':
        return 'mdi:home';
      case 'activity':
        return 'mdi:run';
      case 'none':
        return 'mdi:close';
      default:
        return 'mdi:tune-variant';
    }
  }

  _getFanSpeedIcon(speed) {
    const fanIcons = {
      auto: 'mdi:fan-auto',
      low: 'mdi:fan-speed-1',
      medium: 'mdi:fan-speed-2',
      high: 'mdi:fan-speed-3',
      max: 'mdi:fan-plus',
      min: 'mdi:fan-minus',
      quiet: 'mdi:volume-mute',
      off: 'mdi:fan-off',
      '1': 'mdi:numeric-1-circle',
      '2': 'mdi:numeric-2-circle',
      '3': 'mdi:numeric-3-circle',
      '4': 'mdi:numeric-4-circle',
      '5': 'mdi:numeric-5-circle',
      bassa: 'mdi:fan-speed-1',
      media: 'mdi:fan-speed-2',
      alta: 'mdi:fan-speed-3'
    };
    return fanIcons[speed.toLowerCase()] || 'mdi:fan';
  }

  _getSwingIcon(swing) {
    const swingIcons = {
      off: 'mdi:close',
      vertical: 'mdi:swap-vertical-bold',
      horizontal: 'mdi:swap-horizontal-bold',
      both: 'mdi:all-inclusive',
      orizzontale: 'mdi:swap-horizontal-bold',
      verticale: 'mdi:swap-vertical-bold',
      entrambi: 'mdi:all-inclusive',
      auto: 'mdi:auto-fix',
      left_right: 'mdi:swap-horizontal',
      up_down: 'mdi:swap-vertical',
      wide: 'mdi:arrow-expand-horizontal',
      spot: 'mdi:crosshairs-gps'
    };
    return swingIcons[swing.toLowerCase()] || 'mdi:axis-z-rotate-clockwise';
  }

  _getContactSensorIcon(entityConfig) {
    // Trova il sensore settings associato a questa climate entity
    const climateEntity = typeof entityConfig === 'string' ? entityConfig : entityConfig.entity;
    const settingsState = this._getSettingsStateForClimate(climateEntity);

    // Verifica che ci sia il sensore settings, che abbia finestre configurate e lo stato del gruppo
    if (!settingsState ||
        !settingsState.attributes.window_sensors ||
        !Array.isArray(settingsState.attributes.window_sensors) ||
        settingsState.attributes.window_sensors.length === 0 ||
        !settingsState.attributes.window_group_state) {
      return '';
    }

    const isOpen = settingsState.attributes.window_group_state === 'on';
    const icon = isOpen ? 'mdi:window-open-variant' : 'mdi:window-closed-variant';
    const title = isOpen ? 'Finestra Aperta' : 'Finestra Chiusa';

    return html`
      <ha-icon
        class="status-icon contact ${isOpen ? 'open' : 'closed'}"
        icon="${icon}"
        title="${title}"
      ></ha-icon>
    `;
  }

  // Utility per capitalizzare
  capitalize(str) {
    if (typeof str !== 'string') return str;
    if (!str.length) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  render() {
    if (!this.config || !this.hass) return html``;

    // Fix: controllo che ci siano entità configurate
    if (!this.entities || this.entities.length === 0) {
      return html`
        <ha-card>
          <div class="card" style="padding: 16px; text-align: center;">
            <p>Please add entity in card configuration</p>
          </div>
        </ha-card>
      `;
    }

    const current = this.entities[this._currentIndex];
    // Fix: controllo che current sia definito
    if (!current) {
      return html`
        <ha-card>
          <div class="card" style="padding: 16px; text-align: center;">
            <p>Please configure entity</p>
          </div>
        </ha-card>
      `;
    }

    const entityId = typeof current === 'string' ? current : current.entity;
    const title = typeof current === 'string' ? null : current.title || '';
    const tempSensorId = (typeof current === 'string') ? null : current.temperature_sensor;
    const state = this.hass.states[entityId];
    if (!state) return html``;
    const name = title || state.attributes.friendly_name || entityId;

    // Usa il sensore di temperatura personalizzato se configurato, altrimenti quello dell'entità climate
    let currentTemp;
    if (tempSensorId && this.hass.states[tempSensorId]) {
      const tempValue = this.hass.states[tempSensorId].state;
      // Converti in numero se è una stringa numerica valida
      currentTemp = !isNaN(tempValue) && tempValue !== null && tempValue !== '' ? Number(tempValue) : tempValue;
    } else {
      currentTemp = state.attributes.current_temperature;
    }

    // Assicurati che currentTemp sia un numero valido per i DIGIT_SVG
    if (isNaN(currentTemp) || currentTemp === null || currentTemp === undefined) {
      currentTemp = state.attributes.current_temperature || 0;
    }

    const isOn = state.state !== 'off';
    const currentMode = state.state;
    const fanMode = state.attributes.fan_mode || 'auto';
    let targetTemp = state.attributes.temperature;
    let tempColor = '';
    // Leggi orari notifiche dal sensore settings
    const settings = this._getSettingsStateForClimate(entityId);
    const notifStartPush = settings?.attributes?.notification_time_start_push || '08:00';
    const notifEndPush = settings?.attributes?.notification_time_end_push || '22:00';
    const notifStartAlexa = settings?.attributes?.notification_time_start_alexa || '08:00';
    const notifEndAlexa = settings?.attributes?.notification_time_end_alexa || '22:00';
    if (this._pendingTemp !== undefined) {
      targetTemp = this._pendingTemp;
      tempColor = 'color: red;';
    } else if (this._optimisticTemp !== undefined && Date.now() < this._optimisticUntil) {
      targetTemp = this._optimisticTemp;
      tempColor = 'color: red;';
    }
    // Modalità disponibili dinamicamente
    const hvacModes = state.attributes.hvac_modes || [];
    const fanModes = state.attributes.fan_modes || [];
    const swingModes = state.attributes.swing_modes || [];
    const presetModes = state.attributes.preset_modes || [];
    // Supporta dinamicamente tutte le modalità HVAC disponibili
    const availableModes = hvacModes.filter(m => m !== 'off');
    const predefinedModes = [
      { id: 'cool', icon: 'snowflake' },
      { id: 'heat', icon: 'fire' },
      { id: 'fan_only', icon: 'fan' },
      { id: 'dry', icon: 'water' },
      { id: 'auto', icon: 'thermostat-auto' },
      { id: 'heat_cool', icon: 'sun-snowflake-variant' }
    ];
    // Filtra modalità predefinite disponibili + aggiunge modalità custom
    const knownModes = predefinedModes.filter(m => availableModes.includes(m.id));
    const customModes = availableModes
      .filter(m => !predefinedModes.find(p => p.id === m))
      .map(mode => ({ id: mode, icon: 'tune-variant' }));
    const modes = [...knownModes, ...customModes];
    const modeClass = isOn ? `mode-${currentMode}` : '';

    return html`
      <ha-card>
        <div class="card" style="overflow: hidden; width: 100%; box-sizing: border-box;">
          <div class="pages-wrapper" style="display: flex; flex-direction: row; overflow-x: hidden; scroll-snap-type: x mandatory; scrollbar-width: none; -webkit-overflow-scrolling: touch; width: 100%; box-sizing: border-box;">
            ${this.entities.map((entity, idx) => {
              const entityId = typeof entity === 'string' ? entity : entity.entity;
              const title = typeof entity === 'string' ? null : entity.title || '';
              const tempSensorId = (typeof entity === 'string') ? null : entity.temperature_sensor;
              const state = this.hass.states[entityId];
              if (!state) return html``;
              const name = title || state.attributes.friendly_name || entityId;

              // Usa il sensore di temperatura personalizzato se configurato, altrimenti quello dell'entità climate
              let currentTemp;
              if (tempSensorId && this.hass.states[tempSensorId]) {
                const tempValue = this.hass.states[tempSensorId].state;
                // Converti in numero se è una stringa numerica valida
                currentTemp = !isNaN(tempValue) && tempValue !== null && tempValue !== '' ? Number(tempValue) : tempValue;
              } else {
                currentTemp = state.attributes.current_temperature;
              }

              // Assicurati che currentTemp sia un numero valido per i DIGIT_SVG
              if (isNaN(currentTemp) || currentTemp === null || currentTemp === undefined) {
                currentTemp = state.attributes.current_temperature || 0;
              }

              const isOn = state.state !== 'off';
              const currentMode = state.state;
              const fanMode = state.attributes.fan_mode || 'auto';
              let targetTemp = state.attributes.temperature;
              let tempColor = '';
              if (this._pendingTemp !== undefined && idx === this._currentIndex) {
                targetTemp = this._pendingTemp;
                tempColor = 'color: red;';
              } else if (this._optimisticTemp !== undefined && Date.now() < this._optimisticUntil && idx === this._currentIndex) {
                targetTemp = this._optimisticTemp;
                tempColor = 'color: red;';
              }
              // Modalità disponibili dinamicamente
              const hvacModes = state.attributes.hvac_modes || [];
              const fanModes = state.attributes.fan_modes || [];
              const swingModes = state.attributes.swing_modes || [];
              const presetModes = state.attributes.preset_modes || [];
              // Supporta dinamicamente tutte le modalità HVAC disponibili
              const availableModes = hvacModes.filter(m => m !== 'off');
              const predefinedModes = [
                { id: 'cool', icon: 'snowflake' },
                { id: 'heat', icon: 'fire' },
                { id: 'fan_only', icon: 'fan' },
                { id: 'dry', icon: 'water' },
                { id: 'auto', icon: 'thermostat-auto' },
                { id: 'heat_cool', icon: 'sun-snowflake-variant' }
              ];
              // Filtra modalità predefinite disponibili + aggiunge modalità custom
              const knownModes = predefinedModes.filter(m => availableModes.includes(m.id));
              const customModes = availableModes
                .filter(m => !predefinedModes.find(p => p.id === m))
                .map(mode => ({ id: mode, icon: 'tune-variant' }));
              const modes = [...knownModes, ...customModes];

              return html`
                <div class="page" style="width: 100%; min-width: 100%; max-width: 100%; box-sizing: border-box; scroll-snap-align: center; margin: 0;">
                  <div class="content-wrapper">
            <div class="header">
              ${this._theme === 'compact' ? html`
                <button
                  class="power-btn ${!isOn ? 'off' : ''}"
                  @click=${() => this._handlePowerToggle(entityId)}
                  style="order: -1; border-radius: 50%;"
                >
                  <ha-icon icon="mdi:power"></ha-icon>
                </button>
              ` : ''}
              <div class="title-wrap">
                <span class="title">${name}</span>
              </div>
              <div class="header-actions">
                ${this._getContactSensorIcon(entity)}
                ${this._theme !== 'compact' && state.attributes.swing_mode && state.attributes.swing_mode !== "off" ? html`
                  <svg
                    class="status-icon swing ${isOn ? state.attributes.swing_mode : ''}"
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="currentColor"
                    title="Swing: ${this._tr(state.attributes.swing_mode)}"
                  >
                    <path d="M14,12L10,16L14,20V16.9C18.56,16.44 22,14.42 22,12C22,9.58 18.56,7.56 14,7.1V9.09C17.45,9.43 20,10.6 20,12C20,13.4 17.45,14.57 14,14.91V12M4,12C4,10.6 6.55,9.43 10,9.09V7.1C5.44,7.56 2,9.58 2,12C2,14.16 4.74,16 8.58,16.7L7.88,16L9.08,14.79C6.11,14.36 4,13.27 4,12M13,2H11V13L13,11V2M13,22V21L11,19V22H13Z" />
                  </svg>
                ` : ''}
                ${this._theme !== 'compact' && state.attributes.preset_mode && state.attributes.preset_mode !== "none" ? html`
                  <ha-icon
                    class="status-icon preset ${isOn ? state.attributes.preset_mode : ''}"
                    icon="${this._getPresetIcon(state.attributes.preset_mode)}"
                    title="Preset: ${this._tr(state.attributes.preset_mode)}"
                  ></ha-icon>
                ` : ''}
                ${this._theme !== 'compact' && state.attributes.fan_mode ? html`
                  <ha-icon
                    class="status-icon fan ${isOn ? state.attributes.fan_mode : ''}"
                    icon="mdi:fan"
                    title="Fan: ${this._tr(state.attributes.fan_mode)}"
                  ></ha-icon>
                ` : ''}
                <ha-icon
                  class="icon-config-btn"
                  icon="mdi:bell-outline"
                  title="Notifiche"
                  @click=${this._toggleNotifications}
                  style="margin-left: 8px;"
                ></ha-icon>
                <ha-icon
                  class="icon-config-btn"
                  icon="mdi:cog"
                  title="Impostazioni"
                  @click=${this._toggleSettings}
                  style="margin-left: 8px;"
                ></ha-icon>
              </div>
            </div>
            <div class="main">
              <div class="temp-control ${this._theme === 'modern' ? modeClass : ''}">
                <button
                  class="power-btn ${!isOn ? 'off' : ''}"
                  @click=${() => this._handlePowerToggle(entityId)}
                >
                  <ha-icon icon="mdi:power"></ha-icon>
                </button>
                <div class="temp-wrap ${modeClass}">
                  ${currentMode === 'heat_cool' ? html`
                    <div style="display: flex; flex-direction: column; gap: 6px; align-items: center;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 13px; font-weight: 500;">Min</span>
                        <button class="temp-btn left" @click=${() => this._setTargetTempLow(entityId, tempLow - step)}>
                          <ha-icon icon="mdi:minus"></ha-icon>
                        </button>
                        <span class="temp-value">${Number(tempLow).toFixed(1)}°</span>
                        <button class="temp-btn right" @click=${() => this._setTargetTempLow(entityId, tempLow + step)}>
                          <ha-icon icon="mdi:plus"></ha-icon>
                        </button>
                      </div>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 13px; font-weight: 500;">Max</span>
                        <button class="temp-btn left" @click=${() => this._setTargetTempHigh(entityId, tempHigh - step)}>
                          <ha-icon icon="mdi:minus"></ha-icon>
                        </button>
                        <span class="temp-value">${Number(tempHigh).toFixed(1)}°</span>
                        <button class="temp-btn right" @click=${() => this._setTargetTempHigh(entityId, tempHigh + step)}>
                          <ha-icon icon="mdi:plus"></ha-icon>
                        </button>
                      </div>
                    </div>
                  ` : html`
                    <span class="current-temp">
                      ${
                        Number(currentTemp).toFixed(1)
                          .split("")
                          .map(c => {
                            const digitSvg = this._theme === 'compact' ? DIGIT_SVG_COMPACT : DIGIT_SVG;
                            return digitSvg[c]
                              ? html`<span class="digit-svg-current" .innerHTML=${digitSvg[c]}></span>`
                              : html`<span class="digit-svg-current"></span>`
                          })
                      }
                      <span class="degree-symbol ${this._pendingTemp !== undefined || (this._optimisticTemp !== undefined && Date.now() < this._optimisticUntil) ? 'pending' : ''}">&deg;</span>
                    </span>
                    <div class="temp-adjust">
                      <button class="temp-btn left" @click=${() => this._handleTemperature(entityId, -0.5)}>
                        <ha-icon icon="mdi:minus"></ha-icon>
                      </button>
                      <span class="temp-value ${this._pendingTemp !== undefined || (this._optimisticTemp !== undefined && Date.now() < this._optimisticUntil) ? 'pending' : ''}">
                        ${
                          Number(targetTemp).toFixed(1)
                            .split("")
                            .map(c => {
                              const digitSvg = this._theme === 'compact' ? DIGIT_SVG_COMPACT : DIGIT_SVG;
                              return digitSvg[c]
                                ? html`<span class="digit-svg" .innerHTML=${digitSvg[c]}></span>`
                                : html`<span class="digit-svg"></span>`
                            })
                        }
                        <span class="degree-symbol ${this._pendingTemp !== undefined || (this._optimisticTemp !== undefined && Date.now() < this._optimisticUntil) ? 'pending' : ''}">&deg;</span>
                      </span>
                      <button class="temp-btn right" @click=${() => this._handleTemperature(entityId, 0.5)}>
                        <ha-icon icon="mdi:plus"></ha-icon>
                      </button>
                    </div>
                  `}
                </div>
                <div>
                                     <button class="icon-btn expand-btn ${this._showControls ? 'expanded' : ''}" @click=${this._toggleControls}>
                    <ha-icon icon="mdi:chevron-down"></ha-icon>
                  </button>
                </div>
              </div>
              ${this._theme === 'compact' ? html`
                <!-- MODALITÀ NELLA CARD PRINCIPALE PER IL TEMA COMPACT -->
                <div class="modes">
                  ${modes.map(mode => {
                    const isOptimistic = this._optimisticMode === mode.id && Date.now() < this._optimisticModeUntil;
                    const isActive = isOptimistic || (
                      this._optimisticMode === undefined && currentMode === mode.id
                    );
                    return html`
                      <button
                        class="mode-btn ${isActive ? 'active' : ''}"
                        @click=${() => this._handleModeChange(entityId, mode.id)}
                      >
                        <ha-icon
                          class="mode-icon
                            ${mode.id === 'fan_only' && currentMode === 'fan_only' ? fanMode : ''}
                            ${isOptimistic ? 'optimistic' : ''}"
                          icon="mdi:${mode.icon}"
                        ></ha-icon>
                      </button>
                    `;
                  })}
                </div>
              ` : ''}
              <div class="expandable-content ${this._showControls ? 'expanded' : ''}">
                ${this._theme !== 'compact' ? html`
                  <div class="modes">
                    ${modes.map(mode => {
                      const isOptimistic = this._optimisticMode === mode.id && Date.now() < this._optimisticModeUntil;
                      const isActive = isOptimistic || (
                        this._optimisticMode === undefined && currentMode === mode.id
                      );
                      return html`
                        <button
                          class="mode-btn ${isActive ? 'active' : ''}"
                          @click=${() => this._handleModeChange(entityId, mode.id)}
                        >
                          <ha-icon
                            class="mode-icon
                              ${mode.id === 'fan_only' && currentMode === 'fan_only' ? fanMode : ''}
                              ${isOptimistic ? 'optimistic' : ''}"
                            icon="mdi:${mode.icon}"
                          ></ha-icon>
                        </button>
                      `;
                    })}
                  </div>
                ` : ''}
                <!-- FAN MODE -->
                <div class="fan-section">
                  <div class="fan-label">
                    <svg
                      class="fan-speed-indicator ${isOn ? fanMode : ''} mode-${currentMode.toLowerCase()}"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      fill="currentColor"
                    >
                      <path d="M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z" />
                    </svg>
                    ${this._theme === 'compact' ? '' : this._tr("fan_speed")}
                  </div>
                  <div class="fan-speeds">
                    ${fanModes.map(speed => {
                      const isOptimistic = this._optimisticFanSpeed === speed && Date.now() < this._optimisticFanSpeedUntil;
                      const isActive = isOptimistic || (
                        this._optimisticFanSpeed === undefined && fanMode === speed
                      );
                      return html`
                        <button
                          class="fan-btn ${isActive ? 'active' : ''}"
                          @click=${() => this._handleFanSpeed(entityId, speed)}
                          title="${this._theme === 'compact' ? this._tr(speed) : ''}"
                        >
                          ${this._theme === 'compact' ? html`
                            <ha-icon
                              class="${isOptimistic ? 'optimistic' : ''}"
                              icon="${this._getFanSpeedIcon(speed)}"
                            ></ha-icon>
                          ` : html`
                            <span class="fan-label-text ${isOptimistic ? 'optimistic' : ''}">
                              ${this._tr(speed)}
                            </span>
                          `}
                        </button>
                      `;
                    })}
                  </div>
                </div>
                <!-- PRESET MODE -->
                ${Array.isArray(state.attributes.preset_modes) && state.attributes.preset_modes.length > 0 ? html`
                  <div class="fan-section">
                    <div class="fan-label">
                              <ha-icon icon="mdi:tune-variant"></ha-icon>
                      ${this._theme === 'compact' ? '' : this._tr("preset_mode")}
                    </div>
                    <div class="fan-speeds">
                      ${state.attributes.preset_modes.map(preset => {
                        const isOptimistic = this._optimisticPreset === preset && Date.now() < this._optimisticPresetUntil;
                        const isActive = isOptimistic || (
                          this._optimisticPreset === undefined && state.attributes.preset_mode === preset
                        );
                        return html`
                          <button
                            class="fan-btn ${isActive ? 'active' : ''}"
                            @click=${() => this._handlePresetMode(entityId, preset)}
                            title="${this._theme === 'compact' ? this._tr(preset) : ''}"
                          >
                            ${this._theme === 'compact' ? html`
                              <ha-icon
                                class="${isOptimistic ? 'optimistic' : ''}"
                                icon="${this._getPresetIcon(preset)}"
                              ></ha-icon>
                            ` : html`
                              <span class="${isOptimistic ? 'optimistic' : ''}">
                                ${this._tr(preset)}
                              </span>
                            `}
                          </button>
                        `;
                      })}
                    </div>
                  </div>
                ` : ''}
                <!-- SWING MODE -->
                ${Array.isArray(state.attributes.swing_modes) && state.attributes.swing_modes.length > 0 ? html`
                  <div class="fan-section">
                    <div class="fan-label">
                      <ha-icon icon="mdi:axis-z-rotate-clockwise"></ha-icon>
                      ${this._theme === 'compact' ? '' : this._tr("swing_mode")}
                    </div>
                    <div class="fan-speeds">
                      ${state.attributes.swing_modes.map(swing => {
                        const isOptimistic = this._optimisticSwing === swing && Date.now() < this._optimisticSwingUntil;
                        const isActive = isOptimistic || (
                          this._optimisticSwing === undefined && state.attributes.swing_mode === swing
                        );
                        return html`
                          <button
                            class="fan-btn ${isActive ? 'active' : ''}"
                            @click=${() => this._handleSwingMode(entityId, swing)}
                            title="${this._theme === 'compact' ? this._tr(swing) : ''}"
                          >
                            ${this._theme === 'compact' ? html`
                              <ha-icon
                                class="${isOptimistic ? 'optimistic' : ''}"
                                icon="${this._getSwingIcon(swing)}"
                              ></ha-icon>
                            ` : html`
                              <span class="${isOptimistic ? 'optimistic' : ''}">
                                ${this._tr(swing)}
                              </span>
                            `}
                          </button>
                        `;
                      })}
                    </div>
                  </div>
                ` : ''}
                
                <!-- SEZIONE TIMER NELL'EXPAND CONTENT -->
                ${(() => {
                  const current = this.entities[this._currentIndex];
                  const entityId = typeof current === 'string' ? current : current.entity;
                  const settings = this._getSettingsStateForClimate(entityId);
                  
                  const timerOnSwitchId = this._findTimerOnSwitchForClimate(entityId);
                  const timerOffSwitchId = this._findTimerOffSwitchForClimate(entityId);
                  const autoTimerSwitchId = this._findAutoTimerSwitchForClimate(entityId);
                  const timerOnSwitch = timerOnSwitchId ? this.hass.states[timerOnSwitchId] : null;
                  const timerOffSwitch = timerOffSwitchId ? this.hass.states[timerOffSwitchId] : null;
                  const autoTimerSwitch = autoTimerSwitchId ? this.hass.states[autoTimerSwitchId] : null;
                  
                  // Nuovi sensori countdown
                  const timerOnCountdownId = this._findTimerOnCountdownForClimate(entityId);
                  const timerOffCountdownId = this._findTimerOffCountdownForClimate(entityId);
                  const timerOnCountdown = timerOnCountdownId ? this.hass.states[timerOnCountdownId] : null;
                  const timerOffCountdown = timerOffCountdownId ? this.hass.states[timerOffCountdownId] : null;
                  
                  const timerOnMinutes = this._getOptimisticTimerOnMinutes(entityId, settings?.attributes?.timer_on_minutes);
                  const timerOffMinutes = this._getOptimisticTimerOffMinutes(entityId, settings?.attributes?.timer_off_minutes);
                  const timerOnActive = timerOnCountdown?.attributes?.is_running || false;
                  const timerOffActive = timerOffCountdown?.attributes?.is_running || false;
                  const timerOnCountdownTime = timerOnCountdown?.state || "00:00:00";
                  const timerOffCountdownTime = timerOffCountdown?.state || "00:00:00";
                  const timerOnProgress = timerOnCountdown?.attributes?.progress_percent || 0;
                  const timerOffProgress = timerOffCountdown?.attributes?.progress_percent || 0;

                  return html`
                    <div class="timer-section">
                      <div class="timer-control ${timerOnActive ? 'active' : ''}">
                        <div class="timer-top-row">
                          <div class="timer-info">
                            <ha-icon icon="mdi:timer-play" style="color: #4CAF50;"></ha-icon>
                            <span class="timer-name">${this._tr("timer_on")}</span>
                          </div>
                          <button class="timer-action-btn ${timerOnActive ? 'stop' : 'start'}" 
                                  @click=${() => {
                                    if (timerOnSwitchId) {
                                      this.hass.callService('switch', timerOnActive ? 'turn_off' : 'turn_on', { 
                                        entity_id: timerOnSwitchId 
                                      });
                                    }
                                  }}>
                            <ha-icon icon="${timerOnActive ? 'mdi:stop' : 'mdi:play'}"></ha-icon>
                          </button>
                        </div>
                        
                        <div class="timer-inputs">
                          <label>Minuti:</label>
                          <input type="number" 
                                 .value=${timerOnMinutes} 
                                 min="1" max="480" 
                                 @input=${e => {
                                   const newValue = Number(e.target.value);
                                   if (newValue >= 1 && newValue <= 480) {
                                     this._setOptimisticTimerOnMinutes(entityId, newValue);
                                     this._debouncedTimerUpdate(entityId, 'timer_on_minutes', newValue);
                                   }
                                 }}>
                        </div>
                        
                        ${timerOnActive ? html`
                          <div class="timer-progress">
                            <div class="progress-bar">
                              <div class="progress-fill green" 
                                   style="width: ${timerOnProgress}%">
                                <div class="progress-shimmer"></div>
                              </div>
                            </div>
                            <div class="progress-text">
                              <span>${timerOnCountdownTime}</span>
                              <span>${timerOnProgress}%</span>
                            </div>
                          </div>
                        ` : ''}
                      </div>

                      <!-- Timer Spegnimento -->
                      <div class="timer-control ${timerOffActive ? 'active' : ''}">
                        <div class="timer-top-row">
                          <div class="timer-info">
                            <ha-icon icon="mdi:timer-off" style="color: #FF5722;"></ha-icon>
                            <span class="timer-name">${this._tr("timer_off")}</span>
                          </div>
                          <button class="timer-action-btn ${timerOffActive ? 'stop' : 'start'}" 
                                  @click=${() => {
                                    if (timerOffSwitchId) {
                                      this.hass.callService('switch', timerOffActive ? 'turn_off' : 'turn_on', { 
                                        entity_id: timerOffSwitchId 
                                      });
                                    }
                                  }}>
                            <ha-icon icon="${timerOffActive ? 'mdi:stop' : 'mdi:play'}"></ha-icon>
                          </button>
                        </div>
                        
                        <div class="timer-inputs">
                          <label>Minuti:</label>
                          <input type="number" 
                                 .value=${timerOffMinutes} 
                                 min="1" max="480" 
                                 @input=${e => {
                                   const newValue = Number(e.target.value);
                                   if (newValue >= 1 && newValue <= 480) {
                                     this._setOptimisticTimerOffMinutes(entityId, newValue);
                                     this._debouncedTimerUpdate(entityId, 'timer_off_minutes', newValue);
                                   }
                                 }}>
                        </div>
                        
                        ${autoTimerSwitch ? html`
                          <div class="auto-timer-toggle">
                            <label class="auto-timer-label">
                              <ha-icon icon="mdi:timer-cog" style="color: #9C27B0; margin-right: 4px;"></ha-icon>
                              ${this._tr("auto_timer")}
                            </label>
                            <label class="switch mini">
                              <input type="checkbox" 
                                     .checked=${autoTimerSwitch.state === 'on'} 
                                     @change=${e => {
                                       this.hass.callService('switch', e.target.checked ? 'turn_on' : 'turn_off', { 
                                         entity_id: autoTimerSwitchId 
                                       });
                                     }}>
                              <span class="slider"></span>
                            </label>
                          </div>
                          
                          <div class="timer-off-settings-expandable">
                            <div class="timer-off-settings-header" 
                                 @click=${() => this._toggleTimerOffSettings(entityId)}>
                              <div class="timer-off-settings-label">
                                <ha-icon icon="mdi:cog-outline" class="settings-icon"></ha-icon>
                                <span>${this._tr("timer_off_settings")}</span>
                              </div>
                              <ha-icon icon="mdi:chevron-down" 
                                       class="expand-icon ${this._isTimerOffSettingsExpanded(entityId) ? 'expanded' : ''}"></ha-icon>
                            </div>
                            
                            <div class="timer-off-settings-content ${this._isTimerOffSettingsExpanded(entityId) ? 'expanded' : ''}">
                              <div class="timer-setting-row">
                                <label class="timer-setting-label">
                                  <ha-icon icon="mdi:thermostat" class="setting-icon"></ha-icon>
                                  ${this._tr("timer_off_mode")}
                                </label>
                                ${(() => {
                                  const hvacSelector = this._findTimerOffHvacModeSelectForClimate(entityId);
                                  const hvacSelectorState = hvacSelector ? this.hass.states[hvacSelector] : null;
                                  const hvacValue = hvacSelectorState?.state || '';
                                  const availableHvacModes = this._getAvailableHvacModes(entityId);
                                  
                                  // If no selector entity, show empty fallback
                                  if (!hvacSelector) {
                                    return html`
                                      <select class="timer-setting-select" disabled>
                                        <option value="">-- Non configurato --</option>
                                      </select>
                                    `;
                                  }
                                  
                                  // Ensure the current value is in the available options
                                  const finalHvacValue = availableHvacModes.includes(hvacValue) ? hvacValue : (availableHvacModes.length > 0 ? availableHvacModes[0] : '');
                                  
                                  return html`
                                    <select class="timer-setting-select"
                                            .value=${finalHvacValue}
                                            @change=${e => {
                                              if (hvacSelector && e.target.value) {
                                                this.hass.callService('select', 'select_option', {
                                                  entity_id: hvacSelector,
                                                  option: e.target.value
                                                });
                                              }
                                            }}>
                                      ${availableHvacModes.length > 0 ? availableHvacModes.map(mode => html`
                                        <option value="${mode}" ?selected=${mode === finalHvacValue}>
                                          ${this._getHvacModeIcon(mode)} ${this._tr(mode)}
                                        </option>
                                      `) : html`<option value="">-- Nessuna modalità disponibile --</option>`}
                                    </select>
                                  `;
                                })()}
                              </div>
                              
                              <div class="timer-setting-row">
                                <label class="timer-setting-label">
                                  <ha-icon icon="mdi:fan" class="setting-icon"></ha-icon>
                                  ${this._tr("timer_off_fan_mode")}
                                </label>
                                ${(() => {
                                  const fanSelector = this._findTimerOffFanModeSelectForClimate(entityId);
                                  const fanSelectorState = fanSelector ? this.hass.states[fanSelector] : null;
                                  const fanValue = fanSelectorState?.state || '';
                                  const availableFanModes = this._getAvailableFanModes(entityId);
                                  
                                  // If no selector entity, show empty fallback
                                  if (!fanSelector) {
                                    return html`
                                      <select class="timer-setting-select" disabled>
                                        <option value="">-- Non configurato --</option>
                                      </select>
                                    `;
                                  }
                                  
                                  // Ensure the current value is in the available options
                                  const finalFanValue = availableFanModes.includes(fanValue) ? fanValue : (availableFanModes.length > 0 ? availableFanModes[0] : '');
                                  
                                  return html`
                                    <select class="timer-setting-select"
                                            .value=${finalFanValue}
                                            @change=${e => {
                                              if (fanSelector && e.target.value) {
                                                this.hass.callService('select', 'select_option', {
                                                  entity_id: fanSelector,
                                                  option: e.target.value
                                                });
                                              }
                                            }}>
                                      ${availableFanModes.length > 0 ? availableFanModes.map(mode => html`
                                        <option value="${mode}" ?selected=${mode === finalFanValue}>
                                          ${this._getFanModeIcon(mode)} ${this._tr(mode) || mode}
                                        </option>
                                      `) : html`<option value="">-- Nessuna modalità disponibile --</option>`}
                                    </select>
                                  `;
                                })()}
                              </div>
                            </div>
                          </div>
                        ` : ''}
                        
                        ${timerOffActive ? html`
                          <div class="timer-progress">
                            <div class="progress-bar">
                              <div class="progress-fill orange-red" 
                                   style="width: ${timerOffProgress}%">
                                <div class="progress-shimmer"></div>
                              </div>
                            </div>
                            <div class="progress-text">
                              <span>${timerOffCountdownTime}</span>
                              <span>${timerOffProgress}%</span>
                            </div>
                          </div>
                        ` : ''}
                      </div>

                      
                    </div>
                  `;
                })()}
              </div>
                    </div>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
        <div class="navigation-buttons" style="display: flex; justify-content: space-between; align-items: center; padding: 0 23px 12px 23px; margin-top: 8px; margin-bottom: 0; z-index: 1; position: relative;">
              <button class="nav-btn" @click=${this._prevEntity}>
                <ha-icon icon="mdi:chevron-left"></ha-icon>
              </button>
          <span class="nav-info" style="font-size: 15px; color: var(--mac-text-secondary);">
            ${this._currentIndex + 1} / ${this.entities.length}
              </span>
              <button class="nav-btn" @click=${this._nextEntity}>
                <ha-icon icon="mdi:chevron-right"></ha-icon>
              </button>
        </div>
        ${this._showSettings ? html`
          <div class="settings-popup" @click=${(e) => {
            if (e.target.classList.contains('settings-popup')) {
              this._toggleSettings();
            }
          }}>
            <div class="settings-content">
              <div class="settings-header">
                <span class="settings-title">
                  ${this._tr("settings")}: ${this.entities[this._currentIndex]?.title || this.hass.states[this.entities[this._currentIndex]?.entity || this.entities[this._currentIndex]]?.attributes?.friendly_name || this.entities[this._currentIndex]?.entity || this.entities[this._currentIndex]}
                </span>
                <button class="close-button" @click=${this._toggleSettings}>
                  <ha-icon icon="mdi:close"></ha-icon>
                </button>
              </div>
              <div class="settings-body">
              ${(() => {
                const current = this.entities[this._currentIndex];
                const entityId = typeof current === 'string' ? current : current.entity;
                const settings = this._getSettingsStateForClimate(entityId);
                const notifStartPush = settings?.attributes?.notification_time_start_push || '';
                const notifEndPush = settings?.attributes?.notification_time_end_push || '';
                const notifStartAlexa = settings?.attributes?.notification_time_start_alexa || '';
                const notifEndAlexa = settings?.attributes?.notification_time_end_alexa || '';

                // Switch automazione
                const switchEntity = settings?.attributes?.automation_switch;
                const switchState = switchEntity ? this.hass.states[switchEntity] : null;
                
                // Switch blocca impostazioni
                const lockSettingsEntity = settings?.attributes?.lock_settings_switch;
                const lockSettingsState = lockSettingsEntity ? this.hass.states[lockSettingsEntity] : null;
                const fanModeSummer = settings?.attributes?.fan_mode_summer;
                const fanModeWinter = settings?.attributes?.fan_mode_winter;
                const hvacModeSummer = settings?.attributes?.hvac_mode_summer;
                const hvacModeWinter = settings?.attributes?.hvac_mode_winter;

                return html`
                  ${this._checkSettingsWarning(entityId, !!settings) ? html`<span style="animation: pulse-red 1.4s infinite; text-align: center; font-size: 16px; display: block; margin: 10px 0;">⚠️ ${this._tr("settings_sensor_missing")} ⚠️</span>` : ''}
                  <div class="section-title">${this._tr("season_mode")}</div>
                  <div class="season-row">
                    <div
                      class="toggle-btn ${((this._optimisticSeason || settings?.attributes?.season) === 'auto') ? 'active optimistic' : ''}"
                      @click=${() => this._SeasonSelect('auto')}
                    >
                      <ha-icon
                        icon="mdi:calendar-sync"
                        style="color: ${((this._optimisticSeason || settings?.attributes?.season) === 'auto') ? '#4caf50' : '#cfcfcf'}; font-size: 20px; margin-right: 6px;"
                      ></ha-icon>
                      ${this._tr("auto")}
                    </div>
                    <div
                      class="toggle-btn ${((this._optimisticSeason || settings?.attributes?.season) === 'summer') ? 'active optimistic' : ''}"
                      @click=${() => this._SeasonSelect('summer')}
                    >
                      <ha-icon
                        icon="mdi:white-balance-sunny"
                        style="color: ${((this._optimisticSeason || settings?.attributes?.season) === 'summer') ? '#ff9800' : '#cfcfcf'}; font-size: 20px; margin-right: 6px;"
                      ></ha-icon>
                      ${this._tr("summer")}
                    </div>
                    <div
                      class="toggle-btn ${((this._optimisticSeason || settings?.attributes?.season) === 'winter') ? 'active optimistic' : ''}"
                      @click=${() => this._SeasonSelect('winter')}
                    >
                      <ha-icon
                        icon="mdi:snowflake"
                        style="color: ${((this._optimisticSeason || settings?.attributes?.season) === 'winter') ? '#2196f3' : '#cfcfcf'}; font-size: 20px; margin-right: 6px;"
                      ></ha-icon>
                      ${this._tr("winter")}
                    </div>
                  </div>
                  <!-- SWITCH AUTOMAZIONI -->
                  <div class="settings-section">
                    <div class="automation-switch-row">
                      <span class="automation-title">🔄 ${this._tr("automation_switch")}</span>
                      <label class="switch">
                          <input type="checkbox" 
                                 .checked=${switchState?.state === 'on'} 
                                 .disabled=${!switchEntity}
                                 @change=${e => {
                          if (switchEntity) {
                            this.hass.callService('switch', e.target.checked ? 'turn_on' : 'turn_off', { entity_id: switchEntity });
                          }
                        }}>
                        <span class="slider"></span>
                      </label>
                    </div>
                    <div class="automation-switch-row">
                      <span class="automation-title">🔒 ${this._tr("lock_settings_switch")}</span>
                      <label class="switch">
                          <input type="checkbox" 
                                 .checked=${lockSettingsState?.state === 'on'} 
                                 .disabled=${!lockSettingsEntity}
                                 @change=${e => {
                          if (lockSettingsEntity) {
                            this.hass.callService('switch', e.target.checked ? 'turn_on' : 'turn_off', { entity_id: lockSettingsEntity });
                          }
                        }}>
                        <span class="slider"></span>
                      </label>
                    </div>
                  </div>
                  <!-- SEZIONE TIMER TRADIZIONALI -->
                  <div class="settings-section">
                    <div class="settings-section-title">⏱️ Timers</div>
                    <div class="timer-grid">
                      <div class="timer-field">
                        <label>Timeout (min)</label>
                        <input type="number" .value=${settings?.attributes?.timeout ?? ''} @change=${e => {
                        this.hass.callService('climate_manager', 'set_timer', { entity_id: entityId, timeout: Number(e.target.value) });
                        }}>
                      </div>
                      <div class="timer-field">
                        <label>Delay Off (sec)</label>
                        <input type="number" .value=${settings?.attributes?.delay_before_off ?? ''} @change=${e => {
                        this.hass.callService('climate_manager', 'set_timer', { entity_id: entityId, delay_before_off: Number(e.target.value) });
                        }}>
                      </div>
                      <div class="timer-field">
                        <label>Delay On (sec)</label>
                        <input type="number" .value=${settings?.attributes?.delay_before_on ?? ''} @change=${e => {
                        this.hass.callService('climate_manager', 'set_timer', { entity_id: entityId, delay_before_on: Number(e.target.value) });
                        }}>
                      </div>
                    </div>
                  </div>
                  <div class="settings-row-duo">
                    <div class="settings-section">
                      <div class="settings-section-title">${this._getLang() === 'it' ? 'Temp. di accensione' : 'Activation temp.'} °</div>
                      <div class="season-temp-row">
                        <div class="season-temp-field">
                          <label>${this._tr("summer")}</label>
                          <input type="number" .value=${settings?.attributes?.temperature_summer ?? ''} @change=${e => {
                        this.hass.callService('climate_manager', 'set_temperature', { entity_id: entityId, temperature_summer: Number(e.target.value) });
                          }}>
                        </div>
                        <div class="season-temp-field">
                          <label>${this._tr("winter")}</label>
                          <input type="number" .value=${settings?.attributes?.temperature_winter ?? ''} @change=${e => {
                        this.hass.callService('climate_manager', 'set_temperature', { entity_id: entityId, temperature_winter: Number(e.target.value) });
                          }}>
                        </div>
                      </div>
                    </div>
                    <div class="settings-section">
                      <div class="settings-section-title">${this._tr("threshold")} °</div>
                      <div class="season-temp-row">
                        <div class="season-temp-field">
                          <label>${this._tr("summer")}</label>
                          <input type="number" .value=${settings?.attributes?.summer_temp_threshold ?? ''} @change=${e => {
                        this.hass.callService('climate_manager', 'set_option', { entity_id: entityId, key: 'summer_temp_threshold', value: Number(e.target.value) });
                          }}>
                        </div>
                        <div class="season-temp-field">
                          <label>${this._tr("winter")}</label>
                          <input type="number" .value=${settings?.attributes?.winter_temp_threshold ?? ''} @change=${e => {
                        this.hass.callService('climate_manager', 'set_option', { entity_id: entityId, key: 'winter_temp_threshold', value: Number(e.target.value) });
                          }}>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="settings-row-duo">
                    <div class="settings-section">
                      <div class="settings-section-title">Fan Mode</div>
                      <div class="season-select-row">
                        <div class="season-select-field">
                          <label>${this._tr("summer")}</label>
                        <select
                          @change=${e => {
                          this.hass.callService('climate_manager', 'set_fan_mode', { entity_id: entityId, fan_mode_summer: e.target.value });
                          setTimeout(() => this.requestUpdate(), 500);
                        }}>
                          <option value="" ?selected=${!settings?.attributes?.fan_mode_summer}>-- Seleziona --</option>
                          ${(this.hass.states[entityId]?.attributes?.fan_modes || []).map(mode => html`
                            <option value="${mode}" ?selected=${mode === settings?.attributes?.fan_mode_summer}>${this._tr(mode)}</option>
                          `)}
                        </select>
                        </div>
                        <div class="season-select-field">
                          <label>${this._tr("winter")}</label>
                        <select
                          @change=${e => {
                          this.hass.callService('climate_manager', 'set_fan_mode', { entity_id: entityId, fan_mode_winter: e.target.value });
                          setTimeout(() => this.requestUpdate(), 500);
                        }}>
                          <option value="" ?selected=${!settings?.attributes?.fan_mode_winter}>-- Seleziona --</option>
                          ${(this.hass.states[entityId]?.attributes?.fan_modes || []).map(mode => html`
                            <option value="${mode}" ?selected=${mode === settings?.attributes?.fan_mode_winter}>${this._tr(mode)}</option>
                          `)}
                        </select>
                        </div>
                      </div>
                    </div>
                    <div class="settings-section">
                      <div class="settings-section-title">HVAC Mode</div>
                      <div class="season-select-row">
                        <div class="season-select-field">
                          <label>${this._tr("summer")}</label>
                        <select
                          @change=${e => {
                          this.hass.callService('climate_manager', 'set_hvac_mode', { entity_id: entityId, hvac_mode_summer: e.target.value });
                          setTimeout(() => this.requestUpdate(), 500);
                        }}>
                          <option value="" ?selected=${!settings?.attributes?.hvac_mode_summer}>-- Seleziona --</option>
                          ${(this.hass.states[entityId]?.attributes?.hvac_modes || []).map(mode => html`
                            <option value="${mode}" ?selected=${mode === settings?.attributes?.hvac_mode_summer}>${this._tr(mode)}</option>
                          `)}
                        </select>
                        </div>
                        <div class="season-select-field">
                          <label>${this._tr("winter")}</label>
                        <select
                          @change=${e => {
                          this.hass.callService('climate_manager', 'set_hvac_mode', { entity_id: entityId, hvac_mode_winter: e.target.value });
                          setTimeout(() => this.requestUpdate(), 500);
                        }}>
                          <option value="" ?selected=${!settings?.attributes?.hvac_mode_winter}>-- Seleziona --</option>
                          ${(this.hass.states[entityId]?.attributes?.hvac_modes || []).map(mode => html`
                            <option value="${mode}" ?selected=${mode === settings?.attributes?.hvac_mode_winter}>${this._tr(mode)}</option>
                          `)}
                        </select>
                    </div>
                  </div>
                  </div>
                  </div>
                `;
              })()}
              </div>
            </div>
          </div>
        ` : ''}
        ${this._showNotifications ? html`
          <div class="settings-popup" @click=${(e) => {
            if (e.target.classList.contains('settings-popup')) {
              this._toggleNotifications();
            }
          }}>
            <div class="settings-content">
              <div class="settings-header">
                <span class="settings-title">
                  ${this._tr("notifications")}: ${this.entities[this._currentIndex]?.title || this.hass.states[this.entities[this._currentIndex]?.entity || this.entities[this._currentIndex]]?.attributes?.friendly_name || this.entities[this._currentIndex]?.entity || this.entities[this._currentIndex]}
                </span>
                <button class="close-button" @click=${this._toggleNotifications}>
                  <ha-icon icon="mdi:close"></ha-icon>
                </button>
              </div>
              <div class="settings-body">
              ${(() => {
                const current = this.entities[this._currentIndex];
                const entityId = typeof current === 'string' ? current : current.entity;
                const settings = this._getSettingsStateForClimate(entityId);
                const msgAlexa = settings?.attributes?.enable_msgs_alexa || {};
                const msgPush = settings?.attributes?.enable_msgs_push || {};
                const messages = settings?.attributes?.messages || {};

                // Lista di tutti i tipi di messaggi possibili
                const messageTypes = [
                  'window_open',
                  'window_open_long',
                  'resume',
                  'climate_blocked_temp',
                  'climate_blocked_summer',
                  'climate_blocked_winter',
                  'climate_on_ok',
                  'timer_on_notification'
                ];

                return html`
                  ${this._checkSettingsWarning(entityId, !!settings) ? html`<span style="animation: pulse-red 1.4s infinite;color: red; text-align: center; font-size: 12px; display: block; margin: 10px 0;">⚠️ ${this._tr("settings_sensor_missing")} ⚠️</span>` : ''}

                  <!-- Campo Room Name -->
                  <div class="settings-section">
                    <div class="message-edit-row">
                      <label>🏠 ${this._getLang() === 'it' ? 'Nome stanza per notifiche' : 'Room name for notifications'}</label>
                      <ha-textfield
                        .value=${settings?.attributes?.room_name || ''}
                        placeholder="${this._getLang() === 'it' ? 'Es: Soggiorno, Camera da letto...' : 'Ex: Living room, Bedroom...'}"
                        @blur=${e => {
                          if (e.target.value.trim() !== (settings?.attributes?.room_name || '')) {
                            this.hass.callService('climate_manager', 'set_room_name', {
                              entity_id: entityId,
                              room_name: e.target.value.trim()
                            });
                            setTimeout(() => this.requestUpdate(), 100);
                          }
                        }}
                        @keydown=${e => {
                          if (e.key === 'Enter') {
                            if (e.target.value.trim() !== (settings?.attributes?.room_name || '')) {
                              this.hass.callService('climate_manager', 'set_room_name', {
                                entity_id: entityId,
                                room_name: e.target.value.trim()
                              });
                              setTimeout(() => this.requestUpdate(), 100);
                            }
                          }
                        }}
                      ></ha-textfield>
                    </div>
                  </div>
                  <!-- Fasce orarie notifiche -->
                  <div class="settings-section">
                    <div class="settings-section-title">${this._tr("push_time_range")}</div>
                    <div class="time-range">
                      <label style="font-size:13px; margin-right:6px;">${this._tr("start_time")}</label>
                      <input
                        type="time"
                        class="time-input"
                        .value=${settings?.attributes?.notification_time_start_push || ''}
                        @blur=${this._updateStartTimePush}
                        @change=${this._updateStartTimePush}
                      >
                      <label style="font-size:13px; margin:0 6px 0 12px;">${this._tr("end_time")}</label>
                      <input
                        type="time"
                        class="time-input"
                        .value=${settings?.attributes?.notification_time_end_push || ''}
                        @blur=${this._updateEndTimePush}
                        @change=${this._updateEndTimePush}
                      >
                    </div>
                  </div>
                  <div class="settings-section">
                    <div class="settings-section-title">${this._tr("alexa_time_range")}</div>
                    <div class="time-range">
                      <label style="font-size:13px; margin-right:6px;">${this._tr("start_time")}</label>
                      <input
                        type="time"
                        class="time-input"
                        .value=${settings?.attributes?.notification_time_start_alexa || ''}
                        @blur=${this._updateStartTime}
                        @change=${this._updateStartTime}
                      >
                      <label style="font-size:13px; margin:0 6px 0 12px;">${this._tr("end_time")}</label>
                      <input
                        type="time"
                        class="time-input"
                        .value=${settings?.attributes?.notification_time_end_alexa || ''}
                        @blur=${this._updateEndTime}
                        @change=${this._updateEndTime}
                      >
                    </div>
                  </div>

                  <!-- Push Targets -->
                  <div class="settings-section">
                    <div class="settings-section-title">📱 ${this._getLang() === 'it' ? 'Servizi notifiche push' : 'Push notification services'}</div>
                    <div class="message-edit-row">
                      <ha-textfield
                        .value=${settings?.attributes?.push_targets ?? ""}
                        placeholder="${this._getLang() === 'it' ? 'Esempio: mobile_app_mario, mobile_app_luigi' : 'Example: mobile_app_mario, mobile_app_luigi'}"
                        @blur=${e => {
                          if (e.target.value.trim() !== (settings?.attributes?.push_targets || '')) {
                            this.hass.callService('climate_manager', 'set_push_targets', {
                              entity_id: entityId,
                              targets: e.target.value.trim()
                            });
                            setTimeout(() => this.requestUpdate(), 100);
                          }
                        }}
                        @keydown=${e => {
                          if (e.key === 'Enter') {
                            if (e.target.value.trim() !== (settings?.attributes?.push_targets || '')) {
                              this.hass.callService('climate_manager', 'set_push_targets', {
                                entity_id: entityId,
                                targets: e.target.value.trim()
                              });
                              setTimeout(() => this.requestUpdate(), 100);
                            }
                          }
                        }}
                      ></ha-textfield>
                      <span style="text-align:center;font-size:12px;color:#888;display:block;margin-top:4px;">
                        ${this._getLang() === 'it' ? 'Inserisci il servizio notify. es: notify.mobile_app_mario' : 'Enter only the target name, without notify. ex: notify.mobile_app_mario '}
                      </span>
                    </div>
                  </div>

                  ${messageTypes.map(type => {
                    // Gestione speciale per timer_on_notification
                    if (type === 'timer_on_notification') {
                      const timerOnNotificationNumberId = this._findTimerOnNotificationNumberForClimate(entityId);
                      const timerOnNotificationNumber = timerOnNotificationNumberId ? this.hass.states[timerOnNotificationNumberId] : null;
                      const currentMinutes = timerOnNotificationNumber ? Number(timerOnNotificationNumber.state) : 0;
                      
                      return html`
                        <div class="settings-section">
                          <div class="settings-section-title">${this._tr(type)}</div>

                          <!-- Toggle Alexa e Push sulla stessa riga -->
                          <div class="notification-toggles-row">
                            <div class="notification-toggle-group">
                              <span class="toggle-label">${this._tr("alexa_notifications")}</span>
                              <label class="switch">
                                <input type="checkbox"
                                  .checked=${msgAlexa[type] !== false}
                                  @change=${e => {
                                    this.hass.callService('climate_manager', 'set_notification_switch', {
                                      entity_id: entityId,
                                      msg_type: type,
                                      channel: 'alexa',
                                      value: e.target.checked
                                    });
                                    setTimeout(() => this.requestUpdate(), 100);
                                  }}>
                                <span class="slider"></span>
                              </label>
                            </div>

                            <div class="notification-toggle-group">
                              <span class="toggle-label">${this._tr("push_notifications")}</span>
                              <label class="switch">
                                <input type="checkbox"
                                  .checked=${msgPush[type] !== false}
                                  @change=${e => {
                                    this.hass.callService('climate_manager', 'set_notification_switch', {
                                      entity_id: entityId,
                                      msg_type: type,
                                      channel: 'push',
                                      value: e.target.checked
                                    });
                                    setTimeout(() => this.requestUpdate(), 100);
                                  }}>
                                <span class="slider"></span>
                              </label>
                            </div>
                          </div>

                          <!-- Controllo minuti per timer_on_notification -->
                          <div class="message-edit-row">
                            <label>${this._getLang() === 'it' ? 'Minuti prima della notifica' : 'Minutes before notification'}</label>
                            <ha-textfield
                              type="number"
                              .value=${currentMinutes}
                              min="0"
                              max="720"
                              placeholder="0 = OFF"
                              @input=${e => {
                                const newValue = Number(e.target.value);
                                if (newValue >= 0 && newValue <= 720 && timerOnNotificationNumberId) {
                                  this.hass.callService('number', 'set_value', {
                                    entity_id: timerOnNotificationNumberId,
                                    value: newValue
                                  });
                                }
                              }}
                              @change=${e => {
                                const newValue = Number(e.target.value);
                                if (newValue >= 0 && newValue <= 720 && timerOnNotificationNumberId) {
                                  this.hass.callService('number', 'set_value', {
                                    entity_id: timerOnNotificationNumberId,
                                    value: newValue
                                  });
                                }
                              }}
                            ></ha-textfield>
                            <small style="color: #757575; display: block; margin-top: 4px;">
                              ${currentMinutes === 0 ? 
                                (this._getLang() === 'it' ? 'Disabilitato (0 = OFF)' : 'Disabled (0 = OFF)') : 
                                (this._getLang() === 'it' ? `Notifica dopo ${currentMinutes} minuti` : `Notification after ${currentMinutes} minutes`)
                              }
                            </small>
                          </div>
                        </div>
                      `;
                    }
                    
                    // Gestione normale per tutti gli altri tipi di messaggio
                    return html`
                      <div class="settings-section">
                        <div class="settings-section-title">${this._tr(type)}</div>

                        <!-- Toggle Alexa e Push sulla stessa riga -->
                        <div class="notification-toggles-row">
                          <div class="notification-toggle-group">
                            <span class="toggle-label">${this._tr("alexa_notifications")}</span>
                            <label class="switch">
                              <input type="checkbox"
                                .checked=${msgAlexa[type] !== false}
                                @change=${e => {
                                  this.hass.callService('climate_manager', 'set_notification_switch', {
                                    entity_id: entityId,
                                    msg_type: type,
                                    channel: 'alexa',
                                    value: e.target.checked
                                  });
                                  setTimeout(() => this.requestUpdate(), 100);
                                }}>
                              <span class="slider"></span>
                            </label>
                          </div>

                          <div class="notification-toggle-group">
                            <span class="toggle-label">${this._tr("push_notifications")}</span>
                            <label class="switch">
                              <input type="checkbox"
                                .checked=${msgPush[type] !== false}
                                @change=${e => {
                                  this.hass.callService('climate_manager', 'set_notification_switch', {
                                    entity_id: entityId,
                                    msg_type: type,
                                    channel: 'push',
                                    value: e.target.checked
                                  });
                                  setTimeout(() => this.requestUpdate(), 100);
                                }}>
                              <span class="slider"></span>
                            </label>
                          </div>
                        </div>

                        <!-- Campo di testo messaggio personalizzato -->
                        <div class="message-edit-row">
                          <label>${this._tr("custom_message")}</label>
                          <ha-textfield
                            .value=${messages[type] || ''}
                            placeholder="${this._tr("custom_message_placeholder")}"
                            @blur=${e => {
                              if (e.target.value.trim() !== (messages[type] || '')) {
                                const newMessages = {...messages};
                                newMessages[type] = e.target.value.trim();
                                this.hass.callService('climate_manager', 'set_option', {
                                  entity_id: entityId,
                                  key: 'messages',
                                  value: newMessages
                                });
                                setTimeout(() => this.requestUpdate(), 100);
                              }
                            }}
                            @keydown=${e => {
                              if (e.key === 'Enter') {
                                if (e.target.value.trim() !== (messages[type] || '')) {
                                  const newMessages = {...messages};
                                  newMessages[type] = e.target.value.trim();
                                  this.hass.callService('climate_manager', 'set_option', {
                                    entity_id: entityId,
                                    key: 'messages',
                                    value: newMessages
                                  });
                                  setTimeout(() => this.requestUpdate(), 100);
                                }
                              }
                            }}
                          ></ha-textfield>
                        </div>
                      </div>
                    `;
                  })}

                `;
              })()}
              </div>
            </div>
          </div>
        ` : ''}
      </ha-card>
    `;
  }

  updated(changedProps) {
    super.updated(changedProps);

    // Set theme attribute on host element
    if (changedProps.has('_theme') || changedProps.has('config')) {
      this.setAttribute('theme', this._theme);
    }

    const current = this.entities[this._currentIndex];
    const entityId = typeof current === 'string' ? current : current.entity;
    const state = this.hass?.states?.[entityId];
    if (!state) return;

    // Save current mode if different from 'off'
    if (state.state && state.state !== 'off') {
      try {
        localStorage.setItem('smart_appliance_ac_last_mode_' + entityId, state.state);
      } catch (e) {
        // localStorage might not be available
    }
    }

    // === TRACKING SELECTOR CHANGES ===
    // Track timer off selector changes for all entities
    this.entities.forEach(entity => {
      const entId = typeof entity === 'string' ? entity : entity.entity;
      
      // Track HVAC mode selector
      const hvacSelector = this._findTimerOffHvacModeSelectForClimate(entId);
      if (hvacSelector) {
        const hvacState = this.hass.states[hvacSelector];
        const lastHvacKey = `_lastHvacSelector_${entId}`;
        if (this[lastHvacKey] !== hvacState?.state) {
          this[lastHvacKey] = hvacState?.state;
          this.requestUpdate();
        }
      }
      
      // Track fan mode selector
      const fanSelector = this._findTimerOffFanModeSelectForClimate(entId);
      if (fanSelector) {
        const fanState = this.hass.states[fanSelector];
        const lastFanKey = `_lastFanSelector_${entId}`;
        if (this[lastFanKey] !== fanState?.state) {
          this[lastFanKey] = fanState?.state;
          this.requestUpdate();
        }
      }
    });

    const newPreset = state.attributes.preset_mode;
    const newSwing = state.attributes.swing_mode;
    if (this._lastPreset !== newPreset || this._lastSwing !== newSwing) {
      this._lastPreset = newPreset;
      this._lastSwing = newSwing;
      this.requestUpdate();
    }

    // --- PRESET ---
    const actualPreset = state.attributes.preset_mode;
    if (
      this._optimisticPreset !== undefined &&
      actualPreset === this._optimisticPreset
    ) {
      this._optimisticPreset = undefined;
      this._optimisticPresetUntil = 0;
      if (this._optimisticRefreshTimer) {
        clearTimeout(this._optimisticRefreshTimer);
        this._optimisticRefreshTimer = null;
      }
      this.requestUpdate();
    } else if (this._optimisticPreset !== undefined) {
      if (!this._optimisticRefreshTimer) {
        this._optimisticRefreshTimer = setTimeout(() => {
          this.requestUpdate();
          this._optimisticRefreshTimer = null;
        }, 1000);
      }
      if (this._optimisticPresetUntil && Date.now() > this._optimisticPresetUntil) {
        this._optimisticPreset = undefined;
        this._optimisticPresetUntil = 0;
        if (this._optimisticRefreshTimer) {
          clearTimeout(this._optimisticRefreshTimer);
          this._optimisticRefreshTimer = null;
        }
        this.requestUpdate();
      }
    }

    // --- SWING ---
    const actualSwing = state.attributes.swing_mode;
    if (
      this._optimisticSwing !== undefined &&
      actualSwing === this._optimisticSwing
    ) {
      this._optimisticSwing = undefined;
      this._optimisticSwingUntil = 0;
      if (this._optimisticRefreshTimer) {
        clearTimeout(this._optimisticRefreshTimer);
        this._optimisticRefreshTimer = null;
      }
      this.requestUpdate();
    } else if (this._optimisticSwing !== undefined) {
      if (!this._optimisticRefreshTimer) {
        this._optimisticRefreshTimer = setTimeout(() => {
          this.requestUpdate();
          this._optimisticRefreshTimer = null;
        }, 1000);
      }
      if (this._optimisticSwingUntil && Date.now() > this._optimisticSwingUntil) {
        this._optimisticSwing = undefined;
        this._optimisticSwingUntil = 0;
        if (this._optimisticRefreshTimer) {
          clearTimeout(this._optimisticRefreshTimer);
          this._optimisticRefreshTimer = null;
        }
        this.requestUpdate();
      }
    }

    // === LOGICA OTTIMISTICA TEMPERATURA ===
    const actualTemp = state.attributes.temperature;
    if (
      (this._pendingTemp !== undefined && actualTemp === this._pendingTemp) ||
      (this._optimisticTemp !== undefined && actualTemp === this._optimisticTemp)
    ) {
      this._pendingTemp = undefined;
      this._optimisticTemp = undefined;
      this._optimisticUntil = 0;
      this.requestUpdate();
    }

    if (this._optimisticUntil && Date.now() > this._optimisticUntil) {
      this._pendingTemp = undefined;
      this._optimisticTemp = undefined;
      this._optimisticUntil = 0;
      this.requestUpdate();
    }

    // === LOGICA OTTIMISTICA MODE (HVAC) ===
    const actualMode = state.state;
    if (
      this._optimisticMode !== undefined &&
      actualMode === this._optimisticMode
    ) {
      this._optimisticMode = undefined;
      this._optimisticModeUntil = 0;
      if (this._optimisticRefreshTimer) {
        clearTimeout(this._optimisticRefreshTimer);
        this._optimisticRefreshTimer = null;
      }
      this.requestUpdate();
    } else if (this._optimisticMode !== undefined) {
      if (!this._optimisticRefreshTimer) {
        this._optimisticRefreshTimer = setTimeout(() => {
          this.requestUpdate();
          this._optimisticRefreshTimer = null;
        }, 1000);
      }
      if (this._optimisticModeUntil && Date.now() > this._optimisticModeUntil) {
        this._optimisticMode = undefined;
        this._optimisticModeUntil = 0;
        if (this._optimisticRefreshTimer) {
          clearTimeout(this._optimisticRefreshTimer);
          this._optimisticRefreshTimer = null;
        }
        this.requestUpdate();
      }
    }

    // === LOGICA OTTIMISTICA FAN MODE ===
    const actualFan = state.attributes.fan_mode;
    if (
      this._optimisticFanSpeed !== undefined &&
      actualFan === this._optimisticFanSpeed
    ) {
      this._optimisticFanSpeed = undefined;
      this._optimisticFanSpeedUntil = 0;
      if (this._optimisticRefreshTimer) {
        clearTimeout(this._optimisticRefreshTimer);
        this._optimisticRefreshTimer = null;
      }
      this.requestUpdate();
    } else if (this._optimisticFanSpeed !== undefined) {
      if (!this._optimisticRefreshTimer) {
        this._optimisticRefreshTimer = setTimeout(() => {
          this.requestUpdate();
          this._optimisticRefreshTimer = null;
        }, 1000);
      }
      if (this._optimisticFanSpeedUntil && Date.now() > this._optimisticFanSpeedUntil) {
        this._optimisticFanSpeed = undefined;
        this._optimisticFanSpeedUntil = 0;
        if (this._optimisticRefreshTimer) {
          clearTimeout(this._optimisticRefreshTimer);
          this._optimisticRefreshTimer = null;
        }
        this.requestUpdate();
      }
    }
  }

  _setTargetTempLow(entityId, newLow) {
    const state = this.hass.states[entityId];
    const min = state.attributes.min_temp ?? 16;
    const max = state.attributes.max_temp ?? 30;
    const high = state.attributes.target_temp_high ?? 24;
    newLow = Math.max(min, Math.min(high, newLow));
    this.hass.callService('climate', 'set_temperature', {
      entity_id: entityId,
      target_temp_low: newLow,
      target_temp_high: high
    });
  }

  _setTargetTempHigh(entityId, newHigh) {
    const state = this.hass.states[entityId];
    const min = state.attributes.min_temp ?? 16;
    const max = state.attributes.max_temp ?? 30;
    const low = state.attributes.target_temp_low ?? 20;
    newHigh = Math.max(low, Math.min(max, newHigh));
    this.hass.callService('climate', 'set_temperature', {
      entity_id: entityId,
      target_temp_low: low,
      target_temp_high: newHigh
    });
  }

  _toggleSettings(e) {
    e?.stopPropagation();
    this._showSettings = !this._showSettings;
    this._showNotifications = false; // Chiude il popup notifiche se aperto
  }

  _toggleNotifications(e) {
    e?.stopPropagation();
    this._showNotifications = !this._showNotifications;
    this._showSettings = false; // Chiude il popup settings se aperto
  }

  // ... dopo il costruttore della classe ClimateManagerCard:
  _SeasonSelect(mode) {
    const current = this.entities[this._currentIndex];
    const entityId = typeof current === 'string' ? current : current.entity;
    this._optimisticSeason = mode;
    this._optimisticSeasonUntil = Date.now() + 15000;
    this.requestUpdate();
    this.hass.callService("climate_manager", "set_season", {
      entity_id: entityId,
      season: mode
    });
    // Non aggiorno this._seasonMode qui: la UI si aggiornerà quando il sensore cambia davvero!
  }

  _setOptimisticTimerOnMinutes(entityId, value) {
    this._optimisticTimerOnMinutes[entityId] = {
      value: value,
      until: Date.now() + 2000 // 2 secondi
    };
    // Non invalidiamo la cache qui per evitare re-render continui durante la digitazione
    this.requestUpdate();
  }

  _setOptimisticTimerOffMinutes(entityId, value) {
    this._optimisticTimerOffMinutes[entityId] = {
      value: value,
      until: Date.now() + 2000 // 2 secondi
    };
    // Non invalidiamo la cache qui per evitare re-render continui durante la digitazione
    this.requestUpdate();
  }

  _getOptimisticTimerOnMinutes(entityId, defaultValue) {
    const optimistic = this._optimisticTimerOnMinutes[entityId];
    if (optimistic && Date.now() < optimistic.until) {
      return optimistic.value;
    }
    return defaultValue;
  }

  _getOptimisticTimerOffMinutes(entityId, defaultValue) {
    const optimistic = this._optimisticTimerOffMinutes[entityId];
    if (optimistic && Date.now() < optimistic.until) {
      return optimistic.value;
    }
    return defaultValue;
  }

  _toggleTimerOffSettings(entityId) {
    if (this._expandedTimerOffSettings.has(entityId)) {
      this._expandedTimerOffSettings.delete(entityId);
    } else {
      this._expandedTimerOffSettings.add(entityId);
    }
    this.requestUpdate();
  }

  _isTimerOffSettingsExpanded(entityId) {
    return this._expandedTimerOffSettings.has(entityId);
  }

  _getAvailableHvacModes(entityId) {
    // First check if Climate Manager selector exists for this entity
    const hvacSelector = this._findTimerOffHvacModeSelectForClimate(entityId);
    if (!hvacSelector) {
      return []; // No Climate Manager configuration, return empty array
    }
    
    const state = this.hass.states[entityId];
    if (!state || !state.attributes) return [];
    
    const hvacModes = state.attributes.hvac_modes || [];
    return hvacModes;
  }

  _getAvailableFanModes(entityId) {
    // First check if Climate Manager selector exists for this entity
    const fanSelector = this._findTimerOffFanModeSelectForClimate(entityId);
    if (!fanSelector) {
      return []; // No Climate Manager configuration, return empty array
    }
    
    const state = this.hass.states[entityId];
    if (!state || !state.attributes) return [];
    
    const fanModes = state.attributes.fan_modes || [];
    return fanModes;
  }

  _getHvacModeIcon(mode) {
    const icons = {
      'off': '🔴',
      'heat': '🔥',
      'cool': '❄️',
      'heat_cool': '🔄',
      'auto': '🤖',
      'dry': '💨',
      'fan_only': '🌪️'
    };
    return icons[mode] || '⚙️';
  }

  _getFanModeIcon(mode) {
    const icons = {
      'auto': '🤖',
      'low': '🔽',
      'medium': '➖',
      'high': '🔼',
      'middle_low': '📉',
      'middle_high': '📈',
      'silent': '🔇',
      'turbo': '⚡',
      'quiet': '🔇',
      'max': '⚡'
    };
    return icons[mode] || '🌪️';
  }

  static styles = css`
    :host {
      --mac-primary: var(--label-badge-red);
      --mac-surface: var(--material-background-color);
      --mac-background: var(--mac-surface);
      --mac-text: var(--primary-text-color);
      --mac-text-secondary: rgb(107, 114, 128);
      display: block;
      min-width: 250px;
      margin: 10px auto;
      max-width: 350px;
    }

    /* === CARD & LAYOUT === */
    .card {
      background: var(--mac-background);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .content-wrapper {
      padding-left: 8px; padding-right: 8px; box-sizing: border-box; width: 100%;
    }
    .pages-wrapper { display: flex; gap: 24px; }
    .page { /* margin-right: 24px; */ }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      border-top: 1px solid var(--mac-border);
    }

    /* === HEADER & TITLES === */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
    }
    .title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .title {
    	font-size: 12px;
    	font-weight: 600;
    	color: var(--primary-text-color);
    }
    .header-actions {
      display: flex;
      gap: 2px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--mac-text);
      margin: 16px;
    }

    /* === BUTTONS === */
    .icon-config-btn {
      border: none;
      background: var(--mac-background);
      color: var(--mac-text-secondary);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .icon-btn {
      border: none;
        background: rgba(255, 255, 255, 0.13);
      color: var(--mac-text-secondary);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      position: relative;
      right: 0px;
      top: 50%;
    }
    /* Automation switch ottimizzato */
    .automation-switch-row {
      flex-direction: row !important;
      gap: 16px !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 16px !important;
      background: none !important;
      border-radius: 12px !important;
      border: 1px solid var(--divider-color) !important;
    }
    .icon-config-btn:hover {
      color: var(--primary-text-color);
    }
    .icon-btn:hover {
      transform: scale(1.2);
      color: var(--mac-text-secondary);
      transition: all 0.2s;
    }
    .icon-btn.active {
      color: var(--primary-text-color);
      background: rgba(56, 128, 255, 0.1);
    }
    .icon-btn ha-icon {
      --mdc-icon-size: 22px;
      color: var(--primary-text-color);
    }
    .nav-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--mac-text-secondary);
      cursor: pointer;
      border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      transition: all 0.2s;
      padding: 0;
    }
    .nav-btn:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    .close-button {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        color: var(--mac-text-secondary);
        cursor: pointer;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        left: 10px;
        position: relative;
    }
    .close-button:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    .power-btn {
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
      border-radius: 50%;
      border: 1px solid #999;
      background: linear-gradient(to bottom, #ffffff, #e6e6e6) !important;
      color: black;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.1s ease-in-out;
      padding: 0;
      box-shadow:
        inset 0 2px 4px rgba(255, 255, 255, 0.7),
        inset 0 -2px 4px rgba(0, 0, 0, 0.2),
        0 4px 6px rgba(0, 0, 0, 0.3),
        0 1px 0 rgba(255, 255, 255, 0.8);
    }
    .power-btn:active {
      background: linear-gradient(to bottom, #d0d0d0, #f0f0f0);
      box-shadow:
        inset 0 2px 5px rgba(0, 0, 0, 0.3),
        0 1px 0 rgba(255, 255, 255, 0.3);
      transform: translateY(1px);
    }
    .power-btn:not(.off) {
      animation: pulse-red 1.4s infinite;
      color: red;
    }
      /* Toggles notifiche ottimizzati */
      .notification-toggles-row {
        flex-direction: row !important;
        gap: 16px !important;
        align-items: stretch !important;
        margin: 16px 0 !important;
        padding: 20px !important;
        border-radius: 16px !important;
        border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08)) !important;
    }
    .power-btn.off {
      background: linear-gradient(102deg, rgba(255, 255, 255, 0.85) 0%, rgba(250, 250, 250, 0.89) 51%, rgba(225, 225, 225, 0.89) 100%);
      color: black;
      animation: none !important;
      text-shadow: none;
    }
    .power-btn ha-icon {
      --mdc-icon-size: 22px;
    }
    .temp-btn {
        background: none;
        border: none;
        font-size: 1rem;
        cursor: pointer;
        padding: 8px 8px;
        color: #333;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background .18s;
    }
    .temp-btn.left:hover {
      background: rgba(0, 0, 0, 0.05);
      border-top-left-radius: 36px;
      border-bottom-left-radius: 36px;
    }
    .temp-btn.right:hover {
      background: rgba(0, 0, 0, 0.05);
      border-top-right-radius: 36px;
      border-bottom-right-radius: 36px;
    }
    .temp-btn ha-icon[icon="mdi:plus"],
    .temp-btn ha-icon[icon="mdi:minus"] {
      --mdc-icon-size: 20px;
    }
    .mode-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
      color: var(--mac-text-secondary);
      cursor: pointer;
      border-radius: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .mode-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08));
    }
    .mode-btn.active {
      background: linear-gradient(145deg, #4285f4, #1976d2);
      color: white;
      border-color: rgba(255, 255, 255, 0.3);
      box-shadow: 0 4px 16px rgba(66, 133, 244, 0.3);
      transform: translateY(-1px);
    }
    .mode-btn.active ha-icon[icon="mdi:fire"] {
      --icon-color: #ff6b35;
      color: #ff6b35;
    }
    .mode-btn.active ha-icon[icon="mdi:snowflake"] {
      --icon-color: #00bcd4;
      color: #00bcd4;
    }
    .mode-btn.active ha-icon[icon="mdi:thermostat-auto"] {
      --icon-color: #32cd32;
      color: #32cd32;
    }
    .mode-btn ha-icon {
      --mdc-icon-size: 22px;
      transition: all 0.2s;
    }
    .fan-btn {
        padding: 8px 0;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
      color: var(--mac-text-secondary);
      font-size: 12px;
        font-weight: 500;
        border-radius: 10px;
      cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        position: relative;
        overflow: hidden;
    }
    .fan-btn:hover {
      transform: translateY(-1px);
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08));
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .fan-btn.active {
      background: linear-gradient(145deg, #4285f4, #1976d2);
      color: white;
      border-color: rgba(255, 255, 255, 0.3);
      box-shadow: 0 2px 12px rgba(66, 133, 244, 0.4);
      transform: translateY(-1px);
    }
    .fan-btn.active:before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }
    .fan-btn.active:hover:before {
      left: 100%;
    }

    /* === TEMPERATURE & CLIMATE CONTROLS === */
    .temp-control {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      gap: 10px;
      padding-left: 0px;
    }
    .temp-wrap {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        border-radius: 36px;
        background: rgba(255, 255, 255, 0.13);
      box-shadow: 0 0 5px rgba(0,0,0,0.3);
        backdrop-filter: blur(5px);
        border: 1px solid rgba(255, 255, 255, 0.3);
      transition: box-shadow 0.3s;
    }

    .temp-wrap.mode-cool {
      box-shadow: 0 4px 3px 0 #00bfff33;
      animation: pulse-cool-shadow 4s infinite;
      transition: box-shadow 0.7s cubic-bezier(.4,1.6,.4,1);
    }
    .temp-wrap.mode-heat {
      box-shadow: 0 4px 3px 0 #ff980033;
      animation: pulse-heat-shadow 4s infinite;
      transition: box-shadow 0.7s cubic-bezier(.4,1.6,.4,1);
    }
    .temp-wrap.mode-fan_only {
      box-shadow: 0 4px 3px 0 #bdbdbd33;
      animation: pulse-fan-shadow 4s infinite;
      transition: box-shadow 0.7s cubic-bezier(.4,1.6,.4,1);
    }
    .temp-wrap.mode-dry {
      box-shadow: 0 4px 3px 0 #00bfae33;
      animation: pulse-dry-shadow 4s infinite;
      transition: box-shadow 0.7s cubic-bezier(.4,1.6,.4,1);
    }
    .temp-wrap.mode-auto {
      box-shadow: 0 4px 3px 0 #00bfff33, 0 4px 3px 0 #ff980033, 0 4px 3px 0 #bdbdbd33, 0 4px 3px 0 #00bfae33;
      animation: pulse-auto-shadow 4s infinite;
      transition: box-shadow 0.7s cubic-bezier(.4,1.6,.4,1);
    }
    @keyframes pulse-cool-shadow {
      0%, 100% { box-shadow: 0 4px 1px 0 #00bfff33; }
      50%      { box-shadow: 0 12px 12px 0 #00bfff55; }
    }
    @keyframes pulse-heat-shadow {
      0%, 100% { box-shadow: 0 4px 1px 0 #ff980033; }
      50%      { box-shadow: 0 12px 12px 0 #ff980055; }
    }
    @keyframes pulse-fan-shadow {
      0%, 100% { box-shadow: 0 4px 1px 0 #bdbdbd33; }
      50%      { box-shadow: 0 12px 12px 0 #bdbdbd55; }
    }
    @keyframes pulse-dry-shadow {
      0%, 100% { box-shadow: 0 4px 1px 0 #00bfae33; }
      50%      { box-shadow: 0 12px 12px 0 #00bfae55; }
    }
    @keyframes pulse-auto-shadow {
      0%, 100% { box-shadow: 0 4px 1px 0 #00bfff33, 0 4px 1px 0 #ff980033, 0 4px 1px 0 #bdbdbd33, 0 4px 1px 0 #00bfae33; }
      50%      { box-shadow: 0 12px 12px 0 #00bfff55, 0 12px 12px 0 #ff980055, 0 12px 12px 0 #bdbdbd55, 0 12px 12px 0 #00bfae55; }
    }
    .current-temp {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        font-size: 0.85rem;
        font-weight: 400;
        color: #222;
        background: linear-gradient(-25deg, rgba(255, 255, 255, 0.85) 0%, rgba(245, 245, 245, 0.89) 51%, rgba(200, 200, 200, 0.89) 100%);
        border-radius: 18px;
        border: 1px solid rgba(220, 220, 220, 0.5);
        margin-top: 2px;
        min-width: 40px;
        max-width: 60px;
        height: 28px;
        text-align: center;
        box-sizing: border-box;
        margin-left: 0px;
    }
    .temp-adjust {
        display: flex;
        align-items: center;
        background: linear-gradient(140deg, rgba(255, 255, 255, 0.85) 0%, rgba(245, 245, 245, 0.89) 51%, rgba(200, 200, 200, 0.89) 100%);
        border-radius: 36px;
        border: 1px solid rgba(220, 220, 220, 0.5);
      height: 40px;
    }
    .temp-value {
        flex: 1 1 0;
        color: #333;
        pointer-events: none;
        user-select: none;
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        width: 60px;
    }
    .temp-value .digit-svg svg path,
    .temp-value .degree-symbol svg path,
    .current-temp .degree-symbol svg path,
    .temp-value .digit-svg svg circle,
    .temp-value .degree-symbol svg circle,
    .current-temp .degree-symbol svg circle {
      fill: #222 !important;
    }
    .temp-value.pending .digit-svg svg path,
    .temp-value.pending .degree-symbol svg path,
    .temp-value.pending .digit-svg svg circle,
    .temp-value.pending .degree-symbol svg circle {
      fill: #d00 !important;
    }
    .digit-svg,
    .degree-symbol {
        display: inline-flex;
        width: 25px;
        height: 50px;
        justify-content: center;
        align-items: center;
        gap: 0;
        margin-right: -3px;
        margin-bottom: 5px;
        left: 4px;
        position: relative;
        color: #222;
    }
    .degree-symbol.pending {
        color: #d00;
    }
    .digit-dot {
      font-size: 1.4em;
      line-height: 0.5;
      vertical-align: middle;
      font-family: inherit;
      padding: 0 2px;
      color: #222;
      display: inline-block;
    }
    .digit-svg-current {
        display: flex;
        vertical-align: bottom;
        margin: 0px -3.5px 0px -4px;
        flex: 0 0 auto;
        transform: scale(0.5);
        position: relative;
        left: 10px;
    }
    .current-temp .degree-symbol {
        display: flex;
        vertical-align: bottom;
        margin: 0 -4px;
        margin-right: -3.5px;
        flex: 0 0 auto;
        /* transform: scale(0.5); */
    }
    /* === MODES & FAN === */
    .modes {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      gap: 10px;
    	margin-bottom: 2px;
    	padding: 0px 16px;
    }
    .mode-label {
      font-size: 10px;
      font-weight: 600;
    }
    .fan-section {
        margin-top: 10px;
        padding: 0 16px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 24px;
        margin-bottom: 10px;
        padding-bottom: 5px;
        padding-top: 5px;
    }
    .fan-label {
      display: flex;
      align-items: center;
        gap: 8px;
        color: var(--primary-text-color);
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 5px;
        margin-top: 5px;
        padding-left: 4px;
    }
    .fan-label ha-icon {
      --mdc-icon-size: 18px;
      color: var(--primary-color);
    }
    .fan-speeds {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
      background: rgba(0, 0, 0, 0.05);
      border-radius: 12px;
      padding: 6px;
      gap: 6px;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .fan-speed-indicator {
      position: relative;
      z-index: 1;
    }
    .fan-speed-indicator:after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 0;
      transform: translate(-50%, -50%);
      opacity: 0.7;
      box-shadow: 0 12px 24px 0 var(--fan-shadow-color, #bdbdbd);
    }
    .fan-speed-indicator.low:after {
      --fan-shadow-color: #bdbdbd;
      animation: fan-wind-rotate-low 2.5s linear infinite;
    }
    .fan-speed-indicator.medium:after {
      --fan-shadow-color: #90caf9;
      animation: fan-wind-rotate-medium 1.5s linear infinite;
    }
    .fan-speed-indicator.high:after {
      --fan-shadow-color: #00bfff;
      animation: fan-wind-rotate-high 0.8s linear infinite;
    }
    .fan-speed-indicator.auto:after {
      --fan-shadow-color: #bdbdbd;
      animation: fan-wind-rotate-auto 1.8s linear infinite;
    }

    /* === EXPANDABLES & ANIMATIONS === */
    .expandable-content {
      overflow: hidden;
      opacity: 0;
      transform: scaleY(0);
      transform-origin: top;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: transform, opacity;
      height: 0;
      border-radius: 0 0 16px 16px;
      margin: 0 8px;
    }
    .expandable-content.expanded {
      opacity: 1;
      transform: scaleY(1);
      height: auto;
      min-height: 220px;
      padding-bottom: 20px;
      padding-top: 8px;
    }
    /* === RESPONSIVE === */
    @media (max-width: 500px) {
      .temp-control { flex-direction: row; gap: 5px; }
      :host([theme="modern"]) .icon-btn {
        position: static;
        display: block;
        transform: none;
      }
      /* === OTTIMIZZAZIONI POPUP MOBILE === */
      .settings-popup {
        padding: 0;
        align-items: stretch;
        justify-content: stretch;
      }

      .settings-content {
        border-radius: 0;
        max-height: 100vh;
        height: 100vh;
        max-width: 100vw;
        width: 100vw;
        margin: 0;
        box-shadow: none;
        border: none;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .settings-header {
        padding: 20px 16px 16px 16px;
        border-bottom: 2px solid var(--divider-color);
        position: sticky;
        top: 0;
        z-index: 20;
        background: var(--card-background-color);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .settings-title {
        font-size: 18px;
        line-height: 1.3;
        max-width: calc(100% - 60px);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .close-button {
        width: 44px;
        height: 44px;
        margin-left: 8px;
        border-radius: 50%;
        min-width: 44px;
        flex-shrink: 0;
      }

      .settings-body {
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 0;
      }

      .settings-section {
        padding: 16px;
        margin: 0;
      }

      .settings-section:first-child {
        padding-top: 20px;
      }

      .settings-section:last-child {
        padding-bottom: 40px;
      }

      .settings-section-title {
        font-size: 16px;
        margin-bottom: 16px;
        font-weight: 600;
      }

      /* Input touch-friendly per mobile */
      .settings-section input[type="number"],
      .settings-section input[type="text"],
      .settings-section input[type="time"],
      .settings-section select {
        padding: 16px;
        font-size: 16px;
        border-radius: 12px;
        min-height: 48px;
        box-sizing: border-box;
        -webkit-appearance: none;
        appearance: none;
      }

      .settings-section input[type="time"] {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
        background-position: right 12px center;
        background-repeat: no-repeat;
        background-size: 16px;
        padding-right: 40px;
      }

      /* Time range ottimizzato per mobile */
      .time-range {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        padding: 20px 16px !important;
        border-radius: 16px !important;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.05)) !important;
        border: 2px solid var(--divider-color) !important;
      }

      .time-range > div {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
      }

      .time-range label {
        font-size: 14px !important;
        font-weight: 600 !important;
        color: var(--primary-text-color) !important;
        margin: 0 !important;
      }

      .time-input {
        padding: 16px !important;
        font-size: 18px !important;
        min-height: 52px !important;
        border-radius: 12px !important;
        box-sizing: border-box !important;
        border: 2px solid var(--primary-color) !important;
        background: var(--card-background-color) !important;
        color: var(--primary-text-color) !important;
        font-weight: 600 !important;
        text-align: center !important;
      }

      .time-input:focus {
        outline: none !important;
        border-color: var(--primary-color) !important;
        box-shadow: 0 0 0 4px rgba(66, 133, 244, 0.2) !important;
        transform: scale(1.02) !important;
      }

      /* Switch più grandi per mobile - TUTTI GLI SWITCH */
      .switch {
        width: 60px !important;
        height: 32px !important;
        min-width: 60px !important;
        flex-shrink: 0 !important;
        position: relative !important;
        display: inline-block !important;
        margin-top: 8px !important;
        margin-bottom: 8px !important;
      }

      .switch input {
        opacity: 0 !important;
        width: 0 !important;
        height: 0 !important;
      }

      .slider {
        position: absolute !important;
        cursor: pointer !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background-color: var(--disabled-text-color) !important;
        transition: .4s !important;
        border-radius: 32px !important;
      }

      .slider:before {
        position: absolute !important;
        content: "" !important;
        height: 26px !important;
        width: 26px !important;
        left: 3px !important;
        bottom: 3px !important;
        background-color: white !important;
        transition: .4s !important;
        border-radius: 50% !important;
      }

      input:checked + .slider {
        background-color: var(--primary-color) !important;
      }

      input:checked + .slider:before {
        transform: translateX(28px) !important;
      }

      /* Switch disabilitato */
      .switch input:disabled + .slider {
        background-color: var(--disabled-text-color) !important;
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }

      .switch input:disabled + .slider:before {
        background-color: #ccc !important;
      }

      /* Toggles notifiche ottimizzati */
      .notification-toggles-row {
        flex-direction: column !important;
        gap: 16px !important;
        align-items: stretch !important;
        margin: 16px 0 !important;
        padding: 20px !important;
        border-radius: 16px !important;
        border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08)) !important;
      }

      .notification-toggle-group {
        padding: 0 30px !important;
        border-bottom: none !important;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.02)) !important;
        border-radius: 12px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        flex-direction: row !important;
        width: 80% !important;
        max-width: none !important;
      }

      .notification-toggle-group:last-child {
        border-bottom: none !important;
      }

      .toggle-label {
        font-size: 16px !important;
        font-weight: 600 !important;
        min-width: auto !important;
        flex: 1 !important;
        color: var(--primary-text-color) !important;
      }

      /* Grid layouts responsive */
      .settings-row-duo {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }

      .timer-grid {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }

      /* Layout stagionali colonna singola su mobile */
      .season-temp-row, .season-select-row {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }

      /* Season toggle ottimizzato */
      .season-row {
        flex-direction: row !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
      }

      .toggle-btn {
        padding: 12px 8px !important;
        font-size: 14px !important;
        border-radius: 10px !important;
        min-height: 40px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        text-align: center !important;
        flex: 1 !important;
        min-width: 0 !important;
      }

      .toggle-btn ha-icon {
        --mdc-icon-size: 18px !important;
      }

      /* Timer grid ottimizzato */
      .timer-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .timer-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .timer-field label {
        font-size: 14px;
        font-weight: 600;
        color: var(--primary-text-color);
      }

      .timer-field input {
        padding: 16px;
        font-size: 16px;
        min-height: 48px;
        border-radius: 12px;
        box-sizing: border-box;
      }

      /* === TIMER SMART STYLES === */
      .timer-control-wrapper {
        margin-bottom: 16px;
        padding: 16px;
        background: var(--card-background-color);
        border: 1px solid var(--divider-color);
        border-radius: 12px;
        position: relative;
      }

      .timer-header {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        font-weight: 500;
      }

      .timer-title {
        flex: 1;
        font-size: 14px;
        color: var(--primary-text-color);
      }

      .timer-config {
        font-size: 12px;
        color: var(--secondary-text-color);
        background: var(--secondary-background-color);
        padding: 2px 8px;
        border-radius: 8px;
      }

      .timer-progress-bar {
        margin-bottom: 12px;
        animation: slideDown 0.3s ease-out;
      }

      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .progress-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 12px;
      }

      .progress-text {
        color: var(--primary-text-color);
        font-weight: 500;
      }

      .progress-percent {
        color: var(--secondary-text-color);
        background: var(--secondary-background-color);
        padding: 2px 6px;
        border-radius: 6px;
        font-size: 10px;
      }

      .progress-track {
        height: 8px;
        background: var(--disabled-color);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }

      .progress-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.5s ease-in-out;
        position: relative;
        overflow: hidden;
      }

      .timer-on-fill {
        background: linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%);
      }

      .timer-off-fill {
        background: linear-gradient(90deg, #FF9800 0%, #F44336 100%);
      }

      .progress-fill:after {
        content: '';
        position: absolute;
        top: 0;
        left: -50%;
        width: 50%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        animation: shimmer 2s infinite;
      }

      @keyframes shimmer {
        0% { left: -50%; }
        100% { left: 100%; }
      }

      .timer-controls {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .timer-input-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .timer-input-group label {
        font-size: 12px;
        color: var(--secondary-text-color);
        min-width: 50px;
      }

      .timer-input-group input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-size: 14px;
        max-width: 80px;
      }

      .timer-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        background: var(--primary-color);
        color: white;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 100px;
        justify-content: center;
      }

      .timer-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(var(--primary-color-rgb, 33, 150, 243), 0.3);
      }

      .timer-btn.active {
        background: #F44336;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7); }
        70% { box-shadow: 0 0 0 8px rgba(244, 67, 54, 0); }
        100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); }
      }

      .timer-btn ha-icon {
        font-size: 16px;
      }

      /* Automation switch ottimizzato */
      .automation-switch-row {
        flex-direction: row !important;
        gap: 16px !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 16px !important;
        border-radius: 12px !important;
        border: 1px solid var(--divider-color) !important;
      }

      .automation-title {
        font-size: 16px !important;
        font-weight: 600 !important;
        flex: 1 !important;
        margin: 0 !important;
      }

      /* Push targets field ottimizzato */
      .push-targets-field {
        border-radius: 12px !important;
        min-height: 48px !important;
      }

      /* Message edit row mobile */
      .message-edit-row {
        padding: 16px;
        border-radius: 16px;
        margin-bottom: 8px;
      }

      .message-edit-row label {
        font-size: 14px;
        margin-bottom: 8px;
      }

      .message-edit-row ha-textfield {
        width: 100%;
        margin: 0;
        --mdc-text-field-outlined-idle-border-color: var(--divider-color);
        --mdc-text-field-outlined-hover-border-color: var(--primary-color);
      }

      /* Miglioramenti scroll per iOS */
      .settings-body {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      .settings-body:-webkit-scrollbar {
        display: none;
      }

      /* Gesture friendly areas */
      .settings-header:before {
        content: '';
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 4px;
        background: var(--divider-color);
        border-radius: 2px;
        margin-top: 8px;
      }
    }

    /* === KEYFRAMES & ANIMATED ICONS === */
    @keyframes pulse-red {
      0% {
        color: rgb(120, 0, 0);
        text-shadow: 0 0 2px rgba(0, 0, 0, 0.4);
      }
      50% {
        color: red;
        text-shadow: 0 0 10px rgba(255, 0, 0, 1);
      }
      100% {
        color: rgb(120, 0, 0);
        text-shadow: 0 0 2px rgba(0, 0, 0, 0.4);
      }
    }
    .status-icon.fan.low {
      animation: fan-rotate-slow 3s linear infinite;
      transform-origin: center center;
    }
    .status-icon.fan.medium {
      animation: fan-rotate-medium 1.5s linear infinite;
      transform-origin: center center;
    }
    .status-icon.fan.high {
      animation: fan-rotate-fast 0.75s linear infinite;
      transform-origin: center center;
    }
    .status-icon.fan.auto {
      animation: fan-rotate-slow 2.5s linear infinite;
      transform-origin: center center;
    }
    .status-icon.fan ha-icon,
    .status-icon.fan ha-icon svg {
      display: block;
      margin: auto;
    }
    .status-icon.fan {
      justify-content: center;
      align-items: center;
      transform-origin: center center;
    }
    .status-icon.swing.horizontal {
      animation: swing-rotate 1s ease-in-out infinite;
    }
    .status-icon.swing.vertical {
      animation: swing-tilt 1.2s ease-in-out infinite;
    }
    .status-icon.swing.both {
      animation: swing-buzz 0.6s linear infinite;
    }
    .status-icon.swing.auto {
      animation: swing-pulse 1.8s ease-in-out infinite;
    }
    @keyframes swing-rotate {
      0%   { transform: rotate(0deg); }
      25%  { transform: rotate(5deg); }
      50%  { transform: rotate(0deg); }
      75%  { transform: rotate(-5deg); }
      100% { transform: rotate(0deg); }
    }
    @keyframes swing-tilt {
      0%   { transform: skewY(0deg); }
      25%  { transform: skewY(3deg); }
      50%  { transform: skewY(0deg); }
      75%  { transform: skewY(-3deg); }
      100% { transform: skewY(0deg); }
    }
    @keyframes swing-buzz {
      0%, 100% { transform: rotate(0deg); }
      20% { transform: rotate(3deg); }
      40% { transform: rotate(-3deg); }
      60% { transform: rotate(2deg); }
      80% { transform: rotate(-2deg); }
    }
    @keyframes swing-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50%      { transform: scale(1.12); opacity: 0.8; }
    }
    @keyframes fan-rotate-slow {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes fan-rotate-medium {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes fan-rotate-fast {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .status-icon.preset.eco   { color: #4caf50; }
    .status-icon.preset.boost { color: #f44336; }
    .status-icon.preset.sleep { color: #3f51b5; }

    /* Contact sensor styles */
    .status-icon.contact.open {
      color:rgb(71, 168, 74);
    }
    .status-icon.contact.closed {
      color: rgb(171, 54, 54);
    }

    /* Override preset colors when optimistic */
    .status-icon.preset.eco.optimistic,
    .status-icon.preset.boost.optimistic,
    .status-icon.preset.sleep.optimistic,
    .status-icon.preset.optimistic {
      color: #e53935 !important;
    }

    /* Override swing mode colors when optimistic */
    .status-icon.swing.optimistic {
      color: #e53935 !important;
    }
    .status-icon {
      --mdc-icon-size: 22px;
    }
    @keyframes fan-wind-rotate-low {
      0%   { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.7; }
      20%  { opacity: 0.9; }
      40%  { opacity: 0.6; }
      60%  { opacity: 0.8; }
      80%  { opacity: 0.5; }
      100% { transform: translate(-50%, -50%) rotate(360deg); opacity: 0.7; }
    }
    @keyframes fan-wind-rotate-medium {
      0%   { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.7; }
      15%  { opacity: 0.95; }
      35%  { opacity: 0.6; }
      55%  { opacity: 0.85; }
      75%  { opacity: 0.5; }
      100% { transform: translate(-50%, -50%) rotate(360deg); opacity: 0.7; }
    }
    @keyframes fan-wind-rotate-high {
      0%   { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.7; }
      10%  { opacity: 1; }
      30%  { opacity: 0.5; }
      50%  { opacity: 0.9; }
      70%  { opacity: 0.4; }
      100% { transform: translate(-50%, -50%) rotate(360deg); opacity: 0.7; }
    }
    @keyframes fan-wind-rotate-auto {
      0%   { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.7; }
      20%  { opacity: 0.9; }
      40%  { opacity: 0.6; }
      60%  { opacity: 0.85; }
      80%  { opacity: 0.5; }
      100% { transform: translate(-50%, -50%) rotate(360deg); opacity: 0.7; }
    }

    .fan-speed-indicator.mode-cool:after {
      --fan-shadow-color: #00bfff;
      animation: fan-wind-rotate-cool 1.2s linear infinite;
    }
    .fan-speed-indicator.mode-heat:after {
      --fan-shadow-color: #ff9800;
      animation: fan-wind-rotate-heat 1.2s linear infinite;
    }
    .fan-speed-indicator.mode-fan_only:after {
      --fan-shadow-color: #bdbdbd;
      animation: fan-wind-rotate-fan 1.2s linear infinite;
    }
    .fan-speed-indicator.mode-auto:after {
      --fan-shadow-color: #00bfff;
      animation: fan-wind-rotate-auto 1.2s linear infinite;
    }
    @keyframes fan-wind-rotate-cool {
      0%   { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.7; }
      20%  { opacity: 0.9; }
      40%  { opacity: 0.6; }
      60%  { opacity: 0.8; }
      80%  { opacity: 0.5; }
      100% { transform: translate(-50%, -50%) rotate(360deg); opacity: 0.7; }
    }
    @keyframes fan-wind-rotate-heat {
      0%   { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.7; }
      20%  { opacity: 0.95; }
      40%  { opacity: 0.6; }
      60%  { opacity: 0.85; }
      80%  { opacity: 0.5; }
      100% { transform: translate(-50%, -50%) rotate(360deg); opacity: 0.7; }
    }
    @keyframes fan-wind-rotate-fan {
      0%   { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.7; }
      10%  { opacity: 1; }
      30%  { opacity: 0.5; }
      50%  { opacity: 0.9; }
      70%  { opacity: 0.4; }
      100% { transform: translate(-50%, -50%) rotate(360deg); opacity: 0.7; }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes slideOutLeft {
      0%   { opacity: 1; transform: translateX(0) scale(1); }
      80%  { opacity: .4; transform: translateX(-30%) scale(.96); }
      100% { opacity: 0; transform: translateX(-80%) scale(.95); }
    }
    @keyframes slideInRight {
      0%   { opacity: 0; transform: translateX(80%) scale(.95); }
      60%  { opacity: .6; transform: translateX(10%) scale(1.01);}
      100% { opacity: 1; transform: translateX(0) scale(1);}
    }
    @keyframes slideOutRight {
      0%   { opacity: 1; transform: translateX(0) scale(1); }
      80%  { opacity: .4; transform: translateX(30%) scale(.96);}
      100% { opacity: 0; transform: translateX(80%) scale(.95);}
    }
    @keyframes slideInLeft {
      0%   { opacity: 0; transform: translateX(-80%) scale(.95);}
      60%  { opacity: .6; transform: translateX(-10%) scale(1.01);}
      100% { opacity: 1; transform: translateX(0) scale(1);}
    }
    .optimistic {
        color: #e53935 !important;
        font-weight: bold;
        transition: color 0.3s !important;
    }
    .mode-icon.optimistic {
      color: #e53935 !important;
      filter: drop-shadow(0 0 2px #e53935);
      transition: color 0.3s, filter 0.3s;
    }
    .fan-label-text.optimistic {
      color: #e53935 !important;
      font-weight: bold;
      transition: color 0.3s;
    }
    .nav-info {
      font-size: 15px;
      color: var(--mac-text-secondary);
    }
    .multi-column-modes {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 0 4px;
    }
    .multi-column-modes .column {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }
    .column-buttons {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 4px;
    }
    .switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 20px;
    }
    .switch input {
        opacity: 0;
      width: 0;
      height: 0;
      }
    input:checked + .slider {
      background-color: var(--primary-color);
      }
    input:checked + .slider:before {
      transform: translateX(20px);
    }

    /* Switch disabilitato tema modern */
    .switch input:disabled + .slider {
      background-color: var(--disabled-text-color) !important;
      opacity: 0.5 !important;
      cursor: not-allowed !important;
    }

    .switch input:disabled + .slider:before {
      background-color: #ccc !important;
    }
    /* === POPUP DESIGN MODERNO === */
    .settings-popup {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
      backdrop-filter: blur(8px);
      animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      padding: 20px;
      box-sizing: border-box;
    }

    .settings-content {
      background: var(--card-background-color, #fff);
      border-radius: 24px;
      width: 100%;
      max-width: 480px;
      max-height: 85vh;
      overflow: hidden;
      box-shadow:
        0 24px 38px 3px rgba(0, 0, 0, 0.14),
        0 9px 46px 8px rgba(0, 0, 0, 0.12),
        0 11px 15px -7px rgba(0, 0, 0, 0.2);
      animation: slideUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
      display: flex;
      flex-direction: column;
    }

    .settings-header {
        display: flex;
        align-items: center;
      justify-content: space-between;
      padding: 24px 24px 16px 24px;
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
      background: var(--card-background-color, #fff);
      position: sticky;
      top: 0;
      z-index: 10;
      backdrop-filter: blur(20px);
    }

    .settings-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--primary-text-color, #000);
      margin: 0;
      line-height: 1.2;
      letter-spacing: -0.5px;
    }

    .close-button {
      width: 40px;
      height: 40px;
      border: none;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
      color: var(--secondary-text-color, #666);
      cursor: pointer;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      margin-left: 16px;
    }

    .close-button:hover {
      background: var(--divider-color, rgba(0, 0, 0, 0.1));
      color: var(--primary-text-color, #000);
      transform: scale(1.05);
    }

    .close-button:active {
      transform: scale(0.95);
    }

    /* Contenuto scrollabile */
    .settings-body {
      flex: 1;
      overflow-y: auto;
      padding: 0;
      scrollbar-width: thin;
      scrollbar-color: var(--divider-color) transparent;
    }

    .settings-body:-webkit-scrollbar {
      width: 6px;
    }

    .settings-body:-webkit-scrollbar-track {
      background: transparent;
    }

    .settings-body:-webkit-scrollbar-thumb {
      background: var(--divider-color, rgba(0, 0, 0, 0.2));
      border-radius: 3px;
    }

    .settings-body:-webkit-scrollbar-thumb:hover {
      background: var(--secondary-text-color, rgba(0, 0, 0, 0.4));
    }

    .settings-section {
      padding: 20px 24px;
      transition: background-color 0.2s ease;
    }

    .settings-section:last-child {
      border-bottom: none;
      padding-bottom: 24px;
    }

    .settings-section:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
    }

    .settings-section-title {
      font-size: unset;
      font-weight: 600;
      color: var(--primary-text-color, #000);
      margin: 0 0 16px 0;
        display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: -0.3px;
    }

    .settings-section label {
      display: flex;
      align-items: center;
      font-size: 14px;
      font-weight: 500;
      color: var(--secondary-text-color, #666);
      margin-bottom: 8px;
      gap: 8px;
      line-height: 1.4;
    }

    /* Input moderni */
    .settings-section input[type="number"],
    .settings-section input[type="text"],
    .settings-section input[type="time"] {
      padding: 12px 16px;
      border: 2px solid var(--divider-color, rgba(0, 0, 0, 0.1));
      border-radius: 12px;
        font-size: 15px;
      color: var(--primary-text-color, #000);
      background: var(--card-background-color, #fff);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
      width: 100%;
      box-sizing: border-box;
      font-family: inherit;
    }

    .settings-section input[type="number"]:focus,
    .settings-section input[type="text"]:focus,
    .settings-section input[type="time"]:focus {
      border-color: var(--primary-color, #3b82f6);
      background: var(--card-background-color, #fff);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
      transform: translateY(-1px);
    }

    .settings-section input[type="number"]:disabled,
    .settings-section input[type="text"]:disabled {
      background: var(--disabled-background-color, rgba(0, 0, 0, 0.03));
      color: var(--disabled-text-color, rgba(0, 0, 0, 0.4));
      cursor: not-allowed;
      border-color: var(--disabled-border-color, rgba(0, 0, 0, 0.06));
    }

    /* Range di tempo moderno */
    .time-range {
      display: grid;
      grid-template-columns: auto 1fr auto 1fr;
      gap: 12px;
      align-items: center;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      padding: 16px;
      border-radius: 16px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
    }

    .time-input {
      padding: 10px 12px;
      border: 1.5px solid var(--divider-color, rgba(0, 0, 0, 0.1));
      border-radius: 10px;
      font-size: 14px;
      color: var(--primary-text-color, #000);
      background: var(--card-background-color, #fff);
      transition: all 0.2s ease;
      outline: none;
      min-width: 0;
    }

    .time-input:focus {
      border-color: var(--primary-color, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    /* Select moderni */
    .settings-section select {
      border: 2px solid var(--divider-color, rgba(0, 0, 0, 0.1));
      border-radius: 12px;
      font-size: 15px;
      color: var(--primary-text-color, #000);
      background: var(--card-background-color, #fff);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
      width: 100%;
      box-sizing: border-box;
      font-family: inherit;
      cursor: pointer;
    }

    .settings-section select:focus {
      border-color: var(--primary-color, #3b82f6);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
      transform: translateY(-1px);
    }

    .settings-section select:disabled {
      background: var(--disabled-background-color, rgba(0, 0, 0, 0.03));
      color: var(--disabled-text-color, rgba(0, 0, 0, 0.4));
      cursor: not-allowed;
      border-color: var(--disabled-border-color, rgba(0, 0, 0, 0.06));
    }

    /* Switch moderni */
    .switch {
      position: relative;
      display: inline-block;
      width: 52px;
      height: 28px;
      flex-shrink: 0;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--disabled-background-color, rgba(0, 0, 0, 0.12));
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 28px;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 22px;
      width: 22px;
      left: 3px;
      bottom: 3px;
      background: white;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    input:checked + .slider {
      background: var(--primary-color, #3b82f6);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    input:checked + .slider:before {
      transform: translateX(24px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    input:focus + .slider {
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }

    /* Contenitori messaggi moderni */
    .message-edit-row label {
        font-size: 14px;
        font-weight: 600;
        color: var(--primary-text-color, #000);
        display: flex;
        align-items: center;
        gap: 8px;
        letter-spacing: -0.2px;
        margin-left: 15px;
        margin-top: 10px;
    }

    .message-edit-row:hover {
      background: none;
      border-color: none;
    }

    .message-edit-row label {
        font-size: 14px;
        font-weight: 600;
        color: var(--primary-text-color, #000);
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        letter-spacing: -0.2px;
        margin-left: 15px;
        margin-top: 2px;
    }

    .message-edit-row ha-textfield {
        width: 90%;
        margin: 0 20px 0 20px;
        --mdc-theme-primary: var(--primary-color, #3b82f6);
        --mdc-text-field-focused-label-color: var(--primary-color, #3b82f6);
        --mdc-text-field-ink-color: var(--primary-text-color);
        --mdc-text-field-outlined-idle-border-color: var(--divider-color, rgba(0, 0, 0, 0.1));
        --mdc-text-field-outlined-hover-border-color: var(--primary-color, #3b82f6);
        --mdc-text-field-fill-color: transparent;
    }

    /* Automation switch allineato */
    .automation-switch-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-radius: 16px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
    }

    .automation-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--primary-text-color);
      letter-spacing: -0.3px;
    }

    /* Toggle groups per notifiche */
    .notification-toggles-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 32px;
      margin: 16px 0;
      padding: 20px;
      border-radius: 16px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
    }

    .notification-toggle-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      flex: 1;
      text-align: center;
    }

    .toggle-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-text-color);
      letter-spacing: -0.2px;
      text-align: center;
    }

    /* Layout responsive per impostazioni */
    .settings-row-duo {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 16px 0;
    }

    /* Layout timer compatto */
    .timer-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 12px;
    }

    .timer-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .timer-field label {
      font-size: 13px;
      font-weight: 500;
      color: var(--secondary-text-color);
      margin: 0;
      text-align: center;
    }

    .timer-field input {
      padding: 10px 12px !important;
      border: 2px solid var(--divider-color) !important;
      border-radius: 10px !important;
      font-size: 14px !important;
      color: var(--primary-text-color) !important;
      background: var(--card-background-color) !important;
      transition: all 0.2s ease !important;
      outline: none !important;
      width: 100% !important;
      box-sizing: border-box !important;
      text-align: center !important;
      font-family: inherit !important;
    }

    .timer-field input:focus {
      border-color: var(--primary-color) !important;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
      transform: translateY(-1px) !important;
    }

    /* Layout stagionali */
    .season-temp-row, .season-select-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 12px;
    }

    .season-temp-field, .season-select-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .season-temp-field label, .season-select-field label {
      font-size: 13px;
      font-weight: 600;
      color: var(--primary-text-color);
      margin: 0;
      text-align: center;
      text-transform: capitalize;
      letter-spacing: -0.2px;
    }

    .season-temp-field input {
      padding: 10px 12px !important;
      border: 2px solid var(--divider-color) !important;
      border-radius: 10px !important;
      font-size: 14px !important;
      color: var(--primary-text-color) !important;
      background: var(--card-background-color) !important;
      transition: all 0.2s ease !important;
      outline: none !important;
      width: 100% !important;
      box-sizing: border-box !important;
      text-align: center !important;
      font-family: inherit !important;
    }

    .season-temp-field input:focus {
      border-color: var(--primary-color) !important;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
      transform: translateY(-1px) !important;
    }

    .season-select-field select {
        padding: 10px 2px !important;
        border: 2px solid var(--divider-color) !important;
        border-radius: 10px !important;
        font-size: 12px !important;
        color: var(--primary-text-color) !important;
        background: var(--card-background-color) !important;
        transition: all 0.2s ease !important;
        outline: none !important;
        width: 100% !important;
        box-sizing: border-box !important;
        text-align: center !important;
        font-family: inherit !important;
        cursor: pointer !important;
    }

    .season-select-field select:focus {
      border-color: var(--primary-color) !important;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
      transform: translateY(-1px) !important;
    }



    /* Animazioni migliorate */
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(40px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
      font-size: 14px;
        color: var(--card-background-color);
        background: var(--primary-text-color);
      text-align: center;
    }
    .time-input:focus {
      outline: none;
      border-color: var(--primary-text-color);
      box-shadow: 0 0 0 2px rgba(56, 128, 255, 0.1);
    }
    .time-input:disabled {
      background: rgba(0, 0, 0, 0.03);
      cursor: not-allowed;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 20px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
    input:checked + .slider {
      background-color: var(--primary-text-color);
    }
    .season-row {
      display: flex;
      gap: 8px;
      padding: 0 16px 16px;
    }
    .toggle-btn {
      flex: 1;
      padding: 10px;
      border-radius: 24px;
        background: var(--primary-text-color);
      color: var(--mac-text-secondary);
      font-size: 14px;
      text-align: center;
      cursor: pointer;
      transition: background 0.25s, color 0.25s, box-shadow 0.25s, transform 0.25s, opacity 0.25s;
      flex-direction: column;
      display: flex;
      opacity: 0.7;
      transform: scale(0.97) translateY(6px);
    }
    .toggle-btn.active {
        background: var(--primary-text-color);
        color: var(--primary-background-color) !important;
        box-shadow: rgba(56, 128, 255, 0.1) 0px 2px 12px 0px;
      opacity: 1;
        transform: scale(1.05) translateY(0px);
      z-index: 2;
    }
    .toggle-btn:not(.active) {
      opacity: 0.7;
      filter: blur(0.5px);
      z-index: 1;
    }
    .settings-section.timer-row {
      flex-direction: row;
      gap: 18px;
      align-items: flex-end;
    }
    .settings-section.timer-row label {
      flex: 1 1 0;
      flex-direction: column;
      align-items: flex-start;
      margin-bottom: 0;
      gap: 4px;
    }
    .settings-row-duo {
      display: flex;
      flex-direction: row;
      gap: 32px;
      align-items: flex-start;
    }
    .settings-row-duo .settings-section {
      flex: 1 1 0;
      min-width: 0;
      margin-bottom: 0;
    }
    .settings-section select {
      border: 1px solid var(--mac-border);
      border-radius: 16px;
      font-size: 14px;
      color: var(--primary-background-color);
      background: var(--primary-text-color);
      text-align: center;
      width: 100px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .settings-section select:focus {
      outline: none;
      border-color: var(--primary-text-color);
      box-shadow: 0 0 0 2px rgba(56, 128, 255, 0.1);
    }
    .settings-section select:disabled {
      background: rgba(0, 0, 0, 0.03);
      cursor: not-allowed;
    }

    /* === NOTIFICHE POPUP === */
    .notification-toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--divider-color);
    }

    .notification-toggle-row:last-child {
      border-bottom: none;
    }

    .notification-toggle-row span {
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-text-color);
      flex: 1;
    }
    /* Switch styles per notifiche */
    .switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 24px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--disabled-text-color);
      transition: .4s;
      border-radius: 24px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: var(--primary-color);
    }

    input:checked + .slider:before {
      transform: translateX(26px);
    }

    /* Switch disabilitato tema compact */
    .switch input:disabled + .slider {
      background-color: var(--disabled-text-color) !important;
      opacity: 0.5 !important;
      cursor: not-allowed !important;
    }

    .switch input:disabled + .slider:before {
      background-color: #ccc !important;
    }



    /* Stile speciale per Push Targets */
    .push-targets-field {
      --mdc-theme-primary: #ff6b35 !important;
      --mdc-text-field-focused-label-color: #ff6b35 !important;
      --mdc-text-field-ink-color: var(--primary-text-color) !important;
      --mdc-text-field-outlined-idle-border-color: #ff6b35 !important;
      --mdc-text-field-outlined-hover-border-color: #ff6b35 !important;
      --mdc-text-field-fill-color: transparent !important;
      border: 2px solid #ff6b35 !important;
      border-radius: 8px !important;
      background: var(--card-background-color) !important;
      box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.1) !important;
      transition: all 0.3s ease !important;
    }

    .push-targets-field:focus-within {
      box-shadow: 0 0 0 4px rgba(255, 107, 53, 0.2) !important;
      border-color: #ff8c42 !important;
    }

    /* === THEME SYSTEM - MODERN === */
    :host([theme="modern"]) .temp-control {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        margin-bottom: 20px !important;
        gap: 8px !important;
        padding: 20px 25px !important;
        background: linear-gradient(145deg, #dbdbd9, #bebcb6) !important;
        border-radius: 48px !important;
        /* box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3),
            inset 0 -2px 4px rgba(255, 255, 255, 0.1),
            0 8px 32px rgba(0, 0, 0, 0.3) !important; */
        border: 2px solid #34495e !important;
        position: relative !important;
        overflow: visible !important;
        width: 100% !important;
        box-sizing: border-box !important;
        min-width: 275px !important;
    }

    :host([theme="modern"]) .temp-control:before {
      content: '' !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: 2px !important;
      opacity: 0.6 !important;
    }
    :host([theme="modern"]) .pages-wrapper {
      margin-bottom: -30px;
    }
    :host([theme="modern"]) .temp-control:after {
      content: '' !important;
      position: absolute !important;
      inset: 8px !important;
      border-radius: 16px !important;
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)) !important;
      pointer-events: none !important;
    }

    :host([theme="modern"]) .temp-wrap {
      display: flex !important;
      align-items: center !important;
      flex: 1 !important;
      justify-content: center !important;
      position: relative !important;
      z-index: 2 !important;
      border-radius: 24px !important;
      background: none !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      border: none !important;
      padding: 0 !important;
    }

    :host([theme="modern"]) .current-temp {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: #138f55  !important;
        background: linear-gradient(145deg, #0a0f14, #1a252f) !important;
        border-radius: 16px !important;
        border: 1px solid rgba(0, 255, 136, 0.4) !important;
        min-width: 50px !important;
        height: 32px !important;
        text-align: center !important;
        box-sizing: border-box !important;
        text-shadow: 0 0 6px #138f55  !important;
        font-family: 'Courier New', monospace !important;
        letter-spacing: 0.5px !important;
        position: relative !important;
        overflow: hidden !important;
        flex-shrink: 0 !important;
        margin: 0 -5px 0 5px !important;
    }

    :host([theme="modern"]) .current-temp:before {
      content: '' !important;
      position: absolute !important;
      inset: 1px !important;
      background: linear-gradient(145deg, rgba(0, 255, 136, 0.05), transparent) !important;
      border-radius: 7px !important;
      pointer-events: none !important;
    }

    :host([theme="modern"]) .temp-adjust {
        display: flex !important;
        align-items: center !important;
        background: #bcbcbc !important;
        border-radius: 18px !important;
        height: 36px !important;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
        position: relative !important;
        overflow: hidden !important;
        flex: 1 !important;
        max-width: 135px !important;
        min-width: 100px !important;
    }

    :host([theme="modern"]) .temp-adjust:before {
      display: none !important;
    }

    :host([theme="modern"]) .temp-value {
      flex: 1 !important;
      color: #fff !important;
      pointer-events: none !important;
      user-select: none !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: 'Courier New', monospace !important;
      font-weight: 600 !important;
      font-size: 1rem !important;
      text-shadow: 0 0 8px #138f55  !important;
      letter-spacing: 1px !important;
      background: linear-gradient(145deg, #0a0f14, #1a252f) !important;
      margin: 2px !important;
      border-radius: 14px !important;
      height: 30px !important;
      border: 1px solid rgba(0, 255, 136, 0.2) !important;
      min-width: 60px !important;
    }

    :host([theme="modern"]) .temp-value .digit-svg svg path,
    :host([theme="modern"]) .temp-value .degree-symbol svg path,
    :host([theme="modern"]) .current-temp .degree-symbol svg path,
    :host([theme="modern"]) .digit-svg svg path,
    :host([theme="modern"]) .temp-value .digit-svg svg circle,
    :host([theme="modern"]) .temp-value .degree-symbol svg circle,
    :host([theme="modern"]) .current-temp .degree-symbol svg circle,
    :host([theme="modern"]) .digit-svg svg circle {
      fill: #138f55  !important;
      filter: drop-shadow(0 0 4px #138f55 ) !important;
    }

    :host([theme="modern"]) .temp-value.pending {
      animation: pulse-temp 1.5s infinite !important;
      border-color: #ff6b35 !important;
      color: #ff6b35 !important;
      text-shadow: 0 0 12px #ff6b35 !important;
    }

    :host([theme="modern"]) .temp-value.pending .digit-svg svg path,
    :host([theme="modern"]) .temp-value.pending .degree-symbol svg path,
    :host([theme="modern"]) .temp-value.pending .digit-svg svg circle,
    :host([theme="modern"]) .temp-value.pending .degree-symbol svg circle {
      fill: #ff6b35 !important;
      filter: drop-shadow(0 0 4px #ff6b35) !important;
    }

    :host([theme="modern"]) .degree-symbol {
      color: #138f55  !important;
      text-shadow: 0 0 4px #138f55  !important;
    }

    :host([theme="modern"]) .current-temp .degree-symbol {
        color: #00ae34 !important;
        text-shadow: 0 0 4px #138f55  !important;
    }

    :host([theme="modern"]) .degree-symbol.pending {
      color: #ff6b35 !important;
      text-shadow: 0 0 4px #ff6b35 !important;
    }

    @keyframes pulse-temp {
      0%, 100% {
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(255, 107, 53, 0.3);
      }
      50% {
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 16px rgba(255, 107, 53, 0.6);
      }
    }

    :host([theme="modern"]) .power-btn {
        width: 35px !important;
        height: 35px !important;
        min-width: 35px !important;
        min-height: 35px !important;
        border-radius: 50% !important;
        border: 2px solid #34495e !important;
        background: linear-gradient(145deg, #2c3e50, #1a252f) !important;
        color: #95a5a6 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        padding: 0 !important;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3),
            inset 0 2px 4px rgba(255, 255, 255, 0.1),
            inset 0 -2px 4px rgba(0, 0, 0, 0.2) !important;
        position: relative !important;
        z-index: 2 !important;
        flex-shrink: 0 !important;
    }

    :host([theme="modern"]) .power-btn:before {
      content: '' !important;
      position: absolute !important;
      inset: 3px !important;
      border-radius: 50% !important;
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), transparent) !important;
      pointer-events: none !important;
    }

    :host([theme="modern"]) .power-btn:hover {
      transform: translateY(-2px) scale(1.05) !important;
      box-shadow:
        0 6px 12px rgba(0, 0, 0, 0.4),
        inset 0 2px 4px rgba(255, 255, 255, 0.15),
        inset 0 -2px 4px rgba(0, 0, 0, 0.25) !important;
    }

    :host([theme="modern"]) .power-btn:active {
      transform: translateY(0) scale(1.02) !important;
      box-shadow:
        0 2px 4px rgba(0, 0, 0, 0.3),
        inset 0 2px 6px rgba(0, 0, 0, 0.3) !important;
    }

    :host([theme="modern"]) .power-btn:not(.off) {
      background: linear-gradient(145deg, #27ae60, #2ecc71) !important;
      border-color: #27ae60 !important;
      color: white !important;
      box-shadow:
        0 4px 8px rgba(39, 174, 96, 0.3),
        inset 0 2px 4px rgba(255, 255, 255, 0.2),
        inset 0 -2px 4px rgba(0, 0, 0, 0.1),
        0 0 20px rgba(39, 174, 96, 0.4) !important;
      animation: power-glow 2s ease-in-out infinite !important;
    }

    @keyframes power-glow {
      0%, 100% {
        box-shadow:
          0 4px 8px rgba(39, 174, 96, 0.3),
          inset 0 2px 4px rgba(255, 255, 255, 0.2),
          inset 0 -2px 4px rgba(0, 0, 0, 0.1),
          0 0 20px rgba(39, 174, 96, 0.4);
      }
      50% {
        box-shadow:
          0 4px 8px rgba(39, 174, 96, 0.4),
          inset 0 2px 4px rgba(255, 255, 255, 0.25),
          inset 0 -2px 4px rgba(0, 0, 0, 0.1),
          0 0 30px rgba(39, 174, 96, 0.6);
      }
    }
    @media (max-width: 650px) {
      :host([theme="modern"]) .expand-btn {
        width: 15px !important;
        height: 15px !important;
        min-width: 15px !important;
        min-height: 15px !important;
      }
    }
    @media (max-width: 500px) {
      :host([theme="modern"]) .expand-btn {
        width: 15px !important;
        height: 15px !important;
        min-width: 15px !important;
        min-height: 15px !important;
      }
    }
    :host([theme="modern"]) .power-btn.off {
      background: linear-gradient(145deg, #7f8c8d, #95a5a6) !important;
      border-color: #7f8c8d !important;
      color: #2c3e50 !important;
    }

    :host([theme="modern"]) .power-btn ha-icon {
      --mdc-icon-size: 22px !important;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3)) !important;
    }
    :host([theme="cyberpunk"]) .switch.mini .slider {
        width: 50px !important;
    }
    :host([theme="modern"]) .temp-btn {
        /* background: linear-gradient(145deg, #ffffffeb, #4d4d4d7a) !important; */
        font-size: 1.1rem !important;
        cursor: pointer !important;
        padding: 0 !important;
        color: #1d1b20 !important;
        height: 40px !important;
        width: 20px !important;
        border-radius: 6px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        position: relative !important;
        overflow: hidden !important;
        /* text-shadow: 0 0 6px #138f55  !important; */
        flex-shrink: 0 !important;
        /* box-shadow: inset 0 -1px 5px rgba(0, 0, 0, 0.4),        inset 0 -1px 2px rgba(255, 255, 255, 0.1),        0 0 16px rgba(0, 191, 255, 0.2) !important; */
    }

    :host([theme="modern"]) .temp-btn:before {
      content: '' !important;
      position: absolute !important;
      inset: 1px !important;
      background: linear-gradient(145deg, rgba(0, 255, 136, 0.1), transparent) !important;
      border-radius: 7px !important;
      pointer-events: none !important;
      opacity: 0 !important;
      transition: opacity 0.2s !important;
    }

    :host([theme="modern"]) .temp-btn:hover {
      transform: translateY(-1px) !important;
      border-color: rgba(0, 255, 136, 0.6) !important;
      box-shadow:
        0 4px 8px rgba(0, 0, 0, 0.3),
        0 0 12px rgba(0, 255, 136, 0.3) !important;
      text-shadow: 0 0 10px #138f55  !important;
    }

    :host([theme="modern"]) .temp-btn:hover:before {
      opacity: 1 !important;
    }

    :host([theme="modern"]) .temp-btn:active {
      transform: translateY(0) !important;
      box-shadow:
        inset 0 2px 4px rgba(0, 0, 0, 0.3),
        0 0 8px rgba(0, 255, 136, 0.2) !important;
    }

    :host([theme="modern"]) .temp-btn ha-icon[icon="mdi:plus"],
    :host([theme="modern"]) .temp-btn ha-icon[icon="mdi:minus"] {
      --mdc-icon-size: 18px !important;
    }

    :host([theme="modern"]) .expand-btn {
        width: 32px;
        height: 32px;
        min-width: 32px;
        min-height: 32px;
        border-radius: 50% !important;
        /* border: 1px solid rgba(0, 255, 136, 0.3) !important; */
        background: linear-gradient(145deg, #ffffff, #4d4d4d) !important;
        color: #138f55  !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        padding: 0 !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2),
                inset 0 1px 2px rgba(255, 255, 255, 0.1) !important;
        position: relative !important;
        z-index: 2 !important;
        flex-shrink: 0 !important;
        margin-left: -5px !important;
    }

    :host([theme="modern"]) .expand-btn:hover {
      transform: translateY(-2px) scale(1.05) !important;
      color:rgb(0, 0, 0) !important;
      background: linear-gradient(145deg, #ffffff, #4d4d4d) !important;
    }

    :host([theme="modern"]) .expand-btn.expanded {
      color:rgb(0, 0, 0) !important;
      background: linear-gradient(320deg, #ffffff, #4d4d4d) !important;
      transform: rotate(180deg) !important;
    }

    :host([theme="modern"]) .expand-btn ha-icon {
        --mdc-icon-size: 16px !important;
        color: #000000 !important;
        transition: all 0.2s !important;
    }

    :host([theme="modern"]) .digit-svg {
        display: inline-flex !important;
        width: 14px !important;
        height: 40px !important;
        justify-content: center !important;
        align-items: center !important;
        gap: 0 !important;
        margin-right: -5px !important;
        position: relative !important;
        margin-bottom: 5px !important;
        transform: scale(0.8);
    }

    :host([theme="modern"]) .digit-svg svg {
      filter: drop-shadow(0 0 4px #138f55 ) !important;
    }



    :host([theme="modern"]) .digit-dot {
      font-size: 1.2em !important;
      line-height: 0.5 !important;
      vertical-align: middle !important;
      font-family: 'Courier New', monospace !important;
      padding: 0 2px !important;
      color: #138f55  !important;
      display: inline-block !important;
      text-shadow: 0 0 6px #138f55  !important;
    }
    :host([theme="modern"]) .digit-svg-current {
        display: flex !important;
        width: 25px !important;
        height: 40px !important;
        justify-content: center !important;
        align-items: center !important;
        gap: 0 !important;
        margin-right: -12px !important;
        position: relative !important;
        left: 3px !important;
    }
    :host([theme="modern"]) .degree-symbol {
        display: flex !important;
        position: relative !important;
        left: 3px !important;
    }
    :host([theme="modern"]) .digit-svg-current svg {
      filter: drop-shadow(0 0 3px #138f55 ) !important;
      fill:rgba(0, 255, 136, 0.32) !important;
    }
    /* Mode-specific color themes for temp-wrap */
    :host([theme="modern"]) .temp-control.mode-cool {
        animation: pulse-cool-shadow-modern 4s infinite !important;
    }
    :host([theme="modern"]) .temp-wrap.mode-cool {
      border-color: rgba(0, 191, 255, 0.5) !important;
      box-shadow:
        inset 0 2px 8px rgba(0, 0, 0, 0.4),
        inset 0 -1px 2px rgba(255, 255, 255, 0.1),
        0 0 16px rgba(0, 191, 255, 0.2) !important;
    }
    :host([theme="modern"]) .temp-wrap.mode-cool .current-temp,
    :host([theme="modern"]) .temp-wrap.mode-cool .temp-value {
      border-color: rgba(0, 191, 255, 0.4) !important;
      color: #00bfff !important;
      text-shadow: 0 0 8px #00bfff !important;
    }
    :host([theme="modern"]) .temp-wrap.mode-cool .current-temp .digit-svg-current svg,
    :host([theme="modern"]) .temp-wrap.mode-cool .current-temp .degree-symbol svg,
    :host([theme="modern"]) .temp-wrap.mode-cool .temp-value .digit-svg svg path,
    :host([theme="modern"]) .temp-wrap.mode-cool .temp-value .degree-symbol svg path,
    :host([theme="modern"]) .temp-wrap.mode-cool .temp-value .digit-svg svg circle,
    :host([theme="modern"]) .temp-wrap.mode-cool .temp-value .degree-symbol svg circle {
      fill: #00bfff !important;
      filter: drop-shadow(0 0 4px #00bfff) !important;
    }

    :host([theme="modern"]) .temp-wrap.mode-cool .degree-symbol {
      color: #00bfff !important;
      text-shadow: 0 0 4px #00bfff !important;
    }

    :host([theme="modern"]) .temp-wrap.mode-cool .current-temp .degree-symbol {
      color: #00bfff !important;
      text-shadow: 0 0 4px #00bfff !important;
    }
    :host([theme="modern"]) .temp-control.mode-heat {
        animation: pulse-heat-shadow-modern 4s infinite !important;
    }
    :host([theme="modern"]) .temp-wrap.mode-heat {
      border-color: rgba(255, 107, 53, 0.5) !important;
      box-shadow:
        inset 0 2px 8px rgba(0, 0, 0, 0.4),
        inset 0 -1px 2px rgba(255, 255, 255, 0.1),
        0 0 16px rgba(255, 107, 53, 0.2) !important;
    }
    :host([theme="modern"]) .temp-wrap.mode-heat .current-temp,
    :host([theme="modern"]) .temp-wrap.mode-heat .temp-value {
      border-color: rgba(255, 107, 53, 0.4) !important;
      color: #ff6b35 !important;
      text-shadow: 0 0 8px #ff6b35 !important;
    }
    :host([theme="modern"]) .temp-wrap.mode-heat .current-temp .digit-svg-current svg,
    :host([theme="modern"]) .temp-wrap.mode-heat .current-temp .degree-symbol svg,
    :host([theme="modern"]) .temp-wrap.mode-heat .temp-value .digit-svg svg path,
    :host([theme="modern"]) .temp-wrap.mode-heat .temp-value .degree-symbol svg path,
    :host([theme="modern"]) .temp-wrap.mode-heat .temp-value .digit-svg svg circle,
    :host([theme="modern"]) .temp-wrap.mode-heat .temp-value .degree-symbol svg circle {
      fill: #ff6b35 !important;
      filter: drop-shadow(0 0 4px #ff6b35) !important;
    }

    :host([theme="modern"]) .temp-wrap.mode-heat .degree-symbol {
      color: #ff6b35 !important;
      text-shadow: 0 0 4px #ff6b35 !important;
    }

    :host([theme="modern"]) .temp-wrap.mode-heat .current-temp .degree-symbol {
      color: #ff6b35 !important;
      text-shadow: 0 0 4px #ff6b35 !important;
    }

    :host([theme="modern"]) .temp-control.mode-dry {
        animation: pulse-dry-shadow-modern 4s infinite !important;
    }

    :host([theme="modern"]) .temp-wrap.mode-dry {
      border-color: rgba(0, 191, 174, 0.5) !important;
      box-shadow:
        inset 0 2px 8px rgba(0, 0, 0, 0.4),
        inset 0 -1px 2px rgba(255, 255, 255, 0.1),
        0 0 16px rgba(0, 191, 174, 0.2) !important;
    }

    :host([theme="modern"]) .temp-wrap.mode-dry .current-temp,
    :host([theme="modern"]) .temp-wrap.mode-dry .temp-value {
      border-color: rgba(0, 191, 174, 0.4) !important;
      color: #00bfae !important;
      text-shadow: 0 0 8px #00bfae !important;
    }

    :host([theme="modern"]) .temp-control.mode-fan_only {
        animation: pulse-fan-shadow-modern 4s infinite !important;
    }

    :host([theme="modern"]) .temp-wrap.mode-fan_only {
      border-color: rgba(189, 189, 189, 0.5) !important;
      box-shadow:
        inset 0 2px 8px rgba(0, 0, 0, 0.4),
        inset 0 -1px 2px rgba(255, 255, 255, 0.1),
        0 0 16px rgba(189, 189, 189, 0.2) !important;
    }

    :host([theme="modern"]) .temp-control.mode-auto {
        animation: pulse-auto-shadow-modern 4s infinite !important;
    }

    :host([theme="modern"]) .temp-wrap.mode-auto {
      border-color: rgba(255, 255, 255, 0.5) !important;
      box-shadow:
        inset 0 2px 8px rgba(0, 0, 0, 0.4),
        inset 0 -1px 2px rgba(255, 255, 255, 0.1),
        0 0 16px rgba(255, 255, 255, 0.1) !important;
    }

    @keyframes auto-color-cycle {
      0%, 25% { border-color: rgba(0, 255, 136, 0.5); }
      25%, 50% { border-color: rgba(0, 191, 255, 0.5); }
      50%, 75% { border-color: rgba(255, 107, 53, 0.5); }
      75%, 100% { border-color: rgba(0, 255, 136, 0.5); }
    }

    /* Modern theme shadow animations */
    @keyframes pulse-cool-shadow-modern {
      0%, 100% {
        box-shadow:
          inset 0 2px 8px rgba(0, 0, 0, 0.4),
          inset 0 -1px 2px rgba(255, 255, 255, 0.1),
          0 4px 1px 0 rgba(0, 191, 255, 0.3);
      }
      50% {
        box-shadow:
          inset 0 2px 8px rgba(0, 0, 0, 0.4),
          inset 0 -1px 2px rgba(255, 255, 255, 0.1),
          0 12px 12px 0 rgba(0, 191, 255, 0.5);
      }
    }

    @keyframes pulse-heat-shadow-modern {
      0%, 100% {
        box-shadow:
          inset 0 2px 8px rgba(0, 0, 0, 0.4),
          inset 0 -1px 2px rgba(255, 255, 255, 0.1),
          0 4px 1px 0 rgba(255, 107, 53, 0.3);
      }
      50% {
        box-shadow:
          inset 0 2px 8px rgba(0, 0, 0, 0.4),
          inset 0 -1px 2px rgba(255, 255, 255, 0.1),
          0 12px 12px 0 rgba(255, 107, 53, 0.5);
      }
    }

    @keyframes pulse-fan-shadow-modern {
      0%, 100% {
        box-shadow:
          inset 0 2px 8px rgba(0, 0, 0, 0.4),
          inset 0 -1px 2px rgba(255, 255, 255, 0.1),
          0 4px 1px 0 rgba(189, 189, 189, 0.3);
      }
      50% {
        box-shadow:
          inset 0 2px 8px rgba(0, 0, 0, 0.4),
          inset 0 -1px 2px rgba(255, 255, 255, 0.1),
          0 12px 12px 0 rgba(189, 189, 189, 0.5);
      }
    }

    @keyframes pulse-dry-shadow-modern {
      0%, 100% {
        box-shadow:
          inset 0 2px 8px rgba(0, 0, 0, 0.4),
          inset 0 -1px 2px rgba(255, 255, 255, 0.1),
          0 4px 1px 0 rgba(0, 191, 174, 0.3);
      }
      50% {
        box-shadow:
          inset 0 2px 8px rgba(0, 0, 0, 0.4),
          inset 0 -1px 2px rgba(255, 255, 255, 0.1),
          0 12px 12px 0 rgba(0, 191, 174, 0.5);
      }
    }

    @keyframes pulse-auto-shadow-modern {
      0%, 100% {
        box-shadow:
          inset 0 2px 8px rgba(0, 0, 0, 0.4),
          inset 0 -1px 2px rgba(255, 255, 255, 0.1),
          0 4px 1px 0 rgba(0, 191, 255, 0.3),
          0 4px 1px 0 rgba(255, 107, 53, 0.3),
          0 4px 1px 0 rgba(189, 189, 189, 0.3),
          0 4px 1px 0 rgba(0, 191, 174, 0.3);
      }
      50% {
        box-shadow:
          inset 0 2px 8px rgba(0, 0, 0, 0.4),
          inset 0 -1px 2px rgba(255, 255, 255, 0.1),
          0 12px 12px 0 rgba(0, 191, 255, 0.5),
          0 12px 12px 0 rgba(255, 107, 53, 0.5),
          0 12px 12px 0 rgba(189, 189, 189, 0.5),
          0 12px 12px 0 rgba(0, 191, 174, 0.5);
      }
    }

    /* Controlli espansi - tema modern */
    :host([theme="modern"]) .expandable-content {
      background: linear-gradient(145deg, #dbdbd9, #bebcb6);
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 24px;
      padding: 16px;
      margin-top: 8px;
      box-shadow:
        inset 0 2px 8px rgba(0, 0, 0, 0.1),
        inset 0 -1px 2px rgba(255, 255, 255, 0.2);
    }

    :host([theme="modern"]) .modes {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-bottom: 16px;
      padding: 12px;
      background: linear-gradient(145deg, #dbdbd9, #bebcb6);
      border-radius: 24px;
      border: 1px solid rgba(0, 0, 0, 0.2);
      box-shadow:
        inset 0 2px 8px rgba(0, 0, 0, 0.1),
        inset 0 -1px 2px rgba(255, 255, 255, 0.2);
    }

    :host([theme="modern"]) .mode-btn {
      width: 48px !important;
      height: 48px !important;
      border: 1px solid rgba(0, 0, 0, 0.3) !important;
      border-radius: 16px !important;
      background: linear-gradient(145deg, #dbdbd9, #bebcb6) !important;
      color: #666 !important;
      transition: all 0.3s ease !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow:
        inset 0 2px 8px rgba(0, 0, 0, 0.1),
        inset 0 -1px 2px rgba(255, 255, 255, 0.2) !important;
    }

    :host([theme="modern"]) .mode-btn:hover {
      background: linear-gradient(145deg, #e5e5e3, #c8c6c0) !important;
      border-color: rgba(0, 0, 0, 0.4) !important;
      color: #555 !important;
    }

    :host([theme="modern"]) .mode-btn.active {
      background: linear-gradient(145deg, #dbdbd9, #bebcb6) !important;
      border-color: rgba(0, 255, 136, 0.6) !important;
      color: #333 !important;
      box-shadow:
        inset 0 2px 8px rgba(0, 0, 0, 0.2),
        inset 0 -1px 2px rgba(255, 255, 255, 0.3),
        0 0 12px rgba(0, 255, 136, 0.4) !important;
    }

    :host([theme="modern"]) .mode-btn ha-icon {
      --mdc-icon-size: 20px !important;
    }

    :host([theme="modern"]) .fan-section {
      margin-bottom: 16px;
      padding: 12px;
      background: linear-gradient(145deg, #dbdbd9, #bebcb6);
      border-radius: 24px;
      border: 1px solid rgba(0, 0, 0, 0.2);
      box-shadow:
        inset 0 2px 8px rgba(0, 0, 0, 0.1),
        inset 0 -1px 2px rgba(255, 255, 255, 0.2);
    }

    :host([theme="modern"]) .fan-label {
      color: #333 !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      font-family: 'Orbitron', 'Roboto Mono', monospace !important;
      margin-bottom: 8px !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
    }

    :host([theme="modern"]) .fan-label ha-icon {
      --mdc-icon-size: 16px !important;
      color: #666 !important;
    }

    :host([theme="modern"]) .fan-speeds {
      display: flex !important;
      gap: 6px !important;
      flex-wrap: wrap !important;
    }

    :host([theme="modern"]) .fan-btn {
      padding: 8px 16px !important;
      border: 1px solid rgba(0, 0, 0, 0.3) !important;
      border-radius: 12px !important;
      background: linear-gradient(145deg, #dbdbd9, #bebcb6) !important;
      color: #666 !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      font-family: 'Orbitron', 'Roboto Mono', monospace !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      transition: all 0.3s ease !important;
      cursor: pointer !important;
      min-width: 60px !important;
      box-shadow:
        inset 0 2px 8px rgba(0, 0, 0, 0.1),
        inset 0 -1px 2px rgba(255, 255, 255, 0.2) !important;
    }

    :host([theme="modern"]) .fan-btn:hover {
      background: linear-gradient(145deg, #e5e5e3, #c8c6c0) !important;
      border-color: rgba(0, 0, 0, 0.4) !important;
      color: #555 !important;
    }

    :host([theme="modern"]) .fan-btn.active {
      background: linear-gradient(145deg, #dbdbd9, #bebcb6) !important;
      border-color: rgba(0, 255, 136, 0.6) !important;
      color: #333 !important;
      box-shadow:
        inset 0 2px 8px rgba(0, 0, 0, 0.2),
        inset 0 -1px 2px rgba(255, 255, 255, 0.3),
        0 0 8px rgba(0, 255, 136, 0.3) !important;
    }

    :host([theme="modern"]) .fan-speed-indicator {
      color: #666 !important;
    }
    :host([theme="modern"]) .message-edit-row:hover {
        background: linear-gradient(145deg, rgba(0, 255, 136, 0.31),  rgba(106, 178, 145, 0.31)) !important;
    }
    /* === TEMA COMPACT - STILE SUPER COMPATTO === */
    :host([theme="compact"]) {
      max-width: 200px;
      min-width: 180px;
    }

    :host([theme="compact"]) .card {
      background: var(--card-background-color, var(--ha-card-background));
      border-radius: var(--ha-card-border-radius, 12px);
      box-shadow: var(--ha-card-box-shadow);
      border: var(--ha-card-border-width, 1px) solid var(--divider-color);
      overflow: hidden;
      position: relative;
    }

    :host([theme="compact"]) .header {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 6px;
      padding: 6px 8px 4px 8px;
      border-bottom: none;
      position: relative;
    }
    :host([theme="compact"])  .title-wrap {
        margin-right: -70px !important;
    }
    :host([theme="compact"]) .power-btn {
        width: 20px;
        height: 20px;
        min-width: 20px;
        min-height: 20px;
        border-radius: 50%;
        border: 1px solid #999;
        background: none !important;
        color: var(--primary-text-color);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: 0.2s;
        order: -1;
        box-shadow: none;
        margin-right: -10px;
    }
    :host([theme="compact"]) .power-btn.off {
        background: var(--card-background-color);
        box-shadow: none;
        border: 1px solid #999;
    }
    :host([theme="compact"]) .fan-speed-indicator {
      width: 12px;
      color: var(--primary-color);
      position: relative;
      z-index: 1;
     }
     :host([theme="compact"]) .fan-speed-indicator:after {
       content: '';
       position: absolute;
       left: 50%;
       top: 50%;
       width: 20px;
       height: 20px;
       border-radius: 50%;
       pointer-events: none;
       z-index: 0;
       transform: translate(-50%, -50%);
       opacity: 0.6;
       box-shadow: 0 6px 12px 0 var(--fan-shadow-color, var(--primary-color));
     }
     :host([theme="compact"]) .fan-speed-indicator.low:after {
       --fan-shadow-color: #bdbdbd;
       animation: fan-wind-rotate-low 2.5s linear infinite;
     }
     :host([theme="compact"]) .fan-speed-indicator.medium:after {
       --fan-shadow-color: #90caf9;
       animation: fan-wind-rotate-medium 1.5s linear infinite;
     }
     :host([theme="compact"]) .fan-speed-indicator.high:after {
       --fan-shadow-color: #00bfff;
       animation: fan-wind-rotate-high 0.8s linear infinite;
     }
     :host([theme="compact"]) .fan-speed-indicator.auto:after {
       --fan-shadow-color: #bdbdbd;
       animation: fan-wind-rotate-auto 1.8s linear infinite;
     }

    :host([theme="compact"]) .power-btn ha-icon {
      --mdc-icon-size: 12px;
      margin-bottom: 2px;
    }
    :host([theme="compact"]) .title-wrap {
        margin-right: -70px !important;
        max-width: calc(100% - 70px);
        overflow: hidden;
    }
    :host([theme="compact"]) .title {
        font-size: 10px;
        font-weight: 500;
        color: var(--primary-text-color);
        margin: 0px 0px 0px 4px;
        text-transform: capitalize;
        letter-spacing: 0.3px;
        text-align: start;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        position: relative;
        max-width: 100%;
    }
    :host([theme="compact"]) .header-actions {
        display: flex;
        transform: scale(0.8);
        top: 80px;
        position: absolute;
        right: 47px;
        margin: 0px;
        z-index: 2;
    }
    :host([theme="compact"]) .temp-control {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 0 0 8px;
        gap: 8px;
        margin-bottom: 30px;
    }
    :host([theme="compact"]) .current-temp {
        display: flex;
        align-items: center;
        position: relative;
        /* margin: 0px; */
        bottom: 40px;
        left: 90%;
        min-width: 0px !important;
        background: none;
        margin-bottom: 2px;
    }

    :host([theme="compact"]) .temp-adjust {
        display: flex;
        align-items: center;
        gap: 0;
        background: none;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 36px;
        height: 30px;
        padding: 0;
        backdrop-filter: blur(5px);
        box-shadow: 0 0 5px rgba(0,0,0,0.3);
    }
    :host([theme="compact"]) .temp-value {
        color: var(--primary-text-color);
        width: 50px;
        text-align: center;
        height: 30px;
        margin: 0;
        justify-content: center;
        align-items: center;
        flex: 1;
        display: flex;
    }
    :host([theme="compact"]) .temp-btn {
      width: 30px;
      height: 30px;
      border: none;
      background: none;
      color: var(--primary-text-color);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      margin: 0;
    }
    :host([theme="compact"]) .temp-btn.left {
        border-radius: 36px 0 0 36px;
    }
    :host([theme="compact"]) .temp-btn.right{
        border-radius: 0 36px 36px 0;
    }
    :host([theme="compact"]) .temp-btn:hover {
      background: var(--primary-color);
      color: var(--primary-text-color);
    }

    :host([theme="compact"]) .temp-btn ha-icon {
      --mdc-icon-size: 14px;
    }
    :host([theme="compact"]) .modes {
        display: flex;
        justify-content: center;
        gap: 6px;
        padding: 10px 0 0 0;
        border-top: 1px solid var(--divider-color);
    }
    :host([theme="compact"]) .mode-btn {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--secondary-text-color);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    :host([theme="compact"]) .mode-btn:hover {
      background: var(--state-icon-color);
      color: var(--primary-text-color);
    }

    :host([theme="compact"]) .mode-btn.active {
      background: var(--primary-background-color);
      color: var(--primary-text-color);
      border-color: var(--primary-color);
    }

    :host([theme="compact"]) .mode-btn ha-icon {
      --mdc-icon-size: 14px;
    }
    :host([theme="compact"]) .expand-btn {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--secondary-text-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: 0.2s;
        right: 240%;
        top: 40px;
    }
    :host([theme="compact"]) .expand-btn:hover {
      background: var(--primary-color);
      color: var(--primary-text-color);
      transform: scale(1.1);
    }
    :host([theme="compact"]) .navigation-buttons {
      padding: 0 !important;
      margin: 0 !important;
    }
    :host([theme="compact"]) .nav-info {
      font-size: 10px !important;
    }
    :host([theme="compact"]) .expand-btn.expanded ha-icon {
      transform: rotate(180deg);
    }

    :host([theme="compact"]) .expand-btn ha-icon {
      --mdc-icon-size: 12px;
    }

    :host([theme="compact"]) .expandable-content {
      background: var(--card-background-color);
      margin: 0;
      border-radius: 0;
      padding-bottom: 8px;
    }

    :host([theme="compact"]) .fan-section {
      background: var(--secondary-background-color);
      border-radius: 4px;
      margin: 4px;
      padding: 6px;
      border: 1px solid var(--divider-color);
    }

    :host([theme="compact"]) .fan-label {
      color: var(--primary-text-color);
      font-size: 9px;
      font-weight: 500;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 3px;
    }

    :host([theme="compact"]) .fan-speeds {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: flex-start;
    }

    :host([theme="compact"]) .fan-label ha-icon {
      --mdc-icon-size: 11px;
    }

    /* Animazioni SVG fan-speed-indicator nel tema compact */
    :host([theme="compact"]) .fan-label svg.fan-speed-indicator {
      width: 12px !important;
      height: 12px !important;
      transform-origin: center;
      transition: all 0.2s ease;
      margin-left: 5px;
    }

    :host([theme="compact"]) .fan-label svg.fan-speed-indicator.low {
      animation: fan-wind-rotate-low 2.5s linear infinite;
    }

    :host([theme="compact"]) .fan-label svg.fan-speed-indicator.medium {
      animation: fan-wind-rotate-medium 1.5s linear infinite;
    }

    :host([theme="compact"]) .fan-label svg.fan-speed-indicator.high {
      animation: fan-wind-rotate-high 0.8s linear infinite;
    }

    :host([theme="compact"]) .fan-label svg.fan-speed-indicator.auto {
      animation: fan-wind-rotate-auto 1.8s linear infinite;
    }

    :host([theme="compact"]) .fan-btn {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      color: var(--secondary-text-color);
      border-radius: 4px;
      padding: 4px;
      min-width: 32px;
      height: 28px;
      font-size: 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :host([theme="compact"]) .fan-btn ha-icon {
      --mdc-icon-size: 14px;
    }

    :host([theme="compact"]) .fan-btn:hover {
      background: var(--state-icon-color);
      color: var(--primary-text-color);
      transform: scale(1.05);
    }

    :host([theme="compact"]) .fan-btn.active {
        background: var(--primary-background-color);
        color: var(--primary-text-color);
        border-color: var(--primary-color);
        box-shadow: 0 0 4px rgba(0, 150, 255, 0.3);
    }

    /* Digit SVG con primary text color per il tema compact */
    :host([theme="compact"]) .current-temp .digit-svg-current svg path,
    :host([theme="compact"]) .current-temp .degree-symbol svg path,
    :host([theme="compact"]) .temp-value .degree-symbol svg path,
    :host([theme="compact"]) .temp-value .digit-svg svg path,
    :host([theme="compact"]) .current-temp .digit-svg-current svg circle,
    :host([theme="compact"]) .current-temp .degree-symbol svg circle,
    :host([theme="compact"]) .temp-value .degree-symbol svg circle,
    :host([theme="compact"]) .temp-value .digit-svg svg circle {
      fill: var(--primary-text-color) !important;
    }

    :host([theme="compact"]) .current-temp .degree-symbol {
      color: var(--primary-text-color) !important;
    }

    :host([theme="compact"]) .degree-symbol {
        margin-bottom: 5px;
        margin-right: -0.5px;
    }
    :host([theme="compact"]) .temp-value .degree-symbol {
      color: var(--primary-text-color) !important;
      height: 20px;
    }

    :host([theme="compact"]) .temp-value .degree-symbol.pending {
      color: #ff6b35 !important;
    }

    :host([theme="compact"]) .temp-value.pending .digit-svg svg circle {
      fill: #ff6b35 !important;
    }

    /* Regole pending per i path SVG nel tema compact */
    :host([theme="compact"]) .temp-value.pending .digit-svg svg path {
      fill: #ff6b35 !important;
    }

    /* Dimensioni ridotte SVG temperatura per tema compact */
    :host([theme="compact"]) .current-temp .digit-svg-current svg {
      width: 8px !important;
      height: 12px !important;
    }
    :host([theme="compact"]) .temp-value .digit-svg svg {
      width: 8px !important;
      height: 12px !important;
    }

    :host([theme="compact"]) .temp-value .digit-svg {
        width: 30px !important;
        height: 12px !important;
        transform: scale(1.8) translateY(1px);
    }
    :host([theme="compact"]) .current-temp .digit-svg-current {
        width: 7px !important;
        height: 12px;
        transform: scale(1.1);
        margin: unset;
    }
    :host([theme="compact"]) .temp-wrap {
        background: none !important;
        border: none !important;
        box-shadow: none !important;
        margin-right: 40px;
    }

    /* Sposta power button nell'header per tema compact */
    :host([theme="compact"]) .temp-control .power-btn {
      display: none;
    }

    /* Header flex per tema compact */
    :host([theme="compact"]) .header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* === TEMA CYBERPUNK - STILE COMANDO ROSSO === */
    :host([theme="cyberpunk"]) {
      max-width: 380px;
    }

    :host([theme="cyberpunk"]) .card {
      background: linear-gradient(135deg, #1a0e0e, #2d1111, #1f0808);
      border: 2px solid #ff3300;
      border-radius: 8px;
      box-shadow:
        0 0 30px rgba(255, 51, 0, 0.4),
        0 8px 25px rgba(0, 0, 0, 0.8),
        inset 0 1px 1px rgba(255, 102, 51, 0.3);
      overflow: hidden;
      position: relative;
    }

    :host([theme="cyberpunk"]) .card:before {
      content: '';
    }
    :host([theme="cyberpunk"]) .status-icon.fan {
      color: #ff6633;
    }
    :host([theme="cyberpunk"]) .title {
      color: #ff6633 !important;
      font-family: 'Courier New', monospace !important;
      font-weight: 700 !important;
      font-size: 10px !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
      text-shadow:
        0 0 8px rgba(255, 102, 51, 0.8),
        0 0 15px rgba(255, 51, 0, 0.6),
        0 2px 4px rgba(0, 0, 0, 0.8) !important;
      animation: titleGlow 4s ease-in-out infinite;
    }

    @keyframes titleGlow {
      0%, 100% {
        text-shadow:
          0 0 8px rgba(255, 102, 51, 0.8),
          0 0 15px rgba(255, 51, 0, 0.6),
          0 2px 4px rgba(0, 0, 0, 0.8);
      }
      50% {
        text-shadow:
          0 0 12px rgba(255, 102, 51, 1),
          0 0 20px rgba(255, 51, 0, 0.8),
          0 2px 4px rgba(0, 0, 0, 0.8);
      }
    }

    :host([theme="cyberpunk"]) .card:after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        repeating-linear-gradient(
          90deg,
          transparent 0px,
          transparent 2px,
          rgba(255, 51, 0, 0.03) 2px,
          rgba(255, 51, 0, 0.03) 4px
        );
      animation: scanlines 8s linear infinite;
      pointer-events: none;
    }

    @keyframes scanlines {
      0% { transform: translateX(0); }
      100% { transform: translateX(4px); }
    }

    :host([theme="cyberpunk"]) .temp-control {
      background:
        linear-gradient(135deg, rgba(51, 17, 17, 0.9), rgba(34, 11, 11, 0.95)),
        radial-gradient(circle at 30% 50%, rgba(255, 51, 0, 0.1), transparent 70%);
      border: 1px solid #ff3300;
      border-radius: 4px;
      /* padding: 16px; */
      margin: 12px 6px 8px 6px;
      position: relative;
      display: grid;
      grid-template-areas: "power current expand"
          "controls controls controls";
      grid-template-columns: 0 20em 0;
      /* gap: 12px 16px; */
      min-height: 100px;
      align-items: center;
      align-content: center;
      justify-content: center;
    }

    :host([theme="cyberpunk"]) .temp-control:before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg,
        transparent 0%,
        #ff6633 10%,
        #ff3300 50%,
        #ff6633 90%,
        transparent 100%);
      animation: topGlow 3s ease-in-out infinite;
    }

    @keyframes topGlow {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    :host([theme="cyberpunk"]) .power-btn {
        grid-area: power;
        width: 46px;
        height: 46px;
        border-radius: 0;
        border: 2px solid #ff3300;
        background: linear-gradient(135deg, #331111, #221111),
              radial-gradient(circle at center, rgba(255, 51, 0, 0.1), transparent) !important;
        color: #ff6633;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 15px rgba(255, 51, 0, 0.3),
                  inset 0 1px 1px rgba(255, 102, 51, 0.2);
        position: relative;
        align-self: center;
        justify-self: center;
        z-index: 1;
        margin-bottom: 80px;
        margin-left: 110px;
    }
    :host([theme="cyberpunk"]) .power-btn:before {
      content: 'PWR';
      position: absolute;
      bottom: -12px;
      font-size: 8px;
      color: #ff3300;
      font-family: 'Courier New', monospace;
    }

    :host([theme="cyberpunk"]) .power-btn:hover {
      border-color: #ff6633;
      color: #ffaa88;
      box-shadow:
        0 0 25px rgba(255, 102, 51, 0.5),
        inset 0 1px 1px rgba(255, 153, 102, 0.3);
    }

    :host([theme="cyberpunk"]) .power-btn:not(.off) {
        background: linear-gradient(135deg, #741700fa, #871b05), radial-gradient(circle at center, rgba(255, 255, 255, 0.2), transparent) !important;
        border-color: #ff6633;
        color:rgb(0, 0, 0);
        box-shadow: 0 0 30px rgba(255, 51, 0, 0.8),
            inset 0 1px 2px rgba(255, 255, 255, 0.3);
        animation: powerActive 2s ease-in-out infinite;
    }
    @keyframes powerActive {
      0%, 100% {
        box-shadow:
          0 0 30px rgba(255, 51, 0, 0.8),
          inset 0 1px 2px rgba(255, 255, 255, 0.3);
      }
      50% {
        box-shadow:
          0 0 40px rgba(255, 102, 51, 1),
          inset 0 1px 2px rgba(255, 255, 255, 0.4);
      }
    }

    :host([theme="cyberpunk"]) .power-btn ha-icon {
      --mdc-icon-size: 24px;
    }

    :host([theme="cyberpunk"]) .temp-wrap {
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background:
        linear-gradient(135deg, rgba(34, 11, 11, 0.8), rgba(51, 17, 17, 0.6)),
        linear-gradient(45deg, transparent 40%, rgba(255, 51, 0, 0.1) 50%, transparent 60%);
      border: 1px solid rgba(255, 51, 0, 0.5);
      border-radius: 4px;
      padding: 16px 8px;
      position: relative;
      }
    :host([theme="cyberpunk"]) .digit-svg-current {
        left: 0px;
        width: 16px;
    }
    :host([theme="cyberpunk"]) .current-temp {
      grid-area: current;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 900;
      color: #ff6633;
      text-shadow:
        0 0 15px rgba(255, 102, 51, 1),
        0 0 25px rgba(255, 51, 0, 0.8),
        0 2px 4px rgba(0, 0, 0, 0.9);
      background:
        linear-gradient(135deg, rgba(51, 17, 17, 0.8), rgba(34, 11, 11, 0.9)),
        linear-gradient(90deg, transparent 30%, rgba(255, 51, 0, 0.1) 50%, transparent 70%);
      border: 1px solid rgba(255, 51, 0, 0.5);
      border-radius: 6px;
      padding: 16px 20px;
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
      position: relative;
      align-self: center;
      justify-self: center;
      width: 60px;
      text-align: center;
      animation: tempPulse 3s ease-in-out infinite;
      margin-bottom: 8px;
    }

    @keyframes tempPulse {
      0%, 100% {
        color: #ff6633;
        text-shadow:
          0 0 15px rgba(255, 102, 51, 1),
          0 0 25px rgba(255, 51, 0, 0.8),
          0 2px 4px rgba(0, 0, 0, 0.9);
      }
      50% {
        color: #ffaa88;
        text-shadow:
          0 0 20px rgba(255, 170, 136, 1),
          0 0 30px rgba(255, 102, 51, 0.9),
          0 2px 4px rgba(0, 0, 0, 0.9);
      }
    }

    :host([theme="cyberpunk"]) .expand-btn {
      grid-area: expand;
      width: 46px;
      height: 46px;
      border-radius: 0;
      border: 2px solid #ff3300;
      background:
        linear-gradient(135deg, #331111, #221111),
        linear-gradient(45deg, transparent 30%, rgba(255, 51, 0, 0.1) 50%, transparent 70%);
      color: #ff6633;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      box-shadow: 0 0 15px rgba(255, 51, 0, 0.3);
      position: relative;
      align-self: center;
      justify-self: center;
      margin-bottom: 80px;
      margin-right: 110px;
    }

    :host([theme="cyberpunk"]) .expand-btn:before {
      content: 'CTL';
      position: absolute;
      bottom: -12px;
      font-size: 8px;
      color: #ff3300;
      font-family: 'Courier New', monospace;
    }

    :host([theme="cyberpunk"]) .expand-btn:hover {
      border-color: #ff6633;
      color: #ffaa88;
      box-shadow: 0 0 25px rgba(255, 102, 51, 0.5);
      transform: scale(1.05);
    }

    :host([theme="cyberpunk"]) .expand-btn.expanded {
      background:
        linear-gradient(135deg, #ff3300, #cc2200),
        radial-gradient(circle at center, rgba(255, 255, 255, 0.1), transparent);
      border-color: #ff6633;
      color: #ffffff;
      box-shadow: 0 0 30px rgba(255, 51, 0, 0.8);
      animation: expandActive 2s ease-in-out infinite;
    }

    @keyframes expandActive {
      0%, 100% {
        box-shadow: 0 0 30px rgba(255, 51, 0, 0.8);
      }
      50% {
        box-shadow: 0 0 40px rgba(255, 102, 51, 1);
      }
    }

    :host([theme="cyberpunk"]) .expand-btn ha-icon {
      --mdc-icon-size: 20px;
    }

    :host([theme="cyberpunk"]) .temp-adjust {
      grid-area: controls;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      background:
        linear-gradient(135deg, rgba(51, 17, 17, 0.6), rgba(34, 11, 11, 0.8)),
        repeating-linear-gradient(45deg, transparent 0px, transparent 10px, rgba(255, 51, 0, 0.05) 10px, rgba(255, 51, 0, 0.05) 20px);
      border: 1px solid rgba(255, 51, 0, 0.4);
      border-radius: 4px;
      padding: 12px;
      position: relative;
    }

    :host([theme="cyberpunk"]) .temp-adjust:before {
      content: 'TARGET ADJUSTMENT';
      position: absolute;
      top: 2px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 8px;
      color: #ff6633;
      font-family: 'Courier New', monospace;
    }

    :host([theme="cyberpunk"]) .temp-btn {
      width: 44px;
      height: 44px;
      border-radius: 0;
      border: 2px solid #ff3300;
      background:
        linear-gradient(135deg, #331111, #221111),
        linear-gradient(45deg, rgba(255, 51, 0, 0.1), transparent);
      color: #ff6633;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      box-shadow: 0 0 12px rgba(255, 51, 0, 0.3);
      position: relative;
    }

    :host([theme="cyberpunk"]) .temp-btn:hover {
      background:
        linear-gradient(135deg, #ff3300, #cc2200),
        radial-gradient(circle at center, rgba(255, 255, 255, 0.1), transparent);
      border-color: #ff6633;
      color: #ffffff;
      box-shadow: 0 0 20px rgba(255, 102, 51, 0.6);
      transform: scale(1.1);
    }

    :host([theme="cyberpunk"]) .temp-btn ha-icon {
      --mdc-icon-size: 18px;
    }

    :host([theme="cyberpunk"]) .temp-value {
      font-size: 32px;
      font-weight: 900;
      color: #ff6633;
      min-width: 60px;
      text-align: center;
      text-shadow:
        0 0 15px rgba(255, 102, 51, 1),
        0 0 8px rgba(255, 51, 0, 0.8),
        0 2px 4px rgba(0, 0, 0, 0.8);
      font-family: 'Orbitron', 'Courier New', monospace;
      letter-spacing: 1px;
      background:
        linear-gradient(135deg, rgba(51, 17, 17, 0.8), rgba(34, 11, 11, 0.9)),
        linear-gradient(90deg, transparent 30%, rgba(255, 51, 0, 0.1) 50%, transparent 70%);
      border: 1px solid rgba(255, 51, 0, 0.5);
      border-radius: 4px;
      padding: 8px 12px;
      position: relative;
    }

    :host([theme="cyberpunk"]) .temp-value:before {
      content: 'SET';
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 8px;
      color: #ff6633;
      font-family: 'Courier New', monospace;
    }

    :host([theme="cyberpunk"]) .temp-value.pending {
      color: #ffaa88;
      text-shadow:
        0 0 20px rgba(255, 170, 136, 1),
        0 0 12px rgba(255, 102, 51, 0.9),
        0 2px 4px rgba(0, 0, 0, 0.8);
      animation: pending 1s ease-in-out infinite;
    }

    @keyframes pending {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    /* Sovrascritura colori temperature per tema cyberpunk */
    :host([theme="cyberpunk"]) .temp-value .digit-svg svg path,
    :host([theme="cyberpunk"]) .temp-value .degree-symbol svg path,
    :host([theme="cyberpunk"]) .temp-value .digit-svg svg circle,
    :host([theme="cyberpunk"]) .temp-value .degree-symbol svg circle {
      fill: #ff6633 !important;
    }

    :host([theme="cyberpunk"]) .temp-value.pending .digit-svg svg path,
    :host([theme="cyberpunk"]) .temp-value.pending .degree-symbol svg path,
    :host([theme="cyberpunk"]) .temp-value.pending .digit-svg svg circle,
    :host([theme="cyberpunk"]) .temp-value.pending .degree-symbol svg circle {
      fill: #ffaa88 !important;
    }

    :host([theme="cyberpunk"]) .digit-dot {
      color: #ff6633 !important;
    }

    :host([theme="cyberpunk"]) .temp-value.pending .digit-dot {
      color: #ffaa88 !important;
    }

    :host([theme="cyberpunk"]) .current-temp .digit-svg-current svg path,
    :host([theme="cyberpunk"]) .current-temp .degree-symbol svg path,
    :host([theme="cyberpunk"]) .current-temp .digit-svg-current svg circle,
    :host([theme="cyberpunk"]) .current-temp .degree-symbol svg circle {
      fill: #ff6633 !important;
    }

    :host([theme="cyberpunk"]) .current-temp .degree-symbol {
        color: #ff6633 !important;
        font-size: 14px !important;
        width: 8px !important;
        height: 20px !important;
        display: flex;
        position: relative;
        left: 3px !important;
        transform: scale(0.8);
        bottom: 3px;
    }
    :host([theme="cyberpunk"]) .mode-btn.active ha-icon[icon="mdi:fire"] {
        --icon-color: #ffffff;
        color: #ffffff;
    }
    :host([theme="cyberpunk"]) .temp-value .degree-symbol {
        color: #ff6633 !important;
        font-size: 14px !important;
        width: 8px !important;
        height: 20px !important;
        display: flex;
        position: relative;
        top: 8px;
    }

    :host([theme="cyberpunk"]) .degree-symbol.pending {
      color: #ffaa88 !important;
    }

    /* Controlli espansi - tema cyberpunk rosso */
    :host([theme="cyberpunk"]) .expandable-content {
      background:
        linear-gradient(135deg, rgba(34, 11, 11, 0.95), rgba(51, 17, 17, 0.9)),
        repeating-linear-gradient(90deg, transparent 0px, transparent 2px, rgba(255, 51, 0, 0.03) 2px, rgba(255, 51, 0, 0.03) 4px);
      border-top: 2px solid #ff3300;
      border-radius: 0;
      padding: 12px;
      margin: 4px 6px 6px 6px;
      box-shadow:
        0 0 20px rgba(255, 51, 0, 0.2),
        inset 0 1px 1px rgba(255, 102, 51, 0.1);
      position: relative;
      min-height: auto;
    }

    :host([theme="cyberpunk"]) .expandable-content:before {
      content: 'ADVANCED CONTROLS';
      position: absolute;
      top: 2px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 8px;
      color: #ff6633;
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
    }

    :host([theme="cyberpunk"]) .modes {
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 16px;
      padding-top: 12px;
    }

    :host([theme="cyberpunk"]) .mode-btn {
      width: 46px !important;
      height: 46px !important;
      border-radius: 0 !important;
      border: 2px solid #ff3300 !important;
      background:
        linear-gradient(135deg, #331111, #221111),
        linear-gradient(45deg, rgba(255, 51, 0, 0.1), transparent) !important;
      color: #ff6633 !important;
      transition: all 0.3s ease !important;
      box-shadow: 0 0 12px rgba(255, 51, 0, 0.3) !important;
      position: relative;
    }

    :host([theme="cyberpunk"]) .mode-btn:after {
      content: attr(data-mode);
      position: absolute;
      bottom: -12px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 7px;
      color: #ff3300;
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
    }

    :host([theme="cyberpunk"]) .mode-btn:hover {
      background: linear-gradient(135deg, #ff3300, #cc2200) !important;
      border-color: #ff6633 !important;
      color: #ffffff !important;
      box-shadow: 0 0 20px rgba(255, 102, 51, 0.6) !important;
      transform: scale(1.05);
    }
    :host([theme="cyberpunk"]) .mode-btn.active {
        background: linear-gradient(135deg, #ff3300, #cc2200) !important;
        border-color: #ff6633 !important;
        color: #ffffff !important;
        box-shadow: 0 0 25px rgba(255, 51, 0, 0.8) !important;
        animation: modeActive 2s ease-in-out infinite;
    }

    @keyframes modeActive {
      0%, 100% {
        box-shadow:
          0 0 25px rgba(255, 51, 0, 0.8),
          inset 0 1px 2px rgba(255, 255, 255, 0.3);
      }
      50% {
        box-shadow:
          0 0 35px rgba(255, 102, 51, 1),
          inset 0 1px 2px rgba(255, 255, 255, 0.4);
      }
    }

    :host([theme="cyberpunk"]) .mode-btn ha-icon {
      --mdc-icon-size: 20px !important;
    }

    :host([theme="cyberpunk"]) .fan-section {
      margin-bottom: 16px;
      padding: 12px;
      background:
        linear-gradient(135deg, rgba(51, 17, 17, 0.6), rgba(34, 11, 11, 0.8)),
        linear-gradient(90deg, transparent 30%, rgba(255, 51, 0, 0.05) 50%, transparent 70%);
      border: 1px solid rgba(255, 51, 0, 0.4);
      border-radius: 4px;
      position: relative;
    }

    :host([theme="cyberpunk"]) .fan-section:before {
      content: 'FAN CONTROL';
      position: absolute;
      top: 2px;
      left: 4px;
      font-size: 8px;
      color: #ff6633;
      font-family: 'Courier New', monospace;
    }

    :host([theme="cyberpunk"]) .fan-label {
      color: #ff6633 !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      margin-bottom: 8px !important;
      font-family: 'Courier New', monospace !important;
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 8px;
    }

    :host([theme="cyberpunk"]) .fan-label ha-icon {
      --mdc-icon-size: 16px !important;
      color: #ff3300 !important;
    }

    :host([theme="cyberpunk"]) .fan-speeds {
      display: flex !important;
      gap: 8px !important;
      flex-wrap: wrap !important;
      justify-content: center;
    }

    :host([theme="cyberpunk"]) .fan-btn {
      padding: 8px 12px !important;
      border: 2px solid #ff3300 !important;
      border-radius: 0 !important;
      background:
        linear-gradient(135deg, #331111, #221111),
        linear-gradient(45deg, rgba(255, 51, 0, 0.1), transparent) !important;
      color: #ff6633 !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      transition: all 0.3s ease !important;
      box-shadow: 0 0 10px rgba(255, 51, 0, 0.3) !important;
      font-family: 'Courier New', monospace !important;
      text-transform: uppercase;
      position: relative;
    }

    :host([theme="cyberpunk"]) .fan-btn:hover {
      background: linear-gradient(135deg, #ff3300, #cc2200) !important;
      border-color: #ff6633 !important;
      color: #ffffff !important;
      box-shadow: 0 0 15px rgba(255, 102, 51, 0.6) !important;
      transform: scale(1.05);
    }

    :host([theme="cyberpunk"]) .fan-btn.active {
      background: linear-gradient(135deg, #ff3300, #cc2200) !important;
      border-color: #ff6633 !important;
      color: #ffffff !important;
      box-shadow:
        0 0 20px rgba(255, 51, 0, 0.8) !important,
        inset 0 1px 1px rgba(255, 255, 255, 0.3) !important;
    }

    :host([theme="cyberpunk"]) .fan-speed-indicator {
      color: #ff6633 !important;
      font-family: 'Courier New', monospace !important;
      font-weight: 700 !important;
    }

    /* CYBERPUNK HEADER ICONS */
    :host([theme="cyberpunk"]) .header {
      background:
        linear-gradient(135deg, rgba(51, 17, 17, 0.8), rgba(34, 11, 11, 0.9)),
        linear-gradient(90deg, transparent 30%, rgba(255, 51, 0, 0.05) 50%, transparent 70%);
      border-bottom: 1px solid #ff3300;
    }

    :host([theme="cyberpunk"]) .icon-btn {
      background: transparent !important;
      color: #ff3300 !important;
      transition: all 0.3s ease;
    }

    :host([theme="cyberpunk"]) .icon-btn:hover {
      background: transparent !important;
      color: #ff6633 !important;
      transform: scale(1.1);
    }

    :host([theme="cyberpunk"]) .icon-btn.active {
      background: transparent !important;
      color: #ff6633 !important;
    }

    :host([theme="cyberpunk"]) .icon-btn ha-icon {
      --mdc-icon-size: 22px !important;
      color: #ff3300 !important;
    }

    :host([theme="cyberpunk"]) .nav-btn {
      background: transparent !important;
      border: none !important;
      color: #ff3300 !important;
    }

    :host([theme="cyberpunk"]) .nav-btn:hover {
      background: transparent !important;
      color: #ff6633 !important;
    }

    :host([theme="cyberpunk"]) ha-icon-button {
      color: #ff3300 !important;
      background: transparent !important;
      border: none !important;
    }

    :host([theme="cyberpunk"]) .icon-config-btn {
      background: transparent !important;
      color: #ff3300 !important;
      border: none !important;
    }

    :host([theme="cyberpunk"]) .icon-config-btn:hover {
      color: #ff6633 !important;
      transform: scale(1.1);
    }

    :host([theme="cyberpunk"]) .close-button {
      background: transparent !important;
      color: #ff3300 !important;
      border: none !important;
    }

    :host([theme="cyberpunk"]) .close-button:hover {
      color: #ff6633 !important;
      transform: scale(1.1);
    }

    :host([theme="cyberpunk"]) .toggle-btn {
      background: transparent !important;
      color: #ff3300 !important;
      border: none !important;
    }

    :host([theme="cyberpunk"]) .toggle-btn:hover {
      color: #ff6633 !important;
    }

    :host([theme="cyberpunk"]) .toggle-btn ha-icon {
      color: #ff3300 !important;
    }


    :host([theme="modern"]) .settings-content {
      background: linear-gradient(145deg, #0a0f14, #1a252f) !important;
      border: 1px solid rgba(0, 255, 136, 0.3) !important;
      border-radius: 16px !important;
      box-shadow:
        0 20px 40px rgba(0, 0, 0, 0.6),
        0 0 30px rgba(0, 255, 136, 0.1) !important;
    }

    :host([theme="modern"]) .settings-header {
      background: linear-gradient(145deg, #2c3e50, #1a252f) !important;
      border-bottom: 1px solid rgba(0, 255, 136, 0.3) !important;
      color: #138f55  !important;
    }

    :host([theme="modern"]) .settings-title {
        color: rgb(3 255 137 / 77%) !important;
        font-weight: 700 !important;
        text-shadow: rgba(0, 255, 136, 0.5) 0px 0px 10px !important;
    }

    :host([theme="modern"]) .settings-body {
      background: transparent !important;
    }

    :host([theme="modern"]) .settings-section {
      background: linear-gradient(145deg, rgba(0, 255, 136, 0.05), transparent) !important;
      border: 1px solid rgba(0, 255, 136, 0.1) !important;
      border-radius: 12px !important;
      margin-bottom: 16px !important;
    }

    :host([theme="modern"]) .settings-section-title {
      color: #138f55  !important;
      font-weight: 600 !important;
    }

    :host([theme="modern"]) .settings-section input,
    :host([theme="modern"]) .settings-section select,
          :host([theme="modern"]) .season-select-field select {
        border: 1px solid rgba(0, 255, 136, 0.3) !important;
        color: var(--primary-text-color) !important;
        border-radius: 8px !important;
        font-family: 'Segoe UI', system-ui, sans-serif !important;
        padding: 10px 2px !important;
        background: var(--card-background-color) !important;
      }
          :host([theme="modern"]) .season-temp-field label, :host([theme="modern"]) .message-edit-row label, :host([theme="modern"]) .automation-title, :host([theme="modern"]) .section-title, :host([theme="modern"]) .timer-field label, :host([theme="modern"]) .season-select-field label {
        color: white !important;
      }

    :host([theme="modern"]) .time-range label {
      background: none !important;
    }
          :host([theme="modern"]) .settings-section input:focus,
      :host([theme="modern"]) .settings-section select:focus,
      :host([theme="modern"]) .season-select-field select:focus {
        border-color: #138f55  !important;
        box-shadow: 0 0 10px rgba(0, 255, 136, 0.3) !important;
        color: var(--primary-text-color) !important;
        background: var(--card-background-color) !important;
      }

    :host([theme="modern"]) .close-button {
      background: linear-gradient(145deg, #7f8c8d, #95a5a6) !important;
      color: #ffffff !important;
      border: 1px solid rgba(0, 255, 136, 0.3) !important;
    }

    :host([theme="modern"]) .slider {
      background: linear-gradient(145deg, #2c3e50, #1a252f) !important;
    }

    :host([theme="modern"]) input:checked + .slider {
      background: linear-gradient(145deg, #27ae60, #2ecc71) !important;
    }

    :host([theme="cyberpunk"]) .settings-content {
      background:
        linear-gradient(135deg, rgba(51, 17, 17, 0.95), rgba(34, 11, 11, 0.98)),
        radial-gradient(circle at 30% 50%, rgba(255, 51, 0, 0.1), transparent 70%) !important;
      border: 2px solid #ff3300 !important;
      border-radius: 8px !important;
      box-shadow:
        0 0 40px rgba(255, 51, 0, 0.4),
        0 8px 32px rgba(0, 0, 0, 0.8),
        inset 0 1px 1px rgba(255, 102, 51, 0.3) !important;
    }

    :host([theme="cyberpunk"]) .settings-header {
      background:
        linear-gradient(135deg, rgba(51, 17, 17, 0.9), rgba(34, 11, 11, 0.95)),
        linear-gradient(90deg, transparent 30%, rgba(255, 51, 0, 0.05) 50%, transparent 70%) !important;
      border-bottom: 2px solid #ff3300 !important;
      color: #ff6633 !important;
      position: relative !important;
    }

    :host([theme="cyberpunk"]) .settings-header:before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg,
        transparent 0%,
        #ff6633 10%,
        #ff3300 50%,
        #ff6633 90%,
        transparent 100%);
      animation: topGlow 3s ease-in-out infinite;
    }

    :host([theme="cyberpunk"]) .settings-title {
      color: #ff6633 !important;
      font-family: 'Courier New', monospace !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
      text-shadow:
        0 0 8px rgba(255, 102, 51, 0.8),
        0 0 15px rgba(255, 51, 0, 0.6),
        0 2px 4px rgba(0, 0, 0, 0.8) !important;
    }

    :host([theme="cyberpunk"]) .settings-body {
      background: transparent !important;
    }

    :host([theme="cyberpunk"]) .settings-section {
      background:
        linear-gradient(135deg, rgba(51, 17, 17, 0.6), rgba(34, 11, 11, 0.8)),
        repeating-linear-gradient(45deg, transparent 0px, transparent 10px, rgba(255, 51, 0, 0.05) 10px, rgba(255, 51, 0, 0.05) 20px) !important;
      border: 1px solid rgba(255, 51, 0, 0.4) !important;
      border-radius: 4px !important;
      margin-bottom: 16px !important;
    }

    :host([theme="cyberpunk"]) .settings-section-title {
      color: #ff6633 !important;
      font-family: 'Courier New', monospace !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
    }

    :host([theme="cyberpunk"]) .settings-section input,
    :host([theme="cyberpunk"]) .settings-section select,
    :host([theme="cyberpunk"]) .season-select-field select {
      border: 2px solid #ff3300 !important;
      color: var(--primary-text-color) !important;
      background: var(--card-background-color) !important;
      border-radius: 4px !important;
      font-family: 'Courier New', monospace !important;
      box-shadow: 0 0 10px rgba(255, 51, 0, 0.3) !important;
      padding: 10px 2px !important;
    }
    :host([theme="cyberpunk"]) .automation-switch-row {
        background: transparent !important;
        border: none !important;
    }
    :host([theme="cyberpunk"]) .settings-section input:focus,
    :host([theme="cyberpunk"]) .settings-section select:focus,
    :host([theme="cyberpunk"]) .season-select-field select:focus {
      border-color: #ff6633 !important;
      color: var(--primary-text-color) !important;
      background: var(--card-background-color) !important;
      box-shadow: 0 0 20px rgba(255, 102, 51, 0.6) !important;
    }
    :host([theme="cyberpunk"]) .settings-section label {
        height: 28px !important;
        color: white;
    }
    :host([theme="cyberpunk"]) .message-edit-row label {
        color: white !important;
    }
    :host([theme="cyberpunk"]) .close-button {
      background:
        linear-gradient(135deg, #331111, #221111),
        radial-gradient(circle at center, rgba(255, 51, 0, 0.1), transparent) !important;
      border: 2px solid #ff3300 !important;
      color: #ff6633 !important;
      border-radius: 4px !important;
      box-shadow: 0 0 15px rgba(255, 51, 0, 0.3) !important;
    }

    :host([theme="cyberpunk"]) .close-button:hover {
      background:
        linear-gradient(135deg, #ff3300, #cc2200),
        radial-gradient(circle at center, rgba(255, 255, 255, 0.1), transparent) !important;
      border-color: #ff6633 !important;
      color: #ffffff !important;
      box-shadow: 0 0 25px rgba(255, 102, 51, 0.8) !important;
    }

    :host([theme="cyberpunk"]) .slider {
        background: linear-gradient(135deg, rgb(51, 17, 17), rgb(34, 17, 17)), radial-gradient(circle, rgba(255, 51, 0, 0.1), transparent) !important;
        border: 1px solid rgb(255, 51, 0) !important;
        width: 55px;
    }
    :host([theme="cyberpunk"]) input:checked + .slider {
      background:
        linear-gradient(135deg, #ff3300, #cc2200),
        radial-gradient(circle at center, rgba(255, 255, 255, 0.1), transparent) !important;
      border-color: #ff6633 !important;
      box-shadow: 0 0 15px rgba(255, 51, 0, 0.6) !important;
    }
    :host([theme="cyberpunk"]) .slider:before {
        background: rgb(255, 255, 255) !important;
        border: 1px solid rgb(255, 51, 0) !important;
        box-shadow: rgba(255, 51, 0, 0.3) 0px 0px 8px !important;
        height: 19px !important;
        width: 19px !important;
    }
    :host([theme="cyberpunk"]) input:checked + .slider:before {
      box-shadow: 0 0 12px rgba(255, 255, 255, 0.8) !important;
    }

    /* ========== TEMA MODERNO - CAMPI TESTO ========== */
    :host([theme="modern"]) .settings-section textarea,
    :host([theme="modern"]) .time-input,
    :host([theme="modern"]) .settings-section input[type="text"],
    :host([theme="modern"]) .settings-section input[type="number"],
    :host([theme="modern"]) .settings-section input[type="time"] {
        border: 1px solid rgba(0, 255, 136, 0.3) !important;
        color: var(--primary-text-color) !important;
        border-radius: 8px !important;
        font-family: 'Segoe UI', system-ui, sans-serif !important;
        background: var(--card-background-color) !important;
    }

    /* Regole per input MDC - Seguono il tema HA */
    :host .mdc-text-field .mdc-text-field__input,
    .mdc-text-field .mdc-text-field__input,
    .mdc-text-field__input {
        color: var(--primary-text-color) !important;
        -webkit-text-fill-color: var(--primary-text-color) !important;
    }
    
    /* Override variabile MDC per tema modern */
    :host([theme="modern"]) .mdc-text-field .mdc-text-field__input {
        color: white !important;
        -webkit-text-fill-color: white !important;
        --mdc-text-field-ink-color: white !important;
    }
    
    /* Override variabile MDC per tema cyberpunk */
    :host([theme="cyberpunk"]) .mdc-text-field .mdc-text-field__input {
        color: white !important;
        -webkit-text-fill-color: white !important;
        --mdc-text-field-ink-color: white !important;
    }
    
    /* Forza il colore bianco per i label nelle sezioni message-edit-row */
    :host([theme="modern"]) .message-edit-row > label {
        color: white !important;
    }
    
    :host([theme="cyberpunk"]) .message-edit-row > label {
        color: white !important;
    }
    
    /* Regole per tutti gli input - Seguono il tema HA */
    :host input,
    :host input[type="text"],
    :host input[type="number"],
    :host input[type="time"],
    :host textarea,
    :host select {
        color: var(--primary-text-color) !important;
        background: var(--card-background-color) !important;
        border-color: var(--divider-color) !important;
    }
    
    /* Variabili CSS per Material Design - Seguono il tema HA */
    :host {
        --mdc-text-field-ink-color: var(--primary-text-color) !important;
        --mdc-text-field-input-text-color: var(--primary-text-color) !important;
        --mdc-theme-text-primary-on-background: var(--primary-text-color) !important;
        --mdc-theme-on-surface: var(--primary-text-color) !important;
    }
    :host([theme="modern"]) .settings-section textarea:focus,
    :host([theme="modern"]) .time-input:focus,
    :host([theme="modern"]) .settings-section input[type="text"]:focus,
    :host([theme="modern"]) .settings-section input[type="number"]:focus,
    :host([theme="modern"]) .settings-section input[type="time"]:focus {
      border-color: #138f55  !important;
      box-shadow: 0 0 15px rgba(0, 255, 136, 0.4) !important;
      color: var(--primary-text-color) !important;
    }

    :host([theme="modern"]) .settings-section textarea:placeholder,
    :host([theme="modern"]) .settings-section input:placeholder {
      color: rgba(0, 255, 136, 0.6) !important;
    }

    :host([theme="modern"]) .time-range {
      background: linear-gradient(145deg, rgba(0, 255, 136, 0.05), transparent) !important;
      border: 1px solid rgba(0, 255, 136, 0.2) !important;
      border-radius: 12px !important;
    }

    :host([theme="modern"]) .time-range label {
      color: #138f55  !important;
      font-weight: 600 !important;
    }

    :host([theme="modern"]) .notification-toggle-group {
      background: linear-gradient(145deg, rgba(0, 255, 136, 0.05), transparent) !important;
      border: 1px solid rgba(0, 255, 136, 0.1) !important;
      border-radius: 12px !important;
    }

    :host([theme="modern"]) .notification-toggle-group span {
      color: #138f55  !important;
      font-weight: 600 !important;
    }

    /* ========== TEMA CYBERPUNK - CAMPI TESTO ========== */
    :host([theme="cyberpunk"]) .settings-section textarea,
    :host([theme="cyberpunk"]) .time-input,
    :host([theme="cyberpunk"]) .settings-section input[type="text"],
    :host([theme="cyberpunk"]) .settings-section input[type="number"],
    :host([theme="cyberpunk"]) .settings-section input[type="time"] {
      background:
        linear-gradient(135deg, #331111, #221111),
        radial-gradient(circle at center, rgba(255, 51, 0, 0.1), transparent) !important;
      border: 2px solid #ff3300 !important;
      color: #ff6633 !important;
      border-radius: 4px !important;
      font-family: 'Courier New', monospace !important;
      box-shadow: 0 0 10px rgba(255, 51, 0, 0.3) !important;
      text-shadow: 0 0 5px rgba(255, 102, 51, 0.5) !important;
    }

    :host([theme="cyberpunk"]) .settings-section textarea:focus,
    :host([theme="cyberpunk"]) .time-input:focus,
    :host([theme="cyberpunk"]) .settings-section input[type="text"]:focus,
    :host([theme="cyberpunk"]) .settings-section input[type="number"]:focus,
    :host([theme="cyberpunk"]) .settings-section input[type="time"]:focus {
      border-color: #ff6633 !important;
      color: #ffffff !important;
      background:
        linear-gradient(135deg, #ff3300, #cc2200),
        radial-gradient(circle at center, rgba(255, 255, 255, 0.1), transparent) !important;
      box-shadow: 0 0 25px rgba(255, 102, 51, 0.8) !important;
      text-shadow: 0 0 8px rgba(255, 255, 255, 0.8) !important;
    }

    :host([theme="cyberpunk"]) .settings-section textarea:placeholder,
    :host([theme="cyberpunk"]) .settings-section input:placeholder {
      color: rgba(255, 102, 51, 0.7) !important;
      font-family: 'Courier New', monospace !important;
    }

    :host([theme="cyberpunk"]) .time-range {
      background:
        linear-gradient(135deg, rgba(51, 17, 17, 0.6), rgba(34, 11, 11, 0.8)),
        repeating-linear-gradient(45deg, transparent 0px, transparent 10px, rgba(255, 51, 0, 0.05) 10px, rgba(255, 51, 0, 0.05) 20px) !important;
      border: 1px solid rgba(255, 51, 0, 0.4) !important;
      border-radius: 4px !important;
    }

    :host([theme="cyberpunk"]) .time-range label {
      color: #ff6633 !important;
      font-family: 'Courier New', monospace !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
    }

    :host([theme="cyberpunk"]) .notification-toggle-group {
      background:
        linear-gradient(135deg, rgba(51, 17, 17, 0.6), rgba(34, 11, 11, 0.8)),
        repeating-linear-gradient(45deg, transparent 0px, transparent 10px, rgba(255, 51, 0, 0.05) 10px, rgba(255, 51, 0, 0.05) 20px) !important;
      border: 1px solid rgba(255, 51, 0, 0.4) !important;
      border-radius: 4px !important;
    }

    :host([theme="cyberpunk"]) .notification-toggle-group span {
      color: #ff6633 !important;
      font-family: 'Courier New', monospace !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
    }

    :host([theme="cyberpunk"]) .notification-toggles-row {
      background:
        linear-gradient(135deg, rgba(51, 17, 17, 0.4), rgba(34, 11, 11, 0.6)),
        linear-gradient(90deg, transparent 30%, rgba(255, 51, 0, 0.03) 50%, transparent 70%) !important;
      border: 1px solid rgba(255, 51, 0, 0.3) !important;
      border-radius: 4px !important;
    }

    /* ========== STILI TIMER SECTION ========== */
    .timer-section {
      margin: 16px 0 20px 0;
      padding: 0;
    }

    .timer-header-main {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-weight: 600;
      font-size: 14px;
      color: var(--primary-text-color);
    }

    .timer-control {
      background: var(--card-background-color, var(--primary-background-color));
      border: 1px solid var(--divider-color, var(--secondary-background-color));
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      transition: all 0.3s ease;
      color: var(--primary-text-color);
    }

    .timer-control.active {
      border-color: var(--primary-color);
      background: var(--primary-color-rgb, 26, 115, 232);
      background: rgba(var(--primary-color-rgb, 26, 115, 232), 0.05);
      box-shadow: 0 2px 8px rgba(var(--primary-color-rgb, 26, 115, 232), 0.15);
    }

    .timer-control.notification {
      border-color: #FF9800;
      background: rgba(255, 152, 0, 0.05);
    }

    .timer-control.notification.active {
      border-color: #FF9800;
      background: rgba(255, 152, 0, 0.1);
      box-shadow: 0 2px 8px rgba(255, 152, 0, 0.15);
    }

    .timer-status {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .timer-display {
      margin-top: 12px;
      padding: 8px 12px;
      background: rgba(255, 152, 0, 0.05);
      border-radius: 8px;
      border: 1px solid rgba(255, 152, 0, 0.2);
    }

    .elapsed-time {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .time-label {
      font-size: 12px;
      color: var(--secondary-text-color);
    }

    .time-value {
      font-size: 16px;
      font-weight: 600;
      color: var(--primary-text-color);
      font-family: 'Courier New', monospace;
    }

    .notification-sent, .notification-pending {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    .timer-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .timer-info {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .timer-name {
      font-weight: 500;
      font-size: 14px;
      color: var(--primary-text-color);
    }

    .timer-time {
      font-size: 12px;
      color: var(--secondary-text-color);
      background: var(--divider-color);
      padding: 2px 8px;
      border-radius: 12px;
    }

    .timer-action-btn {
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .timer-action-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .timer-action-btn.stop {
      background: #f44336;
      animation: pulse-red 2s infinite;
    }

    .timer-inputs {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .timer-inputs label {
      font-size: 12px;
      color: var(--secondary-text-color);
      min-width: 45px;
    }

    .timer-inputs input {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 14px;
      width: 80px;
      color: var(--primary-text-color);
    }

    .timer-inputs input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
    }

    /* ========== AUTO TIMER INTEGRATO ========== */
    .auto-timer-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin: 8px 0 0 0;
      padding: 8px 12px;
      background: rgba(156, 39, 176, 0.1);
      border-radius: 12px;
      border: 1px solid rgba(156, 39, 176, 0.2);
    }

    .auto-timer-label {
      display: flex;
      align-items: center;
      font-size: 11px;
      color: #9C27B0;
      font-weight: 500;
      margin: 0;
      flex: 1;
    }

    .switch.mini {
      width: 32px;
      height: 18px;
    }

    .switch.mini input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .switch.mini .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--divider-color);
      transition: 0.3s;
      border-radius: 18px;
      width: 32px;
      height: 18px;
    }

    .switch.mini .slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    .switch.mini input:checked + .slider {
      background-color: #9C27B0;
    }

    .switch.mini input:checked + .slider:before {
      transform: translateX(14px);
    }

    /* ========== TIMER OFF SETTINGS EXPANDABLE ========== */
    .timer-off-settings-expandable {
      margin-top: 8px;
      border-radius: 8px;
      border: 1px solid rgba(156, 39, 176, 0.2);
      background: rgba(156, 39, 176, 0.05);
      overflow: hidden;
    }

    .timer-off-settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .timer-off-settings-header:hover {
      background: rgba(156, 39, 176, 0.1);
    }

    .timer-off-settings-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #9C27B0;
      font-weight: 500;
    }

    .settings-icon, .setting-icon {
      --mdc-icon-size: 16px;
      color: #9C27B0;
    }

    .expand-icon {
      --mdc-icon-size: 18px;
      color: #9C27B0;
      transition: transform 0.3s ease;
    }

    .expand-icon.expanded {
      transform: rotate(180deg);
    }

    .timer-off-settings-content {
      overflow: hidden;
      opacity: 0;
      transform: scaleY(0);
      transform-origin: top;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: transform, opacity;
      height: 0;
    }

    .timer-off-settings-content.expanded {
      opacity: 1;
      transform: scaleY(1);
      height: auto;
    }

    .timer-setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-top: 1px solid rgba(156, 39, 176, 0.1);
    }

    .timer-setting-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      color: #9C27B0;
      font-weight: 500;
      min-width: 90px;
    }

    .timer-setting-select {
      padding: 4px 6px;
      border: 1px solid rgba(156, 39, 176, 0.3);
      border-radius: 4px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font-size: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      min-width: 80px;
      appearance: none;
      background-image: url("data:image/svg+xml;charset=utf-8,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239C27B0' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
      background-position: right 6px center;
      background-repeat: no-repeat;
      background-size: 12px;
      padding-right: 24px;
    }

    .timer-setting-select:focus {
      outline: none;
      border-color: #9C27B0;
      box-shadow: 0 0 0 1px rgba(156, 39, 176, 0.2);
    }

    .timer-setting-select:hover {
      border-color: rgba(156, 39, 176, 0.5);
    }

    .timer-setting-select option {
      padding: 4px 8px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font-size: 10px;
    }

    /* ========== PROGRESS BAR STILE TIMER BAR CARD ========== */
    .timer-progress {
      margin-top: 12px;
      animation: slideDown 0.3s ease-out;
    }

    .progress-bar {
      background: var(--divider-color, #e1e5e9);
      border-radius: 8px;
      height: 12px;
      overflow: hidden;
      position: relative;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    }

    .progress-fill {
      height: 100%;
      border-radius: 8px;
      position: relative;
      transition: width 1s ease;
      overflow: hidden;
    }

    .progress-fill.green {
      background: linear-gradient(90deg, #66bb6a, #4caf50);
      box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
    }

    .progress-fill.orange-red {
      background: linear-gradient(90deg, #ff9800, #f44336);
      box-shadow: 0 0 10px rgba(255, 152, 0, 0.3);
    }

    .progress-shimmer {
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, 
        transparent, 
        rgba(255, 255, 255, 0.4), 
        transparent
      );
      animation: shimmer 2s infinite;
    }

    .progress-text {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      font-size: 11px;
      color: var(--secondary-text-color);
    }

    /* ========== ANIMAZIONI ========== */
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
        max-height: 0;
      }
      to {
        opacity: 1;
        transform: translateY(0);
        max-height: 60px;
      }
    }

    @keyframes shimmer {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    @keyframes pulse-red {
      0%, 100% { 
        background: #f44336;
      }
      50% { 
        background: #d32f2f;
      }
    }

    /* ========== ADATTAMENTO AUTOMATICO AI TEMI ========== */
    
    .timer-control.active {
      background: color-mix(in srgb, var(--primary-color) 8%, var(--card-background-color));
      border-color: var(--primary-color);
      box-shadow: 0 2px 8px color-mix(in srgb, var(--primary-color) 15%, transparent);
    }

    .timer-inputs input {
      background: var(--card-background-color, var(--primary-background-color));
      border: 1px solid var(--divider-color);
      color: var(--primary-text-color);
      --mdc-text-field-ink-color: var(--primary-text-color);
      --mdc-text-field-label-ink-color: var(--secondary-text-color);
      --mdc-text-field-fill-color: var(--card-background-color);
    }

    .timer-inputs input:placeholder {
      color: var(--secondary-text-color);
    }

    .timer-time {
      background: var(--divider-color, var(--secondary-background-color));
      color: var(--secondary-text-color);
    }

    .progress-bar {
      background: var(--divider-color, var(--secondary-background-color));
    }

    .progress-text {
      color: var(--secondary-text-color);
    }

    /* ========== STILI TIMER PER TEMI SPECIFICI ========== */

    /* ========== TEMA MODERN ========== */
    :host([theme="modern"]) .timer-off-settings-expandable {
      background: rgba(156, 39, 176, 0.08);
      border: 1px solid rgba(156, 39, 176, 0.25);
      box-shadow: 0 2px 4px rgba(156, 39, 176, 0.1);
      border-radius: 12px;
    }

    :host([theme="modern"]) .timer-off-settings-header:hover {
      background: rgba(156, 39, 176, 0.15);
    }

    :host([theme="modern"]) .timer-setting-select {
      border: 1px solid rgba(156, 39, 176, 0.4);
      background: linear-gradient(145deg, var(--card-background-color), rgba(156, 39, 176, 0.05)) !important;
      box-shadow: 0 2px 4px rgba(156, 39, 176, 0.1);
    }

    :host([theme="modern"]) .timer-setting-select:focus {
      box-shadow: 0 0 0 2px rgba(156, 39, 176, 0.3), 0 2px 8px rgba(156, 39, 176, 0.2);
    }

    :host([theme="modern"]) .timer-setting-select:hover {
      transform: translateY(-1px);
      box-shadow: 0 3px 6px rgba(156, 39, 176, 0.15);
    }

    :host([theme="compact"]) .timer-off-settings-expandable {
      margin-top: 6px;
      border-radius: 6px;
    }

    :host([theme="compact"]) .timer-off-settings-header {
      padding: 6px 10px;
    }

    :host([theme="compact"]) .timer-setting-row {
      padding: 6px 10px;
    }

    :host([theme="compact"]) .timer-setting-label {
      font-size: 9px;
      min-width: 100px;
    }

    :host([theme="compact"]) .timer-setting-select {
      font-size: 9px;
      padding: 3px 5px;
      padding-right: 20px;
      min-width: 80px;
      border-radius: 3px;
      background-size: 10px;
      background-position: right 4px center;
    }

    :host([theme="compact"]) .timer-setting-select option {
      padding: 2px 4px;
      font-size: 9px;
    }

    :host([theme="cyberpunk"]) .timer-off-settings-expandable {
      background: rgba(156, 39, 176, 0.1);
      border: 1px solid #9C27B0;
      box-shadow: 0 0 8px rgba(156, 39, 176, 0.3);
    }

    :host([theme="cyberpunk"]) .timer-off-settings-header:hover {
      background: rgba(156, 39, 176, 0.2);
      box-shadow: inset 0 0 10px rgba(156, 39, 176, 0.4);
    }

    :host([theme="cyberpunk"]) .timer-setting-row {
      border-top: 1px solid rgba(156, 39, 176, 0.3);
    }

    :host([theme="cyberpunk"]) .timer-setting-select {
      border: 1px solid #9C27B0;
      background: rgba(0, 0, 0, 0.3) !important;
    }

    :host([theme="cyberpunk"]) .timer-setting-select:focus {
      box-shadow: 0 0 0 1px #9C27B0, 0 0 5px rgba(156, 39, 176, 0.5);
    }

    :host([theme="cyberpunk"]) .timer-setting-select:hover {
      background: rgba(156, 39, 176, 0.1);
      box-shadow: 0 0 8px rgba(156, 39, 176, 0.4);
    }

    :host([theme="cyberpunk"]) .timer-setting-select option {
      background: rgba(0, 0, 0, 0.8);
      color: #9C27B0;
      border-bottom: 1px solid rgba(156, 39, 176, 0.2);
    }

    :host([theme="cyberpunk"]) .timer-setting-select option:hover {
      background: rgba(156, 39, 176, 0.2);
    }

    :host([theme="modern"]) .timer-section {
      margin-bottom: 16px;
      padding: 12px;
      background: linear-gradient(145deg, #dbdbd9, #bebcb6);
      border-radius: 24px;
      border: 1px solid rgba(0, 0, 0, 0.2);
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1),
          inset 0 -1px 2px rgba(255, 255, 255, 0.2);
    }

    :host([theme="modern"]) .timer-control {
        background: transparent !important;
        border-radius: 24px !important;
        padding: 20px 25px !important;
        margin-bottom: 16px;
        position: relative !important;
        overflow: visible !important;
        box-shadow: inset 0 8px 32px rgba(0, 0, 0, 0.3) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: none;
    }

    :host([theme="modern"]) .timer-control:before {
      content: '' !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: 2px !important;
      opacity: 0.6 !important;
      border-radius: 24px 24px 0 0 !important;
    }

    :host([theme="modern"]) .timer-control:after {
      content: '' !important;
      position: absolute !important;
      inset: 8px !important;
      border-radius: 16px !important;
      pointer-events: none !important;
    }

    :host([theme="modern"]) .timer-control.active {
      background: linear-gradient(145deg, #e8e8e6, #d0cec8) !important;
      border-color: #138f55  !important;
      box-shadow: 0 12px 40px rgba(0, 255, 136, 0.3) !important;
      transform: translateY(-2px);
    }

    :host([theme="modern"]) .timer-control.active:before {
      opacity: 1 !important;
      animation: modern-glow 2s ease-in-out infinite alternate;
    }

    :host([theme="modern"]) .timer-name {
        color: #333 !important;
        font-family: 'Courier New', monospace !important;
        font-weight: bold !important;
        /* text-shadow: 0 0 6px #138f55  !important; */
        letter-spacing: 0.5px !important;
        text-transform: uppercase !important;
        font-size: 12px;
    }

    :host([theme="modern"]) .timer-time {
        background: linear-gradient(145deg, #0a0f14, #1a252f) !important;
        color: #138f55  !important;
        border: 1px solid rgba(0, 255, 136, 0.4) !important;
        border-radius: 16px !important;
        padding: 4px 12px;
        font-family: 'Courier New', monospace !important;
        font-weight: bold !important;
        text-shadow: 0 0 6px #138f55  !important;
        letter-spacing: 0.5px !important;
        position: relative !important;
        overflow: hidden !important;
        margin-right: 10px;
    }

    :host([theme="modern"]) .timer-time:before {
      content: '' !important;
      position: absolute !important;
      inset: 1px !important;
      background: linear-gradient(145deg, rgba(0, 255, 136, 0.05), transparent) !important;
      border-radius: 15px !important;
      pointer-events: none !important;
    }

    :host([theme="modern"]) .timer-inputs input {
        padding: 6px 7px;
        transition: 0.3s;
        background: linear-gradient(145deg, rgb(10, 15, 20), rgb(26, 37, 47)) !important;
        border: 1px solid rgba(0, 255, 136, 0.2) !important;
        border-radius: 14px !important;
        color: rgb(19, 143, 85) !important;
        font-family: "Courier New", monospace !important;
        font-weight: 600 !important;
        text-shadow: rgb(19, 143, 85) 0px 0px 8px !important;
        letter-spacing: 2px !important;
        width: 45px !important;
        text-align: center !important;
    }

    :host([theme="modern"]) .timer-inputs input:focus {
      border-color: #138f55  !important;
      box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.3), 0 0 12px rgba(0, 255, 136, 0.2) !important;
      outline: none;
      text-shadow: 0 0 12px #138f55  !important;
    }

    :host([theme="modern"]) .timer-inputs label {
      color: #95a5a6 !important;
      font-family: 'Courier New', monospace !important;
      font-weight: bold !important;
      letter-spacing: 0.5px !important;
    }

    :host([theme="modern"]) .timer-action-btn {
        transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        background: linear-gradient(145deg, rgb(44, 62, 80), rgb(26, 37, 47)) !important;
        border: 2px solid rgb(52, 73, 94) !important;
        border-radius: 50% !important;
        max-width: 40px !important;
        height: 40px !important;
        color: rgb(149, 165, 166) !important;
        box-shadow: rgba(0, 0, 0, 0.3) 0px 4px 8px, rgba(255, 255, 255, 0.1) 0px 2px 4px inset, rgba(0, 0, 0, 0.2) 0px -2px 4px inset !important;
        position: relative !important;
        min-width: 40px;
        max-height: 40px;
        min-height: 40px;
    }

    :host([theme="modern"]) .timer-action-btn:before {
      content: '' !important;
      position: absolute !important;
      inset: 3px !important;
      border-radius: 50% !important;
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), transparent) !important;
      pointer-events: none !important;
    }

    :host([theme="modern"]) .timer-action-btn:hover {
      transform: scale(1.1) translateY(-2px);
      border-color: #138f55  !important;
      color: #138f55  !important;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4),
          0 0 20px rgba(0, 255, 136, 0.3),
          inset 0 2px 4px rgba(255, 255, 255, 0.1) !important;
    }

    :host([theme="modern"]) .timer-action-btn.stop {
      border-color: #e74c3c !important;
      color: #e74c3c !important;
      animation: modern-pulse-stop 1.5s ease-in-out infinite alternate;
    }

    :host([theme="modern"]) .progress-bar {
      background: linear-gradient(145deg, #0a0f14, #1a252f) !important;
      border: 1px solid rgba(0, 255, 136, 0.2) !important;
      border-radius: 12px;
      height: 12px;
      position: relative !important;
      overflow: hidden !important;
    }

    :host([theme="modern"]) .progress-bar:before {
      content: '' !important;
      position: absolute !important;
      inset: 1px !important;
      background: linear-gradient(145deg, rgba(0, 255, 136, 0.05), transparent) !important;
      border-radius: 11px !important;
      pointer-events: none !important;
    }

    :host([theme="modern"]) .progress-fill.green {
      background: linear-gradient(90deg, #138f55 , #40ff80) !important;
      box-shadow: 0 0 15px rgba(0, 255, 136, 0.6) !important;
      position: relative !important;
    }

    :host([theme="modern"]) .progress-fill.orange-red {
      background: linear-gradient(90deg, #ff6b35, #e74c3c) !important;
      box-shadow: 0 0 15px rgba(255, 107, 53, 0.6) !important;
      position: relative !important;
    }

    :host([theme="modern"]) .progress-text {
      color: #138f55  !important;
      font-family: 'Courier New', monospace !important;
      font-weight: bold !important;
      text-shadow: 0 0 6px #138f55  !important;
      letter-spacing: 0.5px !important;
    }

    /* ========== AUTO TIMER MODERN ========== */
    :host([theme="modern"]) .auto-timer-toggle {
      background: linear-gradient(145deg, #2c3e50, #1a252f) !important;
      border: 2px solid #34495e !important;
      border-radius: 16px !important;
      padding: 10px 15px !important;
      margin: 12px 0 0 0 !important;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3),
            inset 0 2px 4px rgba(255, 255, 255, 0.1),
            inset 0 -2px 4px rgba(0, 0, 0, 0.2) !important;
      position: relative !important;
      overflow: hidden !important;
      justify-content: space-between !important;
      display: flex !important;
      align-items: center !important;
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }

    /* ========== RESPONSIVE MOBILE MODERN ========== */
    @media (max-width: 480px) {
      :host([theme="modern"]) .auto-timer-toggle {
        padding: 8px 10px !important;
        border-radius: 12px !important;
        margin: 8px 0 0 0 !important;
        flex-wrap: nowrap !important;
        min-width: 0 !important;
        gap: 6px !important;
      }
      
      :host([theme="modern"]) .auto-timer-label {
        font-size: 9px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        flex: 1 !important;
        min-width: 0 !important;
        margin-right: 6px !important;
        letter-spacing: 0.2px !important;
      }
      
      :host([theme="modern"]) .switch.mini {
        flex-shrink: 0 !important;
        width: 28px !important;
        height: 16px !important;
      }
      
      :host([theme="modern"]) .switch.mini .slider {
        width: 28px !important;  
        height: 16px !important;
        border-radius: 16px !important;
      }
      
      :host([theme="modern"]) .switch.mini .slider:before {
        height: 12px !important;
        width: 12px !important;
        left: 2px !important;
        bottom: 2px !important;
        border-radius: 50% !important;
      }
      
      :host([theme="modern"]) .switch.mini input:checked + .slider:before {
        transform: translateX(12px) !important;
      }
    }
    
    /* ========== RESPONSIVE VERY SMALL MOBILE ========== */
    @media (max-width: 360px) {
      :host([theme="modern"]) .auto-timer-toggle {
        padding: 6px 8px !important;
        gap: 4px !important;
      }
      :host([theme="cyberpunk"]) .switch.mini .slider {
          width: 50px !important;
      }      
      :host([theme="modern"]) .auto-timer-label {
        font-size: 8px !important;
        margin-right: 4px !important;
        letter-spacing: 0.1px !important;
      }
      
      :host([theme="modern"]) .switch.mini {
        width: 24px !important;
        height: 14px !important;
      }
      
      :host([theme="modern"]) .switch.mini .slider {
        width: 24px !important;  
        height: 14px !important;
      }
      
      :host([theme="modern"]) .switch.mini .slider:before {
        height: 10px !important;
        width: 10px !important;
      }
      
      :host([theme="modern"]) .switch.mini input:checked + .slider:before {
        transform: translateX(10px) !important;
      }
    }

    :host([theme="modern"]) .auto-timer-toggle:before {
      content: '' !important;
      position: absolute !important;
      inset: 2px !important;
      background: linear-gradient(145deg, rgba(0, 255, 136, 0.05), transparent) !important;
      border-radius: 14px !important;
      pointer-events: none !important;
    }

    :host([theme="modern"]) .auto-timer-label {
      color: #138f55 !important;
      font-family: 'Courier New', monospace !important;
      font-weight: bold !important;
      text-shadow: 0 0 6px #138f55 !important;
      letter-spacing: 0.5px !important;
      font-size: 10px !important;
      flex: 1 !important;
      min-width: 0 !important;
      margin-right: 8px !important;
    }

    :host([theme="modern"]) .switch.mini .slider {
      background: linear-gradient(145deg, #0a0f14, #1a252f) !important;
      border: 1px solid rgba(0, 255, 136, 0.2) !important;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
    }

    :host([theme="modern"]) .switch.mini .slider:before {
      background: linear-gradient(145deg, #95a5a6, #7f8c8d) !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4) !important;
    }

    :host([theme="modern"]) .switch.mini input:checked + .slider {
      background: linear-gradient(145deg, #138f55, #40ff80) !important;
      border-color: #138f55 !important;
      box-shadow: 0 0 15px rgba(0, 255, 136, 0.4),
            inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
    }

    :host([theme="modern"]) .switch.mini input:checked + .slider:before {
      background: linear-gradient(145deg, #ffffff, #ecf0f1) !important;
      box-shadow: 0 0 8px rgba(0, 255, 136, 0.6) !important;
    }

    /* ========== ANIMAZIONI MODERN ========== */
    @keyframes modern-glow {
      0% { 
        opacity: 0.6;
        box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
      }
      100% { 
        opacity: 1;
        box-shadow: 0 0 20px rgba(0, 255, 136, 0.6);
      }
    }

    @keyframes modern-pulse-stop {
      0% { 
        border-color: #e74c3c;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3),
            0 0 10px rgba(231, 76, 60, 0.3);
      }
      100% { 
        border-color: #ff6b35;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3),
            0 0 20px rgba(255, 107, 53, 0.6);
      }
    }

    /* ========== TEMA COMPACT ========== */
    :host([theme="compact"]) .timer-section {
      margin: 12px 0;
      padding: 0;
    }

    :host([theme="compact"]) .timer-control {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
      transition: all 0.2s ease;
    }

    :host([theme="compact"]) .timer-control.active {
      background: color-mix(in srgb, var(--primary-color) 5%, var(--card-background-color));
      border-color: var(--primary-color);
    }
    :host([theme="compact"]) .timer-top-row {
      margin-bottom: 8px;
    }

    :host([theme="compact"]) .timer-inputs {
      margin-bottom: 8px;
    }

    :host([theme="compact"]) .timer-inputs input {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      padding: 6px 8px;
      font-size: 12px;
      width: 60px;
    }
    :host([theme="compact"]) .timer-action-btn {
        width: 22px;
        height: 22px;
        border-radius: 50%;
    }

    :host([theme="compact"]) .timer-name {
      font-size: 12px;
    }

    :host([theme="compact"]) .timer-time {
        font-size: 9px;
        padding: 1px 1px;
        text-align: center;
        /* gap: 10px; */
        margin-right: 5px;
    }

    :host([theme="compact"]) .progress-bar {
      height: 6px;
      border-radius: 3px;
    }

    :host([theme="compact"]) .progress-text {
      font-size: 10px;
      margin-top: 4px;
    }

    /* ========== AUTO TIMER COMPACT ========== */
    :host([theme="compact"]) .auto-timer-toggle {
      background: var(--card-background-color) !important;
      border: 1px solid var(--divider-color) !important;
      border-radius: 6px !important;
      padding: 6px 8px !important;
      margin: 6px 0 0 0 !important;
      gap: 6px !important;
      justify-content: space-between !important;
    }

    :host([theme="compact"]) .auto-timer-label {
      font-size: 10px !important;
      color: var(--secondary-text-color) !important;
      font-weight: 500 !important;
      flex: 1 !important;
    }

    :host([theme="compact"]) .switch.mini {
      width: 24px !important;
      height: 14px !important;
    }

    :host([theme="compact"]) .switch.mini .slider {
      width: 24px !important;
      height: 14px !important;
      border-radius: 14px !important;
      background-color: var(--divider-color) !important;
    }

    :host([theme="compact"]) .switch.mini .slider:before {
      height: 10px !important;
      width: 10px !important;
      left: 2px !important;
      bottom: 2px !important;
      border-radius: 50% !important;
      background-color: white !important;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
    }

    :host([theme="compact"]) .switch.mini input:checked + .slider {
      background-color: var(--primary-color) !important;
    }

    :host([theme="compact"]) .switch.mini input:checked + .slider:before {
      transform: translateX(10px) !important;
    }

    /* ========== TEMA CYBERPUNK ========== */
    :host([theme="cyberpunk"]) .timer-section {
      margin: 20px 0;
      padding: 0;
    }

    :host([theme="cyberpunk"]) .timer-control {
      background: none;
      border: 2px solid #ff6633;
      border-radius: 0;
      padding: 20px;
      margin-bottom: 16px;
      position: relative;
      box-shadow: 
        0 0 20px rgba(255, 0, 64, 0.3),
        inset 0 0 20px rgba(255, 0, 64, 0.1);
      transition: all 0.3s ease;
    }

    :host([theme="cyberpunk"]) .timer-control:before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: none;
      z-index: -1;
      animation: cyberpunk-glow 2s ease-in-out infinite alternate;
    }
    :host([theme="cyberpunk"]) .switch.mini .slider:before {
        height: 13px !important;
        width: 13px !important ;
    }
    :host([theme="cyberpunk"]) .timer-control.active {
      background: linear-gradient(135deg, #1a0a0a 0%, #2a0a0a 100%);
      border-color: #00ff80;
      box-shadow: 
        0 0 30px rgba(0, 255, 128, 0.5),
        inset 0 0 30px rgba(0, 255, 128, 0.1);
    }

    :host([theme="cyberpunk"]) .timer-control.active:before {
      background: linear-gradient(45deg, #00ff80, #40ff80, #00ff80);
      animation: cyberpunk-glow-active 1.5s ease-in-out infinite alternate;
    }

    :host([theme="cyberpunk"]) .timer-header-main {
      color: #ff6633;
      text-transform: uppercase;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      text-shadow: 0 0 10px rgba(255, 0, 64, 0.8);
    }

    :host([theme="cyberpunk"]) .timer-name {
        color: #ff6633 !important;
        text-transform: uppercase;
        font-family: 'Courier New', monospace;
        font-weight: bold;
        /* text-shadow: 0 0 8px rgba(0, 255, 128, 0.6); */
    }

    :host([theme="cyberpunk"]) .timer-time {
        background: linear-gradient(135deg, #331111, #221111), linear-gradient(45deg, rgba(255, 51, 0, 0.1), transparent) !important;
        color: #ff6633 !important;
        border-radius: 0;
        padding: 4px 12px;
        font-family: 'Courier New', monospace;
        font-weight: bold;
        text-transform: uppercase;
        box-shadow: 0 0 10px rgba(255, 0, 64, 0.5);
        border: 2px solid #ff3300 !important;
    }

    :host([theme="cyberpunk"]) .timer-inputs input {
        background: #000 !important;
        border: 2px solid #ff6633;
        border-radius: 0;
        padding: 8px 12px;
        color: #00ff80 !important;
        font-family: 'Courier New', monospace;
        font-weight: bold;
        text-shadow: 0 0 5px rgba(0, 255, 128, 0.8);
        box-shadow: inset 0 0 10px rgba(255, 0, 64, 0.2);
    }

    :host([theme="cyberpunk"]) .timer-inputs input:focus {
      border-color: #00ff80;
      box-shadow: 
        0 0 0 2px rgba(0, 255, 128, 0.5),
        inset 0 0 15px rgba(0, 255, 128, 0.2);
      outline: none;
    }

    :host([theme="cyberpunk"]) .timer-inputs label {
      color: #ff6633;
      text-transform: uppercase;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      text-shadow: 0 0 5px rgba(255, 0, 64, 0.6);
    }

    :host([theme="cyberpunk"]) .timer-action-btn {
        background: linear-gradient(135deg, #331111, #221111), linear-gradient(45deg, rgba(255, 51, 0, 0.1), transparent) !important;
        border: 2px solid #ff6633 !important;
        border-radius: 0;
        width: 48px;
        height: 48px;
        /* box-shadow: 0 0 20px rgba(255, 0, 64, 0.6),
            inset 0 0 10px rgba(0, 255, 128, 0.2); */
        transition: all 0.3s ease;
        color: #ff6633 !important;
    }

    :host([theme="cyberpunk"]) .timer-action-btn:hover {
      background: linear-gradient(135deg, #00ff80 0%, #40ff80 100%);
      border-color: #ff6633;
      box-shadow: 
        0 0 25px rgba(0, 255, 128, 0.8),
        inset 0 0 15px rgba(255, 0, 64, 0.2);
      transform: scale(1.05);
    }

    :host([theme="cyberpunk"]) .timer-action-btn.stop {
      background: linear-gradient(135deg, #ff4040 0%, #ff8080 100%);
      animation: cyberpunk-pulse 1s ease-in-out infinite alternate;
    }

    :host([theme="cyberpunk"]) .progress-bar {
      background: #000;
      border: 1px solid #ff6633;
      border-radius: 0;
      height: 12px;
      box-shadow: inset 0 0 10px rgba(255, 0, 64, 0.3);
    }

    :host([theme="cyberpunk"]) .progress-fill.green {
      background: linear-gradient(90deg, #00ff80, #40ff80);
      box-shadow: 0 0 15px rgba(0, 255, 128, 0.6);
    }

    :host([theme="cyberpunk"]) .progress-fill.orange-red {
      background: linear-gradient(90deg, #ff6633, #ff4080);
      box-shadow: 0 0 15px rgba(255, 0, 64, 0.6);
    }

    :host([theme="cyberpunk"]) .progress-text {
      color: #00ff80;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      text-shadow: 0 0 5px rgba(0, 255, 128, 0.6);
      text-transform: uppercase;
    }

    /* ========== AUTO TIMER CYBERPUNK ========== */
    :host([theme="cyberpunk"]) .auto-timer-toggle {
      background: none !important;
      border: 2px solid #ff6633 !important;
      border-radius: 0 !important;
      padding: 10px 12px !important;
      margin: 10px 0 0 0 !important;
      box-shadow: 
        0 0 15px rgba(255, 0, 64, 0.4),
        inset 0 0 10px rgba(255, 0, 64, 0.1) !important;
      position: relative !important;
      justify-content: space-between !important;
    }

    :host([theme="cyberpunk"]) .auto-timer-toggle:before {
      content: '' !important;
      position: absolute !important;
      top: -2px !important;
      left: -2px !important;
      right: -2px !important;
      bottom: -2px !important;
      background: none !important;
      z-index: -1 !important;
      animation: cyberpunk-glow 2s ease-in-out infinite alternate !important;
    }

    :host([theme="cyberpunk"]) .auto-timer-label {
      color: #ff6633 !important;
      font-family: 'Courier New', monospace !important;
      font-weight: bold !important;
      text-shadow: 0 0 8px rgba(255, 0, 64, 0.8) !important;
      text-transform: uppercase !important;
      font-size: 10px !important;
      letter-spacing: 0.5px !important;
      flex: 1 !important;
    }

    :host([theme="cyberpunk"]) .switch.mini .slider {
        background: #000 !important;
        border: 1px solid #ff6633 !important;
        border-radius: 0 !important;
        box-shadow: inset 0 0 8px rgba(255, 0, 64, 0.3) !important;
        width: 35px !important;
        height: 20px;
    }
    :host([theme="cyberpunk"]) .switch.mini input:checked + .slider {
      background: #000 !important;
      border-color: #00ff80 !important;
      box-shadow: 
        0 0 15px rgba(0, 255, 128, 0.5),
        inset 0 0 10px rgba(0, 255, 128, 0.2) !important;
    }
    :host([theme="cyberpunk"]) .switch.mini .slider:before {
      background: linear-gradient(135deg, #ff6633, #ff4080) !important;
      border-radius: 0 !important;
      box-shadow: 0 0 8px rgba(255, 0, 64, 0.6) !important;
    }



    :host([theme="cyberpunk"]) .switch.mini input:checked + .slider:before {
        background: linear-gradient(135deg, rgb(0, 255, 128), rgb(64, 255, 128)) !important;
        box-shadow: rgba(0, 255, 128, 0.8) 0px 0px 12px !important;
        animation: 1.5s ease-in-out 0s infinite alternate none running cyberpunk-pulse !important;
        height: 13.5px !important;
        width: 14px !important;
    }

    /* Switch disabilitato tema cyberpunk */
    :host([theme="cyberpunk"]) .switch input:disabled + .slider {
      background: #333 !important;
      border-color: #666 !important;
      opacity: 0.5 !important;
      cursor: not-allowed !important;
      box-shadow: none !important;
    }

    :host([theme="cyberpunk"]) .switch input:disabled + .slider:before {
      background: #666 !important;
      box-shadow: none !important;
      animation: none !important;
    }

    /* ========== ANIMAZIONI CYBERPUNK ========== */
    @keyframes cyberpunk-glow {
      0% { opacity: 0.8; }
      100% { opacity: 1; }
    }

    @keyframes cyberpunk-glow-active {
      0% { opacity: 0.9; }
      100% { opacity: 1; }
    }

    @keyframes cyberpunk-pulse {
      0% { 
        box-shadow: 0 0 20px rgba(255, 64, 64, 0.6);
      }
      100% { 
        box-shadow: 0 0 30px rgba(255, 64, 64, 0.9);
      }
    }

    /* ========== FOCUS E HOVER MIGLIORATI ========== */
    .timer-inputs input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 20%, transparent);
      background: var(--card-background-color);
    }

    .timer-inputs input:hover {
      border-color: color-mix(in srgb, var(--primary-color) 50%, var(--divider-color));
    }

    .timer-action-btn:focus {
      outline: none;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 30%, transparent);
    }

    /* ========== ANIMAZIONI MIGLIORATE ========== */
    .timer-control {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .timer-inputs input {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .timer-action-btn {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* ========== RESPONSIVE ========== */
    @media (max-width: 480px) {
      .timer-top-row {
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;
      }
      :host([theme="cyberpunk"]) .switch.mini .slider {
          width: 50px !important;
      }
      .timer-action-btn {
        align-self: flex-end;
      }
    }

    /* ========== TIMER STATUS DISPLAY (POPUP NOTIFICHE) ========== */
    .timer-status-display {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 12px;
      margin-top: 8px;
    }

    .timer-status-row,
    .timer-elapsed-row,
    .timer-notification-row {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }

    .timer-status-row:last-child,
    .timer-elapsed-row:last-child,
    .timer-notification-row:last-child {
      margin-bottom: 0;
    }

    .timer-elapsed-row {
      justify-content: space-between;
    }

    .timer-notification-row {
      justify-content: flex-start;
    }

    /* ========== THEME SPECIFICI PER TIMER STATUS ========== */
    :host([theme="dark"]) .timer-status-display {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }

    :host([theme="light"]) .timer-status-display {
      background: rgba(0, 0, 0, 0.02);
      border-color: rgba(0, 0, 0, 0.1);
    }

    :host([theme="cyberpunk"]) .timer-status-display {
      background: rgba(255, 0, 255, 0.1);
      border-color: #ff00ff;
      box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);
    }

    /* ========== TEMA MODERN - TEXT FIELD INPUT E VARIABILI ========== */
    :host([theme="modern"]) {
      --mdc-text-field-ink-color: white !important;
      --mdc-text-field-input-text-color: white !important;
      --mdc-theme-text-primary-on-background: white !important;
      --mdc-theme-on-surface: white !important;
    }

    :host([theme="modern"]) .mdc-text-field .mdc-text-field__input {
      color: white !important;
      -webkit-text-fill-color: white !important;
    }

    :host([theme="modern"]) ha-textfield {
      --mdc-text-field-ink-color: white !important;
      --text-field-ink-color: white !important;
    }

    :host([theme="modern"]) ha-textfield input {
      color: white !important;
      -webkit-text-fill-color: white !important;
    }

    /* ========== CYBERPUNK - TEXT FIELD INPUT E VARIABILI ========== */
    :host([theme="cyberpunk"]) {
      --mdc-text-field-ink-color: white !important;
      --mdc-text-field-input-text-color: white !important;
      --mdc-theme-text-primary-on-background: white !important;
      --mdc-theme-on-surface: white !important;
    }

    :host([theme="cyberpunk"]) .mdc-text-field .mdc-text-field__input {
      color: white !important;
      -webkit-text-fill-color: white !important;
    }

    :host([theme="cyberpunk"]) ha-textfield {
      --mdc-text-field-ink-color: white !important;
      --text-field-ink-color: white !important;
    }

    :host([theme="cyberpunk"]) ha-textfield input {
      color: white !important;
      -webkit-text-fill-color: white !important;
    }

    /* ========== AUTOMATION TITLE - BIANCO FORZATO ========== */
    :host([theme="modern"]) .automation-title {
      color: white !important;
    }
    
    :host([theme="cyberpunk"]) .automation-title {
      color: white !important;
    }
    
    /* ========== LABEL MESSAGE-EDIT-ROW - BIANCO FORZATO ========== */
    :host([theme="modern"]) .message-edit-row label {
      color: white !important;
    }
    
    :host([theme="cyberpunk"]) .message-edit-row label {
      color: white !important;
    }
  `;
  // Aggiorno le fasce orarie notifiche push/alexa
  _updateStartTimePush = (e) => {
    const current = this.entities[this._currentIndex];
    const entityId = typeof current === 'string' ? current : current.entity;
    let value = e.target.value;
    if (value.length === 5) value += ':00'; // porta a HH:mm:ss
    this.hass.callService('climate_manager', 'set_notification_time_range', {
      entity_id: entityId,
      start_push: value
    });
    // Invalida la cache per evitare re-render continui
    this._invalidateSettingsCache(entityId);
    this.requestUpdate();
  }
  _updateEndTimePush = (e) => {
    const current = this.entities[this._currentIndex];
    const entityId = typeof current === 'string' ? current : current.entity;
    let value = e.target.value;
    if (value.length === 5) value += ':00';
    this.hass.callService('climate_manager', 'set_notification_time_range', {
      entity_id: entityId,
      end_push: value
    });
    // Invalida la cache per evitare re-render continui
    this._invalidateSettingsCache(entityId);
    this.requestUpdate();
  }
  _updateStartTime = (e) => {
    const current = this.entities[this._currentIndex];
    const entityId = typeof current === 'string' ? current : current.entity;
    let value = e.target.value;
    if (value.length === 5) value += ':00';
    this.hass.callService('climate_manager', 'set_notification_time_range', {
      entity_id: entityId,
      start_alexa: value
    });
    // Invalida la cache per evitare re-render continui
    this._invalidateSettingsCache(entityId);
    this.requestUpdate();
  }
  _updateEndTime = (e) => {
    const current = this.entities[this._currentIndex];
    const entityId = typeof current === 'string' ? current : current.entity;
    let value = e.target.value;
    if (value.length === 5) value += ':00';
    this.hass.callService('climate_manager', 'set_notification_time_range', {
      entity_id: entityId,
      end_alexa: value
    });
    // Invalida la cache per evitare re-render continui
    this._invalidateSettingsCache(entityId);
    this.requestUpdate();
  }

  // Aggiungi il metodo nella classe ClimateManagerCard:
  _updatePushTargets(e) {
    const current = this.entities[this._currentIndex];
    const entityId = typeof current === 'string' ? current : current.entity;
    let value = e.target.value;
    // Supporta sia lista che stringa
    let targets = value.includes(",") ? value.split(",").map(s => s.trim()).filter(Boolean) : value.trim();
    this.hass.callService('climate_manager', 'set_push_targets', { entity_id: entityId, targets });
    // Invalida la cache per evitare re-render continui
    this._invalidateSettingsCache(entityId);
  }

  _getHvacIcon(mode) {
    // Mappa modalità note a icone mdi
    switch (mode) {
      case 'cool': return 'mdi:snowflake';
      case 'heat': return 'mdi:fire';
      case 'fan_only': return 'mdi:fan';
      case 'dry': return 'mdi:water';
      case 'auto': return 'mdi:thermostat-auto';
      case 'heat_cool': return 'mdi:sun-snowflake-variant';
      case 'off': return 'mdi:power';
      default: return 'mdi:tune-variant'; // fallback
    }
  }
}
if (!customElements.get('climate-manager-card')) {
  customElements.define('climate-manager-card', ClimateManagerCard);
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'climate-manager-card',
  name: 'Climate Manager Card',
  description: 'A modern-looking card for controlling AC units',
  preview: true,
  version: CARD_VERSION
});
const DIGIT_SVG_COMPACT= {
  ".": `<svg viewBox="0 0 24 45" width="10" height="48"><circle cx="8" cy="40" r="2.2"/></svg>`,
  "0": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 650l50 50l150 -150v-300l-150 -150l-50 50v500zM0 1250l50 50l150 -150v-300l-150 -150l-50 50v500zM650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500z
  M150 0l-50 50l150 150h300l150 -150l-50 -50h-500z"/></svg>`,
  "1": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500z"/></svg>`,
  "2": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 650l50 50l150 -150v-300l-150 -150l-50 50v500zM650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM150 0l-50 50l150 150h300l150 -150l-50 -50h-500zM150 700l100 100h300l100 -100l-100 -100h-300z"/></svg>`,
  "3": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500zM150 0l-50 50l150 150h300l150 -150l-50 -50h-500zM150 700l100 100h300l100 -100l-100 -100h-300z"/></svg>`,
  "4": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 1250l50 50l150 -150v-300l-150 -150l-50 50v500zM800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500zM150 700l100 100h300l100 -100l-100 -100h-300z"/></svg>`,
  "5": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 1250l50 50l150 -150v-300l-150 -150l-50 50v500zM650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500zM150 0l-50 50l150 150h300l150 -150l-50 -50h-500zM150 700l100 100h300l100 -100l-100 -100h-300z"/></svg>`,
  "6": `<svg viewBox="0 -30 1200 2200" width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 650l50 50l150 -150v-300l-150 -150l-50 50v500zM0 1250l50 50l150 -150v-300l-150 -150l-50 50v500zM650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500zM150 0l-50 50l150 150h300l150 -150l-50 -50h-500z
    M150 700l100 100h300l100 -100l-100 -100h-300z"/></svg>`,
  "7": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 1250l50 50l150 -150v-300l-150 -150l-50 50v500zM650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500z"/></svg>`,
  "8": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 650l50 50l150 -150v-300l-150 -150l-50 50v500zM0 1250l50 50l150 -150v-300l-150 -150l-50 50v500zM650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500z
  M150 0l-50 50l150 150h300l150 -150l-50 -50h-500zM150 700l100 100h300l100 -100l-100 -100h-300z"/></svg>`,
  "9": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 1250l50 50l150 -150v-300l-150 -150l-50 50v500zM650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500zM150 0l-50 50l150 150h300l150 -150l-50 -50h-500z
  M150 700l100 100h300l100 -100l-100 -100h-300z"/></svg>`,
  "°": `<svg viewBox="0 -30 1200 2200"   width="12" height="12" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(-500,-1600)"><path d="M530 1169q0 81 -55.5 137t-136.5 56t-138 -56t-57 -137t57 -138.5t138 -57.5t136.5 57.5t55.5 138.5zM338 1456q118 0 202.5 -84.5t84.5 -204.5q0 -119 -84 -202.5t-205 -83.5t-204 83t-83 203t84.5 204.5t204.5 84.5z"/></svg>`
};
const DIGIT_SVG = {
  ".": `<svg viewBox="0 0 24 24" width="10" height="48"><circle cx="8" cy="40" r="2.2"/></svg>`,
  "0": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 650l50 50l150 -150v-300l-150 -150l-50 50v500zM0 1250l50 50l150 -150v-300l-150 -150l-50 50v500zM650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500z
  M150 0l-50 50l150 150h300l150 -150l-50 -50h-500z"/></svg>`,
  "1": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500z"/></svg>`,
  "2": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 650l50 50l150 -150v-300l-150 -150l-50 50v500zM650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM150 0l-50 50l150 150h300l150 -150l-50 -50h-500zM150 700l100 100h300l100 -100l-100 -100h-300z"/></svg>`,
  "3": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500zM150 0l-50 50l150 150h300l150 -150l-50 -50h-500zM150 700l100 100h300l100 -100l-100 -100h-300z"/></svg>`,
  "4": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 1250l50 50l150 -150v-300l-150 -150l-50 50v500zM800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500zM150 700l100 100h300l100 -100l-100 -100h-300z"/></svg>`,
  "5": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 1250l50 50l150 -150v-300l-150 -150l-50 50v500zM650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500zM150 0l-50 50l150 150h300l150 -150l-50 -50h-500zM150 700l100 100h300l100 -100l-100 -100h-300z"/></svg>`,
  "6": `<svg viewBox="0 -30 1200 2200" width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 650l50 50l150 -150v-300l-150 -150l-50 50v500zM0 1250l50 50l150 -150v-300l-150 -150l-50 50v500zM650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500zM150 0l-50 50l150 150h300l150 -150l-50 -50h-500z
    M150 700l100 100h300l100 -100l-100 -100h-300z"/></svg>`,
  "7": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 1250l50 50l150 -150v-300l-150 -150l-50 50v500zM650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500z"/></svg>`,
  "8": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 650l50 50l150 -150v-300l-150 -150l-50 50v500zM0 1250l50 50l150 -150v-300l-150 -150l-50 50v500zM650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500z
  M150 0l-50 50l150 150h300l150 -150l-50 -50h-500zM150 700l100 100h300l100 -100l-100 -100h-300z"/></svg>`,
  "9": `<svg viewBox="0 -30 1200 2200"   width="16" height="36" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(0,-2048)"><path d="M0 1250l50 50l150 -150v-300l-150 -150l-50 50v500zM650 1400l50 -50l-150 -150h-300l-150 150l50 50h500zM800 750l-50 -50l-150 150v300l150 150l50 -50v-500zM800 150l-50 -50l-150 150v300l150 150l50 -50v-500zM150 0l-50 50l150 150h300l150 -150l-50 -50h-500z
  M150 700l100 100h300l100 -100l-100 -100h-300z"/></svg>`,
  "°": `<svg viewBox="0 -30 1200 2200"   width="12" height="12" xmlns="http://www.w3.org/2000/svg"><g transform="scale(1,-1) translate(-500,-1600)"><path d="M530 1169q0 81 -55.5 137t-136.5 56t-138 -56t-57 -137t57 -138.5t138 -57.5t136.5 57.5t55.5 138.5zM338 1456q118 0 202.5 -84.5t84.5 -204.5q0 -119 -84 -202.5t-205 -83.5t-204 83t-83 203t84.5 204.5t204.5 84.5z"/></svg>`
};
