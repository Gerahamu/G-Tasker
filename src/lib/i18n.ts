import { createContext, useContext, useState, useEffect, useCallback, useMemo, createElement } from 'react';
import type { ReactNode } from 'react';
import type { CountryCode } from './types';

export type AppLanguage = 'auto' | 'zh' | 'en' | 'ja';

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  auto: '', zh: '中文', en: 'English', ja: '日本語',
};

export function getAutoLanguageName(): string {
  const resolved = resolveLang('auto');
  return LANGUAGE_LABELS[resolved as AppLanguage] || 'English';
}

export function getAutoLabel(): string {
  const detected = getAutoLanguageName();
  return `🔄 ${detected}`;
}

// ──── Lunar calendar countries ────
const LUNAR_COUNTRIES: Set<string> = new Set(['CN','JP','KR','VN','SG','TW','HK','MO']);

export function langToCountry(lang: AppLanguage): CountryCode {
  if (lang === 'auto') {
    if (typeof navigator === 'undefined') return 'CN';
    const n = (navigator.language || 'en').toLowerCase();
    if (n.startsWith('zh')) return 'CN';
    if (n.startsWith('ja')) return 'JP';
    if (n.startsWith('en')) return 'US';
    return 'US';
  }
  const map: Record<string, CountryCode> = { zh:'CN', ja:'JP' };
  return map[lang] || 'US';
}

export function shouldShowLunar(country: CountryCode): boolean {
  return LUNAR_COUNTRIES.has(country);
}

// ═══════════════════════════════════════════
//  TRANSLATIONS
// ═══════════════════════════════════════════

type Dict = Record<string, string>;

// ──── Plan module keys ────
const PLAN_ZH: Dict = {
  newPlan:'新建规划', planName:'规划名称', planGoal:'规划目标', planNote:'规划备注',
  noPlans:'暂无规划', blocks:'个时间块', copied:'已复制', backToList:'返回列表',
  copy:'复制', delPlan:'删除规划', delPlanConfirm:'确定删除此规划？', planCreated:'规划已创建',
  days:'天', dayCount:'天数', dayN:'第{n}天',
};
const PLAN_EN: Dict = {
  newPlan:'New Plan', planName:'Plan Name', planGoal:'Goal', planNote:'Notes',
  noPlans:'No plans', blocks:'blocks', copied:'Copied', backToList:'Back to List',
  copy:'Copy', delPlan:'Delete Plan', delPlanConfirm:'Delete this plan?', planCreated:'Plan created',
  days:'d', dayCount:'Days', dayN:'Day {n}',
};

