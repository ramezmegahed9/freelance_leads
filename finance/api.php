<?php
// Dashboard Finance — JSON API. All data lives in storage/books.json (runtime, outside git).
require __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if (!is_logged_in()) { http_response_code(401); echo '{"error":"auth"}'; exit; }

function out($d, int $code = 200): void { http_response_code($code); echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function str($v, int $max = 300): string { return mb_substr(trim((string)$v), 0, $max); }
function money($v): float { $n = round((float)str_replace(',', '', (string)$v), 2); return $n < 0 ? 0 : min($n, 1e12); }
function day($v, bool $nullable = false): ?string {
  $v = (string)$v;
  if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) && checkdate((int)substr($v, 5, 2), (int)substr($v, 8, 2), (int)substr($v, 0, 4))) return $v;
  return $nullable ? null : date('Y-m-d');
}
function oneof($v, array $list, string $def): string { return in_array($v, $list, true) ? $v : $def; }
function newid(): string { return bin2hex(random_bytes(6)); }
function cleanid($v): string { return preg_replace('/[^a-f0-9]/', '', strtolower((string)$v)); }

const SERVICES = ['Website', 'Social Media', 'Branding', 'Ads', 'App', 'SEO', 'Other'];
const EXP_CATS = ['Salaries', 'Freelancers', 'Rent & Office', 'Software & Tools', 'Hosting & Domains', 'Ads Spend', 'Equipment', 'Utilities', 'Taxes & Fees', 'Other'];

// GET → full books
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  if (($_GET['export'] ?? '') === '1') {
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="finance-backup-' . date('Y-m-d') . '.json"');
    echo json_encode(load_books(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE); exit;
  }
  out(['books' => load_books(), 'services' => SERVICES, 'categories' => EXP_CATS]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(['error' => 'method'], 405);

$in = json_decode(file_get_contents('php://input'), true) ?: [];
if (!hash_equals(csrf_token(), (string)($in['csrf'] ?? ''))) out(['error' => 'csrf'], 403);
$op = (string)($in['op'] ?? '');
$d  = is_array($in['data'] ?? null) ? $in['data'] : [];

if ($op === 'password') {
  if (!password_verify((string)($d['current'] ?? ''), pass_hash())) out(['error' => 'Current password is wrong.'], 400);
  $new = (string)($d['new'] ?? '');
  if (strlen($new) < 8) out(['error' => 'New password must be at least 8 characters.'], 400);
  ensure_storage();
  file_put_contents(AUTH_FILE, json_encode(['hash' => password_hash($new, PASSWORD_BCRYPT), 'changed' => date('c')]), LOCK_EX);
  out(['ok' => true]);
}

// Everything else edits books.json under an exclusive lock
ensure_storage();
$fp = fopen(BOOKS_FILE, 'c+');
if (!$fp) out(['error' => 'Storage is not writable.'], 500);
flock($fp, LOCK_EX);
$raw = stream_get_contents($fp);
$books = $raw ? (json_decode($raw, true) ?: null) : null;
if (!is_array($books)) $books = empty_books();
$books = array_replace(empty_books(), $books);

// daily snapshot before the first change of the day
if ($raw) {
  if (!is_dir(BACKUP_DIR)) mkdir(BACKUP_DIR, 0750, true);
  $snap = BACKUP_DIR . '/books-' . date('Y-m-d') . '.json';
  if (!is_file($snap)) file_put_contents($snap, $raw);
}

function find_index(array $list, string $id): int {
  foreach ($list as $i => $row) if (($row['id'] ?? '') === $id) return $i;
  return -1;
}

switch ($op) {
  case 'project': {
    $id = cleanid($d['id'] ?? '') ?: newid();
    $kind = oneof($d['kind'] ?? '', ['project', 'monthly'], 'project');
    $payments = [];
    foreach (array_slice((array)($d['payments'] ?? []), 0, 500) as $p) {
      if (!is_array($p)) continue;
      $payments[] = [
        'id'      => cleanid($p['id'] ?? '') ?: newid(),
        'label'   => str($p['label'] ?? '', 80),
        'amount'  => money($p['amount'] ?? 0),
        'due'     => day($p['due'] ?? '', true),
        'paid_on' => day($p['paid_on'] ?? '', true),
        'note'    => str($p['note'] ?? '', 200),
      ];
    }
    $row = [
      'id'          => $id,
      'client'      => str($d['client'] ?? '', 120) ?: 'Unnamed client',
      'title'       => str($d['title'] ?? '', 160),
      'service'     => oneof($d['service'] ?? '', SERVICES, 'Other'),
      'kind'        => $kind,
      'total'       => money($d['total'] ?? 0),        // project contract value
      'monthly_fee' => money($d['monthly_fee'] ?? 0),  // retainer fee
      'start'       => day($d['start'] ?? ''),
      'status'      => oneof($d['status'] ?? '', ['active', 'done', 'paused', 'cancelled'], 'active'),
      'description' => str($d['description'] ?? '', 3000),
      'payments'    => $payments,
      'updated'     => date('c'),
    ];
    $i = find_index($books['projects'], $id);
    if ($i >= 0) { $row['created'] = $books['projects'][$i]['created'] ?? date('c'); $books['projects'][$i] = $row; }
    else { $row['created'] = date('c'); $books['projects'][] = $row; }
    $result = $row;
    break;
  }
  case 'delete_project': {
    $i = find_index($books['projects'], cleanid($d['id'] ?? ''));
    if ($i >= 0) array_splice($books['projects'], $i, 1);
    $result = true;
    break;
  }
  case 'expense': {
    $id = cleanid($d['id'] ?? '') ?: newid();
    $row = [
      'id'       => $id,
      'title'    => str($d['title'] ?? '', 160) ?: 'Expense',
      'category' => oneof($d['category'] ?? '', EXP_CATS, 'Other'),
      'amount'   => money($d['amount'] ?? 0),
      'date'     => day($d['date'] ?? ''),
      'vendor'   => str($d['vendor'] ?? '', 120),
      'note'     => str($d['note'] ?? '', 1000),
      'updated'  => date('c'),
    ];
    $i = find_index($books['expenses'], $id);
    if ($i >= 0) $books['expenses'][$i] = $row; else $books['expenses'][] = $row;
    $result = $row;
    break;
  }
  case 'delete_expense': {
    $i = find_index($books['expenses'], cleanid($d['id'] ?? ''));
    if ($i >= 0) array_splice($books['expenses'], $i, 1);
    $result = true;
    break;
  }
  case 'settings': {
    $books['settings'] = [
      'opening_balance' => round((float)($d['opening_balance'] ?? 0), 2),
      'opening_date'    => day($d['opening_date'] ?? ''),
      'currency'        => strtoupper(preg_replace('/[^A-Za-z$€£]/u', '', str($d['currency'] ?? 'EGP', 6))) ?: 'EGP',
    ];
    $result = $books['settings'];
    break;
  }
  default:
    flock($fp, LOCK_UN); fclose($fp);
    out(['error' => 'Unknown operation.'], 400);
}

$books['updated'] = date('c');
ftruncate($fp, 0); rewind($fp);
fwrite($fp, json_encode($books, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
fflush($fp);
flock($fp, LOCK_UN); fclose($fp);
out(['ok' => true, 'result' => $result, 'books' => $books]);
