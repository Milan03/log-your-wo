import { Component, OnInit } from '@angular/core';

import { SharedService } from '../../../shared/services/shared.service';

import { LogTypes } from '../../../shared/common/common.constants';

@Component({
    selector: 'app-simple-log',
    templateUrl: './simple-log.component.html',
    styleUrls: ['./simple-log.component.scss']
})
export class SimpleLogComponent implements OnInit {

    constructor(
        private _sharedService: SharedService
    ) {
        //this._sharedService.emitLogType(LogTypes.SimpleLog);
    }

    ngOnInit(): void {
        this._sharedService.emitLogType(LogTypes.SimpleLog);
    }

}
