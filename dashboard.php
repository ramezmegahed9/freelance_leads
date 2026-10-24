<?php
require __DIR__ . '/config.php';
require_login();
$data  = load_json(LEADS_FILE, ['updated' => '', 'leads' => []]);
$state = load_json(STATE_FILE, []);
$leads = $data['leads'] ?? [];
foreach ($leads as &$l) {
  $s = $state[$l['id']] ?? [];
  $l['status'] = $s['status'] ?? 'new';
  $l['note']   = $s['note'] ?? '';
}
unset($l);
usort($leads, fn($a, $b) => strcmp(($b['added'] ?? '') . ($b['posted'] ?? ''), ($a['added'] ?? '') . ($a['posted'] ?? '')));
$payload = json_encode(['leads' => $leads, 'updated' => $data['updated'] ?? '', 'csrf' => csrf_token()],
  JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Freelance Leads</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="assets/app.css?v=1">
</head>
<body>
<header class="top">
  <div class="brand"><img class="logo" src="assets/logo.svg" alt="" width="32" height="32"><b>Freelance Leads</b></div>
  <div class="top-right"><span class="muted" id="updated"></span><a class="btn ghost" href="logout.php">Log out</a></div>
</header>

<main class="wrap">
  <section class="stats" id="stats"></section>

  <section class="filters">
    <input id="q" type="search" placeholder="Search company, need, country…">
    <select id="f-platform"><option value="">All sources</option></select>
    <select id="f-type"><option value="">Any type</option></select>
    <select id="f-status"><option value="">Any status</option></select>
    <select id="f-day"><option value="">All days</option></select>
  </section>

  <section id="grid" class="grid"></section>
  <p id="empty" class="empty" hidden>No leads match these filters.</p>
</main>

<dialog id="modal" class="modal" aria-labelledby="m-title">
  <div class="modal-inner" id="m-body"></div>
</dialog>

<div id="toast" class="toast" hidden></div>
<script>window.FL = <?= $payload ?>;</script>
<script src="assets/app.js?v=1"></script>
</body>
</html>
