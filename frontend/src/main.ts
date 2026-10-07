import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { authGuard } from './app/auth.guard';
import { DashboardComponent } from './app/dashboard.component';
import { LoginComponent } from './app/login.component';
import { ResourcePageComponent } from './app/resource-page.component';
import { AuthService } from './app/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MatButtonModule, MatToolbarModule, RouterLink, RouterOutlet],
  template: `
    @if (router.url !== '/login') {
      <mat-toolbar color="primary">
        <a class="brand" routerLink="/" aria-label="CRM home">
          <img src="assets/logo.png" alt="CRM">
        </a>
        <nav [class.open]="menuOpen">
          <a routerLink="/dashboard" routerLinkActive="active" (click)="menuOpen = false">Dashboard</a>
          <a routerLink="/crm/leads" routerLinkActive="active" (click)="menuOpen = false">Leads</a>
          <a routerLink="/crm/review-queue" routerLinkActive="active" (click)="menuOpen = false">Review queue</a>
          <a routerLink="/crm/companies" routerLinkActive="active" (click)="menuOpen = false">Companies</a>
          <a routerLink="/crm/contacts" routerLinkActive="active" (click)="menuOpen = false">Contacts</a>
          <a routerLink="/crm/deals" routerLinkActive="active" (click)="menuOpen = false">Deals</a>
          <a routerLink="/crm/tasks" routerLinkActive="active" (click)="menuOpen = false">Tasks</a>
        </nav>
        <button class="menu-toggle" type="button" (click)="menuOpen = !menuOpen" [attr.aria-expanded]="menuOpen">☰ Menu</button>
        <button mat-flat-button color="warn" type="button" (click)="logout()">Log out</button>
      </mat-toolbar>
    }
    <main><router-outlet /></main>
  `,
})
class AppComponent {
  menuOpen = false;

  constructor(private readonly auth: AuthService, public readonly router: Router) {}

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideRouter([
      { path: 'login', component: LoginComponent },
      { path: '', component: DashboardComponent, canActivate: [authGuard] },
      { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
      { path: 'crm/:resource', component: ResourcePageComponent, canActivate: [authGuard] },
      { path: '**', redirectTo: 'dashboard' },
    ]),
  ],
}).catch(console.error);
