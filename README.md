<div align="center">
  <img src="./public/favicon.svg" alt="G-Tasker Logo" width="72" height="72" />

# G-Tasker

**一个本地优先、简洁完整的个人任务与时间管理工作台。**

任务、灵感、备忘录、计划、日历与时钟，都集中在一个响应式 Web 应用中。

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![IndexedDB](https://img.shields.io/badge/Data-IndexedDB-5B5BD6)
</div>

## 简介

G-Tasker 是一款面向个人使用的效率管理应用。它将传统任务清单与灵感收集、备忘录、时间规划、日历和时钟工具整合在同一套界面中。

应用采用本地优先架构：任务及主要业务数据保存在浏览器的 IndexedDB 中，常用偏好保存在 localStorage 中，不依赖远程后端即可运行。

## 主要功能

### 任务管理

- 今天、已计划、全部任务、已标记和逾期等智能列表
- 自定义任务列表
- 高、中、低优先级
- 标签分类与按标签检索
- 截止日期、截止时间和高级日期设置
- 子任务与任务备注
- 草稿和自动保存
- 任务完成确认及已完成任务分组

### 灵感箱与备忘录

- 快速记录尚未整理的想法
- 将灵感转换为任务或备忘录
- 创建、编辑、置顶和删除备忘录
- 在全局搜索中统一查找灵感与备忘录

### 时间规划

- 日、周、月和自定义周期计划
- 为每一天添加多个时间块
- 设置计划目标、说明、开始时间和结束时间
- 复制已有计划，快速复用常用安排

### 日历

- 月历浏览与日期跳转
- 阳历与农历显示
- 多地区节假日数据
- 一次性和每年重复的日期标记
- 在日历中查看任务截止日期

### 时钟工具

- 世界时钟与时区时间对比
- 秒表
- 多个倒计时
- 闹钟与重复规则
- 浏览器通知和提醒设置

### 搜索与个性化

- 跨任务、标签、备忘录、灵感箱和计划的全局搜索
- 浅色、深色和跟随系统主题
- 小、标准和大三档字体
- 中文、English、日本語界面
- 日历节日地区设置
- 通知、默认优先级及默认截止日期设置
- JSON 数据导出

## 技术栈

| 类别           | 技术                                 |
| -------------- | ------------------------------------ |
| UI             | React 19、TypeScript、Tailwind CSS 4 |
| 构建           | Vite 8                               |
| 路由           | React Router 7                       |
| 状态管理       | Zustand 5                            |
| 本地数据库     | Dexie + IndexedDB                    |
| 日期与重复规则 | date-fns、rrule、lunar-typescript    |
| 拖拽交互       | dnd-kit                              |
| 图标           | Lucide React                         |
| 代码质量       | TypeScript、Oxlint、ESLint、Prettier |
| 端到端测试     | Playwright                           |

## 快速开始

### 环境要求

- Node.js `>= 22.13.0`
- npm `>= 10.9.0`

### 本地运行

```bash
git clone https://github.com/Gerahamu/G-Tasker.git
cd G-Tasker
npm install
npm run dev
```

开发服务器启动后，访问终端中显示的本地地址，通常为：

```text
http://localhost:5173
```

### 生产构建

```bash
npm run build
npm run preview
```

构建产物会生成在 `dist/` 目录中。

## 常用命令

| 命令                   | 说明                        |
| ---------------------- | --------------------------- |
| `npm run dev`          | 启动开发服务器              |
| `npm run build`        | 执行类型检查并生成生产构建  |
| `npm run preview`      | 本地预览生产构建            |
| `npm run typecheck`    | 执行 TypeScript 类型检查    |
| `npm run lint`         | 使用 Oxlint 检查代码        |
| `npm run lint:all`     | 执行 Oxlint 与 ESLint       |
| `npm run format`       | 使用 Prettier 格式化文件    |
| `npm run format:check` | 检查代码格式                |
| `npm run test:e2e`     | 运行 Playwright 端到端测试  |
| `npm run test:e2e:ui`  | 使用 Playwright UI 运行测试 |
| `npm run dead-code`    | 使用 Knip 检查未使用代码    |
| `npm run audit:prod`   | 检查生产依赖安全问题        |

## 项目结构

```text
G-Tasker/
├── public/                 # 图标等静态资源
├── src/
│   ├── autosave/           # 自动保存逻辑
│   ├── components/
│   │   ├── calendar/       # 日历与日期标记
│   │   ├── clock/          # 世界时钟、秒表、倒计时和闹钟
│   │   ├── inbox/          # 灵感箱
│   │   ├── memo/           # 备忘录
│   │   ├── planning/       # 时间规划
│   │   ├── search/         # 全局搜索
│   │   ├── settings/       # 应用设置
│   │   ├── sidebar/        # 侧边栏导航
│   │   ├── task/           # 任务创建与任务列表
│   │   └── task-detail/    # 任务详情
│   ├── db/                 # Dexie 数据库定义
│   ├── layouts/            # 应用布局
│   ├── lib/                # 类型、日期、国际化等公共逻辑
│   ├── router/             # 页面路由
│   └── stores/             # Zustand 状态管理
├── playwright.config.ts    # 端到端测试配置
├── vite.config.ts          # Vite 配置
└── package.json
```

## 数据与隐私

- 任务、列表、标签、备忘录、灵感、计划、日历标记和时钟数据主要保存在浏览器 IndexedDB 中。
- 主题、语言、字体大小及部分偏好设置保存在 localStorage 中。
- 项目当前不要求注册账号，也不需要远程数据库。
- 清除浏览器站点数据会同时清除本地应用数据，请定期通过设置页面导出 JSON 备份。
- 浏览器通知功能只有在用户主动授权后才会启用。

## 部署

执行 `npm run build` 后，可将 `dist/` 目录部署到任意静态托管服务，例如 GitHub Pages、Vercel、Netlify 或 Cloudflare Pages。

由于项目使用客户端路由，部署平台需要将未知路径回退到 `index.html`。

## 参与贡献

欢迎通过 Issue 提交问题或功能建议，也欢迎提交 Pull Request：

1. Fork 本仓库。
2. 创建功能分支：`git switch -c feature/your-feature`。
3. 完成修改并运行 `npm run check`。
4. 提交改动并推送分支。
5. 创建 Pull Request，说明修改内容和验证方式。

## 开源许可

本仓库目前尚未包含开源许可证。在添加许可证之前，代码默认保留所有权利。
