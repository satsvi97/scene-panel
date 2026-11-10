import {
    chat_metadata,
    setExtensionPrompt,
    extension_prompt_types,
    extension_prompt_roles,
    updateMessageBlock,
    eventSource,
    event_types,
} from '../../../../script.js';

import { getContext } from '../../../st-context.js';

import {
    extension_settings,
    renderExtensionTemplateAsync,
    saveMetadataDebounced,
} from '../../../extensions.js';

const MODULE = 'scene_panel';
const EXT_NAME = 'third-party/scene-panel';
const PROMPT_KEY = 'SCENE_PANEL';
const TAG_RE = /\[\[\s*scene\s*:\s*([\s\S]*?)\]\]/i;
const MIN_MONTH = 5;
const MAX_MONTH = 60;

const KEY_ALIASES = {
    'день': 'day', 'day': 'day',
    'дата': 'date', 'date': 'date',
    'место': 'place', 'place': 'place', 'где': 'place',
    'время': 'timeOfDay', 'time': 'timeOfDay', 'timeofday': 'timeOfDay',
    'погода': 'weather', 'weather': 'weather',
    'рядом': 'present', 'present': 'present', 'кто': 'present',
    'висит': 'open', 'open': 'open', 'нити': 'open', 'threads': 'open',
    'тон': 'mood', 'mood': 'mood',
};

// Значения, которые понимает Weather Background (setWeatherEffect).
const WEATHER_STATES = {
    'дождь': 'rain', 'ливень': 'rain', 'rain': 'rain', 'shower': 'rain',
    'гроза': 'thunderstorm', 'thunderstorm': 'thunderstorm', 'storm': 'thunderstorm',
    'снег': 'snow', 'snow': 'snow',
    'метель': 'blizzard', 'blizzard': 'blizzard',
    'облачно': 'cloudy', 'пасмурно': 'cloudy', 'cloudy': 'cloudy', 'overcast': 'cloudy',
    'солнечно': 'sunny', 'sunny': 'sunny',
    'град': 'hail', 'hail': 'hail',
    'ясно': 'clear', 'clear': 'clear',
    'нет': 'none', 'none': 'none',
};

// Ленивая загрузка рендерера Weather Background (чтобы не падать, если расширения нет).
let weatherRendererPromise = null;