// ──── Clock module keys ────
const CLOCK_ZH: Dict = {
  clock:'时钟', worldClock:'世界时钟', stopwatch:'秒表', countdown:'倒计时', alarmClock:'闹钟',
  currentTime:'当前时间', addTimezone:'添加时区', searchCity:'搜索城市或时区...',
  primary:'主要', setPrimary:'设为主要时区', timeDiff:'时差', utcOffset:'UTC偏移',
  timeConverter:'时间换算', selectDate:'选择日期', selectTime:'选择时间',
  convertBtn:'换算', convertResult:'换算结果',
  yesterday:'昨天', today:'今天', tomorrow:'明天',
  faster:'快', slower:'慢', sameTime:'无时差',
  noSavedTimezones:'还没有保存的时区', localTime:'本地时间',
  start:'开始', pause:'暂停', resume:'继续', reset:'复位',
  lapBtn:'计次', clearLaps:'清空记录', lapLabel:'计次', totalLabel:'累计', noLaps:'暂无计次记录',
  newCountdown:'新建倒计时', editCountdown:'编辑倒计时',
  countdownName:'名称', countdownDuration:'时长',
  hours:'时', mins:'分', secs:'秒', quickTime:'快捷', loop:'循环',
  remaining:'剩余', endedAt:'预计结束', noCountdowns:'还没有倒计时',
  addTime:'加时', reduceTime:'减时', complete:'完成', stop:'停止',
  preset1min:'1 分钟', preset5min:'5 分钟', preset10min:'10 分钟',
  preset15min:'15 分钟', preset25min:'25 分钟', preset30min:'30 分钟',
  preset45min:'45 分钟', preset60min:'60 分钟',
  newAlarm:'新建闹钟', editAlarm:'编辑闹钟', copyAlarm:'复制闹钟',
  alarmName:'闹钟名称', alarmTime:'闹钟时间',
  repeatRule:'重复', nextRing:'下一次响铃',
  once:'仅一次', daily:'每天', workdays:'工作日', weekends:'周末', customDays:'自定义',
  mon:'周一', tue:'周二', wed:'周三', thu:'周四', fri:'周五', sat:'周六', sun:'周日',
  snooze:'稍后提醒', snoozeMin:'稍后间隔', enableSnooze:'允许稍后提醒',
  testAlarm:'测试', stopAlarm:'停止', dismissAlarm:'关闭',
  noAlarms:'还没有闹钟', expired:'已过期', in:'还有', h:'小时', min:'分钟',
  timesUp:'时间到！', countdownFinished:'倒计时完成', alarmReminder:'闹钟提醒',
  clockSettings:'时钟设置', timeDisplay:'时间显示', format24h:'24 小时制',
  format12h:'12 小时制', showSec:'显示秒数',
  defaultVolume:'默认音量', defaultSnoozeDur:'默认稍后提醒时长',
  notifyPermission:'通知权限', requestNotify:'请求通知权限',
  notifyGranted:'已授权', notifyDenied:'已拒绝', notifyDefault:'未设置',
  browserLimit:'⚠️ 网页闹钟需要保持浏览器或应用运行。系统休眠或完全关闭应用时，提醒可能无法触发。',
  missedReminder:'该提醒已于 {time} 前到期。',
  soundSettings:'提示音设置', selectSound:'选择提示音', previewSound:'试听',
  stopSound:'停止', soundEnabled:'提示音', soundDisabled:'已关闭',
  confirmDelete:'确定删除？', clearAllConfirm:'确定清空全部记录？',
  sunShort:'日', monShort:'一', tueShort:'二', wedShort:'三', thuShort:'四', friShort:'五', satShort:'六',
};
const CLOCK_EN: Dict = {
  clock:'Clock', worldClock:'World Clock', stopwatch:'Stopwatch', countdown:'Countdown', alarmClock:'Alarm',
  currentTime:'Current Time', addTimezone:'Add Timezone', searchCity:'Search city or timezone...',
  primary:'Primary', setPrimary:'Set as primary', timeDiff:'Time Diff', utcOffset:'UTC Offset',
  timeConverter:'Time Converter', selectDate:'Select Date', selectTime:'Select Time',
  convertBtn:'Convert', convertResult:'Result',
  yesterday:'Yesterday', today:'Today', tomorrow:'Tomorrow',
  faster:'ahead', slower:'behind', sameTime:'Same time',
  noSavedTimezones:'No saved timezones', localTime:'Local Time',
  start:'Start', pause:'Pause', resume:'Resume', reset:'Reset',
  lapBtn:'Lap', clearLaps:'Clear All', lapLabel:'Lap', totalLabel:'Total', noLaps:'No laps recorded',
  newCountdown:'New Countdown', editCountdown:'Edit Countdown',
  countdownName:'Name', countdownDuration:'Duration',
  hours:'h', mins:'m', secs:'s', quickTime:'Quick', loop:'Loop',
  remaining:'Remaining', endedAt:'Ends at', noCountdowns:'No countdowns',
  addTime:'Add Time', reduceTime:'Reduce', complete:'Complete', stop:'Stop',
  preset1min:'1 min', preset5min:'5 min', preset10min:'10 min',
  preset15min:'15 min', preset25min:'25 min', preset30min:'30 min',
  preset45min:'45 min', preset60min:'60 min',
  newAlarm:'New Alarm', editAlarm:'Edit Alarm', copyAlarm:'Copy Alarm',
  alarmName:'Alarm Name', alarmTime:'Time',
  repeatRule:'Repeat', nextRing:'Next Ring',
  once:'Once', daily:'Daily', workdays:'Workdays', weekends:'Weekends', customDays:'Custom',
  mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', sun:'Sun',
  snooze:'Snooze', snoozeMin:'Snooze interval', enableSnooze:'Allow snooze',
  testAlarm:'Test', stopAlarm:'Stop', dismissAlarm:'Dismiss',
  noAlarms:'No alarms', expired:'Expired', in:'in', h:'h', min:'m',
  timesUp:"Time's up!", countdownFinished:'Countdown finished', alarmReminder:'Alarm',
  clockSettings:'Clock Settings', timeDisplay:'Time Display', format24h:'24-Hour',
  format12h:'12-Hour', showSec:'Show Seconds',
  defaultVolume:'Default Volume', defaultSnoozeDur:'Default Snooze',
  notifyPermission:'Notification Permission', requestNotify:'Request Permission',
  notifyGranted:'Granted', notifyDenied:'Denied', notifyDefault:'Not Set',
  browserLimit:'⚠️ Web alarms require the browser/app to stay open. Notifications may not fire during system sleep or when the app is closed.',
  missedReminder:'This reminder was due {time} ago.',
  soundSettings:'Sound Settings', selectSound:'Select Sound', previewSound:'Preview',
  stopSound:'Stop', soundEnabled:'Sound', soundDisabled:'Disabled',
  confirmDelete:'Confirm delete?', clearAllConfirm:'Clear all records?',
  sunShort:'Sun', monShort:'Mon', tueShort:'Tue', wedShort:'Wed', thuShort:'Thu', friShort:'Fri', satShort:'Sat',
};

