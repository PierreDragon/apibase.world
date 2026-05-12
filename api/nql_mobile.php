<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$body   = json_decode(file_get_contents('php://input'), true);
$sid    = preg_replace('/[^a-zA-Z0-9_\-]/', '', $body['sid']    ?? '');
$prompt = trim($body['prompt'] ?? '');

if (!$sid || !$prompt) {
    echo json_encode(['ok' => false, 'error' => 'Paramètres manquants.']);
    exit;
}

$file = sys_get_temp_dir() . '/nql_sess_' . $sid . '.json';
if (!file_exists($file)) {
    echo json_encode(['ok' => false, 'error' => 'Session expirée. Rescannez le QR code.']);
    exit;
}

$sess     = json_decode(file_get_contents($file), true);
$host     = preg_replace('/[^a-zA-Z0-9.\-]/', '', $sess['host']     ?? '');
$username = $sess['username'] ?? '';
$password = $sess['password'] ?? '';
$idToken  = (int)($sess['id_token'] ?? 0);
$base     = $sess['base'] ?? '';

if (!$host || !$username || !$password || !$idToken || !$base) {
    echo json_encode(['ok' => false, 'error' => 'Session invalide.']);
    exit;
}

$url = 'https://' . $host . '/nql/api_run';
$ch  = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode([
        'username' => $username,
        'password' => $password,
        'id_token' => $idToken,
        'base'     => $base,
        'prompt'   => $prompt,
    ]),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
]);
$resp = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($resp === false || $http === 0) {
    echo json_encode(['ok' => false, 'error' => 'Hôte inaccessible.']);
    exit;
}

// Push result to display
$result  = json_decode($resp, true);
$payload = [
    'query'  => $prompt,
    'answer' => $result['answer'] ?? '',
    'ts'     => time(),
];
$dispFile = sys_get_temp_dir() . '/nql_display_' . $sid . '.json';
file_put_contents($dispFile, json_encode($payload));

echo $resp;
