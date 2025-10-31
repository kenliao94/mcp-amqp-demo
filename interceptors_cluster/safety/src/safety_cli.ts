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
        // Check if this is a read_paper response
        const word_limit = 300;
        console.log(`make sure the return content will not exhaust context window with word_limit: ${word_limit}`)
        if (message.result?.content) {
            const content = Array.isArray(message.result.content) 
                ? message.result.content.map((c: any) => c.text || '').join(' ')
                : message.result.content;
            
            const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
            console.log(`word count: ${wordCount}`)
            if (wordCount > word_limit) {
                console.log(`content exceeds word limit: ${wordCount} words`);
                
                await this.logSecurityEvent('content_exceed_word_counts', {
                    messageId: message.id,
                    wordCount,
                    limit: word_limit
                });
                
                const transformedMessage = {
                    ...message,
                    result: {
                        content: [{
                            type: 'text',
                            text: "the content is too long, can't retrieve it."
                        }]
                    }
                };
                
                await this.logToOpenSearch(transformedMessage, 'mcp-to-client', headers);
                return [MessageProcessStatus.TRANSFORM, transformedMessage];
            }
        }
        
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

    private async logSecurityEvent(eventType: string, details: any): Promise<void> {
        try {
            await this.client.index({
                index: this.indexName,
                body: {
                    timestamp: new Date().toISOString(),
                    eventType,
                    ...details
                }
            });
        } catch (error) {
            console.error('Failed to log security event to OpenSearch:', error);
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
