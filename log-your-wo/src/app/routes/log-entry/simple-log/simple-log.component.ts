import { Component, OnInit } from '@angular/core';

import { SharedService } from '../../../shared/services/shared.service';

import { LogTypes } from '../../../shared/common/common.constants';
import { SimpleLog } from '../../../shared/models/simple-log.model';

@Component({
    selector: 'app-simple-log',
    templateUrl: './simple-log.component.html',
    styleUrls: ['./simple-log.component.scss']
})
export class SimpleLogComponent implements OnInit {
    private currentLog: SimpleLog;
    private logStartDatim: Date;

    constructor(
        private _sharedService: SharedService
    ) {

    }

    ngOnInit(): void {
        this.currentLog = new SimpleLog();
        this.logStartDatim = new Date();
        this._sharedService.emitLogType(LogTypes.SimpleLog);
        this._sharedService.emitLogStartDatim(this.logStartDatim);
    }

}
