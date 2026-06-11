# Trellis-ivy 源码改造审计报告

> 审计时间: 2026-06-11
> 基线版本: mindfold-ai/Trellis v0.6.0-beta.22
> 改造范围: fork 后 21 个 commit 的源码修改

---

## 一、项目定位

本项目是 `mindfold-ai/Trellis` 的 **fork 分支**，在 Trellis 源码基础上进行二次开发，而非用其他工具替代 Trellis。原始 Trellis 开发者同时也在使用 Trellis 进行项目迭代，本分支的改造与上游保持兼容。

| 维度 | 说明 |
|------|------|
| **仓库** | `ssffpt/Trellis-ivy`，fork 自 `mindfold-ai/Trellis` |
| **基线** | v0.6.0-beta.22（1140 commits） |
| **改造量** | 21 commits，涉及 134 个文件，+3880 / -2244 行 |
| **核心改动** | 包名重命名、全面中文化、新增门禁体系（3 agent + 2 checklist）、平台适配器扩展 |

---

## 二、改造内容

### 2.1 包名重命名

`@liushuang/trellis` → `trellis-ivy`，涉及所有 package.json、迁移 manifest、测试用例、README、CONTRIBUTING 等文件中的旧包名引用。

### 2.2 全面中文化

所有 agent 模板、skill、command、spec、workflow 文档翻译为中文。覆盖 11 个平台的 agent 模板。

### 2.3 门禁体系（核心架构变更）

原始 Trellis 的 check 机制是"边审边改"，改造为**纯对抗审查**模式：3 个 agent 全部只审不改。

```
PRD 完成 → [前提挑战] → [PRD门禁审核] → 实施 → [代码门禁审查]
            agent:         agent:          agent:
        premise-challenger  trellis-review  trellis-check
```

| Agent | 职责 | 触发时机 | 输出物 | 轮次上限 |
|-------|------|---------|--------|---------|
| **trellis-premise-challenger** | 从外部质疑方案必要性（不审内部质量） | PRD 初稿后、review 前 | `premise-challenges.md` | 1 轮 |
| **trellis-review** | PRD/Design 质量审核（5 维度） | 前提挑战回应后 | `review.md` | 3 轮 |
| **trellis-check** | 代码变更对抗审查（6 维度） | implement 完成后 | `check-report.md` | 3 轮 |

**check-checklist（6 维度代码审查）**：

1. **功能正确性** — 验收标准覆盖、技术契约合规、边界处理
2. **回归安全** — 调用方验证、现有测试通过、接口签名影响
3. **安全基线** — 输入验证、注入风险、敏感数据、权限控制
4. **跨层一致性** — 类型传播、错误传播、数据流方向、循环依赖
5. **性能影响** — N+1 查询、循环内重复 IO、大集合分页
6. **规范合规** — spec 遵循、命名一致、debug 残留

支持 `check_depth: "light"` 模式（仅维度 1+6），用于轻量任务。

**review-checklist（5 维度 PRD 审核）**：

1. **完整性与可测试性** — 验收标准可验证、无模糊描述
2. **一致性与优先级** — 需求矛盾、优先级标注、术语一致
3. **可行性与证据链** — 技术假设有依据、外部条件已确认
4. **范围控制与边界** — MVP 合理、无隐含需求
5. **前提挑战回应**（条件维度）— 每条质疑有明确回应

**审查流程闭环**：

```
trellis-implement → trellis-check → [CHML清单] → trellis-implement修复 → trellis-check重审
                                         ↓ (零C零H零M)
                                        [放行] → Phase 3
                                         ↓ (3轮未解决)
                                      [超出轮次上限] → 暂停请用户决策
```

### 2.4 Workflow 改造

**新增步骤**：

| 步骤 | 说明 | 条件 |
|------|------|------|
| **1.15 Premise Challenge** | 派发前提挑战 agent，brainstorm 逐条回应 | 复杂任务专属 |
| **1.5 Worktree** | 可选的 git worktree 隔离模式 | 用户同意时开启 |
| **任务创建同意** | 显式询问用户 "May I create a Trellis task?" | 强制 |

