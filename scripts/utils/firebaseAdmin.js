import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// __dirname 대응 (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    console.log('✅ Firebase Admin already initialized');
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;

  // ✅ Method 1: Service Account Key
  try {
    const serviceAccountPath = path.resolve(
      __dirname,
      '../../serviceAccountKey.json'
    );

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error('Service Account Key file not found');
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, 'utf-8')
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId || serviceAccount.project_id,
    });

    console.log('✅ Firebase Admin initialized with Service Account Key');
    console.log(`   Project ID: ${projectId || serviceAccount.project_id}`);
    return;
  } catch (error) {
    console.warn('⚠️ Failed to load Service Account Key:', error.message);
    console.warn('   Trying Application Default Credentials...');
  }

  // ✅ Method 2: ADC (fallback)
  try {
    admin.initializeApp(projectId ? { projectId } : {});
    console.log('✅ Firebase Admin initialized with Application Default Credentials');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    throw error;
  }
}
