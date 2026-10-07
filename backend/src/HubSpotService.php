<?php

declare(strict_types=1);

namespace App;

use PDO;

final class HubSpotService
{
    public function __construct(private PDO $database, private string $token) {}

    public function syncLead(array $lead): array
    {
        if ($this->token === '') throw new \RuntimeException('HUBSPOT_ACCESS_TOKEN is not configured.');
        $runId = self::uuid();
        $run = $this->database->prepare('INSERT INTO automation_runs (id, workflow, status, correlation_id, entity_type, entity_id, input, started_at) VALUES (:id, :workflow, :status, :correlation_id, :entity_type, :entity_id, :input, NOW())');
        $run->execute(['id' => $runId, 'workflow' => 'hubspot.sync', 'status' => 'RUNNING', 'correlation_id' => $lead['id'], 'entity_type' => 'lead', 'entity_id' => $lead['id'], 'input' => json_encode($lead, JSON_THROW_ON_ERROR)]);
        try {
            $localContactId = $this->ensureLocalContact($lead);
            $lead['contact_id'] = $localContactId;
            $contact = $this->upsert('contacts', $this->contactProperties($lead), $lead['hubspot_contact_id'] ?? null, $lead['email'] ?? null);
            $company = $lead['company_id'] ? $this->company($lead['company_id']) : null;
            $companyRecord = $company ? $this->upsert('companies', ['name' => $company['name']], $lead['hubspot_company_id'] ?? null, null) : null;
            $deal = $this->upsert('deals', ['dealname' => $lead['name']], $lead['hubspot_deal_id'] ?? null, null);
            $ids = ['local_contact' => $localContactId, 'contact' => $contact['id'], 'company' => $companyRecord['id'] ?? null, 'deal' => $deal['id']];
            $this->database->prepare('UPDATE leads SET contact_id = :local_contact, hubspot_contact_id = :contact, hubspot_company_id = :company, hubspot_deal_id = :deal, updated_at = NOW() WHERE id = :id')->execute(['local_contact' => $localContactId, 'contact' => $ids['contact'], 'company' => $ids['company'], 'deal' => $ids['deal'], 'id' => $lead['id']]);
            $this->finish($runId, 'SUCCEEDED', $ids, null);
            return $ids;
        } catch (\Throwable $error) {
            $this->finish($runId, 'FAILED', null, $error->getMessage());
            throw $error;
        }
    }

    private function upsert(string $object, array $properties, ?string $id, ?string $email): array
    {
        if (!$id && $email) {
            $search = $this->request('POST', "/crm/v3/objects/$object/search", ['filterGroups' => [['filters' => [['propertyName' => 'email', 'operator' => 'EQ', 'value' => $email]]]], 'properties' => array_keys($properties), 'limit' => 1]);
            $id = $search['results'][0]['id'] ?? null;
        }
        return $id
            ? $this->request('PATCH', "/crm/v3/objects/$object/$id", ['properties' => $properties]) + ['id' => $id]
            : $this->request('POST', "/crm/v3/objects/$object", ['properties' => $properties]);
    }

    private function contactProperties(array $lead): array
    {
        $parts = preg_split('/\s+/', trim((string) $lead['name']), 2);
        return array_filter(['firstname' => $parts[0] ?? '', 'lastname' => $parts[1] ?? '', 'email' => $lead['email'] ?? '']);
    }

    private function company(string $id): ?array
    {
        $statement = $this->database->prepare('SELECT name FROM companies WHERE id = :id');
        $statement->execute(['id' => $id]);
        return $statement->fetch() ?: null;
    }

    private function ensureLocalContact(array $lead): string
    {
        if (!empty($lead['contact_id'])) return (string) $lead['contact_id'];
        if (!empty($lead['email'])) {
            $existing = $this->database->prepare('SELECT id FROM contacts WHERE email = :email LIMIT 1');
            $existing->execute(['email' => $lead['email']]);
            if ($id = $existing->fetchColumn()) return (string) $id;
        }
        $parts = preg_split('/\s+/', trim((string) $lead['name']), 2);
        $id = self::uuid();
        $statement = $this->database->prepare('INSERT INTO contacts (id, company_id, first_name, last_name, email) VALUES (:id, :company_id, :first_name, :last_name, :email)');
        $statement->execute(['id' => $id, 'company_id' => $lead['company_id'] ?: null, 'first_name' => $parts[0] ?? 'Lead', 'last_name' => $parts[1] ?? 'Contact', 'email' => $lead['email'] ?: null]);
        return $id;
    }

    private function request(string $method, string $path, array $body): array
    {
        $content = json_encode($body, JSON_THROW_ON_ERROR);
        for ($attempt = 1; $attempt <= 3; $attempt++) {
            $context = stream_context_create(['http' => ['method' => $method, 'header' => "Authorization: Bearer {$this->token}\r\nContent-Type: application/json\r\n", 'content' => $content, 'ignore_errors' => true, 'timeout' => 10]]);
            $response = @file_get_contents('https://api.hubapi.com' . $path, false, $context);
            $status = 0;
            $retryAfter = 0;
            foreach ($http_response_header ?? [] as $header) {
                if (preg_match('/^HTTP\/\S+\s+(\d+)/', $header, $match)) $status = (int) $match[1];
                if (preg_match('/^Retry-After:\s*(\d+)/i', $header, $match)) $retryAfter = (int) $match[1];
            }
            $decoded = json_decode($response ?: '', true);
            if ($status >= 200 && $status < 300) return is_array($decoded) ? $decoded : [];
            if ($attempt < 3 && in_array($status, [429, 500, 502, 503, 504], true)) {
                // ponytail: three bounded retries; add a queue when sync volume needs durable backoff.
                sleep($retryAfter ?: 2 ** $attempt);
                continue;
            }
            throw new \RuntimeException('HubSpot API failed with HTTP ' . $status . ': ' . ($decoded['message'] ?? 'unknown error'));
        }
        throw new \RuntimeException('HubSpot API request failed after retries.');
    }

    private function finish(string $id, string $status, ?array $output, ?string $error): void
    {
        $statement = $this->database->prepare('UPDATE automation_runs SET status = :status, output = :output, error = :error, finished_at = NOW(), updated_at = NOW() WHERE id = :id');
        $statement->execute(['status' => $status, 'output' => $output ? json_encode($output, JSON_THROW_ON_ERROR) : null, 'error' => $error, 'id' => $id]);
    }

    private static function uuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}
