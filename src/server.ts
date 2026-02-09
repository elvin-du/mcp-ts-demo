// 导入 MCP 服务端核心类：McpServer 用于构建高层 API 服务
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// 导入标准 I/O 传输层：Stdio 是 MCP 最常用的通信方式（父子进程间通信）
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// 导入 Zod 用于类型定义和运行时参数验证，MCP 强依赖它来保证工具调用的准确性
import { z } from "zod";

// 初始化 McpServer 实例，这里定义的 name 和 version 会在连接握手时发送给客户端
const server = new McpServer({
    name: "MCP Demo Server", // 服务端名称，用于客户端识别
    version: "1.0.0",        // 服务端版本号
});

/**
 * MCP 原理：工具（Tools）注册
 * 每一个工具都需要：1. 唯一的名称；2. 输入参数的 Schema（基于 Zod）；3. 具体的处理函数
 * 注册后，客户端通过 listTools() 发现，并通过 callTool() 触发执行
 */
server.tool(
    "add", // 工具名称，LLM 会根据此名称选择调用
    {
        // 使用 Zod 定义输入参数的结构和描述。描述非常重要，因为它是给 LLM 看的“说明书”
        num1: z.number().describe("第一个数字"), // 定义 num1 为数字类型并加描述
        num2: z.number().describe("第二个数字"), // 定义 num2 为数字类型并加描述
    },
    // 处理函数：当 AI 决定调用此工具时，MCP SDK 会自动验证输入并传入此异步函数
    async ({ num1, num2 }) => {
        return {
            // MCP 返回格式：必须包含 content 数组，通常为 text 或 image 类型
            content: [{ type: "text", text: String(num1 + num2) }]
        };
    }
);

// 创建 StdioServerTransport 实例，它会让当前进程通过 stdin/stdout 与客户端通信
const transport = new StdioServerTransport();

/**
 * MCP 原理：连接与协议握手
 * server.connect 会启动协议状态机，等待客户端发起 'initialize' 请求并完成能力交换
 */
server.connect(transport);

// 将日志输出到 stderr 而非 stdout，因为 stdout 是为 MCP 协议通信保留的通道
console.error("MCP Server started on stdio");