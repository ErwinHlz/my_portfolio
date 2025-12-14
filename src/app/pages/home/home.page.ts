import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BgGridComponent } from 'src/app/components/bg-grid/bg-grid.component';
import { FooterComponent } from 'src/app/components/footer/footer.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    BgGridComponent,
    FooterComponent,
  ],
})
export class HomePage {}
