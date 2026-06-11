# 开发工作流

---

## 核心原则

1. **先规划再编码** — 开始前先理清要做什么
2. **规范注入而非记忆** — 准则通过 hook/skill 注入，而非从记忆中回忆
3. **持久化一切** — 研究、决策和经验都写入文件；对话会被压缩，文件不会
4. **增量开发** — 一次一个任务
5. **捕获经验** — 每个任务完成后，回顾并将新知识写回规范

---

## Trellis 系统

### 开发者身份

首次使用时，初始化你的身份：

```bash
python3 ./.trellis/scripts/init_developer.py <your-name>
```

创建 `.trellis/.developer`（gitignore）和 `.trellis/workspace/<your-name>/`。

### 规范系统

`.trellis/spec/` 存放按包和层组织的编码准则。

- `.trellis/spec/<package>/<layer>/index.md` — 入口文件，包含**开发前检查清单**和**质量检查**。实际准则在其指向的 `.md` 文件中。
- `.trellis/spec/guides/index.md` — 跨包思维指南。

```bash
python3 ./.trellis/scripts/get_context.py --mode packages   # 列出包/层
```

**何时更新规范**：发现新模式/约定 · 需要固化 bug 修复预防措施 · 新技术决策。

### 任务系统

每个任务在 `.trellis/tasks/{MM-DD-name}/` 下有自己的目录，包含 `task.json`、`prd.md`、可选的 `research/`，以及用于支持子代理平台的上下文清单（`implement.jsonl`、`check.jsonl`）。

```bash
# 任务生命周期
python3 ./.trellis/scripts/task.py create "<title>" [--slug <name>] [--parent <dir>]
python3 ./.trellis/scripts/task.py start <name>          # 设置活跃任务（会话级，可用时）
python3 ./.trellis/scripts/task.py current --source      # 显示活跃任务和来源
python3 ./.trellis/scripts/task.py finish                # 清除活跃任务（触发 after_finish 钩子）
python3 ./.trellis/scripts/task.py archive <name>        # 移动到 archive/{year-month}/
python3 ./.trellis/scripts/task.py list [--mine] [--status <s>]
python3 ./.trellis/scripts/task.py list-archive

# 代码规范上下文（通过 JSONL 注入到 implement/check 代理）。
# `implement.jsonl` / `check.jsonl` 在 `task create` 时为支持子代理的平台初始化；
# AI 在规划期间按需整理实际的规范和研究条目。
python3 ./.trellis/scripts/task.py add-context <name> <action> <file> <reason>
python3 ./.trellis/scripts/task.py list-context <name> [action]
python3 ./.trellis/scripts/task.py validate <name>

# 任务元数据
python3 ./.trellis/scripts/task.py set-branch <name> <branch>
python3 ./.trellis/scripts/task.py set-base-branch <name> <branch>    # PR 目标
python3 ./.trellis/scripts/task.py set-scope <name> <scope>

# 层级结构（父/子）
python3 ./.trellis/scripts/task.py add-subtask <parent> <child>
python3 ./.trellis/scripts/task.py remove-subtask <parent> <child>

# PR 创建
python3 ./.trellis/scripts/task.py create-pr [name] [--dry-run]
```

> 运行 `python3 ./.trellis/scripts/task.py --help` 查看权威、最新的命令列表。

**当前任务机制**：`task.py create` 创建任务目录，并在会话身份可用时自动设置每会话的活跃任务指针，使规划面包屑立即生效。`task.py start` 写入相同的指针（如果已设置则幂等）并将 `task.json.status` 从 `planning` 翻转为 `in_progress`。状态存储在 `.trellis/.runtime/sessions/` 下。如果没有来自 hook 输入的上下文键、`TRELLIS_CONTEXT_ID` 或平台原生会话环境变量，则没有活跃任务，`task.py start` 会失败并提示会话身份信息。`task.py finish` 删除当前会话文件（状态不变）。`task.py archive <task>` 写入 `status=completed`，将目录移动到 `archive/`，并删除仍指向已归档任务的运行时会话文件。

### 工作空间系统

在 `.trellis/workspace/<developer>/` 下记录每个 AI 会话，用于跨会话跟踪。

- `journal-N.md` — 会话日志。**每个文件最多 2000 行**；超出时自动创建新的 `journal-(N+1).md`。
- `index.md` — 个人索引（总会话数、最后活跃时间）。

```bash
python3 ./.trellis/scripts/add_session.py --title "Title" --commit "hash" --summary "Summary"
```

