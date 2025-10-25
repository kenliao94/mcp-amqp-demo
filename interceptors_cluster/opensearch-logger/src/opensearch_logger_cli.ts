#!/usr/bin/env node
import { InterceptorBase, MessageProcessStatus } from 'mcp-amqp-transport';
import { Client } from '@opensearch-project/opensearch';

interface LogEntry {
    timestamp: string;
    direction: 'client-to-mcp' | 'mcp-to-client';
    message: any;
    messageId?: string | number;
    method?: string;
    headers?: any;
}

class OpenSearchLoggerInterceptor extends InterceptorBase {
    private client: Client;
    private indexName: string;

    constructor(config: any) {
        super(config);
        console.log("Starting OpenSearch logging interceptor");
        
        this.indexName = process.env.OPENSEARCH_INDEX || 'mcp-messages';
        const opensearchEndpoint = process.env.OPENSEARCH_ENDPOINT || 'http://opensearch-service:9200';

        this.client = new Client({
            node: opensearchEndpoint,
        });
    }

    async proccessClientToMCPMessage(message: any, headers?: any): Promise<MessageProcessStatus> {
        await this.logMessage(message, 'client-to-mcp', headers);
        console.log('\x1b[36m' + `Client -> MCP: ${JSON.stringify(message)}` + '\x1b[0m');
        if (headers) {
            console.log('\x1b[90m' + `Headers: ${JSON.stringify(headers)}` + '\x1b[0m')
        } else {
            console.log('\x1b[90m' + "Headers: empty" + '\x1b[0m')
        }
        return MessageProcessStatus.DROP;
    }

    async proccessMCPToClientMessage(message: any, headers?: any): Promise<MessageProcessStatus> {
        await this.logMessage(message, 'mcp-to-client', headers);
        console.log('\x1b[33m' + `MCP -> Client: ${JSON.stringify(message)}` + '\x1b[0m');
        if (headers) console.log('\x1b[90m' + `Headers: ${JSON.stringify(headers)}` + '\x1b[0m');
        return MessageProcessStatus.DROP;
    }

    private async logMessage(message: any, direction: 'client-to-mcp' | 'mcp-to-client', headers?: any): Promise<void> {
        try {
            const logEntry: LogEntry = {
                timestamp: new Date().toISOString(),
                direction,
                message,
                messageId: message.id,
                method: message.method,
                headers
            };

            await this.client.index({
                index: this.indexName,
                body: logEntry
            });
        } catch (error) {
            console.error('Failed to log message to OpenSearch:', error);
        }
    }
}

const args = process.argv.slice(2);

if (args.length < 2) {
    console.error('Usage: opensearch_logger_cli <inExchange> <outExchange>');
    process.exit(1);
}

const [inExchange, outExchange] = args;

const logger = new OpenSearchLoggerInterceptor({
    inExchange,
    outExchange
});

logger.start().then(() => {
    console.log(`OpenSearch logger started: ${inExchange} -> ${outExchange}`);
}).catch(error => {
    console.error('Failed to start OpenSearch logger:', error);
    process.exit(1);
});