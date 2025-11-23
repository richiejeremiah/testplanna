/**
 * Example Backend Graph Generator
 * This shows how to transform code analysis into ReactFlow-compatible data
 */

// Example: Code analysis result (what you'd get from AST parser)
const codeAnalysis = {
  files: [
    {
      path: 'src/utils.js',
      functions: [
        { name: 'calculateTotal', line: 10, complexity: 3 },
        { name: 'formatDate', line: 25, complexity: 1 }
      ]
    }
  ],
  tests: [
    {
      path: 'src/utils.test.js',
      covers: ['calculateTotal'], // Which functions it tests
      status: 'pass',
      coverage: 90
    }
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Review utils.js tests',
      status: 'in-progress',
      linkedFiles: ['src/utils.js'],
      linkedTests: ['src/utils.test.js']
    }
  ]
};

/**
 * Generate ReactFlow graph data from code analysis
 */
function generateGraph(analysis) {
  const nodes = [];
  const edges = [];
  let xPos = 0;
  let yPos = 0;

  // Create file nodes
  analysis.files.forEach((file) => {
    nodes.push({
      id: `file-${file.path}`,
      type: 'file',
      position: { x: xPos, y: yPos },
      data: {
        label: file.path.split('/').pop(),
        path: file.path,
        functionCount: file.functions.length
      }
    });

    // Create function nodes (children of file)
    file.functions.forEach((func, idx) => {
      const funcId = `fn-${file.path}-${func.name}`;
      nodes.push({
        id: funcId,
        type: 'function',
        position: { x: xPos + 200, y: yPos + (idx * 80) },
        data: {
          label: `${func.name}()`,
          complexity: func.complexity,
          file: file.path,
          line: func.line
        }
      });

      // Edge: file contains function
      edges.push({
        id: `edge-${file.path}-${func.name}`,
        source: `file-${file.path}`,
        target: funcId,
        type: 'contains',
        animated: false
      });
    });

    yPos += 150;
  });

  // Create test nodes
  analysis.tests.forEach((test, idx) => {
    const testId = `test-${test.path}`;
    nodes.push({
      id: testId,
      type: 'test',
      position: { x: 600, y: idx * 150 },
      data: {
        label: test.path.split('/').pop(),
        path: test.path,
        status: test.status,
        coverage: test.coverage
      }
    });

    // Edges: functions covered by tests
    test.covers.forEach((funcName) => {
      const funcNode = nodes.find(n => 
        n.type === 'function' && n.data.label.includes(funcName)
      );
      if (funcNode) {
        edges.push({
          id: `edge-${funcNode.id}-${testId}`,
          source: funcNode.id,
          target: testId,
          type: 'covered-by',
          animated: true, // Animated edge shows coverage visually
          style: { stroke: test.status === 'pass' ? '#10b981' : '#ef4444' }
        });
      }
    });
  });

  // Create task nodes
  analysis.tasks.forEach((task, idx) => {
    const taskId = `task-${task.id}`;
    nodes.push({
      id: taskId,
      type: 'task',
      position: { x: 300, y: 400 + (idx * 120) },
      data: {
        label: task.title,
        status: task.status,
        priority: task.priority || 'medium'
      }
    });

    // Edges: tasks linked to files/tests
    task.linkedFiles?.forEach((filePath) => {
      const fileNode = nodes.find(n => n.data.path === filePath);
      if (fileNode) {
        edges.push({
          id: `edge-${fileNode.id}-${taskId}`,
          source: fileNode.id,
          target: taskId,
          type: 'tracked-by',
          style: { stroke: '#6366f1', strokeDasharray: '5,5' }
        });
      }
    });

    task.linkedTests?.forEach((testPath) => {
      const testNode = nodes.find(n => n.data.path === testPath);
      if (testNode) {
        edges.push({
          id: `edge-${testNode.id}-${taskId}`,
          source: testNode.id,
          target: taskId,
          type: 'tracked-by',
          style: { stroke: '#6366f1', strokeDasharray: '5,5' }
        });
      }
    });
  });

  return { nodes, edges };
}

// Example usage
const graphData = generateGraph(codeAnalysis);

console.log('Generated ReactFlow Graph:');
console.log(JSON.stringify(graphData, null, 2));

/**
 * Example API endpoint (Express.js style)
 */
function getWorkflowGraph(req, res) {
  // 1. Analyze code (using your code analysis service)
  const analysis = analyzeCodebase(req.query.scope || 'workspace');
  
  // 2. Generate graph
  const graph = generateGraph(analysis);
  
  // 3. Apply layout algorithm (optional - can do on frontend too)
  const laidOutGraph = applyLayout(graph, 'hierarchical');
  
  // 4. Return ReactFlow format
  res.json(laidOutGraph);
}

// This is what your frontend would receive:
module.exports = {
  generateGraph,
  exampleOutput: graphData
};



