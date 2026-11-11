# ✦ SCENE PANEL ✦

**Панель сцены для SillyTavern** · *Scene Panel for SillyTavern*

[🇷🇺 Русский](#-русский) · [🇺🇦 Українська](#-українська) · [🇸🇪 Svenska](#-svenska) · [🇬🇧 English](#-english)

![version](https://img.shields.io/badge/version-0.10.1-b8b8ff?style=flat-square)
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
| 🌐 | **Язык панели** | Переключатель RU · UK · SV · EN в шапке, рядом со счётчиком дня. |
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

- **Не видно обновления?** Проверьте версию — она написана **в правом нижнем углу панели** (`v0.10.1`). Затем `Ctrl+F5` и перезапуск таверны.
- **Ошибка `Need to specify how to reconcile divergent branches` при обновлении.** История git разошлась: удалите расширение и установите заново по URL.
- **Панель открылась «не той» разметкой.** Жёсткое обновление (`Ctrl+F5`); при повторе — переустановка.
- **Погода не меняет фон.** Проверьте, что Weather Background включён и в его настройках не стоит «постоянный эффект none».

### 🐞 Баги и идеи

- 🐞 [Сообщить о баге](https://github.com/satsvi97/scene-panel/issues/new?template=bug_report.yml)
- ✨ [Предложить идею](https://github.com/satsvi97/scene-panel/issues/new?template=feature_request.yml)
- 📋 [Все задачи и баги](https://github.com/satsvi97/scene-panel/issues)

В шаблоне бага есть поля для версии, темы и шагов воспроизведения — так починим быстрее.

### 🗺 Дальше в планах

- экспорт/импорт сцены в JSON;
- откат на любой из снимков истории;
- связь с лорбуками и карточками персонажей;
- прогноз погоды на несколько дней вперёд.

### 📜 Лицензия

**MIT** © 2026 Selena's Tavern (satsvi97) — см. [LICENSE](LICENSE).

Можно свободно использовать, изменять, распространять и встраивать в свои проекты, при условии сохранения уведомления об авторстве.

> ✦ Сделано с любовью для **Selena's Tavern** ✦

---

## ☾ Українська

> *«Палац Ночі, покої Ризанду. Ранок. Крихке перемир'я. За дверима чекає Фейра.»*

**Scene Panel** — це маленька гримуарна панель для рольових ігор: вона пам'ятає, **де** ви, **коли**, **хто поруч**, **що висить** і **яким тоном** звучить сцена. Стан живе **всередині чату**, тому кожна історія має власний календар і власну сцену — вони не змішуються.

Головна магія: ШІ може **сам** оновлювати сцену службовим тегом наприкінці відповіді. Тег вирізається з тексту — у чаті його не видно, а панель уже знає, що настав наступний день.

### ✨ Що вміє

| | Можливість | Опис |
|---|---|---|
| 📅 | **Календар** | Лічильник дня + назва місяця + кількість днів у місяці (5–60). Клік по дню — перехід. |
| 📍 | **Місце** | Вільний рядок: «Палац Ночі, покої Ризанду». |
| 🕐 | **Час доби** | Вільний текст + швидкі чипи: світанок · ранок · день · вечір · захід · ніч. |
| 🌦 | **Погода** | Вільний текст; за наявності Weather Background вмикає фон сцени. |
| 👥 | **Хто поруч** | Список персонажів. Під полем — чипи `＋ Ім'я` з останніх повідомлень. |
| ⚡ | **Відкриті нитки** | Що висить і чекає розвитку (по одній на рядок). |
| 🌫 | **Тон сцени** | Емоційна рамка: «крихке перемир'я», «холодна лють». |
| 🏷 | **Дод. поля** | Будь-які `ключ=значення` — теж потрапляють у промпт. |
| ⏱ | **Лічильник сесії** | День + `ГГ:ХХ`, кнопки `− година / + година / − день / + день`. |
| 🧠 | **Інжект у промпт** | Стан сцени автоматично вставляється в контекст (роль на вибір). |
| 🩺 | **Діагностика** | Відновлення сцени з останніх повідомлень або зі знімка. |
| 📊 | **Статистика** | Окрема сторінка: оновлення, часті персонажі, місця, час, погода. |
| 🎨 | **Тема** | Авто / темна / світла (бузкова). |
| 🌐 | **Мова панелі** | Перемикач RU · UK · SV · EN у шапці, поруч із лічильником дня. |
| ✨ | **Естетика** | Місячний пил на тлі, плаваюча картка, дрейф по екрану. |

### 🌙 Встановлення

**Через URL (рекомендовано):**

1. Відкрийте SillyTavern → **Extensions** → **Install extension**.
2. Вставте адресу:
   ```
   https://github.com/satsvi97/scene-panel
   ```
3. Перезавантажте сторінку таверни (`F5`, під час оновлення — `Ctrl+F5`).
4. У меню **Extensions** з'явиться блок **✦ SCENE PANEL ✦**.

**Вручну:**

Скопіюйте теку в:

```
SillyTavern/public/scripts/extensions/third-party/scene-panel
```

і перезавантажте таверну.

> ☾ Розширення не потребує серверних модулів і нічого не пише у файли — лише в `chat_metadata` поточного чату.

### 🌌 Як користуватися

**1. Відкрити панель.** Кнопка **«відкрити панель сцени»** в меню розширень, іконка **☾** у верхній панелі таверни або гаряча клавіша **Alt+Shift+S**.

**2. Заповнити сцену.** Усе можна вписати вручну: день, місце, час, погоду, хто поруч, нитки, тон, дод. поля. Зміни зберігаються миттєво.

**3. Дозволити ШІ оновлювати.** Наприкінці відповіді модель пише службовий рядок:

```
[[scene: день=+1; місце=Палац Ночі; час=ранок; поруч=Ризанд, Фейра; висить=розмова з Фейрою; погода=дощ; тон=крихке перемир'я]]
```

Рядок **зникає з тексту**, а поля панелі оновлюються. Якщо модель не написала тег — панель просто залишається ручною, нічого не ламається.

**4. Свайп.** Усередині панелі свайп **вліво** відкриває статистику, свайп **вправо** повертає до сцени. На ПК — кнопка **📊** у шапці або крапки-індикатори внизу.

### 🏷 Формат тегу

Ключі можна писати українською, російською або англійською; розділювач — `;` (допускається `:`).

| Українська | English | Значення |
|---|---|---|
| `день` | `day` | число, або `+1` / `наступний` (`+1` = наступний день) |
| `дата` | `date` | вільний рядок |
| `місце` | `place`, `де` | вільний рядок |
| `час` | `time`, `timeofday` | `ранок`, `ніч`, … |
| `погода` | `weather` | `дощ`, `гроза`, `сніг`, `ясно`, … |
| `поруч` | `present`, `хто` | імена через кому |
| `висить` | `open`, `нитки`, `threads` | через `;` або `\|` |
| `тон` | `mood` | вільний рядок |

Усе, що не збіглося з ключами вище, зберігається як **дод. поле** (`сюжет=погоня`, `напруга=висока`). Службовий ключ `время_сессии` ігнорується.

### 🌦 Інтеграція з Weather Background

Якщо встановлено розширення [Weather Background](https://github.com/tankisthuieglot-hue/sillytavern-weather-background), панель уміє вмикати його фон за погодою сцени:

`дощ → rain` · `гроза → thunderstorm` · `сніг → snow` · `завірюха → blizzard` · `хмарно → cloudy` · `сонячно → sunny` · `град → hail` · `ясно → clear`

- вмикається галочкою **«🌦 фон погоди (Weather Background)»**;
- враховує налаштування самого Weather Background (вимкнено / мобільний режим);
- якщо Weather Background не встановлено — панель тихо працює без нього.

### 🩺 Діагностика та історія

- Під час кожної зміни сцени зберігається **знімок** (до 20 останніх, у `chat_metadata`).
- Кнопка **«перевірити й відновити»**:
  1. сканує останні **12 повідомлень** на теги `[[scene: …]]`;
  2. якщо тегів немає — бере **останній знімок**;
  3. показує результат під кнопкою: `Тегів: N. Знімків: M. ✅ Відновлено з …`.
- Знімок робиться й **перед кнопкою «скинути»** — тож випадкове скидання можна відкотити.

### 📊 Статистика

Окрема сторінка панелі рахує для цього чату:

- кількість оновлень сцени й максимальний день;
- найчастіших персонажів «поруч»;
- часті місця, час доби й погоду.

Кнопки **«оновити»** та **«очистити»**. Дані зберігаються окремо від сцени — скидання сцени статистику не стирає.

### ⚙️ Налаштування

| Налаштування | Що робить |
|---|---|
| **розширення увімкнено** | Головний вимикач. |
| **вставляти сцену в промпт** | Додає стан сцени в контекст. |
| **роль інжекту** | `system` / `user` / `assistant`. |
| **🎨 тема панелі** | `авто` (за фоном таверни) / `темна` / `світла`. |
| **плаваюча панель у чаті** | Компактна картка в куті (її можна тягати мишею). |
| **🌦 фон погоди (Weather Background)** | Зв'язок із розширенням погоди. |

### 💾 Де зберігаються дані

| Ключ | Вміст |
|---|---|
| `chat_metadata.scene_panel` | Поточна сцена чату |
| `chat_metadata.scene_panel_history` | Знімки (до 20) |
| `chat_metadata.scene_panel_stats` | Статистика |
| `extension_settings.scene_panel` | Налаштування розширення |

У кожного чату — своя сцена, своя історія й своя статистика.

### 🛠 Якщо щось пішло не так

- **Не видно оновлення?** Перевірте версію — вона написана **в правому нижньому куті панелі** (`v0.10.1`). Потім `Ctrl+F5` і перезапуск таверни.
- **Помилка `Need to specify how to reconcile divergent branches` під час оновлення.** Історія git розійшлася: видаліть розширення й встановіть заново за URL.
- **Панель відкрилася «не тією» розміткою.** Жорстке оновлення (`Ctrl+F5`); якщо повторюється — перевстановлення.
- **Погода не змінює фон.** Перевірте, що Weather Background увімкнено і в його налаштуваннях не стоїть «постійний ефект none».

### 🐞 Баги та ідеї

- 🐞 [Повідомити про баг](https://github.com/satsvi97/scene-panel/issues/new?template=bug_report.yml)
- ✨ [Запропонувати ідею](https://github.com/satsvi97/scene-panel/issues/new?template=feature_request.yml)
- 📋 [Усі задачі та баги](https://github.com/satsvi97/scene-panel/issues)

У шаблоні бага є поля для версії, теми та кроків відтворення — так виправимо швидше.

### 🗺 Далі в планах

- експорт/імпорт сцени в JSON;
- відкат на будь-який зі знімків історії;
- зв'язок із лорбуками та картками персонажів;
- прогноз погоди на кілька днів уперед.

### 📜 Ліцензія

**MIT** © 2026 Selena's Tavern (satsvi97) — див. [LICENSE](LICENSE).

Можна вільно використовувати, змінювати, поширювати й вбудовувати у свої проєкти за умови збереження повідомлення про авторство.

> ✦ Зроблено з любов'ю для **Selena's Tavern** ✦

---

## ☾ Svenska

> *"Nattpalatset, Rhysands gemak. Morgon. En skör vapenvila. Feyre väntar utanför dörren."*

**Scene Panel** är en liten grimoire-lik panel för rollspel: den minns **var** ni är, **när**, **vilka som är nära**, **vilka trådar som hänger** och **vilken ton** scenen har. Tillståndet lever **inuti chatten**, så varje berättelse har sin egen kalender och sin egen scen — de blandas aldrig.

Huvudmagin: AI:n kan **själv** uppdatera scenen med en servicetagg i slutet av svaret. Taggen klipps bort från texten — du ser den aldrig i chatten, men panelen vet redan att nästa dag har kommit.

### ✨ Funktioner

| | Funktion | Beskrivning |
|---|---|---|
| 📅 | **Kalender** | Dagsräknare + månadsnamn + antal dagar per månad (5–60). Klicka på en dag för att hoppa. |
| 📍 | **Plats** | Fri text: "Nattpalatset, Rhysands gemak". |
| 🕐 | **Tid på dygnet** | Fri text + snabbchips: gryning · morgon · dag · kväll · solnedgång · natt. |
| 🌦 | **Väder** | Fri text; styr Weather Background-effekten när den är installerad. |
| 👥 | **Närvarande** | Karaktärslista. Chips `＋ Namn` dyker upp från senaste meddelanden. |
| ⚡ | **Öppna trådar** | Vad som hänger och väntar (en per rad). |
| 🌫 | **Scenens ton** | Känslomässig ram: "skör vapenvila", "kall vrede". |
| 🏷 | **Egna fält** | Alla `nyckel=värde` — injiceras också i prompten. |
| ⏱ | **Sessionsklocka** | Dag + `HH:MM`, knappar `− timme / + timme / − dag / + dag`. |
| 🧠 | **Promptinjektion** | Scenens tillstånd läggs i kontexten (roll valbar). |
| 🩺 | **Diagnostik** | Återställer scenen från senaste meddelanden eller från en ögonblicksbild. |
| 📊 | **Statistik** | Egen sida: uppdateringar, vanligaste karaktärer, platser, tider, väder. |
| 🎨 | **Tema** | Auto / mörkt / ljust (lila). |
| 🌐 | **Panelspråk** | Växlare RU · UK · SV · EN i huvudet, bredvid dagsräknaren. |
| ✨ | **Estetik** | Månstoft i bakgrunden, flytande kort, dragbar panel. |

### 🌙 Installation

**Via URL (rekommenderas):**

1. Öppna SillyTavern → **Extensions** → **Install extension**.
2. Klistra in:
   ```
   https://github.com/satsvi97/scene-panel
   ```
3. Ladda om tavernan (`F5`, eller `Ctrl+F5` efter en uppdatering).
4. Blocket **✦ SCENE PANEL ✦** dyker upp i **Extensions**.

**Manuellt:**

Kopiera mappen till:

```
SillyTavern/public/scripts/extensions/third-party/scene-panel
```

och starta om SillyTavern.

> ☾ Inga servermoduler krävs. Inget skrivs till disk — bara till aktuell chats `chat_metadata`.

### 🌌 Så använder du den

**1. Öppna panelen.** Knappen **"öppna scenpanelen"** i Extensions, ikonen **☾** i tavernans överkant, eller snabbtangenten **Alt+Shift+S**.

**2. Fyll i scenen.** Allt kan skrivas för hand: dag, plats, tid, väder, närvarande, trådar, ton, egna fält. Ändringar sparas direkt.

**3. Låt AI:n uppdatera den.** I slutet av ett svar skriver modellen:

```
[[scene: day=+1; place=Night Palace; time=morning; present=Rhysand, Feyre; open=talk with Feyre; weather=rain; mood=fragile truce]]
```

Raden **försvinner från texten** och panelen uppdateras. Om modellen inte skriver någon tagg stannar panelen helt enkelt i manuellt läge — inget går sönder.

**4. Svep.** Svep **vänster** inuti panelen för statistik, svep **höger** för att återgå till scenen. På desktop: knappen **📊** i huvudet eller prickarna längst ned.

### 🏷 Taggformat

Nycklar kan skrivas på svenska, ryska eller engelska; avgränsare är `;` (`:` fungerar också).

| Svenska | English | Värde |
|---|---|---|
| `dag` | `day` | tal, eller `+1` / `nästa` |
| `datum` | `date` | fri text |
| `plats` | `place` | fri text |
| `tid` | `time`, `timeofday` | `morgon`, `natt`, … |
| `väder` | `weather` | `regn`, `åska`, `snö`, `klart`, … |
| `närvarande` | `present` | namn separerade med komma |
| `trådar` | `open`, `threads` | separerade med `;` eller `\|` |
| `ton` | `mood` | fri text |

Allt som inte matchar nycklarna ovan sparas som **eget fält** (`handling=jakt`, `spänning=hög`). Servicenyckeln `время_сессии` ignoreras.

### 🌦 Weather Background-integration

Om [Weather Background](https://github.com/tankisthuieglot-hue/sillytavern-weather-background) är installerat kan panelen styra dess bakgrund från scenens väder:

`regn → rain` · `åska → thunderstorm` · `snö → snow` · `snöstorm → blizzard` · `mulet → cloudy` · `soligt → sunny` · `hagel → hail` · `klart → clear`

- aktiveras med kryssrutan **"🌦 vederbakgrund (Weather Background)"**;
- respekterar Weather Backgrounds egna inställningar (avstängt / mobilläge);
- om Weather Background saknas fungerar panelen tyst utan den.

### 🩺 Diagnostik och historik

- Varje scenändring sparar en **ögonblicksbild** (upp till 20, i `chat_metadata`).
- Knappen **"kontrollera och återställ"**:
  1. skannar de senaste **12 meddelandena** efter `[[scene: …]]`-taggar;
  2. om inga taggar finns tar den **senaste ögonblicksbilden**;
  3. visar resultatet under knappen: `Taggar: N. Ögonblicksbilder: M. ✅ Återställt från …`.
- En ögonblicksbild tas också **före "återställ"**, så en oavsiktlig nollställning kan ångras.

### 📊 Statistik

En egen sida i panelen, räknad per chatt:

- antal scenuppdateringar och högsta dag;
- vanligaste karaktärerna i "närvarande";
- vanliga platser, tider på dygnet och väder.

Knappar **uppdatera** och **rensa**. Statistiken ligger separat från scenen — att nollställa scenen raderar den inte.

### ⚙️ Inställningar

| Inställning | Effekt |
|---|---|
| **tillägget aktiverat** | Huvudbrytare. |
| **injicera scenen i prompten** | Lägger scenens tillstånd i kontexten. |
| **injektionsroll** | `system` / `user` / `assistant`. |
| **🎨 panelens tema** | `auto` (från tavernans bakgrund) / `mörkt` / `ljust`. |
| **flytande panel i chatten** | Kompakt dragbart kort i hörnet. |
| **🌦 vederbakgrund** | Koppling till Weather Background. |

### 💾 Var data lagras

| Nyckel | Innehåll |
|---|---|
| `chat_metadata.scene_panel` | Chattens aktuella scen |
| `chat_metadata.scene_panel_history` | Ögonblicksbilder (upp till 20) |
| `chat_metadata.scene_panel_stats` | Statistik |
| `extension_settings.scene_panel` | Tilläggets inställningar |

Varje chatt har sin egen scen, historik och statistik.

### 🛠 Felsökning

- **Ingen uppdatering syns?** Kontrollera versionen **i panelens nedre högra hörn** (`v0.10.1`), kör sedan `Ctrl+F5` och starta om tavernan.
- **`Need to specify how to reconcile divergent branches` vid uppdatering.** Git-historiken har divergerat: ta bort tillägget och installera om via URL.
- **Panelen öppnades med fel layout.** Hård uppdatering (`Ctrl+F5`); upprepas det — installera om.
- **Vädret ändrar inte bakgrunden.** Kontrollera att Weather Background är aktiverat och att dess "permanent effekt" inte är satt till none.

### 🐞 Buggar och idéer

- 🐞 [Rapportera en bugg](https://github.com/satsvi97/scene-panel/issues/new?template=bug_report.yml)
- ✨ [Föreslå en idé](https://github.com/satsvi97/scene-panel/issues/new?template=feature_request.yml)
- 📋 [Alla ärenden och buggar](https://github.com/satsvi97/scene-panel/issues)

Buggmallen har fält för version, tema och reproduktionssteg — då går det snabbare att fixa.

### 🗺 Vägkarta

- export/import av scenen som JSON;
- återställning till valfri ögonblicksbild;
- integration med lorebooks och karaktärskort;
- flera dagars väderprognos.

### 📜 Licens

**MIT** © 2026 Selena's Tavern (satsvi97) — se [LICENSE](LICENSE).

Fritt att använda, ändra, distribuera och bädda in i egna projekt, förutsatt att upphovsrättsmeddelandet behålls.

> ✦ Skapad med kärlek för **Selena's Tavern** ✦

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
| 🌐 | **Panel language** | RU · UK · SV · EN switcher in the header, next to the day counter. |
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

Keys may be Russian, Ukrainian, Swedish or English; separator is `;` (`:` also works).

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

- **No update visible?** Check the version shown **in the bottom-right corner of the panel** (`v0.10.1`), then `Ctrl+F5` and restart the tavern.
- **`Need to specify how to reconcile divergent branches` on update.** The git history diverged: delete the extension and reinstall it via URL.
- **Panel opened with the wrong layout.** Hard refresh (`Ctrl+F5`); if it repeats — reinstall.
- **Weather doesn't change the background.** Make sure Weather Background is enabled and its "permanent effect" is not set to none.

### 🐞 Bugs & ideas

- 🐞 [Report a bug](https://github.com/satsvi97/scene-panel/issues/new?template=bug_report.yml)
- ✨ [Suggest a feature](https://github.com/satsvi97/scene-panel/issues/new?template=feature_request.yml)
- 📋 [All issues and bugs](https://github.com/satsvi97/scene-panel/issues)

The bug template asks for version, theme and reproduction steps — that makes fixes much faster.

### 🗺 Roadmap

- scene export/import as JSON;
- rollback to any snapshot in history;
- lorebook and character card integration;
- multi-day weather forecast.

### 📜 License

**MIT** © 2026 Selena's Tavern (satsvi97) — see [LICENSE](LICENSE).

Free to use, modify, redistribute and embed in your own projects, provided the copyright notice is preserved.

> ✦ Made with love for **Selena's Tavern** ✦
