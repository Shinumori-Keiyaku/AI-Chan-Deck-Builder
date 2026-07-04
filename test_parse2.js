const p3 = '{name="Rabina the Attacker",effects={{name="Add Mecha Enigma",effect={create={cards={"Mecha Enigma"},amount=1,hand=true}}}}},';
const targets = new Set();
// match create={...} or transform={...} roughly by capturing the contents until a closing brace that might end the cards array
// Actually, let's just do a simple character scanner!
let inCreateOrTransform = false;
let str = p3;
for (let i = 0; i < str.length; i++) {
  if (str.startsWith('create=', i) || str.startsWith('transform=', i)) {
    // find next cards=
    let cardsIdx = str.indexOf('cards=', i);
    let nextEffect = str.indexOf('effect=', i + 1);
    if (cardsIdx !== -1 && (nextEffect === -1 || cardsIdx < nextEffect)) {
      let rest = str.substring(cardsIdx);
      let cardsMatch = rest.match(/^cards\s*=\s*\{([^}]+)\}/);
      if (cardsMatch) {
        cardsMatch[1].split(',').forEach(s => targets.add(s.replace(/"/g, '').trim()));
      } else {
        let setMatch = rest.match(/^cards\s*=\s*set\.([a-zA-Z0-9_]+)/);
        if (setMatch) {
          targets.add("SET:" + setMatch[1]);
        }
      }
    }
  }
}
console.log(Array.from(targets));
