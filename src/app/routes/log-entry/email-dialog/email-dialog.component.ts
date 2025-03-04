import { Component } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-email-dialog',
    templateUrl: './email-dialog.component.html',
    styleUrls: ['./email-dialog.component.scss']
})
export class EmailDialogComponent {
    public emailForm: UntypedFormGroup;

    constructor(
        public _dialogRef: MatDialogRef<EmailDialogComponent>,
        private _formBuilder: UntypedFormBuilder
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
