import EmotionSelector from './EmotionSelector';

export default function TweetCard({ index, tweet, selectedEmotion, onSelect }) {
  return (
    <div className="card tweet-card">
      <div className="tweet-index">Tweet {index} of 5</div>
      <p className="tweet-text">&ldquo;{tweet.text}&rdquo;</p>
      <EmotionSelector
        name={`tweet-${tweet.id}`}
        value={selectedEmotion}
        onChange={(emotion) => onSelect(tweet.id, emotion)}
      />
    </div>
  );
}
