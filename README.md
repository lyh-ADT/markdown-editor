# Markdown Editor

纯浏览器端 Typora 风格 Markdown 编辑器，基于 Vue 3 + Milkdown。

## 功能

- **Typora IR 模式** — 光标所在行显示原始 Markdown 语法（`#` `**` `*` `[text](url)` `>` `` ` ``），其他行实时渲染为富文本
- **多文档管理** — IndexedDB 存储，侧边栏切换，500ms 防抖自动保存
- **本地文件读写** — File System Access API（Chrome/Edge）+ `<input type="file">` 兜底（Firefox/Safari）
- **图片粘贴** — 粘贴/拖拽图片自动转为 base64 内嵌
- **Mermaid 流程图** — 懒加载（574KB 独立 chunk），仅在出现 mermaid 代码块时下载
- **暗色主题** — 亮/暗切换，持久化偏好
- **快捷键** — `Ctrl+S` 保存、`Ctrl+O` 打开、`Ctrl+Shift+N` 新建

## 快速开始

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build    # 输出到 dist/
pnpm preview  # 本地预览构建结果
```

## 技术栈

| 组件 | 选型 |
|---|---|
| 框架 | Vue 3 + TypeScript + Composition API |
| 构建 | Vite 6 |
| 编辑器内核 | Milkdown 7（基于 ProseMirror） |
| IR 装饰器 | 自研 ProseMirror Plugin（光标感知 Decoration.widget） |
| 存储 | IndexedDB（idb）+ File System Access API |
| 代码高亮 | CodeMirror 6 |
| 图表 | Mermaid（动态 import） |
| 主题 | CSS 变量 + `data-theme` 切换 |

## 项目结构

```
├─ .github/workflows/deploy.yml   # CI 自动部署到 GitHub Pages
├─ src/
│  ├─ components/                 # Vue UI 组件
│  │  ├─ AppShell.vue             # 三栏布局
│  │  ├─ Editor/MarkdownEditor.vue # Milkdown 容器
│  │  ├─ Sidebar/FileList.vue     # 文档列表
│  │  ├─ Toolbar/TopBar.vue       # 工具栏
│  │  └─ StatusBar.vue            # 状态栏
│  ├─ composables/                # 业务逻辑
│  │  ├─ useDocStore.ts           # 文档 CRUD + IndexedDB
│  │  ├─ useAutoSave.ts           # 防抖自动保存
│  │  ├─ useFileSystem.ts         # 本地文件读写
│  │  ├─ useTheme.ts              # 主题切换
│  │  └─ useShortcuts.ts          # 全局快捷键
│  ├─ editor/                     # 编辑器内核
│  │  ├─ index.ts                 # createEditor() 入口
│  │  └─ plugins/
│  │     ├─ typora-ir/            # Typora IR 装饰器
│  │     ├─ image-paste/          # 图片粘贴→base64
│  │     └─ mermaid/             # Mermaid 懒加载预览
│  ├─ storage/                    # 持久化适配器
│  │  ├─ indexeddb.ts             # IndexedDB
│  │  └─ filesystem.ts           # File System Access API
│  └─ types/                      # TypeScript 类型定义
└─ vite.config.ts
```

## 部署

Push 到 `main` 分支后 GitHub Actions 自动构建并部署到 `lyh-adt.github.io/markdown-editor/`。

需要设置仓库 Secret `GH_PAT`（Personal Access Token，`repo` 权限）。

## 许可

MIT
