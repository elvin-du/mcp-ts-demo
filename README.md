# MCP TypeScript Demo (DeepSeek 集成版)

这是一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的 TypeScript 示例项目。它展示了如何构建一个完整的 MCP 架构，并利用 DeepSeek (OpenAI 兼容 API) 实现智能工具调用。

## 架构概览

项目采用三层架构设计：

1.  **Server (`src/server.ts`)**: 提供核心能力的 MCP 服务端。目前包含一个简单的 `add` (加法) 工具。
2.  **Client (`src/client.ts`)**: MCP 客户端封装。负责建立与服务端的通信，并将 MCP 工具动态转换为 LLM 可理解的格式。
3.  **Host (`src/host.ts`)**: 应用主机端。集成了 DeepSeek API，作为整个系统的“大脑”，自动决策何时调用 MCP 提供的工具。

## 准备工作

*   **Node.js**: v18+
*   **API Key**: 你需要一个 DeepSeek 的 API Key。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 环境配置

在项目根目录下创建一个 `.env` 文件，并填入您的 API Key：

```env
OPENAI_API_KEY=your_deepseek_api_key_here
```

### 3. 编译项目

由于使用了 TypeScript，在运行前需要先编译为 JavaScript：

```bash
npm run build
```

### 4. 运行演示

运行 Host 端，程序将自动启动并连接 MCP Server，启动 DeepSeek 进行对话演练：

```bash
npm start
```

## 开发脚本

*   `npm run build`: 编译 TypeScript 代码到 `dist` 目录。
*   `npm start`: 运行编译后的 `dist/host.js`。
*   `npm run dev`: 使用 `ts-node` 直接运行 `src/host.ts` (适合快速调试)。

## 它是如何工作的？

1.  **Host** 启动并初始化 **Client**。
2.  **Client** 通过 Stdio 启动 **Server** 进程并建立连接。
3.  **Client** 获取 **Server** 提供的工具列表，并将其格式化为 OpenAI 的 `tools` 规范提供给 **Host**。
4.  **Host** 将用户问题发送给 **DeepSeek**，并携带工具定义。
5.  **DeepSeek** 决定调用 `add` 工具。
6.  **Host** 通过 **Client** 调度该请求至 **Server**。
7.  **Server** 计算结果并返回。
8.  **DeepSeek** 拿到计算结果，生成最终的自然语言回复。
# mcp-ts-demo
