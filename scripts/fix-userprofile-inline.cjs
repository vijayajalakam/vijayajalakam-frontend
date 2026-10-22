const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/features/booking/pages/UserProfile.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace color="#111"
content = content.replace(/color="#111"/g, 'color={theme === "dark" ? "#fff" : "#111"}');
// Replace color: "#111"
content = content.replace(/color:\s*"#111"/g, 'color: theme === "dark" ? "#fff" : "#111"');
// Replace color: "#000"
content = content.replace(/color:\s*"#000"/g, 'color: theme === "dark" ? "#fff" : "#000"');
// Replace backgroundColor: "#fff"
content = content.replace(/backgroundColor:\s*"#fff"/g, 'backgroundColor: theme === "dark" ? "#1f2937" : "#fff"');
// Replace backgroundColor: "#fafafa"
content = content.replace(/backgroundColor:\s*"#fafafa"/g, 'backgroundColor: theme === "dark" ? "#374151" : "#fafafa"');
// Replace border: "1.5px solid #f0f0f0"
content = content.replace(/border:\s*"1\.5px solid #f0f0f0"/g, 'border: theme === "dark" ? "1.5px solid #374151" : "1.5px solid #f0f0f0"');
// Replace border: "1.5px solid #e5e5e5"
content = content.replace(/border:\s*"1\.5px solid #e5e5e5"/g, 'border: theme === "dark" ? "1.5px solid #374151" : "1.5px solid #e5e5e5"');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed UserProfile inline styles');
