// Fetches current NBA win totals from ESPN's public standings feed
// and writes them to your Firestore league document.
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings';
const FIRESTORE = 'https://firestore.googleapis.com/v1/projects/nba-team-pickem/databases/(default)/documents/league/main';

const res = await fetch(STANDINGS, { headers: { 'user-agent': 'Mozilla/5.0' } });
if (!res.ok) throw new Error('ESPN request failed: HTTP ' + res.status);
const data = await res.json();

const wins = {};
for (const conf of data.children || []) {
  for (const e of conf.standings?.entries || []) {
    const w = e.stats?.find(s => s.name === 'wins');
    if (w && e.team?.displayName) wins[e.team.displayName] = Math.round(Number(w.value));
  }
}
const count = Object.keys(wins).length;
if (count !== 30) throw new Error('Expected 30 teams but parsed ' + count + '. ESPN may have changed its format.');

const stamp = new Date().toLocaleString('en-US', {
  timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short'
}) + ' PT (auto)';

const body = {
  fields: {
    wins: { mapValue: { fields: Object.fromEntries(Object.entries(wins).map(([t, v]) => [t, { integerValue: String(v) }])) } },
    updated: { stringValue: stamp }
  }
};
const url = FIRESTORE + '?updateMask.fieldPaths=wins&updateMask.fieldPaths=updated';
const out = await fetch(url, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
if (!out.ok) throw new Error('Firestore write failed: HTTP ' + out.status + ' ' + await out.text());
console.log('Updated wins for', count, 'teams at', stamp);
