const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

code = code.replace(
  'pattern="^\\+?[0-9\\s\\-\\(\\)]{7,15}$"',
  'pattern="^\\+?[0-9]{10,15}$"'
);
code = code.replace(
  'title="Please enter a valid phone number"',
  'title="Enter a valid 10-15 digit phone number (no spaces or dashes)" placeholder="e.g. +919876543210"'
);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log('Fixed');