**三文件结构**（复杂任务）：
- `prd.md` — 需求、约束、验收标准
- `design.md` — 技术设计（边界、契约、数据流、权衡）
- `implement.md` — 执行计划（有序 checklist、验证命令、审查门禁）

轻量任务可以 PRD-only。

**Commit 重设计**（Phase 3.4）：
批量提交计划模式 — 分类脏文件 → 分组为逻辑提交 → 一次性展示计划 → 用户确认后执行。禁止 `git commit --amend`。

### 2.5 平台适配器扩展

`packages/cli/src/configurators/shared.ts` 新增：

1. **AGENT_FRONTMATTER** — 为 trellis-review、trellis-premise-challenger、trellis-check 注入平台特定的 frontmatter（description、tools、permission）
2. **check/checklist 内联机制** — `{{CHECK_CHECKLIST}}` 和 `{{REVIEW_CHECKLIST}}` 占位符在 `resolveAgents()` 时被内联替换
3. **Pull-based prelude** — 为 class-2 平台（gemini/qoder/copilot）的 implement/check agent 注入上下文加载指引

---

## 三、平台 Agent 覆盖矩阵

基于构建流水线实际输出（common agent 注入 + 平台特定模板）：

| 平台 | check | implement | research | review | premise-challenger | 覆盖率 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| Claude | ✅ common | ✅ platform | ✅ platform | ✅ common | ✅ common | 5/5 |
| Cursor | ✅ common | ✅ platform | ✅ platform | ✅ common | ✅ common | 5/5 |
| Copilot | ✅ common | ✅ cursor平台 | ✅ cursor平台 | ✅ common | ✅ common | 5/5 |
| OpenCode | ✅ common | ✅ platform | ✅ platform | ✅ common | ✅ common | 5/5 |
| Gemini | ✅ common | ✅ platform | ✅ platform | ✅ common | ✅ common | 5/5 |
| Qoder | ✅ common | ✅ platform | ✅ platform | ✅ common | ✅ common | 5/5 |
| CodeBuddy | ✅ common | ✅ platform | ✅ platform | ✅ common | ✅ common | 5/5 |
| Pi | ✅ platform | ✅ platform | ✅ platform | ✅ platform（自定义） | ❌ 缺失 | 4/5 |
| Codex | ✅ platform | ✅ platform | ✅ platform | ❌ 缺失 | ❌ 缺失 | 3/5 |
| Droid | ✅ platform | ✅ platform | ✅ platform | ❌ 缺失 | ❌ 缺失 | 3/5 |
| Kiro | ✅ platform | ✅ platform | ✅ platform | ❌ 缺失 | ❌ 缺失 | 3/5 |

> "common" 表示由 `resolveAgents()` 从 `common/agents/` 统一注入，"platform" 表示平台特定模板目录下的文件。

---

## 四、已知问题

### 4.1 严重问题

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | **trellis-review / premise-challenger 在 class-2 平台缺少上下文加载** | 高 | `detectSubAgentType()` 只为 implement/check 生成 pull-based prelude。review 和 premise-challenger 在 gemini/qoder/copilot 等平台无法定位 `$TASK_DIR/prd.md`，导致门禁 agent 读不到任务产物。 |
| 2 | **trellis-review 分配了 Edit 工具但角色是只读** | 中 | `AGENT_FRONTMATTER` 中 trellis-review 的 tools 包含 `Edit`，但 agent body 明确禁止修改 prd.md/design.md/implement.md。Edit 工具的存在与只读角色矛盾，可能误触。trellis-premise-challenger 正确地未分配 Edit。 |

