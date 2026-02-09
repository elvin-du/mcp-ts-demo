# MCP TypeScript Demo (DeepSeek 集成版)

这是一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的 TypeScript 示例项目。它展示了如何构建一个完整的 MCP 架构，并利用 DeepSeek (OpenAI 兼容 API) 实现智能工具调用。

## 架构概览

项目采用三层架构设计：

1.  **Server (`src/server.ts`)**: 提供核心能力的 MCP 服务端。目前包含一个简单的 `add` (加法) 工具。
2.  **Client (`src/client.ts`)**: MCP 客户端封装。负责建立与服务端的通信，并将 MCP 工具动态转换为 LLM 可理解的格式。
3.  **Host (`src/host.ts`)**: 应用主机端。集成了 DeepSeek API，作为整个系统的“大脑”，自动决策何时调用 MCP 提供的工具。

## 类型安全优化

-   **强类型化 ([client.ts](file:///Users/elvindu/study/mcp-ts-demo/src/client.ts))**: 为 `getToolsForLlm` 引入了显式的 OpenAI 返回类型定义，增强了代码的自描述性和严谨性。
-   **构建闭环 ([host.ts](file:///Users/elvindu/study/mcp-ts-demo/src/host.ts))**: 修复了访问 OpenAI 工具联合类型时的 TS 报错，确保了全栈 `npm run build` 的零错误输出。

## 验证结论

1.  **编译确认**: 运行 `npm run build` 成功。所有的弃用警告和类型报错均已彻底消除。
2.  **连接确认**: 
    -   采用最新规范定义的工具能够被顺畅调度。
    -   类型提示在编辑器中已能完美工作。

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

```bash
npm run build
```

### 4. 运行演示 (HTTP 模式)

在 HTTP 模式下，您需要启动两个独立的进程：

**步骤 A: 启动 MCP Server**
```bash
npm run server
```
Server 将运行在 `http://localhost:3000`。

**步骤 B: 启动 Host (另开一个终端)**
```bash
npm start
```

## 开发脚本

*   `npm run server`: 直接运行 TS 形式的 Server (使用 `node --env-file`)。
*   `npm start`: 运行编译后的 `dist/host.js`。
*   `npm run build`: 编译所有代码。

## 它是如何工作的？ (HTTP/SSE 模式)

1.  **Server** 启动一个 Express Web 服务器。
2.  **Host** 连接到 `http://localhost:3000/sse` 开启 Server-Sent Events 流。
3.  **Host** 通过 HTTP GET 获取工具列表。
4.  **DeepSeek** 决定调用工具。
5.  **Host** 将工具调用指令通过 **HTTP POST** 发送给 Server 的 `/messages` 接口。
6.  **Server** 执行逻辑，通过 **SSE 通道** 将结果推送回 Host。
7.  **Host** 获取结果并由 AI 完成回复。
# mcp-ts-demo