### 上下文脚本

```bash
python3 ./.trellis/scripts/get_context.py                            # 完整会话运行时
python3 ./.trellis/scripts/get_context.py --mode packages            # 可用包 + 规范层
python3 ./.trellis/scripts/get_context.py --mode phase --step <X.Y>  # 工作流步骤的详细指南
```

---

<!--
  工作流状态面包屑契约（编辑下方标签块前请先阅读此部分）

  嵌入在 ## 阶段索引 部分中的 [workflow-state:STATUS] 块是每个支持的
  AI 平台的 UserPromptSubmit hook 读取的每轮 `<workflow-state>` 面包屑的
  唯一真实来源。inject-workflow-state.py（Python 平台）和
  inject-workflow-state.js（OpenCode 插件）仅解析它们——自 v0.5.0-rc.0 之后
  脚本中没有内置的回退字典。

  STATUS 字符集：[A-Za-z0-9_-]+。当 hook 找不到标签时，会降级为通用的
  "Refer to workflow.md for current step." 行——故意可见，以便用户注意到
  并修复损坏的 workflow.md。

  不变量（test/regression.test.ts）：
    每个标记为 `[required · once]` 的工作流通关步骤必须在其阶段的
    [workflow-state:*] 块中有匹配的强制执行行。面包屑是唯一的每轮通道；
    如果强制步骤未在那里提及，AI 会静默跳过它（Phase 1 规划门禁跳过和
    Phase 3.3 提交跳过都是通过这个间隙表现出来的）。

  标签 ↔ 阶段作用域：
    [workflow-state:no_task]      → 无活跃任务；Phase 1 之前
    [workflow-state:planning]     → Phase 1 全部（status='planning'）
    [workflow-state:planning-inline] → Phase 1 的 Codex 内联变体
    [workflow-state:in_progress]  → Phase 2 + Phase 3.1-3.4
                                    （从 task.py start 到 task.py archive
                                    期间 status 保持 'in_progress'）
    [workflow-state:in_progress-inline] → Phase 2/3 的 Codex 内联变体
    [workflow-state:completed]    → 当前已废弃：cmd_archive 在同一调用中
                                    翻转 status 并移动目录，因此解析器
                                    会丢失指针（保留此块用于未来
                                    显式的 in_progress→completed 转换）

  编辑检查清单：
    - 当你更改 [workflow-state:STATUS] 块时，同时检查匹配阶段的
      `[required · once]` 通关步骤以确保同步
    - 编辑后运行 `trellis update` 将新内容推送到下游用户项目
      （块级管理替换）
    - 完整运行时契约：
      .trellis/spec/cli/backend/workflow-state-contract.md
-->

## 阶段索引

```
Phase 1: 规划    → 分类、获取任务创建同意，然后编写规划工件
Phase 2: 执行    → 仅在任务状态为 in_progress 后实施
Phase 3: 完成    → 验证、更新规范、提交并收尾
```

### 请求分类

- 简单对话或小任务：仅询问本轮是否应创建 Trellis 任务。如果用户说否，则本次会话跳过 Trellis。
- 复杂任务：询问是否可以创建 Trellis 任务并进入规划。如果用户说否，不要进行广泛的内联实现；解释、澄清范围或建议更小的拆分。
- 用户同意创建任务不等于同意开始实现。规划仍然先进行。

### 规划工件

- `prd.md` — 需求、约束、验收标准。
- `implement.jsonl` / `check.jsonl` — 子代理上下文的规范和研究清单。

### 父/子任务树

当一个用户请求包含多个可独立验证的交付物时使用父任务。父任务拥有源需求集、任务映射、跨子任务验收标准和最终集成审查；通常不应作为实现目标，除非它也有直接工作。

子任务用于可独立规划、实现、检查和归档的交付物。父/子结构不是依赖系统：如果子任务 B 必须等待子任务 A，请在子任务 B 的 `prd.md` 中写明该顺序，并保持每个子任务的验收标准可测试。

使用 `task.py create "<title>" --slug <name> --parent <parent-dir>` 创建新子任务。使用 `task.py add-subtask <parent> <child>` 链接现有任务，使用 `task.py remove-subtask <parent> <child>` 取消链接错误。

<!-- 每轮面包屑：当没有活跃任务时显示（Phase 1 之前） -->

