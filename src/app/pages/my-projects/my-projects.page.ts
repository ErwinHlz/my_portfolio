import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-my-projects',
  templateUrl: './my-projects.page.html',
  styleUrls: ['./my-projects.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
})
export class MyProjectsPage implements OnDestroy {
  selectedView: 'current' | 'past' = 'current';
  activeProjectIndex = 0;
  activePreviewIndex = 0;
  showVideo = false;
  activeVideoUrl = '';
  isPreviewImageOpen = false;
  activePreviewImage = '';
  activePreviewTitle = '';
  private videoTimeoutId?: ReturnType<typeof setTimeout>;

  currentProjects = [
    {
      title: 'Portfolio Webseite',
      period: '2025 - jetzt',
      focus: 'Eigenes Portfolio mit Fokus auf kreative UI',
      summary:
        'Mein digitales Zuhause: eine übersichtliche Portfolio-Webseite, auf der ich meinen Werdegang und meine Projekte als Entwickler vorstelle',
      tags: ['Ionic', 'Angular', 'TypeScript', 'CSS'],
      status: 'In Arbeit',
      progress: 77,
      highlight: 'Persönliches Projekt',
      accent: 'darkgrey',
      previews: [
        {
          title: 'interaktiver Background',
          description:
            'Drag-and-Drop Effekt, welcher ein einzigartiges und lebendiges UI-Erlebnis liefert',
          image: '/assets/projects/portfolio_1.png',
        },
        {
          title: 'Timeline',
          description: 'Ein visuell anschaulicher Zeitstrahl meines Werdegangs',
          image: '/assets/projects/portfolio_2.png',
        },
      ],
    },
    {
      title: 'virtuelles Filesystem',
      period: '2025 - jetzt',
      focus: 'virtuelles Filesystem mit Client/Server Architektur',
      summary:
        'Virtuelles Filesystem mit User-Handling, CLI-Clients und einem Spring-Server entwickelt. Der Fokus des Projekts liegt darin ein System, welches unter Last stabil läuft, Fehler toleriert und gut skalierbar ist, zu entwickeln',
      tags: ['Spring', 'PicoCli', 'SQLite', 'Java'],
      status: 'In Arbeit',
      progress: 3,
      highlight: 'Uni-Projekt',
      accent: 'var(--accent-ember)',
      previews: [
        {
          title: 'Keine Einblicke',
          description: '',
          image: '',
        },
      ],
    },
  ];

  pastProjects = [
    {
      title: 'Terminplaner',
      period: '2024',
      focus: 'Uni-Terminplaner mit automatischem Kalender und User-Handling.',
      summary:
        'Vue.js Frontend, Java/Spring Backend mit User-Management. Automatischer Kalender, der Termine nach Regeln einträgt und verwaltet.',
      tags: ['Vue.js', 'Spring', 'Java', 'Jooq'],
      status: 'Abgeschlossen',
      progress: 100,
      highlight: 'Uni-Projekt',
      accent: 'var(--accent-blue)',
      previews: [
        {
          title: 'Kalender',
          description:
            'Tages-/Wochenansicht mit automatisch eingetragenen Terminen.',
          image: '/assets/projects/terminplaner_2.png',
        },
        {
          title: 'User-Handling',
          description:
            'Registrierung, Login und Rollen für verschiedene Benutzer.',
          image: '/assets/projects/terminplaner_3.png',
        },
        {
          title: 'Terminlogik',
          description:
            'Regelbasierte Erstellung und Aktualisierung von Terminen.',
          image: '/assets/projects/terminplaner_1.png',
          video: '',
        },
      ],
    },

    {
      title: 'Interaktive Feuerwehr-Lernplattform',
      period: '2023',
      focus: 'Gamifizierte Lernplattform für Feuerwehr-Grundlagen.',
      summary:
        'Webbasierte Lernplattform mit interaktivem Feuerwehrauto und Minispielen. Spielerisch werden Abläufe, Ausrüstung und Hydrantenstandorte vermittelt.',
      tags: ['Astro', 'Vue.js', 'Gamification'],
      status: 'Abgeschlossen',
      progress: 100,
      highlight: 'Uni-Projekt',
      accent: 'var(--accent-red)',
      previews: [
        {
          title: 'Interaktives Feuerwehrauto',
          description:
            'Anklickbares Feuerwehrauto mit Erklärungen zu Ausrüstung und Funktionen.',
          image: '/assets/projects/fw_1.png',
        },
        {
          title: 'Hydranten-Suchspiel',
          description: 'Minispiel zum Finden des Hydranten auf einer Karte',
          image: '/assets/projects/fw_2.png',
        },
      ],
    },
  ];

  get activeProjects() {
    return this.selectedView === 'current'
      ? this.currentProjects
      : this.pastProjects;
  }

  get activeProject() {
    return this.activeProjects[this.activeProjectIndex];
  }

  setView(view: 'current' | 'past') {
    this.selectedView = view;
    this.activeProjectIndex = 0;
    this.activePreviewIndex = 0;
  }

  nextProject() {
    if (this.activeProjectIndex < this.activeProjects.length - 1) {
      this.activeProjectIndex += 1;
      this.activePreviewIndex = 0;
    }
  }

  prevProject() {
    if (this.activeProjectIndex > 0) {
      this.activeProjectIndex -= 1;
      this.activePreviewIndex = 0;
    }
  }

  nextPreview() {
    if (this.activePreviewIndex < this.activeProject.previews.length - 1) {
      this.activePreviewIndex += 1;
    }
  }

  prevPreview() {
    if (this.activePreviewIndex > 0) {
      this.activePreviewIndex -= 1;
    }
  }

  openPreviewImage(preview: { image?: string; title?: string }) {
    if (!preview?.image) {
      return;
    }

    this.activePreviewImage = preview.image;
    this.activePreviewTitle = preview.title || 'Projekt-Einblick';
    this.isPreviewImageOpen = true;
  }

  closePreviewImage() {
    this.isPreviewImageOpen = false;
    this.activePreviewImage = '';
    this.activePreviewTitle = '';
  }

  openPreviewVideo(preview: { video?: string }) {
    const videoUrl = preview?.video;
    if (!videoUrl) {
      return;
    }

    this.activeVideoUrl = videoUrl;
    this.showVideo = true;

    if (this.videoTimeoutId) {
      clearTimeout(this.videoTimeoutId);
    }
    this.videoTimeoutId = setTimeout(() => this.closeVideo(), 8000);
  }

  closeVideo() {
    this.showVideo = false;
    this.activeVideoUrl = '';
    if (this.videoTimeoutId) {
      clearTimeout(this.videoTimeoutId);
      this.videoTimeoutId = undefined;
    }
  }

  ngOnDestroy(): void {
    if (this.videoTimeoutId) {
      clearTimeout(this.videoTimeoutId);
    }
  }
}
