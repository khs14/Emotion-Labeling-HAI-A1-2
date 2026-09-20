# Emotion Labeling Study

A small research tool where each participant signs in with Google and labels 5
randomly-assigned tweets from the [Emotion dataset](https://huggingface.co/datasets/dair-ai/emotion)
with one of six basic emotions: **anger, fear, joy, love, sadness, surprise**.

Built with React (Vite) + Firebase Authentication + Firestore, deployable to Vercel.

## Feature checklist

| Requirement | Where it lives |
|---|---|
| Google Authentication (1 account = 1 participant) | `src/context/AuthContext.jsx` |
| Instructions & tutorial with the six categories | `src/pages/InstructionsPage.jsx` |
| Random assignment of 5 tweets per participant | `src/hooks/useAssignment.js` → `fetchOrCreateAssignment` |
| Tweet pool management (submitted tweets leave the pool) | `tweets.status` field, see **Data model** below |
| Emotion labeling UI | `src/components/EmotionSelector.jsx`, `TweetCard.jsx` |
| Submission tracking (participant → tweet → label) | `submissions` collection, written in `submitAllLabels` |
| Withdrawal (tweet returns to pool) | `src/pages/MySubmissionsPage.jsx` → `withdrawSubmission` |
| Public participant board, real-name/anonymous choice at submission | `src/pages/PublicBoardPage.jsx`, name choice on `LabelingPage.jsx` |
| Confirmation page | `src/pages/ConfirmationPage.jsx` |
| Admin view (participants, pool, submissions) | `src/pages/AdminPage.jsx` |
| Abandoned (unsubmitted) tweets aren't removed from the pool | see **How pool locking works** below |

## Project layout

```
emotion-labeling-task/
├── data/sample-tweets.csv     # placeholder 60-tweet dataset (10/emotion) — replace with your CSV
├── scripts/seedFirestore.js   # loads a CSV into the `tweets` Firestore collection
├── firestore.rules            # security rules enforcing the pool/lock/submit invariants
├── firestore.indexes.json     # composite indexes needed by the board/submissions queries
├── functions/                 # OPTIONAL bonus Cloud Function (see below) — not required to run the app
└── src/
    ├── firebase.js            # Firebase init + shared constants (EMOTIONS, etc.)
    ├── context/AuthContext.jsx
    ├── hooks/useAssignment.js # the core assignment / submit / withdraw transactions
    ├── pages/                 # one file per route
    └── components/
```

## How pool locking works (and why)

The client Firestore SDK's transactions can only read specific documents by
reference — they can't run a `where(...)` query inside a transaction (that's
only possible in the Admin SDK, i.e. from a Cloud Function). So assignment is
done as a small optimistic-concurrency dance, entirely from the browser, on
Firestore's free Spark plan (no billing/Cloud Functions required):

1. Query all tweets with `status == 'available'` (outside a transaction).
2. Filter out any that are locked by someone else *and* that lock is fresh
   (younger than 20 minutes).
3. Shuffle, pick 5, then open a transaction that re-reads exactly those 5
   documents by reference, double-checks they're still free, and locks them
   (`lockedBy`, `lockedAt`) to the current user.
4. If another participant grabbed one of the same 5 in the meantime, the
   transaction throws and step 1–3 retries with a fresh query (up to 6 times).

Crucially, locking **does not** change `status` — a tweet only ever leaves the
"available" pool when it's actually `submitted`. That satisfies the "don't
remove a tweet from the pool unless it's been submitted" requirement: if a
participant closes the tab mid-task, their locked tweets simply become
eligible for assignment to someone else again after 20 minutes, with no
manual cleanup needed. Firestore security rules (`firestore.rules`) enforce
the same status/lock transitions server-side, so this isn't just
client-trusted logic.

An **optional** Cloud Function (`functions/releaseStaleLocks`) is included as
a belt-and-suspenders scheduled cleanup, since the assignment mentions Cloud
Functions as a valid backend-logic option — but it's not required for the app
to work correctly, and deploying it requires upgrading to Firebase's Blaze
(pay-as-you-go) plan. Skip it entirely unless you want the extra credit of a
real Cloud Function in the mix.

## Data model

**`tweets/{tweetId}`**
`text`, `trueLabel` (dataset ground truth, never shown to participants),
`status` (`'available' | 'submitted'`), `lockedBy`, `lockedAt`, `submittedBy`,
`submittedByName`, `submittedLabel`, `submittedAt`.

**`participants/{uid}`** (doc ID = Firebase Auth uid, so one Google account = one row)
`displayName`, `email`, `photoURL`, `assignment: { tweetIds[], assignedAt }`,
`publicName`, `isAnonymous`, `hasCompletedAtLeastOne`, `completedCount`, `lastSubmittedAt`.

