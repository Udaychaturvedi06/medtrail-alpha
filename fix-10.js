const fs = require('fs');

let onboarding = fs.readFileSync('src/app/onboarding/page.tsx', 'utf8');
onboarding = onboarding.replace(/pattern="\^\\\+\?\[0-9\]\{10,15\}\$"/g, 'pattern="^[0-9]{10}$"');
onboarding = onboarding.replace(/title="Enter a valid 10-15 digit phone number \(no spaces or dashes\)"/g, 'title="Enter exactly 10 digits"');
fs.writeFileSync('src/app/onboarding/page.tsx', onboarding);

let dashboard = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
dashboard = dashboard.replace(/pattern="\^\\\+\?\[0-9\]\{10,15\}\$"/g, 'pattern="^[0-9]{10}$"');
dashboard = dashboard.replace(/title="Enter a valid 10-15 digit phone number \(no spaces or dashes\)"/g, 'title="Enter exactly 10 digits"');
fs.writeFileSync('src/app/dashboard/page.tsx', dashboard);

console.log('Fixed to 10 digits');
