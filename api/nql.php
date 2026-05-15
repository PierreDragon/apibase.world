<?php
error_reporting(0);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'ok' => false,
        'error' => 'POST required.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true);

if (!is_array($body)) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => 'INVALID_JSON',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$host = trim((string) ($body['host'] ?? ''));
$username = trim((string) ($body['username'] ?? ''));
$password = (string) ($body['password'] ?? '');
$idToken = (int) ($body['id_token'] ?? 0);
$base = trim((string) ($body['base'] ?? ''));
$prompt = trim((string) ($body['prompt'] ?? ''));

$context = $body['context'] ?? null;

if (!is_array($context)) {
    $context = null;
}

if ($host === '' || $username === '' || $password === '' || $idToken <= 0 || $base === '' || $prompt === '') {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => 'Paramètres manquants.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/*
    Security: keep only a clean hostname.
    Example accepted:
    - apibase.work
    - www.apibase.work
    - api.example.com

    No scheme, no slash, no port, no path.
*/
$host = preg_replace('/[^a-zA-Z0-9.\-]/', '', $host);
$host = strtolower($host);

if ($host === '' || str_contains($host, '..') || !str_contains($host, '.')) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => 'Hôte invalide.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$url = 'https://' . $host . '/nql/api_run';

$payload = [
    'username' => $username,
    'password' => $password,
    'id_token' => $idToken,
    'base' => $base,
    'prompt' => $prompt,
];

if ($context !== null) {
    $payload['context'] = $context;
}

$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 90,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
    ],
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_FOLLOWLOCATION => false,
]);

$resp = curl_exec($ch);
$err = curl_error($ch);
$http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

unset($ch);

if ($resp === false || $http === 0) {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => 'Hôte inaccessible : ' . $host . ($err ? ' (' . $err . ')' : ''),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$decoded = json_decode($resp, true);

if (!is_array($decoded)) {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => 'Réponse invalide du node HTTP ' . $http . '.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($http < 200 || $http >= 300) {
    http_response_code($http);
    echo json_encode([
        'ok' => false,
        'error' => $decoded['error'] ?? ('Erreur du node HTTP ' . $http . '.'),
        'status' => $http,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode($decoded, JSON_UNESCAPED_UNICODE);
exit;