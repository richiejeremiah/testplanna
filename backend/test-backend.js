/**
 * Backend Testing Script
 * Tests the main API endpoints and workflow functionality
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

// Test colors for terminal
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testHealthCheck() {
  log('\n📋 Testing Health Check Endpoint...', 'blue');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    log('✅ Health check passed', 'green');
    log(`   Status: ${response.data.status}`, 'green');
    return true;
  } catch (error) {
    log('❌ Health check failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testListWorkflows() {
  log('\n📋 Testing List Workflows Endpoint...', 'blue');
  try {
    const response = await axios.get(`${BASE_URL}/api/workflows`);
    log('✅ List workflows passed', 'green');
    log(`   Found ${response.data.length} workflows`, 'green');
    return true;
  } catch (error) {
    log('❌ List workflows failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGetWorkflow(workflowId) {
  log('\n📋 Testing Get Workflow Endpoint...', 'blue');
  try {
    const response = await axios.get(`${BASE_URL}/api/workflows/${workflowId}`);
    log('✅ Get workflow passed', 'green');
    log(`   Workflow ID: ${response.data.workflowId}`, 'green');
    log(`   Status: ${response.data.status}`, 'green');
    return true;
  } catch (error) {
    log('❌ Get workflow failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testRLMetrics() {
  log('\n📋 Testing RL Metrics Endpoint...', 'blue');
  try {
    const response = await axios.get(`${BASE_URL}/api/workflows/rl-metrics`);
    log('✅ RL metrics passed', 'green');
    log(`   Total workflows: ${response.data.metrics.totalWorkflows}`, 'green');
    log(`   High quality examples: ${response.data.metrics.highQualityExamples}`, 'green');
    return true;
  } catch (error) {
    log('❌ RL metrics failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testTriggerWorkflow() {
  log('\n📋 Testing Trigger Workflow Endpoint...', 'blue');
  try {
    const response = await axios.post(`${BASE_URL}/api/workflows/trigger`, {
      jiraTicketKey: 'TEST-001',
      prUrl: 'https://github.com/richiejeremiah/doclittle-platform',
      summary: 'Test workflow trigger'
    });
    log('✅ Trigger workflow passed', 'green');
    log(`   Workflow ID: ${response.data.workflowId}`, 'green');
    log(`   Jira Ticket: ${response.data.jiraTicketKey}`, 'green');
    return response.data.workflowId;
  } catch (error) {
    log('❌ Trigger workflow failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    if (error.response) {
      log(`   Response: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

async function runAllTests() {
  log('\n🧪 Starting Backend Tests...', 'blue');
  log('='.repeat(50), 'blue');

  const results = {
    health: false,
    listWorkflows: false,
    rlMetrics: false,
    triggerWorkflow: false
  };

  // Test 1: Health Check
  results.health = await testHealthCheck();

  if (!results.health) {
    log('\n❌ Server is not running. Please start the server with: npm start', 'red');
    return;
  }

  // Test 2: List Workflows
  results.listWorkflows = await testListWorkflows();

  // Test 3: RL Metrics
  results.rlMetrics = await testRLMetrics();

  // Test 4: Trigger Workflow (this will start a real workflow)
  const workflowId = await testTriggerWorkflow();
  results.triggerWorkflow = workflowId !== null;

  // Test 5: Get Workflow (if we have a workflow ID)
  if (workflowId) {
    // Wait a bit for workflow to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    await testGetWorkflow(workflowId);
  }

  // Summary
  log('\n' + '='.repeat(50), 'blue');
  log('📊 Test Summary:', 'blue');
  log(`   Health Check: ${results.health ? '✅' : '❌'}`, results.health ? 'green' : 'red');
  log(`   List Workflows: ${results.listWorkflows ? '✅' : '❌'}`, results.listWorkflows ? 'green' : 'red');
  log(`   RL Metrics: ${results.rlMetrics ? '✅' : '❌'}`, results.rlMetrics ? 'green' : 'red');
  log(`   Trigger Workflow: ${results.triggerWorkflow ? '✅' : '❌'}`, results.triggerWorkflow ? 'green' : 'red');

  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    log('\n🎉 All tests passed!', 'green');
  } else {
    log('\n⚠️  Some tests failed', 'yellow');
  }
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test runner error: ${error.message}`, 'red');
  process.exit(1);
});

