<?php

declare(strict_types=1);

namespace App;

use PDO;

final class CrmRepository
{
    private const RESOURCES = [
        'companies' => ['table' => 'companies', 'fields' => ['name', 'email', 'phone'], 'required' => ['name'], 'search' => ['name', 'email']],
        'contacts' => ['table' => 'contacts', 'fields' => ['company_id', 'first_name', 'last_name', 'email', 'phone'], 'required' => ['first_name', 'last_name'], 'search' => ['first_name', 'last_name', 'email']],
        'leads' => ['table' => 'leads', 'fields' => ['company_id', 'contact_id', 'name', 'email', 'message', 'status', 'intent', 'priority', 'summary', 'confidence'], 'required' => ['name', 'message'], 'search' => ['name', 'email', 'message']],
        'deals' => ['table' => 'deals', 'fields' => ['lead_id', 'pipeline_stage_id', 'name', 'amount', 'status'], 'required' => ['pipeline_stage_id', 'name'], 'search' => ['name']],
        'pipelines' => ['table' => 'pipelines', 'fields' => ['name'], 'required' => ['name'], 'search' => ['name']],
        'pipeline-stages' => ['table' => 'pipeline_stages', 'fields' => ['pipeline_id', 'name', 'position'], 'required' => ['pipeline_id', 'name', 'position'], 'search' => ['name']],
        'activities' => ['table' => 'activities', 'fields' => ['lead_id', 'contact_id', 'type', 'subject', 'body', 'occurred_at'], 'required' => ['type', 'subject'], 'search' => ['subject', 'body']],
        'tasks' => ['table' => 'tasks', 'fields' => ['lead_id', 'contact_id', 'title', 'description', 'status', 'due_at'], 'required' => ['title'], 'search' => ['title', 'description']],
    ];

    public function __construct(private PDO $database) {}

    public function list(string $resource, int $page, int $perPage, ?string $query, ?string $status, string $sort, string $direction): array
    {
        $definition = $this->definition($resource);
        $where = [];
        $parameters = [];
        if ($query) {
            $where[] = '(' . implode(' OR ', array_map(fn (string $field): string => "$field ILIKE :query", $definition['search'])) . ')';
            $parameters['query'] = "%$query%";
        }
        if ($status && in_array('status', $definition['fields'], true)) {
            $where[] = 'status = :status';
            $parameters['status'] = $status;
        }
        $sort = in_array($sort, $definition['fields'], true) ? $sort : 'created_at';
        $direction = strtoupper($direction) === 'ASC' ? 'ASC' : 'DESC';
        $filter = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $statement = $this->database->prepare("SELECT * FROM {$definition['table']}{$filter} ORDER BY $sort $direction LIMIT :limit OFFSET :offset");
        foreach ($parameters as $key => $value) $statement->bindValue($key, $value);
        $statement->bindValue('limit', $perPage, PDO::PARAM_INT);
        $statement->bindValue('offset', ($page - 1) * $perPage, PDO::PARAM_INT);
        $statement->execute();
        $count = $this->database->prepare("SELECT COUNT(*) FROM {$definition['table']}{$filter}");
        $count->execute($parameters);
        return ['items' => $statement->fetchAll(), 'total' => (int) $count->fetchColumn(), 'page' => $page, 'per_page' => $perPage];
    }

    public function find(string $resource, string $id): array
    {
        $definition = $this->definition($resource);
        $statement = $this->database->prepare("SELECT * FROM {$definition['table']} WHERE id = :id");
        $statement->execute(['id' => $id]);
        return $statement->fetch() ?: throw new \DomainException('Resource not found.');
    }

    public function create(string $resource, array $input): array
    {
        $definition = $this->definition($resource);
        foreach ($definition['required'] as $field) {
            if (!isset($input[$field]) || $input[$field] === '') throw new \InvalidArgumentException("$field is required.");
        }
        if (in_array($resource, ['activities', 'tasks'], true) && empty($input['lead_id']) && empty($input['contact_id'])) {
            throw new \InvalidArgumentException('lead_id or contact_id is required.');
        }
        $data = array_intersect_key($input, array_flip($definition['fields']));
        $data = array_merge(['id' => self::uuid()], $data);
        $columns = array_keys($data);
        $statement = $this->database->prepare(sprintf('INSERT INTO %s (%s) VALUES (%s) RETURNING *', $definition['table'], implode(', ', $columns), ':' . implode(', :', $columns)));
        $statement->execute($data);
        return $statement->fetch();
    }

    public function update(string $resource, string $id, array $input): array
    {
        $definition = $this->definition($resource);
        $data = array_intersect_key($input, array_flip($definition['fields']));
        if (!$data) throw new \InvalidArgumentException('No updatable fields supplied.');
        $assignments = array_map(fn (string $field): string => "$field = :$field", array_keys($data));
        $data['id'] = $id;
        $statement = $this->database->prepare(sprintf('UPDATE %s SET %s, updated_at = NOW() WHERE id = :id RETURNING *', $definition['table'], implode(', ', $assignments)));
        $statement->execute($data);
        return $statement->fetch() ?: throw new \DomainException('Resource not found.');
    }

    public function delete(string $resource, string $id): void
    {
        $definition = $this->definition($resource);
        $statement = $this->database->prepare("DELETE FROM {$definition['table']} WHERE id = :id");
        $statement->execute(['id' => $id]);
        if ($statement->rowCount() === 0) throw new \DomainException('Resource not found.');
    }

    private function definition(string $resource): array
    {
        return self::RESOURCES[$resource] ?? throw new \DomainException('Unknown resource.');
    }

    private static function uuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}

