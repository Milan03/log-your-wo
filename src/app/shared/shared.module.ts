import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { EmailService } from './services/email.service';
import { ExerciseDirectoryService } from './services/exercise-directory.service';

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
    providers: [
        EmailService,
        ExerciseDirectoryService
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

// https://github.com/ocombe/ng2-translate/issues/209
export class SharedModule {
    static forRoot(): ModuleWithProviders<SharedModule> {
        return {
            ngModule: SharedModule
        };
    }
}
