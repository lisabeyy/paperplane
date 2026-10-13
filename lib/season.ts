/** ISO week, Monday 00:00 UTC through Sunday 23:59:59.999 UTC. */

export function seasonBounds(now = new Date()): { id: string; startsAt: Date; endsAt: Date } {
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = utc.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const startsAt = new Date(utc);
  startsAt.setUTCDate(utc.getUTCDate() + mondayOffset);
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(startsAt.getUTCDate() + 7);
  endsAt.setUTCMilliseconds(-1);
  const thursday = new Date(startsAt);
  thursday.setUTCDate(startsAt.getUTCDate() + 3);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const id = `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  return { id, startsAt, endsAt };
}

export function seasonId(now = new Date()): string {
  return seasonBounds(now).id;
}