// ──── Plan & Clock: Japanese ────
const PLAN_JA: Dict = {
  newPlan:'新規プラン', planName:'プラン名', planGoal:'目標', planNote:'メモ',
  noPlans:'プランがありません', blocks:'ブロック', copied:'コピーしました', backToList:'一覧に戻る',
  copy:'コピー', delPlan:'プランを削除', delPlanConfirm:'このプランを削除しますか？', planCreated:'プランを作成しました',
  days:'日', dayCount:'日数', dayN:'{n}日目',
};
const CLOCK_JA: Dict = {
  clock:'時計', worldClock:'世界時計', stopwatch:'ストップウォッチ', countdown:'タイマー', alarmClock:'アラーム',
  currentTime:'現在時刻', addTimezone:'タイムゾーン追加', searchCity:'都市またタイムゾーンを検索...',
  primary:'メイン', setPrimary:'メインに設定', timeDiff:'時差', utcOffset:'UTCオフセット',
  timeConverter:'時刻変換', selectDate:'日付選択', selectTime:'時刻選択',
  convertBtn:'変換', convertResult:'変換結果',
  yesterday:'昨日', today:'今日', tomorrow:'明日',
  faster:'進み', slower:'遅れ', sameTime:'時差なし',
  noSavedTimezones:'保存されたタイムゾーンがありません', localTime:'ローカル時刻',
  start:'スタート', pause:'一時停止', resume:'再開', reset:'リセット',
  lapBtn:'ラップ', clearLaps:'記録クリア', lapLabel:'ラップ', totalLabel:'合計', noLaps:'ラップ記録なし',
  newCountdown:'新規タイマー', editCountdown:'タイマー編集',
  countdownName:'名前', countdownDuration:'時間',
  hours:'時', mins:'分', secs:'秒', quickTime:'クイック', loop:'繰り返し',
  remaining:'残り', endedAt:'終了予定', noCountdowns:'タイマーがありません',
  addTime:'延長', reduceTime:'短縮', complete:'完了', stop:'停止',
  preset1min:'1 分', preset5min:'5 分', preset10min:'10 分',
  preset15min:'15 分', preset25min:'25 分', preset30min:'30 分',
  preset45min:'45 分', preset60min:'60 分',
  newAlarm:'新規アラーム', editAlarm:'アラーム編集', copyAlarm:'アラーム複製',
  alarmName:'アラーム名', alarmTime:'時刻',
  repeatRule:'繰り返し', nextRing:'次の通知',
  once:'一回のみ', daily:'毎日', workdays:'平日', weekends:'週末', customDays:'カスタム',
  mon:'月', tue:'火', wed:'水', thu:'木', fri:'金', sat:'土', sun:'日',
  snooze:'スヌーズ', snoozeMin:'スヌーズ間隔', enableSnooze:'スヌーズを許可',
  testAlarm:'テスト', stopAlarm:'停止', dismissAlarm:'閉じる',
  noAlarms:'アラームがありません', expired:'期限切れ', in:'あと', h:'時間', min:'分',
  timesUp:'時間です！', countdownFinished:'タイマー終了', alarmReminder:'アラーム',
  clockSettings:'時計設定', timeDisplay:'時刻表示', format24h:'24時間表示',
  format12h:'12時間表示', showSec:'秒を表示',
  defaultVolume:'デフォルト音量', defaultSnoozeDur:'デフォルトスヌーズ',
  notifyPermission:'通知許可', requestNotify:'通知許可をリクエスト',
  notifyGranted:'許可済み', notifyDenied:'拒否', notifyDefault:'未設定',
  browserLimit:'⚠️ ウェブアラームはブラウザまたはアプリを起動したままにする必要があります。システムスリープ中やアプリ終了時は通知されない場合があります。',
  missedReminder:'このリマインダーは {time} 前に期限切れです。',
  soundSettings:'サウンド設定', selectSound:'サウンド選択', previewSound:'プレビュー',
  stopSound:'停止', soundEnabled:'サウンドオン', soundDisabled:'オフ',
  confirmDelete:'削除しますか？', clearAllConfirm:'すべてクリアしますか？',
  sunShort:'日', monShort:'月', tueShort:'火', wedShort:'水', thuShort:'木', friShort:'金', satShort:'土',
};

// ──── Core dictionaries ────

