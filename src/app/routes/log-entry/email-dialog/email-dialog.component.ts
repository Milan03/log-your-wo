import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TranslateModule } from '@ngx-translate/core';

interface EmailForm {
    emailAddress: FormControl<string | null>;
}

export interface EmailDialogData {
    initialEmail?: string;
}

@Component({
    selector: 'app-email-dialog',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        TranslateModule,
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
    private _emailDialogData = inject<EmailDialogData | null>(MAT_DIALOG_DATA, { optional: true });

    public emailForm: FormGroup<EmailForm> = this._formBuilder.group({
        'emailAddress': [
            this._emailDialogData?.initialEmail || '',
            Validators.compose([Validators.required, Validators.email])
        ]
    });
    
    public submitForm(event: Event): void {
        event.preventDefault();
        this.emailForm.markAllAsTouched();
        if (this.emailForm.valid) {
            this._dialogRef.close(this.emailForm.get('emailAddress').value);
        }
    }
}
