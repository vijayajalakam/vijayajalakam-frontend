const fs = require('fs');

const file = 'src/layouts/admin/AdminNavbar.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('ArrowLeft')) {
  content = content.replace(
    'import { Menu, ChevronRight, Bell } from "lucide-react";',
    'import { Menu, ChevronRight, Bell, ArrowLeft } from "lucide-react";'
  );
}

if (!content.includes('useNavigate')) {
  content = content.replace(
    'import { useLocation, useParams, Link } from "react-router-dom";',
    'import { useLocation, useParams, Link, useNavigate } from "react-router-dom";'
  );
}

if (!content.includes('const navigate = useNavigate();')) {
  content = content.replace(
    '  const location = useLocation();',
    '  const location = useLocation();\n  const navigate = useNavigate();'
  );
}

const targetHtml = `<div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-brand-primary lg:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="flex flex-col">`;

const replaceHtml = `<div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-brand-primary lg:hidden"
          >
            <Menu size={20} />
          </button>
          
          <button 
            onClick={() => navigate(-1)} 
            className="hidden lg:flex p-2 -ml-2 text-gray-400 hover:text-brand-primary dark:text-gray-500 dark:hover:text-brand-primary transition-all rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card items-center justify-center"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
          <button 
            onClick={() => navigate(-1)} 
            className="lg:hidden p-2 text-gray-400 hover:text-brand-primary dark:text-gray-500 dark:hover:text-brand-primary transition-all rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card flex items-center justify-center"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex flex-col">`;

if (content.includes(targetHtml)) {
  content = content.replace(targetHtml, replaceHtml);
  fs.writeFileSync(file, content);
  console.log("Updated AdminNavbar.jsx with back button");
} else {
  // Let's try an alternative matching in case there are whitespace differences
  const targetHtmlAlternative = `        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-brand-primary lg:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="flex flex-col">`;
  const html2 = content.replace(targetHtmlAlternative, replaceHtml);
  if (html2 !== content) {
    fs.writeFileSync(file, html2);
    console.log("Updated AdminNavbar.jsx with back button (alt match)");
  } else {
    console.log("Could not find the target HTML block.");
  }
}
