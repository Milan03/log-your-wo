import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FormatDurationPipe } from './pipes/format-duration.pipe';
import { IntensityFormatPipe } from './pipes/format-intensity.pipe';
import { DuplicateNamePipe } from './pipes/duplicate-name.pipe';

// https://angular.io/styleguide#!#04-10
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TranslateModule
    ],
    declarations: [
        FormatDurationPipe,
        IntensityFormatPipe,
        DuplicateNamePipe
    ],
    exports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TranslateModule,
        RouterModule,
        FormatDurationPipe,
        IntensityFormatPipe,
        DuplicateNamePipe
    ]
})
export class SharedModule { }
