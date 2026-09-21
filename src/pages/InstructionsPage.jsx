import { useNavigate } from 'react-router-dom';
import { EMOTIONS, TWEETS_PER_PARTICIPANT } from '../firebase';
import { EMOTION_META } from '../utils/emotionMeta';

export default function InstructionsPage() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <h1>Instructions</h1>
      <p>
        You&rsquo;ll be shown <strong>{TWEETS_PER_PARTICIPANT} tweets</strong>, chosen at random from a
        shared pool. For each one, read it carefully and pick the single emotion you think the
        person who wrote it was most likely feeling. There are no trick questions — go with your
        first honest read.
      </p>

      <h3>The six categories</h3>
      <div className="emotion-grid">
        {EMOTIONS.map((emotion) => (
          <div
            key={emotion}
            className="emotion-info-card"
            style={{ '--accent-color': EMOTION_META[emotion].color }}
          >
            <h4>{emotion}</h4>
            <p>{EMOTION_META[emotion].description}</p>
          </div>
        ))}
      </div>

      <h3>How the task works</h3>
      <ul>
        <li>Sign-in is one Google account per participant — you&rsquo;ll always come back to the same 5 tweets until you submit.</li>
        <li>Pick exactly one emotion per tweet, then submit all five at once.</li>
        <li>Once submitted, a tweet is marked as labeled and removed from the shared pool so nobody else has to label it again.</li>
        <li>If you leave without submitting, your five tweets return to the shared pool automatically after a while, so nothing gets stuck.</li>
        <li>You can withdraw any of your own submitted labels afterward from the &ldquo;My submissions&rdquo; page — the tweet simply goes back into the pool.</li>
        <li>When you submit, you&rsquo;ll choose whether the public participant board shows your real name or a randomly generated anonymous name.</li>
      </ul>

      <button className="btn btn-primary" onClick={() => navigate('/task')}>
        Start labeling
      </button>
    </div>
  );
}
