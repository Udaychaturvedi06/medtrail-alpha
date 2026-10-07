const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// 1. SOS Logic
code = code.replace(
  "const res = await fetch('/api/sos', { method: 'POST' });",
  "const res = await fetch('/api/sos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emergencyPhone: profile?.emergencyContact || profile?.phone }) });"
);

// 2. Add "Viewing Patient" Header Banner above Dashboard
const viewingBanner = \            <div className="lg:col-span-3">
              {viewingPatient && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-r-xl flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-bold">Viewing Patient Record: {viewingPatient.name || viewingPatient.displayName}</p>
                    <p className="text-sm">({viewingPatient.email || viewingPatient.phone})</p>
                  </div>
                  <Button variant="outline" onClick={() => setViewingPatient(null)} className="border-yellow-500 text-yellow-700 hover:bg-yellow-50 font-bold">
                    Close Patient View
                  </Button>
                </div>
              )}

              <AnimatePresence mode="wait">\;
              
code = code.replace(
  "            <div className=\"lg:col-span-3\">\n              <AnimatePresence mode=\"wait\">",
  viewingBanner
);
code = code.replace(
  "            <div className=\"lg:col-span-3\">\r\n              <AnimatePresence mode=\"wait\">",
  viewingBanner
);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log('Done rewrites part 1.');
