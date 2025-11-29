import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase Storage not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

// Create Supabase client with service role key (for server-side operations)
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * Upload file to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - Path in bucket (e.g., 'logos/restaurant-123.jpg')
 * @param {string} contentType - MIME type (e.g., 'image/jpeg')
 * @returns {Promise<{url: string, path: string}>} Public URL and file path
 */
export const uploadToSupabase = async (fileBuffer, bucket, filePath, contentType) => {
  if (!supabase) {
    throw new Error('Supabase Storage is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  try {
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true // Overwrite if exists
      });

    if (error) {
      console.error('Supabase Storage upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: data.path
    };
  } catch (error) {
    console.error('Error uploading to Supabase Storage:', error);
    throw error;
  }
};

/**
 * Delete file from Supabase Storage
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - Path in bucket
 */
export const deleteFromSupabase = async (bucket, filePath) => {
  if (!supabase) {
    console.warn('Supabase Storage not configured, skipping delete');
    return;
  }

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Supabase Storage delete error:', error);
      // Don't throw - file might not exist
    }
  } catch (error) {
    console.error('Error deleting from Supabase Storage:', error);
    // Don't throw - deletion is not critical
  }
};

/**
 * Extract file path from Supabase URL
 * @param {string} url - Supabase Storage URL
 * @returns {string|null} File path or null
 */
export const extractPathFromUrl = (url) => {
  if (!url || !url.includes('/storage/v1/object/public/')) {
    return null;
  }
  
  const parts = url.split('/storage/v1/object/public/');
  if (parts.length !== 2) return null;
  
  const bucketAndPath = parts[1];
  const slashIndex = bucketAndPath.indexOf('/');
  if (slashIndex === -1) return null;
  
  return bucketAndPath.substring(slashIndex + 1);
};

export default supabase;

