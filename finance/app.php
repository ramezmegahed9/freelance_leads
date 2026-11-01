<?php
require __DIR__ . '/config.php';
require_login();
$boot = json_encode(['csrf' => csrf_token(), 'user' => $_SESSION['fin_user']], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
$icons = [
  'overview' => '<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"/>',
  'income'   => '<path d="M12 19V5M6 11l6-6 6 6"/>',
  'expenses' => '<path d="M12 5v14M6 13l6 6 6-6"/>',
  'settings' => '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
];
$nav = ['overview' => 'Overview', 'income' => 'Income', 'expenses' => 'Expenses', 'settings' => 'Settings'];
function ico(string $p): string { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $p . '</svg>'; }
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title><?= h(APP_NAME) ?></title>
<link rel="icon" href="assets/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="assets/app.css?v=1">
</head>
<body class="app">
<aside class="side">
  <div class="brand"><img src="assets/logo.svg" alt="" width="34" height="34"><div><b>Dashboard</b><span>Finance</span></div></div>
  <nav class="nav" aria-label="Main">
    <?php foreach ($nav as $k => $label): ?>
      <a href="#<?= $k ?>" data-view="<?= $k ?>"><?= ico($icons[$k]) ?><span><?= $label ?></span></a>
    <?php endforeach; ?>
  </nav>
  <div class="side-foot">
    <a class="logout" href="logout.php"><?= ico('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>') ?><span>Log out</span></a>
  </div>
</aside>

<main class="main" id="main" tabindex="-1">
  <div class="loading">Loading…</div>
</main>

<dialog id="modal" class="modal" aria-labelledby="modal-title"></dialog>
<div id="toast" class="toast" role="status" aria-live="polite"></div>

<script>window.FIN = <?= $boot ?>;</script>
<script src="assets/app.js?v=1"></script>
</body>
</html>
