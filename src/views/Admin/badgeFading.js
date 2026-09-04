/**
 * Badge fading lifecycle, mirrored on the client.
 *
 * The backend already resolves `faded` vs `expired` for the volunteer-facing
 * endpoints, but the admin panel reads `GET /gamification/:projectId`, which
 * returns the raw stored status on purpose — an admin should be able to tell
 * "fading, window still open" from "fading, window elapsed" and act on both.
 * So the resolution rule lives here too. It's the same one as
 * `effectiveBadgeStatus` in gamification.entity.ts: a stored `expiresAt` in
 * the past always reads as expired.
 */

export const BADGE_STATUS = {
  ACTIVE: 'active',
  FADED: 'faded',
  EXPIRED: 'expired',
};

/** What the badge's status actually is right now. */
export function effectiveStatus(badge, now = new Date()) {
  const status = badge?.status;
  if (status === BADGE_STATUS.EXPIRED) return BADGE_STATUS.EXPIRED;
  if (status !== BADGE_STATUS.FADED) return BADGE_STATUS.ACTIVE;

  const expiresAt = badge?.expiresAt ? new Date(badge.expiresAt) : null;
  // A fading badge with no usable window never expires on its own — an admin
  // has to close it by hand.
  if (!expiresAt || Number.isNaN(expiresAt.getTime())) return BADGE_STATUS.FADED;
  return expiresAt.getTime() <= now.getTime()
    ? BADGE_STATUS.EXPIRED
    : BADGE_STATUS.FADED;
}

/** True while the badge can still be handed out. */
export function isAwardable(badge, now = new Date()) {
  return effectiveStatus(badge, now) !== BADGE_STATUS.EXPIRED;
}

/**
 * Milliseconds left in the window, or null when there is no live countdown.
 */
export function msRemaining(badge, now = new Date()) {
  if (effectiveStatus(badge, now) !== BADGE_STATUS.FADED) return null;
  if (!badge?.expiresAt) return null;
  return new Date(badge.expiresAt).getTime() - now.getTime();
}

/**
 * Human countdown, matching what the mobile app shows volunteers so the
 * admin sees the same numbers they do.
 *
 * Truncates rather than rounds up — never promise more time than there is —
 * and steps the unit down before it could bottom out at a demoralising "0".
 */
export function formatRemaining(ms, t) {
  if (ms === null || ms === undefined) return '';
  if (ms <= 0) return t('admin.fading_expired');

  const hours = Math.floor(ms / 3600000);
  if (hours >= 24) return t('admin.fading_days_left', { count: Math.floor(hours / 24) });
  if (hours >= 1) return t('admin.fading_hours_left', { count: hours });
  return t('admin.fading_minutes_left', { count: Math.max(1, Math.floor(ms / 60000)) });
}

/**
 * Window presets offered in the panel.
 *
 * The short ones exist so the whole flow — fade, notify, count down, expire —
 * can be walked end to end in a couple of minutes instead of a week. That is
 * the point of this panel until the cron exists.
 */
export const WINDOW_PRESETS = [
  { key: 'preset_5m', minutes: 5 },
  { key: 'preset_1h', minutes: 60 },
  { key: 'preset_1d', minutes: 60 * 24 },
  { key: 'preset_3d', minutes: 60 * 24 * 3 },
  { key: 'preset_7d', minutes: 60 * 24 * 7 },
  { key: 'preset_14d', minutes: 60 * 24 * 14 },
];

/** ISO instant [minutes] from now — what the endpoint expects as `expiresAt`. */
export function expiryFromNow(minutes, now = new Date()) {
  return new Date(now.getTime() + minutes * 60000).toISOString();
}

/**
 * Picks a badge at random among those still awardable.
 *
 * Stands in for the detection engine that isn't written yet, so the rest of
 * the flow can be exercised. Deliberately excludes badges already fading:
 * re-fading one moves its deadline, which re-notifies every volunteer.
 */
export function pickRandomCandidate(badges, now = new Date(), random = Math.random) {
  const candidates = (badges || []).filter(
    (b) => effectiveStatus(b, now) === BADGE_STATUS.ACTIVE,
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(random() * candidates.length)];
}
