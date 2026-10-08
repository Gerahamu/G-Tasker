import { expect, test } from 'playwright/test';
import {
  formatFullDate,
  getTranslationKeySets,
  interpolate,
  localeFor,
} from '../../src/lib/i18n';

test('all language dictionaries expose identical keys', () => {
  const sets = getTranslationKeySets();
  expect(sets.en).toEqual(sets.zh);
  expect(sets.ja).toEqual(sets.zh);
});

test('resolved languages map to stable locales', () => {
  expect(localeFor('zh')).toBe('zh-CN');
  expect(localeFor('en')).toBe('en-US');
  expect(localeFor('ja')).toBe('ja-JP');
});

test('full dates and numeric interpolation follow the language contract', () => {
  const date = new Date(2026, 7, 3);
  expect(formatFullDate(date, 'zh')).toBe('2026年8月3日星期一');
  expect(formatFullDate(date, 'en')).toBe('Monday, August 3, 2026');
  expect(formatFullDate(date, 'ja')).toBe('2026年8月3日月曜日');
  expect(interpolate('{n} tasks', { n: 3 })).toBe('3 tasks');
});
