const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/shared/ShopSelector.jsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('import { useTheme } from "../shared/ThemeContext"')) {
  content = content.replace(
    /import \{ useAuth \} from "..\/..\/features\/auth\/hooks\/useAuth";/,
    'import { useAuth } from "../../features/auth/hooks/useAuth";\nimport { useTheme } from "../shared/ThemeContext";'
  );
}

if (!content.includes('const { theme, setTheme } = useTheme();')) {
  content = content.replace(
    /const ShopSelector = \(\) => \{/,
    'const ShopSelector = () => {\n  const { theme, setTheme } = useTheme();'
  );
}

// Add toggle button right before 'List your business' for BOTH logged-in and logged-out views
const toggleButton = `
                <button 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="w-10 h-10 mr-2 rounded-full flex items-center justify-center bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                  title="Toggle Dark Mode"
                >
                  {theme === 'dark' ? <Sun size={18} className="text-gray-300" /> : <Moon size={18} className="text-gray-600" />}
                </button>
`;

// Replace List your business
content = content.replace(
  /<button[\s\S]*?List your business\s*<\/button>/g,
  (match) => toggleButton + match
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Modified ShopSelector.jsx successfully.');
