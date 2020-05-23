import { Component, OnInit } from '@angular/core';

import { SharedService } from '../../../shared/services/shared.service';

import { LogTypes } from '../../../shared/common/common.constants';

@Component({
    selector: 'app-simple-log',
    templateUrl: './simple-log.component.html',
    styleUrls: ['./simple-log.component.scss']
})
export class SimpleLogComponent implements OnInit {
    private logStartDatim: Date;

    constructor(
        private _sharedService: SharedService
    ) {

    }

    ngOnInit(): void {
        this.logStartDatim = new Date();
        this._sharedService.emitLogType(LogTypes.SimpleLog);
        this._sharedService.emitLogStartDatim(this.logStartDatim);
    }

}
