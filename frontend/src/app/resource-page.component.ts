import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { firstValueFrom } from 'rxjs';
import { CrmItem, CrmList, CrmService } from './crm.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { ResourceFormDialogComponent } from './resource-form-dialog.component';

type ResourceConfig = { title: string; fields: string[]; createFields?: string[] };

const CONFIG: Record<string, ResourceConfig> = {
  companies: { title: 'Companies', fields: ['name', 'email', 'phone'], createFields: ['name', 'email', 'phone'] },
  contacts: { title: 'Contacts', fields: ['first_name', 'last_name', 'email', 'phone'], createFields: ['first_name', 'last_name', 'email', 'phone'] },
  leads: { title: 'Leads', fields: ['name', 'email', 'message', 'status', 'priority', 'industry'], createFields: ['name', 'email', 'message'] },
  'review-queue': { title: 'Review queue', fields: ['name', 'message', 'status', 'priority', 'industry', 'intent', 'summary', 'confidence'] },
  deals: { title: 'Deals', fields: ['name', 'amount', 'status', 'pipeline_stage_id'], createFields: ['name', 'amount', 'pipeline_stage_id'] },
  pipelines: { title: 'Pipelines', fields: ['name'], createFields: ['name'] },
  'pipeline-stages': { title: 'Pipeline stages', fields: ['name', 'position'] },
  activities: { title: 'Activities', fields: ['type', 'subject', 'occurred_at'] },
  tasks: { title: 'Tasks', fields: ['title', 'status', 'due_at'], createFields: ['title', 'status', 'due_at'] },
};

@Component({
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatDialogModule, MatProgressBarModule, MatTableModule],
  template: `
    <section class="resource-page">
      <div class="page-heading"><h1>{{ config.title }}</h1><span>{{ items.length }} records</span>@if (config.createFields) { <button mat-flat-button color="primary" class="add-button" (click)="openForm()">Add</button> }</div>
      @if (loading) { <mat-progress-bar mode="indeterminate" /> }
      @if (error) { <p class="error" role="alert">{{ error }}</p> }
      @if (!loading && !error && !items.length) { <mat-card><mat-card-content>No records yet.</mat-card-content></mat-card> }
      @if (!loading && !error) {
        <table mat-table [dataSource]="items" class="mat-elevation-z2">
          @for (field of config.fields; track field) {
            <ng-container [matColumnDef]="field">
              <th mat-header-cell *matHeaderCellDef>{{ field }}</th>
              <td mat-cell *matCellDef="let item">{{ item[field] ?? '—' }}</td>
            </ng-container>
          }
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let item">
              <button mat-flat-button class="edit-button" type="button" (click)="openForm(item)">Edit</button>
              <button mat-flat-button class="delete-button" type="button" (click)="remove(item.id)">Delete</button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      }
    </section>
  `,
})
export class ResourcePageComponent implements OnInit {
  resource = '';
  config: ResourceConfig = CONFIG.companies;
  items: CrmItem[] = [];
  loading = true;
  error = '';
  displayedColumns: string[] = [];
  stageOptions: CrmItem[] = [];
  requiredFields: string[] = [];

  constructor(private readonly route: ActivatedRoute, private readonly crm: CrmService, private readonly dialog: MatDialog) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.resource = params.get('resource') ?? 'companies';
      this.config = CONFIG[this.resource] ?? CONFIG.companies;
      this.displayedColumns = [...this.config.fields, 'actions'];
      this.stageOptions = [];
      this.requiredFields = this.resource === 'contacts' ? ['first_name', 'last_name']
        : this.resource === 'leads' ? ['name', 'message']
        : this.resource === 'deals' ? ['name', 'pipeline_stage_id']
        : this.resource === 'tasks' ? ['title']
        : ['name'];
      void this.load();
    });
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const apiResource = this.resource === 'review-queue' ? 'leads' : this.resource;
      const params: Record<string, string> = this.resource === 'review-queue' ? { status: 'NEEDS_REVIEW' } : {};
      this.items = (await this.crm.list(apiResource, params)).items;
      if (this.resource === 'deals') this.stageOptions = (await this.crm.list('pipeline-stages')).items;
    }
    catch { this.error = 'Could not load records.'; }
    finally { this.loading = false; }
  }

  openForm(item?: CrmItem): void {
    const fields = this.config.createFields ?? this.config.fields;
    const dialogRef = this.dialog.open(ResourceFormDialogComponent, {
      width: 'min(560px, calc(100vw - 32px))',
      data: { title: this.config.title, fields, requiredFields: this.requiredFields, stageOptions: this.stageOptions, values: item ? Object.fromEntries(fields.map((field) => [field, item[field] == null ? '' : String(item[field])])) : {}, editing: !!item },
    });
    dialogRef.afterClosed().subscribe((value) => { if (value) void this.persist(value, item?.id); });
  }

  async persist(value: Record<string, string>, id?: string): Promise<void> {
    try {
      if (id) {
        const item = await this.crm.update(this.resource === 'review-queue' ? 'leads' : this.resource, id, value);
        this.items = this.items.map((current) => current.id === item.id ? item : current);
      } else {
        const item = await this.crm.create(this.resource === 'review-queue' ? 'leads' : this.resource, value);
        this.items = [item, ...this.items];
      }
    } catch { this.error = id ? 'Could not update record.' : 'Could not create record.'; }
  }

  async remove(id: string): Promise<void> {
    const item = this.items.find((current) => current.id === id);
    if (!await firstValueFrom(this.dialog.open(ConfirmDialogComponent, { data: item?.['name'] ?? item?.['title'] ?? 'this record' }).afterClosed())) return;
    try { await this.crm.remove(this.resource === 'review-queue' ? 'leads' : this.resource, id); this.items = this.items.filter((item) => item.id !== id); }
    catch { this.error = 'Could not delete record.'; }
  }
}
