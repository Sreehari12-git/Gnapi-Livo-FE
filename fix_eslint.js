const fs = require('fs');

const fixUnescaped = (file) => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  // Only replace inside JSX text nodes. We can look for common phrases if we know them, 
  // or use a safe regex that matches words with apostrophes not inside attributes.
  // E.g. " >Couldn't< "
  code = code.replace(/>([^<]*)(don't|can't|couldn't|won't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|didn't|it's|let's|that's|who's|what's|here's|there's|I'm|I've|I'll|you're|you've|you'll|we're|we've|we'll|they're|they've|they'll)([^<]*)</gi, (match, p1, p2, p3) => {
    return '>' + p1 + p2.replace(/'/g, '&apos;') + p3 + '<';
  });
  
  // also fix quotes if they are unescaped inside text. E.g. >"Hello"< -> >&quot;Hello&quot;<
  // We can just use replace carefully for "
  
  fs.writeFileSync(file, code);
}

const files = [
  'app/CreateEventPanel.tsx',
  'app/Eventidgate.tsx',
  'app/broadcasterDashboard.tsx',
  'app/index.tsx',
  'app/organisers.tsx',
  'app/razorpayCheckout.tsx'
];

files.forEach(fixUnescaped);

// Specifically for index.tsx quotes on line 309
let indexCode = fs.readFileSync('app/index.tsx', 'utf8');
indexCode = indexCode.replace(/>"([^"]*)"</g, '>&quot;$1&quot;<');
fs.writeFileSync('app/index.tsx', indexCode);
