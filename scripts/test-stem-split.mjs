#!/usr/bin/env node
/**
 * Test stem split with a local audio file.
 * Usage: node scripts/test-stem-split.mjs [path-to-audio]
 * Default path: Jimmy Buffett - Margaritaville (or pass your own).
 */

import fs from 'fs';
import path from 'path';

const DEFAULT_PATH = 'C:\\Users\\sammy\\OneDrive\\Music\\Jimmy Buffett\\Meet Me in Margaritaville- The Ultimate Collection Disc 1\\01 Margaritaville.mp3';
const API_BASE = process.env.API_URL || 'http://localhost:3001';

const filePath = process.argv[2] || DEFAULT_PATH;

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const buffer = fs.readFileSync(filePath);
const blob = new Blob([buffer]);
const formData = new FormData();
formData.append('file', blob, path.basename(filePath));
formData.append('stems', '4');
formData.append('quality', 'high');

console.log('POST', `${API_BASE}/api/stems/split`, path.basename(filePath), `${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

const res = await fetch(`${API_BASE}/api/stems/split`, { method: 'POST', body: formData });
const data = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error('Error', res.status, data.error || data);
  if (data.details) console.error('Details:', data.details);
  if (data.hint) console.error('Hint:', data.hint);
  process.exit(1);
}

console.log('OK', data.status, 'jobId:', data.jobId);
console.log('Stems:', data.stems?.map((s) => s.name)?.join(', ') || data.stems);
