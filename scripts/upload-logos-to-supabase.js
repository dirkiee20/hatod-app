import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env from api directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../api/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in api/.env');
  console.error('   Or set them as environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const BUCKET_NAME = 'images'; // Using the same bucket as other images
const LOGOS_DIR = join(__dirname, '../public/logos');

async function uploadLogo(fileName, bucketPath) {
  try {
    const filePath = join(LOGOS_DIR, fileName);
    const fileBuffer = readFileSync(filePath);
    
    // Determine content type
    const contentType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    console.log(`📤 Uploading ${fileName}...`);
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(bucketPath, fileBuffer, {
        contentType,
        upsert: true // Overwrite if exists
      });
    
    if (error) {
      console.error(`❌ Error uploading ${fileName}:`, error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(bucketPath);
    
    console.log(`✅ Uploaded ${fileName}`);
    console.log(`   URL: ${urlData.publicUrl}`);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error);
    return null;
  }
}

async function main() {
  console.log('🚀 Uploading application logos to Supabase Storage...\n');
  
  const logos = [
    { fileName: 'app_logo.png', bucketPath: 'logos/app_logo.png' },
    { fileName: 'logo_192x192.png', bucketPath: 'logos/logo_192x192.png' }
  ];
  
  const urls = {};
  
  for (const logo of logos) {
    const url = await uploadLogo(logo.fileName, logo.bucketPath);
    if (url) {
      urls[logo.fileName] = url;
    }
  }
  
  console.log('\n📋 Logo URLs from Supabase:');
  console.log(JSON.stringify(urls, null, 2));
  console.log('\n✅ Logos uploaded! Update config.js with these URLs.\n');
  
  return urls;
}

main().catch(console.error);

