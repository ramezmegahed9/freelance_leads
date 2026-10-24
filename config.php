<?php
// Freelance Leads — config
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'config.php') { http_response_code(403); exit; }

define('APP_USER', 'admin');
// bcrypt hash of the admin password (never store the plain password here)
define('APP_PASS_HASH', '$2y$10$5boBqYdp/UofauXuK6L/Fem0lW/nEwY/JV.RJEsBtHAo0cgwDuAem');

define('LEADS_FILE', __DIR__ . '/data/leads.json');      // written by the daily research task (git)
define('STATE_DIR', __DIR__ . '/storage');                // runtime only, never in git
define('STATE_FILE', STATE_DIR . '/state.json');          // status + notes per lead

ini_set('session.cookie_httponly', '1');
ini_set('session.use_strict_mode', '1');
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ini_set('session.cookie_secure', '1');
session_name('fl_sess');
session_start();

function is_logged_in(): bool { return !empty($_SESSION['fl_user']); }
function require_login(): void { if (!is_logged_in()) { header('Location: index.php'); exit; } }
function csrf_token(): string {
  if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
  return $_SESSION['csrf'];
}
function load_json(string $f, $default) {
  if (!is_file($f)) return $default;
  $d = json_decode((string)file_get_contents($f), true);
  return is_array($d) ? $d : $default;
}
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
