import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { EmailRequest } from '../models/email-request.model';
import { environment } from 'src/environments/environment';

@Injectable()
export class EmailService {
    private readonly sendMailAppend: string = 'sendmail';

    constructor(
        private _http: HttpClient
    ) { }

    public sendMail(body: EmailRequest): Observable<string> {
        const reqHeader = new HttpHeaders({ 'Content-Type': 'application/json' });
        return this._http.post(`${environment.apiBaseAddress}/${this.sendMailAppend}`, body, { headers: reqHeader, responseType: 'text' });
    }
}
