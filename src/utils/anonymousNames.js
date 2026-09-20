const ADJECTIVES = [
  'Curious', 'Quiet', 'Steady', 'Bright', 'Gentle', 'Bold', 'Calm', 'Swift',
  'Careful', 'Sunny', 'Clever', 'Patient', 'Quick', 'Kind', 'Sharp', 'Wandering',
];

const NOUNS = [
  'Falcon', 'Otter', 'Maple', 'Comet', 'Harbor', 'Lantern', 'Sparrow', 'Cedar',
  'Compass', 'Meadow', 'Heron', 'Ember', 'River', 'Willow', 'Beacon', 'Fox',
];

/** Generates a random, human-readable anonymous name like "Curious Falcon 482". */
export function generateAnonymousName() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(100 + Math.random() * 900);
  return `${adjective} ${noun} ${number}`;
}
