import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import express from "express";
import { randomUUID } from "node:crypto";

/**
 * 现代 MCP HTTP 传输层：StreamableHTTPServerTransport
 * 它是 SDK 推荐的最新方案，取代了已弃用的 SSEServerTransport。
 */

// 1. 初始化 MCP Server
const server = new McpServer({
    name: "MCP Streamable HTTP Server",
    version: "1.0.0",
});

/**
 * add 函数的独立定义
 * 将业务逻辑与 MCP 协议包装层分离，提高可维护性。
 */
const add = (a: number, b: number): number => a + b;

// 2. 注册工具 (使用最新的 registerTool API)
server.registerTool(
    "add",
    {
        description: "将两个数字相加",
        inputSchema: {
            num1: z.number().describe("第一个数字"),
            num2: z.number().describe("第二个数字"),
        }
    },
    async ({ num1, num2 }: { num1: number, num2: number }) => {
        // 调用外部定义的 add 函数执行核心逻辑
        const result = add(num1, num2);
        return {
            content: [{ type: "text", text: String(result) }]
        };
    }
);

// 3. 创建 Express 应用并配置
const app = express();
// Streamable HTTP 通常需要处理 JSON Body，所以我们需要中间件
app.use(express.json());

// 初始化传输层实例
const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID()
});

app.all("/mcp", async (req, res) => {
    try {
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        console.error("MCP Request Error:", error);
        if (!res.headersSent) {
            res.status(500).send("Internal Server Error");
        }
    }
});

// 全局错误处理，防止进程因未捕获错误意外退出
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
});

const PORT = 3000;

// 先建立 MCP 连接，成功后再启动 HTTP 监听
server.connect(transport as any)
    .then(() => {
        console.log("MCP Server 已成功连接到传输层");

        const instance = app.listen(PORT, "0.0.0.0", () => {
            console.log(`MCP 现代 Server 正在稳定运行中...`);
            console.log(`接入端点: http://localhost:${PORT}/mcp`);
        });

        instance.on("error", (err: any) => {
            if (err.code === "EADDRINUSE") {
                console.error(`错误：端口 ${PORT} 已被占用。请先关闭占用该端口的进程。`);
            } else {
                console.error("Express 监听出错:", err);
            }
            process.exit(1);
        });
    })
    .catch(error => {
        console.error("MCP Server 启动失败:", error);
        process.exit(1);
    });