/**
 * OPTIONAL bonus function. The app works fully without deploying this —
 * the client already treats a lock older than 20 minutes as free when it
 * queries for available tweets (see src/hooks/useAssignment.js). This
 * scheduled function is just a belt-and-suspenders cleanup so abandoned
 * locks don't linger indefinitely in the `tweets` collection, and it's a
 * concrete example of the "Firebase Cloud Functions" backend-logic option
 * mentioned in the assignment brief.
 *
 * Deploy with: firebase deploy --only functions
 * Requires the Blaze (pay-as-you-go) billing plan on your Firebase project.
 */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const STALE_LOCK_MS = 20 * 60 * 1000;

exports.releaseStaleLocks = onSchedule('every 15 minutes', async () => {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - STALE_LOCK_MS);
  const snap = await db
    .collection('tweets')
    .where('status', '==', 'available')
    .where('lockedAt', '<', cutoff)
    .get();

  if (snap.empty) {
    console.log('No stale locks to release.');
    return;
  }

  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, { lockedBy: null, lockedAt: null });
  });
  await batch.commit();
  console.log(`Released ${snap.size} stale lock(s).`);
});
