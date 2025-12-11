export type TimelineEndpoint = 'before' | 'now' | string;

export interface TimelineEvent {
  id: string;
  dateStart: TimelineEndpoint;
  dateEnd: TimelineEndpoint;
  title: string;
  location?: string;
  institution?: string;
  side: 'left' | 'right';
}
