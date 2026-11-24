# Анкета заявки на продакшн (Play Console) — ответы по факту

Подать ~1.12 (после 14 дней при ≥12 участниках). Отличия от шаблона Testers Community: убраны выдуманные «опросы и сессии юзабилити», «Share/Rate» — только после выхода 0.8.4. Перед отправкой сверить с `publish/closed-test-log.md`.

1) Как набирали тестеров?
We used a paid testing provider (Testers Community, 15 testers) and added our own email list. Testers installed the app from the closed-test link on their own Android devices.

2) Насколько легко было набрать? — Easy.

3) Вовлечённость тестеров
Testers installed the app, used it on different devices and Android versions, and a testing provider's report summarised their findings. Their feedback led directly to concrete changes (below). Engagement was moderate: Google counted 12 active participants throughout the test.

4) Сводка отзывов и как собирали
Feedback was collected through the testing provider's feedback report and the Play Console tester feedback channel. Findings: no crashes or critical bugs; suggestions to add a first-launch walkthrough, improve the store description (keywords such as grocery list, offline shopping), make store screenshots feature-focused with captions, and add “Share the app” and “Rate the app” options. A tester also noted that an item could not be moved out of the “Other” category.

5) Целевая аудитория
Everyday shoppers, families and busy people who want a simple, ad-free shopping list that works fully offline, with planning by day, budget and reminders. Languages: Russian, Kazakh, English.

6) Какую ценность даёт приложение
Fast offline shopping lists: quick multi-item entry, planning by day and calendar, reminders, prices and budget, built-in product catalog and saved dishes, a “In the store” mode, backup to a file. No account, no ads; data stays on the device.

7) Ожидаемые установки за первый год — 1k–10k (честнее, чем 10k–100k; выбрать самому).

8) Что изменили по итогам теста
Version 0.8.3: first-launch intro screen with the key features; new keyword-rich store description in 3 languages; new store screenshots with benefit captions; a “⋮” button on each item row and “＋ Custom category” first in the category row (fixes the “can't move item out of Other” complaint); sharing a list as “Whole list” or “Only not bought”. Version 0.8.4: “Share the app” and “Rate the app” in Settings → About; budget remaining/overspend on the card and reminder time (0.8.2).

9) Почему приложение готово к продакшну
No crashes or critical issues reported over 14 days of closed testing on various devices; the changes requested by testers were implemented; all store declarations, privacy policy and terms are published; the release is a signed, minified AAB for arm64.

10) Что сделали иначе
Beyond the required 12 testers we used the provider's detailed report and a feedback log, prioritised changes by tester feedback, and shipped three updates (0.8.1–0.8.3) plus 0.8.4 during the test.
