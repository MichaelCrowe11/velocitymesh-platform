import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

/**
 * Comprehensive API Load Testing for VelocityMesh Backend
 * Tests all critical endpoints under various load conditions
 */

// Custom metrics
export let errorRate = new Rate('errors');

// Test configuration
export let options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 10 },
    { duration: '5m', target: 50 },
    { duration: '10m', target: 100 },
    
    // Peak load
    { duration: '10m', target: 200 },
    { duration: '5m', target: 500 }, // Spike test
    { duration: '10m', target: 200 },
    
    // Ramp down
    { duration: '5m', target: 50 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    'http_req_failed': ['rate<0.01'], // Error rate under 1%
    'errors': ['rate<0.05'], // Custom error rate under 5%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

// Test data
const testUsers = [
  { email: 'test1@example.com', password: 'password123' },
  { email: 'test2@example.com', password: 'password123' },
  { email: 'test3@example.com', password: 'password123' },
];

let authTokens = [];

export function setup() {
  // Setup test data
  console.log('Setting up performance test data...');
  
  // Create test users and get auth tokens
  testUsers.forEach((user, index) => {
    let response = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.status === 200) {
      const data = JSON.parse(response.body);
      authTokens.push(data.token);
    } else {
      console.warn(`Failed to authenticate user ${index}: ${response.status}`);
    }
  });
  
  return { authTokens };
}

export default function(data) {
  // Select random auth token
  const authToken = data.authTokens[Math.floor(Math.random() * data.authTokens.length)];
  const headers = authToken ? {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  } : {
    'Content-Type': 'application/json'
  };

  // Test scenarios with different weights
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    // 30% - Read operations (most common)
    testReadOperations(headers);
  } else if (scenario < 0.5) {
    // 20% - Workflow operations
    testWorkflowOperations(headers);
  } else if (scenario < 0.7) {
    // 20% - Integration operations
    testIntegrationOperations(headers);
  } else if (scenario < 0.9) {
    // 20% - AI operations
    testAIOperations(headers);
  } else {
    // 10% - Heavy operations
    testHeavyOperations(headers);
  }
  
  sleep(Math.random() * 2 + 1); // Random sleep 1-3 seconds
}

function testReadOperations(headers) {
  let response;
  
  // Health check
  response = http.get(`${BASE_URL}/api/health`);
  check(response, {
    'Health check status is 200': (r) => r.status === 200,
    'Health check response time < 100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);
  
  // Dashboard data
  response = http.get(`${BASE_URL}/api/dashboard`, { headers });
  check(response, {
    'Dashboard status is 200': (r) => r.status === 200,
    'Dashboard response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);
  
  // User profile
  response = http.get(`${BASE_URL}/api/auth/profile`, { headers });
  check(response, {
    'Profile status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  }) || errorRate.add(1);
}

function testWorkflowOperations(headers) {
  let response;
  
  // List workflows
  response = http.get(`${BASE_URL}/api/workflows`, { headers });
  check(response, {
    'Workflows list status is 200': (r) => r.status === 200,
    'Workflows list response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);
  
  if (response.status === 200) {
    const workflows = JSON.parse(response.body);
    
    if (workflows.length > 0) {
      // Get specific workflow
      const workflowId = workflows[0].id;
      response = http.get(`${BASE_URL}/api/workflows/${workflowId}`, { headers });
      check(response, {
        'Workflow detail status is 200': (r) => r.status === 200,
        'Workflow detail response time < 400ms': (r) => r.timings.duration < 400,
      }) || errorRate.add(1);
      
      // Get workflow executions
      response = http.get(`${BASE_URL}/api/workflows/${workflowId}/executions`, { headers });
      check(response, {
        'Workflow executions status is 200': (r) => r.status === 200,
      }) || errorRate.add(1);
    }
  }
}

function testIntegrationOperations(headers) {
  let response;
  
  // List integrations
  response = http.get(`${BASE_URL}/api/integrations`, { headers });
  check(response, {
    'Integrations list status is 200': (r) => r.status === 200,
    'Integrations list response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);
  
  // Test HTTP integration
  const testPayload = {
    type: 'http',
    action: 'GET',
    params: {
      url: 'https://httpbin.org/status/200',
      timeout: 5000
    }
  };
  
  response = http.post(`${BASE_URL}/api/integrations/execute`, JSON.stringify(testPayload), { headers });
  check(response, {
    'Integration execute status is 200': (r) => r.status === 200,
    'Integration execute response time < 6s': (r) => r.timings.duration < 6000,
  }) || errorRate.add(1);
}

function testAIOperations(headers) {
  let response;
  
  // AI workflow suggestion
  const aiPayload = {
    description: 'Create a workflow that sends daily reports via email',
    userExperience: 'intermediate'
  };
  
  response = http.post(`${BASE_URL}/api/ai/workflow-suggestion`, JSON.stringify(aiPayload), { headers });
  check(response, {
    'AI suggestion status is 200': (r) => r.status === 200,
    'AI suggestion response time < 10s': (r) => r.timings.duration < 10000,
  }) || errorRate.add(1);
  
  // AI optimization
  const optimizationPayload = {
    workflowId: 'test-workflow-id',
    nodes: [
      { id: '1', type: 'trigger' },
      { id: '2', type: 'email' }
    ],
    edges: [
      { id: '1', source: '1', target: '2' }
    ]
  };
  
  response = http.post(`${BASE_URL}/api/ai/optimize`, JSON.stringify(optimizationPayload), { headers });
  check(response, {
    'AI optimization status is 200': (r) => r.status === 200,
    'AI optimization response time < 8s': (r) => r.timings.duration < 8000,
  }) || errorRate.add(1);
}

function testHeavyOperations(headers) {
  let response;
  
  // Create workflow (write operation)
  const workflowPayload = {
    name: `Test Workflow ${Date.now()}`,
    description: 'Performance test workflow',
    nodes: [
      { id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Start' } },
      { id: '2', type: 'email', position: { x: 300, y: 100 }, data: { label: 'Send Email' } }
    ],
    edges: [
      { id: '1', source: '1', target: '2' }
    ]
  };
  
  response = http.post(`${BASE_URL}/api/workflows`, JSON.stringify(workflowPayload), { headers });
  check(response, {
    'Workflow create status is 201': (r) => r.status === 201,
    'Workflow create response time < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  
  if (response.status === 201) {
    const workflow = JSON.parse(response.body);
    
    // Execute workflow
    response = http.post(`${BASE_URL}/api/workflows/${workflow.id}/execute`, '{}', { headers });
    check(response, {
      'Workflow execute status is 200': (r) => r.status === 200,
      'Workflow execute response time < 5s': (r) => r.timings.duration < 5000,
    }) || errorRate.add(1);
    
    // Delete workflow (cleanup)
    response = http.del(`${BASE_URL}/api/workflows/${workflow.id}`, null, { headers });
    check(response, {
      'Workflow delete status is 204': (r) => r.status === 204,
    }) || errorRate.add(1);
  }
}

export function teardown(data) {
  // Cleanup test data
  console.log('Cleaning up performance test data...');
}