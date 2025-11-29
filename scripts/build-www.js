import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const wwwDir = join(rootDir, 'www');

// Directories and files to copy
const itemsToCopy = [
  // HTML files
  'index.html',
  'pages',
  // Public assets
  'public',
  // CSS (already built)
  'css',
  // JavaScript files in root (if any)
];

// Files to exclude
const excludePatterns = [
  /node_modules/,
  /\.git/,
  /android/,
  /api/,
  /database/,
  /docs/,
  /scripts/,
  /uploads/,
  /\.env/,
  /package\.json/,
  /package-lock\.json/,
  /tailwind\.config\.js/,
  /capacitor\.config\.json/,
  /\.md$/,
  /\.bat$/,
  /\.sh$/,
  /\.ps1$/,
  /\.js$/,
  /\.sql$/,
  /docker-compose\.yml/,
  /Dockerfile/,
  /nginx\.conf/,
];

function shouldExclude(path) {
  return excludePatterns.some(pattern => pattern.test(path));
}

function copyRecursive(src, dest) {
  const stat = statSync(src);
  
  if (stat.isDirectory()) {
    if (shouldExclude(src)) {
      return;
    }
    
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }
    
    const entries = readdirSync(src);
    for (const entry of entries) {
      const srcPath = join(src, entry);
      const destPath = join(dest, entry);
      
      if (!shouldExclude(srcPath)) {
        copyRecursive(srcPath, destPath);
      }
    }
  } else {
    if (!shouldExclude(src)) {
      copyFileSync(src, dest);
    }
  }
}

console.log('📦 Building www directory for Capacitor...\n');

// Create www directory
if (!existsSync(wwwDir)) {
  mkdirSync(wwwDir, { recursive: true });
  console.log('✅ Created www directory');
} else {
  console.log('✅ www directory exists');
}

// Copy items
for (const item of itemsToCopy) {
  const src = join(rootDir, item);
  const dest = join(wwwDir, item);
  
  if (existsSync(src)) {
    console.log(`📋 Copying ${item}...`);
    copyRecursive(src, dest);
    console.log(`   ✅ Copied ${item}`);
  } else {
    console.log(`   ⚠️  ${item} not found, skipping`);
  }
}

console.log('\n✅ www directory built successfully!');
console.log('   Next step: Run "npx cap sync android" to sync with Android project\n');

