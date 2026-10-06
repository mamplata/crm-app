import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

type LoginResponse = { token: string; user: { email: string } };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'crm_token';
  readonly user = signal<{ email: string } | null>(null);

  constructor(private readonly http: HttpClient) {}

  get isLoggedIn(): boolean { return Boolean(localStorage.getItem(this.tokenKey)); }

  async login(email: string, password: string): Promise<void> {
    const response = await firstValueFrom(this.http.post<LoginResponse>('http://localhost:8001/api/auth/login', { email, password }));
    localStorage.setItem(this.tokenKey, response.token);
    this.user.set(response.user);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.user.set(null);
  }
}

