# BW Skills

自动生成标书的 skill 训练项目。

## 项目目标

基于招标文件数据，训练出一套可用的、**完全可移植**的 Claude Code skill 包，用于辅助投标文件撰写。

## 核心原则

### 可移植性

本项目所有 skill 的最终目标：**打包后放到任何环境都能跑**。在达成此目标之前，所有 skill 必须留在本项目内调试，不可放入全局 skill 目录。

可移植性要求：
- 所有依赖在 skill 包内声明（`package.json` / `requirements.txt`）
- 所有路径使用相对路径或可配置的绝对路径
- 不依赖宿主机的特定环境变量或全局安装
- 脚本引用的库（node_modules / pip packages）需在 skill 安装时一键就绪

### 数据管道架构

整个标书编写流程拆分为多个独立的处理节点（skill），每个节点只做一件事：

```
原始数据 ──→ [bid-extract-requirement] ──→ [bid-create-skeleton] ──→ [后续步骤...]
   │                    │                            │
   │              bid_extract_phase/           bid_skeleton_phase/
   │              (可验证、可校准)              (可验证、可校准)
   │
  .data/{项目名}/
  (原始数据，只读)
```

每个节点的产出存放在 `.data/{项目名}_output/{phase_name}/` 下，数据流向下一个节点。

### 原始数据只读

`.data/` 下的原始招标文件绝对不可修改。所有产出写入 `_output/` 目录。

## 项目结构

```
bw-skills/
├── README.md
├── bid-extract-requirement/     ← 节点1：招标信息提取
├── bid-create-skeleton/         ← 节点2：投标文件骨架生成
├── create_bid_skeleton/         ← 原型（保留参考，将来废弃）
└── .data/                       ← 原始数据 + 各阶段产出
    ├── {项目名}/                 ← 原始数据（只读）
    └── {项目名}_output/
        ├── bid_extract_phase/   ← 节点1产出
        └── bid_skeleton_phase/  ← 节点2产出
```