### 4.2 中等问题

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 3 | **PRD 门禁（trellis-review）未在 workflow 中强制** | 中 | workflow.md 的 Phase 1 流程中，review agent 只在 "Active Task Routing" 中提到，没有作为 Phase 1 的必选步骤写入 phase walkthrough。 |
| 4 | **Codex/Droid/Kiro 平台 agent 覆盖不完整** | 中 | 这 3 个平台缺少 trellis-review 和/或 premise-challenger 的适配。 |
| 5 | **trellis-review 产物格式示例只展示 4 维度** | 中 | agent body 中的 `review.md` 输出示例表格只列了 4 个维度，缺少第 5 维度（前提挑战回应），可能误导 agent 输出不完整。 |

### 4.3 低风险问题

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 6 | **三轮上限硬编码** | 低 | check 和 review 的轮次上限（3 轮）写死在 agent 模板里，无法通过配置调整。 |
| 7 | **worktree 功能依赖 git worktree** | 低 | 需要 git 2.5+，Windows 上偶尔有路径问题。 |
| 8 | **implement.md 历史反复** | 低 | commit 历史显示 "合并 design.md/implement.md 到 prd.md" 后又 "恢复三文件结构"，说明这个决策曾有摇摆。 |
| 9 | **AGENT_FRONTMATTER 与 common agent 模板隐式耦合** | 低 | 新增 common agent 时必须同步更新 AGENT_FRONTMATTER，否则 `wrapWithAgentFrontmatter()` 会抛错。耦合在运行时才发现，无编译期保护。 |
| 10 | **check agent 的 {{CHECK_CHECKLIST}} 位置突兀** | 低 | 占位符出现在"独立对抗原则"和"审查流程"之间，无过渡文本，内联后结构略显生硬。 |

---

## 五、源码干净度

### 5.1 混入源码的用户数据

以下文件是 Trellis 工作流运行时产生的用户数据，被 tracked 进了 git：

| 文件 | 说明 |
|------|------|
| `.trellis/tasks/06-09-worktree-mode/` | 用户任务产物（prd.md、task.json、jsonl） |
| `.trellis/workspace/ivy/` | 用户 journal 和 index |

这些文件不应出现在 Trellis 源码仓库中。建议：
- 将 `.trellis/tasks/` 和 `.trellis/workspace/` 加入根 `.gitignore`
- 或在 `.trellis/.gitignore` 中排除（当前只排除了 `.developer`、`.current-task`、`.runtime/`）

### 5.2 原始 Trellis 源码保留情况

fork 前的 1140 个 commit 完整保留。21 个改造 commit 的修改范围：
- `packages/cli/src/configurators/shared.ts` — +235 行（AGENT_FRONTMATTER、checklist 内联、pull-based prelude）
- `packages/cli/src/templates/common/agents/` — 5 个新文件（trellis-check、trellis-review、trellis-premise-challenger、check-checklist、review-checklist）
- `packages/cli/src/templates/*/agents/` — 各平台 trellis-check 模板修改
- `packages/cli/src/templates/common/skills/` — brainstorm、check、update-spec、break-loop 中文化
- `.trellis/agents/premise-challenger.md` — 新增前提挑战 agent 定义
- `.trellis/workflow.md` — 新增 1.15/1.5 步骤、三文件结构、批量提交
- 各平台 agent 模板 — 中文化

---

## 六、建议优先修复

1. **修复 #1（高）**：为 trellis-review 和 trellis-premise-challenger 在 class-2 平台添加 pull-based prelude，或在 dispatch prompt 中显式注入 `$TASK_DIR` 路径
2. **修复 #2（中）**：从 trellis-review 的 AGENT_FRONTMATTER tools 中移除 Edit
3. **修复 #3（中）**：将 trellis-review 写入 workflow.md Phase 1 的强制步骤
4. **修复 #5（中）**：更新 trellis-review agent body 中的产物格式示例，补全第 5 维度
5. **清理 #5.1（低）**：将 `.trellis/tasks/` 和 `.trellis/workspace/` 加入 gitignore
6. **补全 #4（中）**：为 Codex/Droid/Kiro 补全 review 和 premise-challenger agent
