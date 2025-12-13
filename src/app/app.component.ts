import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, NavbarComponent, FooterComponent],
})
export class AppComponent implements OnInit {
  private spriteMounted = false;

  ngOnInit(): void {
    this.mountSprite('assets/logos/icons.svg');
    this.mountSprite('assets/opticals/schriftrolle.svg');
    this.mountSprite('assets/opticals/buch.svg');
  }

  private async mountSprite(url: string) {
    if (this.spriteMounted || typeof document === 'undefined') {
      return;
    }

    try {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) {
        return;
      }

      const spriteText = await response.text();
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.width = '0';
      wrapper.style.height = '0';
      wrapper.style.overflow = 'hidden';
      wrapper.setAttribute('aria-hidden', 'true');
      wrapper.innerHTML = spriteText;
      document.body.prepend(wrapper);
      this.spriteMounted = true;
    } catch {
      /* ignore fetch failures to avoid breaking app bootstrap */
    }
  }
}
