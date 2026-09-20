import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, EMOTIONS } from '../firebase';
import { downloadCsv } from '../utils/csvExport';

function formatTime(ts) {
  if (!ts?.toDate) return '—';
  return ts.toDate().toLocaleString();
}

export default function AdminPage() {
  const [tab, setTab] = useState('overview');
  const [tweets, setTweets] = useState(null);
  const [participants, setParticipants] = useState(null);
  const [submissions, setSubmissions] = useState(null);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'tweets'), (snap) =>
      setTweets(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsub2 = onSnapshot(collection(db, 'participants'), (snap) =>
      setParticipants(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsub3 = onSnapshot(collection(db, 'submissions'), (snap) =>
      setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const loading = tweets === null || participants === null || submissions === null;
  if (loading) {
    return (
      <div className="center-page">
        <div className="spinner" />
      </div>
    );
  }

  const availableCount = tweets.filter((t) => t.status === 'available' && !t.lockedBy).length;
  const lockedCount = tweets.filter((t) => t.status === 'available' && !!t.lockedBy).length;
  const submittedCount = tweets.filter((t) => t.status === 'submitted').length;
  const agreementCount = submissions.filter((s) => s.selectedEmotion === s.trueLabel).length;
  const agreementPct = submissions.length ? Math.round((agreementCount / submissions.length) * 100) : 0;

  const perEmotion = EMOTIONS.map((emotion) => ({
    emotion,
    total: tweets.filter((t) => t.trueLabel === emotion).length,
    submitted: tweets.filter((t) => t.trueLabel === emotion && t.status === 'submitted').length,
  }));

  function exportSubmissionsCsv() {
    downloadCsv(
      'submissions.csv',
      submissions.map((s) => ({
        participantUid: s.participantUid,
        participantDisplayName: s.participantDisplayName,
        publicName: s.publicName,
        isAnonymous: s.isAnonymous,
        tweetId: s.tweetId,
        tweetText: s.tweetText,
        trueLabel: s.trueLabel,
        selectedEmotion: s.selectedEmotion,
        matchesGroundTruth: s.selectedEmotion === s.trueLabel,
        submittedAt: s.submittedAt?.toDate ? s.submittedAt.toDate().toISOString() : '',
      }))
    );
  }

  return (
    <div className="container-wide">
      <h1>Admin</h1>

      <div className="tabs">
        {['overview', 'participants', 'tweets', 'submissions'].map((t) => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="stat-grid">
            <div className="stat-box"><div className="stat-value">{tweets.length}</div><div className="stat-label">Total tweets</div></div>
            <div className="stat-box"><div className="stat-value">{availableCount}</div><div className="stat-label">Available (unlocked)</div></div>
            <div className="stat-box"><div className="stat-value">{lockedCount}</div><div className="stat-label">Currently assigned</div></div>
            <div className="stat-box"><div className="stat-value">{submittedCount}</div><div className="stat-label">Submitted</div></div>
            <div className="stat-box"><div className="stat-value">{participants.length}</div><div className="stat-label">Participants</div></div>
            <div className="stat-box"><div className="stat-value">{agreementPct}%</div><div className="stat-label">Agreement with dataset label</div></div>
          </div>

          <h3>Coverage by emotion</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Emotion</th><th>Total in pool</th><th>Submitted</th></tr></thead>
              <tbody>
                {perEmotion.map((row) => (
                  <tr key={row.emotion}>
                    <td style={{ textTransform: 'capitalize' }}>{row.emotion}</td>
                    <td>{row.total}</td>
                    <td>{row.submitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'participants' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Public name</th><th>Completed</th><th>Last activity</th></tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id}>
                  <td>{p.displayName}</td>
                  <td>{p.email}</td>
                  <td>{p.publicName || '—'}{p.isAnonymous ? ' (anon)' : ''}</td>
                  <td>{p.completedCount || 0}</td>
                  <td>{formatTime(p.lastSubmittedAt || p.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'tweets' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Text</th><th>Ground truth</th><th>Status</th><th>Locked by</th><th>Submitted label</th></tr>
            </thead>
            <tbody>
              {tweets.map((t) => (
                <tr key={t.id}>
                  <td style={{ whiteSpace: 'normal', minWidth: 280 }}>{t.text}</td>
                  <td style={{ textTransform: 'capitalize' }}>{t.trueLabel}</td>
                  <td>{t.status}</td>
                  <td>{t.lockedBy || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{t.submittedLabel || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'submissions' && (
        <>
          <button className="btn btn-primary" style={{ marginBottom: '1rem' }} onClick={exportSubmissionsCsv}>
            Export CSV
          </button>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Participant</th><th>Tweet</th><th>Ground truth</th><th>Selected</th><th>Match</th><th>Submitted at</th></tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.participantDisplayName}</td>
                    <td style={{ whiteSpace: 'normal', minWidth: 260 }}>{s.tweetText}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.trueLabel}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.selectedEmotion}</td>
                    <td>{s.selectedEmotion === s.trueLabel ? '✓' : '✗'}</td>
                    <td>{formatTime(s.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
