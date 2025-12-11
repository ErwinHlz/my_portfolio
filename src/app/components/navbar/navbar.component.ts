import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: 'navbar.component.html',
  styleUrls: ['navbar.component.scss'],
  imports: [CommonModule, IonicModule, RouterModule],
  standalone: true,
})
export class NavbarComponent implements OnInit {
  isMenuOpen: boolean = false;
  @Output() menuToggled: EventEmitter<boolean> = new EventEmitter<boolean>();
  constructor() {}
  ngOnInit() {}
  async toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    this.menuToggled.emit(this.isMenuOpen);
    if (this.isMenuOpen) {
      setTimeout(() => {
        const menu = document.getElementById('side-menu');
        menu?.focus();
      }, 50);
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeHandler(event: KeyboardEvent) {
    if (this.isMenuOpen) {
      this.isMenuOpen = false;
      this.menuToggled.emit(this.isMenuOpen);
    }
  }
}
