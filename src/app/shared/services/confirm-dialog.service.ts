import { Injectable } from '@angular/core';
import Swal from 'sweetalert2/dist/sweetalert2.esm.all.js';

export interface ConfirmDangerOptions {
    title: string;
    text: string;
    confirmText: string;
    cancelText: string;
}

/**
 * Thin wrapper over SweetAlert2 for destructive confirm dialogs (delete a log,
 * reset a workout, delete an imported program). Centralizes the warning styling
 * — red confirm button, cancel on the left and focused by default — so the
 * call sites just pass already-translated copy and await a boolean.
 */
@Injectable({
    providedIn: 'root'
})
export class ConfirmDialogService {
    public async confirmDanger(options: ConfirmDangerOptions): Promise<boolean> {
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
