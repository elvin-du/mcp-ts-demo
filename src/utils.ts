import OpenAI from "openai";

/**
 * 注意：
 * 运行时请使用 node --env-file=.env 或者 npx ts-node 来加载环境变量。
 * 如果直接运行 ts-node，请确保命令为：
 * npx ts-node --env-file=.env src/utils.ts
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "sk-or-v1-xxx";
console.log("正在使用 API Key:", OPENROUTER_API_KEY.substring(0, 10) + "...");

// 定义兼容 OpenRouter 的消息类型
type OpenRouterMessage = {
    role: 'user' | 'assistant' | 'system';
    content: string | null;
    reasoning_details?: any;
    refusal?: any;
};

async function runReasoningTest() {
    console.log("正在执行 OpenRouter Reasoning 测试...");

    try {
        // 第一次 API 调用 (Pony 模型支持推理)
        const res1 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "openrouter/pony-alpha",
                "messages": [
                    {
                        "role": "user",
                        "content": "How many r's are in the word 'strawberry'?"
                    }
                ],
                "reasoning": { "enabled": true }
            })
        });

        if (!res1.ok) {
            const errorData = await res1.json();
            throw new Error(`请求失败 (${res1.status}): ${JSON.stringify(errorData)}`);
        }

        const result1 = await res1.json();
        const assistantMsg = result1.choices[0].message as OpenRouterMessage;

        console.log("第一次回复内容:", assistantMsg.content);
        if (assistantMsg.reasoning_details) {
            console.log("获取到逻辑推理详情。");
        }

        // 构造后续对话
        const messages: OpenRouterMessage[] = [
            {
                role: 'user',
                content: "How many r's are in the word 'strawberry'?",
            },
            {
                role: 'assistant',
                content: assistantMsg.content,
                reasoning_details: assistantMsg.reasoning_details, // 传回原始推理详情以保持思考链
            },
            {
                role: 'user',
                content: "Are you sure? Think carefully.",
            },
        ];

        // 第二次 API 调用
        const res2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "model": "openrouter/pony-alpha",
                "messages": messages
            })
        });

        if (!res2.ok) throw new Error(`第二次请求失败: ${res2.statusText}`);

        const result2 = await res2.json();
        console.log("\n最终回复:", result2.choices[0].message.content);

    } catch (error) {
        console.error("测试过程中出错:", error);
    }
}

// 执行测试
runReasoningTest();
