import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type FooterMode = 'fixed' | 'inline' | 'mobile';

@Injectable({ providedIn: 'root' })
export class FooterStateService {
  private readonly modeSubject = new BehaviorSubject<FooterMode>('fixed');
  readonly mode$ = this.modeSubject.asObservable();

  setMode(mode: FooterMode) {
    this.modeSubject.next(mode);
  }

  get current(): FooterMode {
    return this.modeSubject.getValue();
  }
}
