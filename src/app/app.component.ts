import { Component, OnInit, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, NavbarComponent, FooterComponent],
})
export class AppComponent implements OnInit {
  footerMode: 'fixed' | 'inline' = 'fixed';
  private readonly router = inject(Router);
  private spriteMounted = false;

  ngOnInit(): void {
    this.mountSprite('assets/logos/icons.svg');
    this.mountSprite('assets/opticals/schriftrolle.svg');
    this.mountSprite('assets/opticals/buch.svg');
    this.updateFooterMode(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateFooterMode(e.urlAfterRedirects));
  }

  private updateFooterMode(url: string) {
    const path = url.split('?')[0];
    const first = path.split('/').filter(Boolean)[0] || 'home';
    this.footerMode = first === 'home' ? 'fixed' : 'inline';
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