const ZH: Dict = {
  ...PLAN_ZH, ...CLOCK_ZH,
  appName:'G-Tasker',smartLists:'待办事项',myLists:'待办列表',today:'今天',scheduled:'已计划',allTasks:'全部任务',flagged:'已标记',overdue:'逾期',newList:'新建列表',search:'搜索',tagsManage:'标签管理',calendar:'日历',settings:'设置',noCustomList:'还没有自定义列表',listNamePlaceholder:'列表名称...',taskDetail:'任务详情',listView:'列表',newTask:'新建任务',templates:'模板',addTask:'添加任务 (按 Enter 创建)',addTaskHint:'快速创建仅需标题。如需添加备注、截止日期等，使用右上角「新建任务」进入完整编辑器。',taskTitlePlaceholder:'输入任务标题，Enter 创建 · 点击任务可编辑详情',noTasks:'暂无任务，点击上方按钮创建',noTasksToday:'今天没有到期的任务 🎉',noScheduledTasks:'暂无已计划的任务',noFlaggedTasks:'暂无已标记的任务',noOverdueTasks:'没有逾期任务 🎉',noTasksInList:'此列表暂无任务',completed:'已完成',taskTitle:'任务标题...',notes:'备注',notesPlaceholder:'添加备注...',flag:'标记',addTag:'+ 添加标签',createTask:'创建任务',deleteTask:'删除任务',deleteTaskConfirm:'确定要删除',irreversable:'此操作不可撤销。',autoSaveHint:'💾 修改会自动保存（每 3 秒及关闭页面时）',priority:'优先级',high:'高',medium:'中',low:'低',subtasks:'子任务',addSubtask:'添加子任务...',searchPlaceholder:'搜索任务标题或备注...',searchHint:'输入关键词开始搜索',noResults:'未找到匹配的任务',foundResults:'找到',foundResultsSuffix:'个任务',tagName:'标签名称',tagNamePlaceholder:'输入标签名称...',color:'颜色',noTags:'暂无标签，创建一个吧',solar:'阳历',lunar:'农历',todayBtn:'今天',addDateMarker:'添加日期标记',editMarker:'编辑标记',markerName:'标记名称',markerNamePlaceholder:'例如：生日、纪念日...',repeatType:'重复类型',onceOnly:'仅此一次',annualRepeat:'每年循环',onceDesc:'仅在此日期显示一次',annualDesc:'每年同月同日都会显示此标记',markerColor:'标记颜色',save:'保存',cancel:'取消',delete:'删除',holidaysLabel:'个节日',tasksLabel:'个任务',settingsTitle:'设置',appLanguage:'应用语言',langDetected:'跟随设备 (',langManual:'已手动选择',langCurrent:'当前生效',calendarDefaultCountry:'日历默认节日',countryAuto:'自动（跟随设备语言）',countryAutoMatch:'当前自动匹配',unsavedChanges:'⚠️ 有未保存的修改，请点击右上角「确认修改」按钮保存。',confirmChange:'确认修改',saved:'已保存',settingsSaved:'设置已保存 ✅',settingsInfo:'💡 语言设置会影响界面文字。日历节日默认跟随浏览器语言自动选择对应国家。',taskCreated:'任务「{title}」已创建',taskCreatedDetail:'任务「{title}」已创建，可继续编辑详情',deleteListTitle:'删除列表',deleteListConfirm:'确定要删除「{name}」及其所有任务吗？',clickToMark:'💡 点击日期添加标记',todayLegend:'今日',holidayLegend:'节日',markerLegend:'个人标记',taskLegend:'任务截止',customView:'自定义',sun:'日',mon:'一',tue:'二',wed:'三',thu:'四',fri:'五',sat:'六',monday2:'周一',tuesday2:'周二',wednesday2:'周三',thursday2:'周四',friday2:'周五',saturday2:'周六',sunday2:'周日',jan:'1月',feb:'2月',mar:'3月',apr:'4月',may:'5月',jun:'6月',jul:'7月',aug:'8月',sep:'9月',oct:'10月',nov:'11月',dec:'12月',priorityHigh:'高',priorityMedium:'中',priorityLow:'低',confirm:'确定',cancelBtn:'取消',saveBtn:'保存',createBtn2:'创建',deleteBtn:'删除',editBtn:'编辑',untitled:'无标题',draftLabel:'草稿',savedLabel:'已保存',draftStatus:'📝 草稿',savedStatus:'✅ 已保存',enterTitle:'⚠️ 请输入任务标题',taskCreatedToast:'✅ 「{title}」已创建',draftSavedToast:'📝 「{title}」已存草稿',savedToast:'已保存 ✅',deletedToast:'已删除',showTime:'设定时间',hideTime:'收起时间',advOptions:'高级日期设置',collapseAdv:'收起高级选项',yearSuffix:'年',monthSuffix:'月',noTasks2:'暂无任务',noSubtasksYet:'暂无子任务，点击任务进入详情添加',inbox:'灵感箱',quickRecord:'快速记录',recordIdea:'记录一个新想法',recordPlaceholder:'记录一个想法...',record2:'记录',inboxEmpty:'灵感箱是空的，记录你的第一个想法吧',inboxAdded:'已添加到灵感箱',convertTask:'转为任务',convertMemo:'转为备忘录',convertedTask:'已转为任务 ✅',convertedMemo:'已转为备忘录 📝',memo:'备忘录',newMemo:'新建备忘录',memoCreated:'备忘录已创建',memoEmpty:'还没有备忘录，点击上方按钮创建',editMemo:'编辑备忘录',delMemo:'删除备忘录',delMemoConfirm:'确定删除？此操作不可撤销。',memoPage:'备忘录',planning:'规划',monthView:'月',weekView:'周',dayView:'日',createMonth:'创建月计划',addWeek:'添加周',monthGoal:'本月目标',keyPoints:'重点事项',create3:'创建',cancel3:'取消',backMonth:'← 返回月视图',backWeek:'← 返回周视图',weekLabel:'第 {n} 周',addDay:'创建日计划',dayTheme:'日计划主题',addBlock:'添加时间块',daySaved:'日计划已保存 ✅',monthCreated:'月计划已创建',weekAdded:'周计划已添加',dayCreated:'日计划已创建',max5Weeks:'每月最多5周',deleted3:'已删除',monthDeleted:'月计划已删除',editMarker3:'编辑标记',confirmTask:'确认完成任务',taskTitle3:'任务标题',notesLabel:'备注',dueDateLabel:'截止日期',noSubtasks3:'暂无子任务，点击任务进入详情添加',searchAll:'搜索任务、备忘录、灵感箱...',searchHint3:'输入关键词全局搜索',noResults3:'未找到匹配的结果',foundResults3:'找到 {n} 个结果',taskSection:'任务',memoSection:'备忘录',inboxSection:'灵感箱',subtaskLabel:'子任务',addSubtask3:'添加子任务...',colorDefs:'颜色含义定义',customScene:'细分具体场景',sceneName:'场景名称',sceneColor:'场景颜色',tagPage:'标签',tagManage2:'标签管理',draft3:'草稿',saved4:'已保存',createTask3:'创建任务',saveDraft:'存草稿',inboxNav:'灵感箱',memoNav:'备忘录',planNav:'规划',tagsNav:'标签',themeMode:'主题模式',light:'浅色',dark:'深色',followSystem:'跟随系统',fontSize:'字体大小',fontSmall:'Aa 小',fontNormal:'Aa 标准',fontLarge:'Aa 大',langTitle:'语言与节日地区',uiLang:'界面语言',calCountry:'日历默认节日地区',notifyTitle:'提醒与通知',notifySwitch:'通知总开关',notifyReminder:'默认提醒时间',notifyOverdue:'过期提醒',notifySound:'提醒声音',notifyOn:'通知已开启',notifyOff:'通知已关闭',helpNotifySwitch:'控制是否启用所有任务提醒通知。关闭后不会收到任何提醒。',helpNotifyReminder:'创建任务时默认的提前提醒时间。',helpNotifyOverdue:'超过截止日期的任务持续提醒。',helpNotifySound:'通知时播放提示音。',taskDefaults:'新建任务默认行为',defaultPriority:'默认优先级',defaultDue:'默认添加截止日期',defaultView:'默认视图',helpDefaultPriority:'新建任务弹窗中默认选中的优先级。',helpDefaultDue:'开启后新建任务时自动将截止日期设为今天。',helpDefaultView:'打开应用时默认进入的页面。',dataMgmt:'数据管理',exportData:'导出数据 (JSON)',resetSettings:'恢复默认设置',clearAll:'清空所有数据',confirmClearAll:'⚠️ 此操作将清空所有任务、列表和标签，不可恢复。确定继续？',dataCleared:'所有数据已清空',dataExported:'数据已导出',confirmReset:'恢复默认设置将重置外观、通知和任务选项，不会删除任务。确定？',settingsReset:'已恢复默认设置',about:'关于 G-Tasker',version:'版本',developer:'开发者',techStack:'技术栈',sendFeedback:'发送反馈',aboutDesc:'G-Tasker — 智能任务管理应用。支持农历日历、多语言、优先级管理、子任务和高级日期设置。所有数据存储在本地浏览器中。',feedbackSoon:'反馈功能即将上线',appearance:'外观设置',themeUpdated:'主题已更新',fontUpdated:'字体已更新',langUpdated:'语言/地区已更新',minAgo:'分钟前',hrAgo:'小时前',
};

