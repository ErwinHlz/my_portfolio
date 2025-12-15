import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { FooterComponent } from 'src/app/components/footer/footer.component';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, FooterComponent],
})
export class ContactPage {
  readonly contactEmail = 'erwinholzhauser.eh@gmail.com';

  form = {
    name: '',
    email: '',
    subject: '',
    message: '',
  };

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

  get mailtoLink(): string {
    return this.buildMailtoLink();
  }

  openMailClient(event: Event) {
    event.preventDefault();
    window.location.href = this.buildMailtoLink();
  }

  private buildMailtoLink(): string {
    const subject = (this.form.subject || 'Kontaktanfrage').trim();
    const message = (this.form.message || 'Hi Erwin,').trim();

    const signatureLines = [
      this.form.name ? `Name: ${this.form.name.trim()}` : '',
      this.form.email ? `E-Mail: ${this.form.email.trim()}` : '',
    ].filter(Boolean);

    const body = [message, signatureLines.join('\n')]
      .filter(Boolean)
      .join('\n\n');

    const params = new URLSearchParams({
      subject,
      body,
    });

    return `mailto:${this.contactEmail}?${params.toString()}`;
  }
}
