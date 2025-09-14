# VelocityMesh REST API Documentation

The VelocityMesh REST API provides programmatic access to all platform features including workflow management, AI services, integrations, and analytics.

## Base URL

```
Production: https://api.velocitymesh.com
Development: http://localhost:3000
```

## Authentication

All API requests require authentication using Bearer tokens:

```http
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "experienceLevel": "intermediate"
  }
}
```

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Free Plan**: 100 requests per minute
- **Pro Plan**: 1000 requests per minute  
- **Enterprise Plan**: 10000 requests per minute

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
```

## Error Handling

The API uses conventional HTTP response codes and returns error details in JSON format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Core Endpoints

### Workflows

#### List Workflows
```http
GET /api/workflows
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `status` - Filter by status: `active`, `paused`, `draft`
- `search` - Search by name or description

**Response:**
```json
{
  "workflows": [
    {
      "id": "wf-123",
      "name": "Customer Onboarding",
      "description": "Automated customer onboarding process",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "executionCount": 156,
      "successRate": 94.2,
      "avgExecutionTime": 2.4,
      "cognitiveComplexity": 42,
      "nodes": 8,
      "integrations": ["slack", "email", "stripe"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### Create Workflow
```http
POST /api/workflows
Content-Type: application/json

{
  "name": "New Customer Welcome",
  "description": "Welcome sequence for new customers",
  "nodes": [
    {
      "id": "node-1",
      "type": "trigger",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "User Registered",
        "event": "user.created"
      }
    },
    {
      "id": "node-2", 
      "type": "email",
      "position": { "x": 300, "y": 100 },
      "data": {
        "label": "Welcome Email",
        "template": "welcome-email",
        "to": "{{user.email}}",
        "subject": "Welcome to VelocityMesh!"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2"
    }
  ]
}
```

#### Get Workflow
```http
GET /api/workflows/{id}
```

#### Update Workflow
```http
PUT /api/workflows/{id}
```

#### Delete Workflow
```http
DELETE /api/workflows/{id}
```

#### Execute Workflow
```http
POST /api/workflows/{id}/execute
Content-Type: application/json

{
  "input": {
    "user": {
      "email": "john@example.com",
      "name": "John Doe"
    }
  }
}
```

**Response:**
```json
{
  "executionId": "exec-456",
  "status": "running",
  "startedAt": "2024-01-15T14:30:00Z",
  "input": {
    "user": {
      "email": "john@example.com", 
      "name": "John Doe"
    }
  }
}
```

#### Get Execution History
```http
GET /api/workflows/{id}/executions
```

### AI Services

#### Generate Workflow from Natural Language
```http
POST /api/ai/workflow-generation
Content-Type: application/json

{
  "description": "Send Slack notification when new user signs up and add them to our newsletter",
  "userContext": {
    "experienceLevel": "intermediate",
    "favoriteIntegrations": ["slack", "mailchimp"],
    "industry": "saas"
  }
}
```

**Response:**
```json
{
  "workflow": {
    "name": "New User Onboarding",
    "description": "Automated flow for new user signup notifications",
    "confidence": 0.94,
    "nodes": [
      {
        "id": "trigger-1",
        "type": "trigger",
        "data": {
          "label": "User Signup",
          "event": "user.created"
        }
      },
      {
        "id": "slack-1", 
        "type": "slack",
        "data": {
          "label": "Notify Team",
          "channel": "#new-users",
          "message": "New user signed up: {{user.name}} ({{user.email}})"
        }
      },
      {
        "id": "mailchimp-1",
        "type": "mailchimp", 
        "data": {
          "label": "Add to Newsletter",
          "list": "main-newsletter",
          "email": "{{user.email}}"
        }
      }
    ],
    "edges": [
      { "source": "trigger-1", "target": "slack-1" },
      { "source": "trigger-1", "target": "mailchimp-1" }
    ]
  },
  "explanation": "I've created a workflow that triggers when a user signs up, then simultaneously sends a Slack notification and adds them to your newsletter.",
  "suggestions": [
    "Consider adding a welcome email step",
    "You might want to add a delay before the newsletter signup"
  ]
}
```

#### Optimize Workflow
```http
POST /api/ai/optimize
Content-Type: application/json

{
  "workflowId": "wf-123",
  "optimizationGoals": ["performance", "cost", "reliability"]
}
```

#### Get AI Suggestions
```http
GET /api/ai/suggestions?workflowId=wf-123&context=node-editing
```

### Integrations

#### List Available Integrations
```http
GET /api/integrations/catalog
```

**Response:**
```json
{
  "integrations": [
    {
      "id": "slack",
      "name": "Slack", 
      "description": "Team communication platform",
      "category": "communication",
      "actions": ["send-message", "create-channel", "invite-user"],
      "triggers": ["message-posted", "user-joined"],
      "authType": "oauth2",
      "popularity": 95,
      "documentation": "https://docs.velocitymesh.com/integrations/slack"
    }
  ],
  "categories": [
    "communication",
    "productivity", 
    "marketing",
    "sales",
    "development"
  ]
}
```

#### Configure Integration
```http
POST /api/integrations
Content-Type: application/json