**`submissions/{autoId}`**
`participantUid`, `participantDisplayName`, `publicName`, `isAnonymous`,
`tweetId`, `tweetText`, `trueLabel`, `selectedEmotion`, `submittedAt`.
Kept private to the owning participant + admin (not publicly readable), so the
public board can show *who* participated without exposing anyone's answers or
the dataset's ground-truth labels.

## Setup

### 1. Create the Firebase project

1. [Firebase Console](https://console.firebase.google.com) → **Add project**.
2. **Build → Authentication → Sign-in method** → enable **Google**.
3. **Build → Firestore Database** → **Create database** → start in production mode (rules below lock it down).
4. **Project settings → General → Your apps** → add a **Web app** → copy the config values into a `.env` file:

```bash
cp .env.example .env
# then fill in VITE_FIREBASE_* from the Firebase console
```

5. Set `VITE_ADMIN_EMAILS` in `.env` to your own Google account email (comma-separate more admins if needed).
6. Open `firestore.rules` and put the **same** admin email(s) into `isAdminEmail()` — the client env var only controls the UI, the rules file is what actually restricts admin access.

### 2. Deploy Firestore rules & indexes

```bash
npm install -g firebase-tools   # if you don't have it
firebase login
firebase use --add                # pick your project
firebase deploy --only firestore:rules,firestore:indexes
```

(There's no `firebase.json` committed yet the first time — running `firebase init firestore` in the project root and pointing it at the existing `firestore.rules` / `firestore.indexes.json` files will generate one.)

### 3. Load your 60-tweet dataset

1. Firebase Console → **Project settings → Service accounts → Generate new private key** → save the JSON as `service-account.json` in the project root (already gitignored).
2. Put your real CSV somewhere in the repo, e.g. `data/tweets.csv`, with two columns (header names are flexible): a text column (`text`/`tweet`/`content`) and a label column (`emotion`/`label`) whose values are one of `anger, fear, joy, love, sadness, surprise`.
3. Run:

```bash
npm install
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed -- data/tweets.csv
```

The script reports how many rows it loaded per emotion and warns if you're under 50 total or missing a category. `data/sample-tweets.csv` (60 placeholder tweets, 10/emotion) is there so you can smoke-test the whole flow before your real CSV is ready — just run `npm run seed` with no arguments.

### 4. Run locally

```bash
npm run dev
```

Visit the printed localhost URL, sign in with Google, and go through Instructions → Task → Confirmation.

### 5. Deploy to Vercel

1. Push this repo to GitHub.
2. [Vercel](https://vercel.com) → **Add New → Project** → import the GitHub repo (Vercel auto-detects Vite).
3. In **Project Settings → Environment Variables**, add every `VITE_FIREBASE_*` value and `VITE_ADMIN_EMAILS` from your `.env`.
4. Deploy. `vercel.json` is already set up to redirect all paths to `index.html` so React Router's client-side routes work on refresh/direct links.
5. Back in the Firebase Console → **Authentication → Settings → Authorized domains**, add your `*.vercel.app` domain (and any custom domain) or Google Sign-In will be blocked on the deployed site.

## Testing it yourself

1. Sign in with your own Google account.
2. Read the instructions, click **Start labeling**.
3. Label all 5 tweets, choose real name or anonymous, submit.
4. You should land on the confirmation page, then be able to see your own rows under **My submissions**, see yourself listed on the **Participant board**, and (if your email is in `VITE_ADMIN_EMAILS`) see the same submission under **Admin → Submissions**.
5. Take your screenshot from the **Admin → Submissions** tab (or the Firestore console's `submissions` collection) — that's the clearest evidence of participant → tweet → label being recorded.

## Bonus: essay on AI and emotion classification

The assignment flags that automatically classifying human emotion — whether by
a crowd of human labelers or by an AI model trained on their labels — is a
genuinely contested use of the technology: emotional expression is
context-dependent, culturally variable, and often ambiguous even to the
person feeling it, so any fixed label set is a simplification. If you're
doing the bonus reflection, these are commonly assigned starting points worth
tracking down (check your course's actual reading list first, since it may
specify different or additional papers):

- Barrett, Adolphs, Marsella, Martinez & Pollak (2019), *"Emotional Expressions Reconsidered: Challenges to Inferring Emotion From Human Facial Movements,"* Psychological Science in the Public Interest.
- Crawford (2021), *"Time to regulate AI that interprets human emotions,"* Nature (comment piece).
- Stark & Hoey (2021), *"The Ethics of Emotion in Artificial Intelligence Systems,"* ACM FAccT.

This README doesn't include the essay itself — that reflection is meant to be
in your own voice.

## Known limitations / where to harden further

- Admin access is enforced by hardcoding emails into both `.env` and `firestore.rules`; a larger deployment would use Firebase custom claims (set via a Cloud Function) instead.
- There's no CAPTCHA or rate limiting, so this is sized for a class-scale study, not an open public survey.
- The optional `functions/releaseStaleLocks` scheduled function requires the Blaze billing plan; the app works correctly without it (see **How pool locking works**).
