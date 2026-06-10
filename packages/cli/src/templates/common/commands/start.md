# 启动会话

初始化一个 Trellis 管理的开发会话。此平台没有会话启动钩子，因此需要手动按照以下步骤加载等效的紧凑上下文。

---

## 步骤 1：当前状态
身份信息、git 状态、当前任务、活跃任务、日志位置。

```bash
{{PYTHON_CMD}} ./.trellis/scripts/get_context.py
```

如果输出中包含以 `Trellis update available:` 开头的行，在总结会话上下文时请原样复制该行。不要缩短操作命令提示。

## 步骤 2：流程概览
紧凑阶段索引、请求分类规则、规划产物规范，以及步骤详情命令。

```bash
{{PYTHON_CMD}} ./.trellis/scripts/get_context.py --mode phase
```

完整指南在 `.trellis/workflow.md` 中（按需读取）。

## 步骤 3：指南索引
发现包和规范层级，然后读取每个相关的索引文件。

```bash
{{PYTHON_CMD}} ./.trellis/scripts/get_context.py --mode packages
cat .trellis/spec/guides/index.md
cat .trellis/spec/<package>/<layer>/index.md   # 对每个相关层级
```

索引文件列出了在实际开始编码时需要阅读的具体指南文档。

## 步骤 4：决定下一步操作
从步骤 1 中你已了解当前任务和状态。检查任务目录：

- **活跃任务状态为 `planning` + 无 `prd.md`** → 阶段 1.1。加载 `trellis-brainstorm` 技能。
- **活跃任务状态为 `planning` + `prd.md` 已存在** → 留在阶段 1。轻量级任务可以仅有 PRD；复杂任务需要在 prd.md 中包含技术决策章节。在 `task.py start` 之前加载相关阶段 1 的步骤详情。
- **活跃任务状态为 `in_progress`** → 阶段 2 步骤 2.1。加载步骤详情：
  ```bash
  {{PYTHON_CMD}} ./.trellis/scripts/get_context.py --mode phase --step 2.1 --platform {{CLI_FLAG}}
  ```
- **无活跃任务** → 先分类。对于简单对话/小任务，仅询问本轮是否应创建 Trellis 任务。对于复杂工作，询问是否可以创建 Trellis 任务并进入规划。如果用户拒绝，本次会话跳过 Trellis。

---

## 技能路由（快速参考）

| 用户意图 | 技能 |
|---|---|
| 新功能 / 需求不明确 | `trellis-brainstorm` |
| 即将编写代码 | `trellis-before-dev` |
| 编码完成 / 质量检查 | `trellis-check` |
| 卡住 / 多次修复同一 bug | `trellis-break-loop` |
| 学到了值得记录的内容 | `trellis-update-spec` |

完整规则和反合理化对照表在 `.trellis/workflow.md` 中。
