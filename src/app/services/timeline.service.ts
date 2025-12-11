import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { TimelineEvent } from '../models/timeline.models';

interface TimelinePayload {
  events: TimelineEvent[];
}

@Injectable({
  providedIn: 'root',
})
export class TimelineService {
  constructor(private http: HttpClient) {}

  getTimeline(): Observable<TimelineEvent[]> {
    return this.http
      .get<TimelinePayload>('assets/data/timeline.json')
      .pipe(map((res) => res.events || []));
  }
}
