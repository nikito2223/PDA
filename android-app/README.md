# PDA Native Android

Нативное Android-приложение (без WebView), перенесённое с логики `index.html + js + css` в мобильный интерфейс:

- **Карта** (OSM/osmdroid) с метками тайников;
- **Тайники** (список);
- **Дневник** (локальные записи);
- **Группировки** (список).

## Откуда данные
Часть данных загружается с сервера (Supabase):
- `stashes` для карты и раздела тайников;
- `factions` для раздела группировок.

## Совместимость
- Android 8.0+ (`minSdk 26`).

## Запуск локально
1. Открой папку `android-app` в Android Studio.
2. Дождись синхронизации Gradle.
3. Нажми **Run** на реальном телефоне.

## Автосборка APK в Releases
Workflow `.github/workflows/android-release-apk.yml`:
- на `Release published` собирает `app-release.apk`;
- прикрепляет APK к релизу;
- вручную через `workflow_dispatch` — загружает APK в Artifacts.
