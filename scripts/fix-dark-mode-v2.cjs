const fs = require('fs');
const path = require('path');

const directories = ['src/features', 'src/components', 'src/layouts'];
const extensions = ['.jsx', '.js', '.tsx', '.ts'];

const rules = [
  { target: /\btext-brand-primary\b/g, check: 'dark:text-', replaceWith: 'text-brand-primary dark:text-blue-400' },
  { target: /\btext-gray-900\b/g, check: 'dark:text-', replaceWith: 'text-gray-900 dark:text-white' },
  { target: /\btext-gray-800\b/g, check: 'dark:text-', replaceWith: 'text-gray-800 dark:text-gray-200' },
  { target: /\btext-gray-700\b/g, check: 'dark:text-', replaceWith: 'text-gray-700 dark:text-gray-300' },
  { target: /\btext-gray-600\b/g, check: 'dark:text-', replaceWith: 'text-gray-600 dark:text-gray-400' },
  { target: /\btext-orange-700\b/g, check: 'dark:text-', replaceWith: 'text-orange-700 dark:text-orange-400' },
  { target: /\btext-orange-600\b/g, check: 'dark:text-', replaceWith: 'text-orange-600 dark:text-orange-400' },
  { target: /\btext-emerald-700\b/g, check: 'dark:text-', replaceWith: 'text-emerald-700 dark:text-emerald-400' },
  { target: /\btext-emerald-600\b/g, check: 'dark:text-', replaceWith: 'text-emerald-600 dark:text-emerald-400' },
  { target: /\btext-rose-700\b/g, check: 'dark:text-', replaceWith: 'text-rose-700 dark:text-rose-400' },
  { target: /\btext-rose-600\b/g, check: 'dark:text-', replaceWith: 'text-rose-600 dark:text-rose-400' },
  { target: /\bbg-blue-50\b/g, check: 'dark:bg-', replaceWith: 'bg-blue-50 dark:bg-blue-900/20' },
  { target: /\bbg-emerald-50\b/g, check: 'dark:bg-', replaceWith: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { target: /\bbg-rose-50\b/g, check: 'dark:bg-', replaceWith: 'bg-rose-50 dark:bg-rose-900/20' },
  { target: /\bbg-orange-50\b/g, check: 'dark:bg-', replaceWith: 'bg-orange-50 dark:bg-orange-900/20' },
  { target: /\bbg-gray-50\b/g, check: 'dark:bg-', replaceWith: 'bg-gray-50 dark:bg-dark-card' },
];

let modifiedFiles = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // We find all className="...", className={'...'}, or className={`...`}
  const classNameRegex = /className\s*=\s*(["'`])(.*?)\1|className\s*=\s*\{(["'`])(.*?)\3\}|className\s*=\s*\{`([\s\S]*?)`\}/g;
  
  content = content.replace(classNameRegex, (match, q1, str1, q2, str2, str3) => {
    let classString = str1 || str2 || str3;
    if (!classString) return match;
    
    let newClassString = classString;
    
    rules.forEach(rule => {
      // If the class string already contains the dark variant, skip
      if (rule.check && newClassString.includes(rule.check)) return;
      
      newClassString = newClassString.replace(rule.target, rule.replaceWith);
    });

    return match.replace(classString, newClassString);
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    modifiedFiles++;
    console.log('Modified: ' + filePath);
  }
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else if (extensions.includes(path.extname(fullPath))) {
      processFile(fullPath);
    }
  }
}

directories.forEach(d => traverseDir(path.join(process.cwd(), d)));
console.log('Total files modified: ' + modifiedFiles);
