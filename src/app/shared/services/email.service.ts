import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { EmailRequest } from '../models/email-request.model';
import { environment } from 'src/environments/environment';

@Injectable()
export class EmailService {
    private apiBase: string;
    
    private readonly sendMailAppend: string = 'sendmail';

    constructor(
        private _http: HttpClient
    ) { }

    public sendMail(body: EmailRequest) {
        var reqHeader = new HttpHeaders({ 'Content-Type': 'application/json' });
        return this._http.post(`${environment.apiBaseAddress}/${this.sendMailAppend}`, body, { headers: reqHeader, responseType: 'text' });
    }
}