{
  "type": "slack",
  "name": "Company Slack",
  "config": {
    "workspaceId": "T1234567",
    "botToken": "xoxb-your-bot-token"
  }
}
```

#### Test Integration
```http
POST /api/integrations/{id}/test
```

#### Execute Integration Action
```http
POST /api/integrations/execute
Content-Type: application/json

{
  "integration": "slack",
  "action": "send-message",
  "params": {
    "channel": "#general",
    "text": "Hello from VelocityMesh!",
    "username": "VelocityMesh Bot"
  }
}
```

### Analytics & Monitoring

#### Dashboard Metrics
```http
GET /api/dashboard/metrics
```

**Response:**
```json
{
  "overview": {
    "totalWorkflows": 24,
    "activeWorkflows": 18,
    "totalExecutions": 1547,
    "successRate": 96.2,
    "avgExecutionTime": 2.1,
    "computeHoursUsed": 45.2,
    "computeHoursLimit": 100
  },
  "recentExecutions": [
    {
      "workflowId": "wf-123",
      "workflowName": "Customer Onboarding", 
      "status": "success",
      "duration": 1.8,
      "timestamp": "2024-01-15T16:45:00Z"
    }
  ],
  "cognitiveLoadAnalysis": {
    "avgComplexity": 38.4,
    "distribution": {
      "low": 12,
      "medium": 8, 
      "high": 3,
      "critical": 1
    },
    "recommendations": [
      "Consider simplifying workflow wf-789 (complexity: 87)",
      "Great job keeping most workflows under 50 complexity"
    ]
  }
}
```

#### Execution Logs
```http
GET /api/executions/{executionId}/logs
```

#### Performance Metrics
```http
GET /api/metrics/performance?timeRange=24h&workflowId=wf-123
```

### User Management

#### Get User Profile
```http
GET /api/auth/profile
```

#### Update User Profile
```http
PUT /api/auth/profile
Content-Type: application/json

{
  "name": "John Doe",
  "experienceLevel": "expert",
  "preferences": {
    "theme": "dark",
    "density": "compact",
    "animations": true,
    "advancedFeatures": true
  }
}
```

#### Update Adaptive Interface Settings
```http
PUT /api/users/interface-settings
Content-Type: application/json

{
  "experienceLevel": "expert",
  "preferences": {
    "density": "compact",
    "showAdvancedFeatures": true,
    "enableShortcuts": true
  }
}
```

### Billing & Subscription

#### Get Current Subscription
```http
GET /api/billing/subscription
```

#### Create Checkout Session
```http
POST /api/billing/create-checkout
Content-Type: application/json

{
  "priceId": "price_professional_monthly",
  "successUrl": "https://velocitymesh.com/billing/success",
  "cancelUrl": "https://velocitymesh.com/billing/cancel"
}
```

#### Get Usage Statistics
```http
GET /api/billing/usage
```

## Webhooks

VelocityMesh can send webhooks for important events:

### Webhook Events

- `workflow.execution.started`
- `workflow.execution.completed`
- `workflow.execution.failed`
- `user.subscription.updated`
- `integration.connection.lost`

### Webhook Payload Example

```json
{
  "event": "workflow.execution.completed",
  "timestamp": "2024-01-15T16:45:00Z",
  "data": {
    "workflowId": "wf-123",
    "executionId": "exec-456",
    "status": "success",
    "duration": 2.1,
    "userId": "user-789"
  }
}
```

### Configuring Webhooks

```http
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/velocitymesh",
  "events": ["workflow.execution.completed", "workflow.execution.failed"],
  "secret": "your-webhook-secret"
}
```

## SDKs and Libraries

### JavaScript/TypeScript SDK

```bash
npm install @velocitymesh/sdk
```

```typescript
import { VelocityMesh } from '@velocitymesh/sdk';

const vm = new VelocityMesh({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.velocitymesh.com'
});

// Create workflow from natural language
const workflow = await vm.ai.generateWorkflow({
  description: "Send welcome email when user signs up",
  userContext: { experienceLevel: 'intermediate' }
});

// Execute workflow
const execution = await vm.workflows.execute(workflow.id, {
  user: { email: 'john@example.com', name: 'John' }
});
```

### Python SDK

```bash
pip install velocitymesh
```

```python
from velocitymesh import VelocityMesh

vm = VelocityMesh(api_key="your-api-key")

# List workflows
workflows = vm.workflows.list()

# Generate workflow with AI
workflow = vm.ai.generate_workflow(
    description="Process customer support tickets",
    user_context={"experience_level": "expert"}
)
```

## Rate Limiting Best Practices

1. **Implement exponential backoff** for 429 responses
2. **Cache responses** where appropriate
3. **Use webhooks** instead of polling
4. **Batch requests** when possible
5. **Monitor rate limit headers**

## API Changelog

### v1.2.0 (2024-01-15)
- Added cognitive load analysis endpoints
- Enhanced AI workflow generation
- Improved error responses

### v1.1.0 (2024-01-01)  
- Added webhook support
- New billing endpoints
- Performance improvements

### v1.0.0 (2023-12-01)
- Initial API release
- Core workflow management
- Basic AI features

---

For more information, visit our [Developer Portal](https://developers.velocitymesh.com) or join our [Discord community](https://discord.gg/velocitymesh).