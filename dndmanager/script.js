let fullText = "";

function mod(score) { return Math.floor((score - 10) / 2); }
function prof(level) { return 2 + Math.floor(((level || 1) - 1) / 4); }

function updateSheet() {
  const abilities = ["str", "dex", "con", "int", "wis", "cha"];
  abilities.forEach(ab => {
    const val = parseInt(document.getElementById(ab).value) || 10;
    document.getElementById(ab + "Mod").textContent = (mod(val) >= 0 ? "+" : "") + mod(val);
  });
  // Parse level from class field
  const classVal = document.getElementById("charClass").value;
  let level = 1;
  const match = classVal.match(/\d+/);
  if (match) level = parseInt(match[0]);
  document.getElementById("profBonus").value = prof(level);
  document.getElementById("passivePerception").value =
    10 + mod(parseInt(document.getElementById("wis").value) || 10);
}

document.querySelectorAll("input[type=number], #charClass").forEach(el => {
  el.addEventListener("input", updateSheet);
});

// Save/load to localStorage
function saveChar() {
  const data = {
    name: document.getElementById("charName").value,
    class: document.getElementById("charClass").value,
    race: document.getElementById("charRace").value,
    background: document.getElementById("charBackground").value,
    str: document.getElementById("str").value,
    dex: document.getElementById("dex").value,
    con: document.getElementById("con").value,
    int: document.getElementById("int").value,
    wis: document.getElementById("wis").value,
    cha: document.getElementById("cha").value,
    notes: document.getElementById("notes").value,
    spells: getSpells()
  };
  localStorage.setItem("dnd5echar", JSON.stringify(data));
  alert("Character saved!");
}
function loadChar() {
  const data = JSON.parse(localStorage.getItem("dnd5echar") || "{}");
  if (!data.name) return;
  document.getElementById("charName").value = data.name || "";
  document.getElementById("charClass").value = data.class || "";
  document.getElementById("charRace").value = data.race || "";
  document.getElementById("charBackground").value = data.background || "";
  document.getElementById("str").value = data.str || 10;
  document.getElementById("dex").value = data.dex || 10;
  document.getElementById("con").value = data.con || 10;
  document.getElementById("int").value = data.int || 10;
  document.getElementById("wis").value = data.wis || 10;
  document.getElementById("cha").value = data.cha || 10;
  document.getElementById("notes").value = data.notes || "";
  setSpells(data.spells);
  updateSheet();
}
function exportChar() {
  const data = {
    name: document.getElementById("charName").value,
    class: document.getElementById("charClass").value,
    race: document.getElementById("charRace").value,
    background: document.getElementById("charBackground").value,
    str: document.getElementById("str").value,
    dex: document.getElementById("dex").value,
    con: document.getElementById("con").value,
    int: document.getElementById("int").value,
    wis: document.getElementById("wis").value,
    cha: document.getElementById("cha").value,
    notes: document.getElementById("notes").value,
    spells: getSpells()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (data.name || "character") + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
}
function clearChar() {
  if (confirm("Clear all fields?")) {
    document.querySelectorAll(".sheet-container input").forEach(el => {
      if (el.type === "number") el.value = 10;
      else el.value = "";
    });
    updateSheet();
  }
}

document.getElementById("saveBtn").onclick = saveChar;
document.getElementById("loadBtn").onclick = loadChar;
document.getElementById("exportBtn").onclick = exportChar;
document.getElementById("clearBtn").onclick = clearChar;

// PDF Import logic (optional, can be removed if not needed)
document.getElementById('pdf-upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('import-status').textContent = "Importing...";
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(" ");
      text += pageText + "\n";
    }
    // Try to extract fields from text
    let found = 0;
    function extract(regex, cb) {
      const m = text.match(regex);
      if (m && m[1]) { cb(m[1]); found++; }
    }
    extract(/Name\s*[:\-]?\s*([A-Za-z0-9' ]{2,})/, v => document.getElementById("charName").value = v.trim());
    extract(/Class\s*[:\-]?\s*([A-Za-z0-9' ]+)/, v => document.getElementById("charClass").value = v.trim());
    extract(/Race\s*[:\-]?\s*([A-Za-z0-9' ]+)/, v => document.getElementById("charRace").value = v.trim());
    extract(/Background\s*[:\-]?\s*([A-Za-z0-9' ]+)/, v => document.getElementById("charBackground").value = v.trim());
    extract(/Strength\s*([0-9]{1,2})/, v => document.getElementById("str").value = v);
    extract(/Dexterity\s*([0-9]{1,2})/, v => document.getElementById("dex").value = v);
    extract(/Constitution\s*([0-9]{1,2})/, v => document.getElementById("con").value = v);
    extract(/Intelligence\s*([0-9]{1,2})/, v => document.getElementById("int").value = v);
    extract(/Wisdom\s*([0-9]{1,2})/, v => document.getElementById("wis").value = v);
    extract(/Charisma\s*([0-9]{1,2})/, v => document.getElementById("cha").value = v);
    updateSheet();
    document.getElementById('import-status').textContent =
      found ? `Imported ${found} fields from PDF.` : "Could not auto-extract fields. Please fill manually.";
  } catch (err) {
    document.getElementById('import-status').textContent = "PDF import failed.";
  }
});

document.getElementById('json-upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);

    // Helper to get value from multiple possible keys
    function getField(...names) {
      for (const n of names) if (data[n] !== undefined && data[n] !== "") return data[n];
      return "";
    }

    // Map details_* keys and fallback to simple keys
    document.getElementById("charName").value =
      getField("details_character_name", "character_name", "name", "CharacterName", "Character Name");
    document.getElementById("charClass").value =
      getField("details_build", "details_class", "class", "Class", "ClassLevel", "Class Level");
    document.getElementById("charRace").value =
      getField("details_race", "race", "Race");
    document.getElementById("charBackground").value =
      getField("details_background", "background", "Background");
    document.getElementById("str").value =
      getField("details_str_modifier", "details_str_score", "str", "STR", "Strength") || 10;
    document.getElementById("dex").value =
      getField("details_dex_modifier", "details_dex_score", "dex", "DEX", "Dexterity") || 10;
    document.getElementById("con").value =
      getField("details_con_modifier", "details_con_score", "con", "CON", "Constitution") || 10;
    document.getElementById("int").value =
      getField("details_int_modifier", "details_int_score", "int", "INT", "Intelligence") || 10;
    document.getElementById("wis").value =
      getField("details_wis_modifier", "details_wis_score", "wis", "WIS", "Wisdom") || 10;
    document.getElementById("cha").value =
      getField("details_cha_modifier", "details_cha_score", "cha", "CHA", "Charisma") || 10;
    document.getElementById("notes").value =
      getField("details_notes", "notes", "Notes", "background_story");
    setSpells(data.spells);
    updateSheet();
    alert("Character imported from JSON!");
  } catch {
    alert("Invalid JSON file.");
  }
});

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}
function rollDice(expr) {
  // Supports "2d6+3" etc.
  const match = expr.match(/(\d*)d(\d+)([+-]\d+)?/i);
  if (!match) return NaN;
  const num = parseInt(match[1] || "1");
  const die = parseInt(match[2]);
  const mod = parseInt(match[3] || "0");
  let total = 0, rolls = [];
  for (let i = 0; i < num; i++) {
    const r = rollDie(die);
    rolls.push(r);
    total += r;
  }
  total += mod;
  return { total, rolls, mod };
}

document.getElementById("roll-ability-btn").onclick = function() {
  const ab = document.getElementById("roll-ability").value;
  const modVal = parseInt(document.getElementById(ab + "Mod").textContent) || 0;
  const d20 = rollDie(20);
  document.getElementById("roll-result").textContent =
    `d20: ${d20} + Mod (${modVal}) = ${d20 + modVal}`;
};

document.getElementById("roll-attack-btn").onclick = function() {
  const bonus = parseInt(document.getElementById("attack-bonus").value) || 0;
  const d20 = rollDie(20);
  document.getElementById("roll-result").textContent =
    `Attack Roll: d20 ${d20} + Bonus (${bonus}) = ${d20 + bonus}`;
};

document.getElementById("roll-damage-btn").onclick = function() {
  const expr = document.getElementById("damage-dice").value;
  const result = rollDice(expr);
  if (isNaN(result.total)) {
    document.getElementById("roll-result").textContent = "Invalid dice expression!";
    return;
  }
  document.getElementById("roll-result").textContent =
    `Damage Roll: [${result.rolls.join(", ")}] ${result.mod ? (result.mod > 0 ? "+" : "") + result.mod : ""} = ${result.total}`;
};

function createSpellInput(name = "", level = "") {
  const div = document.createElement("div");
  div.className = "spell-entry";
  div.style.marginBottom = "0.5em";
  div.innerHTML = `
    <input type="text" placeholder="Spell Name" value="${name}" style="width: 12em; margin-right:0.5em;">
    <input type="text" placeholder="Level" value="${level}" style="width: 4em; margin-right:0.5em;">
    <button type="button" class="remove-spell-btn">Remove</button>
  `;
  div.querySelector(".remove-spell-btn").onclick = () => div.remove();
  return div;
}

document.getElementById("add-spell-btn").onclick = function() {
  document.getElementById("spells-list").appendChild(createSpellInput());
};

function getSpells() {
  return Array.from(document.querySelectorAll("#spells-list .spell-entry")).map(div => {
    const inputs = div.querySelectorAll("input");
    return { name: inputs[0].value, level: inputs[1].value };
  });
}
function setSpells(spells) {
  const list = document.getElementById("spells-list");
  list.innerHTML = "";
  (spells || []).forEach(spell => list.appendChild(createSpellInput(spell.name, spell.level)));
}

// Initialize
updateSheet();
loadChar();