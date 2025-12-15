import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {
  @Input() mode: 'fixed' | 'inline' | 'mobile' = 'fixed';
  @HostBinding('class.is-fixed') get isFixed() {
    return this.mode === 'fixed';
  }
  @HostBinding('class.is-inline') get isInline() {
    return this.mode === 'inline';
  }
  @HostBinding('class.is-mobile') get isMobile() {
    return this.mode === 'mobile';
  }

  readonly currentYear = new Date().getFullYear();

  readonly socialLinks = [
    {
      label: 'GitHub',
      href: 'https://github.com/ErwinHlz',
      icon: '#icon-github',
    },
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/erwin.hlz/',
      icon: '#icon-instagram',
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/erwin-holzhauser-018110299/',
      icon: '#icon-linkedin',
    },
  ];
}
