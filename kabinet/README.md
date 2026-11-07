# Кабинет – дигитална таблица за зрение

Адрес: https://ioptics-bg.com/kabinet/ (не се индексира от търсачките).

## Настройка на Firebase (еднократно, ~10 минути)

1. Отворете https://console.firebase.google.com → **Add project** (например `ioptics-kabinet`). Google Analytics не е нужен.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
3. **Authentication → Settings → Authorized domains** → добавете `ioptics-bg.com`.
4. **Authentication → Templates** → по желание сменете езика на писмата на български.
5. **Build → Firestore Database → Create database** (регион `europe-west`, production mode).
   В раздел **Rules** поставете съдържанието на `firestore.rules` от тази папка и натиснете **Publish**.
6. **Project settings (зъбното колело) → Your apps → Web (`</>`)** → регистрирайте приложение.
   Копирайте `apiKey`, `authDomain`, `projectId`, `appId` във файла `kabinet/firebase-config.js`.

Регистрираните потребители се виждат в Authentication → Users (там може и да се изтриват или блокират).
В Firestore → `users` са имената, практиките и запазените настройки.

## Какво се пази в акаунта
- разстояние, огледален режим, означение, фон, показване на стойности;
- калибриране – отделно за всяка резолюция на екран (напр. `1920x1080`), за да не се бъркат различни телевизори.

## Управление
| Бутон | Действие |
|---|---|
| ▲ ▼ | по-голямо / по-малко (стъпка 0,1 logMAR) |
| ◀ ▶ | режим (таблица / ред / единичен знак, вид цел и т.н.) |
| OK | нови знаци |
| Назад | меню |
| 1–9 | директно към тест |
| червен / зелен / жълт / син | дуохром / букви / астигматизъм / крос цилиндър |
| Info или 0 | скрива/показва стойностите |

## Бележки
- Защитата е „мека“: без вход приложението не се показва, но файловете са публични в GitHub.
- В менюто на телевизора изключете overscan („Just Scan“, „Screen Fit“).
- Оптотипите Sloan са рисувани по решетка 5×5; цифрите използват шрифт Arial Bold.
