/**
 * Logger utility for workflow debugging
 * Provides colored, timestamped logs for easy terminal tracking
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Status colors
  success: '\x1b[32m',  // Green
  error: '\x1b[31m',     // Red
  warning: '\x1b[33m',  // Yellow
  info: '\x1b[36m',     // Cyan
  step: '\x1b[35m',     // Magenta
  api: '\x1b[34m',      // Blue
};

class Logger {
  constructor(workflowId = null) {
    this.workflowId = workflowId;
  }

  getTimestamp() {
    return new Date().toISOString().split('T')[1].split('.')[0];
  }

  format(message, color = colors.reset) {
    const timestamp = this.getTimestamp();
    const workflow = this.workflowId ? `[${this.workflowId.substring(0, 8)}]` : '';
    return `${colors.dim}${timestamp}${colors.reset} ${workflow} ${color}${message}${colors.reset}`;
  }

  // Workflow-level logs
  workflow(message) {
    console.log(this.format(`🔄 WORKFLOW: ${message}`, colors.step));
  }

  step(message) {
    console.log(this.format(`  ⚡ STEP: ${message}`, colors.info));
  }

  success(message) {
    console.log(this.format(`  ✅ SUCCESS: ${message}`, colors.success));
  }

  error(message, error = null) {
    console.error(this.format(`  ❌ ERROR: ${message}`, colors.error));
    if (error) {
      console.error(this.format(`     ${error.message || error}`, colors.error));
      if (error.stack) {
        console.error(this.format(`     ${error.stack.split('\n')[1]?.trim()}`, colors.dim));
      }
    }
  }

  warning(message) {
    console.warn(this.format(`  ⚠️  WARNING: ${message}`, colors.warning));
  }

  // API-level logs
  apiCall(service, method, url) {
    console.log(this.format(`  📡 API [${service}]: ${method} ${url}`, colors.api));
  }

  apiResponse(service, status, data = null) {
    const statusColor = status >= 200 && status < 300 ? colors.success : colors.error;
    console.log(this.format(`  📥 API [${service}]: ${status}`, statusColor));
    if (data && typeof data === 'object') {
      console.log(this.format(`     Response: ${JSON.stringify(data).substring(0, 100)}...`, colors.dim));
    }
  }

  // Data logs
  data(key, value) {
    const displayValue = typeof value === 'object' 
      ? JSON.stringify(value).substring(0, 100) 
      : String(value).substring(0, 100);
    console.log(this.format(`  📊 DATA [${key}]: ${displayValue}`, colors.dim));
  }

  // Separator
  separator() {
    console.log(this.format('─'.repeat(60), colors.dim));
  }
}

export default Logger;

