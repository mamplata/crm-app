import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CrmService } from './crm.service';

type DashboardStat = { label: string; resource: string; route: string; total: number };

@Component({
  standalone: true,
  imports: [MatCardModule, MatProgressBarModule, RouterLink],
  template: `
    <section class="dashboard">
      <div class="page-heading"><div><h1>Dashboard</h1><span>CRM overview</span></div></div>
      @if (loading) { <mat-progress-bar mode="indeterminate" /> }
      @if (error) { <p class="error" role="alert">{{ error }}</p> }
      <div class="dashboard-grid">
        @for (stat of stats; track stat.resource) {
          <a class="dashboard-card" [routerLink]="stat.route">
            <span>{{ stat.label }}</span>
            <strong>{{ stat.total }}</strong>
            <small>View records →</small>
          </a>
        }
      </div>
    </section>
  `,
})
export class DashboardComponent {
  readonly stats: DashboardStat[] = [
    { label: 'Companies', resource: 'companies', route: '/crm/companies', total: 0 },
    { label: 'Contacts', resource: 'contacts', route: '/crm/contacts', total: 0 },
    { label: 'Leads', resource: 'leads', route: '/crm/leads', total: 0 },
    { label: 'Deals', resource: 'deals', route: '/crm/deals', total: 0 },
  ];
  loading = true;
  error = '';

  constructor(private readonly crm: CrmService) {}

  async ngOnInit(): Promise<void> {
    try {
      const results = await Promise.all(this.stats.map((stat) => this.crm.list(stat.resource)));
      results.forEach((result, index) => { this.stats[index].total = result.total; });
    } catch {
      this.error = 'Could not load dashboard totals.';
    } finally {
      this.loading = false;
    }
  }
}
