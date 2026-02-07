#!/usr/bin/env node

/**
 * Migration Script: Update Import Paths
 * 
 * This script updates import statements from the old structure to the new structure:
 * - services/ → api/
 * - components/project/ → features/projects/components/
 * 
 * Usage:
 *   node scripts/update-imports.js
 * 
 * Or for specific files:
 *   node scripts/update-imports.js views/Dashboard.tsx
 */

const fs = require('fs');
const path = require('path');

// Import path mappings
const IMPORT_MAPPINGS = [
  // Services to API
  { from: /from ['"]\.\.\/services\//g, to: "from '../api/" },
  { from: /from ['"]\.\.\/\.\.\/services\//g, to: "from '../../api/" },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/services\//g, to: "from '../../../api/" },
  { from: /from ['"]services\//g, to: "from 'api/" },
  
  // Components/project to features/projects/components
  { from: /from ['"]\.\.\/components\/project\//g, to: "from '../features/projects/components/" },
  { from: /from ['"]\.\.\/\.\.\/components\/project\//g, to: "from '../../features/projects/components/" },
  { from: /from ['"]components\/project\//g, to: "from 'features/projects/components/" },
  
  // Import statements for hooks
  { from: /import { use(\w+) } from ['"]\.\.\/hooks\/use\1['"]/g, to: "import { use$1 } from '../hooks'" },
];

// Directories to process
const DIRECTORIES = ['views', 'components', 'features', 'hooks'];

// Recursively find all .ts and .tsx files
function findFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and hidden directories
      if (!file.startsWith('.') && file !== 'node_modules') {
        findFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    IMPORT_MAPPINGS.forEach(({ from, to }) => {
      const newContent = content.replace(from, to);
      if (newContent !== content) {
        content = newContent;
        updated = true;
      }
    });
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  Skipped: ${filePath} (no changes needed)`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  
  let filesToProcess = [];
  
  if (args.length > 0) {
    // Process specific files provided as arguments
    filesToProcess = args;
  } else {
    // Process all matching files
    console.log('🔍 Finding files to update...\n');
    DIRECTORIES.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      const files = findFiles(dirPath);
      filesToProcess.push(...files);
    });
  }
  
  console.log(`📝 Processing ${filesToProcess.length} files...\n`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  
  filesToProcess.forEach(file => {
    const wasUpdated = updateFile(file);
    if (wasUpdated) {
      updatedCount++;
    } else {
      skippedCount++;
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log(`✨ Migration complete!`);
  console.log(`   Updated: ${updatedCount} files`);
  console.log(`   Skipped: ${skippedCount} files`);
  console.log('='.repeat(50));
}

if (require.main === module) {
  main();
}

module.exports = { updateFile, IMPORT_MAPPINGS };
