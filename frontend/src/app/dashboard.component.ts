import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Chart } from 'chart.js/auto';
import { CrmItem, CrmService } from './crm.service';

type DashboardStat = { label: string; resource: string; route: string; total: number };
type AnalyticsRow = { label: string; count: number; percent: number };

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
      <div class="analytics-grid">
        <article class="analytics-card">
          <h2>Lead pipeline</h2>
          <div class="analytics-chart"><canvas #leadChart></canvas></div>
        </article>
        <article class="analytics-card">
          <h2>Deal outcomes</h2>
          <div class="analytics-chart"><canvas #dealChart></canvas></div>
        </article>
      </div>
    </section>
  `,
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('leadChart') private readonly leadCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('dealChart') private readonly dealCanvas?: ElementRef<HTMLCanvasElement>;

  readonly stats: DashboardStat[] = [
    { label: 'Companies', resource: 'companies', route: '/crm/companies', total: 0 },
    { label: 'Contacts', resource: 'contacts', route: '/crm/contacts', total: 0 },
    { label: 'Leads', resource: 'leads', route: '/crm/leads', total: 0 },
    { label: 'Deals', resource: 'deals', route: '/crm/deals', total: 0 },
  ];
  loading = true;
  error = '';
  leadStatus: AnalyticsRow[] = [];
  dealStatus: AnalyticsRow[] = [];
  private viewReady = false;
  private leadChart?: Chart;
  private dealChart?: Chart;

  constructor(private readonly crm: CrmService) {}

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderCharts();
  }

  async ngOnInit(): Promise<void> {
    try {
      const results = await Promise.all(this.stats.map((stat) => this.crm.list(stat.resource)));
      results.forEach((result, index) => { this.stats[index].total = result.total; });
      this.leadStatus = this.chart(results[2].items, 'status', ['NEW', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED']);
      this.dealStatus = this.chart(results[3].items, 'status', ['OPEN', 'WON', 'LOST']);
    } catch {
      this.error = 'Could not load dashboard totals.';
    } finally {
      this.loading = false;
      this.renderCharts();
    }
  }

  ngOnDestroy(): void {
    this.leadChart?.destroy();
    this.dealChart?.destroy();
  }

  private chart(items: CrmItem[], field: string, labels: string[]): AnalyticsRow[] {
    const counts = labels.map((label) => items.filter((item) => item[field] === label).length);
    const max = Math.max(1, ...counts);
    return labels.map((label, index) => ({ label, count: counts[index], percent: counts[index] / max * 100 }));
  }

  private renderCharts(): void {
    if (!this.viewReady || this.loading || !this.leadCanvas || !this.dealCanvas) return;
    this.leadChart?.destroy();
    this.dealChart?.destroy();
    this.leadChart = this.createChart(this.leadCanvas.nativeElement, this.leadStatus, ['#2563eb', '#0891b2', '#f59e0b', '#16a34a']);
    this.dealChart = this.createChart(this.dealCanvas.nativeElement, this.dealStatus, ['#2563eb', '#16a34a', '#dc2626']);
  }

  private createChart(canvas: HTMLCanvasElement, rows: AnalyticsRow[], colors: string[]): Chart {
    return new Chart(canvas, {
      type: 'bar',
      data: { labels: rows.map((row) => row.label), datasets: [{ data: rows.map((row) => row.count), backgroundColor: colors, borderRadius: 8, borderSkipped: false }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } } },
    });
  }
}
