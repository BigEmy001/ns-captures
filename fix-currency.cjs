const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);

let totalReplaced = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  content = content.replace(/>\$\{/g, '>£{');
  content = content.replace(/— \$\{/g, '— £{');
  content = content.replace(/^(\s*)\$\{/gm, '$1£{');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
    totalReplaced++;
  }
});

console.log(`Total files updated: ${totalReplaced}`);
