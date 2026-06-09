# Worktree 模式：为并行 subagent 与人工审查提供隔离工作区

## Goal

在当前单工作区、单 agent 顺序开发的 Trellis 模型上，引入 **worktree 模式**：以 git worktree 为底层原语，提供面向“任务”的隔离工作区抽象。使并行 subagent 写代码互不干扰，同时允许人工进入同一 worktree 做审查、调试、干预，最终安全地合并回主分支。

本任务是基础设施设计（#2），与 #3 并行 subagent 调度器解耦：本任务只设计 worktree 抽象层，不设计 subagent 调度器。

## Motivation

当前 Trellis 所有 subagent 共享同一个工作区，导致：

1. **并行写代码互相覆盖**：多个 subagent 同时修改同一文件，后写者覆盖前写者，难以并行。
2. **审查成本高**：subagent 的改动散落在主工作区，无法像 PR 一样整体检视、整体回滚。
3. **中途干预危险**：人工想进入 subagent 的工作上下文修改，会与 subagent 的后续写入冲突。

引入 worktree 模式后：每个“任务单元”独占一个 worktree，subagent 或人工都能进入；完成后 merge 回主分支，失败则保留现场供排查。

## Requirements

### R1：Worktree 抽象层（核心）

- **R1.1** 提供统一的 `Worktree` 抽象（类 / 接口），封装 `git worktree add / remove / list / prune` 等底层命令，上层（subagent 调度器、人工 CLI）不直接调用 `git worktree`。
- **R1.2** 每个 worktree 绑定一个唯一的 **lease id**（建议使用 task id + 序号或 subagent id），用于路径命名、锁标识、日志归集。
- **R1.3** worktree 路径策略可配置：默认 `<repo>/.trellis/worktrees/<lease>`；允许用户改到其他目录（如 RAM disk / 外部盘）。
- **R1.4** 抽象层对 Windows（`E:\` 路径、CRLF）与 POSIX 一视同仁；路径、分隔符、symlink 处理统一封装。

### R2：任务级生命周期

- **R2.1** worktree 随“任务单元”起落：申请时创建，成功合入后自动清理（删除 worktree + 删除本地分支），失败/中止保留供排查。
- **R2.2** 保留策略可配置：`keep_on_failure`（默认）、`always_keep`、`always_clean`。
- **R2.3** 提供 **孤儿 worktree 回收** 机制：扫描 `.trellis/worktrees/` 下超过 N 天未活跃且对应任务已归档的 worktree，提示或自动清理。
- **R2.4** 同一 lease 不支持嵌套申请；重复申请同一 lease 应返回现有 worktree（幂等）。

### R3：隔离与分支模型

- **R3.1** 每个 worktree checkout 一个独立本地分支，分支名规则建议 `trellis/<lease>`（可配置前缀）。
- **R3.2** 分支起点为调用方指定的 base ref（默认当前 HEAD，可显式传 `main` 或特定 commit）。
- **R3.3** worktree 内对 `.trellis/` 下共享资源（spec / workflow / tasks / workspace）默认 **共享同一份，不复制**，通过文件锁保护可写文件，避免并发 subagent 互相踩；具体策略与取舍见 design.md §5。
- **R3.4** worktree 内对 `node_modules` / `.venv` / build cache 等大目录，默认 **不复制**，由调用方按需 lazy install（具体策略见 design.md §5）。抽象层不负责依赖安装，也不创建到主工作区依赖目录的符号链接。

### R4：集成（merge 回主分支）

- **R4.1** 默认集成方式：**merge 回主分支**。支持 fast-forward（无并发时）与 true merge（有并发时），合并提交信息默认带 lease id 与 task 链接。
- **R4.2** 提供 **冲突检测 + 上报**：merge 冲突时不自动解决，停止该 lease 并把冲突文件清单返回给调度方（#3 的并行 subagent 或人工），由上层决定重试、放弃或人工介入。
- **R4.3** 提供 **dry-run merge**：不实际合入，只判断是否可干净合入，用于调度方在派发前评估任务并行度。
- **R4.4** 可选项：**PR 化**（`gh pr create`）作为另一集成通道，本任务只设计接口预留位，不实现。

### R5：两种使用场景的入口

- **R5.1** **Programmatic API**：供 #3 并行 subagent 调度器调用的 Python API，至少包含 `acquire()` / `release()` / `merge_back()` / `status()` / `list_active()`。
- **R5.2** **CLI / Skill 入口**：供人工交互式使用，例如 `trellis worktree new <lease>` / `enter` / `merge` / `discard` / `list`。本任务定义命令形态与参数，不强制要求实现所有命令（留给 #3）。
- **R5.3** **状态可观察**：`trellis worktree list` 显示每个 worktree 的 lease、base ref、创建时间、最后活跃时间、对应 task、状态（clean / dirty / merging / conflicted）。

### R6：安全与护栏

- **R6.1** 不允许对 `main` / `master` / 受保护分支直接 checkout 到 worktree；只允许从它们派生分支。
- **R6.2** 不允许同一 lease 同时被两个进程持有；提供基于文件锁的互斥。
- **R6.3** 所有创建 / 删除 / merge 操作写入 `.trellis/workspace/<dev>/journal.md`（与现有 Trellis 日志通道一致）。
- **R6.4** 在 merge 前自动运行 lint / type-check（复用现有 `trellis-check` 的入口）；失败则阻止 merge，要求先修。**默认门禁不含测试运行**（完整测试可能耗时较长，由调度器在合入前按需显式触发，不在抽象层内默认执行）。

### R7：非目标（本次不做）

- 不设计 subagent 调度器（#3 的任务）。
- 不实现分布式 / 跨机器 worktree（单机优先）。
- 不设计冲突自动解决策略（只检测 + 上报）。
- 不实现 PR 化集成通道（只预留接口）。

## Constraints

- **C1** 必须在 Windows 10 + Git for Windows 与 POSIX（macOS / Linux）双平台行为一致。
- **C2** 不引入新的外部依赖；优先复用 git 自带命令与 Python 标准库。
- **C3** 与现有 Trellis 子系统（task.py、workflow.md、trellis-check、agents.md 中的 GitNexus 指引）兼容；不要求其他子系统为本任务做破坏性改动。
- **C4** 设计必须允许 #3 在不修改 worktree 抽象层的前提下接入并行 subagent。
- **C5** 文档语言：中文为主，代码 / 接口名 / 字段名保持英文。

## Acceptance Criteria

- [ ] **AC1** `Worktree` 抽象层提供稳定的 public API（acquire / release / merge_back / status / list），且 #3 调度器仅通过该 API 即可完整使用 worktree 能力，不需要直接 `subprocess` 调 `git worktree`。
- [ ] **AC2** 任务级生命周期可观测：任意时刻能通过 `list` 看到所有活跃 worktree；成功合入的 worktree 在 release 后目录与本地分支均被清理。
- [ ] **AC3** 失败 / 中止的 worktree 默认保留，且孤儿 worktree 有回收机制（配置保留天数，默认 7）。
- [ ] **AC4** merge 冲突时不自动解决，返回结构化冲突清单；dry-run merge 能准确预判是否可干净合入。
- [ ] **AC5** 同一 lease 不会被两个进程同时持有（文件锁生效）；跨平台（Windows + POSIX）锁语义一致。
- [ ] **AC6** 受保护分支不可直接 checkout 到 worktree；违反时 API 抛错，CLI 返回非零退出码。
- [ ] **AC7** 技术决策章节覆盖：抽象层边界、lease 命名规范、路径策略、共享资源处理策略、依赖目录处理策略、状态机定义、失败模式矩阵、与 #3 的接口契约。
- [ ] **AC8** 设计评审通过：ivy 与至少一个 reviewer 对技术决策章节达成一致；所有未决问题显式记录在 Notes 节。

## Notes

- 本任务完成后，#3 的 prd 可以直接引用本 prd 的 R1–R6 作为基础设施需求。
- 与 `trellis-check` 的接口点（R6.4）：复用其入口，不在本任务内重新实现质量门禁。
- Open Questions：将追加到此处。

## 技术决策

#### 架构边界（≤15 行）

三层：调用方 → WorktreeManager（抽象层） → GitWorktreeBackend（后端）。调用方只依赖抽象层 public API，不感知底层实现。抽象层封装 lease 命名、路径分配、文件锁、状态机、merge 流程。后端接口预留，允许未来替换（如 btrfs snapshot）。对外暴露 `WorktreeManager`，核心 API：`acquire` / `release` / `merge_back` / `dry_run_merge` / `status` / `list_active` / `reap_orphans`。所有 API 均 lease 寻址，路径是后端实现细节。

#### 关键数据流（≤15 行）

状态机：ACQUIRED → DIRTY → MERGING → MERGED/CONFLICTED → RELEASED；UNUSABLE 为错误终态。CONFLICTED 通过 `abort_merge` 回退到 DIRTY 可重试；UNUSABLE 强制 `release(policy=keep)` 保留现场。状态持久化在 `.worktree-meta.json`，进程重启从 meta 文件恢复。

merge_back 流程：`dry_run_merge` 预判 → `trellis-check` 门禁（lint + typecheck）→ 合入主分支。冲突时 abort 并返回结构化冲突清单，不自动解决。多 worktree 并发合入时，主分支加进程级文件锁串行化，第二个合入被前一个阻塞时返回 `blocked_by` 信息。

失败模式：后端错误 → UNUSABLE；锁超时 → 重试；merge 冲突 → CONFLICTED + 冲突清单；check 失败 → 保持 DIRTY；进程崩溃 → OS 释放锁，`reap_orphans` 清理孤儿。

#### 兼容性与迁移（≤10 行）

跨平台锁：自研 `FileLock` 封装 `fcntl.flock`（POSIX）与 `msvcrt.locking`（Windows），不引入第三方依赖。`.trellis/` 共享：三级 fallback — junction（Windows 默认）→ symlink（POSIX 默认）→ 绝对路径注入。`.trellis/worktrees/` 默认 gitignore（`trellis init` 自动追加）。worktree 内沿用主仓库 `.gitignore`。进程崩溃时锁由 OS 自动回收；孤儿 worktree 由 `reap_orphans` 按天数阈值清理。

#### 权衡与选择理由（≤10 行）

共享 .trellis/ 而非复制：避免 task 状态分叉，用文件锁保护并发写（journal append-only、task status CAS）。依赖目录不复制：`node_modules` GB 级，由包管理器缓存复用，抽象层不负责安装。merge 默认 `--no-ff`：保留任务提交历史，便于审计回溯。默认门禁不含测试：完整测试耗时长，由调度器按需触发，抽象层只跑 lint + typecheck。不引入 `filelock` 库：PRD C2 约束，自研约 80 行可控。
