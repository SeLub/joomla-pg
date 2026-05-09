// build/zip-template.js
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..'); // Папка template/

const templateDir = path.join(PROJECT_ROOT, 'templates/reev-joomla');
const mediaDir = path.join(PROJECT_ROOT, 'media/templates/site/reev-joomla');
const buildDir = path.join(PROJECT_ROOT, 'build');
const outputZip = path.join(buildDir, 'reev-joomla-template.zip');

console.log('📦 Подготовка структуры архива для Joomla...');

// 1. Очистка staging-папки
const stagingDir = path.join(buildDir, '_staging');
if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });
fs.mkdirSync(stagingDir, { recursive: true });

// 2. Копируем PHP/XML/JSON в корень staging
const coreFiles = ['index.php', 'templateDetails.xml', 'installer.script.php', 'joomla.asset.json', 'error.php'];
coreFiles.forEach(file => {
  const src = path.join(templateDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(stagingDir, file));
    console.log(`  ✓ ${file}`);
  } else {
    console.warn(`  ⚠ Не найден: ${file}`);
  }
});

// 3. Копируем ассеты в ПРАВИЛЬНУЮ папку media/
const mediaDest = path.join(stagingDir, 'media', 'templates', 'site', 'reev-joomla');
fs.mkdirSync(mediaDest, { recursive: true });

['css', 'js', 'fonts'].forEach(dir => {
  const srcDir = path.join(mediaDir, dir);
  if (fs.existsSync(srcDir)) {
    const destDir = path.join(mediaDest, dir);
    fs.mkdirSync(destDir, { recursive: true });
    fs.readdirSync(srcDir).forEach(f => {
      if (!f.startsWith('.')) { // Игнорируем .vite
        const srcPath = path.join(srcDir, f);
        if (fs.statSync(srcPath).isDirectory()) {
          // Рекурсивное копирование для подпапок (например, fonts/Sora/)
          fs.cpSync(srcPath, path.join(destDir, f), { recursive: true });
        } else {
          fs.copyFileSync(srcPath, path.join(destDir, f));
        }
      }
    });
    console.log(`  ✓ media/.../${dir}/`);
  }
});

// 4. Архивируем staging
console.log('\n🗜️ Создание ZIP...');
try {
  execSync(`zip -rq "${outputZip}" .`, { cwd: stagingDir, stdio: 'inherit' });
  const stats = fs.statSync(outputZip);
  console.log(`\n✅ Архив создан: ${outputZip} (${(stats.size/1024).toFixed(1)} KB)`);
} catch (e) {
  console.error('❌ Ошибка zip:', e.message);
  if (e.status === 127) console.error('💡 Установите: sudo apt install zip');
  process.exit(1);
} finally {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}