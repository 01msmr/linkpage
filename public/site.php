<?php
// Serves edit/site.json; seeds it from seeds/default.json on first call.
header('Content-Type: application/json');
header('Cache-Control: no-cache');
$file = __DIR__ . '/edit/site.json';
if (!is_file($file)) {
    @mkdir(__DIR__ . '/edit', 0755, true);
    @copy(__DIR__ . '/seeds/default.json', $file);
}
$json = @file_get_contents($file);
if ($json === false || json_decode($json) === null) {
    http_response_code(500);
    echo json_encode(['error' => 'site.json is missing or not valid JSON']);
    exit;
}
echo $json;
