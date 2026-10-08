import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export type ConfirmDialogData = string | { title: string; message: string; confirmLabel: string };

@Component({
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>
    <mat-dialog-content>{{ message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close(false)">Cancel</button>
      <button mat-flat-button color="primary" type="button" (click)="dialogRef.close(true)">{{ confirmLabel }}</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: ConfirmDialogData,
    readonly dialogRef: MatDialogRef<ConfirmDialogComponent>,
  ) {}

  get title(): string { return typeof this.data === 'string' ? 'Confirm delete' : this.data.title; }
  get message(): string { return typeof this.data === 'string' ? `Delete ${this.data}? This cannot be undone.` : this.data.message; }
  get confirmLabel(): string { return typeof this.data === 'string' ? 'Delete' : this.data.confirmLabel; }
}
