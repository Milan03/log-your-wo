import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

interface EmailForm {
    emailAddress: FormControl<string | null>;
}

@Component({
  selector: 'app-email-dialog',
  standalone: false,
  templateUrl: './email-dialog.component.html',
    styleUrls: ['./email-dialog.component.scss']
})
export class EmailDialogComponent {
    public emailForm: FormGroup<EmailForm>;

    constructor(
        public _dialogRef: MatDialogRef<EmailDialogComponent>,
        private _formBuilder: FormBuilder
    ) {
        this.emailForm = this._formBuilder.group({
            'emailAddress': ['', Validators.compose([Validators.required, Validators.email])]
        });
    }
    
    submitForm($ev, value: any) {
        $ev.preventDefault();
        for (let c in this.emailForm.controls) {
            this.emailForm.controls[c].markAsTouched();
        }
        if (this.emailForm.valid) {
            this._dialogRef.close(this.emailForm.get('emailAddress').value);
        }
    }
}