// Встроенная разметка панели. Не зависит от внешнего panel.html и его кэша.
const PANEL_HTML = `<div class="scene-panel-settings" id="scene_panel_settings">
    <div class="scene-panel-hint">
        ИИ обновляет состояние тегом в конце сообщения:
        <code>[[scene: день=+1; место=Дворец Ночи; время=утро; рядом=Ризанд; висит=разговор с Фейрой]]</code>
        — тег из текста вырезается.
    </div>

    <div class="scene-cal" id="scene_panel_cal">
        <div class="scene-cal-head">
            <span class="scene-cal-btn scene-cal-prev" title="предыдущий месяц">‹</span>
            <span class="scene-cal-title">месяц 1</span>
            <span class="scene-cal-btn scene-cal-next" title="следующий месяц">›</span>
        </div>
        <div class="scene-cal-grid"></div>
        <div class="scene-cal-actions">
            <div class="menu_button" id="scene_panel_day_minus">− день</div>
            <div class="menu_button" id="scene_panel_day_plus">+ день</div>
        </div>
    </div>

    <div class="scene-panel-row">
        <label class="scene-panel-field">
            <span>Название месяца</span>
            <input type="text" id="scene_panel_month_label" placeholder="Сиреневый">
        </label>
        <label class="scene-panel-field scene-panel-narrow">
            <span>Дней в месяце</span>
            <input type="number" id="scene_panel_month_len" min="5" max="60" step="1" value="30">
        </label>
    </div>

    <label class="scene-panel-field">
        <span>📅 Дата словами</span>
        <input type="text" data-scene-field="date" placeholder="12-е, месяц Сиреневой Луны">
    </label>
    <label class="scene-panel-field">
        <span>📍 Место</span>
        <input type="text" data-scene-field="place" placeholder="Дворец Ночи, покои Ризанда">
    </label>
    <div class="scene-panel-row">
        <label class="scene-panel-field">
            <span>🕐 Время</span>
            <input type="text" data-scene-field="timeOfDay" placeholder="утро">
        </label>
        <label class="scene-panel-field">
            <span>🌦 Погода</span>
            <input type="text" data-scene-field="weather" placeholder="ясно, прохладно">
        </label>
    </div>
    <label class="scene-panel-field">
        <span>👥 Рядом (через запятую)</span>
        <input type="text" data-scene-field="present" placeholder="Ризанд, Никс">
    </label>
    <label class="scene-panel-field">
        <span>⚡ Висит (каждое с новой строки)</span>
        <textarea data-scene-field="open" rows="3" placeholder="Никс ждёт ответа&#10;Фейра назначила разговор"></textarea>
    </label>
    <label class="scene-panel-field">
        <span>🌫 Тон</span>
        <input type="text" data-scene-field="mood" placeholder="хрупкое перемирие">
    </label>

    <div class="scene-panel-field">
        <span>⏱ Сессия: <b id="scene_panel_elapsed_display">день 1, 00:00</b></span>
        <div class="scene-panel-actions">
            <div class="menu_button" id="scene_panel_session_minus_hour" title="минус час">− час</div>
            <div class="menu_button" id="scene_panel_session_plus_hour" title="плюс час">+ час</div>
            <div class="menu_button" id="scene_panel_session_minus_day" title="минус день">− день</div>
            <div class="menu_button" id="scene_panel_session_plus_day" title="плюс день">+ день</div>
        </div>
    </div>

    <div class="scene-panel-actions">
        <div class="menu_button" id="scene_panel_reset">сбросить</div>
    </div>
    <label class="checkbox_label scene-panel-check">
        <input type="checkbox" id="scene_panel_inject">
        <span>вставлять сцену в промпт</span>
    </label>
    <label class="scene-panel-field scene-panel-inline">
        <span>роль инжекта</span>
        <select id="scene_panel_role">
            <option value="system">system</option>
            <option value="user">user</option>
            <option value="assistant">assistant</option>
        </select>
    </label>
    <label class="checkbox_label scene-panel-check">
        <input type="checkbox" id="scene_panel_floating">
        <span>плавающая панель в чате</span>
    </label>
    <label class="checkbox_label scene-panel-check">
        <input type="checkbox" id="scene_panel_weather_integration">
        <span>🌦 фон погоды (Weather Background)</span>
    </label>

    <div class="scene-panel-credit">by ✦ Selena's Tavern ✦</div>
</div>`;

let saveSettings = () => {};

function emptyState() {
    return {
        day: 1,
        daysInMonth: 30,
        monthLabel: '',
        date: '',
        place: '',
        timeOfDay: '',
        weather: '',
        present: [],
        open: [],
        mood: '',
        sessionDay: 1,
        sessionHour: 0,
        sessionMinute: 0,
    };
}

function getSettings() {
    if (!extension_settings[MODULE] || typeof extension_settings[MODULE] !== 'object') {
        extension_settings[MODULE] = { enabled: true, inject: true, role: 'system', floating: true, floatPos: null, weatherIntegration: true };
    }
    const s = extension_settings[MODULE];
    if (typeof s.enabled !== 'boolean') s.enabled = true;
    if (typeof s.inject !== 'boolean') s.inject = true;
    if (typeof s.floating !== 'boolean') s.floating = true;
    if (typeof s.role !== 'string') s.role = 'system';
    if (typeof s.weatherIntegration !== 'boolean') s.weatherIntegration = true;
    return s;
}

function isEnabled() {
    return getSettings().enabled !== false;
}

function getState() {
    if (!chat_metadata[MODULE] || typeof chat_metadata[MODULE] !== 'object') {
        chat_metadata[MODULE] = emptyState();
    }
    const s = chat_metadata[MODULE];
    const day = Number(s.day);
    s.day = Number.isFinite(day) && day > 0 ? Math.round(day) : 1;
    const dim = Number(s.daysInMonth);
    s.daysInMonth = Number.isFinite(dim) && dim >= MIN_MONTH && dim <= MAX_MONTH ? Math.round(dim) : 30;
    if (typeof s.monthLabel !== 'string') s.monthLabel = '';
    for (const k of ['date', 'place', 'timeOfDay', 'weather', 'mood']) {
        if (typeof s[k] !== 'string') s[k] = '';
    }
    if (!Array.isArray(s.present)) s.present = [];
    if (!Array.isArray(s.open)) s.open = [];
    s.present = s.present.filter((x) => typeof x === 'string' && x.trim().length > 0);
    s.open = s.open.filter((x) => typeof x === 'string' && x.trim().length > 0);
    const sd = Number(s.sessionDay);
    s.sessionDay = Number.isFinite(sd) && sd > 0 ? Math.round(sd) : 1;
    const sh = Number(s.sessionHour);
    s.sessionHour = Number.isFinite(sh) && sh >= 0 && sh <= 23 ? Math.round(sh) : 0;
    const sm = Number(s.sessionMinute);
    s.sessionMinute = Number.isFinite(sm) && sm >= 0 && sm <= 59 ? Math.round(sm) : 0;
    return s;
}

