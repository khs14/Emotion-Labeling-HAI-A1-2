import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db, TWEETS_PER_PARTICIPANT } from '../firebase';

// A locked-but-unsubmitted tweet is released back to the general pool after
// this long, so an abandoned session never permanently removes a tweet.
const STALE_LOCK_MS = 20 * 60 * 1000; // 20 minutes
const MAX_ATTEMPTS = 6;

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[j], a[i]] = [a[i], a[j]];
  }
  return a;
}

function isLockFree(tweet, uid) {
  if (!tweet.lockedBy) return true;
  if (tweet.lockedBy === uid) return true;
  const lockedAtMs = tweet.lockedAt?.toMillis
    ? tweet.lockedAt.toMillis()
    : 0;
  return Date.now() - lockedAtMs > STALE_LOCK_MS;
}

async function fetchTweetsByIds(ids) {
  const snaps = await Promise.all(
    ids.map((id) => getDoc(doc(db, 'tweets', id)))
  );

  return snaps
    .filter((s) => s.exists())
    .map((s) => ({ id: s.id, ...s.data() }));
}

/**
 * Returns the participant's current tweet assignment (creating/topping it up
 * to TWEETS_PER_PARTICIPANT via a safe transaction if needed) and returns it.
 *
 * The client Firestore SDK can only `transaction.get()` specific document
 * references, not run a query inside a transaction. So candidates are
 * queried *outside* the transaction, then re-validated and locked *inside*
 * the transaction by reference. If another participant grabbed one of the
 * same candidates in between (a write conflict), we retry with a fresh
 * query rather than failing outright.
 */
export async function fetchOrCreateAssignment(uid) {
  const participantRef = doc(db, 'participants', uid);
  const participantSnap = await getDoc(participantRef);
  const participant = participantSnap.exists()
    ? participantSnap.data()
    : {};

  const alreadyHave = participant.assignment?.tweetIds || [];

  if (alreadyHave.length >= TWEETS_PER_PARTICIPANT) {
    return fetchTweetsByIds(
      alreadyHave.slice(0, TWEETS_PER_PARTICIPANT)
    );
  }

  const needed =
    TWEETS_PER_PARTICIPANT - alreadyHave.length;

  let lastError = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const poolSnap = await getDocs(
        query(
          collection(db, 'tweets'),
          where('status', '==', 'available')
        )
      );

      const candidates = poolSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((t) => !alreadyHave.includes(t.id))
        .filter((t) => isLockFree(t, uid));

      if (candidates.length < needed) {
        const err = new Error(
          'Not enough unassigned tweets remain in the pool right now. Please try again shortly or contact the study admin.'
        );
        err.code = 'NOT_ENOUGH_TWEETS';
        throw err;
      }

      const picked = shuffle(candidates).slice(0, needed);
      const newIds = picked.map((t) => t.id);

      await runTransaction(db, async (transaction) => {
        const refs = newIds.map((id) =>
          doc(db, 'tweets', id)
        );

        const snaps = [];

        for (const ref of refs) {
          snaps.push(await transaction.get(ref));
        }

        for (const snap of snaps) {
          const data = snap.data();

          if (
            !data ||
            data.status !== 'available' ||
            !isLockFree(data, uid)
          ) {
            const err = new Error('CONTENTION');
            err.code = 'CONTENTION';
            throw err;
          }
        }

        snaps.forEach((snap) => {
          transaction.update(snap.ref, {
            status: 'available',
            lockedBy: uid,
            lockedAt: serverTimestamp(),
          });
        });

        transaction.set(
          participantRef,
          {
            assignment: {
              tweetIds: [...alreadyHave, ...newIds],
              assignedAt: serverTimestamp(),
            },
          },
          { merge: true }
        );
      });

      return await fetchTweetsByIds([
        ...alreadyHave,
        ...newIds,
      ]);
    } catch (err) {
      lastError = err;

      if (err.code === 'NOT_ENOUGH_TWEETS') {
        throw err;
      }

      // Otherwise: contention. Loop and retry with a fresh
      // query/selection.
    }
  }

  throw (
    lastError ||
    new Error('Could not assign tweets after several attempts.')
  );
}

/**
 * Submits all labels for the participant's current assignment in one
 * transaction:
 *
 * 1. Each tweet moves from available -> submitted.
 * 2. A private submission record is created.
 * 3. A safe public submission record is created.
 * 4. The participant document is updated.
 *
 * `labelsByTweetId` = {
 *   [tweetId]: 'anger' | 'fear' | 'joy' | 'love' | 'sadness' | 'surprise'
 * }
 */
