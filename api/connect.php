<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$body     = json_decode(file_get_contents('php://input'), true);
$host     = trim($body['host']     ?? '');
$username = trim($body['username'] ?? '');
$password = trim($body['password'] ?? '');

if (!$host || !$username || !$password) {
    echo json_encode(['ok' => false, 'error' => 'Champs manquants.']);
    exit;
}

// Sanitize host — no path traversal, just domain
$host = preg_replace('/[^a-zA-Z0-9.\-]/', '', $host);
$url  = 'https://' . $host . '/login/api_auth';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode(['username' => $username, 'password' => $password]),
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
]);
$resp = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($resp === false || $http === 0) {
    echo json_encode(['ok' => false, 'error' => 'Hôte inaccessible : ' . $host]);
    exit;
}

echo $resp;
