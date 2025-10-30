#!/usr/bin/env node
import { InterceptorBase, MessageProcessStatus } from 'mcp-amqp-transport';
import { Client } from '@opensearch-project/opensearch';

interface ToolCall {
    toolName: string;
    timestamp: number;
    arguments: any;
}

class SafetyInterceptor extends InterceptorBase {
    private toolCallsByClient: Map<string, ToolCall[]> = new Map();
    private client: Client;
    private indexName: string;

    constructor(config: any) {
        super(config);
        console.log("Starting Safety interceptor with OpenSearch");
        
        this.indexName = process.env.OPENSEARCH_INDEX || 'mcp-security';
        const opensearchEndpoint = process.env.OPENSEARCH_ENDPOINT || 'http://opensearch-service:9200';

        this.client = new Client({
            node: opensearchEndpoint,
        });
    }

    async proccessClientToMCPMessage(message: any, headers?: any): Promise<[MessageProcessStatus, any?]> {
        if (message.method === 'tools/call') {
            const clientId = message.params?.clientId || 'unknown';
            const toolName = message.params?.name;
            
            if (!this.toolCallsByClient.has(clientId)) {
                this.toolCallsByClient.set(clientId, []);
            }
            
            this.toolCallsByClient.get(clientId)!.push({
                toolName,
                timestamp: Date.now(),
                arguments: message.params?.arguments
            });
            
            console.log(`[${clientId}] Tool called: ${toolName}`);
            console.log(`Total calls by ${clientId}: ${this.toolCallsByClient.get(clientId)!.length}`);
        }
        
        await this.logToOpenSearch(message, 'client-to-mcp', headers);
        return [MessageProcessStatus.FORWARD];
    }

    async proccessMCPToClientMessage(message: any, headers?: any): Promise<[MessageProcessStatus, any?]> {
        await this.logToOpenSearch(message, 'mcp-to-client', headers);
        return [MessageProcessStatus.FORWARD];
    }

    private async logToOpenSearch(message: any, direction: 'client-to-mcp' | 'mcp-to-client', headers?: any): Promise<void> {
        try {
            await this.client.index({
                index: this.indexName,
                body: {
                    timestamp: new Date().toISOString(),
                    direction,
                    message,
                    messageId: message.id,
                    method: message.method,
                    headers
                }
            });
        } catch (error) {
            console.error('Failed to log to OpenSearch:', error);
        }
    }
}

const args = process.argv.slice(2);

if (args.length < 2) {
    console.error('Usage: safety_cli <inExchange> <outExchange>');
    process.exit(1);
}

const [inExchange, outExchange] = args;

const safety = new SafetyInterceptor({
    inExchange,
    outExchange
});

safety.start().then(() => {
    console.log(`Safety interceptor started: ${inExchange} -> ${outExchange}`);
}).catch(error => {
    console.error('Failed to start safety interceptor:', error);
    process.exit(1);
});