function monthIndex(state) {
    return Math.floor((state.day - 1) / state.daysInMonth) + 1;
}

function dayOfMonth(state) {
    return ((state.day - 1) % state.daysInMonth) + 1;
}

function absoluteDay(state, month, dom) {
    return (month - 1) * state.daysInMonth + dom;
}

function monthTitle(state) {
    const idx = monthIndex(state);
    const label = state.monthLabel.trim();
    return label ? label + ' · ' + idx : 'месяц ' + idx;
}

// Часы:минуты с ведущими нулями
function pad2(n) {
    return String(n).padStart(2, '0');
}

// Счётчик времени сессии: день + часы:минуты
function elapsedTimeString(state) {
    return 'день ' + state.sessionDay + ', ' + pad2(state.sessionHour) + ':' + pad2(state.sessionMinute);
}

// Сдвиг часов сессии (с переносом через сутки, не ниже day 1 / 00:00)
function shiftSessionHour(delta) {
    const state = getState();
    let total = state.sessionDay * 1440 + state.sessionHour * 60 + state.sessionMinute + delta * 60;
    const minTotal = 1440; // day 1, 00:00
    if (total < minTotal) total = minTotal;
    state.sessionDay = Math.floor(total / 1440);
    const rest = total % 1440;
    state.sessionHour = Math.floor(rest / 60);
    state.sessionMinute = rest % 60;
    commit();
    syncPrompt();
    refresh();
}

// Сдвиг дней сессии (не ниже 1)
function shiftSessionDay(delta) {
    const state = getState();
    state.sessionDay = Math.max(1, state.sessionDay + delta);
    commit();
    syncPrompt();
    refresh();
}

function commit() {
    try {
        saveMetadataDebounced();
    } catch (e) {
        console.warn('[scene-panel] metadata save failed', e);
    }
    renderFloating();
}

function sceneText(state) {
    const parts = [];
    const dom = dayOfMonth(state);
    parts.push('Сцена: день ' + state.day + ' (месяц ' + monthIndex(state) + ', ' + dom + '-е)');
    if (state.monthLabel.trim()) parts.push('месяц: ' + state.monthLabel.trim());
    if (state.date) parts.push('дата: ' + state.date);
    if (state.place) parts.push('место: ' + state.place);
    const when = [state.timeOfDay, state.weather].filter(Boolean).join(', ');
    if (when) parts.push('обстановка: ' + when);
    if (state.present.length > 0) parts.push('рядом: ' + state.present.join(', '));
    if (state.open.length > 0) parts.push('не закрыто: ' + state.open.join('; '));
    if (state.mood) parts.push('тон: ' + state.mood);
    parts.push('время сессии: ' + elapsedTimeString(state));
    return parts.join('. ') + '. ' +
        'Это текущее состояние сцены. Если в твоём ответе меняются место, время, состав сцены, ' +
        'закрываются или появляются нити — добавь в самом конце ответа ровно одну строку ' +
        '[[scene: место=…; время=…; рядом=…; висит=…; тон=…; погода=…]] и не упоминай её в тексте.';
}

function injectionRole() {
    const role = getSettings().role;
    if (role === 'user') return extension_prompt_roles.USER;
    if (role === 'assistant') return extension_prompt_roles.ASSISTANT;
    return extension_prompt_roles.SYSTEM;
}

function syncPrompt() {
    const settings = getSettings();
    if (!settings.inject || !isEnabled()) {
        setExtensionPrompt(PROMPT_KEY, '', extension_prompt_types.NONE, 0, false, extension_prompt_roles.SYSTEM);
        return;
    }
    setExtensionPrompt(PROMPT_KEY, sceneText(getState()), extension_prompt_types.IN_PROMPT, 0, false, injectionRole());
}

