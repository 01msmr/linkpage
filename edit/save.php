<?php
// POST a JSON body: keeps the previous file as site.bak.json, then swaps atomically.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
$body = file_get_contents('php://input');
if (json_decode($body) === null) { http_response_code(400); exit; }
$file = __DIR__ . '/site.json';
if (is_file($file)) copy($file, __DIR__ . '/site.bak.json');
$tmp = tempnam(__DIR__, 'site-');
if ($tmp === false || file_put_contents($tmp, $body) === false || !rename($tmp, $file)) {
    http_response_code(500);
    exit;
}
chmod($file, 0644);
echo 'OK';
