# PDA Web Android

Минимальное Android-приложение на Kotlin с красивой оберткой вокруг WebView для открытия:

`http://nikito2223.github.io/PDA/`

## Что внутри
- Градиентный фон и Material 3 тема.
- Карточка с WebView.
- Индикатор загрузки и pull-to-refresh.
- Поддержка кнопки "Назад" внутри WebView.
- Поддержка Android 8.0+ (minSdk 26).
- Разрешен `http`-доступ к `nikito2223.github.io` (иначе страница может не открыться в WebView на новых версиях Android).

## Запуск локально
1. Открой папку `android-app` в Android Studio (Hedgehog+).
2. Дождись синхронизации Gradle.
3. Нажми **Run**.

## Автосборка APK в Releases
В репозитории добавлен workflow `.github/workflows/android-release-apk.yml`:
- при публикации GitHub Release автоматически собирается `app-release.apk`;
- APK автоматически прикрепляется к релизу;
- workflow также можно запустить вручную через `workflow_dispatch`.
