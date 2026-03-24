// ============================================================
// db.js — MongoDB Atlas connection (singleton)
// ============================================================

import { MongoClient } from 'mongodb';

const uri    = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db = null;

export async function connectDB() {
  if (db) return db;
  await client.connect();
  db = client.db('smart_money_method_db');
  console.log('Connected to MongoDB Atlas');
  return db;
}

export function getDB() {
  if (!db) throw new Error('DB not connected — call connectDB() first');
  return db;
}
