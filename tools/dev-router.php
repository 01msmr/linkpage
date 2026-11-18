<?php
// Dev router: php -S 0.0.0.0:8080 -t public tools/dev-router.php (approximates the production .htaccess: maps slugs, does not hide docs/seeds/site.json).
const ROOT = __DIR__ . '/../public';
const MIME = ['html' => 'text/html', 'css' => 'text/css', 'js' => 'text/javascript', 'json' => 'application/json', 'svg' => 'image/svg+xml'];
header('Cache-Control: no-store');
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if (strpos($path, '..') !== false) { http_response_code(400); exit; }
$file = ROOT . $path;
if (preg_match('#\.php$#', $path) && is_file($file)) return false;
if (is_file($file)) {
    $ext = pathinfo($file, PATHINFO_EXTENSION);
    header('Content-Type: ' . (MIME[$ext] ?? 'application/octet-stream'));
    readfile($file);
    return true;
}
if ($path === '/' ) { header('Content-Type: text/html'); readfile(ROOT . '/index.html'); return true; }
$query = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY) ?? '';
if (!is_dir($file) && strpos($path, '.') === false) {
    $page = preg_match('/(^|&)open(&|=|$)/', $query) ? '/go.html' : '/index.html';
    header('Content-Type: text/html'); readfile(ROOT . $page); return true;
}
return false;
