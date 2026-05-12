<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$sid  = preg_replace('/[^a-z0-9_\-]/i', '', $_GET['sid'] ?? '');
$file = __DIR__ . '/sessions/nql_display_' . $sid . '.json';

if (!$sid || !file_exists($file)) {
    echo 'null';
    exit;
}

echo file_get_contents($file);
