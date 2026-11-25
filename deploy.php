<?php
$secret = '55b5d283ac17741d2e21dfb4320bb6643dc478f7';
$sig = 'sha256=' . hash_hmac('sha256', file_get_contents('php://input'), $secret);
if (!hash_equals($sig, $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '')) {
    http_response_code(403);
    exit('Forbidden');
}

$base = '/home/com/domains/apibase.world';
$src  = $base . '/src';
$pub  = $base . '/public_html';

$output  = shell_exec("cd $src && git checkout -- . && git pull origin main 2>&1");
$output .= shell_exec("cp -r $src/dist/. $pub/ 2>&1");
$output .= shell_exec("cp -r $src/api/. $pub/api/ 2>&1");
$output .= shell_exec("cp $src/deploy.php $pub/deploy.php 2>&1");

// Remove old Vite bundles (index-<hash>.js/.css) no longer in dist/assets.
// Only files matching that pattern are touched; anything else in assets/ stays.
$keep = array_flip(array_map('basename', glob("$src/dist/assets/*") ?: []));
if ($keep) {
    foreach (glob("$pub/assets/index-*.{js,css}", GLOB_BRACE) ?: [] as $file) {
        $name = basename($file);
        if (!isset($keep[$name]) && preg_match('/^index-[A-Za-z0-9_-]{8}\.(js|css)$/', $name)) {
            $output .= (@unlink($file) ? "removed" : "FAILED to remove") . " assets/$name\n";
        }
    }
}

file_put_contents('/tmp/apibase_world_deploy.log', date('Y-m-d H:i:s') . "\n" . $output . "\n", FILE_APPEND);
http_response_code(200);
echo 'OK';
