<?php
defined('_JEXEC') or die;

class Reev_JoomlaInstallerScript
{
    public function install($parent) {
        return true;
    }
    
    public function update($parent) {
        return true;
    }
    
    public function uninstall($parent) {
        return true;
    }
    
    public function preflight($type, $parent) {
        return true;
    }
    
    public function postflight($type, $parent) {
        // Очистка кэша после установки
        \Joomla\CMS\Factory::getCache()->clean('com_templates');
        return true;
    }
}