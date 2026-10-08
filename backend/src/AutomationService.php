<?php

declare(strict_types=1);

namespace App;

use PDO;

final class AutomationService
{
    private const MAX_ATTEMPTS = 3;

    public function __construct(private PDO $database, private string $webhookUrl) {}

    public function createLead(CrmRepository $repository, array $input, ?string $eventId = null): array
    {
        $this->database->beginTransaction();
        try {
            if ($eventId !== null) {
                $existing = $this->database->prepare('SELECT payload FROM webhook_events WHERE event_id = :event_id');
                $existing->execute(['event_id' => $eventId]);
                if ($payload = $existing->fetchColumn()) {
                    $this->database->commit();
                    return json_decode($payload, true, 512, JSON_THROW_ON_ERROR)['data']['lead'];
                }
            }
            $lead = $repository->create('leads', $input);
            $eventId ??= self::uuid();
            $payload = [
                'event_id' => $eventId,
                'type' => 'lead.created',
                'version' => 1,
                'occurred_at' => gmdate('c'),
                'data' => ['lead' => $lead],
            ];
            $statement = $this->database->prepare(
                'INSERT INTO webhook_events (id, event_id, event_type, payload) VALUES (:id, :event_id, :event_type, :payload)'
            );
            $statement->execute([
                'id' => self::uuid(),
                'event_id' => $eventId,
                'event_type' => 'lead.created',
                'payload' => json_encode($payload, JSON_THROW_ON_ERROR),
            ]);
            $this->dispatchLocked($eventId);
            $this->database->commit();
            return $lead;
        } catch (\Throwable $error) {
            if ($this->database->inTransaction()) $this->database->rollBack();
            throw $error;
        }
    }

    public function retry(string $id): array
    {
        $this->database->beginTransaction();
        try {
            $event = $this->dispatchLocked($id);
            $this->database->commit();
            return $event;
        } catch (\Throwable $error) {
            if ($this->database->inTransaction()) $this->database->rollBack();
            throw $error;
        }
    }

    private function dispatchLocked(string $id): array
    {
        $statement = $this->database->prepare('SELECT * FROM webhook_events WHERE id::text = :id OR event_id = :event_id FOR UPDATE');
        $statement->execute(['id' => $id, 'event_id' => $id]);
        $event = $statement->fetch() ?: throw new \DomainException('Webhook event not found.');
        if ($event['status'] === 'PROCESSED') return $this->decode($event);

        $payload = json_decode($event['payload'], true, 512, JSON_THROW_ON_ERROR);
        $lastError = 'N8N_WEBHOOK_URL is not configured.';
        $attempts = (int) $event['attempts'];
        for ($attempt = 0; $attempt < self::MAX_ATTEMPTS && $this->webhookUrl !== ''; $attempt++) {
            $attempts++;
            $lastError = $this->send($payload, $event['event_id']);
            if ($lastError === null) break;
            if ($attempt + 1 < self::MAX_ATTEMPTS) usleep((2 ** $attempt) * 1_000_000);
        }
        $success = $lastError === null;
        $update = $this->database->prepare(
            'UPDATE webhook_events SET status = :status, attempts = :attempts, last_error = :last_error, processed_at = CASE WHEN :success = 1 THEN NOW() ELSE processed_at END, updated_at = NOW() WHERE id = :id RETURNING *'
        );
        $update->execute([
            'status' => $success ? 'PROCESSED' : 'FAILED',
            'attempts' => $attempts,
            'last_error' => $success ? null : $lastError,
            'success' => $success ? 1 : 0,
            'id' => $event['id'],
        ]);
        error_log(json_encode([
            'event' => 'webhook.delivery',
            'event_id' => $event['event_id'],
            'correlation_id' => $event['event_id'],
            'status' => $success ? 'PROCESSED' : 'FAILED',
            'attempts' => $attempts,
            'error' => $success ? null : $lastError,
        ], JSON_THROW_ON_ERROR));
        return $this->decode($update->fetch());
    }

    private function send(array $payload, string $eventId): ?string
    {
        $context = stream_context_create(['http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nX-Event-ID: $eventId\r\n",
            'content' => json_encode($payload, JSON_THROW_ON_ERROR),
            'timeout' => 5,
            'ignore_errors' => true,
        ]]);
        $response = @file_get_contents($this->webhookUrl, false, $context);
        $status = 0;
        foreach ($http_response_header ?? [] as $header) {
            if (preg_match('/^HTTP\/\S+\s+(\d+)/', $header, $match)) $status = (int) $match[1];
        }
        return $response !== false && $status >= 200 && $status < 300 ? null : "Webhook delivery failed with HTTP status $status.";
    }

    private function decode(array $event): array
    {
        $event['payload'] = json_decode($event['payload'], true, 512, JSON_THROW_ON_ERROR);
        return $event;
    }

    private static function uuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}
