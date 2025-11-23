/**
 * Logger - Simple logging utility for workflows
 */
class Logger {
  constructor(workflowId = 'unknown') {
    this.workflowId = workflowId;
  }

  step(message) {
    console.log(`\n[${this.workflowId}] 📍 ${message}`);
  }

  data(label, value) {
    console.log(`[${this.workflowId}]   ${label}: ${value}`);
  }

  success(message) {
    console.log(`[${this.workflowId}] ✅ ${message}`);
  }

  error(message, error = null) {
    console.error(`[${this.workflowId}] ❌ ${message}`);
    if (error) {
      console.error(error);
    }
  }

  warning(message) {
    console.warn(`[${this.workflowId}] ⚠️  ${message}`);
  }

  info(message) {
    console.log(`[${this.workflowId}] ℹ️  ${message}`);
  }

  workflow(message) {
    console.log(`\n[${this.workflowId}] 🔄 ${message}`);
  }

  separator() {
    console.log(`[${this.workflowId}] ${'='.repeat(60)}`);
  }

  apiCall(service, method, description) {
    console.log(`[${this.workflowId}] 🔌 ${service} ${method}: ${description}`);
  }

  apiResponse(service, status, data = {}) {
    const statusEmoji = status >= 200 && status < 300 ? '✅' : '❌';
    console.log(`[${this.workflowId}] ${statusEmoji} ${service} Response: ${status}`, data);
  }
}

export default Logger;

