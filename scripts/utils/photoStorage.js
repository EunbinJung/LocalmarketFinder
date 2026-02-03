const admin = require('firebase-admin');
const axios = require('axios');

/**
 * Download photo from Google Places API and upload to Firebase Storage
 * Returns public URL if successful, null if error
 * 
 * @param {string} photoReference - Google Places photo_reference
 * @param {string} placeId - Market place_id
 * @param {string} apiKey - Google Maps API key
 * @returns {Promise<string|null>} Public Storage URL or null
 */
async function uploadPhotoToStorage(photoReference, placeId, apiKey) {
  try {
    const bucket = admin.storage().bucket();
    const fileName = `market-photos/${placeId}.jpg`;
    const file = bucket.file(fileName);

    // Check if file already exists
    const [exists] = await file.exists();
    if (exists) {
      // Return existing public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      return publicUrl;
    }

    // Download photo from Google Places API
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${apiKey}`;
    const photoResponse = await axios.get(photoUrl, {
      responseType: 'arraybuffer',
    });

    // Upload to Firebase Storage
    const buffer = Buffer.from(photoResponse.data);
    await file.save(buffer, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          placeId: placeId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Make file publicly accessible
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error(`   ⚠️  Error uploading photo for ${placeId}:`, error.message);
    return null;
  }
}

module.exports = { uploadPhotoToStorage };
