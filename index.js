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
    };
}

function getSettings() {
    if (!extension_settings[MODULE] || typeof extension_settings[MODULE] !== 'object') {
        extension_settings[MODULE] = { inject: true, role: 'system', floating: true, floatPos: null };
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
    if (!getSettings().floating) {
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
        $('#scene_panel_floating_compact').prop('checked', getSettings().floating);
        $panel.find('#scene_panel_month_label').val(state.monthLabel);
        $panel.find('#scene_panel_month_len').val(String(state.daysInMonth));
        $panel.find('#scene_panel_inject').prop('checked', getSettings().inject);
        $panel.find('#scene_panel_floating').prop('checked', getSettings().floating);
        $panel.find('#scene_panel_role').val(getSettings().role);
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
        '      <span class="scene-panel-modal-title">🕯 Панель сцены</span>',
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
        .text('🕯');
    if ($holder.length > 0) {
        $holder.append($btn);
    } else {
        $('body').append($btn.addClass('is-floating'));
    }
    $btn.on('click', () => openModal());
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
    $('#scene_panel_floating_compact').on('change', (e) => {
        getSettings().floating = !!e.target.checked;
        try {
            saveSettings();
        } catch (err) {
            /* ignore */
        }
        renderFloating();
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

        const panelHtml = await renderExtensionTemplateAsync(EXT_NAME, 'panel');
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

        eventSource.on(event_types.MESSAGE_RECEIVED, handleMessage);
        eventSource.on(event_types.CHAT_CHANGED, () => {
            getState();
            refresh();
            syncPrompt();
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
