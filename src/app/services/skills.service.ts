import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Skill } from '../models/skill.model';

interface SkillsPayload {
  skills: Skill[];
}

@Injectable({
  providedIn: 'root',
})
export class SkillsService {
  constructor(private http: HttpClient) {}

  getSkills(): Observable<Skill[]> {
    return this.http
      .get<SkillsPayload>('assets/data/skills.json')
      .pipe(map((res) => res.skills || []));
  }
}