function renderCalendar(targetId) {
    const $root = $('#' + targetId);
    if ($root.length === 0) return;
    const state = getState();
    const dom = dayOfMonth(state);

    $root.find('.scene-cal-title').text(monthTitle(state));
    const $grid = $root.find('.scene-cal-grid').empty();
    for (let d = 1; d <= state.daysInMonth; d++) {
        const classes = ['scene-cal-day'];
        if (d === dom) classes.push('is-today');
        if (d > dom) classes.push('is-future');
        $grid.append(
            $('<div>')
                .addClass(classes.join(' '))
                .attr('data-cal-day', String(d))
                .text(String(d)),
        );
    }
}

function renderFloating() {
    const $float = $('#scene_panel_float');
    if ($float.length === 0) return;
    if (!isEnabled() || !getSettings().floating) {
        $float.hide();
        return;
    }
    $float.show();
    applyFloatPos();
    const state = getState();
    $float.find('#scene_panel_float_day').text('день ' + state.day);
    $float.find('#scene_panel_float_place').text(state.place || '—');
    $float.find('#scene_panel_float_when').text([state.timeOfDay, state.weather].filter(Boolean).join(' · '));
    $float.find('#scene_panel_float_present').text(state.present.length > 0 ? state.present.join(' · ') : '—');
    $float.find('#scene_panel_float_mood').text(state.mood || '');
    const $open = $float.find('#scene_panel_float_open').empty();
    if (state.open.length === 0) {
        $open.append($('<div>').addClass('scene-panel-float-empty').text('нет открытых нитей'));
    } else {
        state.open.forEach((line) => $open.append($('<div>').addClass('scene-panel-float-thread').text('✦ ' + line)));
    }
}

function refresh() {
    const state = getState();
    const $panel = $('#scene_panel_settings');
    if ($panel.length > 0) {
        $panel.find('[data-scene-field]').each(function () {
            const field = $(this).attr('data-scene-field');
            const value = state[field];
            if ($(this).is('textarea') || $(this).is('input')) {
                const text = Array.isArray(value) ? value.join(field === 'open' ? '\n' : ', ') : String(value ?? '');
                if ($(this).val() !== text) $(this).val(text);
            }
        });
        $('#scene_panel_day_label').text('день ' + state.day);
        $('#scene_panel_day_compact').text('день ' + state.day);
        $('#scene_panel_enabled').prop('checked', isEnabled());
        $('#scene_panel_topbtn').toggle(isEnabled());
        $panel.find('#scene_panel_month_label').val(state.monthLabel);
        $panel.find('#scene_panel_month_len').val(String(state.daysInMonth));
        $panel.find('#scene_panel_inject').prop('checked', getSettings().inject);
        $panel.find('#scene_panel_floating').prop('checked', getSettings().floating);
        $panel.find('#scene_panel_role').val(getSettings().role);
        $panel.find('#scene_panel_weather_integration').prop('checked', getSettings().weatherIntegration);
        $panel.find('#scene_panel_elapsed_display').text(elapsedTimeString(state));
        renderCalendar('scene_panel_cal');
    }
    renderFloating();
    renderCalendar('scene_panel_float_cal');
}

function readForm() {
    const state = getState();
    const read = (field) => {
        const $el = $('#scene_panel_settings [data-scene-field="' + field + '"]');
        return $el.length > 0 ? String($el.val() ?? '') : '';
    };
    const split = (raw, re) => raw.split(re).map((x) => x.trim()).filter(Boolean);
    state.date = read('date');
    state.place = read('place');
    state.timeOfDay = read('timeOfDay');
    state.weather = read('weather');
    state.mood = read('mood');
    state.present = split(read('present'), /[,\n]/);
    state.open = split(read('open'), /\n/);
    commit();
    syncPrompt();
    refresh();
    applyWeatherEffect();
}

function shiftDay(delta) {
    const state = getState();
    state.day = Math.max(1, state.day + delta);
    commit();
    syncPrompt();
    refresh();
}

function setDayOfMonth(dom) {
    const state = getState();
    state.day = absoluteDay(state, monthIndex(state), dom);
    commit();
    syncPrompt();
    refresh();
}

function shiftMonth(delta) {
    const state = getState();
    const target = Math.max(1, monthIndex(state) + delta);
    state.day = absoluteDay(state, target, Math.min(dayOfMonth(state), state.daysInMonth));
    commit();
    syncPrompt();
    refresh();
}

