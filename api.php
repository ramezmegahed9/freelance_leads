<?php
// Freelance Leads — saves pipeline status + notes per lead (runtime file, not tracked in git)
require __DIR__ . '/config.php';
header('Content-Type: application/json');
if (!is_logged_in()) { http_response_code(401); echo '{"error":"auth"}'; exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }

$in = json_decode(file_get_contents('php://input'), true) ?: [];
if (!hash_equals(csrf_token(), (string)($in['csrf'] ?? ''))) { http_response_code(403); echo '{"error":"csrf"}'; exit; }

$id = preg_replace('/[^a-z0-9\-]/', '', strtolower((string)($in['id'] ?? '')));
$allowed = ['new', 'contacted', 'replied', 'call', 'proposal', 'won', 'lost', 'skip'];
if ($id === '') { http_response_code(400); echo '{"error":"id"}'; exit; }

if (!is_dir(STATE_DIR)) mkdir(STATE_DIR, 0750, true);
$fp = fopen(STATE_FILE, 'c+');
flock($fp, LOCK_EX);
$state = json_decode(stream_get_contents($fp) ?: '{}', true) ?: [];
$row = $state[$id] ?? ['status' => 'new', 'note' => ''];
if (isset($in['status']) && in_array($in['status'], $allowed, true)) $row['status'] = $in['status'];
if (isset($in['note'])) $row['note'] = mb_substr((string)$in['note'], 0, 2000);
$row['updated'] = date('c');
$state[$id] = $row;
ftruncate($fp, 0); rewind($fp);
fwrite($fp, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
flock($fp, LOCK_UN); fclose($fp);
echo json_encode(['ok' => true, 'row' => $row]);
