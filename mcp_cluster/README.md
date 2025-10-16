# MCP Cluster Setup

Kubernetes cluster running two instances of amq-mcp-server-rabbit.

## Prerequisites
- Docker
- kubectl
- minikube or kind

## Setup

1. **Build Docker images:**
```bash
docker build -t mcp-amqp:latest .
docker build -f Dockerfile.amqp-transport -t mcp-amqp-transport:latest ../..
```

2. **Start cluster (minikube):**
```bash
minikube start
eval $(minikube docker-env)
docker build -t mcp-amqp:latest .
docker build -f Dockerfile.amqp-transport -t mcp-amqp-transport:latest ../..
```

3. **Deploy:**
```bash
kubectl apply -f k8s/
```

4. **Check status:**
```bash
kubectl get pods
kubectl logs -f deployment/mcp-server
kubectl logs -f deployment/mcp-client
```

5. **Cleanup:**
```bash
kubectl delete -f k8s/
```