function parseTag(body) {
    const out = {};
    const state = getState();
    for (const rawChunk of body.split(';')) {
        const chunk = rawChunk.trim();
        if (!chunk) continue;
        const eq = chunk.indexOf('=');
        const colon = chunk.indexOf(':');
        let sep = -1;
        if (eq >= 0 && (colon < 0 || eq < colon)) sep = eq;
        else sep = colon;
        if (sep < 0) continue;
        const key = chunk.slice(0, sep).trim().toLowerCase();
        const value = chunk.slice(sep + 1).trim();
        const field = KEY_ALIASES[key];
        if (!field) continue;
        if (field === 'day') {
            if (value === '+1' || value === 'следующий') {
                out.day = state.day + 1;
            } else {
                const n = parseInt(value, 10);
                if (Number.isFinite(n) && n > 0) out.day = n;
            }
            continue;
        }
        if (field === 'present') {
            out.present = value.split(',').map((x) => x.trim()).filter(Boolean);
            continue;
        }
        if (field === 'open') {
            out.open = value.split(/[;|]/).map((x) => x.trim()).filter(Boolean);
            continue;
        }
        out[field] = value;
    }
    return out;
}

function handleMessage(messageId) {
    try {
        if (!isEnabled()) return;
        const message = getContext().chat?.[messageId];
        if (!message || typeof message.mes !== 'string') return;
        const match = message.mes.match(TAG_RE);
        if (!match) return;
        const patch = parseTag(match[1]);
        if (Object.keys(patch).length > 0) {
            Object.assign(getState(), patch);
        }
        message.mes = message.mes.replace(TAG_RE, '').replace(/\s+$/, '');
        updateMessageBlock(messageId, message, { rerenderMessage: true });
        commit();
        syncPrompt();
        refresh();
        applyWeatherEffect();
    } catch (e) {
        console.error('[scene-panel] tag handling failed', e);
    }
}

// Переводит свободный текст погоды в состояние Weather Background.
function mapWeatherToState(value) {
    if (typeof value !== 'string') return null;
    const raw = value.trim().toLowerCase();
    if (!raw) return null;
    if (WEATHER_STATES[raw]) return WEATHER_STATES[raw];
    for (const [key, state] of Object.entries(WEATHER_STATES)) {
        if (key.length > 2 && raw.includes(key)) return state;
    }
    return null;
}

// Применяет погоду сцены к фону Weather Background (если расширение установлено).
// force=true — принудительно очищает эффект (например, при сбросе сцены).
async function applyWeatherEffect(force = false) {
    const settings = getSettings();
    if (!isEnabled() || !settings.weatherIntegration) return;

    const state = force ? 'clear' : mapWeatherToState(getState().weather);
    if (!state) return;

    const wb = extension_settings?.['weather_background'];
    if (wb && wb.enabled === false) return;
    const mobileMode = Boolean(wb?.mobileMode);

    try {
        if (!weatherRendererPromise) {
            weatherRendererPromise = import('../sillytavern-weather-background/src/background-renderer.js');
        }
        const mod = await weatherRendererPromise;
        if (mod && typeof mod.setWeatherEffect === 'function') {
            mod.setWeatherEffect(state, { mobileMode });
        }
    } catch (e) {
        weatherRendererPromise = null;
        console.warn('[scene-panel] Weather Background недоступен, эффект пропущен', e);
    }
}

function applyFloatPos() {
    const $f = $('#scene_panel_float');
    if ($f.length === 0) return;
    const pos = getSettings().floatPos;
    if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        $f.css({ left: pos.x + 'px', top: pos.y + 'px', right: 'auto', bottom: 'auto' });
    }
}

function enableDrag() {
    const el = document.getElementById('scene_panel_float');
    if (!el) return;
    const head = el.querySelector('.scene-panel-float-head');
    if (!head) return;
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;
    let dragging = false;

    head.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.scene-panel-float-btn')) return;
        const rect = el.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        origX = rect.left;
        origY = rect.top;
        dragging = true;
        try {
            head.setPointerCapture(e.pointerId);
        } catch (err) {
            /* pointer capture may be unavailable */
        }
    });

    head.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const w = el.offsetWidth;
        const x = Math.max(0, Math.min(window.innerWidth - w - 4, origX + (e.clientX - startX)));
        const y = Math.max(0, Math.min(window.innerHeight - 44, origY + (e.clientY - startY)));
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        e.preventDefault();
    });

    const stop = (e) => {
        if (!dragging) return;
        dragging = false;
        const rect = el.getBoundingClientRect();
        getSettings().floatPos = { x: Math.round(rect.left), y: Math.round(rect.top) };
        try {
            saveSettings();
        } catch (err) {
            /* settings save is best-effort */
        }
        try {
            head.releasePointerCapture(e.pointerId);
        } catch (err) {
            /* already released */
        }
    };

    head.addEventListener('pointerup', stop);
    head.addEventListener('pointercancel', stop);
}

