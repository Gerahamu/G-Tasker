import type { TimeMark } from './types';

export interface TimeMarkSegment { mark: TimeMark; row: number; lane: number; startColumn: number; endColumn: number; isStart: boolean; isEnd: boolean; }

export function getTimeMarkSegments(weeks: Array<Array<{ dateKey: string }>>, marks: TimeMark[]): TimeMarkSegment[] {
  const segments: TimeMarkSegment[] = [];
  weeks.forEach((week, row) => {
    const occupied: boolean[][] = [];
    marks.filter((mark) => mark.startDate <= week[6].dateKey && mark.endDate >= week[0].dateKey).sort((a,b) => a.priority - b.priority).forEach((mark) => {
      const startColumn = Math.max(0, week.findIndex((day) => day.dateKey >= mark.startDate));
      const endColumn = Math.max(...week.map((day, i) => day.dateKey <= mark.endDate ? i : -1));
      let lane = 0; while (occupied[lane]?.slice(startColumn, endColumn + 1).some(Boolean)) lane++;
      occupied[lane] ??= []; for (let i=startColumn;i<=endColumn;i++) occupied[lane][i]=true;
      segments.push({ mark, row, lane, startColumn, endColumn, isStart: mark.startDate >= week[0].dateKey, isEnd: mark.endDate <= week[6].dateKey });
    });
  });
  return segments;
}
