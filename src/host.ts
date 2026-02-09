// 导入 OpenAI SDK，用于与 DeepSeek API 通信（DeepSeek 兼容 OpenAI 标准）
import OpenAI from "openai";
// 导入我们自定义的 MCP 客户端连接器，它是 Host 与 MCP Server 的桥梁
import { McpClientConnector } from "./client.js";

// MCP 原理：服务端定位 (HTTP 版本)
// 在 HTTP/SSE 模式下，Host 通过指定的 URL 连接到运行中的服务端。
// 现代 Streamable HTTP 使用统一的请求入口。
const SERVER_URL = "http://localhost:3000/mcp";

// 初始化 DeepSeek (OpenAI 兼容) 客户端
const deepseek = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // 从环境变量读取密钥，保证安全性
    baseURL: "https://api.deepseek.com",  // 指向 DeepSeek 的 API 地址
});

async function main() {
    console.log("正在启动 MCP 架构 (HTTP 模式)...");

    // 1. 初始化并连接 MCP 客户端
    const mcpConnector = new McpClientConnector(SERVER_URL);

    try {
        await mcpConnector.connect(); // 这一步会发起网络连接
        console.log(`MCP Client 已通过 SSE 连接到 ${SERVER_URL}`);

        /**
         * 2. MCP 原理：动态工具注入 (保持不变)
         */
        const mcpTools = await mcpConnector.getToolsForLlm();
        console.log("已获取并转换 MCP 工具:", mcpTools.map(t => (t as any).function?.name));

        // 定义对话消息流
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: "system", content: "你是一个专业的助手。你可以使用工具来完成计算。" },
            { role: "user", content: "请问 12345 加 67890 等于多少？请使用工具计算。" },
        ];

        /**
         * 3. 第一次请求：意图识别与决策
         */
        console.log("发送请求给 DeepSeek...");
        const response = await deepseek.chat.completions.create({
            model: "deepseek-chat",
            messages,
            tools: mcpTools,
        });

        const message = response.choices[0]?.message;
        if (!message) return;

        messages.push(message as OpenAI.Chat.Completions.ChatCompletionMessageParam);

        /**
         * 4. 处理工具调用 (The Loop)
         */
        if (message.tool_calls && message.tool_calls.length > 0) {
            for (const toolCall of message.tool_calls) {
                if (toolCall.type !== "function") continue;

                const name = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);

                console.log(`AI 决定调用工具: ${name}`, args);

                // 核心环节：通过网络向 MCP Server 请求执行
                const result = await mcpConnector.callTool(name, args);
                console.log("MCP Server 返回结果:", result.content);

                // 结果回传
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result.content),
                } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam);
            }

            /**
             * 6. 第二次请求：生成最终答案
             */
            console.log("带上工具结果再次请求 DeepSeek...");
            const finalResponse = await deepseek.chat.completions.create({
                model: "deepseek-chat",
                messages,
            });

            console.log("\n最终回答:", finalResponse.choices[0]?.message.content);
        } else {
            console.log("\nAI 直接回答:", message.content);
        }

    } catch (error) {
        console.error("执行出错:", error);
    } finally {
        /**
         * 7. 资源清理
         */
        await mcpConnector.disconnect();
        console.log("任务结束，已断连。");
    }
}

// 执行主程序
main();
