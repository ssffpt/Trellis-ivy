# 继续当前任务

恢复当前任务的工作——在 `.trellis/workflow.md` 中找到正确的阶段/步骤继续执行。

---

## 步骤 1：加载当前上下文

```bash
{{PYTHON_CMD}} ./.trellis/scripts/get_context.py
```

确认：当前任务、git 状态、最近的提交记录。

## 步骤 2：加载阶段索引

```bash
{{PYTHON_CMD}} ./.trellis/scripts/get_context.py --mode phase
```

显示阶段索引（计划 / 执行 / 完成），包含路由和技能映射。

## 步骤 3：确定当前所处位置

`get_context.py` 会显示当前任务的 `status` 字段。根据 `status` 和产物存在情况进行路由。此命令替代了用户记忆 Trellis 流程的需要；它本身不批准实施。

- `status=planning` + 无 `prd.md` → **1.1**（加载 `trellis-brainstorm`）
- `status=planning` + 仅有 `prd.md` → 判断任务是轻量级还是复杂。轻量级可直接进入 **1.4** 审查；复杂任务需返回 **1.1** 在 prd.md 中补充技术决策章节。
- `status=planning` + 复杂产物完成 + 子代理 jsonl 未整理（仅有种子 `_example` 行）→ **1.3**
- `status=planning` + 必需产物完成 + 必需 jsonl 已整理或为内联模式 → **1.4**（请求开始审查；仅在用户确认后运行 `task.py start`）
- `status=in_progress` + 实施尚未开始 → **2.1**
- `status=in_progress` + 实施完成，尚未检查 → **2.2**
- `status=in_progress` + 检查通过 → **3.1**
- `status=completed`（少见；通常立即归档）→ 归档流程

阶段规则（完整详情见 `.trellis/workflow.md`）：

1. 在阶段内**按顺序**执行步骤——`[required]` 步骤不可跳过
2. `[once]` 步骤在所需输出已存在时视为已完成。仅轻量级任务可以只用 `prd.md`；复杂任务还需要在 prd.md 中包含技术决策章节。
3. 如果发现新情况需要，可以返回到更早的阶段

## 步骤 4：加载具体步骤

确定从哪个步骤恢复后：

```bash
{{PYTHON_CMD}} ./.trellis/scripts/get_context.py --mode phase --step <X.X> --platform {{CLI_FLAG}}
```

按照加载的指令执行。每个 `[required]` 步骤完成后，进入下一步。

---

## 参考

完整的流程和详细的阶段步骤在 `.trellis/workflow.md` 中。此命令只是入口——权威指南在那里。
