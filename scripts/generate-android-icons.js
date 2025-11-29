import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Android icon sizes for different densities
const ICON_SIZES = {
  'mipmap-mdpi': 48,      // 1x
  'mipmap-hdpi': 72,      // 1.5x
  'mipmap-xhdpi': 96,     // 2x
  'mipmap-xxhdpi': 144,   // 3x
  'mipmap-xxxhdpi': 192   // 4x
};

const sourceLogo = join(__dirname, '../public/logos/app_logo.png');
const androidResDir = join(__dirname, '../android/app/src/main/res');

console.log('📱 Generating Android app icons from app_logo.png...\n');

async function generateIcons() {
  try {
    // Load the source logo
    const image = sharp(sourceLogo);
    const metadata = await image.metadata();
    console.log(`✅ Loaded source logo: ${sourceLogo}`);
    console.log(`   Dimensions: ${metadata.width}x${metadata.height}px\n`);

    // For each density, create the icon files
    for (const [mipmapDir, size] of Object.entries(ICON_SIZES)) {
      const mipmapPath = join(androidResDir, mipmapDir);
      
      // Ensure directory exists
      mkdirSync(mipmapPath, { recursive: true });

      console.log(`📦 Generating ${mipmapDir} (${size}x${size}px)...`);
      
      // Resize and save ic_launcher.png (square, fits the icon)
      const launcherPath = join(mipmapPath, 'ic_launcher.png');
      await image
        .clone()
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(launcherPath);
      console.log(`   ✅ Created ${launcherPath}`);
      
      // Create round version (same as launcher for now)
      const roundPath = join(mipmapPath, 'ic_launcher_round.png');
      await image
        .clone()
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(roundPath);
      console.log(`   ✅ Created ${roundPath}`);
      
      // Create foreground for adaptive icon
      // For adaptive icons, the foreground should be 108dp (scaled by density)
      // But we'll use the same size for simplicity
      const foregroundPath = join(mipmapPath, 'ic_launcher_foreground.png');
      await image
        .clone()
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(foregroundPath);
      console.log(`   ✅ Created ${foregroundPath}`);
    }

    console.log('\n✅ All Android app icons generated successfully!');
    console.log('   Your app will now use app_logo.png as the APK icon.\n');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

generateIcons();

