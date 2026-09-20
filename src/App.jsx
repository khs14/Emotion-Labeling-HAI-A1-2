import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LoginPage from './pages/LoginPage';
import InstructionsPage from './pages/InstructionsPage';
import LabelingPage from './pages/LabelingPage';
import ConfirmationPage from './pages/ConfirmationPage';
import MySubmissionsPage from './pages/MySubmissionsPage';
import PublicBoardPage from './pages/PublicBoardPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/instructions" element={<ProtectedRoute><InstructionsPage /></ProtectedRoute>} />
          <Route path="/task" element={<ProtectedRoute><LabelingPage /></ProtectedRoute>} />
          <Route path="/confirmation" element={<ProtectedRoute><ConfirmationPage /></ProtectedRoute>} />
          <Route path="/my-submissions" element={<ProtectedRoute><MySubmissionsPage /></ProtectedRoute>} />
          <Route path="/board" element={<ProtectedRoute><PublicBoardPage /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        </Routes>
      </div>
      <footer className="study-footer">Emotion Labeling Study — built for a human-AI interaction labeling assignment.</footer>
    </div>
  );
}
