// 导入现代 Streamable HTTP 客户端传输层
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
// 导入 MCP 客户端核心类
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

// 导入 OpenAI 类型，用于定义工具转换后的格式
import OpenAI from "openai";

/**
 * MCP 原理：客户端连接器类 (现代 HTTP 版本)
 * 使用 StreamableHTTPClientTransport 替代已弃用的 SSEClientTransport。
 */
export class McpClientConnector {
    private client: Client;
    private transport: StreamableHTTPClientTransport;

    constructor(serverUrl: string) {
        /**
         * Streamable HTTP 原理：
         * 它在底层自动管理 SSE 建立和指令 POST，使得网络连接更加健壮。
         */
        this.transport = new StreamableHTTPClientTransport(new URL(serverUrl));

        this.client = new Client(
            { name: "host-connector", version: "1.0.0" },
            { capabilities: {} }
        );
    }

    /**
     * 发起连接。
     */
    async connect() {
        await this.client.connect(this.transport as any);
    }

    /**
     * 断开连接
     */
    async disconnect() {
        await this.client.close();
    }

    /**
     * 工具发现与转换 (逻辑保持不变)
     * 将 MCP Tool 格式转换为 LLM (OpenAI 标准) 的 ChatCompletionTool 格式。
     */
    async getToolsForLlm(): Promise<OpenAI.Chat.Completions.ChatCompletionTool[]> {
        const response = await this.client.listTools();
        return response.tools.map((tool) => ({
            type: "function",
            function: {
                name: tool.name,
                description: tool.description ?? "",
                parameters: tool.inputSchema as any,
            },
        }));
    }

    /**
     * 触发工具执行。
     */
    async callTool(name: string, args: any) {
        return await this.client.callTool({
            name,
            arguments: args,
        });
    }
}
