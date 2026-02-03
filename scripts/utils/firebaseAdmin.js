const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    console.log('✅ Firebase Admin already initialized');
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

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

    const initConfig = {
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId || serviceAccount.project_id,
    };

    // Add storageBucket if available
    if (storageBucket) {
      initConfig.storageBucket = storageBucket;
    }

    admin.initializeApp(initConfig);

    console.log('✅ Firebase Admin initialized with Service Account Key');
    console.log(`   Project ID: ${projectId || serviceAccount.project_id}`);
    if (storageBucket) {
      console.log(`   Storage Bucket: ${storageBucket}`);
    }
    return;
  } catch (error) {
    console.warn('⚠️ Failed to load Service Account Key:', error.message);
    console.warn('   Trying Application Default Credentials...');
  }

  // ✅ Method 2: ADC (fallback)
  try {
    const initConfig = projectId ? { projectId } : {};
    if (storageBucket) {
      initConfig.storageBucket = storageBucket;
    }
    admin.initializeApp(initConfig);
    console.log('✅ Firebase Admin initialized with Application Default Credentials');
    if (storageBucket) {
      console.log(`   Storage Bucket: ${storageBucket}`);
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    throw error;
  }
}

module.exports = { initializeFirebaseAdmin };
