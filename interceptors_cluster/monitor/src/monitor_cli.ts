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

if (args.length < 3) {
    console.error('Usage: monitor_cli <hostname> <inExchange> <outExchange> [port] [username] [password] [useTLS]');
    process.exit(1);
}

const [hostname, inExchange, outExchange, port, username, password, useTLS] = args;

const monitor = new MonitorMessageInterceptor({
    hostname,
    port: port ? parseInt(port) : undefined,
    username,
    password,
    useTLS: useTLS === 'true',
    inExchange,
    outExchange
});

monitor.start().then(() => {
    console.log(`Monitor started: ${hostname} (${inExchange} -> ${outExchange})`);
}).catch(error => {
    console.error('Failed to start monitor:', error);
    process.exit(1);
});
