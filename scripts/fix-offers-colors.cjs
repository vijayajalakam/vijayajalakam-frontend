const fs = require('fs');
const p = 'c:/vijayajalakam/vijayajalakam-frontend/src/features/settings/components/OffersManager.jsx';
let content = fs.readFileSync(p, 'utf-8');

// Fix input text colors
content = content.replace(/className="w-full px-3 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-brand-primary outline-none"/g, 'className="w-full px-3 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none"');

content = content.replace(/className="pl-9 pr-4 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg text-sm bg-gray-50 dark:bg-dark-card outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary\\/10 w-full"/g, 'className="pl-9 pr-4 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-dark-card outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 w-full"');

// Fix active tab text color
content = content.replace(/text-brand-primary" \: "text-gray-500/g, 'text-brand-primary dark:text-blue-400" : "text-gray-500');

// Fix service/product price text color
content = content.replace(/className="text-xs text-gray-500">/g, 'className="text-xs text-gray-500 dark:text-gray-400">');

fs.writeFileSync(p, content, 'utf-8');
console.log('Fixed text colors in OffersManager.jsx');