export async function submitAllLabels({
  uid,
  participantDisplayName,
  tweetIds,
  labelsByTweetId,
  publicName,
  isAnonymous,
}) {
  const participantRef = doc(
    db,
    'participants',
    uid
  );

  await runTransaction(db, async (transaction) => {
    const tweetRefs = tweetIds.map((id) =>
      doc(db, 'tweets', id)
    );

    const tweetSnaps = [];

    for (const ref of tweetRefs) {
      tweetSnaps.push(await transaction.get(ref));
    }

    tweetSnaps.forEach((snap, i) => {
      const data = snap.data();
      const tweetId = tweetIds[i];
      const label = labelsByTweetId[tweetId];

      if (!data) {
        throw new Error(
          `Tweet ${tweetId} no longer exists.`
        );
      }

      if (!label) {
        throw new Error(
          `Missing a label for tweet ${tweetId}.`
        );
      }

      if (
        data.status === 'submitted' &&
        data.submittedBy !== uid
      ) {
        throw new Error(
          'One of your assigned tweets was already labeled by someone else. Please refresh.'
        );
      }

      // Update the tweet itself.
      transaction.update(snap.ref, {
        status: 'submitted',
        lockedBy: null,
        lockedAt: null,
        submittedBy: uid,
        submittedByName: publicName,
        submittedLabel: label,
        submittedAt: serverTimestamp(),
      });

      // Private submission record.
      // This contains trueLabel and therefore must remain private.
      const submissionRef = doc(
        collection(db, 'submissions')
      );

      // Public submission uses the SAME document ID.
      const publicSubmissionRef = doc(
        db,
        'publicSubmissions',
        submissionRef.id
      );

      transaction.set(submissionRef, {
        participantUid: uid,
        participantDisplayName,
        publicName,
        isAnonymous,
        tweetId,
        tweetText: data.text,
        trueLabel: data.trueLabel,
        selectedEmotion: label,
        submittedAt: serverTimestamp(),
      });

      // IMPORTANT: trueLabel is intentionally NOT included.
      transaction.set(publicSubmissionRef, {
        participantUid: uid,
        publicName,
        isAnonymous,
        tweetId,
        tweetText: data.text,
        selectedEmotion: label,
        submittedAt: serverTimestamp(),
      });
    });

    // Update participant.
    transaction.set(
      participantRef,
      {
        publicName,
        isAnonymous,
        hasCompletedAtLeastOne: true,
        completedCount: tweetIds.length,
        lastSubmittedAt: serverTimestamp(),
        assignment: null,
      },
      { merge: true }
    );
  });
}

/**
 * Withdraws one of the participant's own submissions:
 *
 * 1. Deletes the private submission record.
 * 2. Deletes the corresponding public submission record.
 * 3. Returns the tweet to the available pool.
 * 4. Updates the participant's completed count.
 */
export async function withdrawSubmission({
  uid,
  submissionId,
  tweetId,
}) {
  const submissionRef = doc(
    db,
    'submissions',
    submissionId
  );

  const publicSubmissionRef = doc(
    db,
    'publicSubmissions',
    submissionId
  );

  const tweetRef = doc(
    db,
    'tweets',
    tweetId
  );

  const participantRef = doc(
    db,
    'participants',
    uid
  );

  await runTransaction(db, async (transaction) => {
    const submissionSnap = await transaction.get(
      submissionRef
    );

    const tweetSnap = await transaction.get(
      tweetRef
    );

    const participantSnap = await transaction.get(
      participantRef
    );

    if (!submissionSnap.exists()) {
      throw new Error('Submission not found.');
    }

    const submission = submissionSnap.data();

    if (submission.participantUid !== uid) {
      throw new Error(
        'You can only withdraw your own submissions.'
      );
    }

    // Delete private submission.
    transaction.delete(submissionRef);

    // Delete public submission.
    transaction.delete(publicSubmissionRef);

    // Return tweet to the available pool.
    if (
      tweetSnap.exists() &&
      tweetSnap.data().submittedBy === uid
    ) {
      transaction.update(tweetRef, {
        status: 'available',
        lockedBy: null,
        lockedAt: null,
        submittedBy: null,
        submittedByName: null,
        submittedLabel: null,
        submittedAt: null,
      });
    }

    const participant = participantSnap.exists()
      ? participantSnap.data()
      : {};

    const remainingAssigned = (
      participant.assignment?.tweetIds || []
    ).filter((id) => id !== tweetId);

    transaction.set(
      participantRef,
      {
        assignment: {
          tweetIds: remainingAssigned,
          assignedAt:
            participant.assignment?.assignedAt || null,
        },
        completedCount: Math.max(
          0,
          (participant.completedCount || 1) - 1
        ),
      },
      { merge: true }
    );
  });
}