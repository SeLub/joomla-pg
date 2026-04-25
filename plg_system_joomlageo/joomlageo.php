<?php
defined('_JEXEC') or die;

use Joomla\CMS\Plugin\CMSPlugin;
use Joomla\CMS\Http\HttpFactory;
use Joomla\CMS\Log\Log;

class PlgSystemJoomlageo extends CMSPlugin
{
    protected $app;

    /**
     * Срабатывает ПОСЛЕ сохранения пользователя
     * @param array  $user    Массив данных пользователя
     * @param bool   $isNew   true если это регистрация
     * @param bool   $success Успешно ли сохранение
     * @param string $msg     Сообщение от системы
     */
    public function onUserAfterSave($user, $isNew, $success, $msg): bool
    {
        // Реагируем только на новую успешную регистрацию
        if (!$isNew || !$success) {
            return true;
        }

        $apiUrl    = $this->params->get('api_url', 'http://joomla-api:3000/api/v1/users/provision');
        $timeout   = (int) $this->params->get('timeout', 3);
        $logLevel  = $this->params->get('log_level', 'warning');

        try {
            $http = HttpFactory::getHttp();
            
            $payload = json_encode([
                'joomlaUserId' => (int) $user['id'],
                'email'        => $user['email'],
                'username'     => $user['username']
            ]);

            $headers = ['Content-Type' => 'application/json'];
            
            $response = $http->post($apiUrl, $payload, $headers, $timeout);

            if ($response->code >= 200 && $response->code < 300) {
                Log::add("JoomlaGeo: User {$user['id']} provisioned successfully.", Log::INFO, 'joomlageo');
            } else {
                Log::add("JoomlaGeo: API returned HTTP {$response->code} for user {$user['id']}.", Log::WARNING, 'joomlageo');
            }
        } catch (\Throwable $e) {
            // ⚠️ КРИТИЧНО: НИКОГДА не прерываем регистрацию из-за ошибок интеграции
            Log::add("JoomlaGeo: Provision failed for user {$user['id']}: " . $e->getMessage(), Log::ERROR, 'joomlageo');
        }

        return true;
    }
}