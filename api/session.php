<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$body = json_decode(file_get_contents('php://input'), true);
$sid  = preg_replace('/[^a-zA-Z0-9_\-]/', '', $body['sid'] ?? '');

if (!$sid) {
    echo json_encode(['ok' => false, 'error' => 'sid manquant']);
    exit;
}

// private_html est hors du web root — toujours accessible en écriture
$dir = dirname(dirname(__DIR__)) . '/private_html';
if (!is_dir($dir)) mkdir($dir, 0750, true);

$file   = $dir . '/nql_sess_' . $sid . '.json';
$result = file_put_contents($file, json_encode([
    'host'     => $body['host']     ?? '',
    'username' => $body['username'] ?? '',
    'password' => $body['password'] ?? '',
    'id_token' => (int)($body['id_token'] ?? 0),
    'base'     => $body['base']     ?? '',
]));

echo json_encode(['ok' => $result !== false]);
