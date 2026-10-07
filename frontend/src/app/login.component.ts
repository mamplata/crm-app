import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  standalone: true,
  template: `
    <section class="login-page">
      <h1>CRM login</h1>
      <form (submit)="login($event)">
        <label for="email">Email</label>
        <input id="email" type="email" [value]="email" (input)="email = inputValue($event)" required>
        <label for="password">Password</label>
        <input id="password" type="password" [value]="password" (input)="password = inputValue($event)" required>
        <button type="submit">Log in</button>
        @if (error) { <p>{{ error }}</p> }
      </form>
    </section>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  inputValue(event: Event): string { return (event.target as HTMLInputElement).value; }

  async login(event: Event): Promise<void> {
    event.preventDefault();
    this.error = '';
    try {
      await this.auth.login(this.email, this.password);
      await this.router.navigateByUrl('/dashboard');
    } catch {
      this.error = 'Invalid email or password.';
    }
  }
}