function mountModal(panelHtml) {
    const modal = [
        '<div id="scene_panel_modal" class="scene-panel-modal" aria-hidden="true">',
        '  <div class="scene-panel-modal-card" role="dialog" aria-label="Scene Panel">',
        '    <div class="scene-panel-modal-head">',
        '      <span class="scene-panel-modal-title">✦ SCENE PANEL ✦</span>',
        '      <span class="scene-panel-modal-day" id="scene_panel_day_label">день 1</span>',
        '      <span class="scene-panel-modal-x" id="scene_panel_modal_close" title="закрыть">×</span>',
        '    </div>',
        '    <div class="scene-panel-modal-body" id="scene_panel_modal_body"></div>',
        '  </div>',
        '</div>',
    ].join('');
    $('body').append(modal);
    $('#scene_panel_modal_body').append(panelHtml);
}

function mountTopButton() {
    if ($('#scene_panel_topbtn').length > 0) return;
    const $holder = $('#top-settings-holder');
    const $btn = $('<div>')
        .attr('id', 'scene_panel_topbtn')
        .addClass('scene-panel-topbtn')
        .attr('title', 'Scene Panel — календарь и сцена')
        .text('☾');
    if ($holder.length > 0) {
        const $drawer = $('<div>').addClass('drawer scene-panel-drawer');
        const $toggle = $('<div>').addClass('drawer-toggle');
        $toggle.append($btn);
        $drawer.append($toggle);
        $holder.append($drawer);
    } else {
        $('body').append($btn.addClass('is-floating'));
    }
    $btn.on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal();
    });
}

function openModal() {
    const $modal = $('#scene_panel_modal');
    if ($modal.length === 0) return;
    $modal.addClass('is-open').attr('aria-hidden', 'false');
    refresh();
}

function closeModal() {
    const $modal = $('#scene_panel_modal');
    if ($modal.length === 0) return;
    $modal.removeClass('is-open').attr('aria-hidden', 'true');
}

