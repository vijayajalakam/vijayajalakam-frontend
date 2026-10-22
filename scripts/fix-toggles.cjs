const fs = require('fs');
const path = require('path');
const dirs = ['src/features', 'src/components', 'src/layouts'];
const exts = ['.jsx'];

// We are replacing instances of:
// `bg-brand-primary` when it's used in a toggle switch to `bg-emerald-500`
// `bg-gray-200` to `bg-gray-200 dark:bg-gray-600`
// The patterns seen in ServicesManager and ProductMasterPage:
// 1. "bg-brand-primary shadow-sm shadow-brand-primary/20" : "bg-gray-200"
// 2. bg-brand-primary shadow-md ... bg-gray-200
// We will just do a string replacement for the specific ternary operators used for switches

const replacements = [
  {
    target: /bg-brand-primary shadow-sm shadow-brand-primary\/20(.*?):(.*?)\"bg-gray-200\"/g,
    replace: 'bg-emerald-500 shadow-sm shadow-emerald-500/20$1:$2"bg-gray-200 dark:bg-gray-600"'
  },
  {
    target: /bg-brand-primary(.*?):(.*?)\"bg-gray-200\"/g,
    replace: 'bg-emerald-500$1:$2"bg-gray-200 dark:bg-gray-600"'
  }
];

let count = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Let's only target the switch toggle, which usually has "rounded-full transition-colors focus:outline-none"
  if (content.includes('focus:outline-none') && content.includes('rounded-full')) {
     replacements.forEach(rule => {
       content = content.replace(rule.target, rule.replace);
     });
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    count++;
    console.log('Modified: ' + filePath);
  }
}

function search(dir) {
    for (const f of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, f);
        if (fs.statSync(fullPath).isDirectory()) search(fullPath);
        else if (exts.includes(path.extname(f))) {
            processFile(fullPath);
        }
    }
}

dirs.forEach(d => search(path.join(process.cwd(), d)));
console.log('Total files modified:', count);
