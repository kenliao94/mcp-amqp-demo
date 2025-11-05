"""Strands agent that uses RabbitMQ MCP server via stdio."""

import os
from mcp import StdioServerParameters, stdio_client
from strands import Agent
from strands.tools.mcp import MCPClient

hostname = os.getenv("AMQP_HOSTNAME")
port = os.getenv("AMQP_PORT")
username = os.getenv("AMQP_USERNAME")
password = os.getenv("AMQP_PASSWORD")

firecrawl_mcp_client = MCPClient(
    lambda: stdio_client(
        StdioServerParameters(
            command="mcp-client-amqp-adaptor", 
            args=["--hostname", hostname,
                  "--port", port,
                  "--username", username,
                  "--password", password,
                  "--useTLS",
                  "--serverName", "firecrawlMCP",
                  "--exchangeName", "client-cluster-exchange"]
        )
    )
)

arxiv_mcp_client = MCPClient(
    lambda: stdio_client(
        StdioServerParameters(
            command="mcp-client-amqp-adaptor", 
            args=["--hostname", hostname,
                  "--port", port,
                  "--username", username,
                  "--password", password,
                  "--useTLS",
                  "--serverName", "ArxivMCP",
                  "--exchangeName", "client-cluster-exchange"]
        )
    )
)

# Create an agent with MCP tools
with firecrawl_mcp_client:
    with arxiv_mcp_client:
        tools = firecrawl_mcp_client.list_tools_sync() + arxiv_mcp_client.list_tools_sync()
        agent = Agent(tools=tools)
        agent("what can you do?")
        while True:
            user_input = input("\nYou: ").strip()
            if not user_input or user_input.lower() in ["exit", "quit"]:
                break
            agent(user_input)
