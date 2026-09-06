import { describe, expect, it } from 'vitest';
import {
  BADGE_STATUS,
  effectiveStatus,
  expiryFromNow,
  formatInstant,
  formatRemaining,
  isAwardable,
  msRemaining,
  pickRandomCandidate,
} from '../badgeFading';

const now = new Date('2026-06-15T12:00:00.000Z');
const inDays = (n) => new Date(now.getTime() + n * 86400000).toISOString();

const badge = (over = {}) => ({ _id: 'b1', name: 'Explorador', ...over });

describe('effectiveStatus', () => {
  it('reads a fading badge as fading while the window is open', () => {
    const b = badge({ status: 'faded', expiresAt: inDays(3) });
    expect(effectiveStatus(b, now)).toBe(BADGE_STATUS.FADED);
    // Still earnable — that limited availability is the point.
    expect(isAwardable(b, now)).toBe(true);
  });

  it('reads it as expired once the window closed', () => {
    const b = badge({ status: 'faded', expiresAt: inDays(-1) });
    expect(effectiveStatus(b, now)).toBe(BADGE_STATUS.EXPIRED);
    expect(isAwardable(b, now)).toBe(false);
  });

  it('expires exactly at the boundary', () => {
    const b = badge({ status: 'faded', expiresAt: now.toISOString() });
    expect(effectiveStatus(b, now)).toBe(BADGE_STATUS.EXPIRED);
  });

  it('keeps a fading badge open when it has no usable window', () => {
    expect(effectiveStatus(badge({ status: 'faded' }), now)).toBe(BADGE_STATUS.FADED);
    expect(
      effectiveStatus(badge({ status: 'faded', expiresAt: 'mañana' }), now),
    ).toBe(BADGE_STATUS.FADED);
  });

  it('never resurrects an expired badge', () => {
    const b = badge({ status: 'expired', expiresAt: inDays(5) });
    expect(effectiveStatus(b, now)).toBe(BADGE_STATUS.EXPIRED);
  });

  it('treats missing or unknown statuses as active', () => {
    // Same fallback the backend and the mobile app use.
    expect(effectiveStatus(badge(), now)).toBe(BADGE_STATUS.ACTIVE);
    expect(effectiveStatus(badge({ status: 'pizza' }), now)).toBe(BADGE_STATUS.ACTIVE);
    expect(effectiveStatus(null, now)).toBe(BADGE_STATUS.ACTIVE);
  });
});

describe('msRemaining', () => {
  it('counts down only while the window is open', () => {
    expect(msRemaining(badge({ status: 'faded', expiresAt: inDays(2) }), now))
      .toBe(2 * 86400000);
    expect(msRemaining(badge({ status: 'faded', expiresAt: inDays(-2) }), now)).toBeNull();
    expect(msRemaining(badge(), now)).toBeNull();
  });

  it('reports no countdown for a deadline it cannot read', () => {
    // effectiveStatus deliberately keeps this badge in `faded`, so the
    // tolerance has to carry through here: subtracting from an invalid date
    // is NaN, which used to reach the screen as "Quedan NaN minutos".
    for (const junk of ['mañana', '', null, undefined, {}, 'not-a-date']) {
      const b = badge({ status: 'faded', expiresAt: junk });
      expect(msRemaining(b, now)).toBeNull();
    }
  });
});

describe('formatRemaining', () => {
  // The panel must show admins the same numbers the volunteers get.
  const t = (key, params) => `${key}:${params?.count ?? ''}`;

  it('truncates instead of over-promising', () => {
    expect(formatRemaining(3.9 * 86400000, t)).toBe('admin.fading_days_left:3');
  });

  it('steps the unit down instead of bottoming out at zero', () => {
    expect(formatRemaining(23 * 3600000, t)).toBe('admin.fading_hours_left:23');
    expect(formatRemaining(45 * 60000, t)).toBe('admin.fading_minutes_left:45');
    // Under a minute still reads as one, never "0 minutes left".
    expect(formatRemaining(20000, t)).toBe('admin.fading_minutes_left:1');
  });

  it('says the window is closed once time is up', () => {
    expect(formatRemaining(0, t)).toBe('admin.fading_expired:');
    expect(formatRemaining(-5000, t)).toBe('admin.fading_expired:');
  });

  it('says nothing at all rather than something false', () => {
    // NaN is the dangerous one: every comparison in the formatter is false
    // for it, so without an explicit guard it falls through to the minutes
    // branch and renders "NaN".
    for (const bad of [null, undefined, NaN, Infinity, -Infinity]) {
      expect(formatRemaining(bad, t)).toBe('');
    }
  });
});

describe('formatInstant', () => {
  it('renders a real instant', () => {
    // Locale-dependent, so only assert that something date-shaped came out.
    expect(formatInstant(now.toISOString())).not.toBe('—');
    expect(formatInstant(now.toISOString())).toContain('2026');
  });

  it('falls back to a placeholder instead of "Invalid Date"', () => {
    // `new Date(junk).toLocaleString()` is literally the string "Invalid
    // Date", which is worse than a dash: it looks like data.
    for (const junk of ['mañana', 'not-a-date', '', null, undefined]) {
      expect(formatInstant(junk)).toBe('—');
    }
    expect(formatInstant('mañana', 'sin fecha')).toBe('sin fecha');
  });
});

describe('expiryFromNow', () => {
  it('produces the ISO instant the endpoint expects', () => {
    expect(expiryFromNow(60, now)).toBe('2026-06-15T13:00:00.000Z');
  });
});

describe('pickRandomCandidate', () => {
  const active = badge({ _id: 'a', name: 'A' });
  const fading = badge({ _id: 'f', name: 'F', status: 'faded', expiresAt: inDays(3) });
  const gone = badge({ _id: 'g', name: 'G', status: 'expired' });

  it('never picks one that is already fading', () => {
    // Re-fading moves the deadline, which re-notifies every volunteer.
    const picked = pickRandomCandidate([active, fading], now, () => 0.99);
    expect(picked._id).toBe('a');
  });

  it('never picks an expired one', () => {
    expect(pickRandomCandidate([gone, active], now, () => 0)._id).toBe('a');
  });

  it('returns null when there is nothing left to fade', () => {
    expect(pickRandomCandidate([fading, gone], now)).toBeNull();
    expect(pickRandomCandidate([], now)).toBeNull();
    expect(pickRandomCandidate(undefined, now)).toBeNull();
  });

  it('spreads across every candidate', () => {
    const badges = [active, badge({ _id: 'b', name: 'B' }), badge({ _id: 'c', name: 'C' })];
    expect(pickRandomCandidate(badges, now, () => 0)._id).toBe('a');
    expect(pickRandomCandidate(badges, now, () => 0.5)._id).toBe('b');
    expect(pickRandomCandidate(badges, now, () => 0.99)._id).toBe('c');
  });
});
