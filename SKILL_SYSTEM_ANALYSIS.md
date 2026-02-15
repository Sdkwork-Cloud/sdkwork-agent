# Skill 系统最佳实践分析报告

## 📊 三款行业最佳工具对比分析

### 1. Codex (Rust) - 渐进式披露 (Progressive Disclosure)

**核心文件**: `codex/codex-rs/core/src/skills/render.rs`

#### 关键特性：

```rust
// 渐进式披露 5 步法：
// 1. 决定使用技能后，打开其 SKILL.md。只读取足够的内容来遵循工作流。
// 2. 当 SKILL.md 引用相对路径（如 scripts/foo.py）时，优先相对于技能目录解析
// 3. 如果 SKILL.md 指向额外文件夹（如 references/），只加载请求需要的特定文件；不批量加载所有内容
// 4. 如果 scripts/ 存在，优先运行或补丁它们，而不是重新输入大代码块
// 5. 如果 assets/ 或模板存在，重用它们而不是从头创建
```

#### 优先级原则：
- **上下文卫生**: 保持上下文小，总结长段而不是粘贴
- **避免深度引用追踪**: 只打开直接从 SKILL.md 链接的文件
- **变体选择**: 当存在变体（框架、提供者、域）时，只选择相关的参考文件

---

### 2. OpenClaw (TypeScript) - 多源加载系统

**核心文件**: `openclaw/src/agents/skills/workspace.ts`

#### 加载优先级（数字越大优先级越高）：

```typescript
const SOURCE_PRIORITY: Record<SkillSource, number> = {
  'openclaw-extra': 0,        // 最低优先级
  'openclaw-bundled': 1,
  'openclaw-managed': 2,
  'agents-skills-personal': 3,
  'agents-skills-project': 4,
  'openclaw-workspace': 5,     // 最高优先级
};
```

#### 加载来源：
1. **extra**: 额外目录（配置指定）
2. **bundled**: 内置技能
3. **managed**: 用户级技能 (~/.openclaw/skills)
4. **agents-skills-personal**: 个人 Agent 技能 (~/.agents/skills)
5. **agents-skills-project**: 项目 Agent 技能 (./.agents/skills)
6. **workspace**: 工作区技能 (./.openclaw/skills)

---

### 3. OpenCode (TypeScript) - 外部目录扫描

**核心文件**: `opencode/packages/opencode/src/skill/skill.ts`

#### 扫描目录：

```typescript
const EXTERNAL_DIRS = [".claude", ".agents"];
const EXTERNAL_SKILL_GLOB = new Bun.Glob("skills/**/SKILL.md");
const OPENCODE_SKILL_GLOB = new Bun.Glob("{skill,skills}/**/SKILL.md");
```

#### 扫描顺序：
1. **全局扫描**: 先加载用户目录 (~/.claude/skills, ~/.agents/skills)
2. **项目级扫描**: 再加载项目目录 (./.claude/skills, ././agents/skills)
3. **配置路径**: 扫描配置文件中指定的额外技能路径
4. **URL 拉取**: 从 URL 下载和加载技能

---

## 🎯 完美 Skill 系统架构设计

### 核心特性整合：

| 特性 | Codex | OpenClaw | OpenCode | 我们的实现 |
|------|-------|----------|----------|-----------|
| 渐进式披露 | ✅ | ⚠️ | ⚠️ | ✅ |
| 动态按需加载 | ✅ | ✅ | ⚠️ | ✅ |
| 多源加载 | ⚠️ | ✅ | ✅ | ✅ |
| 外部资源加载 | ✅ | ⚠️ | ⚠️ | ✅ |
| 命令规范系统 | ⚠️ | ✅ | ✅ | ✅ |
| 热重载 | ⚠️ | ✅ | ✅ | ✅ |
| 缓存策略 | ✅ | ✅ | ✅ | ✅ |

---

## 📝 最终优化方案

### 1. Skill 加载器 (`skill-loader.ts`)

**已实现的特性**：
- ✅ 渐进式披露（懒加载）
- ✅ 动态按需加载
- ✅ 外部资源自动加载（三种方式）
- ✅ 多级缓存策略
- ✅ 内容哈希验证

### 2. TUI 模块优化

待优化方向：
- 视觉效果完美
- 用户体验完美
- 功能完整性

---

## 🚀 使用示例

### 方式一：传统全量加载
```typescript
import { loadAllSkills } from '@sdkwork/agent/skills';

const { skills, stats } = await loadAllSkills();
```

### 方式二：动态按需加载（推荐）
```typescript
import { 
  scanLazySkills, 
  loadSkillLazy,
  loadSkillByNameLazy,
  getLazyLoadStats 
} from '@sdkwork/agent/skills';

// 1. 先扫描所有技能元数据（快速！只解析 frontmatter）
const entries = await scanLazySkills();
console.log(`Discovered ${entries.length} skills`);

// 2. 真正使用时才加载完整技能
const skill = await loadSkillByNameLazy('my-skill');

// 3. 获取统计信息
const stats = getLazyLoadStats();
console.log(`Loaded: ${stats.loadedEntries}/${stats.totalEntries}`);
```

### 方式三：外部资源使用
```typescript
// 在 Skill 脚本中访问加载的外部资源
const guide = $ref('guide.md');
const helper = $references['helper.js'];
const data = $references['config.json'];
```

---

## 📚 参考文档

- [Codex Skill System](codex/codex-rs/core/src/skills/)
- [OpenClaw Skill System](openclaw/src/agents/skills/)
- [OpenCode Skill System](opencode/packages/opencode/src/skill/)
