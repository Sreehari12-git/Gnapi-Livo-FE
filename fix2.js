const fs = require('fs');
let code = fs.readFileSync('app/broadcasterDashboard.tsx', 'utf8');

code = code.replace(/match\.liveCommentatorIdentity \?/g, '(match.liveCommentatorIdentities && match.liveCommentatorIdentities.length > 0) ?');

code = code.replace(/match\.liveCommentatorIdentity\n                              \? `Camera live: \$\{roster\.commentators\.find\(p => p\.identity === match\.liveCommentatorIdentity\)\?\.name \|\| match\.liveCommentatorIdentity\}`/g, '(match.liveCommentatorIdentities && match.liveCommentatorIdentities.length > 0) ? `Camera live: ${match.liveCommentatorIdentities.length}`');
code = code.replace(/match\.liveCommentatorIdentity\n                              \? `Mic live: \$\{roster\.commentators\.find\(p => p\.identity === match\.liveCommentatorIdentity\)\?\.name \|\| match\.liveCommentatorIdentity\}`/g, '(match.liveCommentatorIdentities && match.liveCommentatorIdentities.length > 0) ? `Mic live: ${match.liveCommentatorIdentities.length}`');

code = code.replace(/const assignedMatch = matches\.find\(\(m\) => m\.liveCommentatorIdentity === p\.identity\)/g, 'const assignedMatch = matches.find((m) => m.liveCommentatorIdentities?.includes(p.identity))');

code = code.replace(/count={match\.liveCommentatorIdentity \? 1 : 0}/g, 'count={match.liveCommentatorIdentities?.length || 0}');
code = code.replace(/count={match\.liveCommentatorIdentity \? roster\.viewerCount : 0}/g, 'count={(match.liveCommentatorIdentities?.length || 0) > 0 ? roster.viewerCount : 0}');


code = code.replace(/match\.liveCommentatorIdentity !== winner/g, '!(match.liveCommentatorIdentities?.includes(winner))');

// 8. Other UI texts
code = code.replace(/match\.liveCommentatorIdentity\)/g, 'match.liveCommentatorIdentities?.[0] ?? null)');

// 9. remaining liveCommentatorIdentity ternary fallback
code = code.replace(/: match\.liveCommentatorIdentity/g, ': (match.liveCommentatorIdentities?.[0] ?? null)');

code = code.replace(/match\.liveCommentatorIdentity/g, '(match.liveCommentatorIdentities?.[0] ?? null)');

fs.writeFileSync('app/broadcasterDashboard.tsx', code);
console.log('Fixed broadcasterDashboard.tsx');
