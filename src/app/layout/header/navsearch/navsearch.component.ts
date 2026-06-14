import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
    selector: 'app-navsearch',
    standalone: false,
    templateUrl: './navsearch.component.html',
    styleUrls: ['./navsearch.component.scss']
})
export class NavsearchComponent implements OnChanges {

    @Input() visible: boolean;
    @Output() onclose = new EventEmitter<void>();
    term: string;

    constructor(public elem: ElementRef<HTMLElement>) { }

    @HostListener('document:keyup.escape')
    public onEscape(): void {
        this.closeNavSearch();
    }

    @HostListener('document:click', ['$event'])
    public onDocumentClick(event: MouseEvent): void {
        const target = event.target;
        const contains = target instanceof Node
            && (this.elem.nativeElement === target || this.elem.nativeElement.contains(target));
        if (!contains) {
            this.closeNavSearch();
        }
    }

    public closeNavSearch(): void {
        this.visible = false;
        this.onclose.emit();
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.visible?.currentValue === true) {
            this.elem.nativeElement.querySelector<HTMLInputElement>('input')?.focus();
        }
    }

    public handleForm(): void {
        console.log('Form submit: ' + this.term);
    }
}
