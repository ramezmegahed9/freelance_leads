<?php
// Dashboard Finance — config
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'config.php') { http_response_code(403); exit; }

define('APP_NAME', 'Dashboard Finance');
define('APP_USER', 'admin');
// bcrypt hash of the initial admin password. Changing it from Settings stores a new hash in storage/auth.json.
define('APP_PASS_HASH', '$2y$10$44QbyZ3NvIhUOXD3g6QKFeuPtJu9qBu3jPTnm/bRCNWI.eD/OweEO');

define('STATE_DIR', __DIR__ . '/storage');          // runtime only — never in git, never overwritten by deploys
define('BOOKS_FILE', STATE_DIR . '/books.json');    // projects, payments, expenses, settings
define('AUTH_FILE', STATE_DIR . '/auth.json');      // changed password hash
define('BACKUP_DIR', STATE_DIR . '/backups');       // one snapshot per day

date_default_timezone_set('Africa/Cairo');
ini_set('session.cookie_httponly', '1');
ini_set('session.use_strict_mode', '1');
ini_set('session.gc_maxlifetime', '43200');
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ini_set('session.cookie_secure', '1');
session_name('fin_sess');
session_start();

function is_logged_in(): bool { return !empty($_SESSION['fin_user']); }
function require_login(): void { if (!is_logged_in()) { header('Location: index.php'); exit; } }
function csrf_token(): string {
  if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
  return $_SESSION['csrf'];
}
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

function ensure_storage(): void {
  if (!is_dir(STATE_DIR)) mkdir(STATE_DIR, 0750, true);
  if (!is_file(STATE_DIR . '/.htaccess')) file_put_contents(STATE_DIR . '/.htaccess', "Require all denied\n");
}
function pass_hash(): string {
  if (is_file(AUTH_FILE)) {
    $a = json_decode((string)file_get_contents(AUTH_FILE), true);
    if (!empty($a['hash'])) return $a['hash'];
  }
  return APP_PASS_HASH;
}
function empty_books(): array {
  return ['settings' => ['opening_balance' => 0, 'opening_date' => date('Y-01-01'), 'currency' => 'EGP'],
          'projects' => [], 'expenses' => [], 'updated' => ''];
}
function load_books(): array {
  if (!is_file(BOOKS_FILE)) return empty_books();
  $d = json_decode((string)file_get_contents(BOOKS_FILE), true);
  return is_array($d) ? array_replace(empty_books(), $d) : empty_books();
}
