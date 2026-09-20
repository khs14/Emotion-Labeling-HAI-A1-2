import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { withdrawSubmission } from '../hooks/useAssignment';
import { EMOTION_META } from '../utils/emotionMeta';
import { TWEETS_PER_PARTICIPANT } from '../firebase';

export default function MySubmissionsPage() {
  const { currentUser } = useAuth();
  const [submissions, setSubmissions] = useState(null); // null = loading
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'submissions'),
      where('participantUid', '==', currentUser.uid),
      orderBy('submittedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [currentUser.uid]);

  async function handleWithdraw(submission) {
    setWithdrawingId(submission.id);
    setError(null);
    try {
      await withdrawSubmission({
        uid: currentUser.uid,
        submissionId: submission.id,
        tweetId: submission.tweetId,
      });
    } catch (err) {
      setError(err.message || 'Could not withdraw this submission.');
    } finally {
      setWithdrawingId(null);
    }
  }

  if (submissions === null) {
    return (
      <div className="center-page">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="container">
      <h1>My submissions</h1>
      <p className="muted">
        You&rsquo;ve submitted {submissions.length} of {TWEETS_PER_PARTICIPANT} labels. Withdrawing a
        label deletes your record for that tweet and returns it to the shared pool.
      </p>

      {error && <div className="banner banner-error">{error}</div>}

      {submissions.length === 0 && (
        <div className="card">
          <p>You haven&rsquo;t submitted any labels yet.</p>
          <Link className="btn btn-primary" to="/task">Go label tweets</Link>
        </div>
      )}

      {submissions.map((s) => (
        <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
          <div>
            <p className="tweet-text" style={{ fontSize: '1rem' }}>&ldquo;{s.tweetText}&rdquo;</p>
            <span className="emotion-tag" style={{ background: EMOTION_META[s.selectedEmotion]?.color }}>
              {s.selectedEmotion}
            </span>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Shown on board as &ldquo;{s.publicName}&rdquo;
            </p>
          </div>
          <button
            className="btn btn-danger btn-sm"
            disabled={withdrawingId === s.id}
            onClick={() => handleWithdraw(s)}
          >
            {withdrawingId === s.id ? 'Withdrawing…' : 'Withdraw'}
          </button>
        </div>
      ))}

      {submissions.length > 0 && submissions.length < TWEETS_PER_PARTICIPANT && (
        <div className="banner banner-info">
          You have {TWEETS_PER_PARTICIPANT - submissions.length} tweet(s) left to label.{' '}
          <Link to="/task">Continue labeling</Link>
        </div>
      )}
    </div>
  );
}
