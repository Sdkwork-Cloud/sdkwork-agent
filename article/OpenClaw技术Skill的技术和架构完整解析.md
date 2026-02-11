# OpenClaw Skill 技术与架构完整解析

## 目录

1. [概述](#概述)
2. [Skill 设计哲学](#skill-设计哲学)
3. [整体架构设计](#整体架构设计)
4. [核心数据结构与类型系统](#核心数据结构与类型系统)
5. [Skill 文件格式规范](#skill-文件格式规范)
6. [Skill 加载机制](#skill-加载机制)
7. [Skill 执行流程](#skill-执行流程)
8. [Skill 资格判定算法](#skill-资格判定算法)
9. [Skill 安装系统](#skill-安装系统)
10. [Skill 安全机制](#skill-安全机制)
11. [Skill 配置系统](#skill-配置系统)
12. [远程 Skill 支持](#远程-skill-支持)
13. [ClawHub 技能生态系统](#clawhub-技能生态系统)
14. [性能优化与缓存机制](#性能优化与缓存机制)
15. [并发控制与线程安全](#并发控制与线程安全)
16. [错误处理与重试机制](#错误处理与重试机制)
17. [开发规范与最佳实践](#开发规范与最佳实践)
18. [开源标准规范](#开源标准规范)
19. [未来发展方向](#未来发展方向)

---

## 概述

在大模型时代，AI 助手的能力边界不再局限于预训练知识，而是通过**Skill（技能）系统**实现无限扩展。OpenClaw 作为一款先进的 AI 助手框架，其 Skill 系统的设计和实现直接决定了用户体验的优劣。

OpenClaw 的 Skill 系统采用**声明式、模块化**的设计理念，允许开发者通过简单的 `SKILL.md` 文件定义功能，无需修改核心代码即可扩展 AI 助手的能力。

### 核心特性

| 特性 | 说明 |
|------|------|
| **声明式定义** | 通过 `SKILL.md` 文件定义 Skill 的功能和元数据 |
| **多源加载** | 支持内置、用户、工作区、插件等多种来源 |
| **动态过滤** | 基于平台、依赖、环境变量的条件加载 |
| **安全扫描** | 安装前自动检测危险代码 |
| **远程执行** | 支持通过远程节点执行平台特定 Skill |
| **热重载** | 开发时自动检测文件变更 |
| **渐进式披露** | 元数据常驻上下文，详细内容按需加载 |

---

## Skill 设计哲学

### 1. 渐进式披露（Progressive Disclosure）

Skill 系统采用渐进式披露设计，平衡了上下文完整性和效率：

```
┌─────────────────────────────────────────────────────────┐
│  始终保留在上下文中      │  按需加载的详细内容          │
├─────────────────────────────────────────────────────────┤
│  - name                 │  - 完整的 SKILL.md 文档      │
│  - description          │  - scripts/ 目录下的脚本      │
│  - emoji                │  - references/ 参考资料       │
│  - requires (摘要)      │  - assets/ 资源文件           │
└─────────────────────────────────────────────────────────┘
```

**设计优势**：
- AI 始终知道有哪些 Skill 可用
- 上下文不会过长（token 效率）
- 详细内容在需要时才加载（性能优化）

### 2. 约定优于配置

- 固定文件名 `SKILL.md`
- 标准 YAML Frontmatter 格式
- 统一的目录结构
- 自动发现和加载机制

### 3. 可组合性

Skills 可以相互依赖、组合，形成复杂的工作流。例如：
- `github` Skill 可以与 `slack` Skill 组合，实现 PR 通知
- `summarize` Skill 可以与 `notion` Skill 组合，实现文章摘要存储

### 4. 平台无关性

通过远程执行机制，Skill 可以跨平台工作：
- 在 Linux/Windows 上运行 OpenClaw
- 通过远程 macOS 节点执行 Apple 生态 Skill

---

## 整体架构设计

### 架构分层

```
┌─────────────────────────────────────────────────────────────────┐
│                        应用层 (Application)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   CLI 工具   │  │   Web UI    │  │  Gateway    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│                        调用层 (Invocation)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 命令解析器   │  │ 技能匹配器   │  │ 参数提取器   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│                        执行层 (Execution)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 执行引擎     │  │ 安全管理器   │  │ 环境构建器   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│                        平台层 (Platform)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Windows 适配 │  │  macOS 适配  │  │  Linux 适配  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│                        数据层 (Data)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 技能存储     │  │ 配置管理     │  │ 缓存系统     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### 核心组件

| 组件 | 职责 | 关键文件 |
|------|------|----------|
| **GatewayClient** | 系统通信核心，处理技能执行请求 | `src/gateway/client.ts` |
| **Skill Loader** | 技能发现和加载 | `src/agents/skills/workspace.ts` |
| **Command Parser** | 解析用户输入，匹配对应的技能 | `src/auto-reply/skill-commands.ts` |
| **Security Manager** | 确保技能执行的安全性 | `src/security/skill-scanner.ts` |
| **Execution Engine** | 负责技能的实际执行 | `src/node-host/runner.ts` |
| **Platform Adapter** | 处理不同平台的差异 | `src/infra/exec-host.ts` |
| **SkillBinsCache** | 技能缓存管理器 | `src/node-host/runner.ts` |

### 系统交互流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         完整系统交互流程                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   用户输入 ──▶ 命令解析器 ──▶ 技能匹配器 ──▶ 资格检查器                  │
│                                      │                                   │
│                                      ▼                                   │
│   结果展示 ◀── 结果处理器 ◀── 执行引擎 ◀── 环境构建器                     │
│       │                              │                                   │
│       │                              ▼                                   │
│       │                       ┌─────────────┐                            │
│       │                       │  Gateway RPC │                            │
│       │                       │  - status    │                            │
│       │                       │  - install   │                            │
│       │                       │  - update    │                            │
│       │                       └──────┬──────┘                            │
│       │                              │                                   │
│       │                              ▼                                   │
│       │                       ┌─────────────┐                            │
│       │                       │  Node Host  │                            │
│       │                       │  - 本地执行  │                            │
│       │                       │  - 远程执行  │                            │
│       └──────────────────────▶│  - 缓存管理  │                            │
│                               └─────────────┘                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 核心数据结构与类型系统

### 基础类型定义

```typescript
// ============================================
// Skill 安装规范
// ============================================
interface SkillInstallSpec {
  id?: string;                    // 安装器标识
  kind: "brew" | "node" | "go" | "uv" | "download";  // 安装方式
  label?: string;                 // 显示标签
  bins?: string[];                // 安装后提供的二进制文件
  os?: string[];                  // 支持的操作系统
  formula?: string;               // brew公式名
  package?: string;               // npm包名
  module?: string;                // go模块
  url?: string;                   // 下载URL
  archive?: string;               // 压缩包类型
  extract?: boolean;              // 是否解压
  stripComponents?: number;       // 解压时跳过的目录层级
  targetDir?: string;             // 目标目录
}

// ============================================
// OpenClaw Skill 元数据
// ============================================
interface OpenClawSkillMetadata {
  always?: boolean;               // 是否总是启用（忽略依赖检查）
  skillKey?: string;              // 技能唯一键
  primaryEnv?: string;            // 主要环境变量名（用于API Key）
  emoji?: string;                 // 表情符号
  homepage?: string;              // 主页链接
  os?: string[];                  // 支持的操作系统列表
  requires?: {
    bins?: string[];              // 必需的二进制文件
    anyBins?: string[];           // 任一必需的二进制文件
    env?: string[];               // 必需的环境变量
    config?: string[];            // 必需的配置路径
  };
  install?: SkillInstallSpec[];   // 安装规范列表
}

// ============================================
// Skill 调用策略
// ============================================
interface SkillInvocationPolicy {
  userInvocable: boolean;         // 用户是否可直接调用
  disableModelInvocation: boolean; // 是否禁用模型调用
}

// ============================================
// Skill 命令分发规范
// ============================================
interface SkillCommandDispatchSpec {
  kind: "tool";
  toolName: string;               // 工具名称
  argMode?: "raw";                // 参数传递模式
}

// ============================================
// Skill 命令规范
// ============================================
interface SkillCommandSpec {
  name: string;                   // 命令名称
  skillName: string;              // 技能名称
  description: string;            // 描述
  dispatch?: SkillCommandDispatchSpec; // 分发配置
}

// ============================================
// Skill 条目 - 运行时使用的完整 Skill 信息
// ============================================
interface SkillEntry {
  skill: Skill;                   // 基础 Skill 对象
  frontmatter: ParsedSkillFrontmatter; // 解析的 Frontmatter
  metadata?: OpenClawSkillMetadata;    // OpenClaw 元数据
  invocation?: SkillInvocationPolicy;  // 调用策略
}

// ============================================
// Skill 快照 - 用于缓存和传输
// ============================================
interface SkillSnapshot {
  prompt: string;                 // 格式化后的提示文本
  skills: Array<{ name: string; primaryEnv?: string }>;
  resolvedSkills?: Skill[];       // 解析后的 Skill 列表
  version?: number;               // 版本号
}
```

---

## Skill 文件格式规范

### 文件结构

```
skills/
└── my-skill/
    ├── SKILL.md          # 必需：Skill 定义文件
    ├── scripts/          # 可选：执行脚本
    ├── references/       # 可选：参考资料
    └── assets/           # 可选：资源文件
```

### SKILL.md 完整格式

```markdown
---
name: "skill-name"                    # 必需：Skill 标识符
                                     # 规则：小写字母、数字、连字符
                                     # 示例："github", "spotify-player"

description: "Skill 功能描述"          # 必需：触发机制描述
                                     # 格式："做什么。在什么情况下调用。"
                                     # 示例："管理 GitHub 仓库。当用户提及 PR、Issue 时调用。"

homepage: "https://example.com"       # 可选：项目主页

user-invocable: true                  # 可选：是否可作为用户命令
                                     # 默认：true
                                     # 设为 false 时只能通过模型调用

disable-model-invocation: false       # 可选：是否禁用模型自动调用
                                     # 默认：false
                                     # 设为 true 时只能通过 /skill:name 调用

command-dispatch: "tool"              # 可选：命令分发类型
                                     # 当前仅支持："tool"

command-tool: "toolName"              # 可选：关联的工具名称
                                     # 当 command-dispatch 为 tool 时必需

command-arg-mode: "raw"               # 可选：参数传递模式
                                     # 当前仅支持："raw"

metadata:                             # 可选：OpenClaw 扩展元数据（JSON5 格式）
  {
    "openclaw": {
      # === 基础元数据 ===
      "emoji": "🚀",                  # 可选：表情符号
      "homepage": "https://...",      # 可选：覆盖顶层 homepage
      "skillKey": "customKey",        # 可选：配置中使用的键
      
      # === 平台限制 ===
      "os": ["darwin", "linux"],      # 可选：支持的平台
                                      # 可选值："darwin", "linux", "win32"
      
      # === 依赖要求 ===
      "requires": {
        "bins": ["gh", "git"],        # 必需：必须存在的二进制文件
        "anyBins": ["node", "bun"],   # 可选：至少一个存在的二进制文件
        "env": ["GITHUB_TOKEN"],      # 可选：必须设置的环境变量
        "config": ["github.token"]    # 可选：必须存在的配置路径
      },
      
      # === 安装配置 ===
      "install": [
        {
          "kind": "brew",              # 安装类型
          "formula": "gh",             # brew 公式名
          "bins": ["gh"],              # 安装后提供的二进制文件
          "os": ["darwin", "linux"]    # 此安装器支持的平台
        },
        {
          "kind": "node",
          "package": "@anthropic-ai/claude-code",
          "bins": ["claude"]
        },
        {
          "kind": "go",
          "module": "github.com/cli/cli/v2/cmd/gh",
          "bins": ["gh"]
        },
        {
          "kind": "uv",
          "package": "mypackage",
          "bins": ["mybin"]
        },
        {
          "kind": "download",
          "url": "https://example.com/tool.tar.gz",
          "archive": "tar.gz",
          "extract": true,
          "stripComponents": 1,
          "targetDir": "bin",
          "bins": ["tool"]
        }
      ],
      
      # === 其他标志 ===
      "always": false                  # 可选：始终包含此 Skill
                                      # 设为 true 时忽略资格检查
    }
  }
---

# Skill 标题

详细的 Skill 使用说明、示例、注意事项等。
支持完整的 Markdown 语法。
```

### 完整示例：GitHub Skill

```markdown
---
name: "github"
description: "GitHub CLI 集成，用于管理 PR、Issue、仓库。当用户提及 GitHub 操作时调用。"
homepage: "https://cli.github.com"

metadata:
  {
    "openclaw": {
      "emoji": "🐙",
      "requires": {
        "bins": ["gh"],
        "env": ["GITHUB_TOKEN"]
      },
      "install": [
        {
          "kind": "brew",
          "formula": "gh",
          "bins": ["gh"],
          "os": ["darwin", "linux"]
        },
        {
          "kind": "download",
          "url": "https://github.com/cli/cli/releases/download/v2.40.0/gh_2.40.0_windows_amd64.zip",
          "archive": "zip",
          "extract": true,
          "bins": ["gh"],
          "os": ["win32"]
        }
      ]
    }
  }
---

# GitHub

使用 `gh` CLI 管理 GitHub 资源。

## 常用命令

- `gh pr list` - 列出 PR
- `gh issue create` - 创建 Issue
- `gh repo view` - 查看仓库信息

## 注意事项

需要设置 `GITHUB_TOKEN` 环境变量进行认证。
```

---

## Skill 加载机制

### 加载来源（优先级从低到高）

```
┌─────────────────────────────────────────────────────────────┐
│  1. Extra Dirs    (skills.load.extraDirs 配置)              │
│     ↓                                                       │
│  2. Bundled       (OpenClaw 内置 skills)                     │
│     ↓                                                       │
│  3. Managed       (~/.openclaw/skills/)                      │
│     ↓                                                       │
│  4. Workspace     (<workspace>/skills/)                      │
│     ↓                                                       │
│  5. Plugin        (插件提供的 skills)                        │
└─────────────────────────────────────────────────────────────┘
```

**优先级说明**：
- **Extra Dirs**：通过配置指定的额外目录，优先级最低
- **Bundled**：随 OpenClaw 一起分发的内置 Skill
- **Managed**：`~/.openclaw/skills` 目录下的用户 Skill
- **Workspace**：`<workspace>/skills` 目录下的工作区 Skill，优先级最高
- **Plugin**：插件提供的 Skill，动态加载

### 加载算法详解（伪代码）

```typescript
// ============================================
// 主加载函数：从多个源加载 Skill 条目
// ============================================
FUNCTION loadSkillEntries(workspaceDir: string, opts?: LoadOptions): SkillEntry[] {
    // 1. 定义多个 Skill 来源目录及其优先级
    const sources = [
        { dir: extraDirs,          source: "openclaw-extra",     priority: 0 },
        { dir: bundledSkillsDir,   source: "openclaw-bundled",   priority: 1 },
        { dir: managedSkillsDir,   source: "openclaw-managed",   priority: 2 },
        { dir: workspaceSkillsDir, source: "openclaw-workspace", priority: 3 }
    ];
    
    // 2. 并行加载所有来源
    const loadSkills = (params: LoadParams) => {
        loaded = loadSkillsFromDir(params)
        IF Array.isArray(loaded): RETURN loaded
        IF loaded?.skills IS Array: RETURN loaded.skills
        RETURN []
    }
    
    // 从各个源加载 Skill
    const bundledSkills = bundledSkillsDir 
        ? loadSkills({ dir: bundledSkillsDir, source: "openclaw-bundled" })
        : []
    const extraSkills = extraDirs.flatMap(dir => 
        loadSkills({ dir: resolveUserPath(dir), source: "openclaw-extra" })
    )
    const managedSkills = loadSkills({ dir: managedSkillsDir, source: "openclaw-managed" })
    const workspaceSkills = loadSkills({ dir: workspaceSkillsDir, source: "openclaw-workspace" })

    // 3. 优先级合并算法（Map去重，高优先级覆盖）
    // 优先级顺序: extra < bundled < managed < workspace
    const merged = new Map<string, Skill>()
    
    // 低优先级先加入
    for (const skill of extraSkills) {
        merged.set(skill.name, skill)  // 基础层
    }
    // 中等优先级覆盖
    for (const skill of bundledSkills) {
        merged.set(skill.name, skill)  // 覆盖extra
    }
    for (const skill of managedSkills) {
        merged.set(skill.name, skill)  // 覆盖bundled
    }
    // 高优先级最后覆盖
    for (const skill of workspaceSkills) {
        merged.set(skill.name, skill)  // 最高优先级
    }

    // 4. 转换为 SkillEntry 并解析元数据
    return Array.from(merged.values()).map(skill => {
        frontmatter = {}
        TRY:
            raw = fs.readFileSync(skill.filePath, "utf-8")
            frontmatter = parseFrontmatter(raw)
        CATCH:
            // 容错处理：忽略格式错误的 Skill
            pass
        
        RETURN {
            skill,
            frontmatter,
            metadata: resolveOpenClawMetadata(frontmatter),
            invocation: resolveSkillInvocationPolicy(frontmatter),
        }
    })
}

// ============================================
// 元数据解析算法
// ============================================
FUNCTION resolveOpenClawMetadata(frontmatter: ParsedSkillFrontmatter): OpenClawSkillMetadata | undefined {
    // 1. 提取原始 metadata 字符串
    raw = getFrontmatterValue(frontmatter, "metadata")
    IF NOT raw: RETURN undefined
    
    TRY:
        // 2. 使用 JSON5 解析（支持注释和尾随逗号）
        parsed = JSON5.parse(raw)
        IF NOT parsed OR typeof parsed !== "object": RETURN undefined
        
        // 3. 多键候选查找（向后兼容）
        const metadataRawCandidates = [MANIFEST_KEY, ...LEGACY_MANIFEST_KEYS]
        for (const key of metadataRawCandidates) {
            if (parsed[key] && typeof parsed[key] === "object") {
                metadataRaw = parsed[key]
                break
            }
        }
        
        IF NOT metadataRaw: RETURN undefined
        
        // 4. 结构化提取
        RETURN {
            always: metadataRaw.always,           // 强制启用标志
            skillKey: metadataRaw.skillKey,       // 唯一标识
            primaryEnv: metadataRaw.primaryEnv,   // 主环境变量
            os: normalizeStringList(metadataRaw.os),  // 支持平台
            requires: {
                bins: normalizeStringList(requiresRaw?.bins),     // 必需二进制
                anyBins: normalizeStringList(requiresRaw?.anyBins), // 任一二进制
                env: normalizeStringList(requiresRaw?.env),       // 必需环境变量
                config: normalizeStringList(requiresRaw?.config)  // 必需配置
            },
            install: parseInstallSpecs(metadataRaw.install)  // 安装规范
        }
    CATCH:
        RETURN undefined
}

// ============================================
// 构建 Skill 快照
// ============================================
FUNCTION buildWorkspaceSkillSnapshot(
    workspaceDir: string, 
    opts?: SnapshotOptions
): SkillSnapshot {
    skillEntries = opts?.entries ?? loadSkillEntries(workspaceDir, opts)
    
    // 过滤符合条件的 Skill
    eligible = filterSkillEntries(
        skillEntries, 
        opts?.config, 
        opts?.skillFilter, 
        opts?.eligibility
    )
    
    // 过滤可用于模型提示的 Skill
    promptEntries = eligible.filter(entry => 
        entry.invocation?.disableModelInvocation !== true
    )
    
    resolvedSkills = promptEntries.map(entry => entry.skill)
    remoteNote = opts?.eligibility?.remote?.note?.trim()
    
    // 构建提示文本
    prompt = [remoteNote, formatSkillsForPrompt(resolvedSkills)]
        .filter(Boolean)
        .join("\n")
    
    RETURN {
        prompt,
        skills: eligible.map(entry => ({ 
            name: entry.skill.name, 
            primaryEnv: entry.metadata?.primaryEnv 
        })),
        resolvedSkills,
        version: opts?.snapshotVersion,
    }
}

// ============================================
// 构建命令规范（用于 Discord/Slack 等平台）
// ============================================
FUNCTION buildWorkspaceSkillCommandSpecs(
    workspaceDir: string, 
    opts?: CommandSpecOptions
): SkillCommandSpec[] {
    skillEntries = opts?.entries ?? loadSkillEntries(workspaceDir, opts)
    eligible = filterSkillEntries(skillEntries, opts?.config, opts?.skillFilter, opts?.eligibility)
    
    // 只保留用户可调用的 Skill
    userInvocable = eligible.filter(entry => 
        entry.invocation?.userInvocable !== false
    )
    
    used = new Set<string>()
    FOR reserved IN opts?.reservedNames ?? []: 
        used.add(reserved.toLowerCase())
    
    specs = []
    FOR entry IN userInvocable:
        rawName = entry.skill.name
        base = sanitizeSkillCommandName(rawName)
        
        // 确保唯一性
        unique = resolveUniqueSkillCommandName(base, used)
        used.add(unique.toLowerCase())
        
        // 截断描述（Discord 限制 100 字符）
        rawDescription = entry.skill.description?.trim() || rawName
        description = rawDescription.length > 100 
            ? rawDescription.slice(0, 99) + "…" 
            : rawDescription
        
        // 解析命令分发配置
        dispatch = parseDispatchConfig(entry.frontmatter)
        
        specs.push({ 
            name: unique, 
            skillName: rawName, 
            description, 
            ...(dispatch ? { dispatch } : {}) 
        })
    
    RETURN specs
}

// 命令名规范化
FUNCTION sanitizeSkillCommandName(raw: string): string {
    normalized = raw
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
    RETURN normalized.slice(0, 32) || "skill"
}
```

### 目录扫描规则

```
skills/
├── skill-a.md              # 直接子目录中的 .md 文件
├── skill-b/
│   └── SKILL.md            # 子目录中的 SKILL.md
└── category/
    └── skill-c/
        └── SKILL.md        # 嵌套子目录中的 SKILL.md
```

扫描器会递归查找：
- 直接子目录中的 `.md` 文件
- 任意层级子目录中的 `SKILL.md` 文件

### 关键加载方法

| 方法名 | 描述 | 文件路径 |
|-------|------|---------|
| `loadSkillEntries` | 加载所有 Skill | `src/agents/skills/workspace.ts` |
| `parseFrontmatter` | 解析 YAML Frontmatter | `src/agents/skills/frontmatter.ts` |
| `resolveOpenClawMetadata` | 解析 OpenClaw 扩展元数据 | `src/agents/skills/frontmatter.ts` |
| `shouldIncludeSkill` | 判定 Skill 是否可用 | `src/agents/skills/config.ts` |
| `buildWorkspaceSkillSnapshot` | 构建 Skill 快照 | `src/agents/skills/workspace.ts` |

---

## Skill 执行流程

### 命令调用方式

```
# 方式 1：传统格式
/skill:github list prs

# 方式 2：直接命令格式（推荐）
/github list prs
```

### 执行流程详解

```
┌─────────────────────────────────────────────────────────────────┐
│                        Skill 执行流程                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │ 用户输入  │──▶│ 命令解析  │──▶│ 技能匹配  │──▶│ 资格检查  │     │
│  └──────────┘   └──────────┘   └──────────┘   └────┬─────┘     │
│                                                    │            │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────▼─────┐     │
│  │ 结果返回  │◀──│ 结果处理  │◀──│ 执行监控  │◀──│ 指令生成  │     │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 项目经理视角的执行流程

将 Skill 执行过程类比为项目经理管理项目的完整流程：

1. **命令解析**：理解用户的"工作需求"（理解客户需求）
2. **技能匹配**：找到最适合的"员工"（选择团队成员）
3. **资格检查**：确认"员工"是否具备工作条件（资质审核）
4. **环境准备**：为 Skill 提供"工作环境"（准备工作空间）
5. **指令生成**：为 AI 生成"工作指示"（分配具体任务）
6. **执行监控**：跟踪 Skill 的"工作进度"（监控项目进度）
7. **结果处理**：整理并返回"工作成果"（验收并交付）

### 执行引擎伪代码

```typescript
// ============================================
// 处理 Skill 调用请求
// ============================================
FUNCTION handleInvoke(payload: InvokePayload, client: GatewayClient, skillBins: SkillBinsCache): void {
    // 解析请求
    invokeId = payload.invokeId
    bin = payload.bin
    argv = payload.argv ?? []
    cwd = payload.cwd
    env = payload.env ?? {}
    timeoutMs = payload.timeoutMs ?? 60_000
    
    // 检查执行权限
    approvals = resolveExecApprovals({ bin, argv, cwd, env })
    
    // 处理需要用户批准的情况
    IF approvals.requiresUserApproval:
        client.sendNodeEvent({
            type: "approval_required",
            invokeId,
            message: approvals.approvalMessage,
        })
        RETURN
    
    // 确定执行方式
    execMode = determineExecMode(bin, skillBins)
    
    SWITCH execMode:
        CASE "local":
            result = await runCommandLocally({ bin, argv, cwd, env, timeoutMs })
        CASE "remote_macos":
            result = await runViaMacAppExecHost({ bin, argv, cwd, env, timeoutMs, client })
        DEFAULT:
            result = { code: 1, stdout: "", stderr: "Unsupported execution mode" }
    
    // 发送结果
    client.sendInvokeResult({
        invokeId,
        ...result,
    })
}

// ============================================
// 本地命令执行（带超时控制和信号处理）
// ============================================
FUNCTION runCommandLocally(params: RunParams): Promise<ExecResult> {
    { bin, argv, cwd, env, timeoutMs } = params
    
    RETURN new Promise((resolve) => {
        // 1. 环境准备
        const resolvedEnv = env ? { ...process.env, ...env } : { ...process.env }
        
        // 2. 进程创建
        child = spawn(bin, argv, {
            cwd,
            env: resolvedEnv,
            stdio: ["pipe", "pipe", "pipe"],
        })
        
        stdout = ""
        stderr = ""
        settled = false
        
        // 3. 数据流处理
        child.stdout.on("data", (data) => {
            stdout += data.toString()
        })
        
        child.stderr.on("data", (data) => {
            stderr += data.toString()
        })
        
        // 4. 超时定时器设置
        timer = setTimeout(() => {
            IF NOT settled:
                settled = true
                child.kill("SIGKILL")  // 强制终止
                resolve({ 
                    code: 124, 
                    stdout, 
                    stderr: stderr + "\n[Command timed out]" 
                })
        }, timeoutMs)
        
        // 5. 进程结束处理
        child.on("close", (code, signal) => {
            IF settled: RETURN
            settled = true
            clearTimeout(timer)
            resolve({ code: code ?? 1, stdout, stderr, signal })
        })
        
        // 6. 错误处理
        child.on("error", (err) => {
            IF settled: RETURN
            settled = true
            clearTimeout(timer)
            resolve({ 
                code: 1, 
                stdout, 
                stderr: stderr + "\n" + err.message 
            })
        })
    })
}

// ============================================
// 信号桥接机制（父子进程信号同步）
// ============================================
FUNCTION attachChildProcessBridge(child, options) {
    // 平台适配的信号列表
    defaultSignals = process.platform === "win32"
        ? ["SIGTERM", "SIGINT", "SIGBREAK"]
        : ["SIGTERM", "SIGINT", "SIGHUP", "SIGQUIT"]
    
    listeners = new Map()
    
    // 为每个信号注册转发监听器
    FOR signal IN signals:
        listener = () => {
            onSignal?.(signal)
            TRY:
                child.kill(signal)  // 转发信号给子进程
            CATCH: 
                // 忽略错误
        }
        
        process.on(signal, listener)
        listeners.set(signal, listener)
    
    // 清理函数
    detach = () => {
        FOR [signal, listener] OF listeners:
            process.off(signal, listener)
        listeners.clear()
    }
    
    // 自动清理绑定
    child.once("exit", detach)
    child.once("error", detach)
    
    RETURN { detach }
}

// ============================================
// 通过 macOS App 执行（远程执行）
// ============================================
FUNCTION runViaMacAppExecHost(params: MacExecParams): Promise<ExecResult> {
    { bin, argv, cwd, env, timeoutMs, client } = params
    
    RETURN new Promise((resolve) => {
        // 构建执行请求
        request = {
            type: "exec",
            id: generateId(),
            bin,
            args: argv,
            cwd,
            env,
            timeoutMs,
        }
        
        // 等待执行结果
        timeout = setTimeout(() => {
            resolve({ 
                code: 124, 
                stdout: "", 
                stderr: "[Remote execution timed out]" 
            })
        }, timeoutMs + 5000)  // 额外 5 秒网络延迟缓冲
        
        // 监听结果
        once(client, "exec_result", (result) => {
            clearTimeout(timeout)
            IF result.id === request.id:
                resolve({ 
                    code: result.code, 
                    stdout: result.stdout, 
                    stderr: result.stderr 
                })
        })
        
        // 发送执行请求
        client.sendToExecHost(request)
    })
}
```

### 分发类型

当前支持的分发类型：

| 类型 | 说明 | 配置示例 |
|------|------|----------|
| `tool` | 调用指定工具 | `command-dispatch: tool`<br>`command-tool: myTool` |

### 参数传递机制

```yaml
# SKILL.md
command-dispatch: tool
command-tool: github-cli
command-arg-mode: raw
```

当用户输入 `/github list prs` 时：
- `command-tool` 指定调用的工具名
- `command-arg-mode: raw` 表示将 `list prs` 作为原始参数传递

### 参数传递方式

OpenClaw 支持多种参数传递方式：

| 方式 | 说明 | 适用场景 |
|------|------|----------|
| **命令行参数** | 将参数作为命令行参数传递 | 简单参数 |
| **环境变量** | 通过环境变量传递参数 | 敏感信息 |
| **标准输入** | 通过标准输入流传递参数 | 大量数据 |
| **配置文件** | 通过临时配置文件传递 | 复杂参数 |

### 关键执行方法

| 方法名 | 描述 | 文件路径 |
|-------|------|---------|
| `runNodeHost` | 启动 Node Host，处理技能执行请求 | `src/node-host/runner.ts` |
| `handleInvoke` | 处理技能执行请求 | `src/node-host/runner.ts` |
| `runCommand` | 执行命令并收集结果 | `src/node-host/runner.ts` |
| `runViaMacAppExecHost` | 通过 macOS app 执行命令 | `src/node-host/runner.ts` |
| `resolveExecApprovals` | 解析执行权限 | `src/infra/exec-approvals.ts` |
| `sendInvokeResult` | 返回执行结果 | `src/node-host/runner.ts` |
| `sendNodeEvent` | 发送执行事件 | `src/node-host/runner.ts` |

---

## Skill 资格判定算法

### 判定流程（伪代码）

```typescript
// ============================================
// 主判定函数：判断 Skill 是否应该被包含
// ============================================
FUNCTION shouldIncludeSkill(
    entry: SkillEntry, 
    config?: OpenClawConfig, 
    eligibility?: SkillEligibilityContext
): boolean {
    skillKey = resolveSkillKey(entry.skill, entry)
    skillConfig = resolveSkillConfig(config, skillKey)
    allowBundled = normalizeAllowlist(config?.skills?.allowBundled)
    osList = entry.metadata?.os ?? []
    remotePlatforms = eligibility?.remote?.platforms ?? []

    // 1. 检查是否被显式禁用
    IF skillConfig?.enabled === false:
        RETURN false

    // 2. 检查白名单限制（仅针对捆绑 Skill）
    IF NOT isBundledSkillAllowed(entry, allowBundled):
        RETURN false

    // 3. 检查操作系统兼容性
    IF osList.length > 0 AND 
       NOT osList.includes(currentPlatform) AND
       NOT remotePlatforms.some(p => osList.includes(p)):
        RETURN false

    // 4. 检查 always 标志（跳过依赖检查）
    IF entry.metadata?.always === true:
        RETURN true

    // 5. 检查必需的二进制文件
    requiredBins = entry.metadata?.requires?.bins ?? []
    FOR EACH bin IN requiredBins:
        IF NOT hasBinary(bin) AND NOT eligibility?.remote?.hasBin(bin):
            RETURN false

    // 6. 检查任一必需的二进制文件
    requiredAnyBins = entry.metadata?.requires?.anyBins ?? []
    IF requiredAnyBins.length > 0:
        IF NOT (requiredAnyBins.some(bin => hasBinary(bin)) OR 
                eligibility?.remote?.hasAnyBin(requiredAnyBins)):
            RETURN false

    // 7. 检查必需的环境变量
    requiredEnv = entry.metadata?.requires?.env ?? []
    FOR EACH envName IN requiredEnv:
        IF process.env[envName] EXISTS:
            CONTINUE
        IF skillConfig?.env?.[envName] EXISTS:
            CONTINUE
        IF skillConfig?.apiKey AND entry.metadata?.primaryEnv === envName:
            CONTINUE
        RETURN false

    // 8. 检查必需的配置路径
    requiredConfig = entry.metadata?.requires?.config ?? []
    FOR EACH configPath IN requiredConfig:
        IF NOT isConfigPathTruthy(config, configPath):
            RETURN false

    RETURN true
}

// ============================================
// 检查系统 PATH 中是否存在指定二进制文件
// ============================================
FUNCTION hasBinary(bin: string): boolean {
    pathEnv = process.env.PATH ?? ""
    parts = pathEnv.split(path.delimiter).filter(Boolean)
    
    FOR EACH part IN parts:
        candidate = path.join(part, bin)
        TRY:
            fs.accessSync(candidate, fs.constants.X_OK)
            RETURN true
        CATCH:
            CONTINUE
    
    RETURN false
}

// ============================================
// 检查配置路径是否存在且为真值
// ============================================
FUNCTION isConfigPathTruthy(config: any, pathStr: string): boolean {
    parts = pathStr.split(".")
    current = config
    
    FOR EACH part IN parts:
        IF current === null OR current === undefined:
            RETURN false
        current = current[part]
    
    RETURN Boolean(current)
}
```

### 判定条件详解

| 条件 | 字段 | 说明 |
|------|------|------|
| 启用状态 | `enabled` | 用户可显式禁用 Skill |
| 白名单 | `allowBundled` | 控制哪些内置 Skill 可用 |
| 平台 | `os` | 限制特定操作系统 |
| 二进制文件 | `requires.bins` | 必须全部存在的命令 |
| 可选二进制 | `requires.anyBins` | 至少一个存在的命令 |
| 环境变量 | `requires.env` | 必须设置的环境变量 |
| 配置路径 | `requires.config` | 必须存在的配置项 |
| 始终包含 | `always` | 忽略其他检查 |

---

## Skill 安装系统

### 安装类型

| 类型 | 说明 | 必需字段 |
|------|------|----------|
| `brew` | Homebrew 安装 | `formula` |
| `node` | npm/yarn/pnpm 全局安装 | `package` |
| `go` | Go install 安装 | `module` |
| `uv` | uv tool 安装 | `package` |
| `download` | 下载并解压 | `url` |

### 安装流程（伪代码）

```typescript
// ============================================
// 主安装函数
// ============================================
FUNCTION installSkill(params: InstallParams): Promise<InstallResult> {
    // 超时值规范化：默认5分钟，最小1秒，最大15分钟
    timeoutMs = CLAMP(params.timeoutMs ?? 300_000, 1_000, 900_000)
    workspaceDir = resolveUserPath(params.workspaceDir)
    
    // 加载所有 Skill 条目
    entries = loadWorkspaceSkillEntries(workspaceDir)
    entry = entries.find(item => item.skill.name === params.skillName)
    
    IF NOT entry:
        RETURN { ok: false, message: `Skill not found: ${params.skillName}`, ... }
    
    // 查找安装规范
    spec = findInstallSpec(entry, params.installId)
    
    // 安全扫描
    warnings = await collectSkillInstallScanWarnings(entry)
    
    IF NOT spec:
        RETURN withWarnings({ 
            ok: false, 
            message: `Installer not found: ${params.installId}`, 
            ... 
        }, warnings)
    
    // 处理下载类型
    IF spec.kind === "download":
        RETURN withWarnings(
            await installDownloadSpec({ entry, spec, timeoutMs }), 
            warnings
        )
    
    // 构建安装命令
    prefs = resolveSkillsInstallPreferences(params.config)
    command = buildInstallCommand(spec, prefs)
    
    IF command.error:
        RETURN withWarnings({ 
            ok: false, 
            message: command.error, 
            ... 
        }, warnings)
    
    // 检查并安装依赖工具
    IF spec.kind === "brew" AND NOT hasBinary("brew"):
        RETURN withWarnings({ 
            ok: false, 
            message: "brew not installed", 
            ... 
        }, warnings)
    
    IF spec.kind === "uv" AND NOT hasBinary("uv"):
        IF hasBinary("brew"):
            // 尝试自动安装 uv
            brewResult = await runCommandWithTimeout(
                ["brew", "install", "uv"], 
                { timeoutMs }
            )
            IF brewResult.code !== 0:
                RETURN withWarnings({ 
                    ok: false, 
                    message: "Failed to install uv (brew)", 
                    ... 
                }, warnings)
        ELSE:
            RETURN withWarnings({ 
                ok: false, 
                message: "uv not installed (install via brew)", 
                ... 
            }, warnings)
    
    // 执行安装
    result = await runCommandWithTimeout(command.argv, { timeoutMs, env })
    
    success = result.code === 0
    RETURN withWarnings({
        ok: success,
        message: success ? "Installed" : formatInstallFailureMessage(result),
        stdout: result.stdout.trim(),
        stderr: result.stderr.trim(),
        code: result.code,
    }, warnings)
}

// ============================================
// 下载类型安装
// ============================================
FUNCTION installDownloadSpec(params: DownloadParams): Promise<InstallResult> {
    { entry, spec, timeoutMs } = params
    url = spec.url?.trim()
    
    IF NOT url:
        RETURN { ok: false, message: "missing download url", ... }
    
    // 提取文件名
    TRY:
        parsed = new URL(url)
        filename = path.basename(parsed.pathname)
    CATCH:
        filename = path.basename(url)
    
    IF NOT filename: filename = "download"
    
    targetDir = resolveDownloadTargetDir(entry, spec)
    await ensureDir(targetDir)
    
    archivePath = path.join(targetDir, filename)
    
    // 下载文件
    TRY:
        result = await downloadFile(url, archivePath, timeoutMs)
        downloaded = result.bytes
    CATCH err:
        RETURN { ok: false, message: err.message, ... }
    
    // 判断是否需要解压
    archiveType = resolveArchiveType(spec, filename)
    shouldExtract = spec.extract ?? Boolean(archiveType)
    
    IF NOT shouldExtract:
        RETURN { 
            ok: true, 
            message: `Downloaded to ${archivePath}`, 
            stdout: `downloaded=${downloaded}`, 
            ... 
        }
    
    IF NOT archiveType:
        RETURN { 
            ok: false, 
            message: "extract requested but archive type could not be detected", 
            ... 
        }
    
    // 解压
    extractResult = await extractArchive({ 
        archivePath, 
        archiveType, 
        targetDir, 
        stripComponents: spec.stripComponents, 
        timeoutMs 
    })
    
    success = extractResult.code === 0
    RETURN {
        ok: success,
        message: success 
            ? `Downloaded and extracted to ${targetDir}` 
            : formatInstallFailureMessage(extractResult),
        stdout: extractResult.stdout.trim(),
        stderr: extractResult.stderr.trim(),
        code: extractResult.code,
    }
}

// ============================================
// 构建安装命令
// ============================================
FUNCTION buildInstallCommand(spec: SkillInstallSpec, prefs: InstallPrefs): CommandResult {
    SWITCH spec.kind:
        CASE "brew":
            RETURN { argv: ["brew", "install", spec.formula] }
        
        CASE "node":
            nodeManager = prefs.nodeManager ?? "npm"
            RETURN { argv: [nodeManager, "install", "-g", spec.package] }
        
        CASE "go":
            RETURN { argv: ["go", "install", spec.module] }
        
        CASE "uv":
            RETURN { argv: ["uv", "tool", "install", spec.package] }
        
        DEFAULT:
            RETURN { error: `Unsupported install kind: ${spec.kind}` }
}
```

### 安装配置示例

```json5
{
  "openclaw": {
    "install": [
      // Homebrew 安装
      {
        "kind": "brew",
        "formula": "gh",
        "bins": ["gh"],
        "os": ["darwin", "linux"]
      },
      
      // Node.js 包安装
      {
        "kind": "node",
        "package": "@anthropic-ai/claude-code",
        "bins": ["claude"],
        "label": "Install via npm"
      },
      
      // Go 模块安装
      {
        "kind": "go",
        "module": "github.com/cli/cli/v2/cmd/gh@latest",
        "bins": ["gh"]
      },
      
      // uv 工具安装
      {
        "kind": "uv",
        "package": "ruff",
        "bins": ["ruff"]
      },
      
      // 下载安装
      {
        "kind": "download",
        "url": "https://github.com/user/repo/releases/download/v1.0.0/tool.tar.gz",
        "archive": "tar.gz",
        "extract": true,
        "stripComponents": 1,
        "targetDir": "bin",
        "bins": ["tool"],
        "os": ["darwin"]
      }
    ]
  }
}
```

---

## Skill 安全机制

### 安全扫描规则

```typescript
const SECURITY_RULES = [
  {
    ruleId: "dangerous-exec",
    severity: "critical",
    message: "检测到 shell 命令执行 (child_process)",
    pattern: /\b(exec|execSync|spawn|spawnSync|execFile|execFileSync)\s*\(/,
    requiresContext: /child_process/,
  },
  {
    ruleId: "dynamic-code-execution",
    severity: "critical",
    message: "检测到动态代码执行",
    pattern: /\beval\s*\(|new\s+Function\s*\(/,
  },
  {
    ruleId: "env-harvesting",
    severity: "critical",
    message: "环境变量访问结合网络发送",
    pattern: /process\.env/,
    requiresContext: /\bfetch\b|\bpost\b|http\.request/i,
  },
  {
    ruleId: "suspicious-network",
    severity: "high",
    message: "检测到可疑网络请求",
    pattern: /\bfetch\s*\(\s*['"`][^'"`]*['"`]/,
  },
  {
    ruleId: "file-system-access",
    severity: "medium",
    message: "检测到文件系统访问",
    pattern: /\bfs\.[a-zA-Z]+\s*\(/,
  },
];
```

### 扫描流程

```
┌─────────────────────────────────────────────────────────────┐
│  1. 读取 Skill 文件内容                                        │
│     ↓                                                       │
│  2. 逐行匹配安全规则                                          │
│     ↓                                                       │
│  3. 检查上下文（requiresContext）                             │
│     ↓                                                       │
│  4. 生成警告列表                                              │
│     ↓                                                       │
│  5. 根据严重级别决定是否阻止安装                               │
└─────────────────────────────────────────────────────────────┘
```

### 执行时安全机制

| 机制 | 说明 | 实现位置 |
|------|------|----------|
| **权限检查** | 检查 Skill 是否有执行权限 | `src/infra/exec-approvals.ts` |
| **允许列表验证** | 检查命令是否在允许列表中 | `src/infra/exec-approvals.ts` |
| **用户批准** | 敏感操作要求用户批准 | `src/infra/exec-approvals.ts` |
| **沙箱隔离** | 在沙箱中执行 Skill | `src/node-host/runner.ts` |

### 安全建议

1. **审查第三方 Skill**：安装前仔细阅读代码
2. **最小权限原则**：只安装必要的 Skill
3. **定期检查**：更新 Skill 时重新审查
4. **使用官方源**：优先使用官方或可信来源的 Skill

---

## Skill 配置系统

### 配置文件位置

```
~/.openclaw/
├── config.json           # 主配置文件
└── skills/
    └── <skill-name>/     # Skill 特定文件
```

### 配置 Schema

```typescript
interface SkillsConfig {
  // 内置 Skill 白名单
  allowBundled?: string[];
  
  // 加载配置
  load?: {
    extraDirs?: string[];    // 额外的 Skill 目录
    watch?: boolean;         // 是否启用文件监视
    watchDebounceMs?: number; // 监视防抖时间
  };
  
  // 安装偏好
  install?: {
    nodeManager?: "npm" | "yarn" | "pnpm";
  };
  
  // 每个 Skill 的配置
  entries?: {
    [skillKey: string]: SkillConfig;
  };
}

interface SkillConfig {
  enabled?: boolean;                    // 是否启用
  apiKey?: string;                      // API 密钥（注入到 primaryEnv）
  env?: Record<string, string>;         // 环境变量
  config?: Record<string, unknown>;     // 自定义配置
}
```

### 配置示例

```json5
{
  "skills": {
    // 白名单：只允许这些内置 Skill
    "allowBundled": ["github", "summarize", "weather"],
    
    // 加载配置
    "load": {
      "extraDirs": [
        "/path/to/custom/skills"
      ],
      "watch": true,
      "watchDebounceMs": 250
    },
    
    // 安装偏好
    "install": {
      "nodeManager": "pnpm"
    },
    
    // Skill 特定配置
    "entries": {
      "github": {
        "enabled": true,
        "apiKey": "ghp_xxxxxxxxxxxx",
        "env": {
          "GITHUB_API_URL": "https://api.github.com"
        }
      },
      "openai-image-gen": {
        "enabled": true,
        "apiKey": "sk-xxxxxxxxxxxx",
        "config": {
          "defaultModel": "dall-e-3",
          "defaultSize": "1024x1024"
        }
      },
      "discord": {
        "enabled": false
      }
    }
  }
}
```

### 环境变量注入（伪代码）

```typescript
// ============================================
// 应用 Skill 环境变量覆盖
// ============================================
FUNCTION applySkillEnvOverrides(params: EnvOverrideParams): () => void {
    { skills, config } = params
    updates = []
    
    FOR entry IN skills:
        skillKey = resolveSkillKey(entry.skill, entry)
        skillConfig = resolveSkillConfig(config, skillKey)
        IF NOT skillConfig: CONTINUE
        
        // 应用自定义环境变量
        IF skillConfig.env:
            FOR [envKey, envValue] OF Object.entries(skillConfig.env):
                IF NOT envValue OR process.env[envKey]: CONTINUE
                updates.push({ key: envKey, prev: process.env[envKey] })
                process.env[envKey] = envValue
        
        // 应用 API Key 作为主要环境变量
        primaryEnv = entry.metadata?.primaryEnv
        IF primaryEnv AND skillConfig.apiKey AND NOT process.env[primaryEnv]:
            updates.push({ key: primaryEnv, prev: process.env[primaryEnv] })
            process.env[primaryEnv] = skillConfig.apiKey
    
    // 返回恢复函数
    RETURN () => {
        FOR update IN updates:
            IF update.prev === undefined:
                delete process.env[update.key]
            ELSE:
                process.env[update.key] = update.prev
    }
}
```

### 环境变量注入流程

```
┌─────────────────────────────────────────────────────────────┐
│  Skill 配置                                                  │
│  ├── apiKey: "sk-xxx"                                       │
│  ├── primaryEnv: "OPENAI_API_KEY"                           │
│  └── env: { "CUSTOM_VAR": "value" }                          │
│                     ↓                                       │
│  注入到 process.env                                         │
│  ├── process.env.OPENAI_API_KEY = "sk-xxx"                  │
│  └── process.env.CUSTOM_VAR = "value"                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 远程 Skill 支持

### 概念

远程 Skill 允许在连接的远程节点（如 macOS 设备）上执行平台特定的 Skill。

### 使用场景

- 在 Linux/Windows 上运行 OpenClaw，但需要执行 macOS 特定的 Skill（如 Apple Notes、iMessage）
- 利用远程设备的已安装工具和配置

### 资格检查（伪代码）

```typescript
// ============================================
// 获取远程 Skill 资格
// ============================================
FUNCTION getRemoteSkillEligibility(): RemoteEligibility | undefined {
    // 1. 查找连接的 macOS 节点
    macNodes = [...remoteNodes.values()].filter(node => 
        isMacPlatform(node.platform, node.deviceFamily) && 
        supportsSystemRun(node.commands)
    )
    
    IF macNodes.length === 0:
        RETURN undefined
    
    // 2. 收集远程节点上的二进制文件
    bins = new Set<string>()
    FOR node IN macNodes:
        FOR bin IN node.bins:
            bins.add(bin)
    
    // 3. 返回远程资格上下文
    RETURN {
        platforms: ["darwin"],
        hasBin: (bin) => bins.has(bin),
        hasAnyBin: (required) => required.some(bin => bins.has(bin)),
        note: "Remote macOS node available...",
    }
}

// ============================================
// 远程节点缓存预加载
// ============================================
FUNCTION primeRemoteSkillsCache(): Promise<void> {
    list = await listNodePairing()
    sawMac = false
    
    FOR node OF list.paired:
        upsertNode({
            nodeId: node.nodeId,
            displayName: node.displayName,
            platform: node.platform,
            deviceFamily: node.deviceFamily,
            commands: node.commands,
            remoteIp: node.remoteIp,
            bins: node.bins,  // 预缓存二进制列表
        })
        
        IF isMacPlatform(node.platform, node.deviceFamily) AND 
           supportsSystemRun(node.commands):
            sawMac = true
    
    // 发现 Mac 节点时触发快照更新
    IF sawMac:
        bumpSkillsSnapshotVersion({ reason: "remote-node" })
}
```

### 远程执行流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  本地 OpenClaw │────▶│  检查远程节点  │────▶│  转发命令    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  远程节点执行 │
                                        │  (macOS)     │
                                        └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  返回结果    │◀────│  结果转发    │◀────│  执行完成    │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## ClawHub 技能生态系统

### ClawHub 简介

ClawHub 是 OpenClaw 的公共技能注册表，提供了技能的搜索、安装、更新和发布功能。它是 OpenClaw 技能生态系统的重要组成部分。

### 核心功能

| 功能 | 说明 |
|------|------|
| **技能搜索** | 通过关键词搜索技能 |
| **技能安装** | 一键安装技能到本地 |
| **技能更新** | 更新已安装的技能到最新版本 |
| **技能发布** | 将自定义技能发布到公共注册表 |
| **技能同步** | 批量同步本地技能 |

### ClawHub CLI 命令

| 命令 | 描述 |
|------|------|
| `clawhub search "query"` | 搜索技能 |
| `clawhub install <slug>` | 安装技能 |
| `clawhub update <slug>` | 更新技能 |
| `clawhub update --all` | 更新所有技能 |
| `clawhub publish <path>` | 发布技能 |
| `clawhub sync` | 同步本地技能 |

### 与 OpenClaw 的集成

- **自动识别**：OpenClaw 自动识别 ClawHub 安装的技能
- **路径集成**：默认安装到 `./skills` 目录
- **命令提示**：OpenClaw 的 `skills` 命令会显示 ClawHub 提示

### 使用示例

```bash
# 搜索 GitHub 相关技能
clawhub search "github"

# 安装技能
clawhub install github-cli

# 更新所有技能
clawhub update --all

# 发布自定义技能
clawhub publish ./skills/my-custom-skill
```

---

## 性能优化与缓存机制

### 技能缓存机制

为了提高技能加载速度，OpenClaw 实现了多层次的缓存机制：

```
┌─────────────────────────────────────────────────────────────┐
│                      缓存层次结构                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 技能路径缓存 │  │ 元数据缓存   │  │ 执行结果缓存 │         │
│  │ SkillBinsCache│ │ (Frontmatter)│ │ (可选)       │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  缓存策略：                                                  │
│  - 内存缓存：运行时保持                                      │
│  - 文件监视：自动检测变更并刷新                               │
│  - 版本控制：基于内容哈希                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### SkillBinsCache 实现（伪代码）

```typescript
CLASS SkillBinsCache:
    PRIVATE bins = new Set<string>()
    PRIVATE lastRefresh = 0
    PRIVATE ttlMs = 90_000
    PRIVATE fetch: () => Promise<string[]>

    CONSTRUCTOR(fetch):
        this.fetch = fetch

    ASYNC current(force = false):
        IF force OR Date.now() - this.lastRefresh > this.ttlMs:
            await this.refresh()
        RETURN this.bins

    PRIVATE ASYNC refresh():
        TRY:
            bins = await this.fetch()
            this.bins = new Set(bins)
            this.lastRefresh = Date.now()
        CATCH:
            IF NOT this.lastRefresh:  // 首次失败
                this.bins = new Set()
```

### 热重载机制（伪代码）

```typescript
// ============================================
// 确保 Skill 文件监视器
// ============================================
FUNCTION ensureSkillsWatcher(params: WatcherParams): void {
    workspaceDir = params.workspaceDir.trim()
    IF NOT workspaceDir: RETURN
    
    watchEnabled = params.config?.skills?.load?.watch !== false
    debounceMs = params.config?.skills?.load?.watchDebounceMs ?? 250
    
    existing = watchers.get(workspaceDir)
    
    // 如果禁用监视，清理现有监视器
    IF NOT watchEnabled:
        IF existing:
            watchers.delete(workspaceDir)
            IF existing.timer: clearTimeout(existing.timer)
            existing.watcher.close()
        RETURN
    
    watchPaths = resolveWatchPaths(workspaceDir, params.config)
    pathsKey = watchPaths.join("|")
    
    // 如果配置未变，复用现有监视器
    IF existing AND existing.pathsKey === pathsKey AND existing.debounceMs === debounceMs:
        RETURN
    
    // 清理旧监视器
    IF existing:
        watchers.delete(workspaceDir)
        IF existing.timer: clearTimeout(existing.timer)
        existing.watcher.close()
    
    // 创建新监视器
    watcher = chokidar.watch(watchPaths, {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: debounceMs, pollInterval: 100 },
        ignored: DEFAULT_SKILLS_WATCH_IGNORED,  // 忽略 node_modules 等
    })
    
    state = { watcher, pathsKey, debounceMs }
    
    // 调度更新（防抖）
    schedule = (changedPath) => {
        state.pendingPath = changedPath ?? state.pendingPath
        IF state.timer: clearTimeout(state.timer)
        state.timer = setTimeout(() => {
            bumpSkillsSnapshotVersion({
                workspaceDir,
                reason: "watch",
                changedPath: state.pendingPath,
            })
            state.pendingPath = undefined
            state.timer = undefined
        }, debounceMs)
    }
    
    watcher.on("add", p => schedule(p))
    watcher.on("change", p => schedule(p))
    watcher.on("unlink", p => schedule(p))
    
    watchers.set(workspaceDir, state)
}

// ============================================
// 版本管理
// ============================================
listeners = new Set<(event: SkillsChangeEvent) => void>()
workspaceVersions = new Map<string, number>()
globalVersion = 0

FUNCTION bumpSkillsSnapshotVersion(params: BumpParams): number {
    reason = params?.reason ?? "manual"
    
    IF params?.workspaceDir:
        current = workspaceVersions.get(params.workspaceDir) ?? 0
        next = bumpVersion(current)
        workspaceVersions.set(params.workspaceDir, next)
        emit({ workspaceDir: params.workspaceDir, reason, changedPath: params?.changedPath })
        RETURN next
    
    globalVersion = bumpVersion(globalVersion)
    emit({ reason, changedPath: params?.changedPath })
    RETURN globalVersion
}

// 版本递增策略
FUNCTION bumpVersion(current: number): number {
    now = Date.now()
    RETURN now <= current ? current + 1 : now
}
```

### 性能优化建议

1. **合理使用缓存**：避免频繁刷新技能列表
2. **精简 Skill 描述**：减少上下文占用
3. **延迟加载**：将大型资源放在 `scripts/` 或 `assets/` 中
4. **使用远程节点**：将平台特定 Skill 放在远程节点执行

---

## 并发控制与线程安全

### 序列化执行机制

Skill 同步采用**基于 Promise 链的序列化队列**：

```typescript
// ============================================
// 全局同步队列
// ============================================
SKILLS_SYNC_QUEUE = new Map<string, Promise<unknown>>()

FUNCTION serializeByKey<T>(key: string, task: () => Promise<T>): Promise<T> {
    // 1. 获取或创建队列
    prev = SKILLS_SYNC_QUEUE.get(key) ?? Promise.resolve()
    
    // 2. 构建 Promise 链（无论前一个成功或失败都执行）
    next = prev.then(task, task)
    
    // 3. 更新队列
    SKILLS_SYNC_QUEUE.set(key, next)
    
    TRY:
        // 4. 等待当前任务完成
        RETURN await next
    FINALLY:
        // 5. 清理（仅当当前 Promise 仍是队列头时）
        IF SKILLS_SYNC_QUEUE.get(key) === next:
            SKILLS_SYNC_QUEUE.delete(key)
}

// 使用示例：Skill 同步到工作区
await serializeByKey(`syncSkills:${targetDir}`, async () => {
    // 1. 清理目标目录
    await fsp.rm(targetSkillsDir, { recursive: true, force: true })
    await fsp.mkdir(targetSkillsDir, { recursive: true })
    
    // 2. 复制 Skill 文件
    for (const entry of entries) {
        const dest = path.join(targetSkillsDir, entry.skill.name)
        await fsp.cp(entry.skill.baseDir, dest, {
            recursive: true,
            force: true,
        })
    }
})
```

### 单次执行保证

```typescript
// 调试日志单次输出
skillCommandDebugOnce = new Set<string>()

FUNCTION debugSkillCommandOnce(messageKey: string, message: string, meta?: Record) {
    IF skillCommandDebugOnce.has(messageKey): RETURN
    skillCommandDebugOnce.add(messageKey)
    skillsLogger.debug(message, meta)
}

// 警告单次输出
hasWarnedMissingBundledDir = false

FUNCTION resolveBundledSkillsContext(opts) {
    IF NOT dir AND NOT hasWarnedMissingBundledDir:
        hasWarnedMissingBundledDir = true
        skillsLogger.warn("Bundled skills directory could not be resolved...")
}
```

### 配置重载并发控制

```typescript
// 配置重载防抖控制
FUNCTION startGatewayConfigReloader(opts) {
    debounceTimer = null
    pending = false
    running = false
    
    schedule = () => {
        IF stopped: RETURN
        IF debounceTimer: clearTimeout(debounceTimer)
        
        debounceTimer = setTimeout(() => {
            void runReload()
        }, settings.debounceMs)
    }
    
    runReload = async () => {
        IF running:
            pending = true  // 标记待处理
            RETURN
        running = true
        
        TRY:
            // 执行重载逻辑...
        FINALLY:
            running = false
            IF pending:
                pending = false
                schedule()  // 处理积压的请求
    }
}
```

---

## 错误处理与重试机制

### 分层错误处理

```typescript
// 错误分类处理
FUNCTION extractErrorCode(err: unknown): string | undefined {
    IF NOT err OR typeof err !== "object": RETURN undefined
    code = err.code
    IF typeof code === "string": RETURN code
    IF typeof code === "number": RETURN String(code)
    RETURN undefined
}

FUNCTION hasErrnoCode(err: unknown, code: string): boolean {
    RETURN isErrno(err) AND err.code === code
}

// 使用示例
TRY:
    await fs.stat(filePath)
CATCH err:
    IF hasErrnoCode(err, "ENOENT"):
        // 文件不存在，优雅处理
        RETURN null
    throw err  // 其他错误继续抛出
```

### 指数退避重试

```typescript
// ============================================
// 指数退避重试算法
// ============================================
FUNCTION retryAsync<T>(
    fn: () => Promise<T>,
    options: RetryOptions
): Promise<T> {
    {
        attempts,      // 最大尝试次数
        minDelayMs,    // 最小延迟
        maxDelayMs,    // 最大延迟
        jitter         // 抖动因子(0-1)
    } = resolveRetryConfig(DEFAULT_RETRY_CONFIG, options)
    
    shouldRetry = options.shouldRetry ?? (() => true)
    
    FOR attempt = 1 TO maxAttempts:
        TRY:
            RETURN await fn()  // 尝试执行
        CATCH err:
            lastErr = err
            
            // 判断是否应该重试
            IF attempt >= maxAttempts OR NOT shouldRetry(err, attempt):
                BREAK
            
            // 计算退避延迟
            retryAfterMs = options.retryAfterMs?.(err)
            hasRetryAfter = typeof retryAfterMs === "number"
            
            // 指数退避: delay = minDelay * 2^(attempt-1)
            baseDelay = hasRetryAfter
                ? Math.max(retryAfterMs, minDelayMs)
                : minDelayMs * 2 ** (attempt - 1)
            
            // 应用抖动避免惊群
            delay = Math.min(baseDelay, maxDelayMs)
            delay = applyJitter(delay, jitter)
            
            // 回调通知
            options.onRetry?.({ attempt, maxAttempts, delayMs: delay, err })
            
            await sleep(delay)
    
    throw lastErr
}
```

**退避算法可视化**：

| 尝试次数 | 基础延迟(300ms) | 最大延迟(30000ms) | 实际延迟(带抖动) |
|---------|----------------|------------------|-----------------|
| 1 | 300ms | 300ms | 270-330ms |
| 2 | 600ms | 600ms | 540-660ms |
| 3 | 1200ms | 1200ms | 1080-1320ms |
| 4 | 2400ms | 2400ms | 2160-2640ms |
| 5 | 4800ms | 4800ms | 4320-5280ms |
| 6 | 9600ms | 9600ms | 8640-10560ms |
| 7 | 19200ms | 19200ms | 17280-21120ms |
| 8 | 38400ms | 30000ms | 27000-30000ms (封顶) |

### 进程执行重试

```typescript
// 进程启动重试
FUNCTION spawnWithFallback(params) {
    retryCodes = params.retryCodes ?? ["EBADF"]  // 文件描述符错误
    attempts = [
        { options: baseOptions },
        ...fallbacks.map(fallback => ({
            label: fallback.label,
            options: { ...baseOptions, ...fallback.options }
        }))
    ]
    
    FOR index = 0 TO attempts.length - 1:
        TRY:
            child = await spawnAndWaitForSpawn(spawnImpl, params.argv, attempt.options)
            RETURN {
                child,
                usedFallback: index > 0,
                fallbackLabel: attempt.label
            }
        CATCH err:
            lastError = err
            nextFallback = fallbacks[index]
            
            // 判断错误是否可重试
            IF NOT nextFallback OR NOT shouldRetry(err, retryCodes):
                throw err
            
            params.onFallback?.(err, nextFallback)
    
    throw lastError
}
```

### 远程节点错误处理

```typescript
// 远程二进制探测错误处理
FUNCTION logRemoteBinProbeFailure(nodeId: string, err: unknown) {
    message = extractErrorMessage(err)
    label = describeNode(nodeId)
    
    // 分类处理不同错误
    IF message?.includes("node not connected") OR 
       message?.includes("node disconnected"):
        // 节点暂时不可用 - 预期内的错误
        log.info(`remote bin probe skipped: node unavailable (${label})`)
        RETURN
    
    IF message?.includes("invoke timed out") OR message?.includes("timeout"):
        // 超时错误 - 需要检查连接
        log.warn(`remote bin probe timed out (${label}); check node connectivity`)
        RETURN
    
    // 其他错误
    log.warn(`remote bin probe error (${label}): ${message ?? "unknown"}`)
}
```

---

## 开发规范与最佳实践

### 1. Skill 命名规范

```
✅ 推荐：
- github          # 简洁明了
- spotify-player  # 使用连字符
- apple-notes     # 平台前缀

❌ 避免：
- GitHub          # 大写字母
- spotify_player  # 下划线
- my_skill        # 冗余前缀
```

### 2. Description 编写规范

```
格式："[功能]。在[触发条件]时调用。"

✅ 推荐：
"管理 Spotify 播放。当用户提及音乐、播放列表、歌曲时调用。"
"GitHub CLI 集成。当用户提及 PR、Issue、仓库操作时调用。"

❌ 避免：
"这是一个 GitHub Skill。"  # 过于简单
"使用 gh 命令行工具。"      # 只描述实现
```

### 3. 依赖声明最佳实践

```json5
{
  "openclaw": {
    "requires": {
      // 必须全部存在的二进制文件
      "bins": ["gh", "git"],
      
      // 至少一个存在的二进制文件（提供替代方案）
      "anyBins": ["node", "bun", "deno"],
      
      // 必须设置的环境变量
      "env": ["GITHUB_TOKEN"],
      
      // 必须存在的配置路径
      "config": ["github.defaultRepo"]
    }
  }
}
```

### 4. 安装器配置最佳实践

```json5
{
  "openclaw": {
    "install": [
      // 为不同平台提供多个安装选项
      {
        "kind": "brew",
        "formula": "gh",
        "bins": ["gh"],
        "os": ["darwin", "linux"],
        "label": "macOS/Linux (Homebrew)"
      },
      {
        "kind": "download",
        "url": "https://.../gh_windows.zip",
        "archive": "zip",
        "extract": true,
        "bins": ["gh.exe"],
        "os": ["win32"],
        "label": "Windows (Download)"
      }
    ]
  }
}
```

### 5. 目录结构规范

```
skills/
└── my-skill/
    ├── SKILL.md              # 必需：Skill 定义
    ├── scripts/              # 可选：辅助脚本
    │   ├── setup.sh
    │   └── utils.js
    ├── references/           # 可选：参考资料
    │   └── api-docs.md
    └── assets/               # 可选：资源文件
        └── icon.png
```

### 6. 版本控制规范

```
✅ 推荐：
- 使用 Git 管理 Skill
- 提供清晰的 CHANGELOG.md
- 使用语义化版本（semver）
- 在 SKILL.md 中标注版本

❌ 避免：
- 提交敏感信息（API 密钥）
- 提交大型二进制文件
- 提交 node_modules/
```

### 7. 测试 checklist

```bash
# 1. 验证 SKILL.md 格式
# - YAML Frontmatter 格式正确
# - JSON5 元数据格式正确

# 2. 本地测试
# - 将 Skill 放入工作区的 skills/ 目录
# - 重启 OpenClaw 或等待热重载

# 3. 检查资格
# - 运行 /skills.status 查看 Skill 是否被加载
# - 检查依赖是否满足

# 4. 功能测试
# - 测试命令调用
# - 测试参数传递
# - 测试错误处理

# 5. 跨平台测试
# - 在不同平台上测试安装流程
# - 验证平台特定逻辑
```

### 8. 文档要求

```markdown
# Skill 名称

## 功能概述
简要描述 Skill 的功能和用途。

## 前置条件
- 必需的依赖（二进制文件、环境变量）
- 必需的配置
- 平台限制

## 安装方法
提供安装步骤或自动安装配置。

## 使用示例
提供具体的命令示例和预期输出。

## 注意事项
- 安全提示
- 已知限制
- 常见问题
- 故障排除

## 更新日志
记录版本变更历史。
```

---

## 开源标准规范

### 1. 项目结构标准

```
openclaw-skill-template/
├── README.md                 # 项目说明
├── LICENSE                   # 开源许可证
├── CHANGELOG.md              # 版本变更日志
├── CONTRIBUTING.md           # 贡献指南
├── skill/
│   └── SKILL.md              # Skill 定义文件
├── scripts/                  # 辅助脚本
│   ├── install.sh
│   └── test.sh
├── tests/                    # 测试文件
│   └── skill.test.js
├── docs/                     # 文档
│   └── api-reference.md
└── assets/                   # 资源文件
    └── icon.png
```

### 2. 开源许可证推荐

| 许可证 | 适用场景 |
|--------|----------|
| **MIT** | 最宽松，允许商业使用，推荐 |
| **Apache-2.0** | 提供专利保护，适合企业 |
| **GPL-3.0** | 强制开源衍生作品 |
| **BSD-3-Clause** | 简单宽松，保留版权声明 |

### 3. 代码质量标准

```
✅ 必须满足：
- 通过安全扫描（无 critical/high 级别警告）
- 提供完整的文档
- 包含使用示例
- 支持错误处理

✅ 推荐满足：
- 单元测试覆盖率 > 80%
- 提供 CI/CD 配置
- 支持多平台
- 国际化支持
```

### 4. 版本管理规范

```
语义化版本（Semantic Versioning）：MAJOR.MINOR.PATCH

- MAJOR：不兼容的 API 变更
- MINOR：向下兼容的功能添加
- PATCH：向下兼容的问题修复

示例：
- 1.0.0：初始稳定版本
- 1.1.0：添加新功能
- 1.1.1：修复 bug
- 2.0.0：破坏性变更
```

### 5. 发布流程

```
1. 更新版本号（package.json / SKILL.md）
      ↓
2. 更新 CHANGELOG.md
      ↓
3. 运行测试套件
      ↓
4. 创建 Git Tag
      ↓
5. 发布到 GitHub Releases
      ↓
6. 发布到 ClawHub（如适用）
      ↓
7. 更新文档网站
```

### 6. 贡献指南模板

```markdown
# 贡献指南

## 如何贡献

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交变更 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 开发规范

- 遵循现有代码风格
- 添加必要的测试
- 更新文档
- 通过安全扫描

## 报告问题

请使用 Issue 模板，包含：
- 问题描述
- 复现步骤
- 环境信息
- 错误日志
```

### 7. 文档标准

| 文档 | 必需 | 说明 |
|------|------|------|
| README.md | ✅ | 项目概述、安装、使用 |
| LICENSE | ✅ | 开源许可证 |
| CHANGELOG.md | ✅ | 版本变更历史 |
| CONTRIBUTING.md | ✅ | 贡献指南 |
| CODE_OF_CONDUCT.md | 推荐 | 行为准则 |
| SECURITY.md | 推荐 | 安全政策 |

---

## 未来发展方向

### 1. 智能化增强

- **语义技能发现**：利用大模型理解用户意图，自动匹配最合适的 Skill
- **智能参数提取**：使用 NLP 技术从自然语言中提取参数
- **上下文感知**：理解对话上下文，自动填充缺失参数

### 2. 性能优化

- **执行池**：维护预创建的执行环境，减少启动开销
- **智能缓存**：基于使用频率和内容的智能缓存策略
- **并行执行**：支持多个 Skill 并行执行

### 3. 安全增强

- **沙箱隔离**：使用容器技术实现更完善的沙箱隔离
- **权限管理**：基于角色的细粒度权限控制
- **安全审计**：完善的执行日志和审计机制

### 4. 生态建设

- **Skill 市场**：建立官方 Skill 市场
- **开发者工具**：提供 Skill 开发脚手架和调试工具
- **标准化**：推动 Skill 格式的行业标准

### 5. 多模态支持

- **语音交互**：支持语音命令调用 Skill
- **图像输入**：从图像中提取参数
- **富媒体输出**：支持图表、图片等富媒体结果

---

## 附录：类型定义参考

### SkillEntry

```typescript
interface SkillEntry {
  skill: Skill;                          // 基础 Skill 对象
  frontmatter: ParsedSkillFrontmatter;   // 解析后的 frontmatter
  metadata?: OpenClawSkillMetadata;      // OpenClaw 扩展元数据
  invocation?: SkillInvocationPolicy;    // 调用策略
}
```

### OpenClawSkillMetadata

```typescript
interface OpenClawSkillMetadata {
  always?: boolean;                      // 始终包含
  skillKey?: string;                     // 配置键
  primaryEnv?: string;                   // 主环境变量名
  emoji?: string;                        // 表情符号
  homepage?: string;                     // 主页
  os?: string[];                         // 支持的平台
  requires?: {
    bins?: string[];                     // 必需的二进制文件
    anyBins?: string[];                  // 任一必需的二进制文件
    env?: string[];                      // 必需的环境变量
    config?: string[];                   // 必需的配置路径
  };
  install?: SkillInstallSpec[];          // 安装规范
}
```

### SkillInstallSpec

```typescript
interface SkillInstallSpec {
  id?: string;                           // 安装器 ID
  kind: "brew" | "node" | "go" | "uv" | "download";
  label?: string;                        // 显示标签
  bins?: string[];                       // 提供的二进制文件
  os?: string[];                         // 支持的平台
  formula?: string;                      // brew 公式名
  package?: string;                      // npm 包名
  module?: string;                       // Go 模块路径
  url?: string;                          // 下载 URL
  archive?: string;                      // 归档类型
  extract?: boolean;                     // 是否解压
  stripComponents?: number;              // 去掉的目录层级
  targetDir?: string;                    // 目标目录
}
```

### SkillInvocationPolicy

```typescript
interface SkillInvocationPolicy {
  userInvocable?: boolean;               // 用户是否可直接调用
  modelInvocable?: boolean;              // 模型是否可自动调用
  dispatch?: SkillCommandDispatchSpec;   // 分发配置
}
```

---

## 技术架构总结

### 核心设计模式

| 模式 | 应用场景 | 实现文件 |
|------|----------|----------|
| **策略模式** | 安装命令构建 | `skills-install.ts` |
| **观察者模式** | Skill 变更监听 | `refresh.ts` |
| **责任链模式** | 资格检查链 | `config.ts` |
| **享元模式** | Skill 快照缓存 | `workspace.ts` |
| **桥接模式** | 信号转发 | `child-process-bridge.ts` |

### 性能优化要点

1. **缓存层次化**：快照缓存 -> 远程节点缓存 -> 内置 Skill 缓存
2. **懒加载策略**：按需加载 Skill 条目和快照
3. **防抖处理**：文件变更防抖(250ms)，配置重载防抖(300ms)
4. **序列化控制**：基于 Promise 链的队列避免竞态条件

### 安全机制

1. **代码扫描**：安装前扫描危险代码模式
2. **沙箱隔离**：Skill 在工作区沙箱中执行
3. **权限检查**：二进制、环境变量、配置的多层验证
4. **信号隔离**：父子进程信号桥接确保优雅关闭

---

## 总结

OpenClaw 的 Skill 系统是一个设计精良、功能强大的扩展机制：

1. **声明式定义**：通过 `SKILL.md` 简洁地定义 Skill 功能
2. **智能加载**：多源合并、条件过滤、资格判定
3. **安全优先**：安装前扫描、危险代码检测、执行时权限控制
4. **灵活配置**：支持环境变量注入、远程执行、多层次缓存
5. **生态完善**：ClawHub 提供技能搜索、安装、发布功能
6. **开源标准**：遵循开源最佳实践，提供完整的开发和发布规范
7. **开发友好**：热重载、清晰的错误提示、完善的开发规范
8. **并发安全**：基于 Promise 链的序列化队列、单次执行保证
9. **容错设计**：指数退避重试、分层错误处理、优雅降级

遵循本规范，开发者可以创建高质量、安全可靠的 Skill，扩展 OpenClaw 的能力边界，为用户提供更丰富的 AI 助手体验。

---

## 参考资源

- **OpenClaw 核心执行源码**：`src/node-host/runner.ts`
- **执行权限管理**：`src/infra/exec-approvals.ts`
- **执行主机通信**：`src/infra/exec-host.ts`
- **Gateway 客户端**：`src/gateway/client.ts`
- **技能 CLI 工具**：`src/cli/skills-cli.ts`
- **ClawHub 文档**：`docs/tools/clawhub.md`
- **Agent Skills 规范**：https://agentskills.io/specification
- **ClawHub 网站**：https://clawhub.ai
- **语义化版本规范**：https://semver.org/
- **开源许可证选择**：https://choosealicense.com/

---

*文档版本：4.0*
*最后更新：2026-02-11*
