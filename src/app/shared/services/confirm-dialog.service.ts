import { Injectable } from '@angular/core';
import Swal from 'sweetalert2/dist/sweetalert2.esm.all.js';

export interface ConfirmOptions {
    title: string;
    text: string;
    confirmText: string;
    cancelText: string;
}

export interface AlertOptions {
    title: string;
    text: string;
    confirmText: string;
    denyText?: string;
    cancelText?: string;
}

export type AlertChoice = 'confirm' | 'deny' | 'cancel';

/**
 * Thin wrapper over SweetAlert2 for confirm dialogs. Centralizes the styling so
 * call sites just pass already-translated copy and await a boolean. `success`
 * is the neutral completion notice, `confirm` is the neutral affirmative dialog,
 * `confirmDanger` adds the destructive warning treatment (red confirm button,
 * cancel on the left and focused by default).
 */
@Injectable({
    providedIn: 'root'
})
export class ConfirmDialogService {
    public async success(options: AlertOptions): Promise<AlertChoice> {
        const result = await Swal.fire({
            title: options.title,
            text: options.text,
            icon: 'success',
            showDenyButton: Boolean(options.denyText),
            showCancelButton: Boolean(options.cancelText),
            confirmButtonText: options.confirmText,
            denyButtonText: options.denyText,
            cancelButtonText: options.cancelText,
            confirmButtonColor: '#2fb379'
        });

        if (result.isConfirmed) {
            return 'confirm';
        }

        if (result.isDenied) {
            return 'deny';
        }

        return 'cancel';
    }

    public async confirm(options: ConfirmOptions): Promise<boolean> {
        const result = await Swal.fire({
            title: options.title,
            text: options.text,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: options.confirmText,
            cancelButtonText: options.cancelText,
            confirmButtonColor: '#2fb379',
            reverseButtons: true
        });

        return result.isConfirmed;
    }

    public async confirmDanger(options: ConfirmOptions): Promise<boolean> {
        const result = await Swal.fire({
            title: options.title,
            text: options.text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: options.confirmText,
            cancelButtonText: options.cancelText,
            confirmButtonColor: '#eb5757',
            reverseButtons: true,
            focusCancel: true
        });

        return result.isConfirmed;
    }
}
