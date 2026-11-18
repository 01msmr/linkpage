<?php
// Behind the edit login: opening /edit/ issues the login cookies and switches inline editing on in this browser.
require __DIR__ . '/auth.php';
edit_issue_cookies(edit_user());
header('Location: /?edit=1');
