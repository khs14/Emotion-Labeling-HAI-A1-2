import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { currentUser, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="center-page">
        <div className="spinner" />
      </div>
    );
  }
  if (currentUser) return <Navigate to="/instructions" replace />;

  return (
    <div className="center-page">
      <div className="container" style={{ maxWidth: 480, paddingTop: 0, paddingBottom: 0 }}>
        <h1>Emotion Labeling Study</h1>
        <p className="muted">
          A short research task: read a handful of tweets and tell us which of six basic
          emotions each one expresses. It takes about five minutes.
        </p>
        <p className="muted">
          Sign in with Google to begin. Your Google account is used only to identify you as a
          single participant (so we know who labeled what) — one account, one set of five tweets.
        </p>
        <button className="btn btn-primary btn-block" onClick={signInWithGoogle}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
