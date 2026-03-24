// ============================================================
// scripts/seed-admin.js
// Run once to create the admin user in MongoDB.
//   node scripts/seed-admin.js
// ============================================================

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../db.js';

const ADMIN = {
  username:     'admin',
  password:     'P@ssw0rd',   // plain text — will be hashed before storing
  role:         'admin',
};

async function seed() {
  const db  = await connectDB();
  const col = db.collection('users');

  // Create unique index on username to prevent duplicates
  await col.createIndex({ username: 1 }, { unique: true });

  const existing = await col.findOne({ username: ADMIN.username });
  if (existing) {
    console.log(`User "${ADMIN.username}" already exists — skipping.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(ADMIN.password, 10);
  await col.insertOne({
    username:     ADMIN.username,
    passwordHash,
    role:         ADMIN.role,
    createdAt:    new Date().toISOString(),
  });

  console.log(`Admin user "${ADMIN.username}" created successfully.`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
