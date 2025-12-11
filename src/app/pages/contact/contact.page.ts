import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule],
})
export class ContactPage {
  readonly contactEmail = 'erwinholzhauser.eh@gmail.com';

  form = {
    name: '',
    email: '',
    subject: '',
    message: '',
  };

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
