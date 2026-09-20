/**
 * scripts/seedFirestore.js
 *
 * One-time (or re-runnable) loader that reads a CSV of tweets + emotion labels
 * and writes them into the `tweets` collection in Firestore as the labeling pool.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seedFirestore.js data/my-60-tweets.csv
 *
 * If no path is given, defaults to data/sample-tweets.csv (a small placeholder
 * dataset for testing the app before you plug in your real 60-tweet CSV).
 *
 * The CSV just needs a text column and a label column, in either order, with
 * flexible header names ("text"/"tweet"/"content" and "emotion"/"label"/"sentiment").
 * Labels are normalized to lowercase and must be one of the six basic emotions:
 * anger, fear, joy, love, sadness, surprise. Rows that don't match are skipped
 * (and reported) rather than silently corrupting the pool.
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import admin from 'firebase-admin';

const VALID_EMOTIONS = ['anger', 'fear', 'joy', 'love', 'sadness', 'surprise'];

function findServiceAccount() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const candidate = envPath || './service-account.json';
  if (!fs.existsSync(candidate)) {
    console.error(
      `\nCould not find a service account key at "${candidate}".\n` +
      `Download one from Firebase Console > Project Settings > Service accounts > Generate new private key,\n` +
      `save it as service-account.json in the project root (it's gitignored), and re-run this script.\n`
    );
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(candidate, 'utf-8'));
}

function normalizeHeader(h) {
  return h.trim().toLowerCase();
}

function pickField(row, candidates) {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const match = keys.find((k) => normalizeHeader(k) === candidate);
    if (match) return row[match];
  }
  return undefined;
}

async function main() {
  const csvPath = process.argv[2] || 'data/sample-tweets.csv';
  const resolved = path.resolve(csvPath);
  if (!fs.existsSync(resolved)) {
    console.error(`CSV file not found: ${resolved}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

  const serviceAccount = findServiceAccount();
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const counts = { anger: 0, fear: 0, joy: 0, love: 0, sadness: 0, surprise: 0 };
  const skipped = [];
  const toWrite = [];

  for (const row of rows) {
    const text = pickField(row, ['text', 'tweet', 'content', 'message']);
    const rawLabel = pickField(row, ['emotion', 'label', 'sentiment', 'class']);
    const label = (rawLabel || '').toString().trim().toLowerCase();

    if (!text || !VALID_EMOTIONS.includes(label)) {
      skipped.push(row);
      continue;
    }
    counts[label] += 1;
    toWrite.push({ text: text.toString().trim(), trueLabel: label });
  }

  if (toWrite.length < 50) {
    console.warn(
      `\n⚠️  Only ${toWrite.length} valid rows found. The assignment asks for at least 50 tweets ` +
      `covering all six emotions. Double check your CSV headers/labels.\n`
    );
  }
  const missingEmotions = VALID_EMOTIONS.filter((e) => counts[e] === 0);
  if (missingEmotions.length) {
    console.warn(`⚠️  No tweets found for: ${missingEmotions.join(', ')}\n`);
  }

  console.log('Rows per emotion:', counts);
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} row(s) with missing/invalid text or label.`);
  }

  // Batched writes (Firestore batches cap at 500 operations)
  let batch = db.batch();
  let opCount = 0;
  let written = 0;

  for (const item of toWrite) {
    const ref = db.collection('tweets').doc();
    batch.set(ref, {
      text: item.text,
      trueLabel: item.trueLabel,
      status: 'available', // 'available' | 'submitted'
      lockedBy: null,
      lockedAt: null,
      submittedBy: null,
      submittedByName: null,
      submittedLabel: null,
      submittedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    opCount += 1;
    written += 1;

    if (opCount === 450) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();

  console.log(`\n✅ Wrote ${written} tweets to the "tweets" collection in Firestore.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
