import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PrintPreviewPage from './pages/PrintPreviewPage'; // עמוד חדש שניצור

function App() {
  const loggedIn = Boolean(localStorage.getItem('user'));

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={loggedIn ? <DashboardPage /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to={loggedIn ? '/' : '/login'} replace />} />

      {/* הוספת הנתיב החדש */}
      <Route path="/print-preview" element={<PrintPreviewPage />} />
      <Route path="*" element={<Navigate to={loggedIn ? '/' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
