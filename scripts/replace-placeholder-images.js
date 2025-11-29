// Script to replace all Unsplash placeholder images with default avatar
const fs = require('fs');
const path = require('path');

const UNSplash_URL = 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
const DEFAULT_AVATAR = 'window.DEFAULT_AVATAR_URL || `${API_ORIGIN}/public/default-avatar.svg`';

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace in src attributes
    if (content.includes(UNSplash_URL)) {
        content = content.replace(
            new RegExp(UNSplash_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            'window.DEFAULT_AVATAR_URL || `${API_ORIGIN}/public/default-avatar.svg`'
        );
        modified = true;
    }

    // Replace PLACEHOLDER_IMAGE constants
    const placeholderPattern = /const PLACEHOLDER_IMAGE = ['"]https:\/\/images\.unsplash\.com[^'"]+['"];?/g;
    if (placeholderPattern.test(content)) {
        content = content.replace(
            placeholderPattern,
            "const PLACEHOLDER_IMAGE = window.DEFAULT_AVATAR_URL || `${API_ORIGIN}/public/default-avatar.svg`;"
        );
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
        return true;
    }
    return false;
}

// Find all HTML files
function findHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory() && !filePath.includes('node_modules') && !filePath.includes('www')) {
            findHtmlFiles(filePath, fileList);
        } else if (file.endsWith('.html')) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

const pagesDir = path.join(__dirname, '..', 'pages');
const htmlFiles = findHtmlFiles(pagesDir);

let count = 0;
htmlFiles.forEach(file => {
    if (replaceInFile(file)) {
        count++;
    }
});

console.log(`\n✅ Updated ${count} files`);


