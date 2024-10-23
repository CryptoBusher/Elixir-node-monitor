# Elixir-node-monitor

Простенький скрипт, который мониторит здоровье Elixir нод (/health).

## 🤔 Преимущества
1. Асинхронный код
2. Уведомления в телеграм

## ⚙️ Как подтягивать обновления
Для подтягивания обнов необходимо клонировать репозиторий на ваш ПК (а не качать архивом). Вам понадобится [GIT](https://git-scm.com/), но это того стоит.
```
git clone https://github.com/CryptoBusher/Elixir-node-monitor.git
```

После клонирования у вас появится папка с проектом, переходим в нее и производим настройки софта согласно инструкции в "Первый запуск". Для подтягивания обновлений, находясь в папке проекта, вписываем в терминале команду:
```
git pull
```

## 📚 Первый запуск
1. Устанавливаем [NodeJs](https://nodejs.org/en/download)
2. Скачиваем проект, в терминале, находясь в папке проекта, вписываем команду "npm i" для установки всех зависимостей
3. Меняем название файла "_servers.txt" на "servers.txt" и вбиваем туда свои сервера, каждый с новой строки в формате "name|host|port"
4. Меняем название файла ".env.example" на ".env", открываем через любой текстовый редактор и заполняем:
    1. TELEGRAM_API_KEY - токен Telegram бота для уведомлений (не обязательно)
    2. TELEGRAM_CHAT_ID - ID чата, в который будут слаться уведомления. Можно указать чат супергруппы в формате "supergroupId/threadId" (не обязательно)
5. Настраиваем интервал в "src/config.js" (по дефолту - 60 минут)
6. Запускаем скрипт командой "npm run start". Если запускаетесь на сервере - "npm run start:forever", тогда просмотреть лог можно в файле "out.log", а отслеживать в консоли прогресс можно командой "tail -f out.log".


## 💴 Донат
Если хочешь поддержать мой канал - можешь мне задонатить, все средства пойдут на развитие сообщества.
<b>0x77777777323736d17883eac36d822d578d0ecc80<b>