<?php

declare(strict_types=1);

namespace App;

use PDO;

final class UserRepository
{
    public function __construct(private PDO $database) {}

    public function create(string $email, string $passwordHash): array
    {
        $user = ['id' => self::uuid(), 'email' => $email];
        $statement = $this->database->prepare('INSERT INTO users (id, email, password_hash) VALUES (:id, :email, :password_hash)');
        $statement->execute([...$user, 'password_hash' => $passwordHash]);
        return $user;
    }

    public function findByEmail(string $email): ?array
    {
        $statement = $this->database->prepare('SELECT * FROM users WHERE email = :email');
        $statement->execute(['email' => $email]);
        return $statement->fetch() ?: null;
    }

    public function findById(string $id): ?array
    {
        $statement = $this->database->prepare('SELECT id, email, created_at FROM users WHERE id = :id');
        $statement->execute(['id' => $id]);
        return $statement->fetch() ?: null;
    }

    private static function uuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}

