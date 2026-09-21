import { Link, useLocation, Navigate } from 'react-router-dom';

export default function ConfirmationPage() {
  const location = useLocation();
  const publicName = location.state?.publicName;

  // Guard against someone navigating here directly without just submitting.
  if (!publicName) return <Navigate to="/task" replace />;

  return (
    <div className="center-page">
      <div
        className="container"
        style={{
          maxWidth: 480,
          paddingTop: 0,
          paddingBottom: 0,
        }}
      >
        <h1>Thank you!</h1>

        <p>
          Your 5 labels have been recorded under the name{' '}
          <strong>{publicName}</strong>.
        </p>

        <p className="muted">
          Those tweets are now marked as labeled and removed from the shared
          pool, so no one else needs to label them.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link className="btn btn-primary" to="/my-submissions">
            View my submissions
          </Link>

          <Link className="btn" to="/board">
            See the participant board
          </Link>
        </div>

        <p
          className="muted"
          style={{
            marginTop: '1.5rem',
            fontSize: '0.9rem',
            textAlign: 'center',
          }}
        >
          If you recently withdrew a submission, please wait{' '}
          <strong>2 minutes</strong>, then reload the Task page to receive a
          new assignment.
        </p>
      </div>
    </div>
  );
} 