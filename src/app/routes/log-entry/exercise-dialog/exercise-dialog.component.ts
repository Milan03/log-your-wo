import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTable } from '@angular/material/table';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

import { Exercise } from '../../../shared/models/exercise.model';
import { SharedService } from '../../../shared/services/shared.service';
import { TranslatorService } from '../../../core/translator/translator.service';
import { EmailService } from '../../../shared/services/email.service';
import { GoogleAnalyticsService } from '../../../shared/services/google-analytics.service';

import { LogTypes, FormValues } from '../../../shared/common/common.constants';

@Component({
  selector: 'exercise-dialog',
  templateUrl: './exercise-dialog.component.html',
  styleUrl: './exercise-dialog.component.scss'
})
export class ExerciseDialogComponent {
    public exerciseLogForm: UntypedFormGroup;
    private currentLanguage: string;
    
    private langSub: Subscription;
    constructor(
        private _formBuilder: UntypedFormBuilder,
        private _sharedService: SharedService,
        private _translatorService: TranslatorService,
        private _googleAnalyticsService: GoogleAnalyticsService
    ) {
        this.exerciseLogForm = this._formBuilder.group({
            'name': ['', Validators.compose([Validators.required, Validators.maxLength(50)])],
            'sets': ['', Validators.compose([Validators.pattern("^[0-9]*$"), Validators.maxLength(5)])],
            'reps': ['', Validators.compose([Validators.pattern("^[0-9]*$"), Validators.maxLength(5)])],
            'weight': ['', Validators.compose([Validators.maxLength(15)])]
        });
    }

    ngOnInit(): void {
        this.currentLanguage = FormValues.ENCode;
    }

    ngOnDestroy(): void {
        if (this.langSub)
            this.langSub.unsubscribe();
    }
}
