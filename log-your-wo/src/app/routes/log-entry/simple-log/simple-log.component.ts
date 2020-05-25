import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';

import { SharedService } from '../../../shared/services/shared.service';

import { LogTypes } from '../../../shared/common/common.constants';
import { SimpleLog } from '../../../shared/models/simple-log.model';

@Component({
    selector: 'app-simple-log',
    templateUrl: './simple-log.component.html',
    styleUrls: ['./simple-log.component.scss']
})
export class SimpleLogComponent implements OnInit {
    private simpleLogForm: FormGroup;
    private currentLog: SimpleLog;
    private logStartDatim: Date;

    constructor(
        private _formBuilder: FormBuilder,
        private _sharedService: SharedService
    ) {
        this.simpleLogForm = _formBuilder.group({});
    }

    ngOnInit(): void {
        this.currentLog = new SimpleLog();
        this.logStartDatim = new Date();
        this._sharedService.emitLogType(LogTypes.SimpleLog);
        this._sharedService.emitLogStartDatim(this.logStartDatim);
    }

    private submitForm($ev, value: any): void {
        $ev.preventDefault();
        for (let c in this.simpleLogForm.controls) {
            this.simpleLogForm.controls[c].markAsTouched();
        }
        if (this.simpleLogForm.valid) {
            
        }
    }

}
