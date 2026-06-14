import { NgModule } from '@angular/core';
import { MatRippleModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';

import { LayoutComponent } from './layout.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';
import { OffsidebarComponent } from './offsidebar/offsidebar.component';
import { FooterComponent } from './footer/footer.component';

import { SharedModule } from '../shared/shared.module';

@NgModule({
    imports: [
        SharedModule,
        MatFormFieldModule,
        MatMenuModule,
        MatRippleModule,
        MatSelectModule
    ],
    declarations: [
        LayoutComponent,
        SidebarComponent,
        HeaderComponent,
        OffsidebarComponent,
        FooterComponent
    ],
    exports: [
        LayoutComponent,
        SidebarComponent,
        HeaderComponent,
        OffsidebarComponent,
        FooterComponent
    ]
})
export class LayoutModule { }
