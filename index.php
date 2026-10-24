<?php
require __DIR__ . '/config.php';
if (is_logged_in()) { header('Location: dashboard.php'); exit; }

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $_SESSION['tries'] = ($_SESSION['tries'] ?? 0) + 1;
  if ($_SESSION['tries'] > 5) sleep(min(10, $_SESSION['tries'] - 5)); // slow down brute force
  $u = trim($_POST['username'] ?? '');
  $p = (string)($_POST['password'] ?? '');
  if (hash_equals(APP_USER, $u) && password_verify($p, APP_PASS_HASH)) {
    session_regenerate_id(true);
    $_SESSION['fl_user'] = $u;
    $_SESSION['tries'] = 0;
    header('Location: dashboard.php'); exit;
  }
  $error = 'Wrong username or password.';
}
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
<body class="login">
  <main class="login-card">
    <img class="logo" src="assets/logo.svg" alt="" width="40" height="40">
    <h1>Freelance Leads</h1>
    <p class="muted">Daily WordPress work for the dev team — freelance, part-time, outsourced.</p>
    <?php if ($error): ?><div class="alert"><?= h($error) ?></div><?php endif; ?>
    <form method="post" autocomplete="on">
      <label>Username<input name="username" required autofocus autocomplete="username"></label>
      <label>Password
        <span class="pw">
          <input id="pw" name="password" type="password" required autocomplete="current-password">
          <button type="button" class="eye" id="eye" aria-label="Show password" aria-pressed="false">
            <svg class="i-show" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg class="i-hide" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
          </button>
        </span>
      </label>
      <button class="btn primary" type="submit">Sign in</button>
    </form>
  </main>
<script>
  document.getElementById('eye').addEventListener('click', function () {
    const pw = document.getElementById('pw'), show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    this.setAttribute('aria-pressed', show);
    this.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
</script>
</body>
</html>
