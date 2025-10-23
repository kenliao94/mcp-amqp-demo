#!/usr/bin/env node
import { InterceptorBase, MessageProcessStatus } from 'mcp-amqp-transport';
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';

class MonitorMessageInterceptor extends InterceptorBase {
    private cloudwatch: CloudWatchLogsClient;
    private logGroupName: string;
    private logStreamName: string;
    private sequenceToken?: string;

    constructor(config: any) {
        super(config);
        console.log("Starting CloudWatch monitoring interceptor")
        this.cloudwatch = new CloudWatchLogsClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.logGroupName = process.env.LOG_GROUP_NAME || '/mcp/monitor';
        this.logStreamName = `monitor-${Date.now()}`;
        this.initLogStream();
    }

    private async initLogStream() {
        try {
            await this.cloudwatch.send(new CreateLogStreamCommand({
                logGroupName: this.logGroupName,
                logStreamName: this.logStreamName
            }));
        } catch (error: any) {
            if (error.name !== 'ResourceAlreadyExistsException') {
                console.error('Failed to create log stream:', error);
            }
        }
    }

    private async logToCloudWatch(message: string) {
        try {
            const command = new PutLogEventsCommand({
                logGroupName: this.logGroupName,
                logStreamName: this.logStreamName,
                logEvents: [{
                    message,
                    timestamp: Date.now()
                }],
                sequenceToken: this.sequenceToken
            });
            const response = await this.cloudwatch.send(command);
            this.sequenceToken = response.nextSequenceToken;
        } catch (error) {
            console.error('Failed to log to CloudWatch:', error);
        }
    }

    async proccessClientToMCPMessage(message: any): Promise<MessageProcessStatus> {
        const logMessage = `Client -> MCP: ${JSON.stringify(message)}`;
        console.log('\x1b[36m' + logMessage + '\x1b[0m');
        await this.logToCloudWatch(logMessage);
        return MessageProcessStatus.FORWARD;
    }

    async proccessMCPToClientMessage(message: any): Promise<MessageProcessStatus> {
        const logMessage = `MCP -> Client: ${JSON.stringify(message)}`;
        console.log('\x1b[33m' + logMessage + '\x1b[0m');
        await this.logToCloudWatch(logMessage);
        return MessageProcessStatus.FORWARD;
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
