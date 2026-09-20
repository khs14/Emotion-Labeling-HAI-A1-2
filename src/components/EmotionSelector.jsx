import { EMOTIONS } from '../firebase';
import { EMOTION_META } from '../utils/emotionMeta';

export default function EmotionSelector({ name, value, onChange }) {
  return (
    <div className="emotion-selector" role="radiogroup" aria-label="Select an emotion">
      {EMOTIONS.map((emotion) => {
        const selected = value === emotion;
        return (
          <label
            key={emotion}
            className={`emotion-option${selected ? ' selected' : ''}`}
            style={selected ? { background: EMOTION_META[emotion].color, borderColor: EMOTION_META[emotion].color } : undefined}
          >
            <input
              type="radio"
              name={name}
              value={emotion}
              checked={selected}
              onChange={() => onChange(emotion)}
            />
            {emotion}
          </label>
        );
      })}
    </div>
  );
}
