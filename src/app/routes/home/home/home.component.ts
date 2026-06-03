import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-home',
    standalone: false,
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

    constructor(
        private _router: Router
    ) { }

    ngOnInit() {
    }

    public navigateToSimpleLogEntry(): void {
        this._router.navigate(['/log-entry/simple-log']);
    }
}
