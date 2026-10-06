import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  standalone: true,
  template: `<h1>CRM</h1><p>Authenticated foundation is running.</p><button (click)="logout()">Log out</button>`,
})
export class HomeComponent {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}

