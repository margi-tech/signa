import { useState } from 'react';
import ReferenceHand from './ReferenceHand';
import { referenceMediaFor } from '../../data/reference-media';

function MotionIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <path
        d="M8.5 13.5V9.8a1.7 1.7 0 113.4 0v3.1m0 0V7.7a1.7 1.7 0 113.4 0v5.2m0 0V9.1a1.7 1.7 0 113.4 0v4.4m0 0v-2.1a1.7 1.7 0 113.4 0v5.5a7 7 0 01-14 0v-1.5a1.7 1.7 0 113.4 0v1.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 6l-2-2m20 2l2-2M4 11H1m26 0h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Preview comun pentru pose statice și imagini/GIF-uri ale semnelor dinamice.
 */
export default function ReferencePreview({ target, pose, className = '' }) {
  const media = referenceMediaFor(target);
  const [mediaFailed, setMediaFailed] = useState(false);
  const isVideo = /\.(mp4|webm|ogg)$/i.test(media ?? '');

  if (media && !mediaFailed) {
    if (isVideo) {
      return (
        <video
          src={media}
          autoPlay
          loop
          muted
          playsInline
          aria-label={`Demonstrație pentru semnul ${target}`}
          className={`object-contain ${className}`}
          onError={() => setMediaFailed(true)}
        />
      );
    }

    return (
      <img
        src={media}
        alt={`Demonstrație pentru semnul ${target}`}
        className={`object-contain ${className}`}
        onError={() => setMediaFailed(true)}
      />
    );
  }

  if (pose) {
    return <ReferenceHand pose={pose} className={className} theme="light" />;
  }

  return (
    <div className={`flex items-center justify-center text-ink-400 ${className}`} aria-label={`Semn dinamic ${target}`}>
      <MotionIcon />
    </div>
  );
}
