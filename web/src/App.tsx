import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { fetchPublicSiteName } from './api/public';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import MyFiles from './pages/MyFiles';
import PublicSquare from './pages/PublicSquare';
import ShareView from './pages/ShareView';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-bg flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-linear-purple border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && !user?.is_admin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const { fetchUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    fetchPublicSiteName().then((name) => {
      if (name) document.title = `${name} · zhizi - files`;
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
    }
  }, []);
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/s/:code" element={<ShareView />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<MyFiles />} />
        <Route path="square" element={<PublicSquare />} />
        <Route path="settings" element={<Settings />} />
        <Route path="admin" element={
          <ProtectedRoute adminOnly>
            <Admin />
          </ProtectedRoute>
        } />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
