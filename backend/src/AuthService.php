<?php

declare(strict_types=1);

namespace App;

use PDO;

final class AuthService
{
    public function __construct(private PDO $database, private UserRepository $users) {}

    public function register(string $email, string $password): array
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
            throw new \InvalidArgumentException('Valid email and password of at least 8 characters are required.');
        }
        if ($this->users->findByEmail($email)) {
            throw new \DomainException('Email is already registered.');
        }
        return $this->users->create(strtolower($email), password_hash($password, PASSWORD_DEFAULT));
    }

    public function login(string $email, string $password): array
    {
        $user = $this->users->findByEmail(strtolower($email));
        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new \DomainException('Invalid credentials.');
        }
        $token = bin2hex(random_bytes(32));
        $statement = $this->database->prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (:token, :user_id, NOW() + INTERVAL '7 days')");
        $statement->execute(['token' => hash('sha256', $token), 'user_id' => $user['id']]);
        return ['token' => $token, 'user' => $this->users->findById($user['id'])];
    }

    public function userFromToken(string $token): ?array
    {
        $statement = $this->database->prepare('SELECT user_id FROM sessions WHERE token_hash = :token AND expires_at > NOW()');
        $statement->execute(['token' => hash('sha256', $token)]);
        $session = $statement->fetch();
        return $session ? $this->users->findById($session['user_id']) : null;
    }
}

