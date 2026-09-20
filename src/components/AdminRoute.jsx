import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="center-page">
        <div className="spinner" />
      </div>
    );
  }
  if (!currentUser) return <Navigate to="/" replace />;
  if (!isAdmin) {
    return (
      <div className="container">
        <div className="banner banner-error">
          This account isn&rsquo;t on the admin list. Ask the study owner to add your email
          to VITE_ADMIN_EMAILS and to isAdminEmail() in firestore.rules.
        </div>
      </div>
    );
  }
  return children;
}