const EN: Dict = {
  ...PLAN_EN, ...CLOCK_EN,
  appName:'G-Tasker',smartLists:'Tasks',myLists:'Lists',today:'Today',scheduled:'Scheduled',allTasks:'All Tasks',flagged:'Flagged',overdue:'Overdue',newList:'New List',search:'Search',tagsManage:'Tags',calendar:'Calendar',settings:'Settings',noCustomList:'No custom lists yet',listNamePlaceholder:'List name...',taskDetail:'Task Detail',listView:'List',newTask:'New Task',templates:'Templates',addTask:'Add task (Enter to create)',addTaskHint:'Quick add with title only. For notes and due dates, use "New Task" for full editor.',taskTitlePlaceholder:'Task title, Enter to create · Click to edit details',noTasks:'No tasks yet',noTasksToday:'No tasks due today 🎉',noScheduledTasks:'No scheduled tasks',noFlaggedTasks:'No flagged tasks',noOverdueTasks:'No overdue tasks 🎉',noTasksInList:'No tasks in this list',completed:'Completed',taskTitle:'Task title...',notes:'Notes',notesPlaceholder:'Add notes...',flag:'Flag',addTag:'+ Add tag',createTask:'Create Task',deleteTask:'Delete Task',deleteTaskConfirm:'Delete',irreversable:'This cannot be undone.',autoSaveHint:'💾 Auto-saved every 3s & on page close',priority:'Priority',high:'High',medium:'Medium',low:'Low',subtasks:'Subtasks',addSubtask:'Add subtask...',searchPlaceholder:'Search by title or notes...',searchHint:'Type keyword to search',noResults:'No results found',foundResults:'Found',foundResultsSuffix:'tasks',tagName:'Tag name',tagNamePlaceholder:'Enter tag name...',color:'Color',noTags:'No tags yet',solar:'Solar',lunar:'Lunar',todayBtn:'Today',addDateMarker:'Add Marker',editMarker:'Edit Marker',markerName:'Marker name',markerNamePlaceholder:'e.g. Birthday, Anniversary...',repeatType:'Repeat',onceOnly:'Once',annualRepeat:'Annual',onceDesc:'Show once on this date',annualDesc:'Repeat every year on this date',markerColor:'Color',save:'Save',cancel:'Cancel',delete:'Delete',holidaysLabel:'holidays',tasksLabel:'tasks',settingsTitle:'Settings',appLanguage:'Language',langDetected:'Auto (',langManual:'Manual',langCurrent:'Active',calendarDefaultCountry:'Default Holidays',countryAuto:'Auto (browser language)',countryAutoMatch:'Auto-matched',unsavedChanges:'⚠️ Unsaved changes. Click "Confirm" to save.',confirmChange:'Confirm',saved:'Saved',settingsSaved:'Settings saved ✅',settingsInfo:'💡 Language affects UI text. Calendar holidays follow browser language by default.',taskCreated:'Task "{title}" created',taskCreatedDetail:'Task "{title}" created, edit details',deleteListTitle:'Delete List',deleteListConfirm:'Delete "{name}" and all its tasks?',clickToMark:'💡 Click a date to add marker',todayLegend:'Today',holidayLegend:'Holiday',markerLegend:'Marker',taskLegend:'Task due',customView:'Custom',sun:'Sun',mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat',monday2:'Monday',tuesday2:'Tuesday',wednesday2:'Wednesday',thursday2:'Thursday',friday2:'Friday',saturday2:'Saturday',sunday2:'Sunday',jan:'Jan',feb:'Feb',mar:'Mar',apr:'Apr',may:'May',jun:'Jun',jul:'Jul',aug:'Aug',sep:'Sep',oct:'Oct',nov:'Nov',dec:'Dec',priorityHigh:'High',priorityMedium:'Medium',priorityLow:'Low',confirm:'OK',cancelBtn:'Cancel',saveBtn:'Save',createBtn2:'Create',deleteBtn:'Delete',editBtn:'Edit',untitled:'Untitled',draftLabel:'Draft',savedLabel:'Saved',draftStatus:'📝 Draft',savedStatus:'✅ Saved',enterTitle:'⚠️ Please enter a title',taskCreatedToast:'✅ "{title}" created',draftSavedToast:'📝 "{title}" saved as draft',savedToast:'Saved ✅',deletedToast:'Deleted',showTime:'Set Time',hideTime:'Hide Time',advOptions:'Advanced',collapseAdv:'Collapse',yearSuffix:'',monthSuffix:'',noTasks2:'No tasks',noSubtasksYet:'No subtasks yet',inbox:'Inbox',quickRecord:'Quick Add',recordIdea:'Record an idea',recordPlaceholder:'Record an idea...',record2:'Record',inboxEmpty:'Inbox is empty',inboxAdded:'Added to Inbox',convertTask:'To Task',convertMemo:'To Memo',convertedTask:'Converted to task ✅',convertedMemo:'Converted to memo 📝',memo:'Memos',newMemo:'New Memo',memoCreated:'Memo created',memoEmpty:'No memos yet',editMemo:'Edit Memo',delMemo:'Delete Memo',delMemoConfirm:'Delete? Cannot be undone.',memoPage:'Memos',planning:'Planning',monthView:'Month',weekView:'Week',dayView:'Day',createMonth:'Create Month',addWeek:'Add Week',monthGoal:'Goal',keyPoints:'Key Points',create3:'Create',cancel3:'Cancel',backMonth:'← Back to Month',backWeek:'← Back to Week',weekLabel:'Week {n}',addDay:'Create Day',dayTheme:'Theme',addBlock:'Add Block',daySaved:'Day saved ✅',monthCreated:'Month created',weekAdded:'Week added',dayCreated:'Day created',max5Weeks:'Max 5 weeks',deleted3:'Deleted',monthDeleted:'Month deleted',editMarker3:'Edit Marker',confirmTask:'Confirm Complete',taskTitle3:'Task Title',notesLabel:'Notes',dueDateLabel:'Due Date',noSubtasks3:'No subtasks',searchAll:'Search tasks, memos, inbox...',searchHint3:'Search globally',noResults3:'No results',foundResults3:'{n} results',taskSection:'Tasks',memoSection:'Memos',inboxSection:'Inbox',subtaskLabel:'Subtasks',addSubtask3:'Add...',colorDefs:'Color Definitions',customScene:'Custom Scene',sceneName:'Scene Name',sceneColor:'Scene Color',tagPage:'Tags',tagManage2:'Tag Mgmt',draft3:'Draft',saved4:'Saved',createTask3:'Create Task',saveDraft:'Save Draft',inboxNav:'Inbox',memoNav:'Memos',planNav:'Planning',tagsNav:'Tags',themeMode:'Theme',light:'Light',dark:'Dark',followSystem:'System',fontSize:'Font Size',fontSmall:'Aa Small',fontNormal:'Aa Normal',fontLarge:'Aa Large',langTitle:'Language & Region',uiLang:'UI Language',calCountry:'Calendar Holidays',notifyTitle:'Notifications',notifySwitch:'Notifications',notifyReminder:'Default Reminder',notifyOverdue:'Overdue Alerts',notifySound:'Sound',notifyOn:'Notifications On',notifyOff:'Notifications Off',helpNotifySwitch:'Enable or disable all task reminders.',helpNotifyReminder:'Default advance reminder time for new tasks.',helpNotifyOverdue:'Keep reminding for overdue tasks.',helpNotifySound:'Play sound for notifications.',taskDefaults:'New Task Defaults',defaultPriority:'Default Priority',defaultDue:'Default Due Date',defaultView:'Default View',helpDefaultPriority:'Default priority selected in the new task form.',helpDefaultDue:'Automatically set due date to today for new tasks.',helpDefaultView:'Default page when opening the app.',dataMgmt:'Data Management',exportData:'Export Data (JSON)',resetSettings:'Reset Settings',clearAll:'Clear All Data',confirmClearAll:'⚠️ This will delete all tasks, lists and tags. This cannot be undone. Continue?',dataCleared:'All data cleared',dataExported:'Data exported',confirmReset:'Reset appearance, notification and task settings. Tasks will not be deleted. Continue?',settingsReset:'Settings reset to defaults',about:'About G-Tasker',version:'Version',developer:'Developer',techStack:'Tech Stack',sendFeedback:'Send Feedback',aboutDesc:'G-Tasker — Smart task management app with lunar calendar, multi-language, priority management, subtasks and advanced date settings. All data stored locally.',feedbackSoon:'Feedback coming soon',appearance:'Appearance',themeUpdated:'Theme updated',fontUpdated:'Font size updated',langUpdated:'Language/region updated',minAgo:'min ago',hrAgo:'hr ago',
};

