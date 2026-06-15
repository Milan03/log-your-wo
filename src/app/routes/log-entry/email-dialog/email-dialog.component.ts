import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';

import { SharedModule } from '../../../shared/shared.module';

interface EmailForm {
    emailAddress: FormControl<string | null>;
}

@Component({
    selector: 'app-email-dialog',
    standalone: true,
    imports: [
        SharedModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule
    ],
    templateUrl: './email-dialog.component.html',
    styleUrls: ['./email-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmailDialogComponent {
    public _dialogRef = inject(MatDialogRef) as MatDialogRef<EmailDialogComponent>;
    private _formBuilder = inject(FormBuilder);

    public emailForm: FormGroup<EmailForm> = this._formBuilder.group({
        'emailAddress': ['', Validators.compose([Validators.required, Validators.email])]
    });
    
    public submitForm(event: Event): void {
        event.preventDefault();
        this.emailForm.markAllAsTouched();
        if (this.emailForm.valid) {
            this._dialogRef.close(this.emailForm.get('emailAddress').value);
        }
    }
}
