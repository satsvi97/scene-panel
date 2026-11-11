# ✦ SCENE PANEL ✦

**Панель сцены для SillyTavern** · *Scene Panel for SillyTavern*

[🇷🇺 Русский](#-русский) · [🇬🇧 English](#-english)

![version](https://img.shields.io/badge/version-0.9.0-b8b8ff?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-a99bf5?style=flat-square)
![platform](https://img.shields.io/badge/SillyTavern-extension-7c6ee0?style=flat-square)

---

## ☾ Русский

> *«Дворец Ночи, покои Ризанда. Утро. Хрупкое перемирие. За дверью ждёт Фейра.»*

**Scene Panel** — это маленькая гримуарная панель для ролевых игр: она помнит, **где** вы, **когда**, **кто рядом**, **что висит** и **каким тоном** звучит сцена. Состояние живёт **внутри чата**, поэтому у каждой истории свой собственный календарь и своя сцена — они не смешиваются.

Главная магия: ИИ может **сам** обновлять сцену служебным тегом в конце ответа. Тег вырезается из текста — в чате его не видно, а панель уже знает, что наступил следующий день.

### ✨ Что умеет

| | Возможность | Описание |
|---|---|---|
| 📅 | **Календарь** | Счётчик дня + название месяца + число дней в месяце (5–60). Клик по дню — переход. |
| 📍 | **Место** | Свободная строка: «Дворец Ночи, покои Ризанда». |
| 🕐 | **Время суток** | Свободный текст + быстрые чипы: рассвет · утро · день · вечер · закат · ночь. |
| 🌦 | **Погода** | Свободный текст; при наличии Weather Background включает фон сцены. |
| 👥 | **Кто рядом** | Список персонажей. Под полем — чипы `＋ Имя` из последних сообщений. |
| ⚡ | **Открытые нити** | Что висит и ждёт развития (по одной на строку). |
| 🌫 | **Тон сцены** | Эмоциональная рамка: «хрупкое перемирие», «холодная ярость». |
| 🏷 | **Доп. поля** | Любые `ключ=значение` — тоже попадают в промпт. |
| ⏱ | **Счётчик сессии** | День + `ЧЧ:ММ`, кнопки `− час / + час / − день / + день`. |
| 🧠 | **Инжект в промпт** | Сцена автоматически вставляется в контекст (роль на выбор). |
| 🩺 | **Диагностика** | Восстановление сцены из последних сообщений или из снимка. |
| 📊 | **Статистика** | Отдельная страница: обновления, частые персонажи, места, время, погода. |
| 🎨 | **Тема** | Авто / тёмная / светлая (сиреневая). |
| ✨ | **Эстетика** | Лунная пыль на фоне, плавающая карточка, дрейф по экрану. |

### 🌙 Установка

**Через URL (рекомендуется):**

1. Откройте SillyTavern → **Extensions** → **Install extension**.
2. Вставьте адрес:
   ```
   https://github.com/satsvi97/scene-panel
   ```
3. Перезапустите страницу таверны (`F5`, при обновлении — `Ctrl+F5`).
4. В меню **Extensions** появится блок **✦ SCENE PANEL ✦**.

**Вручную:**

Скопируйте папку в:

```
SillyTavern/public/scripts/extensions/third-party/scene-panel
```

и перезагрузите таверну.

> ☾ Расширение не требует серверных модулей и ничего не пишет в файлы — только в `chat_metadata` текущего чата.

### 🌌 Как пользоваться

**1. Открыть панель.** Кнопка **«открыть панель сцены»** в меню расширений, иконка **☾** в верхней панели таверны, или горячая клавиша **Alt+Shift+S**.

**2. Заполнить сцену.** Всё можно вписать руками: день, место, время, погоду, кто рядом, нити, тон, доп. поля. Изменения сохраняются мгновенно.

**3. Позволить ИИ обновлять.** В конце ответа модель пишет служебную строку:

```
[[scene: день=+1; место=Дворец Ночи; время=утро; рядом=Ризанд, Фейра; висит=разговор с Фейрой; погода=дождь; тон=хрупкое перемирие]]
```

Строка **исчезает из текста**, а поля панели обновляются. Если модель тег не написала — панель просто остаётся ручной, ничего не ломается.

**4. Свайп.** Внутри панели свайп **влево** открывает статистику, свайп **вправо** возвращает к сцене. На ПК — кнопка **📊** в шапке или точки-индикаторы внизу.

### 🏷 Формат тега

Ключи можно писать по-русски или по-английски, разделитель — `;` (допускается `:`).

| Русский | English | Значение |
|---|---|---|
| `день` | `day` | число, либо `+1` / `следующий` (`+1` = следующий день) |
| `дата` | `date` | свободная строка |
| `место` | `place`, `где` | свободная строка |
| `время` | `time`, `timeofday` | `утро`, `ночь`, … |
| `погода` | `weather` | `дождь`, `гроза`, `снег`, `ясно`, … |
| `рядом` | `present`, `кто` | имена через запятую |
| `висит` | `open`, `нити`, `threads` | через `;` или `\|` |
| `тон` | `mood` | свободная строка |

Всё, что не совпало с ключами выше, сохраняется как **доп. поле** (`сюжет=погоня`, `напряжение=высокое`). Служебное `время_сессии` игнорируется.

### 🌦 Интеграция с Weather Background

Если установлено расширение [Weather Background](https://github.com/tankisthuieglot-hue/sillytavern-weather-background), панель умеет включать его фон по погоде сцены:

`дождь → rain` · `гроза → thunderstorm` · `снег → snow` · `метель → blizzard` · `облачно → cloudy` · `солнечно → sunny` · `град → hail` · `ясно → clear`

- включается галочкой **«🌦 фон погоды (Weather Background)»**;
- учитывает настройки самого Weather Background (выключено / мобильный режим);
- если Weather Background не установлен — панель молча работает без него.

### 🩺 Диагностика и история

- При каждом изменении сцены сохраняется **снимок** (до 20 последних, в `chat_metadata`).
- Кнопка **«проверить и восстановить»**:
  1. сканирует последние **12 сообщений** на теги `[[scene: …]]`;
  2. если тегов нет — берёт **последний снимок**;
  3. показывает результат под кнопкой: `Тегов: N. Снимков: M. ✅ Восстановлено из …`.
- Снимок делается и **перед кнопкой «сбросить»** — так случайный сброс можно откатить.

### 📊 Статистика

Отдельная страница панели считает по этому чату:

- количество обновлений сцены и максимальный день;
- самых частых персонажей «рядом»;
- частые места, время суток и погоду.

Кнопки **«обновить»** и **«очистить»**. Данные хранятся отдельно от сцены — сброс сцены статистику не стирает.

### ⚙️ Настройки

| Настройка | Что делает |
|---|---|
| **расширение включено** | Главный выключатель. |
| **вставлять сцену в промпт** | Добавляет состояние сцены в контекст. |
| **роль инжекта** | `system` / `user` / `assistant`. |
| **🎨 тема панели** | `авто` (по фону таверны) / `тёмная` / `светлая`. |
| **плавающая панель в чате** | Компактная карточка в углу (её можно таскать мышью). |
| **🌦 фон погоды (Weather Background)** | Связь с расширением погоды. |

### 💾 Где хранятся данные

| Ключ | Содержимое |
|---|---|
| `chat_metadata.scene_panel` | Текущая сцена чата |
| `chat_metadata.scene_panel_history` | Снимки (до 20) |
| `chat_metadata.scene_panel_stats` | Статистика |
| `extension_settings.scene_panel` | Настройки расширения |

У каждого чата — своя сцена, своя история и своя статистика.

### 🛠 Если что-то пошло не так

- **Не видно обновления?** Проверьте версию — она написана **в правом нижнем углу панели** (`v0.9.0`). Затем `Ctrl+F5` и перезапуск таверны.
- **Ошибка `Need to specify how to reconcile divergent branches` при обновлении.** История git разошлась: удалите расширение и установите заново по URL.
- **Панель открылась «не той» разметкой.** Жёсткое обновление (`Ctrl+F5`); при повторе — переустановка.
- **Погода не меняет фон.** Проверьте, что Weather Background включён и в его настройках не стоит «постоянный эффект none».

### 🗺 Дальше в планах

- экспорт/импорт сцены в JSON;
- откат на любой из снимков истории;
- связь с лорбуками и карточками персонажей;
- прогноз погоды на несколько дней вперёд.

### 📜 Лицензия

**MIT** © 2026 Selena's Tavern (satsvi97) — см. [LICENSE](LICENSE).

Можно свободно использовать, изменять, распространять и встраивать в свои проекты, при условии сохранения уведомления об авторстве.

> ✦ Сделано с любовью для **Selena's Tavern** · *Made with love for Selena's Tavern* ✦

---

## ☾ English

> *"The Night Palace, Rhysand's chambers. Morning. A fragile truce. Feyre waits outside the door."*

**Scene Panel** is a small grimoire-like panel for roleplay: it remembers **where** you are, **when**, **who is nearby**, **what threads are open** and **what the scene feels like**. The state lives **inside the chat**, so every story has its own calendar and its own scene — nothing bleeds between chats.

The main magic: the AI can **update the scene itself** with a service tag at the end of a reply. The tag is stripped from the text — you never see it in chat, but the panel already knows the next day has come.

### ✨ Features

| | Feature | Description |
|---|---|---|
| 📅 | **Calendar** | Day counter + month name + days per month (5–60). Click a day to jump. |
| 📍 | **Place** | Free text: "Night Palace, Rhysand's chambers". |
| 🕐 | **Time of day** | Free text + quick chips: dawn · morning · day · evening · sunset · night. |
| 🌦 | **Weather** | Free text; drives the Weather Background effect when installed. |
| 👥 | **Present** | Character list. Chips `＋ Name` appear from recent messages. |
| ⚡ | **Open threads** | What is hanging and waiting (one per line). |
| 🌫 | **Scene mood** | Emotional frame: "fragile truce", "cold fury". |
| 🏷 | **Custom fields** | Any `key=value` — also injected into the prompt. |
| ⏱ | **Session timer** | Day + `HH:MM`, buttons `− hour / + hour / − day / + day`. |
| 🧠 | **Prompt injection** | Scene state is inserted into the context (role selectable). |
| 🩺 | **Diagnostics** | Restores the scene from recent messages or from a snapshot. |
| 📊 | **Statistics** | Separate page: updates, frequent characters, places, times, weather. |
| 🎨 | **Theme** | Auto / dark / light (lilac). |
| ✨ | **Aesthetics** | Moon dust background, floating card, draggable panel. |

### 🌙 Installation

**Via URL (recommended):**

1. Open SillyTavern → **Extensions** → **Install extension**.
2. Paste:
   ```
   https://github.com/satsvi97/scene-panel
   ```
3. Reload the tavern page (`F5`, or `Ctrl+F5` after an update).
4. The **✦ SCENE PANEL ✦** block appears in **Extensions**.

**Manually:**

Copy the folder to:

```
SillyTavern/public/scripts/extensions/third-party/scene-panel
```

and restart SillyTavern.

> ☾ No server modules required. Nothing is written to disk — only to the current chat's `chat_metadata`.

### 🌌 Usage

**1. Open the panel.** The **"открыть панель сцены"** button in Extensions, the **☾** icon in the top bar, or the **Alt+Shift+S** hotkey.

**2. Fill the scene.** Everything can be edited by hand: day, place, time, weather, present, threads, mood, custom fields. Changes save instantly.

**3. Let the AI update it.** At the end of a reply the model writes:

```
[[scene: day=+1; place=Night Palace; time=morning; present=Rhysand, Feyre; open=talk with Feyre; weather=rain; mood=fragile truce]]
```

The line **disappears from the text** and the panel updates. If the model writes no tag, the panel simply stays manual — nothing breaks.

**4. Swipe.** Swipe **left** inside the panel to open statistics, swipe **right** to return to the scene. On desktop use the **📊** button in the header or the dots at the bottom.

### 🏷 Tag format

Keys may be Russian or English; separator is `;` (`:` also works).

| Russian | English | Value |
|---|---|---|
| `день` | `day` | number, or `+1` / `следующий` |
| `дата` | `date` | free text |
| `место` | `place`, `где` | free text |
| `время` | `time`, `timeofday` | `утро`, `ночь`, … |
| `погода` | `weather` | rain, thunderstorm, snow, clear, … |
| `рядом` | `present`, `кто` | comma-separated names |
| `висит` | `open`, `нити`, `threads` | separated by `;` or `\|` |
| `тон` | `mood` | free text |

Anything that doesn't match these keys is stored as a **custom field** (`plot=chase`, `tension=high`). The service key `время_сессии` is ignored.

### 🌦 Weather Background integration

If [Weather Background](https://github.com/tankisthuieglot-hue/sillytavern-weather-background) is installed, the panel can drive its background from the scene weather:

`rain` · `thunderstorm` · `snow` · `blizzard` · `cloudy` · `sunny` · `hail` · `clear`

- enabled by the **"🌦 фон погоды (Weather Background)"** checkbox;
- respects Weather Background's own settings (disabled / mobile mode);
- if Weather Background is missing, the panel silently works without it.

### 🩺 Diagnostics & history

- Every scene change stores a **snapshot** (up to 20, in `chat_metadata`).
- The **"проверить и восстановить"** button:
  1. scans the last **12 messages** for `[[scene: …]]` tags;
  2. if none are found, takes the **latest snapshot**;
  3. prints the result under the button: `Tags: N. Snapshots: M. ✅ Restored from …`.
- A snapshot is also taken **before "reset"**, so an accidental reset can be undone.

### 📊 Statistics

A separate panel page, counted per chat:

- number of scene updates and the highest day reached;
- most frequent characters in "present";
- frequent places, times of day and weather.

Buttons **refresh** and **clear**. Statistics live separately from the scene — resetting the scene does not erase them.

### ⚙️ Settings

| Setting | Effect |
|---|---|
| **extension enabled** | Master switch. |
| **inject scene into prompt** | Adds the scene state to the context. |
| **injection role** | `system` / `user` / `assistant`. |
| **🎨 panel theme** | `auto` (from tavern background) / `dark` / `light`. |
| **floating panel in chat** | Compact draggable card in the corner. |
| **🌦 weather background** | Hook into Weather Background. |

### 💾 Where data lives

| Key | Content |
|---|---|
| `chat_metadata.scene_panel` | Current scene of the chat |
| `chat_metadata.scene_panel_history` | Snapshots (up to 20) |
| `chat_metadata.scene_panel_stats` | Statistics |
| `extension_settings.scene_panel` | Extension settings |

Each chat has its own scene, history and statistics.

### 🛠 Troubleshooting

- **No update visible?** Check the version shown **in the bottom-right corner of the panel** (`v0.9.0`), then `Ctrl+F5` and restart the tavern.
- **`Need to specify how to reconcile divergent branches` on update.** The git history diverged: delete the extension and reinstall it via URL.
- **Panel opened with the wrong layout.** Hard refresh (`Ctrl+F5`); if it repeats — reinstall.
- **Weather doesn't change the background.** Make sure Weather Background is enabled and its "permanent effect" is not set to none.

### 🗺 Roadmap

- scene export/import as JSON;
- rollback to any snapshot in history;
- lorebook and character card integration;
- multi-day weather forecast.

### 📜 License

**MIT** © 2026 Selena's Tavern (satsvi97) — see [LICENSE](LICENSE).

Free to use, modify, redistribute and embed in your own projects, provided the copyright notice is preserved.

> ✦ Made with love for **Selena's Tavern** ✦
