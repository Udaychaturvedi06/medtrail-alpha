const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// Just extracting the fetch records logic to see it
const match = code.match(/useEffect\(\(\) => \{[^]*?if \(!user\) return;[^]*?onSnapshot[^]*?\}, \[user\]\);/s);
if (match) {
    console.log("Found fetchRecords useEffect");
    console.log(match[0].substring(0, 300) + '...');
} else {
    // Try a looser match
    const match2 = code.match(/useEffect\(\(\) => \{[^]*?onSnapshot[^]*?\}\);/s);
    if(match2) console.log(match2[0].substring(0,300));
}
