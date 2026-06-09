在开始你的任务之前，阅读相关的开发指南。

执行以下步骤：

1. **阅读当前任务产物**：
   - `prd.md` 了解需求和验收标准
   - `design.md`（如存在）了解技术设计
   - `implement.md`（如存在）了解执行顺序和验证计划

2. **发现包及其规范层**：
   ```bash
   python3 ./.trellis/scripts/get_context.py --mode packages
   ```

3. **识别适用的规范**，基于：
   - 你正在修改哪个包（如 `cli/`、`docs-site/`）
   - 工作类型（后端、前端、单元测试、文档等）
   - 任务产物引用的任何规范/研究路径

4. **阅读每个相关模块的规范索引**：
   ```bash
   cat .trellis/spec/<package>/<layer>/index.md
   ```
   遵循索引中的**"开发前检查清单"**章节。

5. **阅读开发前检查清单中列出的具体指南文件**。索引不是目标——它指向实际的指南文件（如 `error-handling.md`、`conventions.md`、`mock-strategies.md`）。阅读这些文件以了解编码标准和模式。

6. **始终阅读共享指南**：
   ```bash
   cat .trellis/spec/guides/index.md
   ```

7. 了解你需要遵循的编码标准和模式，然后继续你的开发计划。

在编写任何代码之前，此步骤是**强制性**的。
