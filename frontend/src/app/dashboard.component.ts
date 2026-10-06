import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <h2>Dashboard</h2>
    <p>CRM foundation is ready. Choose a resource to manage.</p>
    <a routerLink="/crm/leads">Open leads</a>
  `,
})
export class DashboardComponent {}

