<?php
defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\HTML\HTMLHelper;

// 👇 Получаем Web Asset Manager
$wa = $this->getWebAssetManager();

// =============================================================================
// 🔥 РЕГИСТРАЦИЯ АССЕТОВ НАПРЯМУЮ (без joomla.asset.json)
// =============================================================================

// Подключаем стили
$wa->registerAndUseStyle(
    'template.style',              // ← Уникальное имя ассета (любое)
    'css/template.css',            // ← Путь ОТНОСИТЕЛЬНО media/templates/site/reev-joomla/
    [],                            // ← Зависимости (пусто = нет зависимостей)
    ['relative' => true],          // ← 🔥 КРИТИЧНО: путь относительный, не абсолютный!
    []                             // ← Атрибуты (пусто = стандартные)
);

// Подключаем скрипты
$wa->registerAndUseScript(
    'template.script',
    'js/app.js',
    ['core'],                      // ← Зависит от ядра Joomla
    [
        'type' => 'module',        // ← ES-модуль
        'relative' => true         // ← 🔥 КРИТИЧНО: путь относительный
    ],
    []
);

// =============================================================================
// Параметр для отладки позиций модулей
// =============================================================================
$showPositions = (bool) $this->params->get('showPositions', false);
$moduleStyle = $showPositions ? 'outline' : 'none';
?>
<!DOCTYPE html>
<html lang="<?php echo $this->language; ?>" dir="<?php echo $this->direction; ?>">
<head>
    <jdoc:include type="metas" />
    <jdoc:include type="styles" />
    <jdoc:include type="scripts" />
    

</head>
<body class="reev-template">
        <!-- Header -->
        <header class="site-header">
            <div class="container-reev">
                <div class="flex items-center justify-between h-16 md:h-20">
                    
                    <!-- Логотип -->
                    <div class="flex-shrink-0">
                        <?php if ($this->params->get('logoFile')): ?>
                            <a href="<?php echo $this->baseurl; ?>/">
                                <img src="<?php echo htmlspecialchars($this->params->get('logoFile'), ENT_QUOTES, 'UTF-8'); ?>" 
                                    alt="<?php echo htmlspecialchars($this->params->get('sitetitle', 'Reev'), ENT_QUOTES, 'UTF-8'); ?>"
                                    class="h-9 md:h-11 w-auto">
                            </a>
                        <?php else: ?>
                            <a href="<?php echo $this->baseurl; ?>/" 
                            class="text-xl md:text-2xl font-bold tracking-tight text-foreground hover:text-accent transition-colors">
                                <?php echo htmlspecialchars($this->params->get('sitetitle', 'Reev'), ENT_QUOTES, 'UTF-8'); ?>
                            </a>
                        <?php endif; ?>
                    </div>

                    <!-- Desktop Nav -->
                    <nav class="hidden md:block">
                        <jdoc:include type="modules" name="header" style="none" />
                    </nav>

                    <!-- Mobile Toggle -->
                    <button type="button" 
                            class="md:hidden p-2 rounded-lg text-fg-secondary hover:text-foreground hover:bg-accent-light/50 focus:outline-none focus:ring-2 focus:ring-accent"
                            id="mobile-menu-toggle"
                            aria-label="Toggle navigation"
                            aria-expanded="false">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                    </button>
                </div>
            </div>

            <!-- Mobile Drawer -->
            <div id="mobile-menu" class="md:hidden hidden border-t border-border" role="dialog" aria-modal="true">
                <div class="container-reev py-4">
                    <jdoc:include type="modules" name="header-mobile" style="none" />
                </div>
            </div>
        </header>

    <!-- Hero Section -->
    <?php if ($this->countModules('hero')): ?>
    <section class="hero-section">
        <jdoc:include type="modules" name="hero" style="<?php echo $positionStyle; ?>" />
    </section>
    <?php endif; ?>

    <!-- Main Content -->
    <main class="site-main">
        <?php if ($this->countModules('content-top')): ?>
        <div class="content-top">
            <jdoc:include type="modules" name="content-top" style="<?php echo $positionStyle; ?>" />
        </div>
        <?php endif; ?>
        
        <jdoc:include type="message" />
        <jdoc:include type="component" />
        
        <?php if ($this->countModules('content-bottom')): ?>
        <div class="content-bottom">
            <jdoc:include type="modules" name="content-bottom" style="<?php echo $positionStyle; ?>" />
        </div>
        <?php endif; ?>
    </main>

    <!-- Footer -->
    <footer class="site-footer">
        <?php if ($this->countModules('footer-widgets')): ?>
        <div class="footer-widgets">
            <jdoc:include type="modules" name="footer-widgets" style="<?php echo $positionStyle; ?>" />
        </div>
        <?php endif; ?>
        
        <div class="copyright-bar">
            <jdoc:include type="modules" name="copyright" style="<?php echo $positionStyle; ?>" />
        </div>
    </footer>

    <!-- Debug positions -->
    <jdoc:include type="modules" name="debug" style="none" />
</body>
</html>