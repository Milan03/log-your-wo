import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SharedService } from '../../../shared/services/shared.service';

@Component({
    selector: 'app-home',
    standalone: false,
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

    constructor(
        private _router: Router,
        private _sharedService: SharedService
    ) { }

    ngOnInit() {
        this._sharedService.emitLogType(undefined);
    }

    public navigateToSimpleLogEntry(): void {
        this._router.navigate(['/log-entry/simple-log']);
    }

    public navigateToImportProgram(): void {
        this._router.navigate(['/log-entry/import-program']);
    }
}
