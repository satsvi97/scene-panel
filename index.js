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

function emptyState() {
    return {
        day: 1,
        date: '',
        place: '',
        timeOfDay: '',
        weather: '',
        present: [],
        open: [],
        mood: '',
    };
}

function getSettings() {
    if (!extension_settings[MODULE] || typeof extension_settings[MODULE] !== 'object') {
        extension_settings[MODULE] = { inject: true, role: 'system', floating: true };
    }
    const s = extension_settings[MODULE];
    if (typeof s.inject !== 'boolean') s.inject = true;
    if (typeof s.floating !== 'boolean') s.floating = true;
    if (typeof s.role !== 'string') s.role = 'system';
    return s;
}

function getState() {
    if (!chat_metadata[MODULE] || typeof chat_metadata[MODULE] !== 'object') {
        chat_metadata[MODULE] = emptyState();
    }
    const s = chat_metadata[MODULE];
    const day = Number(s.day);
    s.day = Number.isFinite(day) && day > 0 ? Math.round(day) : 1;
    for (const k of ['date', 'place', 'timeOfDay', 'weather', 'mood']) {
        if (typeof s[k] !== 'string') s[k] = '';
    }
    if (!Array.isArray(s.present)) s.present = [];
    if (!Array.isArray(s.open)) s.open = [];
    s.present = s.present.filter((x) => typeof x === 'string' && x.trim().length > 0);
    s.open = s.open.filter((x) => typeof x === 'string' && x.trim().length > 0);
    return s;
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
    parts.push('Сцена: день ' + state.day + (state.date ? ' (' + state.date + ')' : ''));
    if (state.place) parts.push('место: ' + state.place);
    const when = [state.timeOfDay, state.weather].filter(Boolean).join(', ');
    if (when) parts.push('обстановка: ' + when);
    if (state.present.length > 0) parts.push('рядом: ' + state.present.join(', '));
    if (state.open.length > 0) parts.push('не закрыто: ' + state.open.join('; '));
    if (state.mood) parts.push('тон: ' + state.mood);
    return parts.join('. ') + '.';
}

function injectionRole() {
    const role = getSettings().role;
    if (role === 'user') return extension_prompt_roles.USER;
    if (role === 'assistant') return extension_prompt_roles.ASSISTANT;
    return extension_prompt_roles.SYSTEM;
}

function syncPrompt() {
    const settings = getSettings();
    if (!settings.inject) {
        setExtensionPrompt(PROMPT_KEY, '', extension_prompt_types.NONE, 0, false, extension_prompt_roles.SYSTEM);
        return;
    }
    setExtensionPrompt(PROMPT_KEY, sceneText(getState()), extension_prompt_types.IN_PROMPT, 0, false, injectionRole());
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
            } else {
                $(this).text(Array.isArray(value) ? value.join(', ') : String(value ?? ''));
            }
        });
        $panel.find('#scene_panel_day_label').text('день ' + state.day);
        $panel.find('#scene_panel_inject').prop('checked', getSettings().inject);
        $panel.find('#scene_panel_floating').prop('checked', getSettings().floating);
        $panel.find('#scene_panel_role').val(getSettings().role);
    }
    renderFloating();
}

function renderFloating() {
    const $float = $('#scene_panel_float');
    if ($float.length === 0) return;
    if (!getSettings().floating) {
        $float.hide();
        return;
    }
    $float.show();
    const state = getState();
    $float.find('#scene_panel_float_day').text('день ' + state.day);
    $float.find('#scene_panel_float_place').text(state.place || '—');
    $float.find('#scene_panel_float_when').text([state.timeOfDay, state.weather].filter(Boolean).join(' · '));
    $float.find('#scene_panel_float_present').text(state.present.length > 0 ? state.present.join(' · ') : '—');
    const $open = $float.find('#scene_panel_float_open').empty();
    if (state.open.length === 0) {
        $open.append($('<div>').addClass('scene-panel-float-empty').text('нет открытых нитей'));
    } else {
        state.open.forEach((line) => $open.append($('<div>').addClass('scene-panel-float-thread').text('✦ ' + line)));
    }
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
}

function bump(branch, patch) {
    const state = getState();
    Object.assign(state, patch);
    if (branch === 'day') state.day = Math.max(1, state.day + 1);
    commit();
    syncPrompt();
    refresh();
}

function handleMessage(messageId) {
    try {
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
    } catch (e) {
        console.error('[scene-panel] tag handling failed', e);
    }
}

function bindEvents() {
    const $panel = $('#scene_panel_settings');
    $panel.on('input change', '[data-scene-field]', () => readForm());
    $panel.on('click', '#scene_panel_day_plus', () => bump('day'));
    $panel.on('click', '#scene_panel_reset', () => {
        chat_metadata[MODULE] = emptyState();
        commit();
        syncPrompt();
        refresh();
    });
    $panel.on('change', '#scene_panel_inject', (e) => {
        getSettings().inject = !!e.target.checked;
        syncPrompt();
    });
    $panel.on('change', '#scene_panel_role', (e) => {
        getSettings().role = String(e.target.value || 'system');
        syncPrompt();
    });
    $panel.on('change', '#scene_panel_floating', (e) => {
        getSettings().floating = !!e.target.checked;
        renderFloating();
    });

    const $float = $('#scene_panel_float');
    $float.on('click', '#scene_panel_float_day_plus', () => bump('day'));
    $float.on('click', '#scene_panel_float_refresh', () => {
        syncPrompt();
        refresh();
    });
    $float.on('click', '#scene_panel_float_hide', () => {
        getSettings().floating = false;
        renderFloating();
        refresh();
    });
}

jQuery(async () => {
    try {
        const html = await renderExtensionTemplateAsync(EXT_NAME, 'settings');
        $('#extensions_settings2').append(html);

        const floatHtml = await renderExtensionTemplateAsync(EXT_NAME, 'floating');
        $('body').append(floatHtml);

        getSettings();
        getState();
        bindEvents();
        refresh();
        syncPrompt();

        eventSource.on(event_types.MESSAGE_RECEIVED, handleMessage);
        eventSource.on(event_types.CHAT_CHANGED, () => {
            getState();
            refresh();
            syncPrompt();
        });
        eventSource.on(event_types.GENERATION_STARTED, () => syncPrompt());
        eventSource.on(event_types.MESSAGE_SENT, () => refresh());

        window.addEventListener('focus', () => refresh());
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) refresh();
        });

        console.log('[scene-panel] ready');
    } catch (e) {
        console.error('[scene-panel] init failed', e);
    }
});
