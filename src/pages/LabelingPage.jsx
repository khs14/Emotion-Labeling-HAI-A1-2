import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { fetchOrCreateAssignment, submitAllLabels } from '../hooks/useAssignment';
import { generateAnonymousName } from '../utils/anonymousNames';
import TweetCard from '../components/TweetCard';

export default function LabelingPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading'); // loading | ready | already-completed | error
  const [tweets, setTweets] = useState([]);
  const [labels, setLabels] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [anonName, setAnonName] = useState(generateAnonymousName());
  const [nameChoice, setNameChoice] = useState('real'); // 'real' | 'anonymous'

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      setError(null);
      try {
        const participantRef = doc(db, 'participants', currentUser.uid);
        const participantSnap = await getDoc(participantRef);
        const participant = participantSnap.exists() ? participantSnap.data() : {};
        const hasActiveAssignment = (participant.assignment?.tweetIds || []).length > 0;

        if (participant.hasCompletedAtLeastOne && !hasActiveAssignment) {
          if (!cancelled) setStatus('already-completed');
          return;
        }

        const assignedTweets = await fetchOrCreateAssignment(currentUser.uid);
        if (!cancelled) {
          setTweets(assignedTweets);
          setStatus('ready');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Something went wrong while assigning tweets.');
          setStatus('error');
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentUser.uid]);

  function selectLabel(tweetId, emotion) {
    setLabels((prev) => ({ ...prev, [tweetId]: emotion }));
  }

  const allSelected = tweets.length > 0 && tweets.every((t) => labels[t.id]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const publicName = nameChoice === 'real' ? (currentUser.displayName || 'Participant') : anonName;
      await submitAllLabels({
        uid: currentUser.uid,
        participantDisplayName: currentUser.displayName || 'Participant',
        tweetIds: tweets.map((t) => t.id),
        labelsByTweetId: labels,
        publicName,
        isAnonymous: nameChoice === 'anonymous',
      });
      navigate('/confirmation', { state: { publicName } });
    } catch (err) {
      setError(err.message || 'Could not submit your labels. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="center-page">
        <div className="spinner" />
      </div>
    );
  }

  if (status === 'already-completed') {
    return (
      <div className="container">
        <h1>You&rsquo;re all set</h1>
        <p>You&rsquo;ve already submitted labels for your assigned tweets. Thank you!</p>
        <p>
          <Link to="/my-submissions">View or withdraw your submissions</Link> ·{' '}
          <Link to="/board">See the participant board</Link>
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container">
        <div className="banner banner-error">{error}</div>
        <button className="btn" onClick={() => window.location.reload()}>Try again</button>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Label these {tweets.length} tweets</h1>
      <p className="muted">Pick the single emotion that best fits each tweet, then submit all at once.</p>

      {error && <div className="banner banner-error">{error}</div>}

      {tweets.map((tweet, i) => (
        <TweetCard
          key={tweet.id}
          index={i + 1}
          tweet={tweet}
          selectedEmotion={labels[tweet.id]}
          onSelect={selectLabel}
        />
      ))}

      <div className="card">
        <h3>Before you submit</h3>
        <p className="muted">How should you appear on the public participant board?</p>
        <div className="name-choice">
          <label className={nameChoice === 'real' ? 'selected' : ''}>
            <input
              type="radio"
              name="nameChoice"
              checked={nameChoice === 'real'}
              onChange={() => setNameChoice('real')}
            />
            Use my real name ({currentUser.displayName})
          </label>
          <label className={nameChoice === 'anonymous' ? 'selected' : ''}>
            <input
              type="radio"
              name="nameChoice"
              checked={nameChoice === 'anonymous'}
              onChange={() => setNameChoice('anonymous')}
            />
            Use a generated anonymous name: <strong>&ldquo;{anonName}&rdquo;</strong>
            {nameChoice === 'anonymous' && (
              <button
                type="button"
                className="btn btn-sm"
                style={{ marginLeft: 'auto' }}
                onClick={(e) => { e.preventDefault(); setAnonName(generateAnonymousName()); }}
              >
                Shuffle
              </button>
            )}
          </label>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <button
            className="btn btn-primary btn-block"
            disabled={!allSelected || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting…' : `Submit all ${tweets.length} labels`}
          </button>
          {!allSelected && (
            <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              Select an emotion for every tweet to enable submission.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
