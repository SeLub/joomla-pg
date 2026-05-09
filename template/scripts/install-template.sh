#!/bin/bash
set -e

# 🔍 Авто-определение корня проекта
# Ищем папку, где лежит package.json с нашим проектом
if [ -f "package.json" ] && grep -q "reev-joomla-template" package.json 2>/dev/null; then
  # Запущены из template/
  PROJECT_ROOT="."
elif [ -f "../package.json" ] && grep -q "reev-joomla-template" ../package.json 2>/dev/null; then
  # Запущены из joomla-pg/
  PROJECT_ROOT=".."
else
  echo "❌ Не удалось определить корень проекта."
  echo "💡 Запустите скрипт из joomla-pg/ или joomla-pg/template/"
  exit 1
fi

echo "📦 Корень проекта: $(cd "$PROJECT_ROOT" && pwd)"

ZIP="$PROJECT_ROOT/build/reev-joomla-template.zip"
CONTAINER="joomla-app"
TMP=$(mktemp -d)

# Очистка при выходе
trap "rm -rf $TMP" EXIT

echo "📦 Установка шаблона в $CONTAINER..."

# 1. Проверка архива
[ -f "$ZIP" ] || { echo "❌ Не найден: $ZIP"; echo "💡 Запустите сначала: npm run build && npm run zip"; exit 1; }

# 2. Распаковка
unzip -q "$ZIP" -d "$TMP"

echo "  → Копирование файлов шаблона..."

# Создаём целевую папку в контейнере
docker exec "$CONTAINER" mkdir -p /var/www/html/templates/reev-joomla

# Копируем основные файлы (они лежат в корне распакованного архива)
for file in index.php templateDetails.xml installer.script.php joomla.asset.json error.php; do
  if [ -f "$TMP/$file" ]; then
    docker cp "$TMP/$file" "$CONTAINER:/var/www/html/templates/reev-joomla/$file"
    echo "    ✓ $file"
  fi
done

echo "  → Копирование ассетов (media)..."
# Копируем всю папку media/ в правильное место
if [ -d "$TMP/media" ]; then
  docker cp "$TMP/media" "$CONTAINER:/var/www/html/"
  echo "    ✓ media/"
fi

echo "  → Исправление прав..."
# Исправляем владельца на www-data (стандартный пользователь Apache в образе Joomla)
docker exec "$CONTAINER" chown -R www-data:www-data \
  /var/www/html/templates/reev-joomla \
  /var/www/html/media/templates/site/reev-joomla 2>/dev/null || true

# Делаем файлы читаемыми (на случай проблем с правами)
docker exec "$CONTAINER" chmod -R a+rX \
  /var/www/html/templates/reev-joomla \
  /var/www/html/media/templates/site/reev-joomla 2>/dev/null || true

echo "  → Проверка целостности..."
# Проверяем, что главный файл доступен
if docker exec "$CONTAINER" test -r /var/www/html/templates/reev-joomla/templateDetails.xml 2>/dev/null; then
  echo "    ✓ templateDetails.xml доступен"
  # Проверяем валидность XML (если xmllint установлен в контейнере)
  if docker exec "$CONTAINER" which xmllint >/dev/null 2>&1; then
    if docker exec "$CONTAINER" xmllint --noout /var/www/html/templates/reev-joomla/templateDetails.xml 2>/dev/null; then
      echo "    ✓ XML валиден"
    else
      echo "    ⚠ XML может быть невалиден (проверьте вручную)"
    fi
  fi
else
  echo "    ❌ templateDetails.xml НЕ доступен!"
  echo "    Права внутри контейнера:"
  docker exec "$CONTAINER" ls -la /var/www/html/templates/reev-joomla/ 2>/dev/null || echo "    (папка пуста или нет доступа)"
  exit 1
fi

echo "  → Очистка кэша Joomla..."
docker exec "$CONTAINER" php /var/www/html/bin/joomla.php cache:clean --all 2>/dev/null || \
docker exec "$CONTAINER" php /var/www/html/bin/joomla.php cache:purge --all 2>/dev/null || \
echo "    ⚠ Не удалось очистить кэш (проверьте наличие CLI)"

echo "✅ Шаблон успешно установлен!"
echo ""
echo "🎨 Активация: System → Site Template Styles → reev-joomla → ⭐ Default"
echo "🔍 Если не появился: Extensions → Manage → Discover → Discover → Install"
echo "🌐 Проверка: http://localhost:80/?tp=1 (показать позиции модулей)"