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
      <div
        className="container"
        style={{ maxWidth: 480, paddingTop: 0, paddingBottom: 0 }}
      >
        <h1>Emotion Labeling Study</h1>

        <p className="muted">
          This is an internal course assignment for{' '}
          <strong>CSE 594: Human-AI Interaction &amp; Systems</strong>, a
          graduate-level course at{' '}
          <a
            href="https://cse.engin.umich.edu/"
            target="_blank"
            rel="noopener noreferrer"
          >
            the University of Michigan
          </a>
          .
        </p>

        <p className="muted">
          In this short research task, you will read a handful of tweets and
          identify which of six basic emotions each one expresses. It takes
          about five minutes.
        </p>

        <p className="muted">
          Participation is voluntary. You may withdraw your submission at any
          time through the participant portal. When viewing your results on the
          participant board, you can also choose whether your name is displayed
          or your submission appears anonymously.
        </p>

        <p className="muted">
          Sign in with Google to begin. Your Google account is used only to
          identify you as a single participant, so we know which tweets you
          labeled (one account, one set of five tweets).
        </p>

        <button
          className="btn btn-primary btn-block"
          onClick={signInWithGoogle}
        >
          Sign in with Google
        </button>

        <p
          className="muted"
          style={{
            marginTop: 24,
            fontSize: '0.9rem',
            textAlign: 'center',
          }}
        >
          Questions, issues, or need clarification? Contact{' '}
          <a href="mailto:kaushs@umich.edu">kaushs@umich.edu</a>.
        </p>
      </div>
    </div>
  );
}
