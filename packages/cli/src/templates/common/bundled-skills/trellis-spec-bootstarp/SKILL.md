---
name: trellis-spec-bootstarp
description: "使用平台无关的单代理工作流，引导项目专属的 Trellis 编码规范。用于创建或刷新 .trellis/spec 指南，通过 GitNexus、ABCoder 或源码检查分析代码库，分解包/层级规范工作，以及编写基于真实代码库的规范文档（无占位文本）。"
---

# Trellis 规范引导

使用此技能从真实代码库创建或刷新 `.trellis/spec/` 指南。一个有能力的代理负责完整循环：分析仓库、选择规范边界、编写文档并验证结果。此工作流不依赖于特定的宿主、CLI 或代理品牌。

## 工作流

1. 确认 Trellis 已初始化并检查当前 `.trellis/spec/` 目录树。
2. 使用最佳可用工具分析仓库架构：GitNexus、ABCoder、语言工具链和直接源码阅读。
3. 仅当反映实际代码库时，才按包和层级分解规范工作。
4. 用项目中的具体模式、文件路径、示例和反模式来填充或重塑规范文件。
5. 验证最终规范内部一致且不包含模板占位符。

## 参考路由

| 需求 | 阅读 |
|------|------|
| 仓库架构分析 | [references/repository-analysis.md](references/repository-analysis.md) |
| 规范工作分解与任务规划 | [references/spec-task-planning.md](references/spec-task-planning.md) |
| 编写高信号的 Trellis 规范文件 | [references/spec-writing.md](references/spec-writing.md) |
| GitNexus 和 ABCoder MCP 配置 | [references/mcp-setup.md](references/mcp-setup.md) |

## 操作规则

- 将模板视为起点，而非契约。当仓库需要时，删除、重命名、拆分或添加规范文件。
- 优先使用有源码支撑的规则，而非通用建议。每个重要建议都应指向真实文件或重复的本地模式。
- 默认保持单一执行者。可选的辅助代理是实现细节，不是要求或用户可见的依赖。
- 除非目标项目已标准化为特定平台，否则不要编写平台特定的指令。
- 不要在 `.trellis/spec/` 中留下占位文本、空标题或复制的样板内容。

## 完成标准

- `.trellis/spec/` 描述项目当前的实际状态。
- 每个相关的包或层级都有包含真实示例的实用编码指导。
- 不适用的模板章节已被移除。
- `index.md` 文件与最终的规范文件集匹配。
- 任何必需的配置或分析假设都已记录在相关规范或任务备注中。
