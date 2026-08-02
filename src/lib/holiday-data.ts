import type { HolidayDef, CountryCode } from './types';

export const HOLIDAYS: Record<CountryCode, HolidayDef[]> = {
  // ════ 🌍 国际通用 ════
  INTL: [
    // 固定日期
    { name: "New Year's Day", month: 1, day: 1, isLunar: false, color: '#ef4444' },
    { name: "Valentine's Day", month: 2, day: 14, isLunar: false, color: '#ec4899' },
    { name: "International Women's Day", month: 3, day: 8, isLunar: false, color: '#ec4899' },
    { name: "April Fools' Day", month: 4, day: 1, isLunar: false, color: '#f59e0b' },
    { name: "Earth Day", month: 4, day: 22, isLunar: false, color: '#10b981' },
    { name: "Mother's Day", month: 5, day: 11, isLunar: false, color: '#ec4899' },
    { name: "Father's Day", month: 6, day: 15, isLunar: false, color: '#3b82f6' },
    { name: "Halloween", month: 10, day: 31, isLunar: false, color: '#8b5cf6' },
    { name: "Christmas Eve", month: 12, day: 24, isLunar: false, color: '#10b981' },
    { name: "Christmas Day", month: 12, day: 25, isLunar: false, color: '#ef4444' },
    { name: "New Year's Eve", month: 12, day: 31, isLunar: false, color: '#f59e0b' },
    // UN 国际日
    { name: "World Health Day", month: 4, day: 7, isLunar: false, color: '#10b981' },
    { name: "World Environment Day", month: 6, day: 5, isLunar: false, color: '#10b981' },
    { name: "World Teachers' Day", month: 10, day: 5, isLunar: false, color: '#8b5cf6' },
    { name: "Human Rights Day", month: 12, day: 10, isLunar: false, color: '#3b82f6' },
    { name: "International Youth Day", month: 8, day: 12, isLunar: false, color: '#f59e0b' },
    { name: "International Peace Day", month: 9, day: 21, isLunar: false, color: '#3b82f6' },
    // 全球传播节日
    { name: "Earth Hour", month: 3, day: 29, isLunar: false, color: '#10b981' },
    { name: "Singles' Day (11.11)", month: 11, day: 11, isLunar: false, color: '#f59e0b' },
    { name: "Cyber Monday", month: 12, day: 1, isLunar: false, color: '#3b82f6' },
  ],

  // ════ 🇨🇳 中国 ════
  CN: [
    // 传统节日
    { name: '元旦', month: 1, day: 1, isLunar: false, color: '#ef4444' },
    { name: '春节', month: 1, day: 1, isLunar: true, color: '#ef4444' },
    { name: '元宵节', month: 1, day: 15, isLunar: true, color: '#f59e0b' },
    { name: '清明节', month: 4, day: 5, isLunar: false, color: '#6b7280' },
    { name: '劳动节', month: 5, day: 1, isLunar: false, color: '#ef4444' },
    { name: '端午节', month: 5, day: 5, isLunar: true, color: '#10b981' },
    { name: '七夕节', month: 7, day: 7, isLunar: true, color: '#ec4899' },
    { name: '中秋节', month: 8, day: 15, isLunar: true, color: '#f59e0b' },
    { name: '重阳节', month: 9, day: 9, isLunar: true, color: '#8b5cf6' },
    { name: '腊八节', month: 12, day: 8, isLunar: true, color: '#6b7280' },
    { name: '除夕', month: 12, day: 30, isLunar: true, color: '#ef4444' },
    // 现代节日
    { name: '妇女节', month: 3, day: 8, isLunar: false, color: '#ec4899' },
    { name: '青年节', month: 5, day: 4, isLunar: false, color: '#3b82f6' },
    { name: '儿童节', month: 6, day: 1, isLunar: false, color: '#f59e0b' },
    { name: '建党节', month: 7, day: 1, isLunar: false, color: '#ef4444' },
    { name: '建军节', month: 8, day: 1, isLunar: false, color: '#ef4444' },
    { name: '教师节', month: 9, day: 10, isLunar: false, color: '#8b5cf6' },
    { name: '国庆节', month: 10, day: 1, isLunar: false, color: '#ef4444' },
    // 高传播
    { name: '双十一', month: 11, day: 11, isLunar: false, color: '#f59e0b' },
    { name: '双十二', month: 12, day: 12, isLunar: false, color: '#f59e0b' },
    { name: '高考', month: 6, day: 7, isLunar: false, color: '#ef4444' },
    { name: '春运', month: 1, day: 20, isLunar: false, color: '#ef4444' },
    // 24节气由 lunar-typescript 动态计算，不在此重复
  ],

  // ════ 🇯🇵 日本 ════
  JP: [
    { name: '元日', month: 1, day: 1, isLunar: false, color: '#ef4444' },
    { name: '成人の日', month: 1, day: 13, isLunar: false, color: '#3b82f6' },
    { name: '建国記念の日', month: 2, day: 11, isLunar: false, color: '#ef4444' },
    { name: '天皇誕生日', month: 2, day: 23, isLunar: false, color: '#ef4444' },
    { name: '春分の日', month: 3, day: 20, isLunar: false, color: '#10b981' },
    { name: '昭和の日', month: 4, day: 29, isLunar: false, color: '#6b7280' },
    { name: '憲法記念日', month: 5, day: 3, isLunar: false, color: '#ef4444' },
    { name: 'みどりの日', month: 5, day: 4, isLunar: false, color: '#10b981' },
    { name: 'こどもの日', month: 5, day: 5, isLunar: false, color: '#3b82f6' },
    { name: '七夕', month: 7, day: 7, isLunar: false, color: '#ec4899' },
    { name: '海の日', month: 7, day: 21, isLunar: false, color: '#3b82f6' },
    { name: '山の日', month: 8, day: 11, isLunar: false, color: '#10b981' },
    { name: '敬老の日', month: 9, day: 15, isLunar: false, color: '#8b5cf6' },
    { name: '秋分の日', month: 9, day: 23, isLunar: false, color: '#f59e0b' },
    { name: '体育の日', month: 10, day: 13, isLunar: false, color: '#3b82f6' },
    { name: '文化の日', month: 11, day: 3, isLunar: false, color: '#8b5cf6' },
    { name: '勤労感謝の日', month: 11, day: 23, isLunar: false, color: '#f59e0b' },
    { name: 'お正月', month: 1, day: 2, isLunar: false, color: '#ef4444' },
    { name: '桜の季節', month: 3, day: 28, isLunar: false, color: '#ec4899' },
    { name: 'ゴールデンウィーク', month: 5, day: 1, isLunar: false, color: '#f59e0b' },
    { name: 'お盆', month: 8, day: 15, isLunar: false, color: '#6b7280' },
    { name: '花火大会', month: 7, day: 25, isLunar: false, color: '#f59e0b' },
  ],

  // ════ 🇰🇷 韩国 ════
  KR: [
    { name: '신정', month: 1, day: 1, isLunar: false, color: '#ef4444' },
    { name: '설날', month: 1, day: 1, isLunar: true, color: '#ef4444' },
    { name: '삼일절', month: 3, day: 1, isLunar: false, color: '#3b82f6' },
    { name: '어린이날', month: 5, day: 5, isLunar: false, color: '#f59e0b' },
    { name: '부처님오신날', month: 4, day: 8, isLunar: true, color: '#f59e0b' },
    { name: '현충일', month: 6, day: 6, isLunar: false, color: '#6b7280' },
    { name: '광복절', month: 8, day: 15, isLunar: false, color: '#ef4444' },
    { name: '추석', month: 8, day: 15, isLunar: true, color: '#f59e0b' },
    { name: '개천절', month: 10, day: 3, isLunar: false, color: '#3b82f6' },
    { name: '한글날', month: 10, day: 9, isLunar: false, color: '#8b5cf6' },
    { name: '크리스마스', month: 12, day: 25, isLunar: false, color: '#ef4444' },
    { name: "Valentine's Day", month: 2, day: 14, isLunar: false, color: '#ec4899' },
    { name: 'White Day', month: 3, day: 14, isLunar: false, color: '#ec4899' },
    { name: 'Pepero Day', month: 11, day: 11, isLunar: false, color: '#f59e0b' },
    { name: '수능', month: 11, day: 16, isLunar: false, color: '#ef4444' },
  ],

  // ════ 🇺🇸 美国 ════
  US: [
    { name: "New Year's Day", month: 1, day: 1, isLunar: false, color: '#ef4444' },
    { name: 'Martin Luther King Jr. Day', month: 1, day: 20, isLunar: false, color: '#3b82f6' },
    { name: "Valentine's Day", month: 2, day: 14, isLunar: false, color: '#ec4899' },
    { name: "Presidents' Day", month: 2, day: 17, isLunar: false, color: '#3b82f6' },
    { name: 'Super Bowl', month: 2, day: 9, isLunar: false, color: '#ef4444' },
    { name: "St. Patrick's Day", month: 3, day: 17, isLunar: false, color: '#10b981' },
    { name: 'Memorial Day', month: 5, day: 26, isLunar: false, color: '#6b7280' },
    { name: 'Independence Day', month: 7, day: 4, isLunar: false, color: '#ef4444' },
    { name: 'Labor Day', month: 9, day: 1, isLunar: false, color: '#3b82f6' },
    { name: 'Columbus Day', month: 10, day: 13, isLunar: false, color: '#f59e0b' },
    { name: 'Halloween', month: 10, day: 31, isLunar: false, color: '#8b5cf6' },
    { name: 'Veterans Day', month: 11, day: 11, isLunar: false, color: '#6b7280' },
    { name: 'Thanksgiving', month: 11, day: 27, isLunar: false, color: '#f59e0b' },
    { name: 'Black Friday', month: 11, day: 28, isLunar: false, color: '#1f2937' },
    { name: 'Christmas', month: 12, day: 25, isLunar: false, color: '#ef4444' },
  ],

  // ════ 🇬🇧 英国 ════
  GB: [
    { name: "New Year's Day", month: 1, day: 1, isLunar: false, color: '#ef4444' },
    { name: "St. Patrick's Day", month: 3, day: 17, isLunar: false, color: '#10b981' },
    { name: 'Good Friday', month: 4, day: 3, isLunar: false, color: '#6b7280' },
    { name: 'Easter Monday', month: 4, day: 6, isLunar: false, color: '#f59e0b' },
    { name: 'Early May Bank Holiday', month: 5, day: 4, isLunar: false, color: '#3b82f6' },
    { name: 'Spring Bank Holiday', month: 5, day: 25, isLunar: false, color: '#3b82f6' },
    { name: 'Summer Bank Holiday', month: 8, day: 31, isLunar: false, color: '#f59e0b' },
    { name: 'Halloween', month: 10, day: 31, isLunar: false, color: '#8b5cf6' },
    { name: 'Guy Fawkes Night', month: 11, day: 5, isLunar: false, color: '#f59e0b' },
    { name: 'Remembrance Day', month: 11, day: 11, isLunar: false, color: '#6b7280' },
    { name: 'Christmas Day', month: 12, day: 25, isLunar: false, color: '#ef4444' },
    { name: 'Boxing Day', month: 12, day: 26, isLunar: false, color: '#3b82f6' },
  ],

  // ════ 🇫🇷 法国 ════
  FR: [
    { name: "Jour de l'An", month: 1, day: 1, isLunar: false, color: '#ef4444' },
    { name: 'Épiphanie', month: 1, day: 6, isLunar: false, color: '#8b5cf6' },
    { name: 'Saint-Valentin', month: 2, day: 14, isLunar: false, color: '#ec4899' },
    { name: 'Fête du Travail', month: 5, day: 1, isLunar: false, color: '#ef4444' },
    { name: 'Victoire 1945', month: 5, day: 8, isLunar: false, color: '#3b82f6' },
    { name: 'Fête Nationale', month: 7, day: 14, isLunar: false, color: '#ef4444' },
    { name: 'Assomption', month: 8, day: 15, isLunar: false, color: '#8b5cf6' },
    { name: 'Toussaint', month: 11, day: 1, isLunar: false, color: '#6b7280' },
    { name: 'Armistice 1918', month: 11, day: 11, isLunar: false, color: '#6b7280' },
    { name: 'Noël', month: 12, day: 25, isLunar: false, color: '#ef4444' },
  ],

  // ════ 🇩🇪 德国 ════
  DE: [
    { name: 'Neujahr', month: 1, day: 1, isLunar: false, color: '#ef4444' },
    { name: 'Karfreitag', month: 4, day: 3, isLunar: false, color: '#6b7280' },
    { name: 'Ostermontag', month: 4, day: 6, isLunar: false, color: '#f59e0b' },
    { name: 'Tag der Arbeit', month: 5, day: 1, isLunar: false, color: '#ef4444' },
    { name: 'Tag der Deutschen Einheit', month: 10, day: 3, isLunar: false, color: '#ef4444' },
    { name: 'Oktoberfest', month: 9, day: 20, isLunar: false, color: '#f59e0b' },
    { name: 'Weihnachtstag', month: 12, day: 25, isLunar: false, color: '#ef4444' },
    { name: 'Zweiter Weihnachtstag', month: 12, day: 26, isLunar: false, color: '#3b82f6' },
  ],

  // ════ Rest (keep existing data) ════
  IN: [
    { name: 'Republic Day', month: 1, day: 26, isLunar: false, color: '#ef4444' },
    { name: 'Holi', month: 3, day: 8, isLunar: false, color: '#f59e0b' },
    { name: 'Independence Day', month: 8, day: 15, isLunar: false, color: '#ef4444' },
    { name: 'Diwali', month: 10, day: 31, isLunar: false, color: '#f59e0b' },
    { name: 'Gandhi Jayanti', month: 10, day: 2, isLunar: false, color: '#6b7280' },
    { name: 'Christmas', month: 12, day: 25, isLunar: false, color: '#ef4444' },
  ],
  BR: [
    { name: 'Ano Novo', month: 1, day: 1, isLunar: false, color: '#ef4444' },
    { name: 'Carnaval', month: 2, day: 13, isLunar: false, color: '#f59e0b' },
    { name: 'Independência', month: 9, day: 7, isLunar: false, color: '#10b981' },
    { name: 'Natal', month: 12, day: 25, isLunar: false, color: '#ef4444' },
  ],
  AU: [
    { name: "New Year's Day", month: 1, day: 1, isLunar: false, color: '#ef4444' },
    { name: 'Australia Day', month: 1, day: 26, isLunar: false, color: '#3b82f6' },
    { name: 'ANZAC Day', month: 4, day: 25, isLunar: false, color: '#6b7280' },
    { name: 'Christmas Day', month: 12, day: 25, isLunar: false, color: '#ef4444' },
  ],
  IT: [
    { name: 'Capodanno', month: 1, day: 1, isLunar: false, color: '#ef4444' },
    { name: 'Festa della Repubblica', month: 6, day: 2, isLunar: false, color: '#10b981' },
    { name: 'Ferragosto', month: 8, day: 15, isLunar: false, color: '#f59e0b' },
    { name: 'Natale', month: 12, day: 25, isLunar: false, color: '#ef4444' },
  ],
  ES: [
    { name: 'Año Nuevo', month: 1, day: 1, isLunar: false, color: '#ef4444' },
    { name: 'Día de Reyes', month: 1, day: 6, isLunar: false, color: '#f59e0b' },
    { name: 'Fiesta Nacional', month: 10, day: 12, isLunar: false, color: '#ef4444' },
    { name: 'Navidad', month: 12, day: 25, isLunar: false, color: '#ef4444' },
  ],
  RU: [
    { name: 'Новый год', month: 1, day: 1, isLunar: false, color: '#ef4444' },
    { name: 'День Победы', month: 5, day: 9, isLunar: false, color: '#ef4444' },
    { name: 'День России', month: 6, day: 12, isLunar: false, color: '#3b82f6' },
    { name: 'Масленица', month: 2, day: 24, isLunar: false, color: '#f59e0b' },
  ],
  MX: [
    { name: 'Año Nuevo', month: 1, day: 1, isLunar: false, color: '#ef4444' },
    { name: 'Cinco de Mayo', month: 5, day: 5, isLunar: false, color: '#10b981' },
    { name: 'Día de la Independencia', month: 9, day: 16, isLunar: false, color: '#10b981' },
    { name: 'Día de los Muertos', month: 11, day: 2, isLunar: false, color: '#8b5cf6' },
    { name: 'Navidad', month: 12, day: 25, isLunar: false, color: '#ef4444' },
  ],
};

export const COUNTRY_NAMES: Record<CountryCode, string> = {
  CN: '🇨🇳 中国', US: '🇺🇸 美国', JP: '🇯🇵 日本', KR: '🇰🇷 韩国', GB: '🇬🇧 英国',
  FR: '🇫🇷 法国', DE: '🇩🇪 德国', IN: '🇮🇳 印度', BR: '🇧🇷 巴西', AU: '🇦🇺 澳大利亚',
  IT: '🇮🇹 意大利', ES: '🇪🇸 西班牙', RU: '🇷🇺 俄罗斯', MX: '🇲🇽 墨西哥',
  INTL: '🌍 国际节日',
};
