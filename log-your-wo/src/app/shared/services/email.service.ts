import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable()
export class EmailService {

    constructor(
        private _http: HttpClient
    ) { }

    public sendMail(body) {
        var reqHeader = new HttpHeaders({ 'Content-Type': 'application/json' });
        return this._http.post('http://localhost:3000/sendmail', body, { headers: reqHeader, responseType: 'text' });
    }
}
