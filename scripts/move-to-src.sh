#!/bin/bash

# Move application code to src/ directory
# This script preserves git history by using git mv

set -e

echo "🚀 Reorganizing application code into src/ directory..."

# Create src directory
mkdir -p src

# Move directories
echo "📁 Moving directories..."
for dir in api components contexts features hooks utils views; do
  if [ -d "$dir" ]; then
    git mv "$dir" src/
    echo "  ✓ Moved $dir/"
  fi
done

# Move root TypeScript/TSX files
echo "📄 Moving application files..."
for file in App.tsx index.tsx constants.tsx types.ts; do
  if [ -f "$file" ]; then
    git mv "$file" src/
    echo "  ✓ Moved $file"
  fi
done

echo "✅ File reorganization complete!"
echo ""
echo "📝 Next steps:"
echo "1. Verify the changes look correct"
echo "2. Run: npm install (to ensure everything still works)"
echo "3. Run: npm run dev (to test the application)"
echo "4. Commit: git commit -m 'refactor: move application code to src/'"
