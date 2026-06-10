# 仓库分析

目标是在编写规则之前发现项目的真实架构。不要从通用规范模板出发填空。从代码出发，让规范结构随之而来。

## 分析顺序

1. 阅读现有的 `.trellis/spec/` 目录树，记录哪些文件是模板、过时的或已是项目专属的。
2. 检查包清单、构建脚本、工作区配置和顶层文档，识别包和运行时层级。
3. 使用 GitNexus 查看执行流、模块集群、依赖枢纽和影响敏感区域。
4. 使用 ABCoder 或语言原生工具获取精确的签名、类型、类边界和实现示例。
5. 在将任何发现转化为规范规则之前，直接阅读代表性的源文件和测试文件。

## 需要捕获的内容

| 领域 | 问题 |
|------|------|
| 包边界 | 每个包拥有什么？哪些导入跨越了边界？ |
| 运行时层级 | 哪些代码属于 CLI、后端、前端、工作进程、共享库、仅测试或工具链？ |
| 核心抽象 | 哪些类型、服务、存储、命令、路由或适配器定义了系统形态？ |
| 数据流 | 用户输入从哪里进入，如何验证，状态在哪里持久化？ |
| 错误处理 | 故障如何表示、记录、暴露和测试？ |
| 配置 | 默认值、环境配置、生成文件和模板在哪里？ |
| 测试 | 哪些测试风格是新工作的可信示例？ |

## GitNexus 用法

从广到窄，逐步检查具体符号：

```text
gitnexus_query({query: "CLI command execution flow"})
gitnexus_query({query: "template generation and migration"})
gitnexus_context({name: "SymbolName"})
gitnexus_cypher({query: "MATCH (n)-[r]->(m) RETURN n.name, type(r), m.name LIMIT 30"})
```

使用 GitNexus 结果查找重要文件和流程。在检查相关源文件之前，不要将图形输出作为最终依据。

## ABCoder 用法

当规范需要精确的代码形态时使用 ABCoder：

```text
list_repos()
get_repo_structure({repo_name: "package-name"})
get_file_structure({repo_name: "package-name", file_path: "src/example.ts"})
get_ast_node({repo_name: "package-name", node_ids: [{mod_path: "...", pkg_path: "...", name: "SymbolName"}]})
```

ABCoder 在记录构造函数模式、函数签名、类型契约和引用链方面最有价值。

## 分析笔记

在分析过程中保持简短笔记。笔记应包括：

- 包或层级名称。
- 定义本地模式的文件。
- 规范应教授的规则。
- 在旧代码、注释、测试或迁移路径中发现的反模式。
- 应创建、删除、重命名或合并的规范文件。
