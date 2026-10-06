import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { authGuard } from './app/auth.guard';
import { DashboardComponent } from './app/dashboard.component';
import { HomeComponent } from './app/home.component';
import { LoginComponent } from './app/login.component';
import { ResourcePageComponent } from './app/resource-page.component';
import { AuthService } from './app/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MatButtonModule, MatToolbarModule, RouterLink, RouterOutlet],
  template: `
    <mat-toolbar color="primary">
      <span>CRM</span>
      <nav>
        <a mat-button routerLink="/dashboard">Dashboard</a>
        <a mat-button routerLink="/crm/leads">Leads</a>
        <a mat-button routerLink="/crm/companies">Companies</a>
        <a mat-button routerLink="/crm/contacts">Contacts</a>
        <a mat-button routerLink="/crm/deals">Deals</a>
        <a mat-button routerLink="/crm/tasks">Tasks</a>
      </nav>
      <button mat-flat-button color="warn" type="button" (click)="logout()">Log out</button>
    </mat-toolbar>
    <main><router-outlet /></main>
  `,
})
class AppComponent {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

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
      { path: '', component: HomeComponent, canActivate: [authGuard] },
      { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
      { path: 'crm/:resource', component: ResourcePageComponent, canActivate: [authGuard] },
      { path: '**', redirectTo: 'dashboard' },
    ]),
  ],
}).catch(console.error);
