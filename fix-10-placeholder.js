const fs = require('fs');

let onboarding = fs.readFileSync('src/app/onboarding/page.tsx', 'utf8');
onboarding = onboarding.replace(/placeholder="e\.g\. \+919876543210"/g, 'placeholder="e.g. 9876543210"');
fs.writeFileSync('src/app/onboarding/page.tsx', onboarding);

let dashboard = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
dashboard = dashboard.replace(/placeholder="e\.g\. \+919876543210"/g, 'placeholder="e.g. 9876543210"');
fs.writeFileSync('src/app/dashboard/page.tsx', dashboard);

console.log('Fixed placeholders');
