import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { EMOTION_META } from '../utils/emotionMeta';

function formatTime(ts) {
  if (!ts?.toDate) return '';
  return ts.toDate().toLocaleString();
}

export default function PublicBoardPage() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'publicSubmissions'),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
      },
      (error) => {
        console.error('Public board error:', error);
        setRows([]);
      }
    );

    return unsubscribe;
  }, []);

  return (
    <div className="container">
      <h1>Participant board</h1>

      <p className="muted">
        This board shows which participant labeled each tweet and the
        emotion they selected. Dataset ground-truth labels are not shown.
      </p>

      {rows === null && (
        <div className="center-page" style={{ minHeight: '30vh' }}>
          <div className="spinner" />
        </div>
      )}

      {rows !== null && rows.length === 0 && (
        <div className="card">
          <p>No one has submitted labels yet — be the first!</p>
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Participant</th>
                <th>Tweet</th>
                <th>Participant Label</th>
                <th>Submitted</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.publicName}
                    {r.isAnonymous && (
                      <span className="muted"> (anonymous)</span>
                    )}
                  </td>

                  <td>
                    <span className="tweet-text">
                      &ldquo;{r.tweetText}&rdquo;
                    </span>
                  </td>

                  <td>
                    <span
                      className="emotion-tag"
                      style={{
                        background:
                          EMOTION_META[r.selectedEmotion]?.color,
                      }}
                    >
                      {r.selectedEmotion}
                    </span>
                  </td>

                  <td>{formatTime(r.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}