const p2 = 'doll={"Knight Doll","Suicide Doll"},sigil={"Torment Sigil"}';
const p3 = '{name="Rabina the Attacker",effects={{name="Add Mecha Enigma",effect={create={cards={"Mecha Enigma"},amount=1,hand=true}}}}},';

const sets = {};
const p2Matches = [...p2.matchAll(/([a-zA-Z0-9_]+)\=\{([^}]+)\}/g)];
for (const match of p2Matches) {
  const name = match[1];
  const items = match[2].split(',').map(s => s.replace(/"/g, '').trim());
  sets[name] = items;
}

const targets = new Set();
const createTransformRegex = /(?:create|transform)\s*=\s*\{([\s\S]*?)\}/g;
const matches = [...p3.matchAll(createTransformRegex)];
for (const m of matches) {
  const inner = m[1];
  const cardsMatch = inner.match(/cards\s*=\s*\{([^}]+)\}/);
  if (cardsMatch) {
    const items = cardsMatch[1].split(',').map(s => s.replace(/"/g, '').trim());
    items.forEach(i => targets.add(i));
  }
  const setMatch = inner.match(/cards\s*=\s*set\.([a-zA-Z0-9_]+)/);
  if (setMatch) {
    const setName = setMatch[1];
    if (sets[setName]) {
      sets[setName].forEach(i => targets.add(i));
    }
  }
}
console.log(sets);
console.log(Array.from(targets));
