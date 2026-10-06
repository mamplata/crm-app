import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export type ResourceFormData = {
  title: string;
  fields: string[];
  requiredFields: string[];
  stageOptions: Record<string, unknown>[];
  values: Record<string, string>;
  editing: boolean;
};

@Component({
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  styles: [`
    mat-dialog-content { padding-top: 8px; }
    .dialog-form { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); padding-top: 8px; }
    .dialog-form mat-form-field { width: 100%; }
  `],
  template: `
    <h2 mat-dialog-title>{{ data.editing ? 'Edit' : 'Add' }} {{ data.title | slice:0:-1 }}</h2>
    <mat-dialog-content>
      <form class="dialog-form" (submit)="save($event)">
        @for (field of data.fields; track field) {
          @if (field === 'pipeline_stage_id') {
            <mat-form-field appearance="outline">
              <mat-label>Pipeline stage</mat-label>
              <mat-select [value]="values[field] ?? ''" (selectionChange)="values[field] = $event.value" required>
                @for (stage of data.stageOptions; track stage['id']) {
                  <mat-option [value]="stage['id']">{{ stage['name'] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          } @else {
            <mat-form-field appearance="outline">
              <mat-label>{{ field }}</mat-label>
              <input matInput [value]="values[field] ?? ''" (input)="setValue(field, $event)" [required]="data.requiredFields.includes(field)">
            </mat-form-field>
          }
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" type="button" (click)="save($event)">{{ data.editing ? 'Save' : 'Add' }}</button>
    </mat-dialog-actions>
  `,
})
export class ResourceFormDialogComponent {
  values = { ...this.data.values };

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: ResourceFormData,
    readonly dialogRef: MatDialogRef<ResourceFormDialogComponent>,
  ) {}

  setValue(field: string, event: Event): void {
    this.values[field] = (event.target as HTMLInputElement).value;
  }

  save(event: Event): void {
    event.preventDefault();
    if (!this.data.editing && this.data.requiredFields.some((field) => !this.values[field]?.trim())) return;
    this.dialogRef.close(Object.fromEntries(Object.entries(this.values).filter(([, value]) => value.trim())));
  }
}
