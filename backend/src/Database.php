<?php

declare(strict_types=1);

namespace App;

use PDO;

final class Database
{
    private PDO $connection;

    public function __construct(string $url)
    {
        $parts = parse_url($url);
        $this->connection = new PDO(
            sprintf('pgsql:host=%s;port=%s;dbname=%s', $parts['host'], $parts['port'] ?? 5432, ltrim($parts['path'], '/')),
            $parts['user'],
            $parts['pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC],
        );
    }

    public function connection(): PDO { return $this->connection; }

    public function migrate(): void
    {
        $this->connection->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash CHAR(64) PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TIMESTAMPTZ NOT NULL
            );
        SQL);
        $this->connection->exec(file_get_contents(dirname(__DIR__) . '/migrations/001_crm.sql'));
        $this->connection->exec(file_get_contents(dirname(__DIR__) . '/migrations/002_demo.sql'));
    }
}
