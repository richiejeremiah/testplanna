import mongoose from 'mongoose';

/**
 * Immutable Audit Log - Write-once logs for anti-gaming
 * Prevents manipulation of reward signals and critical metrics
 */
const auditLogSchema = new mongoose.Schema({
  workflowId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true // Cannot be changed after creation
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'codeRabbitReview',
      'testExecution',
      'rewardComputation',
      'workflowStateChange',
      'metricUpdate'
    ]
  },
  actor: {
    type: String,
    default: 'system' // 'system', 'user', 'api'
  },
  // Snapshot of critical data at time of event
  snapshot: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  // What changed (for state changes)
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Hash of snapshot for integrity verification
  integrityHash: {
    type: String,
    required: true
  },
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: false, // We use our own timestamp
  // Prevent updates and deletes
  strict: 'throw'
});

// Index for efficient queries
auditLogSchema.index({ workflowId: 1, timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });

// Prevent updates and deletes
auditLogSchema.pre('save', function(next) {
  if (!this.isNew) {
    throw new Error('Audit logs are immutable and cannot be updated');
  }
  next();
});

auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs are immutable and cannot be updated');
});

auditLogSchema.pre('findOneAndDelete', function() {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

auditLogSchema.pre('deleteOne', function() {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

auditLogSchema.pre('deleteMany', function() {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

// Method to compute integrity hash
auditLogSchema.methods.computeHash = function() {
  const crypto = require('crypto');
  const data = JSON.stringify({
    workflowId: this.workflowId,
    timestamp: this.timestamp,
    eventType: this.eventType,
    snapshot: this.snapshot
  });
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Static method to verify integrity
auditLogSchema.statics.verifyIntegrity = function(log) {
  const computedHash = log.computeHash();
  return computedHash === log.integrityHash;
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;

