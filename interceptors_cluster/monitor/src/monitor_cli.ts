#!/usr/bin/env node
import { InterceptorBase, MessageProcessStatus } from 'mcp-amqp-transport';

class MonitorMessageInterceptor extends InterceptorBase {
    async proccessClientToMCPMessage(message: any): Promise<MessageProcessStatus> {
        console.log('\x1b[36mClient -> MCP Message:\x1b[0m', JSON.stringify(message));
        return MessageProcessStatus.SUCCEEDED_FORWARD;
    }

    async proccessMCPToClientMessage(message: any): Promise<MessageProcessStatus> {
        console.log('\x1b[33mMCP -> Client Message:\x1b[0m', JSON.stringify(message));
        return MessageProcessStatus.SUCCEEDED_FORWARD;
    }
}

const args = process.argv.slice(2);

if (args.length < 2) {
    console.error('Usage: monitor_cli <inExchange> <outExchange>');
    process.exit(1);
}

const [inExchange, outExchange] = args;

const monitor = new MonitorMessageInterceptor({
    inExchange,
    outExchange
});

monitor.start().then(() => {
    console.log(`Monitor started: ${inExchange} -> ${outExchange}`);
}).catch(error => {
    console.error('Failed to start monitor:', error);
    process.exit(1);
});
