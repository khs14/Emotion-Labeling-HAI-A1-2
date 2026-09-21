# Emotion Labeling Study

A small research tool where each participant signs in with Google and labels **5 randomly assigned tweets** from the [Emotion dataset](https://huggingface.co/datasets/dair-ai/emotion) with one of six basic emotions: **anger, fear, joy, love, sadness, surprise**.

Built with **React (Vite) + Firebase Authentication + Firestore** and deployed as a static site on Render.

## Live Application

https://emotion-labeling-hai-a1-2.onrender.com/

## GitHub Repository

https://github.com/khs14/Emotion-Labeling-HAI-A1-2

## Feature Checklist

| Requirement                                       | Where it lives                                           |
| ------------------------------------------------- | -------------------------------------------------------- |
| Google Authentication (1 account = 1 participant) | `src/context/AuthContext.jsx`                            |
| Instructions & tutorial                           | `src/pages/InstructionsPage.jsx`                         |
| Random assignment of 5 tweets                     | `src/hooks/useAssignment.js` → `fetchOrCreateAssignment` |
| Tweet pool management                             | `tweets.status`                                          |
| Emotion labeling UI                               | `src/components/EmotionSelector.jsx`, `TweetCard.jsx`    |
| Submission tracking                               | `submissions` collection, `submitAllLabels`              |
| Withdrawal                                        | `src/pages/MySubmissionsPage.jsx` → `withdrawSubmission` |
| Public participant board                          | `src/pages/PublicBoardPage.jsx`                          |
| Real-name/anonymous choice                        | `src/pages/LabelingPage.jsx`                             |
| Confirmation page                                 | `src/pages/ConfirmationPage.jsx`                         |
| Admin view                                        | `src/pages/AdminPage.jsx`                                |
| Abandoned tweets remain available                 | See **How Pool Locking Works**                           |

## Project Layout

```text
emotion-labeling-task/
├── data/
│   └── sample-tweets.csv
├── scripts/
│   └── seedFirestore.js
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── functions/
├── public/
├── src/
│   ├── firebase.js
│   ├── context/AuthContext.jsx
│   ├── hooks/useAssignment.js
│   ├── components/
│   └── pages/
├── .env.example
├── package.json
├── vite.config.js
└── README.md
```

## How Pool Locking Works

Assignment uses an optimistic-concurrency approach entirely from the browser:

1. Query tweets where `status == 'available'`.
2. Filter out tweets currently locked by another participant.
3. Shuffle the candidates and select 5 tweets.
4. Re-read those tweet documents in a Firestore transaction.
5. Verify that they are still available and their locks are free.
6. Set `lockedBy` and `lockedAt` for the selected tweets.
7. If another participant claimed one first, retry with a fresh selection.

Locking **does not change `status`**. A tweet only leaves the available pool after actual submission. If a participant abandons a task, the lock becomes eligible again after 20 minutes.

An optional `functions/releaseStaleLocks` Cloud Function is included but is not required for normal operation and requires Firebase Blaze if deployed.

## Data Model

### `tweets/{tweetId}`

```text
text
trueLabel
status                  # "available" | "submitted"
lockedBy
lockedAt
submittedBy
submittedByName
submittedLabel
submittedAt
```

`trueLabel` is dataset ground truth and is never shown to participants.

### `participants/{uid}`

```text
displayName
email
photoURL
assignment
  ├── tweetIds[]
  └── assignedAt
publicName
isAnonymous
hasCompletedAtLeastOne
completedCount
lastSubmittedAt
```

### `submissions/{autoId}`

Private submission records:

```text
participantUid
participantDisplayName
publicName
isAnonymous
tweetId
tweetText
trueLabel
selectedEmotion
submittedAt
```

### `publicSubmissions/{submissionId}`

Public-safe records used by the participant board:

```text
participantUid
publicName
isAnonymous
tweetId
tweetText
selectedEmotion
submittedAt
```

`trueLabel` is intentionally excluded from `publicSubmissions`.

## Submission and Withdrawal Flow

### Submission

1. Each tweet changes from `available` to `submitted`.
2. The participant's selected emotion is stored.
3. A private `submissions` record is created.
4. A public-safe `publicSubmissions` record is created.
5. The participant record is updated.
6. The assignment is cleared.

### Withdrawal

A participant can withdraw one of their own submissions from **My Submissions**. Withdrawal returns the tweet to the available pool and removes the associated submission records.

After a recent withdrawal, the interface instructs the participant to **wait 2 minutes and reload the Task page** before requesting a new assignment.

## Authentication

The application uses **Firebase Authentication with Google Sign-In**. The Firebase Auth UID associates a participant with their assignment, submissions, participant record, and withdrawal permissions.

The production Render hostname must be added to Firebase Authentication **Authorized domains**.

## Firestore Security

Security rules are defined in `firestore.rules`. Private `submissions` contain `trueLabel` and are not publicly readable. The participant board reads from `publicSubmissions`, which excludes ground-truth labels.

Admin access is controlled using configured administrator email(s).

# Setup

## 1. Create the Firebase Project

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Create or select the Firebase project.
3. Go to **Build → Authentication → Sign-in method** and enable **Google**.
4. Go to **Build → Firestore Database** and create the database in production mode.
5. Go to **Project settings → General → Your apps** and add a **Web app**.
6. Copy the Firebase web configuration into `.env`.

Create the local environment file:

```bash
cp .env.example .env
```

Set `VITE_ADMIN_EMAILS` to the administrator Google account email(s). The same administrator email(s) must be configured in `firestore.rules` because the Firestore rules are the actual security boundary.

## 2. Install Dependencies and Configure Firebase CLI

```bash
npm install
npm install -g firebase-tools
firebase login
```

If Firestore has not been initialized:

```bash
firebase init firestore
```

Preserve the existing `firestore.rules` and `firestore.indexes.json` files.

## 3. Deploy Firestore Rules and Indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Firebase deployment is separate from the Render frontend deployment.

## 4. Load the Dataset

For local seeding only, generate a Firebase service-account key from **Firebase Console → Project settings → Service accounts → Generate new private key** and save it as:

```text
service-account.json
```

This file is gitignored and **must never be committed to GitHub or exposed to the browser**.

The sample dataset is:

```text
data/sample-tweets.csv
```

It contains 60 placeholder tweets, 10 per emotion, for testing.

To seed it:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed
```

For another CSV:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed -- data/tweets.csv
```

The CSV should contain a text column such as `text`, `tweet`, or `content`, and an emotion/label column whose values are `anger`, `fear`, `joy`, `love`, `sadness`, or `surprise`.

## 5. Run Locally

```bash
npm run dev
```

The application is normally available at `http://localhost:5173`.

# Production Deployment

The application is deployed using **GitHub + Render**.

## GitHub

Repository:

https://github.com/khs14/Emotion-Labeling-HAI-A1-2

Production branch:

```text
main
```

## Render

Live application:

https://emotion-labeling-hai-a1-2.onrender.com/

Render is configured as a **Static Site** with:

```text
Branch: main
Root Directory: blank
Build Command: npm install && npm run build
Publish Directory: dist
Auto-Deploy: On Commit
```

### Render Environment Variables

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_ADMIN_EMAILS
```

Do **not** add `GOOGLE_APPLICATION_CREDENTIALS` or `service-account.json` to the Render frontend deployment. The service account is only for local/server-side administrative operations such as dataset seeding.

## React Router on Render

Because this is a single-page React application, Render needs a rewrite so routes such as `/task`, `/my-submissions`, `/board`, and `/admin` are served through `index.html`:

```text
Source: /*
Destination: /index.html
Action: Rewrite
```

## Useful Commands

```bash
npm run dev
npm run build
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only firestore:rules,firestore:indexes
```

## Environment and Secrets

Keep these files out of GitHub:

```text
.env
service-account.json
```

The repository `.gitignore` includes:

```text
node_modules/
dist/
.env
.env.local
*.log
service-account.json
firebase-debug.log
.firebase/
functions/node_modules/
```

## Core Files

| File                                 | Purpose                                               |
| ------------------------------------ | ----------------------------------------------------- |
| `src/firebase.js`                    | Firebase initialization and shared constants          |
| `src/context/AuthContext.jsx`        | Google authentication and user state                  |
| `src/hooks/useAssignment.js`         | Assignment, locking, submission, and withdrawal logic |
| `src/pages/InstructionsPage.jsx`     | Participant instructions                              |
| `src/pages/LabelingPage.jsx`         | Emotion labeling interface                            |
| `src/pages/ConfirmationPage.jsx`     | Submission confirmation                               |
| `src/pages/MySubmissionsPage.jsx`    | Submission history and withdrawal                     |
| `src/pages/PublicBoardPage.jsx`      | Public participant board                              |
| `src/pages/AdminPage.jsx`            | Administrative interface                              |
| `src/components/EmotionSelector.jsx` | Emotion selection UI                                  |
| `src/components/TweetCard.jsx`       | Tweet display/labeling component                      |
| `scripts/seedFirestore.js`           | Dataset import script                                 |
| `firestore.rules`                    | Firestore authorization/security rules                |
| `firestore.indexes.json`             | Firestore query indexes                               |
| `firebase.json`                      | Firebase CLI configuration                            |

## Data Flow

```text
Participant
    │
    ▼
Google Authentication
    │
    ▼
Firebase Auth UID
    │
    ▼
Fetch/Create Assignment
    │
    ▼
5 randomly selected tweets
    │
    ▼
Participant selects emotions
    │
    ▼
Submit
    ├───────────────┐
    ▼               ▼
 tweets        submissions
    │               │
    │               └── Private + trueLabel
    │
    └──────────────► publicSubmissions
                         │
                         ▼
                  Participant Board
```

## Design Decisions

### Ground truth is private

The dataset `trueLabel` is never exposed through the participant-facing public submission collection.

### Public board uses a separate collection

The public board reads from `publicSubmissions` rather than private `submissions`, allowing participants to see submitted labels without exposing dataset ground truth.

### One Google account = one participant

The Firebase Auth UID is used as the participant document ID.

### Assignment is randomized

Each participant receives 5 randomly selected available tweets.

### Tweets are not permanently removed when locked

A lock only prevents simultaneous assignment. A tweet becomes submitted only after the participant submits their label.
