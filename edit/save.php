<?php
// POST a JSON body: keeps the previous file as site.bak.json, then swaps atomically.
function fail($code, $msg) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['error' => $msg]);
    exit;
}
$user = $_SERVER['REMOTE_USER'] ?? $_SERVER['REDIRECT_REMOTE_USER'] ?? $_SERVER['PHP_AUTH_USER'] ?? '';
$signedIn = $user !== '' || !empty($_SERVER['HTTP_AUTHORIZATION']);
if (!$signedIn && php_sapi_name() !== 'cli-server') fail(401, 'Not signed in.');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'POST only.');
$body = file_get_contents('php://input');
if (json_decode($body) === null) fail(400, 'Invalid JSON.');
$file = __DIR__ . '/site.json';
if (!is_writable(__DIR__)) fail(500, 'edit/ is not writable.');
if (is_file($file)) copy($file, __DIR__ . '/site.bak.json');
$tmp = tempnam(__DIR__, 'site-');
if ($tmp === false || file_put_contents($tmp, $body) === false || !rename($tmp, $file)) {
    if ($tmp !== false) @unlink($tmp);
    fail(500, 'Could not write site.json.');
}
chmod($file, 0644);
echo 'OK';
