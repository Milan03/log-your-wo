import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class EmailService {

    constructor(
        private _http: HttpClient
    ) { }

    public sendMail(body) {
        return this._http.post('http://localhost:3000/sendmail', body);
    }
}
