const fs = require('fs');
const path = require('path');

const targetDirs = [
  'C:/vijayajalakam/vijayajalakam-frontend/src/features',
  'C:/vijayajalakam/vijayajalakam-frontend/src/components',
  'C:/vijayajalakam/vijayajalakam-frontend/src/layouts',
  'C:/vijayajalakam/vijayajalakam-frontend/src/pages'
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // We need to find strings inside className="" or className={``} or className={''}
  // This regex matches className="...", className={'...'}, className={`...`}, className={... ? "..." : "..."}
  // It's safer to just split the whole file by whitespace, but since we are modifying classes, we can look for specific keywords and append to them if there's no dark: equivalent nearby.
  // Actually, string replacement is easier if we just do:
  // text-gray-900 -> text-gray-900 dark:text-white (only if not followed or preceded by dark:text- within a few words)
  
  // Better approach: regex to match the class names.
  // Match the word exactly (boundary).
  // Then check the whole line or +/- 100 characters to see if there is already a `dark:text-` or `dark:bg-` etc.

  const rules = [
    { target: /\btext-black\b/g, darkType: 'dark:text-', replacement: 'text-black dark:text-white' },
    { target: /\btext-gray-900\b/g, darkType: 'dark:text-', replacement: 'text-gray-900 dark:text-white' },
    { target: /\btext-gray-800\b/g, darkType: 'dark:text-', replacement: 'text-gray-800 dark:text-gray-100' },
    { target: /\btext-gray-700\b/g, darkType: 'dark:text-', replacement: 'text-gray-700 dark:text-gray-300' },
    { target: /\btext-gray-600\b/g, darkType: 'dark:text-', replacement: 'text-gray-600 dark:text-gray-400' },
    { target: /\btext-gray-500\b/g, darkType: 'dark:text-', replacement: 'text-gray-500 dark:text-gray-400' },
    { target: /\btext-gray-400\b/g, darkType: 'dark:text-', replacement: 'text-gray-400 dark:text-gray-500' },
    { target: /\bbg-white\b/g, darkType: 'dark:bg-', replacement: 'bg-white dark:bg-dark-surface' },
    { target: /\bbg-gray-50\b/g, darkType: 'dark:bg-', replacement: 'bg-gray-50 dark:bg-dark-card' },
    { target: /\bbg-gray-100\b/g, darkType: 'dark:bg-', replacement: 'bg-gray-100 dark:bg-dark-card' },
    { target: /\bbg-gray-200\b/g, darkType: 'dark:bg-', replacement: 'bg-gray-200 dark:bg-dark-border' },
    { target: /\bhover:bg-gray-50\b/g, darkType: 'dark:hover:bg-', replacement: 'hover:bg-gray-50 dark:hover:bg-dark-card' },
    { target: /\bhover:bg-gray-100\b/g, darkType: 'dark:hover:bg-', replacement: 'hover:bg-gray-100 dark:hover:bg-dark-card' },
    { target: /\bhover:bg-gray-200\b/g, darkType: 'dark:hover:bg-', replacement: 'hover:bg-gray-200 dark:hover:bg-dark-border' },
    { target: /\bborder-gray-300\b/g, darkType: 'dark:border-', replacement: 'border-gray-300 dark:border-dark-border' },
    { target: /\bborder-gray-200\b/g, darkType: 'dark:border-', replacement: 'border-gray-200 dark:border-dark-border' },
    { target: /\bborder-gray-100\b/g, darkType: 'dark:border-', replacement: 'border-gray-100 dark:border-dark-border' },
  ];

  let modified = false;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (const rule of rules) {
      line = line.replace(rule.target, (match, offset, string) => {
        // If the same line already contains the darkType prefix (e.g. dark:text-), we skip it to be safe
        // Or if it already contains the exact replacement, we skip
        if (string.includes(rule.darkType)) return match;
        modified = true;
        return rule.replacement;
      });
    }
    lines[i] = line;
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Updated:', filePath);
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

for (const dir of targetDirs) {
  if (fs.existsSync(dir)) {
    traverse(dir);
  }
}
console.log('Done');
