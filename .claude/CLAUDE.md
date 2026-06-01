# 记忆架构与自主进化规则

> 本文件只存放记忆系统的文件体系说明和自主进化规则。
> 项目知识 → `.llm-workspace/project.md`
> 用户偏好与长期记忆 → `.llm-workspace/memory.md`
> 代码风格铁律 → `.llm-workspace/rules.md`
> 工作任务 → `.llm-workspace/todo.md`
> 操作日志 → `.llm-workspace/logs/YYYY-MM-DD.md`

---

## 文件体系

.claude/
├── CLAUDE.md                     ← 本文件：只放记忆架构规则
└── settings.json                ← 权限配置

.llm-workspace/
├── project.md                   ← 项目知识（架构、技术细节、约定）
├── memory.md                    ← 用户偏好、反复强调的事、长期记忆（带时间戳）
├── rules.md                     ← 代码风格铁律（无条件遵守）
├── todo.md                      ← 当前阶段 + 卡点 + 进行中 + 待办
└── logs/                        ← 按日操作日志（不自动加载，按需检索）
    └── YYYY-MM-DD.md

---

## 自主进化规则

以下规则是强制性的，每次对话都必须遵守，不可省略。

### 规则 1：对话开始时恢复上下文

每次新对话开始时，你必须做的第一件事是读取以下文件：
- .llm-workspace/project.md
- .llm-workspace/memory.md
- .llm-workspace/rules.md
- .llm-workspace/todo.md

这些文件优先级完全一样，都必须读取。读取后你就知道项目背景、用户偏好、代码风格、当前进度。不要跳过这一步。

### 规则 2：各文件职责分工

- project.md：项目架构、技术细节、设计约定。对项目产生新理解时更新。
- memory.md：用户偏好、反复强调的事、用户说"小本本"/"记住"/"记一下"时的内容。每条必须带时间戳，格式为 ### [YYYY-MM-DD] 标题。
- rules.md：代码风格铁律。写代码时必须无条件遵守的规范。用户提到代码风格相关指示时更新。
- todo.md：当前阶段、卡点、进行中任务、待办任务。工作状态变化时更新。
- logs/YYYY-MM-DD.md：当天操作记录、完成的任务、技术决策。有实际操作时追加。

### 规则 3：todo.md 只放未完成任务

- 只包含未完成的任务
- 任务完成后立即从中删除
- 删除的同时把完成记录写到当天的 logs/YYYY-MM-DD.md 中
- 不要在 todo.md 里保留"已完成"条目

### 规则 4：对话过程中持续更新

- 开始一个任务时 → 更新 todo.md 的"进行中"
- 完成一个任务时 → 从 todo.md 中删除，记入当天 log
- 新增任务时 → 添加到 todo.md
- 遇到卡点时 → 写入 todo.md 的"卡点"
- 对项目有新理解时 → 写入 project.md
- 代码有修改时 → 同步更新 project.md 中受影响的部分（架构、接口、依赖等）
- 运维/部署环境有变化时（端口、域名、进程管理、nginx 等）→ 同步更新 project.md
- 用户说"记一下"/"小本本"/"记住" → 写入 memory.md（带时间戳）
- 用户不耐烦反复告知同一件事 → 写入 memory.md（带时间戳）
- 用户提到代码风格规范 → 写入 rules.md

### 规则 5：对话结束前保存状态

每当完成一个阶段性工作时，必须：
1. 更新 todo.md
2. 追加当天 logs/YYYY-MM-DD.md
3. 如有新的项目理解或用户偏好，同步写入 project.md、memory.md 或 rules.md

### 规则 6：README.md 同步

当代码逻辑与实现和 README.md 有出入时，同步更新 README.md。

### 规则 7：日志文件不自动加载

.llm-workspace/logs/ 目录下的文件不在对话开始时读取。只在用户要求查看历史记录时才去读取。

### 规则 8：记忆系统对外不可见

.llm-workspace/ 是整个记忆系统的工作区，对外部绝对不可见：
- .llm-workspace 中的笔记可以引用项目外部内容（如其他项目路径、外部文档链接等）
- 项目内容（README.md、源码、配置文件等）决不可引用 .llm-workspace 中的任何内容
- 记忆系统是私有工作空间，不在项目仓库中暴露