function bindEvents() {
    $('#scene_panel_open_modal').on('click', () => openModal());
    $('#scene_panel_topbtn').on('click', () => openModal());
    $('#scene_panel_modal_close').on('click', () => closeModal());
    $('#scene_panel_modal').on('click', (e) => {
        if (e.target && e.target.id === 'scene_panel_modal') closeModal();
    });
    $(document).on('keydown.scenePanel', (e) => {
        if (e.key === 'Escape') closeModal();
    });
    $('#scene_panel_enabled').on('change', (e) => {
        getSettings().enabled = !!e.target.checked;
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
        if (!isEnabled()) {
            $('#scene_panel_float').hide();
            $('#scene_panel_modal').removeClass('is-open');
            setExtensionPrompt(PROMPT_KEY, '', extension_prompt_types.NONE, 0, false, extension_prompt_roles.SYSTEM);
        } else {
            renderFloating();
            syncPrompt();
        }
        refresh();
    });

    const $panel = $('#scene_panel_settings');
    $panel.on('input change', '[data-scene-field]', () => readForm());
    $panel.on('click', '#scene_panel_day_plus', () => shiftDay(1));
    $panel.on('click', '#scene_panel_day_minus', () => shiftDay(-1));
    $panel.on('input', '#scene_panel_month_label', (e) => {
        getState().monthLabel = String(e.target.value || '');
        commit();
        syncPrompt();
        renderCalendar('scene_panel_cal');
        renderCalendar('scene_panel_float_cal');
    });
    $panel.on('change', '#scene_panel_month_len', (e) => {
        const n = Math.max(MIN_MONTH, Math.min(MAX_MONTH, parseInt(String(e.target.value), 10) || 30));
        getState().daysInMonth = n;
        commit();
        syncPrompt();
        refresh();
    });
    $panel.on('click', '.scene-cal-day', (e) => {
        const dom = parseInt(String($(e.currentTarget).attr('data-cal-day')), 10);
        if (Number.isFinite(dom)) setDayOfMonth(dom);
    });
    $panel.on('click', '.scene-cal-prev', () => shiftMonth(-1));
    $panel.on('click', '.scene-cal-next', () => shiftMonth(1));
    $panel.on('click', '#scene_panel_reset', () => {
        chat_metadata[MODULE] = emptyState();
        commit();
        syncPrompt();
        refresh();
        applyWeatherEffect(true);
    });
    $panel.on('change', '#scene_panel_inject', (e) => {
        getSettings().inject = !!e.target.checked;
        syncPrompt();
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
    });
    $panel.on('change', '#scene_panel_role', (e) => {
        getSettings().role = String(e.target.value || 'system');
        syncPrompt();
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
    });
    $panel.on('change', '#scene_panel_floating', (e) => {
        getSettings().floating = !!e.target.checked;
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
        renderFloating();
    });
    $panel.on('change', '#scene_panel_weather_integration', (e) => {
        getSettings().weatherIntegration = !!e.target.checked;
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
        applyWeatherEffect();
        refresh();
    });

    // Кнопки счётчика времени сессии
    $panel.on('click', '#scene_panel_session_minus_hour', () => shiftSessionHour(-1));
    $panel.on('click', '#scene_panel_session_plus_hour', () => shiftSessionHour(1));
    $panel.on('click', '#scene_panel_session_minus_day', () => shiftSessionDay(-1));
    $panel.on('click', '#scene_panel_session_plus_day', () => shiftSessionDay(1));

    const $float = $('#scene_panel_float');
    $float.on('click', '#scene_panel_float_day_plus', () => shiftDay(1));
    $float.on('click', '#scene_panel_float_day_minus', () => shiftDay(-1));
    $float.on('click', '.scene-cal-day', (e) => {
        const dom = parseInt(String($(e.currentTarget).attr('data-cal-day')), 10);
        if (Number.isFinite(dom)) setDayOfMonth(dom);
    });
    $float.on('click', '.scene-cal-prev', () => shiftMonth(-1));
    $float.on('click', '.scene-cal-next', () => shiftMonth(1));
    $float.on('click', '#scene_panel_float_collapse', () => {
        $float.toggleClass('is-collapsed');
    });
    $float.on('click', '#scene_panel_float_hide', () => {
        getSettings().floating = false;
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
        renderFloating();
        refresh();
    });
}

jQuery(async () => {
    try {
        const compactHtml = await renderExtensionTemplateAsync(EXT_NAME, 'settings');
        $('#extensions_settings2').append(compactHtml);

        // Панель берём из встроенной разметки — не зависит от кэша panel.html
        const panelHtml = PANEL_HTML;
        mountModal(panelHtml);
        mountTopButton();

        const floatHtml = await renderExtensionTemplateAsync(EXT_NAME, 'floating');
        $('body').append(floatHtml);

        try {
            const mod = await import('../../../../script.js');
            if (typeof mod.saveSettingsDebounced === 'function') {
                saveSettings = mod.saveSettingsDebounced;
            }
        } catch (e) {
            console.warn('[scene-panel] settings save unavailable', e);
        }

        getSettings();
        getState();
        bindEvents();
        enableDrag();
        refresh();
        syncPrompt();
        applyWeatherEffect();

        eventSource.on(event_types.MESSAGE_RECEIVED, handleMessage);
        eventSource.on(event_types.CHAT_CHANGED, () => {
            getState();
            refresh();
            syncPrompt();
            setTimeout(() => applyWeatherEffect(), 250);
        });
        eventSource.on(event_types.GENERATION_STARTED, () => syncPrompt());
        eventSource.on(event_types.MESSAGE_SENT, () => refresh());

        window.addEventListener('focus', () => refresh());
        window.addEventListener('resize', () => {
            const pos = getSettings().floatPos;
            if (pos) {
                getSettings().floatPos = {
                    x: Math.max(0, Math.min(window.innerWidth - 80, pos.x)),
                    y: Math.max(0, Math.min(window.innerHeight - 44, pos.y)),
                };
                applyFloatPos();
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) refresh();
        });

        console.log('[scene-panel] ready');
    } catch (e) {
        console.error('[scene-panel] init failed', e);
    }
});
