#!/bin/bash
# Снимает com.apple.quarantine с .dmg/.app рядом со скриптом.
# Нужен, если приложение попало на Mac не локальной сборкой, а скачано/перенесено
# (например, артефакт из GitHub Actions) — тогда Gatekeeper считает ad-hoc подпись
# недоверенной и пишет "Приложение повреждено, переместите в корзину".
DIR="$(cd "$(dirname "$0")" && pwd)"
TARGETS=$(find "$DIR" -maxdepth 4 \( -name "*.dmg" -o -name "*.app" \))

if [ -z "$TARGETS" ]; then
  echo "Не найдено .dmg или .app рядом со скриптом."
  read -p "Нажмите Enter, чтобы закрыть..."
  exit 1
fi

echo "$TARGETS" | while IFS= read -r f; do
  xattr -cr "$f"
  echo "Карантин снят: $f"
done

read -p "Готово. Нажмите Enter, чтобы закрыть..."