const JA: Dict = {
  ...PLAN_JA, ...CLOCK_JA,
  appName:'G-Tasker',smartLists:'タスク',myLists:'リスト',today:'今日',scheduled:'予定済み',allTasks:'すべて',flagged:'フラグ付き',overdue:'期限切れ',newList:'新規リスト',search:'検索',tagsManage:'タグ管理',calendar:'カレンダー',settings:'設定',noCustomList:'まだリストがありません',listNamePlaceholder:'リスト名...',taskDetail:'タスク詳細',listView:'リスト',newTask:'新規タスク',templates:'テンプレート',addTask:'タスクを追加 (Enterで作成)',addTaskHint:'タイトルのみの簡易作成。「新規タスク」で詳細を編集できます。',taskTitlePlaceholder:'タスク名を入力、Enterで作成 · クリックで詳細編集',noTasks:'タスクがありません',noTasksToday:'今日のタスクはありません 🎉',noScheduledTasks:'予定されたタスクはありません',noFlaggedTasks:'フラグ付きタスクはありません',noOverdueTasks:'期限切れタスクはありません 🎉',noTasksInList:'このリストにタスクはありません',completed:'完了済み',taskTitle:'タスク名...',notes:'メモ',notesPlaceholder:'メモを追加...',flag:'フラグ',addTag:'+ タグ追加',createTask:'タスク作成',deleteTask:'タスク削除',deleteTaskConfirm:'削除しますか',irreversable:'この操作は元に戻せません。',autoSaveHint:'💾 3秒ごと＆ページを閉じるときに自動保存',priority:'優先度',high:'高',medium:'中',low:'低',subtasks:'サブタスク',addSubtask:'サブタスク追加...',searchPlaceholder:'タイトルまたはメモを検索...',searchHint:'キーワードを入力',noResults:'該当なし',foundResults:'',foundResultsSuffix:'件のタスク',tagName:'タグ名',tagNamePlaceholder:'タグ名を入力...',color:'色',noTags:'タグがありません',solar:'太陽暦',lunar:'太陰暦',todayBtn:'今日',addDateMarker:'マーカー追加',editMarker:'マーカー編集',markerName:'マーカー名',markerNamePlaceholder:'例：誕生日、記念日...',repeatType:'繰り返し',onceOnly:'一回のみ',annualRepeat:'毎年',onceDesc:'この日付に一度だけ表示',annualDesc:'毎年同じ日付に表示',markerColor:'色',save:'保存',cancel:'キャンセル',delete:'削除',holidaysLabel:'件の祝日',tasksLabel:'件のタスク',settingsTitle:'設定',appLanguage:'言語',langDetected:'自動 (',langManual:'手動',langCurrent:'現在',calendarDefaultCountry:'カレンダーの祝日',countryAuto:'自動（ブラウザ言語）',countryAutoMatch:'自動一致',unsavedChanges:'⚠️ 未保存の変更があります。「確認」をクリックして保存してください。',confirmChange:'確認',saved:'保存済み',settingsSaved:'設定を保存しました ✅',settingsInfo:'💡 言語設定はUIテキストに影響します。カレンダーの祝日はブラウザ言語に従います。',taskCreated:'タスク「{title}」を作成しました',taskCreatedDetail:'タスク「{title}」を作成しました',deleteListTitle:'リスト削除',deleteListConfirm:'「{name}」とそのタスクを削除しますか？',clickToMark:'💡 日付をクリックしてマーカー追加',todayLegend:'今日',holidayLegend:'祝日',markerLegend:'マーカー',taskLegend:'タスク期限',customView:'カスタム',sun:'日',mon:'月',tue:'火',wed:'水',thu:'木',fri:'金',sat:'土',monday2:'月曜日',tuesday2:'火曜日',wednesday2:'水曜日',thursday2:'木曜日',friday2:'金曜日',saturday2:'土曜日',sunday2:'日曜日',jan:'1月',feb:'2月',mar:'3月',apr:'4月',may:'5月',jun:'6月',jul:'7月',aug:'8月',sep:'9月',oct:'10月',nov:'11月',dec:'12月',priorityHigh:'高',priorityMedium:'中',priorityLow:'低',confirm:'OK',cancelBtn:'取消',saveBtn:'保存',createBtn2:'作成',deleteBtn:'削除',editBtn:'編集',untitled:'無題',draftLabel:'下書き',savedLabel:'保存済',draftStatus:'📝 下書き',savedStatus:'✅ 保存済',enterTitle:'⚠️ タイトルを入力',taskCreatedToast:'✅ 「{title}」を作成',draftSavedToast:'📝 「{title}」を下書き保存',savedToast:'保存 ✅',deletedToast:'削除済',showTime:'時間設定',hideTime:'時間非表示',advOptions:'詳細設定',collapseAdv:'閉じる',yearSuffix:'年',monthSuffix:'月',noTasks2:'なし',noSubtasksYet:'サブタスクなし',inbox:'受信箱',quickRecord:'クイック追加',recordIdea:'アイデア記録',recordPlaceholder:'アイデアを記録...',record2:'記録',inboxEmpty:'受信箱は空です',inboxAdded:'受信箱に追加',convertTask:'タスクへ',convertMemo:'メモへ',convertedTask:'タスクに変換 ✅',convertedMemo:'メモに変換 📝',memo:'メモ',newMemo:'新規メモ',memoCreated:'メモ作成',memoEmpty:'メモなし',editMemo:'メモ編集',delMemo:'メモ削除',delMemoConfirm:'削除しますか？',memoPage:'メモ',planning:'計画',monthView:'月',weekView:'週',dayView:'日',createMonth:'月計画作成',addWeek:'週追加',monthGoal:'目標',keyPoints:'重点',create3:'作成',cancel3:'取消',backMonth:'← 月に戻る',backWeek:'← 週に戻る',weekLabel:'第{n}週',addDay:'日計画作成',dayTheme:'テーマ',addBlock:'追加',daySaved:'日保存 ✅',monthCreated:'月作成済',weekAdded:'週追加済',dayCreated:'日作成済',max5Weeks:'月最大5週',deleted3:'削除済',monthDeleted:'月削除済',editMarker3:'編集',confirmTask:'完了確認',taskTitle3:'タスク名',notesLabel:'メモ',dueDateLabel:'期限日',noSubtasks3:'サブタスクなし',searchAll:'検索...',searchHint3:'キーワード検索',noResults3:'結果なし',foundResults3:'{n}件',taskSection:'タスク',memoSection:'メモ',inboxSection:'受信箱',subtaskLabel:'サブタスク',addSubtask3:'追加...',colorDefs:'色定義',customScene:'シーン設定',sceneName:'シーン名',sceneColor:'シーン色',tagPage:'タグ',tagManage2:'タグ管理',draft3:'下書き',saved4:'保存済',createTask3:'タスク作成',saveDraft:'下書き保存',inboxNav:'受信箱',memoNav:'メモ',planNav:'計画',tagsNav:'タグ',themeMode:'テーマ',light:'ライト',dark:'ダーク',followSystem:'システム連動',fontSize:'フォントサイズ',fontSmall:'Aa 小',fontNormal:'Aa 標準',fontLarge:'Aa 大',langTitle:'言語と地域',uiLang:'UI言語',calCountry:'カレンダー祝日',notifyTitle:'通知',notifySwitch:'通知',notifyReminder:'デフォルト通知',notifyOverdue:'期限切れ通知',notifySound:'通知音',notifyOn:'通知オン',notifyOff:'通知オフ',helpNotifySwitch:'すべてのタスク通知を有効/無効にします。',helpNotifyReminder:'新しいタスクのデフォルト通知時間。',helpNotifyOverdue:'期限切れタスクの通知を継続します。',helpNotifySound:'通知時に音を再生します。',taskDefaults:'新規タスクの既定値',defaultPriority:'デフォルト優先度',defaultDue:'デフォルト期限日',defaultView:'デフォルト表示',helpDefaultPriority:'新規タスク作成時に選択される優先度。',helpDefaultDue:'新規タスクの期限日を自動で今日に設定します。',helpDefaultView:'アプリ起動時のデフォルトページ。',dataMgmt:'データ管理',exportData:'データエクスポート (JSON)',resetSettings:'設定をリセット',clearAll:'全データ削除',confirmClearAll:'⚠️ すべてのタスク、リスト、タグが削除され、元に戻せません。続行しますか？',dataCleared:'すべてのデータを削除しました',dataExported:'データをエクスポートしました',confirmReset:'外観、通知、タスク設定をリセットします。タスクは削除されません。続行しますか？',settingsReset:'設定をデフォルトに戻しました',about:'G-Taskerについて',version:'バージョン',developer:'開発者',techStack:'技術スタック',sendFeedback:'フィードバックを送る',aboutDesc:'G-Tasker — 太陰暦カレンダー、多言語対応、優先度管理、サブタスク、高度な日付設定を備えたスマートタスク管理アプリ。',feedbackSoon:'フィードバック機能は近日公開',appearance:'外観',themeUpdated:'テーマを更新しました',fontUpdated:'フォントサイズを更新しました',langUpdated:'言語/地域を更新しました',minAgo:'分前',hrAgo:'時間前',
};

