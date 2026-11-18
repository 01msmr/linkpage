<?php
// Edit login: Apache's Basic auth (on index.php) issues a signed cookie; save.php and probe.php accept it afterwards.
const EDIT_COOKIE = 'lp_edit';
const EDIT_FLAG = 'linkpage-edit';
const EDIT_DAYS = 90;
const EDIT_FLAG_DAYS = 400;

function edit_secret() {
    $file = getenv('LP_SECRET_FILE') ?: __DIR__ . '/.secret';
    if (!is_file($file)) {
        @file_put_contents($file, bin2hex(random_bytes(32)), LOCK_EX);
        @chmod($file, 0600);
    }
    $secret = @file_get_contents($file);
    return $secret !== false && strlen($secret) >= 32 ? $secret : null;
}

function edit_sign($user, $exp) {
    $secret = edit_secret();
    if ($secret === null) return null;
    $body = preg_replace('/[^A-Za-z0-9._@-]/', '_', $user) . '|' . (int)$exp;
    return $body . '|' . hash_hmac('sha256', $body, $secret);
}

function edit_cookie_ok() {
    $parts = explode('|', $_COOKIE[EDIT_COOKIE] ?? '');
    if (count($parts) !== 3 || (int)$parts[1] < time()) return false;
    $secret = edit_secret();
    return $secret !== null && hash_equals(hash_hmac('sha256', $parts[0] . '|' . $parts[1], $secret), $parts[2]);
}

function edit_user() {
    return $_SERVER['REMOTE_USER'] ?? $_SERVER['REDIRECT_REMOTE_USER'] ?? $_SERVER['PHP_AUTH_USER'] ?? '';
}

// Signed in by Apache's Basic auth (user, or a bare Authorization header unless the file is exempt from it: EDIT_COOKIE_ONLY) or by the cookie.
function edit_signed_in() {
    $cookieOnly = !empty($_SERVER['EDIT_COOKIE_ONLY']) || !empty($_SERVER['REDIRECT_EDIT_COOKIE_ONLY']);
    if (edit_user() !== '' || (!$cookieOnly && !empty($_SERVER['HTTP_AUTHORIZATION']))) return true;
    return edit_cookie_ok();
}

function edit_issue_cookies($user) {
    $secure = !empty($_SERVER['HTTPS']) || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $exp = time() + EDIT_DAYS * 86400;
    $value = edit_sign($user !== '' ? $user : 'edit', $exp);
    if ($value !== null) setcookie(EDIT_COOKIE, $value, ['expires' => $exp, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict']);
    setcookie(EDIT_FLAG, '1', ['expires' => time() + EDIT_FLAG_DAYS * 86400, 'path' => '/', 'secure' => $secure, 'httponly' => false, 'samesite' => 'Lax']);
}
