# MCP Cluster Demo

AI agentic system for performing academic research using mcp-amqp-transport framework

## Architecture

<img width="765" height="540" alt="image" src="https://github.com/user-attachments/assets/e3616bb4-b6c4-4bcf-baca-55a22c20e7e1" />



**Interceptor Pipeline:**
1. **Analytics** → Logging the messages to Opensearch for analytics
2. **Safety** → Rate limiting + content filtering

**MCP Servers:**
- Firecrawl (web scraping)
- Arxiv (academic papers)

## Quick Start

```bash
# Set up Amazon MQ for RabbitMQ broker
# 1. Go to AWS Console → Amazon MQ → Create broker
# 2. Select RabbitMQ engine
# 3. Choose deployment mode (Single-instance for dev, Cluster for production)
# 4. Configure broker (name, instance type, username/password)
# 5. Set network access (Public)
# 6. Note the broker endpoint and credentials

# Or you can install RabbitMQ locally https://www.rabbitmq.com/docs/download

# Install the library for running the adaptor locally
npm install -g @aws/mcp-amqp-transport

# Configure AWS CLI for Bedrock access
aws configure
# Ensure your IAM user/role has the right permission

# Start Kubernetes
minikube start
eval $(minikube docker-env)

# Create required secrets
kubectl create secret generic amqp-secret --from-literal=AMQP_PASSWORD=your_password
kubectl create secret generic firecrawl-secret --from-literal=FIRECRAWL_API_KEY=your_api_key

# Build and deploy MCP servers
cd mcp_cluster
docker build -f Dockerfile.amqp-transport -t mcp-amqp-transport:latest .
kubectl apply -f k8s/

# Build and deploy interceptors
cd ../interceptors_cluster
docker build -f Dockerfile.monitor -t monitor-interceptor:latest .
docker build -f Dockerfile.safety -t safety-interceptor:latest .
docker build -f Dockerfile.opensearch-logger -t opensearch-logger:latest .
kubectl apply -f k8s_storage/
kubectl apply -f k8s/

# Run agent locally
cd ../agent
export AMQP_HOSTNAME=<your_hostname, ex. b-9560b8e1-3d33-4d91-9488-a3dc4a61dfe7.mq.us-east-1.amazonaws.com>
export AMQP_PORT=<the AMQP or AMQPS port, ex. 5671>
export AMQP_USERNAME=<your_username>
export AMQP_PASSWORD=<your_password>
uv sync
uv run agent.py
```

## Configuration

Update ConfigMaps with RabbitMQ credentials:
- `mcp_cluster/k8s/amqp-config.yaml`
- `interceptors_cluster/k8s/*-config.yaml`

## Monitoring

```bash
kubectl get pods
kubectl logs -f deployment/safety-interceptor
kubectl port-forward service/opensearch-dashboards 5601:5601
```

## Features

- **Fault Tolerance**: Message persistence prevents data loss
- **Horizontal Scaling**: Add servers by binding queues to exchanges
- **Security**: 20 calls/client limit, 600 word response limit
- **Observability**: CloudWatch + OpenSearch logging
- **Analytics**: Token counting and message indexing

## Cleanup

```bash
kubectl delete -f interceptors_cluster/k8s/
kubectl delete -f mcp_cluster/k8s/
minikube stop
```
