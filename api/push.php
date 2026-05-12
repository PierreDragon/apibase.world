<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$body    = json_decode(file_get_contents('php://input'), true);
$sid     = preg_replace('/[^a-z0-9_\-]/i', '', $body['sid'] ?? '');
$payload = $body['payload'] ?? null;

if (!$sid || $payload === null) {
    echo json_encode(['ok' => false]);
    exit;
}

$file = sys_get_temp_dir() . '/nql_display_' . $sid . '.json';
file_put_contents($file, json_encode($payload));
echo json_encode(['ok' => true]);
