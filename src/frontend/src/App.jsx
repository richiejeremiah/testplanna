import { useState } from 'react';
import Dashboard from './components/Dashboard';
import WorkflowCanvas from './components/WorkflowCanvas';
import RLMetricsDashboard from './components/RLMetricsDashboard';

function App() {
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'workflow', or 'rl-metrics'

  return (
    <div className="h-screen w-screen flex flex-col">
      {view === 'dashboard' ? (
        <Dashboard 
          onStartWorkflow={(workflowId) => {
            setCurrentWorkflowId(workflowId);
            setView('workflow');
          }}
          onViewRLMetrics={() => setView('rl-metrics')}
        />
      ) : view === 'rl-metrics' ? (
        <RLMetricsDashboard onBack={() => setView('dashboard')} />
      ) : (
        <WorkflowCanvas 
          workflowId={currentWorkflowId}
          onBack={() => setView('dashboard')}
        />
      )}
    </div>
  );
}

export default App;