const TRANSLATIONS: Record<string, Dict> = { zh: ZH, en: EN, ja: JA };

function resolveLang(lang: AppLanguage): string {
  if (lang === 'auto') {
    if (typeof navigator === 'undefined') return 'zh';
    const n = (navigator.language || 'zh').toLowerCase();
    if (n.startsWith('zh')) return 'zh';
    if (n.startsWith('ja')) return 'ja';
    if (n.startsWith('en')) return 'en';
    return 'zh';
  }
  return TRANSLATIONS[lang] ? lang : 'zh';
}

// ──── React Context ────
interface I18nContextValue {
  lang: AppLanguage;
  resolvedLang: string;
  setLang: (l: AppLanguage) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLanguage>(() => {
    try { const s = localStorage.getItem('app-language'); if (s) return s as AppLanguage; } catch {}
    return 'auto';
  });

  const setLang = useCallback((l: AppLanguage) => {
    setLangState(l);
    try { localStorage.setItem('app-language', l); } catch {}
  }, []);

  const value = useMemo((): I18nContextValue => {
    const resolved = resolveLang(lang);
    const dict = TRANSLATIONS[resolved] || ZH;
    return {
      lang, resolvedLang: resolved, setLang,
      t: (key: string, vars?: Record<string, string>): string => {
        let text = dict[key] || EN[key] || ZH[key] || key;
        if (vars) for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
        return text;
      },
    };
  }, [lang, setLang]);

