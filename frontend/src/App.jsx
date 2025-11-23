import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import WorkflowCanvas from './components/WorkflowCanvas';
import WorkflowBoard from './components/WorkflowBoard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DashboardWrapper />} />
        <Route path="/board" element={<WorkflowBoardWrapper />} />
        <Route path="/workflow/:workflowId" element={<WorkflowCanvasWrapper />} />
      </Routes>
    </Router>
  );
}

// Wrapper for Dashboard to handle props
function DashboardWrapper() {
  const navigate = useNavigate();
  
  const handleStartWorkflow = (workflowId) => {
    // Navigate to workflow canvas
    navigate(`/workflow/${workflowId}`);
  };

  return (
    <Dashboard 
      onStartWorkflow={handleStartWorkflow}
    />
  );
}

// Wrapper for WorkflowCanvas
function WorkflowCanvasWrapper() {
  const { workflowId } = useParams();
  return <WorkflowCanvas workflowId={workflowId} />;
}

// Wrapper for WorkflowBoard
function WorkflowBoardWrapper() {
  const navigate = useNavigate();
  
  const handleStartWorkflow = (workflowId) => {
    navigate(`/workflow/${workflowId}`);
  };

  return <WorkflowBoard onStartWorkflow={handleStartWorkflow} />;
}

export default App;

