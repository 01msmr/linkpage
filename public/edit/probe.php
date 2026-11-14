<?php
// 200 only for a signed-in user (the browser sends cached credentials); 401 without a login prompt otherwise.
header('Cache-Control: no-store');
$user = $_SERVER['REMOTE_USER'] ?? $_SERVER['REDIRECT_REMOTE_USER'] ?? $_SERVER['PHP_AUTH_USER'] ?? '';
if ($user === '' && php_sapi_name() !== 'cli-server') {
    http_response_code(401);
    exit;
}
header('Content-Type: application/json');
echo '{"edit":true}';