  return createElement(I18nContext.Provider, { value }, children);
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used within I18nProvider');
  return { t: ctx.t, lang: ctx.resolvedLang, setLang: ctx.setLang, rawLang: ctx.lang };
}

// ──── Calendar country sync ────
const CalendarCountryContext = createContext<{
  calendarCountry: CountryCode;
  setCalendarCountry: (c: CountryCode) => void;
} | null>(null);

export function CalendarCountryProvider({ children }: { children: ReactNode }) {
  const { lang } = useT();

  const [country, setCountry] = useState<CountryCode>(() => {
    try { const s = localStorage.getItem('calendar-country'); if (s) return s as CountryCode; } catch {}
    return langToCountry('auto');
  });

  const set = useCallback((c: CountryCode) => {
    setCountry(c);
    try { localStorage.setItem('calendar-country', c); } catch {}
  }, []);

  useEffect(() => {
    const auto = langToCountry(lang as AppLanguage);
    setCountry(auto);
    try { localStorage.setItem('calendar-country', auto); } catch {}
  }, [lang]);

  const value = useMemo(() => ({ calendarCountry: country, setCalendarCountry: set }), [country, set]);
  return createElement(CalendarCountryContext.Provider, { value }, children);
}

export function useCalendarCountry() {
  const ctx = useContext(CalendarCountryContext);
  if (!ctx) throw new Error('useCalendarCountry must be used within CalendarCountryProvider');
  return ctx;
}

// ──── Country names (zh/en/ja only) ────
const COUNTRY_NAMES_I18N: Record<string, Record<string, string>> = {
  zh: { CN:'🇨🇳 中国', US:'🇺🇸 美国', JP:'🇯🇵 日本', KR:'🇰🇷 韩国', GB:'🇬🇧 英国', FR:'🇫🇷 法国', DE:'🇩🇪 德国', IN:'🇮🇳 印度', BR:'🇧🇷 巴西', AU:'🇦🇺 澳大利亚', IT:'🇮🇹 意大利', ES:'🇪🇸 西班牙', RU:'🇷🇺 俄罗斯', MX:'🇲🇽 墨西哥', INTL:'🌍 国际节日' },
  en: { CN:'🇨🇳 China', US:'🇺🇸 United States', JP:'🇯🇵 Japan', KR:'🇰🇷 South Korea', GB:'🇬🇧 United Kingdom', FR:'🇫🇷 France', DE:'🇩🇪 Germany', IN:'🇮🇳 India', BR:'🇧🇷 Brazil', AU:'🇦🇺 Australia', IT:'🇮🇹 Italy', ES:'🇪🇸 Spain', RU:'🇷🇺 Russia', MX:'🇲🇽 Mexico', INTL:'🌍 International' },
  ja: { CN:'🇨🇳 中国', US:'🇺🇸 アメリカ', JP:'🇯🇵 日本', KR:'🇰🇷 韓国', GB:'🇬🇧 イギリス', FR:'🇫🇷 フランス', DE:'🇩🇪 ドイツ', IN:'🇮🇳 インド', BR:'🇧🇷 ブラジル', AU:'🇦🇺 オーストラリア', IT:'🇮🇹 イタリア', ES:'🇪🇸 スペイン', RU:'🇷🇺 ロシア', MX:'🇲🇽 メキシコ', INTL:'🌍 国際' },
};

export function getCountryName(country: CountryCode, resolvedLang: string): string {
  return COUNTRY_NAMES_I18N[resolvedLang]?.[country] || COUNTRY_NAMES_I18N.en[country] || country;
}
