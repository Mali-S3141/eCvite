import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PrintPreviewPage from './pages/PrintPreviewPage'; // עמוד חדש שניצור

function App() {
  // useLocation גורם ל-App להתעדכן בכל ניווט, כדי ש-loggedIn ייבדק מחדש אחרי login/logout
  useLocation();
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
