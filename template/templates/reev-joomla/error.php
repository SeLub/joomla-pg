<?php
/**
 * @package     Reev Joomla Template
 * @copyright   2026 Alice
 * @license     GNU/GPL
 */

defined('_JEXEC') or die;

use Joomla\CMS\HTML\HTMLHelper;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Uri\Uri;

/** @var \Joomla\CMS\Document\ErrorDocument $this */

$wa = $this->getWebAssetManager();
$wa->useStyle('template.style')->useScript('template.script');
?>
<!DOCTYPE html>
<html lang="<?php echo $this->language; ?>" dir="<?php echo $this->direction; ?>">
<head>
    <jdoc:include type="metas" />
    <jdoc:include type="styles" />
    <jdoc:include type="scripts" />
    <title><?php echo Text::_('JERROR_LAYOUT_PAGE_NOT_FOUND'); ?> - <?php echo $this->error->getCode(); ?></title>
</head>
<body>
    <div style="text-align:center;padding:2rem;font-family:system-ui,sans-serif;">
        <h1 style="font-size:4rem;color:#0066cc;margin:0;"><?php echo htmlspecialchars($this->error->getCode(), ENT_QUOTES, 'UTF-8'); ?></h1>
        <p style="font-size:1.25rem;margin:1rem 0;"><?php echo htmlspecialchars($this->error->getMessage(), ENT_QUOTES, 'UTF-8'); ?></p>
        <a href="<?php echo Uri::base(); ?>" style="display:inline-block;margin-top:1.5rem;padding:0.75rem 1.5rem;background:#0066cc;color:white;text-decoration:none;border-radius:4px;">
            <?php echo Text::_('JERROR_LAYOUT_GO_TO_THE_HOME_PAGE'); ?>
        </a>
    </div>
</body>
</html>