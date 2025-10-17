"""Strands agent that uses RabbitMQ MCP server via stdio."""

from mcp import StdioServerParameters, stdio_client
from strands import Agent
from strands.tools.mcp import MCPClient

# Connect to RabbitMQ MCP server using stdio transport
stdio_mcp_client = MCPClient(
    lambda: stdio_client(
        StdioServerParameters(
            command="mcp-client-amqp-adaptor", 
            args=["--hostname",
                  "b-9560b8e1-3d33-4d91-9488-a3dc4a61dfe7.mq.us-east-1.amazonaws.com",
                  "--port",
                  "5671",
                  "--username",
                  "admin",
                  "--password",
                  "admintestrabbit",
                  "--useTLS",
                  "--serverName",
                  "RabbitMQMCP",
                  "--exchangeName",
                  "client-cluster-exchange"]
        )
    )
)

# Create an agent with MCP tools
with stdio_mcp_client:
    tools = stdio_mcp_client.list_tools_sync()
    agent = Agent(tools=tools)
    agent("what can you do?")
    while True:
        user_input = input("\nYou: ").strip()
        if not user_input or user_input.lower() in ["exit", "quit"]:
            break
        agent(user_input)
