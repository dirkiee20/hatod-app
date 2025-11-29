import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const pagesDir = join(rootDir, 'pages');

function getAllHtmlFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function fixApiUrl(filePath) {
  let content = readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Check if config.js is already included
  const hasConfigJs = content.includes('config.js');
  
  // Pattern 1: const API_BASE_URL = 'http://localhost:4000/api';
  const pattern1 = /const\s+API_BASE_URL\s*=\s*['"]http:\/\/localhost:4000\/api['"];?/g;
  if (pattern1.test(content)) {
    // Calculate relative path to config.js
    const relativePath = filePath.replace(rootDir, '').replace(/\\/g, '/');
    const depth = (relativePath.match(/\//g) || []).length - 1;
    const configPath = '../'.repeat(depth) + 'public/config.js';
    
    // Add config.js script tag if not present
    if (!hasConfigJs) {
      // Find the first <script> tag and add config.js before it
      if (content.includes('<script>')) {
        content = content.replace(
          /(<script>)/,
          `<script src="${configPath}"></script>\n    $1`
        );
      } else if (content.includes('<script ')) {
        // If script tag has attributes, add before it
        content = content.replace(
          /(<script[^>]*>)/,
          `<script src="${configPath}"></script>\n    $1`
        );
      }
    }
    
    // Replace the API_BASE_URL declaration - use window.API_BASE_URL directly (no const)
    // This avoids redeclaration since config.js already sets window.API_BASE_URL
    content = content.replace(
      /const\s+API_BASE_URL\s*=\s*['"]http:\/\/localhost:4000\/api['"];?/,
      `// API base URL (from config.js - automatically uses Railway URL in mobile apps)\n        const API_BASE_URL = window.API_BASE_URL;`
    );
    
    modified = true;
  }
  
  // Also fix cases where it's already using window.API_BASE_URL but with fallback
  const pattern2 = /const\s+API_BASE_URL\s*=\s*window\.API_BASE_URL\s*\|\|\s*['"]http:\/\/localhost:4000\/api['"];?/g;
  if (pattern2.test(content)) {
    content = content.replace(
      /const\s+API_BASE_URL\s*=\s*window\.API_BASE_URL\s*\|\|\s*['"]http:\/\/localhost:4000\/api['"];?/,
      `const API_BASE_URL = window.API_BASE_URL;`
    );
    modified = true;
  }
  
  if (modified) {
    writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

console.log('🔧 Fixing API URLs in HTML files...\n');

const htmlFiles = getAllHtmlFiles(pagesDir);
let fixedCount = 0;

htmlFiles.forEach(file => {
  if (fixApiUrl(file)) {
    const relativePath = file.replace(rootDir, '').replace(/\\/g, '/');
    console.log(`✅ Fixed: ${relativePath}`);
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} file(s)`);
console.log('   All files now use config.js for API URL configuration\n');

