const fs = require('fs');
let code = fs.readFileSync('app/broadcasterDashboard.tsx', 'utf8');

// 1. MatchState
code = code.replace(/liveCapturerIdentity: string \| null/g, 'liveCapturerIdentities: string[]');
code = code.replace(/liveCommentatorIdentity: string \| null/g, 'liveCommentatorIdentities: string[]');

// 2. refreshMatches
code = code.replace(/liveCapturerIdentity: sm\.liveCapturerIdentity/g, 'liveCapturerIdentities: sm.liveCapturerIdentities ?? []');
code = code.replace(/liveCommentatorIdentity: sm\.liveCommentatorIdentity/g, 'liveCommentatorIdentities: sm.liveCommentatorIdentities ?? []');

code = code.replace(/liveCapturerIdentity: created\.liveCapturerIdentity,/g, 'liveCapturerIdentities: created.liveCapturerIdentities ?? [],');
code = code.replace(/liveCommentatorIdentity: created\.liveCommentatorIdentity,/g, 'liveCommentatorIdentities: created.liveCommentatorIdentities ?? [],');


// 3. applyLiveSelection signature
code = code.replace(/payload: \{ liveCapturerIdentity\?: string \| null; liveCommentatorIdentity\?: string \| null \}/g, 'payload: { liveCapturerIdentities?: string[]; liveCommentatorIdentities?: string[] }');

// 4. assignCapturerToMatch & assignCommentatorToMatch & clearLive
code = code.replace(/applyLiveSelection\(matchId, \{ liveCapturerIdentity: capturerIdentity \}\)/g, 'applyLiveSelection(matchId, { liveCapturerIdentities: [...(matches.find(m => m.id === matchId)?.liveCapturerIdentities || []), capturerIdentity] })');
code = code.replace(/const current = matches\.find\(m => m\.liveCapturerIdentity === capturerIdentity\)/g, 'const current = matches.find(m => m.liveCapturerIdentities?.includes(capturerIdentity))');
code = code.replace(/if \(current\) applyLiveSelection\(current\.id, \{ liveCapturerIdentity: null \}\)/g, 'if (current) applyLiveSelection(current.id, { liveCapturerIdentities: current.liveCapturerIdentities.filter(id => id !== capturerIdentity) })');

code = code.replace(/applyLiveSelection\(matchId, \{ liveCommentatorIdentity: commentatorIdentity \}\)/g, 'applyLiveSelection(matchId, { liveCommentatorIdentities: [...(matches.find(m => m.id === matchId)?.liveCommentatorIdentities || []), commentatorIdentity] })');
code = code.replace(/const current = matches\.find\(m => m\.liveCommentatorIdentity === commentatorIdentity\)/g, 'const current = matches.find(m => m.liveCommentatorIdentities?.includes(commentatorIdentity))');
code = code.replace(/if \(current\) applyLiveSelection\(current\.id, \{ liveCommentatorIdentity: null \}\)/g, 'if (current) applyLiveSelection(current.id, { liveCommentatorIdentities: current.liveCommentatorIdentities.filter(id => id !== commentatorIdentity) })');

code = code.replace(/await applyLiveSelection\(id, \{ liveCapturerIdentity: null, liveCommentatorIdentity: null \}\)/g, 'await applyLiveSelection(id, { liveCapturerIdentities: [], liveCommentatorIdentities: [] })');


// 5. handleAddMatch
code = code.replace(/liveCapturerIdentity: updated\.liveCapturerIdentity,/g, 'liveCapturerIdentities: updated.liveCapturerIdentities ?? [],');
code = code.replace(/liveCommentatorIdentity: updated\.liveCommentatorIdentity,/g, 'liveCommentatorIdentities: updated.liveCommentatorIdentities ?? [],');


// 6. UI usages
code = code.replace(/await setMatchLiveSelection\(matchId, \{ liveCapturerIdentity: capturerIdentity \}\)/g, 'await setMatchLiveSelection(matchId, { liveCapturerIdentities: [...(matches.find(m => m.id === matchId)?.liveCapturerIdentities || []), capturerIdentity] })');
code = code.replace(/updateMatch\(matchId, m => \(\{ \.\.\.m, liveCapturerIdentity: capturerIdentity \}\)\)/g, 'updateMatch(matchId, m => ({ ...m, liveCapturerIdentities: [...(m.liveCapturerIdentities || []), capturerIdentity] }))');

code = code.replace(/match\.liveCapturerIdentity \?/g, '(match.liveCapturerIdentities && match.liveCapturerIdentities.length > 0) ?');

code = code.replace(/match\.liveCapturerIdentity\n                              \? `Camera live: \$\{roster\.capturers\.find\(p => p\.identity === match\.liveCapturerIdentity\)\?\.name \|\| match\.liveCapturerIdentity\}`/g, '(match.liveCapturerIdentities && match.liveCapturerIdentities.length > 0) ? `Camera live: ${match.liveCapturerIdentities.length}`');
code = code.replace(/m\.liveCapturerIdentity \?\? ''/g, 'm.liveCapturerIdentities?.join(",") ?? ""');
code = code.replace(/m\.liveCommentatorIdentity \?\? ''/g, 'm.liveCommentatorIdentities?.join(",") ?? ""');

code = code.replace(/match\.liveCapturerIdentity !== winner/g, '!(match.liveCapturerIdentities?.includes(winner))');

code = code.replace(/const assignedMatch = matches\.find\(\(m\) => m\.liveCapturerIdentity === p\.identity\)/g, 'const assignedMatch = matches.find((m) => m.liveCapturerIdentities?.includes(p.identity))');

code = code.replace(/count={match\.liveCapturerIdentity \? 1 : 0}/g, 'count={match.liveCapturerIdentities?.length || 0}');
code = code.replace(/count={match\.liveCapturerIdentity \? roster\.viewerCount : 0}/g, 'count={(match.liveCapturerIdentities?.length || 0) > 0 ? roster.viewerCount : 0}');

// 7. Video track handling
code = code.replace(/session\.videoSender\.replaceTrack\(getVideoMST\(match\.liveCapturerIdentity\)\)/g, 'session.videoSender.replaceTrack(getVideoMST(match.liveCapturerIdentities?.[0] ?? null))');
code = code.replace(/session\.audioSender\.replaceTrack\(getAudioMST\(match\.liveCommentatorIdentity, match\.liveCapturerIdentity\)\)/g, 'session.audioSender.replaceTrack(getAudioMST(match.liveCommentatorIdentities?.[0] ?? null, match.liveCapturerIdentities?.[0] ?? null))');
code = code.replace(/const videoMST = getVideoMST\(match\.liveCapturerIdentity\)/g, 'const videoMST = getVideoMST(match.liveCapturerIdentities?.[0] ?? null)');
code = code.replace(/const audioMST = getAudioMST\(match\.liveCommentatorIdentity, match\.liveCapturerIdentity\)/g, 'const audioMST = getAudioMST(match.liveCommentatorIdentities?.[0] ?? null, match.liveCapturerIdentities?.[0] ?? null)');

// 8. Other UI texts
code = code.replace(/match\.liveCapturerIdentity\)/g, 'match.liveCapturerIdentities?.[0] ?? null)');

// 9. remaining liveCapturerIdentity ternary fallback
code = code.replace(/: match\.liveCapturerIdentity/g, ': (match.liveCapturerIdentities?.[0] ?? null)');


fs.writeFileSync('app/broadcasterDashboard.tsx', code);
console.log('Fixed broadcasterDashboard.tsx');