[workflow-state:no_task]
No active task. First classify the current turn and ask for task-creation consent before creating any Trellis task.
Simple conversation / small task: ask only whether this turn should create a Trellis task. If the user says no, skip Trellis for this session.
Complex task: ask the user if you can create a Trellis task and enter the planning phase. If the user says no, explain, clarify scope, or suggest a smaller split.
[/workflow-state:no_task]

### Phase 1: 规划
- 1.0 创建任务 `[required · once]`（仅在获得任务创建同意后）
- 1.1 需求探索 `[required · repeatable]`（`prd.md`）
- 1.2 研究 `[optional · repeatable]`
- 1.3 配置上下文 `[conditional · once]` — Claude Code、Cursor、OpenCode、Codex、Kiro、Gemini、Qoder、CodeBuddy、Copilot、Droid、Pi
- 1.4 激活任务 `[required · once]`（审查门禁，然后 `task.py start`；status → in_progress）
- 1.5 完成标准

<!-- 每轮面包屑：Phase 1 期间显示（status='planning'） -->

[workflow-state:planning]
Load `trellis-brainstorm`; stay in planning.
Finish `prd.md`; ask for review before `task.py start`.
Multi-deliverable scope: consider a parent task plus independently verifiable child tasks; dependencies must be written in child artifacts, not implied by tree position.
Sub-agent mode: curate `implement.jsonl` and `check.jsonl` as spec/research manifests before start.
[/workflow-state:planning]

<!-- 每轮面包屑：当 codex.dispatch_mode=inline 时在 Phase 1 期间显示。
     Codex 专用的 [workflow-state:planning] 替代方案。主代理在 Phase 2 中
     直接编辑代码，因此跳过 jsonl 整理——内联工作流通过 `trellis-before-dev`
     加载工件/规范，而非注入 JSONL 到子代理。 -->

[workflow-state:planning-inline]
Load `trellis-brainstorm`; stay in planning.
Finish `prd.md`; ask for review before `task.py start`.
Multi-deliverable scope: consider a parent task plus independently verifiable child tasks; dependencies must be written in child artifacts, not implied by tree position.
Inline mode: skip jsonl curation; Phase 2 reads artifacts/specs via `trellis-before-dev`.
[/workflow-state:planning-inline]

### Phase 2: 执行
- 2.1 实现 `[required · repeatable]`
- 2.2 质量检查 `[required · repeatable]`
- 2.3 修复循环 `[required · repeatable]`
- 2.4 回滚 `[on demand]`

<!-- 每轮面包屑：当 status='in_progress' 时显示。
     范围：Phase 2 + Phase 3 全部（从 task.py start 到 task.py archive
     期间 status 保持 'in_progress'；只有 archive 会翻转它）。因此内容必须
     涵盖从实现到提交的每个必需步骤，包括 Phase 3.2 规范更新和 Phase 3.3 提交。 -->

子代理调度协议适用于所有平台和所有子代理，包括 class-2 Codex/Copilot/Gemini/Qoder 和 `trellis-research`：每个调度提示都以 `Active task: <task path from task.py current>` 开头，然后是角色特定指令。

[workflow-state:in_progress]
Tools: `trellis-implement` / `trellis-research` are sub-agent types only (Task/Agent tool, NOT Skill; there is no skill by these names). `trellis-update-spec` is a skill. `trellis-check` exists as both; prefer the Agent form when verifying after code changes.
Flow: `trellis-implement` -> `trellis-check` -> fix loop (check has C/H/M → update `fix-context.md` → `trellis-implement` → `trellis-check`, max 3 auto rounds) -> `trellis-update-spec` -> commit (Phase 3.3) -> `/trellis:finish-work`.
Main-session default: dispatch implement/check sub-agents. Main session maintains `fix-context.md` as cross-round memory for the fix loop. Sub-agent self-exemption: if already running as `trellis-implement`, do NOT spawn another `trellis-implement` or `trellis-check`; if already running as `trellis-check`, do NOT spawn another `trellis-check` or `trellis-implement`. Dispatch is main session only.
Dispatch prompt starts with `Active task: <task path from task.py current>`. Read context: jsonl entries -> `prd.md` -> `fix-context.md` (if exists).
[/workflow-state:in_progress]

<!-- 每轮面包屑：当 status='in_progress' 且 codex.dispatch_mode=inline 时显示。
     Codex 专用的 [workflow-state:in_progress] 替代方案。主会话直接编辑代码
     而非调度子代理。 -->

[workflow-state:in_progress-inline]
Flow: `trellis-before-dev` -> edit -> `trellis-check` -> validation -> `trellis-update-spec` -> commit (Phase 3.3) -> `/trellis:finish-work`.
Do not dispatch implement/check sub-agents in inline mode.
Read context: `prd.md`, plus relevant spec/research loaded by skills.
[/workflow-state:in_progress-inline]

