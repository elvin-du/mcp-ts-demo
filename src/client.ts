// 导入 Stdio 客户端传输层：它负责通过命令行启动并控制 MCP Server 进程
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
// 导入 MCP 客户端核心类：用于发起请求和处理响应
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

/**
 * MCP 原理：客户端连接器类
 * 它扮演了“翻译官”和“总线”的角色，将底层的 MCP 逻辑封装成 Host (LLM) 易于调用的接口
 */
export class McpClientConnector {
    private client: Client;             // MCP 协议的控制核心
    private transport: StdioClientTransport; // 与服务端通信的管道

    constructor(serverPath: string) {
        /**
         * 初始化传输层。在 MCP 模型中，客户端通过启动服务端可执行文件（如 node dist/server.js）
         * 来建立父子进程通信。这种方式无需网络端口，非常适合本地工具集成。
         */
        this.transport = new StdioClientTransport({
            command: "node",        // 运行环境
            args: [serverPath],      // 目标服务端脚本路径
        });

        /**
         * 初始化 Client 实例。在这里定义的 capabilities 决定了客户端支持哪些 MCP 功能
         * （如是否支持资源 roots、采样采样采样采样提示等）。
         */
        this.client = new Client(
            { name: "host-connector", version: "1.0.0" }, // 客户端标识
            { capabilities: {} } // 目前使用基础能力集
        );
    }

    /**
     * 发起连接。此过程中会执行 start() 启动子进程，并完成初始化握手阶段
     */
    async connect() {
        await this.client.connect(this.transport);
    }

    /**
     * 断开连接，优雅地关闭子进程
     */
    async disconnect() {
        await this.client.close();
    }

    /**
     * MCP 原理：工具发现与转换
     * 这是 MCP 项目最核心的能力之一：Host 不需要硬编码工具，而是动态获取。
     * 此方法将 MCP 标准格式的工具通过 listTools 获取后，转换为 OpenAI/DeepSeek 兼容的 
     * Function Calling (JSON Schema) 格式。
     */
    async getToolsForLlm() {
        // 请求服务端返回所有已注册的工具
        const response = await this.client.listTools();
        return response.tools.map((tool) => ({
            type: "function" as const, // LLM 下的函数类型标识
            function: {
                name: tool.name,       // 工具名直接映射为函数名
                description: tool.description ?? "", // 该描述是 AI 决定是否调用此工具的依据
                parameters: tool.inputSchema as any, // 输入 Schema 直接用于参数校验
            },
        }));
    }

    /**
     * 触发工具执行。当 LLM 生成一个调用请求时，Host 将参数传回此方法。
     * MCP 使用 callTool 发送请求，Server 执行后结果会传回并保持强类型。
     */
    async callTool(name: string, args: any) {
        return await this.client.callTool({
            name,            // 目标工具名
            arguments: args,  // AI 提取出的参数
        });
    }
}
