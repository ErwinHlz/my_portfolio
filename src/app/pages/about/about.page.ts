import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TimelineComponent } from '../../components/timeline/timeline.component';
import { Skill } from '../../models/skill.model';
import { SkillsService } from '../../services/skills.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, TimelineComponent],
})
export class AboutPage implements OnInit {
  @ViewChildren('sec') sections!: QueryList<ElementRef<HTMLElement>>;

  skills: Skill[] = [];
  private readonly defaultScrollImage = '/assets/placeholder.png';
  activeScrollImage = this.defaultScrollImage;
  hobbies = [
    { name: 'Fußball', icon: 'fussball', image: '/assets/me_soccer_anime.png' },
    {
      name: 'Jugendtrainer',
      icon: 'jugendtrainer',
      image: '/assets/me_jugendtrainer_anime.png',
    },
    {
      name: 'Volleyball',
      icon: 'volleyball',
      image: '/assets/me_volleyball_anime.png',
    },
    {
      name: 'Fitness',
      icon: 'fitness',
      image: '/assets/me_muscleup_anime.png',
    },
    { name: 'Gaming', icon: 'gaming', image: '/assets/me_gaming_anime.png' },
  ];

  constructor(private skillsService: SkillsService) {}

  ngOnInit(): void {
    this.skillsService.getSkills().subscribe({
      next: (skills) => (this.skills = skills),
      error: (err) => console.error('Fehler beim Laden der Skills:', err),
    });
  }

  onScroll(ev: any) {
    const viewportHeight = ev.target.clientHeight;

    this.sections.forEach((secRef) => {
      const section = secRef.nativeElement;
      const rect = section.getBoundingClientRect();

      // Mittelpunkt der Section relativ zum Viewport
      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = viewportHeight / 2;

      // Normwert -1 … +1
      const normalized = (sectionCenter - viewportCenter) / viewportHeight;

      // 0 … 1 Fade berechnen
      const opacity = this.computeOpacity(normalized);

      section.style.opacity = opacity.toString();
    });
  }

  normalizeScroll(scrollTop: number, viewportHeight: number): number {
    let value = scrollTop / viewportHeight;
    if (value >= 1) {
      value = value - 1;
    }
    return value;
  }

  computeOpacity(v: number): number {
    const distance = Math.abs(v); // 0 = center
    const fadeRadius = 0.5; // innerhalb dieser Distanz voll sichtbar

    if (distance >= fadeRadius) return 0;

    return 1 - distance / fadeRadius;
  }

  setScrollImageByHobby(image?: string) {
    this.activeScrollImage = image || this.defaultScrollImage;
  }

  resetScrollImage() {
    this.activeScrollImage = this.defaultScrollImage;
  }
}
