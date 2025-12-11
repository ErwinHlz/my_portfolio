import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();

  readonly socialLinks = [
    {
      label: 'GitHub',
      href: 'https://github.com/ErwinHlz',
      icon: '/assets/logos/icons.svg#icon-github',
    },
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/erwin.hlz/',
      icon: '/assets/logos/icons.svg#icon-instagram',
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/erwin-holzhauser-018110299/',
      icon: '/assets/logos/icons.svg#icon-linkedin',
    },
  ];
}
