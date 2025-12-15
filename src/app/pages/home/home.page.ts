import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BgGridComponent } from 'src/app/components/bg-grid/bg-grid.component';
import { FooterComponent } from 'src/app/components/footer/footer.component';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

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
export class HomePage implements OnInit {
  footerMode: 'fixed' | 'inline' | 'mobile' = 'fixed';
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.updateFooterMode(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.updateFooterMode(e.urlAfterRedirects);
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      });
  }

  private updateFooterMode(url: string) {
    const path = url.split('?')[0];
    const first = path.split('/').filter(Boolean)[0] || 'home';
    const width = window.innerWidth;

    if (first === 'home' && width >= 780) {
      this.footerMode = 'fixed';
    } else if (first === 'home' && width <= 780) {
      this.footerMode = 'fixed';
    } else if (first !== 'home' && width <= 780) {
      this.footerMode = 'mobile';
    } else if (first !== 'home' && width >= 780) {
      this.footerMode = 'inline';
    }
  }
}
