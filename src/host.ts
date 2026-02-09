// 导入 OpenAI SDK，用于与 DeepSeek API 通信（DeepSeek 兼容 OpenAI 标准）
import OpenAI from "openai";
// 导入我们自定义的 MCP 客户端连接器，它是 Host 与 MCP Server 的桥梁
import { McpClientConnector } from "./client.js";
// 导入路径和 URL 处理工具，用于在 ESM 模块中准确定位服务器脚本
import path from "path";
import { fileURLToPath } from "url";

// 获取当前模块的目录路径
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * MCP 原理：服务端定位
 * Host 需要知道 MCP Server 的位置。这里指向编译后的 dist/server.js。
 * 在生产环境中，这可能是一个 npm 包的 bin 命令或者一个远程 URL。
 */
const SERVER_PATH = path.join(__dirname, "../dist/server.js");

// 初始化 DeepSeek (OpenAI 兼容) 客户端
const deepseek = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // 从环境变量读取密钥，保证安全性
    baseURL: "https://api.deepseek.com",  // 指向 DeepSeek 的 API 地址
});

async function main() {
    console.log("正在启动 MCP 架构...");

    // 1. 初始化并连接 MCP 客户端
    const mcpConnector = new McpClientConnector(SERVER_PATH);
    await mcpConnector.connect(); // 这一步会启动 Server 进程并完成握手
    console.log("MCP Client 已连接到 Server");

    try {
        /**
         * 2. MCP 原理：动态工具注入
         * 这是 MCP 最强大的地方——Host 端不需要为每个工具手写代码。
         * 我们直接从 MCP Server 获取当前的工具定义，并即时转换为 LLM 的 tools 格式。
         */
        const mcpTools = await mcpConnector.getToolsForLlm();
        console.log("已获取并转换 MCP 工具:", mcpTools.map(t => t.function.name));

        // 定义对话消息流，初始包含系统提示词和用户请求
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: "system", content: "你是一个专业的助手。你可以使用工具来完成计算。" },
            { role: "user", content: "请问 12345 加 67890 等于多少？请使用工具计算。" },
        ];

        /**
         * 3. 第一次请求：意图识别与决策
         * 我们将消息和动态获取的 MCP 工具一起发送给 LLM。
         * LLM 会根据工具描述（Description）决定是否需要调用某个工具。
         */
        console.log("发送请求给 DeepSeek...");
        const response = await deepseek.chat.completions.create({
            model: "deepseek-chat", // 使用 DeepSeek 的对话模型
            messages,
            tools: mcpTools as OpenAI.Chat.Completions.ChatCompletionTool[], // 注入 MCP 转换后的工具
        });

        // 获取 LLM 的初步回复内容
        const message = response.choices[0]?.message;
        if (!message) return;

        // 将 AI 的回复（可能包含工具调用请求）放入历史记录
        messages.push(message as OpenAI.Chat.Completions.ChatCompletionMessageParam);

        /**
         * 4. MCP 原理：工具调度与执行 (The Loop)
         * 如果 AI 的 message 中包含 tool_calls，说明它“决定”使用我们的 MCP 工具。
         */
        if (message.tool_calls && message.tool_calls.length > 0) {
            for (const toolCall of message.tool_calls) {
                // 仅处理函数式调用（MCP 工具的核心基础）
                if (toolCall.type !== "function") continue;

                const name = toolCall.function.name; // 获取 AI 想调用的工具名
                const args = JSON.parse(toolCall.function.arguments); // 解析 AI 生成的入参

                console.log(`AI 决定调用工具: ${name}`, args);

                /**
                 * 核心环节：Host 通过 Client 向 MCP Server 请求执行具体逻辑。
                 * 这种架构实现了逻辑与 AI 端的解耦。
                 */
                const result = await mcpConnector.callTool(name, args);
                console.log("MCP Server 返回结果:", result.content);

                /**
                 * 5. MCP 原理：结果回传
                 * 根据 OpenAI 标准，我们需要以 'tool' 角色将结果返回给对话流。
                 * LLM 需要知道该结果对应的是哪个 tool_call_id。
                 */
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result.content), // 结果数据化
                } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam);
            }

            /**
             * 6. 第二次请求：生成最终答案
             * 现在对话流中包含了：1. AI 请求调用；2. 工具执行的结果。
             * 再次发送给 LLM，它会将工具结果整合为自然的回复。
             */
            console.log("带上工具结果再次请求 DeepSeek...");
            const finalResponse = await deepseek.chat.completions.create({
                model: "deepseek-chat",
                messages,
            });

            // 输出 AI 整合工具结果后的最终回复
            console.log("\n最终回答:", finalResponse.choices[0]?.message.content);
        } else {
            // 如果 AI 觉得自己不需要工具，则直接输出回复
            console.log("\nAI 直接回答:", message.content);
        }

    } catch (error) {
        console.error("执行出错:", error);
    } finally {
        /**
         * 7. 资源清理
         * 任务完成后，显式断开 MCP 连接，它会自动关闭 Server 的子进程，防止资源泄漏。
         */
        await mcpConnector.disconnect();
        console.log("任务结束，已断开连接。");
    }
}

// 执行主程序
main();
