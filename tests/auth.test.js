// The signed edit cookie (public/edit/auth.php), exercised through the php CLI.
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const AUTH = path.join(__dirname, '..', 'public', 'edit', 'auth.php');
const secretFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lp-auth-')), 'secret');

function php(code, env = {}) {
  return execFileSync('php', ['-r', `require ${JSON.stringify(AUTH)}; ${code}`], { env: { ...process.env, LP_SECRET_FILE: secretFile, ...env } }).toString().trim();
}

test('a freshly signed cookie is accepted', () => {
  assert.equal(php("$_COOKIE[EDIT_COOKIE] = edit_sign('uli', time() + 100); echo edit_cookie_ok() ? 'yes' : 'no';"), 'yes');
});
test('a tampered, expired or missing cookie is refused', () => {
  assert.equal(php("$c = edit_sign('uli', time() + 100); $_COOKIE[EDIT_COOKIE] = str_replace('uli', 'eve', $c); echo edit_cookie_ok() ? 'yes' : 'no';"), 'no');
  assert.equal(php("$_COOKIE[EDIT_COOKIE] = edit_sign('uli', time() - 1); echo edit_cookie_ok() ? 'yes' : 'no';"), 'no');
  assert.equal(php("echo edit_cookie_ok() ? 'yes' : 'no';"), 'no');
  assert.equal(php("$_COOKIE[EDIT_COOKIE] = 'a|b'; echo edit_cookie_ok() ? 'yes' : 'no';"), 'no');
});
test('a cookie signed with another secret is refused', () => {
  const other = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lp-auth-')), 'secret');
  const c = php("echo edit_sign('uli', time() + 100);", { LP_SECRET_FILE: other });
  assert.equal(php(`$_COOKIE[EDIT_COOKIE] = ${JSON.stringify(c)}; echo edit_cookie_ok() ? 'yes' : 'no';`), 'no');
});
test('the secret file is created once and kept private', () => {
  php("edit_secret();");
  const mode = fs.statSync(secretFile).mode & 0o777;
  assert.equal(mode, 0o600);
  const first = fs.readFileSync(secretFile, 'utf8');
  php("edit_secret();");
  assert.equal(fs.readFileSync(secretFile, 'utf8'), first);
});
test('with EDIT_COOKIE_ONLY a bare Authorization header does not count as signed in', () => {
  assert.equal(php("$_SERVER['HTTP_AUTHORIZATION'] = 'Basic x'; echo edit_signed_in() ? 'yes' : 'no';"), 'yes');
  assert.equal(php("$_SERVER['HTTP_AUTHORIZATION'] = 'Basic x'; $_SERVER['EDIT_COOKIE_ONLY'] = '1'; echo edit_signed_in() ? 'yes' : 'no';"), 'no');
});
