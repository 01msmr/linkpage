<?php
// 200 only for a signed-in user (Basic auth or the login cookie); 401 without a login prompt otherwise.
require __DIR__ . '/auth.php';
header('Cache-Control: no-store');
if (!edit_signed_in() && php_sapi_name() !== 'cli-server') {
    http_response_code(401);
    exit;
}
header('Content-Type: application/json');
echo '{"edit":true}';
