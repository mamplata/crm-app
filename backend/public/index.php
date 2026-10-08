<?php

declare(strict_types=1);

use App\AuthService;
use App\AutomationService;
use App\CrmRepository;
use App\Database;
use App\HubSpotService;
use App\UserRepository;

require dirname(__DIR__) . '/vendor/autoload.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

function body(): array
{
    return json_decode(file_get_contents('php://input'), true) ?: [];
}

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

try {
    $database = new Database((string) getenv('DATABASE_URL'));
    $database->migrate();
    $users = new UserRepository($database->connection());
    $auth = new AuthService($database->connection(), $users);
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $input = body();

    if ($path === '/health') {
        respond(['status' => 'ok']);
    }

    if ($path === '/api/auth/register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        respond(['user' => $auth->register(trim((string) ($input['email'] ?? '')), (string) ($input['password'] ?? ''))], 201);
    }

    if ($path === '/api/auth/login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        respond($auth->login(trim((string) ($input['email'] ?? '')), (string) ($input['password'] ?? '')));
    }

    if ($path === '/api/meta/webhook') {
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            if (($_GET['hub_verify_token'] ?? '') !== getenv('META_VERIFY_TOKEN') || ($_GET['hub_mode'] ?? '') !== 'subscribe') respond(['error' => 'forbidden'], 403);
            header('Content-Type: text/plain');
            echo $_GET['hub_challenge'] ?? '';
            exit;
        }
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (($input['object'] ?? '') !== 'page') respond(['error' => 'invalid_payload'], 400);
            $repository = new CrmRepository($database->connection(), (float) (getenv('CLASSIFICATION_REVIEW_THRESHOLD') ?: 0.7));
            $automation = new AutomationService($database->connection(), (string) getenv('N8N_WEBHOOK_URL'));
            foreach ($input['entry'] ?? [] as $entry) {
                foreach ($entry['messaging'] ?? [] as $message) {
                    $text = trim((string) ($message['message']['text'] ?? ''));
                    $mid = (string) ($message['message']['mid'] ?? '');
                    if ($text === '' || $mid === '') continue;
                    $sender = (string) ($message['sender']['id'] ?? 'unknown');
                    $automation->createLead($repository, ['name' => "Facebook user $sender", 'message' => $text], "meta:$mid");
                }
            }
            respond(['received' => true]);
        }
        respond(['error' => 'method_not_allowed'], 405);
    }

    if ($path === '/api/me' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        preg_match('/Bearer\s+(\S+)/i', $_SERVER['HTTP_AUTHORIZATION'] ?? '', $matches);
        $user = isset($matches[1]) ? $auth->userFromToken($matches[1]) : null;
        respond($user ? ['user' => $user] : ['error' => 'unauthorized'], $user ? 200 : 401);
    }

    if (preg_match('#^/api/([^/]+)(?:/([^/]+))?$#', $path, $route)) {
        $token = null;
        preg_match('/Bearer\s+(\S+)/i', $_SERVER['HTTP_AUTHORIZATION'] ?? '', $matches);
        $token = $matches[1] ?? null;
        if (!$token || !$auth->userFromToken($token)) respond(['error' => 'unauthorized'], 401);

        $repository = new CrmRepository($database->connection(), (float) (getenv('CLASSIFICATION_REVIEW_THRESHOLD') ?: 0.7));
        $automation = new AutomationService($database->connection(), (string) getenv('N8N_WEBHOOK_URL'));
        $hubspot = new HubSpotService($database->connection(), (string) getenv('HUBSPOT_ACCESS_TOKEN'));
        $resource = $route[1];
        $id = $route[2] ?? null;
        $method = $_SERVER['REQUEST_METHOD'];
        if ($resource === 'webhook-events' && $id && $method === 'POST' && ($_GET['action'] ?? '') === 'retry') {
            respond(['item' => $automation->retry($id)]);
        }
        if ($resource === 'leads' && $id && $method === 'POST' && ($_GET['action'] ?? '') === 'hubspot-sync') {
            respond(['item' => $hubspot->syncLead($repository->find('leads', $id))]);
        }
        if (!$id && $method === 'GET') {
            $query = $_GET['q'] ?? null;
            respond($repository->list($resource, max(1, (int) ($_GET['page'] ?? 1)), min(100, max(1, (int) ($_GET['per_page'] ?? 25))), $query, $_GET['status'] ?? null, $_GET['sort'] ?? 'created_at', $_GET['direction'] ?? 'DESC'));
        }
        if (!$id && $method === 'POST') {
            $item = $resource === 'leads' ? $automation->createLead($repository, $input) : $repository->create($resource, $input);
            respond(['item' => $item], 201);
        }
        if ($id && $method === 'GET') respond(['item' => $repository->find($resource, $id)]);
        if ($id && $method === 'PATCH') {
            $item = $repository->update($resource, $id, $input);
            if ($resource === 'leads' && $item['status'] === 'QUALIFIED' && getenv('HUBSPOT_ACCESS_TOKEN')) {
                $hubspot->syncLead($item);
                $item = $repository->find('leads', $id);
            }
            respond(['item' => $item]);
        }
        if ($id && $method === 'DELETE') {
            $repository->delete($resource, $id);
            respond([], 204);
        }
    }

    respond(['error' => 'not_found'], 404);
} catch (InvalidArgumentException|DomainException $error) {
    respond(['error' => $error->getMessage()], 400);
} catch (Throwable $error) {
    error_log($error->getMessage());
    respond(['error' => 'server_error'], 500);
}
