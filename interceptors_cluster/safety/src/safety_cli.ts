#!/usr/bin/env node
import { InterceptorBase, MessageProcessStatus } from 'mcp-amqp-transport';

interface ToolCall {
    toolName: string;
    timestamp: number;
    arguments: any;
}

class SafetyInterceptor extends InterceptorBase {
    private toolCallsByClient: Map<string, ToolCall[]> = new Map();

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
        
        return [MessageProcessStatus.FORWARD];
    }

    async proccessMCPToClientMessage(message: any, headers?: any): Promise<[MessageProcessStatus, any?]> {
        return [MessageProcessStatus.FORWARD];
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