### Phase 3: 完成
- 3.1 调试回顾 `[on demand]`
- 3.2 规范更新 `[required · once]`
- 3.3 提交变更 `[required · once]`
- 3.4 收尾提醒

<!-- 每轮面包屑：当 status='completed' 时显示。
     当前在正常流程中已废弃：cmd_archive 在同一调用中写入 status='completed'
     并将任务目录移动到 archive/，因此活跃任务解析器会丢失指针，hook 不会
     对已归档任务触发。保留此块用于未来的状态转换重新设计（例如显式的
     in_progress→completed 命令）。通过与活跃块相同的规范通道编辑。 -->

[workflow-state:completed]
Code committed. Run `/trellis:finish-work`; if dirty, return to Phase 3.3 first.
[/workflow-state:completed]

### 规则

1. 确定你当前所在的 Phase，然后从该阶段的下一步继续
2. 在每个 Phase 内按顺序执行步骤；`[required]` 步骤不可跳过
3. 阶段可以回滚（例如，执行阶段发现 prd 缺陷 → 返回规划阶段修复，然后重新进入执行阶段）
4. 标记为 `[once]` 的步骤，如果输出已存在则跳过；不要重复运行
5. 工件存在情况决定下一步；缺失的工件表明规划不完整。

### 活跃任务路由

当用户请求在活跃任务中匹配以下意图之一时，先路由，然后按需加载详细的阶段步骤。

[Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

- 规划或需求不明确 → `trellis-brainstorm`。
- `in_progress` 实现/检查 → 调度 `trellis-implement` / `trellis-check`。
- 反复调试 → `trellis-break-loop`；规范更新 → `trellis-update-spec`。

[/Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

[codex-inline, Kilo, Antigravity, Windsurf]

- 规划或需求不明确 → `trellis-brainstorm`。
- 编辑前 → `trellis-before-dev`；编辑后 → `trellis-check`。
- 反复调试 → `trellis-break-loop`；规范更新 → `trellis-update-spec`。

[/codex-inline, Kilo, Antigravity, Windsurf]

### 护栏

- 任务创建同意不等于实现同意；实现在工件审查后的 `task.py start` 之后才开始。
- 规划必须持久化到任务工件；检查必须在报告完成之前运行。

### 加载步骤详情

在每个步骤中，运行以下命令获取详细指导：

```bash
python3 ./.trellis/scripts/get_context.py --mode phase --step <step>
# 例如 python3 ./.trellis/scripts/get_context.py --mode phase --step 1.1
```

---

## Phase 1: 规划

目标：对请求进行分类，在需要任务时获取任务创建同意，并生成实现前所需的规划工件。

#### 1.0 创建任务 `[required · once]`

仅在获得任务创建同意后创建任务目录。该命令将状态设置为 `planning`，写入 `task.json`，创建默认的 `prd.md`，并在会话身份可用时自动定位新任务：

```bash
python3 ./.trellis/scripts/task.py create "<task title>" --slug <name>
```

`--slug` 仅是人类可读的名称。**不要**包含 `MM-DD-` 日期前缀；`task.py create` 会自动添加该前缀。

对于任务树，先创建父任务，然后使用 `--parent <parent-dir>` 创建每个子任务。不要仅仅因为子任务存在就启动父任务；启动拥有下一个可独立验证交付物的子任务。

此命令成功后，每轮面包屑自动切换到 `[workflow-state:planning]`，指示 AI 保持在规划阶段。

这里只运行 `create` — 不要同时运行 `start`。`start` 会将状态翻转为 `in_progress`，在规划工件审查之前就切换到实现阶段的面包屑。将 `start` 留给步骤 1.4。

当 `python3 ./.trellis/scripts/task.py current --source` 已经指向一个任务时跳过。

#### 1.1 需求探索 `[required · repeatable]`

加载 `trellis-brainstorm` skill，按照该技能的指导与用户交互式探索需求。

头脑风暴技能将指导你：
- 一次问一个问题
- 优先研究而非询问用户
- 优先提供选项而非开放式问题
- 每次用户回答后立即更新 `prd.md`
- 当交付物可独立验证时，将大范围拆分为父任务加子任务
- 保持 `prd.md` 聚焦于需求和验收标准

考虑父/子拆分时：
- 当一个请求包含多个可独立验证的交付物时使用父任务。
- 父任务拥有源需求、子任务映射、跨子任务验收标准和最终集成审查。
- 子任务拥有可独立规划、实现、检查和归档的实际交付物。
- 父/子结构不是依赖系统。如果子任务 B 依赖子任务 A，请在子任务 B 的 `prd.md` 中写明该顺序。
- 启动拥有下一个交付物的子任务。除非父任务本身有直接实现工作，否则不要启动父任务。

每当需求变更时返回此步骤并修订相关工件。

#### 1.2 研究 `[optional · repeatable]`

研究可以在需求探索期间随时进行。它不限于本地代码——你可以使用任何可用工具（MCP 服务器、技能、网络搜索等）查找外部信息，包括第三方库文档、行业实践、API 参考等。

[Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

生成研究子代理：

- **代理类型**：`trellis-research`
- **任务描述**：Research <specific question>
- **关键要求**：研究输出必须持久化到 `{TASK_DIR}/research/`

[/Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

[codex-inline, Kilo, Antigravity, Windsurf]

直接在主会话中进行研究，并将发现写入 `{TASK_DIR}/research/`。（对于 `codex-inline`，这避免了 `fork_turns="none"` 隔离导致 `trellis-research` 子代理无法解析活跃任务路径的问题。）

[/codex-inline, Kilo, Antigravity, Windsurf]

**研究工件约定**：
- 每个研究主题一个文件（例如 `research/auth-library-comparison.md`）
- 在文件中记录第三方库使用示例、API 参考、版本约束
- 记录你发现的相关规范文件路径以供后续参考

头脑风暴和研究可以自由交错——暂停去研究技术问题，然后返回与用户对话。

**关键原则**：研究输出必须写入文件，不能只留在对话中。对话会被压缩；文件不会。

#### 1.3 配置上下文 `[required · once]`

[Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

整理 `implement.jsonl` 和 `check.jsonl`，以便 Phase 2 子代理获得正确的规范/研究上下文。这些文件在 `task create` 时已初始化了一个自描述的 `_example` 行；你在这里的工作是填入实际条目。

**位置**：`{TASK_DIR}/implement.jsonl` 和 `{TASK_DIR}/check.jsonl`（已存在）。

**格式**：每行一个 JSON 对象 — `{"file": "<path>", "reason": "<why>"}`。路径相对于仓库根目录。

**应放入的内容**：
- **规范文件** — `.trellis/spec/<package>/<layer>/index.md` 以及与此任务相关的任何特定准则文件（`error-handling.md`、`conventions.md` 等）
- **研究文件** — `{TASK_DIR}/research/*.md`，子代理需要查阅的

**不应放入的内容**：
- 代码文件（`src/**`、`packages/**/*.ts` 等）— 这些由子代理在实现期间读取，不在此预注册
- 你即将修改的文件 — 同样的原因

**两个文件的分工**：
- `implement.jsonl` → 实现代理正确编写代码所需的规范和研究
- `check.jsonl` → 检查代理的规范（质量指南、检查约定，如需要同样的研究）

这些清单通过列出要注入的规范/研究文件来补充 `prd.md`。

**如何发现相关规范**：

```bash
python3 ./.trellis/scripts/get_context.py --mode packages
```

列出每个包及其规范层和路径。选择与此任务领域匹配的条目。

**如何追加条目**：

直接在编辑器中编辑 jsonl 文件，或使用：

```bash
python3 ./.trellis/scripts/task.py add-context "$TASK_DIR" implement "<path>" "<reason>"
python3 ./.trellis/scripts/task.py add-context "$TASK_DIR" check "<path>" "<reason>"
```

当实际条目存在后删除种子 `_example` 行（可选——消费者会自动跳过它）。

跳过条件：当 `implement.jsonl` 和 `check.jsonl` 有代理整理的条目时（仅种子行不算）。

[/Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

[codex-inline, Kilo, Antigravity, Windsurf]

跳过此步骤。上下文在 Phase 2 中由 `trellis-before-dev` skill 直接加载。

[/codex-inline, Kilo, Antigravity, Windsurf]

#### 1.4 激活任务 `[required · once]`

工件审查后，将任务状态翻转为 `in_progress`：

```bash
python3 ./.trellis/scripts/task.py start <task-dir>
```

在 start 前审查 `prd.md`。在支持子代理的平台上，当需要额外的规范或研究上下文时整理 jsonl 清单；仅种子的清单被消费者容忍。

此命令成功后，面包屑自动切换到 `[workflow-state:in_progress]`，Phase 2 / 3 的其余部分随之进行。

如果 `task.py start` 因会话身份消息报错（没有来自 hook 输入的上下文键、`TRELLIS_CONTEXT_ID` 或平台原生会话环境变量），请按照错误中的提示设置会话身份，然后重试。

#### 1.5 完成标准

| 条件 | 必需 |
|------|:---:|
| `prd.md` 存在 | ✅ |
| 用户确认任务应进入实现阶段 | ✅ |
| `task.py start` 已运行（status = in_progress）| ✅ |
| `research/` 有工件 | 推荐 |

[Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

| 当需要额外规范或研究上下文时，`implement.jsonl` / `check.jsonl` 已整理 | 推荐 |

[/Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

---

## Phase 2: 执行

目标：将审查过的规划工件转化为通过质量检查的代码。

#### 2.1 实现 `[required · repeatable]`

[Claude Code, Cursor, OpenCode, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

生成实现子代理：

- **代理类型**：`trellis-implement`
- **任务描述**：Implement the reviewed task artifacts, consulting materials under `{TASK_DIR}/research/`; finish by running project lint and type-check
- **调度提示防护**：告诉生成的代理它已经是 `trellis-implement` 子代理，必须直接实现，不要生成另一个 `trellis-implement` / `trellis-check`。

平台 hook/插件自动处理：
- 读取 `implement.jsonl` 并将引用的规范/研究文件注入代理提示
- 注入 `prd.md`

[/Claude Code, Cursor, OpenCode, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

[codex-sub-agent]

生成实现子代理：

- **代理类型**：`trellis-implement`
- **任务描述**：Implement the reviewed task artifacts, consulting materials under `{TASK_DIR}/research/`; finish by running project lint and type-check
- **调度提示防护**：提示必须以 `Active task: <task path>` 开头，然后明确说明生成的代理已经是 `trellis-implement`，必须直接实现，不要生成另一个 `trellis-implement` / `trellis-check`。

Codex 子代理定义自动处理上下文加载需求：
- 使用 `task.py current --source` 解析活跃任务，然后读取 `prd.md`
- 读取 `implement.jsonl` 并要求代理在编码前加载每个引用的规范/研究文件

[/codex-sub-agent]

[Kiro]

生成实现子代理：

- **代理类型**：`trellis-implement`
- **任务描述**：Implement the reviewed task artifacts, consulting materials under `{TASK_DIR}/research/`; finish by running project lint and type-check
- **调度提示防护**：告诉生成的代理它已经是 `trellis-implement` 子代理，必须直接实现，不要生成另一个 `trellis-implement` / `trellis-check`。

平台 prelude 自动处理上下文加载需求：
- 读取 `implement.jsonl` 并将引用的规范/研究文件注入代理提示
- 注入 `prd.md`

[/Kiro]

[codex-inline, Kilo, Antigravity, Windsurf]

1. 加载 `trellis-before-dev` skill 读取项目准则
2. 读取 `{TASK_DIR}/prd.md`
3. 查阅 `{TASK_DIR}/research/` 下的材料
4. 按审查过的工件实现代码
5. 运行项目 lint 和 type-check

[/codex-inline, Kilo, Antigravity, Windsurf]

#### 2.2 质量检查 `[required · repeatable]`

[Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

生成检查子代理：

- **代理类型**：`trellis-check`
- **任务描述**：Review all code changes against specs and task artifacts; output structured issue list to `check-report.md`; ensure lint and type-check pass
- **调度提示防护**：告诉生成的代理它已经是 `trellis-check` 子代理，必须仅审查，不要生成另一个 `trellis-check` / `trellis-implement`。

检查代理的职责：
- 根据规范审查代码变更
- 根据 `prd.md` 审查代码变更
- 将结构化问题列表（C/H/M/L）输出到 `$TASK_DIR/check-report.md`
- 运行 lint 和 typecheck 进行验证（失败 = C 级）
- **只审不改**：禁止修改任何代码文件，发现问题只输出清单

[/Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

[codex-inline, Kilo, Antigravity, Windsurf]

加载 `trellis-check` skill 并按照其指导验证代码：
- 规范合规性
- lint / type-check / 测试
- 跨层一致性（当变更跨层时）

如果发现问题 → 修复 → 重新检查，直到通过。内联模式在主会话中直接处理修复循环；`fix-context.md` 是可选的（主会话已有完整对话上下文）。

[/codex-inline, Kilo, Antigravity, Windsurf]

#### 2.3 修复循环 `[required · repeatable]`

当 `trellis-check` 报告 C/H/M 级问题时，主会话使用 `fix-context.md` 作为跨轮次记忆来编排修复-验证循环。

**循环结构**：

```
check-report.md 有 C/H/M？
    ├── 否 → 放行，进入 Phase 3
    └── 是 → 主会话更新 fix-context.md
             → 调度 trellis-implement（传入 prd.md + implement.jsonl + fix-context.md）
             → implement 修复代码
             → 调度 trellis-check 复审
             → 主会话更新 fix-context.md（记录修复结果）
             → 循环，最多 3 轮自动
             → 第 3 轮仍有 C/H/M → 暂停，用户决定
```

**主会话职责**：

| 时机 | 操作 |
|------|------|
| 首次 check 后 | 若有 C/H/M，创建 `$TASK_DIR/fix-context.md` |
| 每轮 fix 前 | 更新 fix-context.md 的待修复清单 |
| 每轮 check 后 | 更新 fix-context.md 的修复结果和决策记录 |
| 超限暂停时 | 展示遗留问题，用户决定：继续修复 / 缩小范围 / 手动通过 |

**fix-context.md 结构**：

```markdown
# 修复上下文

## 当前轮次
第 N 轮

## 原始需求摘要
<从 prd.md 提取的关键验收标准>

## 修复历史

### 第 1 轮
- **实现内容**: <摘要>
- **Check 发现**: [C/H/M] file:line - 问题描述
- **修复结果**: 已修复 / 部分修复 / 未修复
- **遗留问题**: 无 / 具体描述

## 待修复清单（当前轮）
<基于 check-report.md>

1. [等级] file:line - 修复要求

## 关键决策记录
<跨轮次的重要决策>
```

**implement agent 如何使用 fix-context.md**：

- `trellis-implement` 启动时读取 `fix-context.md`，了解：
  - 之前做了什么实现决策
  - check 发现了什么问题
  - 本轮需要修复什么
  - 哪些决策需要遵循
- 首次 implement（无 fix-context.md）时按正常流程读 prd.md 即可

**用户选择"继续修复"时**：

- 每轮只执行一次 fix → check，然后暂停展示结果
- 用户确认后继续下一轮
- 如此循环，直到通过或用户选择其他选项

#### 2.4 回滚 `[on demand]`

- `check` 发现 prd 缺陷 → 返回 Phase 1，修复 `prd.md`，然后重做 2.1
- 实现出错 → 回退代码，重做 2.1
- 需要更多研究 → 研究（同 Phase 1.2），将发现写入 `research/`

---

## Phase 3: 完成

目标：捕获经验、更新规范、记录工作。

#### 3.1 调试回顾 `[on demand]`

如果此任务涉及反复调试（同一问题被修复多次），加载 `trellis-break-loop` skill 以：
- 分类根本原因
- 解释为什么早期修复失败
- 提出预防措施

目标是捕获调试经验，使同类问题不再复发。

#### 3.2 规范更新 `[required · once]`

加载 `trellis-update-spec` skill，审查此任务是否产生了值得记录的新知识：
- 新发现的模式或约定
- 遇到的陷阱
- 新的技术决策

相应更新 `.trellis/spec/` 下的文档。即使结论是"无需更新"，也要走一遍判断过程。

#### 3.3 提交变更 `[required · once]`

AI 驱动此任务代码变更的批量提交，以便 `/finish-work` 之后能顺利运行。目标：先产出工作提交，然后记账（归档 + 日志）提交落在后面——永远不交错。

**步骤**：

1. **检查脏状态**：
   ```bash
   git status --porcelain
   ```
   快照每个脏路径。如果工作树干净，跳到 3.5。

2. **从最近历史学习提交风格**（使草拟的消息融入）：
   ```bash
   git log --oneline -5
   ```
   注意前缀约定（`feat:` / `fix:` / `chore:` / `docs:` ...）、语言（中文/English）和长度风格。

3. **将脏文件分为两组**：
   - **本次会话 AI 编辑的** — 你在本次会话中通过 Edit/Write/Bash 工具调用写入/编辑的文件。你知道什么改变了以及为什么。
   - **未识别的** — 你本次会话未接触的脏文件（可能是用户的手动编辑、之前会话的遗留 WIP 或无关工作）。不要静默包含这些。

4. **草拟提交计划**。将 AI 编辑的文件分组为逻辑提交（每个连贯变更单元 1 个提交，不是每个文件 1 个提交）。每个条目：`<commit message>` + 文件列表。在底部单独列出未识别的文件。

5. **展示计划一次，请求一次性确认**。格式：
   ```
   提议的提交（按顺序）：
     1. <message>
        - <file>
        - <file>
     2. <message>
        - <file>

   未识别的脏文件（不在任何提交中——确认包含/排除）：
     - <file>
     - <file>

   回复 'ok' / '行' 执行。回复修改意见，或 '我自己来' / 'manual' 中止。
   ```

6. **确认后**：按顺序对每批运行 `git add <files>` + `git commit -m "<msg>"`。不要 amend。不要 push。

7. **拒绝后**（用户回复"不行" / "我自己来" / "manual" / 任何对计划的反对）：停止。不要尝试第二个计划。用户将手动提交；他们确认后你跳到 3.5。

**规则**：
- 任何地方都不使用 `git commit --amend` — 三阶段三提交流程（工作提交 → 归档提交 → 日志提交）。
- 此步骤永远不推送到远程。
- 如果用户想要不同的消息措辞但接受文件分组，编辑消息并重新确认一次——但如果他们拒绝分组，退出到手动模式。
- 批量计划是一个提示；不要每个提交都提示。

#### 3.4 收尾提醒

完成上述后，提醒用户可以运行 `/finish-work` 收尾（归档任务、记录会话）。

---

## 自定义 Trellis（用于 fork）

本节面向想要修改 Trellis 工作流本身的开发者。所有自定义通过编辑此文件完成；脚本仅是解析器。

### 更改步骤含义

编辑上述 Phase 1 / 2 / 3 部分中相应步骤的通关内容。关键不变量：
- 无活跃任务时必须先分类并请求任务创建同意，然后才能创建 Trellis 任务。
- 规划必须在 start 前将需求持久化到 `prd.md`。
- 每个必需执行路径必须在 `/trellis:finish-work` 之前保持 Phase 3.3 提交提醒可达。

所有标签块位于上述 `## 阶段索引` 部分中，紧跟在每个阶段摘要之后：

| 范围 | 对应标签 |
|---|---|
| 无活跃任务（Phase 1 之前）| `[workflow-state:no_task]`（在阶段索引 ASCII 图之后）|
| Phase 1 全部（任务创建 → 准备好实现）| `[workflow-state:planning]`（在 Phase 1 摘要之后）|
| Codex 内联 Phase 1 | `[workflow-state:planning-inline]` |
| Phase 2 + Phase 3.1–3.3（实现 + 检查 + 收尾）| `[workflow-state:in_progress]`（在 Phase 2 摘要之后）|
| Codex 内联 Phase 2 + Phase 3.1–3.3 | `[workflow-state:in_progress-inline]` |
| Phase 3.4 之后（已归档）| `[workflow-state:completed]`（在 Phase 3 摘要之后；**当前已废弃**）|

### 更改每轮提示文本

直接编辑相应 `[workflow-state:STATUS]` 块的内容。编辑后，运行 `trellis update`（如果你是模板维护者）或重启 AI 会话（如果你在自定义自己的项目）——无需更改脚本。

### 添加自定义状态

添加新块：

```
[workflow-state:my-status]
你的每轮提示文本
[/workflow-state:my-status]
```

约束：
- STATUS 字符集：`[A-Za-z0-9_-]+`（允许下划线和连字符，例如 `in-review`、`blocked-by-team`）
- 生命周期钩子必须将 `task.json.status` 写入你的自定义值，否则标签永远不会被读取
- 生命周期钩子位于 `task.json.hooks.after_*` 中，绑定到 `after_create / after_start / after_finish / after_archive` 之一

### 添加生命周期钩子

在 `task.json` 中添加 `hooks` 字段：

```json
{
  "hooks": {
    "after_finish": [
      "your-script-or-command-here"
    ]
  }
}
```

支持的事件：`after_create / after_start / after_finish / after_archive`。注意 `after_finish` ≠ 状态变更（它仅清除活跃任务指针）；使用 `after_archive` 进行"任务完成"通知。

### 完整契约

有关工作流状态机的运行时契约、所有状态写入器的位置、伪状态（`no_task` / `stale_<source_type>`）、钩子可达性矩阵和其他深层细节，请参阅：

- `.trellis/spec/cli/backend/workflow-state-contract.md` — 运行时契约 + 写入器表 + 测试不变量
- `.trellis/scripts/inject-workflow-state.py` — 实际解析器（仅读取 workflow.md，无嵌入文本）
