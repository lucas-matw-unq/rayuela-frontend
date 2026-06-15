import { describe, it, expect } from 'vitest';
import es from '../es.json';
import en from '../en.json';
import pt from '../pt.json';

// Recursively extract all keys in dotted notation
function getKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getKeys(obj[key], prefix + key + '.'));
    } else {
      keys.push(prefix + key);
    }
  }
  return keys;
}

describe('Localization files structure consistency', () => {
  it('should have the exact same keys in all language files', () => {
    const esKeys = getKeys(es).sort();
    const enKeys = getKeys(en).sort();
    const ptKeys = getKeys(pt).sort();

    // Check ES vs EN
    const missingInEn = esKeys.filter((k) => !enKeys.includes(k));
    const extraInEn = enKeys.filter((k) => !esKeys.includes(k));

    // Check ES vs PT
    const missingInPt = esKeys.filter((k) => !ptKeys.includes(k));
    const extraInPt = ptKeys.filter((k) => !esKeys.includes(k));

    expect(missingInEn, 'Keys present in es.json but missing in en.json').toEqual([]);
    expect(extraInEn, 'Keys present in en.json but missing in es.json').toEqual([]);
    expect(missingInPt, 'Keys present in es.json but missing in pt.json').toEqual([]);
    expect(extraInPt, 'Keys present in pt.json but missing in es.json').toEqual([]);
  });
});
