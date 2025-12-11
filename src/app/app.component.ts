import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { MenuController } from '@ionic/angular';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, NavbarComponent, FooterComponent],
})
export class AppComponent {
  constructor(private menuCtrl: MenuController) {}

  async closeMenu() {
    await this.menuCtrl.close('mainMenu');
  }
}
