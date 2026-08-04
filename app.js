// Blue Heater 2 - Build Calculator app.js
// Made by Oush Xanax scripts
(function () {
  const D = window.GAME_DATA;
  const $ = (id) => document.getElementById(id);

  // Game has 6 stats. AGI IS the Stamina stat (per in-game description "Increases total Stamina capacity").
  const STATS = ["STR", "DEX", "INT", "VIT", "AGI", "FOC"];
  const STAT_LABEL = {
    STR: "Strength", DEX: "Dexterity", INT: "Intelligence",
    VIT: "Vitality", AGI: "Agility", FOC: "Focus",
  };
  const STAT_DESC = {
    STR: "Increases Sword, Greatsword, Axe, and Spear Power",
    DEX: "Increases Rapier, Dagger, and Scythe Power",
    INT: "Increases Magical Power output",
    VIT: "Increases total Health capacity",
    AGI: "Increases total Stamina capacity",
    FOC: "Increases total Mana capacity",
  };
  const STAT_COLOR = {
    STR: "str", DEX: "dex", INT: "int",
    VIT: "vit", AGI: "agi", FOC: "foc",
  };

  // ---------------- State ----------------
  const state = {
    archetype: "Sword_AllAround",
    race: "Demon",
    level: 120,
    weaponCat: "Sword",
    weaponRarity: "Legendary",
    weapon: "",
    offhand: "none",   // "none" | "dualwield" | "shield"
    shield: "",
    armor: "",
    stats: Object.fromEntries(STATS.map((s) => [s, 0])),
    talents: [null, null, null, null, null, null],
    skills: [null, null, null, null, null, null],
    subs: { wPhys: 0, wMag: 0, wCR: 0, wCD: 0, wGP: 0, aPR: 0, aMR: 0, aAR: 0, aWS: 0, aGP: 0 },
    dungeon: "",
  };

  // ---------------- Populate selects ----------------
  function fill(sel, arr, placeholder) {
    sel.innerHTML = "";
    if (placeholder) {
      const o = document.createElement("option");
      o.value = ""; o.textContent = placeholder;
      sel.appendChild(o);
    }
    arr.forEach((v) => {
      const o = document.createElement("option");
      if (typeof v === "string") { o.value = v; o.textContent = v; }
      else { o.value = v.value; o.textContent = v.label; }
      sel.appendChild(o);
    });
  }

  function initSelects() {
    fill($("archetype"), Object.keys(D.archetypes).map((k) => ({ value: k, label: D.archetypes[k].label })));
    $("archetype").value = state.archetype;

    fill($("race"), D.races.map((r) => r.name));
    $("race").value = state.race;

    fill($("weaponCat"), Object.keys(D.weapons));
    $("weaponCat").value = state.weaponCat;
    refreshWeapons();

    fill($("armor"), D.armors.map((a) => ({ value: a.name, label: `${a.name}  [${a.rarity} L${a.level[0]}-${a.level[1]}]` })), "-- select armor --");

    fill($("dungeon"), D.dungeons.map((d) => ({ value: d.name, label: `${d.name} (L${d.levelRange[0]}-${d.levelRange[1]})` })), "-- pick a dungeon --");

    fill($("shield"), flattenRarity(D.shields), "-- pick shield --");
  }

  function flattenRarity(bucketed) {
    const order = ["Legendary", "SuperRare", "Rare", "Uncommon", "Common"];
    const out = [];
    order.forEach((r) => (bucketed[r] || []).forEach((n) => out.push({ value: n, label: `${n}  [${r}]` })));
    return out;
  }

  function refreshWeapons() {
    const cat = $("weaponCat").value;
    const rarities = Object.keys(D.weapons[cat]);
    fill($("weaponRarity"), rarities);
    $("weaponRarity").value = state.weaponRarity in D.weapons[cat] ? state.weaponRarity : rarities[rarities.length - 1];
    state.weaponRarity = $("weaponRarity").value;
    refreshWeaponList();
  }
  function refreshWeaponList() {
    const cat = $("weaponCat").value;
    const rar = $("weaponRarity").value;
    const list = D.weapons[cat][rar] || [];
    // Weapons are now full objects; expose name via option value + label with fromLv.
    const opts = list.map((w) => ({ value: w.name, label: `${w.name}  [L${w.fromLv}+]` }));
    fill($("weapon"), opts, "-- pick weapon --");
    state.weapon = list[0] ? list[0].name : "";
    $("weapon").value = state.weapon;
    updateWeaponInfo();
  }

  // Look up the currently equipped weapon object (or null).
  function getCurrentWeapon() {
    const cat = state.weaponCat;
    const rar = state.weaponRarity;
    const list = (D.weapons[cat] && D.weapons[cat][rar]) || [];
    return list.find((w) => w.name === state.weapon) || list[0] || null;
  }

  // Compute a weapon's live stats at a given character level. Level clamps to
  // weapon.fromLv on the low end. Applies per-category specialty modifiers.
  function weaponStatsAtLevel(weapon, level) {
    if (!weapon) return { physPow: 0, magicPow: 0, critRate: 0, critDmg: 0, guardPow: 0 };
    const L = Math.max(level || weapon.fromLv, weapon.fromLv);
    const dL = L - weapon.fromLv;
    let physPow  = (weapon.basePhysPOW  || 0) + (weapon.perLvPhys  || 0) * dL;
    let magicPow = (weapon.baseMagicPOW || 0) + (weapon.perLvMagic || 0) * dL;
    let guardPow = (weapon.baseGuardPOW || 0) + (weapon.perLvGuard || 0) * dL;
    let critRate = weapon.baseCritRate || 0;
    let critDmg  = weapon.baseCritDmg  || 0;
    // Specialty modifiers per category.
    const mod = (D.weaponSpecialtyMods && D.weaponSpecialtyMods[weapon.category]) || {};
    if (mod.physPowMult)  physPow  *= mod.physPowMult;
    if (mod.magicPowMult) magicPow *= mod.magicPowMult;
    if (mod.guardPowMult) guardPow *= mod.guardPowMult;
    if (mod.critRateAdd)  critRate += mod.critRateAdd;
    if (mod.critDmgAdd)   critDmg  += mod.critDmgAdd;
    return {
      physPow:  Math.round(physPow),
      magicPow: Math.round(magicPow),
      guardPow: Math.round(guardPow),
      critRate,
      critDmg,
    };
  }
  function updateWeaponInfo() {
    const cat = $("weaponCat").value;
    const rar = $("weaponRarity").value;
    const scaling = D.weaponScaling[cat];
    const min = D.weaponMinStat[rar] || 0;
    const cur = state.stats[scaling] || 0;
    const okBadge = cur >= min
      ? `<span class="pill good">READY</span>`
      : `<span class="pill bad">NEED ${scaling} ${min} (you have ${cur})</span>`;
    $("weaponInfo").innerHTML =
      `<b class="c-accent">Scaling:</b> <span class="stat-tag ${STAT_COLOR[scaling]||''}">${scaling}</span> ` +
      `&nbsp;|&nbsp; <b class="c-accent">Specialty:</b> ${D.weaponSpecialty[cat]} ` +
      `&nbsp;|&nbsp; <b class="c-accent">Min Stat:</b> ${scaling} ${min} ${okBadge}`;
  }

  // ---------------- Stat grid ----------------
  function buildStatsGrid() {
    const wrap = $("statsGrid");
    wrap.innerHTML = "";
    STATS.forEach((s) => {
      const row = document.createElement("div");
      row.className = "stat-row stat-" + STAT_COLOR[s];
      row.innerHTML = `
        <div style="display:flex;justify-content:space-between">
          <div>
            <div class="name"><span class="stat-tag ${STAT_COLOR[s]}">${s}</span> ${STAT_LABEL[s]}</div>
            <div class="desc">${STAT_DESC[s]}</div>
          </div>
        </div>
        <div class="controls">
          <button class="mini" data-s="${s}" data-d="-10">-10</button>
          <button class="mini" data-s="${s}" data-d="-1">-1</button>
          <input type="number" min="0" data-s="${s}" value="${state.stats[s]}" />
          <button class="mini" data-s="${s}" data-d="1">+1</button>
          <button class="mini" data-s="${s}" data-d="10">+10</button>
        </div>`;
      wrap.appendChild(row);
    });
    wrap.querySelectorAll("button.mini").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = btn.dataset.s; const d = parseInt(btn.dataset.d, 10);
        state.stats[s] = Math.max(0, (state.stats[s] || 0) + d);
        clampStats();
        syncStatInputs();
        render();
      });
    });
    wrap.querySelectorAll("input[type=number]").forEach((inp) => {
      inp.addEventListener("input", () => {
        const s = inp.dataset.s;
        state.stats[s] = Math.max(0, parseInt(inp.value || "0", 10));
        clampStats();
        render();
      });
    });
  }
  function syncStatInputs() {
    document.querySelectorAll("#statsGrid input[type=number]").forEach((inp) => {
      inp.value = state.stats[inp.dataset.s];
    });
  }
  function clampStats() {
    const cap = D.mechanics.maxStatPoints;
    let total = STATS.reduce((a, s) => a + (state.stats[s] || 0), 0);
    if (total <= cap) return;
    while (total > cap) {
      let biggest = STATS[0];
      STATS.forEach((s) => { if (state.stats[s] > state.stats[biggest]) biggest = s; });
      state.stats[biggest] = Math.max(0, state.stats[biggest] - 1);
      total--;
    }
  }

  // ---------------- Talent + Skill slot grids ----------------
  function buildTalentSlots() {
    const wrap = $("talentSlots");
    wrap.innerHTML = "";
    const allTalents = allTalentOptions();
    for (let i = 0; i < 6; i++) {
      const slot = document.createElement("div");
      slot.className = "slot" + (i === 0 ? " locked" : "");
      slot.innerHTML = `
        <div class="lbl">${i === 0 ? "Slot 1 (race-tied recommended)" : "Slot " + (i + 1)}</div>
        <select data-i="${i}"></select>`;
      wrap.appendChild(slot);
      const sel = slot.querySelector("select");
      fill(sel, allTalents, "-- none --");
      sel.value = state.talents[i] || "";
      sel.addEventListener("change", () => { state.talents[i] = sel.value || null; render(); });
    }
  }
  function allTalentOptions() {
    const out = [];
    ["weaponTraining", "statusBoosts", "conditional", "general"].forEach((cat) => {
      D.talents[cat].forEach((t) => out.push({ value: t.name, label: `${t.name} - ${t.effect}` }));
    });
    return out;
  }
  function buildSkillSlots() {
    const wrap = $("skillSlots");
    wrap.innerHTML = "";
    const opts = D.skills.map((s) => ({ value: s.name, label: skillLabel(s) }));
    for (let i = 0; i < 6; i++) {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.innerHTML = `
        <div class="lbl">Skill ${i + 1}</div>
        <select data-i="${i}"></select>`;
      wrap.appendChild(slot);
      const sel = slot.querySelector("select");
      fill(sel, opts, "-- none --");
      sel.value = state.skills[i] || "";
      sel.addEventListener("change", () => { state.skills[i] = sel.value || null; render(); });
    }
  }
  function skillLabel(s) {
    const req = Object.entries(s.req || {}).map(([k, v]) => `${k}${v}`).join(",");
    const wtag = (s.weapons && s.weapons.length) ? " <" + s.weapons.join("/") + ">" : "";
    const dw = s.dualWield ? " [DUAL]" : "";
    return `${s.name} [${s.type}] MP${s.mp}/CD${s.cd}${req ? " (" + req + ")" : ""}${wtag}${dw}`;
  }

  // ---------------- Apply preset ----------------
  // Auto-pick the best weapon in the current category+rarity for the character's
  // level: prefer weapons whose fromLv <= state.level with the highest fromLv
  // (closest matching tier). Falls back to the first entry.
  function autoPickWeapon() {
    const cat = state.weaponCat;
    const rar = state.weaponRarity;
    const list = (D.weapons[cat] && D.weapons[cat][rar]) || [];
    if (!list.length) { state.weapon = ""; return; }
    const eligible = list.filter((w) => w.fromLv <= state.level);
    const pool = eligible.length ? eligible : list;
    pool.sort((a, b) => b.fromLv - a.fromLv);
    state.weapon = pool[0].name;
    const wSel = $("weapon");
    if (wSel) wSel.value = state.weapon;
  }

  function applyPreset() {
    const a = D.archetypes[state.archetype];
    if (!a) return;
    if (a.recommendedRaces && a.recommendedRaces.length) {
      state.race = a.recommendedRaces[0]; $("race").value = state.race;
    }
    state.level = D.mechanics.maxLevel; $("level").value = state.level;
    if (a.recommendedWeapons && a.recommendedWeapons.length) {
      state.weaponCat = a.recommendedWeapons[0]; $("weaponCat").value = state.weaponCat;
      refreshWeapons();
    }
    // pick the best-fit weapon for the level within the current cat+rarity
    autoPickWeapon();
    // offhand
    state.offhand = a.recommendedOffhand || "none";
    $("offhand").value = state.offhand;
    // shield
    if (state.offhand === "shield" && a.recommendedShield) {
      state.shield = a.recommendedShield;
      $("shield").value = state.shield;
    } else {
      state.shield = "";
      $("shield").value = "";
    }
    // armor
    if (a.recommendedArmor && a.recommendedArmor.length) {
      state.armor = a.recommendedArmor[0];
      $("armor").value = state.armor;
    }
    // stats plan
    STATS.forEach((s) => (state.stats[s] = a.statPlan[s] || 0));
    clampStats();
    // talents
    for (let i = 0; i < 6; i++) state.talents[i] = a.talentPicks[i] || null;
    // preferred skills (fall back to auto-pick if list is short)
    if (a.recommendedSkills && a.recommendedSkills.length) {
      state.skills = [null, null, null, null, null, null];
      for (let i = 0; i < 6 && i < a.recommendedSkills.length; i++) {
        state.skills[i] = a.recommendedSkills[i];
      }
      // fill remaining with auto-pick
      autoPickSkills(true);
    } else {
      autoPickSkills(false);
    }
    // sync UI
    buildStatsGrid(); buildTalentSlots(); buildSkillSlots();
    render();
  }

  function autoPickSkills(preservePicked) {
    const arche = D.archetypes[state.archetype];
    const filter = (arche && arche.skillFilter) || "damage";
    const already = new Set(state.skills.filter(Boolean));
    const usable = D.skills
      .filter((s) => meetsReq(s.req))
      .filter((s) => skillWeaponOK(s))
      .filter((s) => !preservePicked || !already.has(s.name));
    usable.sort((a, b) => skillScore(b, filter) - skillScore(a, filter));
    const picked = preservePicked ? state.skills.slice() : [null,null,null,null,null,null];
    for (const s of usable) {
      const emptyIdx = picked.indexOf(null);
      if (emptyIdx === -1) break;
      picked[emptyIdx] = s.name;
    }
    state.skills = picked.slice(0, 6);
  }
  // Per-filter scoring. `filter` = damage | crit | heal | tank | hybrid | movement | spellspam.
  function skillScore(sk, filter) {
    const tier = D.skillDamageTiers[sk.name] || 0;
    const baseMult = sk.baseMultiplier || 0;
    const reqSum = sumReq(sk.req);
    const isDmg    = sk.type === "Physical" || sk.type === "Magic" || sk.type === "Hybrid";
    const isSup    = sk.type === "Support"  || sk.type === "Buff";
    const isMagic  = sk.type === "Magic"    || sk.type === "Hybrid";
    const isPhys   = sk.type === "Physical" || sk.type === "Hybrid";
    const isTankSk = sk.type === "Tank"     || sk.type === "Buff";
    const dpsIsh   = baseMult > 0 ? baseMult * 100 / Math.max(1, sk.cd) : 0;

    if (filter === "heal") {
      return (isSup ? 100 : 0) + tier * 5 + (sk.healPct ? sk.healPct * 200 : 0) + reqSum / 5;
    }
    if (filter === "tank") {
      const taunt = /taunt|retribution|vampiric/i.test(sk.name) ? 200 : 0;
      const guardish = sk.shieldOK ? 40 : 0;
      return taunt + guardish + (isTankSk ? 100 : 0) + (isDmg ? 30 : 0) + tier * 5 + reqSum / 8;
    }
    if (filter === "crit") {
      // Prefer high-CritDMG multiplier / crit-favouring skills.
      const crits = ["Twin Blades","Dual Blade Barrage","Surging Slash","Deathscythe","Volt Wraith","Flash Assault","Sonic Slash","Cursed Blade","Piercing Light"];
      const critBias = crits.includes(sk.name) ? 60 : 0;
      return (isDmg ? 100 : 0) + tier * 10 + baseMult * 6 + critBias + reqSum / 4;
    }
    if (filter === "movement") {
      const mob = ["Featherlight Step","Phantom's Grace","Power Surge","Arcane Insight","Quick"];
      const mobBias = mob.includes(sk.name) ? 180 : 0;
      // Prefer cheap-CD damage skills as filler.
      const cheap = sk.cd > 0 && sk.cd <= 6 ? 30 : 0;
      return mobBias + cheap + (isDmg ? 60 : 0) + tier * 5 + baseMult * 3 + reqSum / 8;
    }
    if (filter === "spellspam") {
      // Heavily prefer Magic; downrank Physical.
      const magicBias = sk.type === "Magic" ? 160 : sk.type === "Hybrid" ? 80 : sk.type === "Physical" ? -60 : 0;
      const cdBias = sk.cd > 0 ? Math.max(0, 40 - sk.cd) : 0;
      return magicBias + cdBias + tier * 8 + baseMult * 5 + reqSum / 5;
    }
    if (filter === "hybrid") {
      // Mixed physical + magic, moderate CD.
      const magic = isMagic ? 40 : 0;
      const phys  = isPhys  ? 40 : 0;
      return magic + phys + (isDmg ? 60 : 0) + tier * 8 + baseMult * 4 + reqSum / 5;
    }
    // "damage" (default): raw output.
    return (isDmg ? 100 : 0) + tier * 12 + baseMult * 5 + dpsIsh / 5 + reqSum / 4;
  }
  function sumReq(r) { return Object.values(r || {}).reduce((a, b) => a + b, 0); }
  function meetsReq(r) {
    if (!r) return true;
    for (const k in r) if ((state.stats[k] || 0) < r[k]) return false;
    return true;
  }
  // Check that the currently equipped weapon (and dual-wield/shield state) satisfies a skill.
  function skillWeaponOK(sk) {
    if (sk.weapons && sk.weapons.length && !sk.weapons.includes(state.weaponCat)) return false;
    if (sk.dualWield && state.offhand !== "dualwield") return false;
    if (sk.shieldOK === false && state.offhand === "shield") return false;
    return true;
  }

  function autoAllocate() {
    const a = D.archetypes[state.archetype];
    if (!a || !a.statPlan) return;
    STATS.forEach((s) => (state.stats[s] = a.statPlan[s] || 0));
    clampStats();
    syncStatInputs();
    render();
  }
  function resetStats() {
    STATS.forEach((s) => (state.stats[s] = 0));
    syncStatInputs(); render();
  }

  // ---------------- Calc engine ----------------
  function calcBuild() {
    const s = state.stats;
    const cat = state.weaponCat;
    const scaling = D.weaponScaling[cat];

    // ---------- BASE ----------
    let physPow = 0, magicPow = 0;
    let baseHP = 100, baseMP = 30, maxSTM = 60, walkSpd = 16;
    let critRate = 5, critDmgBonus = 50, guardPow = 0, armorRate = 0, physRes = 0, magicRes = 0;

    // ---------- STAT SCALING ----------
    if (scaling === "STR") physPow += s.STR * 2;
    else if (scaling === "DEX") physPow += s.DEX * 2;
    else if (scaling === "INT") magicPow += s.INT * 2;
    else if (scaling === "VIT") physPow += s.VIT * 2;   // Shield main-hand (rare)
    if (scaling !== "INT") magicPow += s.INT * 2;

    baseHP += s.VIT * 10;
    // FOC primarily unlocks skill requirements; armor supplies the bulk of MP.
    // Small +3 MP/point kept for pre-armor gearing.
    baseMP += s.FOC * 3;
    maxSTM += s.AGI * 2;
    walkSpd += Math.floor(s.AGI * 0.1);

    // ---------- WEAPON (per-weapon level scaling + specialty mods) ----------
    const curWeapon = getCurrentWeapon();
    const wStats = weaponStatsAtLevel(curWeapon, state.level);
    physPow += wStats.physPow;
    magicPow += wStats.magicPow;
    guardPow += wStats.guardPow;
    critRate = wStats.critRate;
    critDmgBonus = wStats.critDmg;

    // ---------- WEAPON MIN-STAT CHECK (severe penalty if under-statted) ----------
    const minReq = D.weaponMinStat[state.weaponRarity] || 0;
    const curScalingStat = s[scaling] || 0;
    let underStatted = false;
    let underStatPenalty = 1;
    if (curScalingStat < minReq) {
      underStatted = true;
      // Fraction of requirement met -> linear penalty down to 40% at 0/req.
      const frac = minReq === 0 ? 1 : curScalingStat / minReq;
      underStatPenalty = 0.4 + 0.6 * frac; // e.g. STR 50/100 -> 0.7x weapon effectiveness
      physPow *= underStatPenalty;
      magicPow *= underStatPenalty;
      critRate *= underStatPenalty;
      critDmgBonus *= underStatPenalty;
    }

    // ---------- WEAPON SUB-STATS ----------
    physPow *= 1 + (state.subs.wPhys || 0) / 100;
    magicPow *= 1 + (state.subs.wMag || 0) / 100;
    critRate += (state.subs.wCR || 0);
    critDmgBonus += (state.subs.wCD || 0);
    guardPow += (state.subs.wGP || 0);

    // ---------- ARMOR CONTRIBUTION ----------
    let armorHP = 0, armorMP = 0;
    if (state.armor) {
      const armor = D.armors.find((a) => a.name === state.armor);
      if (armor) {
        const base = D.armorRarityStats[armor.rarity] || { HP: 0, MP: 0 };
        const midLevel = Math.floor((armor.level[0] + armor.level[1]) / 2);
        const scale = 1 + midLevel / 100;
        armorHP = Math.round(base.HP * scale);
        armorMP = Math.round(base.MP * scale);
      }
    }
    physRes  += (state.subs.aPR || 0);
    magicRes += (state.subs.aMR || 0);
    armorRate += (state.subs.aAR || 0);
    guardPow += (state.subs.aGP || 0);
    walkSpd *= 1 + (state.subs.aWS || 0) / 100;

    // ---------- RACE PASSIVES ----------
    const raceNotes = [];
    const race = D.races.find((r) => r.name === state.race);
    if (race) raceNotes.push(`${race.name}: ${race.effect}`);

    // ---------- TALENTS ----------
    const talentNotes = [];
    let hpPctMult = 1;
    let atkSpdMult = 1;
    let dmgMult = 1;
    let bonusAgi = 0; // AGI granted by talents (on top of base s.AGI)
    state.talents.forEach((tname) => {
      if (!tname) return;
      const t = findTalent(tname);
      if (!t) return;
      const badge = t.alwaysOn
        ? '<span class="pill good">ALWAYS-ON</span>'
        : `<span class="pill warn">CONDITIONAL${t.tag ? ' (' + t.tag + ')' : ''}</span>`;
      talentNotes.push(`${badge} <b class="c-accent">${t.name}</b>: ${t.effect}`);
      // Swift Strike is handled after the loop using final AGI.
      if (t.agiScaling) return;
      applyTalent(t, {
        addStr: (v) => { if (scaling === "STR") physPow += v * 2; },
        addDex: (v) => { if (scaling === "DEX") physPow += v * 2; },
        addInt: (v) => { magicPow += v * 2; },
        addVit: (v) => { baseHP += v * 10; },
        addFoc: (v) => { baseMP += v * 3; },
        addAgi: (v) => { maxSTM += v * 2; walkSpd += v * 0.1; bonusAgi += v; },
        addCritRate: (v) => (critRate += v),
        addCritDmg: (v) => (critDmgBonus += v),
        addGuardPow: (v) => (guardPow += v),
        addPhysRes: (v) => (physRes += v),
        addMagicRes: (v) => (magicRes += v),
        addArmorRate: (v) => (armorRate += v),
        addHpPct: (v) => (hpPctMult *= 1 + v / 100),
        addMagicPowPct: (v) => (magicPow *= 1 + v / 100),
        addPhysPowPct: (v) => (physPow *= 1 + v / 100),
        addAtkSpdPct: (v) => (atkSpdMult *= 1 + v / 100),
        addDmgPct: (v) => (dmgMult *= 1 + v / 100),
      });
    });

    // Swift Strike: +0.2% CritRate & +0.75% CritDMG per AGI (cap 80 AGI = +16% CR / +60% CD).
    // Uses FINAL AGI (base + talent bonuses) capped at 80.
    if (state.talents.some((tn) => tn === "Swift Strike")) {
      const finalAgi = Math.min(80, (s.AGI || 0) + bonusAgi);
      critRate    += finalAgi * 0.2;
      critDmgBonus += finalAgi * 0.75;
    }

    // ---------- OFF-HAND ----------
    let offhandNote = "";
    if (state.offhand === "shield" && state.shield) {
      const shieldRar = shieldRarityOf(state.shield);
      // Prefer verified per-shield stat card (D.shieldStats) if available.
      const sdef = D.shieldStats && D.shieldStats[state.shield];
      let shieldGuardAdd = 0;
      let shieldHPAdd = 0;
      if (sdef && sdef.stats && sdef.stats.avg) {
        // scale from the card's anchor lv up to state.level using the tier's perLvGuard.
        const anchor = sdef.stats.avg;
        const rarDef = D.rarityDefaults[sdef.rarity] || {};
        const perLv = rarDef.perLvGuard || 0;
        const dL = Math.max(0, (state.level || anchor.lv) - anchor.lv);
        shieldGuardAdd = Math.round((anchor.guardPow || 0) + perLv * dL);
        shieldHPAdd    = Math.round(anchor.hp || 0);
        guardPow += shieldGuardAdd;
        baseHP   += shieldHPAdd;
        offhandNote = `Shield (${shieldRar}) ${state.shield}: +${shieldGuardAdd} GuardPOW, +${shieldHPAdd} HP, block on left-click`;
      } else {
        const shieldGuard = { Common: 15, Uncommon: 25, Rare: 40, SuperRare: 60, Legendary: 90 }[shieldRar] || 20;
        guardPow += shieldGuard;
        offhandNote = `Shield (${shieldRar}): +${shieldGuard} GuardPOW, block window on left-click`;
      }
    } else if (state.offhand === "dualwield") {
      // Dual wield: extra offhand attack per swing (~+40% effective phys pow, +15% swing speed)
      physPow *= 1.40;
      atkSpdMult *= 1.15;
      offhandNote = "Dual Wield: +40% effective PhysPOW (extra offhand hit), +15% swing speed. Loses blocking.";
    } else {
      offhandNote = "Two-handed / free left hand: enables Deft Guard, Unburdened, and 2H damage skills.";
    }

    // ---------- WEAPON SPECIALTY: swing-speed bonus (Sword/Scythe) ----------
    const specMod = (D.weaponSpecialtyMods && D.weaponSpecialtyMods[cat]) || {};
    if (specMod.atkSpdMult) atkSpdMult *= specMod.atkSpdMult;

    // ---------- FINAL POOLS ----------
    const maxHP = Math.round((baseHP + armorHP) * hpPctMult);
    const maxMP = Math.round(baseMP + armorMP);
    physPow = Math.round(physPow * dmgMult);
    magicPow = Math.round(magicPow * dmgMult);

    // ---------- DAMAGE MATH ----------
    const useMagic = magicPow > physPow;
    const eff = useMagic ? magicPow : physPow;
    const normalHit = eff;
    const critMult = 1 + critDmgBonus / 100;
    const critHit = Math.round(normalHit * critMult);
    const critChance = Math.min(100, Math.max(0, critRate)) / 100;
    const avgHit = Math.round(normalHit * (1 - critChance) + critHit * critChance);

    // ---------- SKILL DAMAGE + LOCK CHECK ----------
    const skillDamages = state.skills.filter(Boolean).map((n) => {
      const sk = D.skills.find((x) => x.name === n);
      if (!sk) return null;
      const isMagic = sk.type === "Magic" || sk.type === "Hybrid";
      const pow = isMagic ? magicPow : physPow;
      // Prefer verified baseMultiplier from data.js; fall back to a rough MP-based scale.
      const scale = (sk.baseMultiplier && sk.baseMultiplier > 0) ? sk.baseMultiplier : Math.max(1, sk.mp / 25);
      const skillNormal = Math.round(pow * scale);
      const skillCrit = Math.round(skillNormal * critMult);
      const skillAvg = Math.round(skillNormal * (1 - critChance) + skillCrit * critChance);
      const weaponOK = !sk.weapons || !sk.weapons.length || sk.weapons.includes(cat);
      const dwOK = !sk.dualWield || state.offhand === "dualwield";
      const shOK = sk.shieldOK === false ? state.offhand !== "shield" : true;
      const usable = meetsReq(sk.req) && weaponOK && dwOK && shOK;
      return {
        name: sk.name, mp: sk.mp, cd: sk.cd, type: sk.type,
        normal: skillNormal, crit: skillCrit, avg: skillAvg,
        dps: Math.round(skillAvg / sk.cd),
        ok: usable,
        weaponOK, dwOK, shOK,
        reqMiss: !meetsReq(sk.req),
        allowedWeapons: sk.weapons || [],
        dualWield: !!sk.dualWield,
      };
    }).filter(Boolean);

    const swingSec = 1.2 / atkSpdMult;
    const autoDPS = Math.round(avgHit / swingSec);
    const skillDPS = skillDamages.reduce((a, k) => a + (k.ok ? k.dps : 0), 0);
    const totalDPS = autoDPS + skillDPS;

    const spent = STATS.reduce((a, k) => a + (s[k] || 0), 0);
    const cap = D.mechanics.maxStatPoints;

    // Movement build scoring proxy: how well you translate WalkSPD + stamina into skill uptime.
    const mobilityScore = Math.round(walkSpd * (maxSTM / 60) * 10) / 10;

    return {
      physPow, magicPow, maxHP, maxMP, maxSTM,
      armorHP, armorMP,
      walkSpd: Math.round(walkSpd * 10) / 10,
      critRate: Math.round(critRate * 10) / 10,
      critDmgBonus: Math.round(critDmgBonus * 10) / 10,
      critMult, critChance,
      guardPow: Math.round(guardPow * 10) / 10,
      armorRate: Math.round(armorRate * 10) / 10,
      physRes: Math.round(physRes * 10) / 10,
      magicRes: Math.round(magicRes * 10) / 10,
      normalHit, critHit, avgHit,
      autoDPS, skillDPS, totalDPS,
      atkSpdMult, dmgMult,
      skillDamages,
      spent, cap,
      raceNotes, talentNotes,
      scaling, useMagic,
      underStatted, underStatPenalty, minReq, curScalingStat,
      offhandNote,
      mobilityScore,
    };
  }

  function shieldRarityOf(name) {
    for (const r of ["Legendary", "SuperRare", "Rare", "Uncommon", "Common"]) {
      if ((D.shields[r] || []).includes(name)) return r;
    }
    return "Common";
  }

  function findTalent(name) {
    for (const cat of ["weaponTraining", "statusBoosts", "conditional", "general"]) {
      const t = D.talents[cat].find((x) => x.name === name);
      if (t) return t;
    }
    return null;
  }

  // effect-string parser
  function applyTalent(t, api) {
    const e = t.effect;
    const m = (re) => { const x = e.match(re); return x ? parseFloat(x[1]) : null; };
    let v;
    if ((v = m(/\+(\d+) STR/))) api.addStr(v);
    if ((v = m(/\+(\d+) INT/))) api.addInt(v);
    if ((v = m(/\+(\d+) VIT/))) api.addVit(v);
    if ((v = m(/\+(\d+) DEX/))) api.addDex(v);
    if ((v = m(/\+(\d+) FOC/))) api.addFoc(v);
    if ((v = m(/\+(\d+) AGI/))) api.addAgi(v);
    if ((v = m(/\+(\d+)% CritRate/))) api.addCritRate(v);
    if ((v = m(/\+(\d+)% CritDMG/))) api.addCritDmg(v);
    if ((v = m(/\+(\d+)% GuardPOW/))) api.addGuardPow(v);
    if ((v = m(/\+(\d+)% PhysRES/))) api.addPhysRes(v);
    if ((v = m(/\+(\d+)% MagicRES/))) api.addMagicRes(v);
    if ((v = m(/\+(\d+)% ArmorRATE/))) api.addArmorRate(v);
    if ((v = m(/\+(\d+)% MaxHP/))) api.addHpPct(v);
    if ((v = m(/\+(\d+)% MagicPOW/))) api.addMagicPowPct(v);
    if ((v = m(/\+(\d+)% PhysPOW/))) api.addPhysPowPct(v);
    if ((v = m(/\+(\d+)% attack speed/i))) api.addAtkSpdPct(v);
    // generic DMG boosters (Unrestrained, Wallbreaker, Lone Wolf, Inspiring, etc.)
    if ((v = m(/\+(\d+)% DMG/))) api.addDmgPct(v);
  }

  // ---------------- Render ----------------
  function line(k, v, cls) { return `<div class="stat-line"><span class="k">${k}</span><span class="v ${cls || ''}">${v}</span></div>`; }

  function render() {
    const spent = STATS.reduce((a, s) => a + (state.stats[s] || 0), 0);
    const cap = D.mechanics.maxStatPoints;
    const remainingBadge = $("ptsRemain");
    remainingBadge.textContent = `${spent} / ${cap} used`;
    remainingBadge.classList.toggle("bad", spent > cap);

    const arche = D.archetypes[state.archetype];
    $("archetypeDesc").innerHTML = arche ? renderArchetypeDesc(arche) : "";
    const race = D.races.find((r) => r.name === state.race);
    $("raceDesc").innerHTML = race ? `<b class="c-accent">${race.name}</b> - <b class="c-good">${race.ability}</b>: ${race.effect}` : "";

    const shieldSel = $("shield");
    shieldSel.disabled = state.offhand !== "shield";
    if (state.offhand !== "shield") shieldSel.value = "";

    updateWeaponInfo();

    const r = calcBuild();

    // ---------- weapon min-stat warning banner ----------
    const minBanner = r.underStatted
      ? `<div class="banner bad">
           WEAPON UNDER-STATTED: <b>${state.weaponRarity}</b> ${state.weaponCat} needs ${r.scaling} ${r.minReq}, you have ${r.curScalingStat}. Damage x${r.underStatPenalty.toFixed(2)}.
         </div>`
      : `<div class="banner good">Weapon min-stat OK: ${r.scaling} ${r.curScalingStat} / ${r.minReq}</div>`;

    // ---------- skill table with lock indicators ----------
    const skillRows = r.skillDamages.map((k) => {
      const sk = D.skills.find((x) => x.name === k.name);
      const req = Object.entries(sk.req || {}).map(([kk, vv]) => `${kk}${vv}`).join(",") || "-";
      let pill;
      if (k.ok) pill = '<span class="pill good">OK</span>';
      else if (!k.weaponOK) pill = `<span class="pill bad">WPN LOCK: ${(k.allowedWeapons.join('/') || 'none')}</span>`;
      else if (!k.dwOK) pill = '<span class="pill warn">NEEDS DUAL</span>';
      else if (!k.shOK) pill = '<span class="pill warn">NO SHIELD</span>';
      else pill = '<span class="pill brown">REQ MISS</span>';
      return `<tr class="${k.ok ? '' : 'row-locked'}">
        <td>${k.name} ${pill}</td>
        <td>${k.type}</td>
        <td>${k.mp}</td>
        <td>${k.cd}s</td>
        <td class="v good">${k.ok ? k.normal : '-'}</td>
        <td class="v warn">${k.ok ? k.crit : '-'}</td>
        <td class="v">${k.ok ? k.avg : '-'}</td>
        <td class="v good">${k.ok ? k.dps : '-'}</td>
        <td class="note">${req}</td>
      </tr>`;
    }).join("");

    // ---------- sub-stat recommendation panel ----------
    const subsHtml = renderSubsPanel(arche);

    // ---------- gear recommendation panel ----------
    const gearHtml = renderGearPanel(arche);

    // ---------- weapon reference panel (skills + talents for current weapon category) ----------
    const weaponRefHtml = renderWeaponRefPanel(state.weaponCat);

    // ---------- colored stat allocation summary ----------
    const statChips = STATS.map((k) => `<span class="stat-chip ${STAT_COLOR[k]}"><b>${k}</b> ${state.stats[k]}</span>`).join(" ");

    $("output").innerHTML = `
      ${minBanner}
      <div class="stat-line"><span class="k">Archetype</span><span class="v c-accent">${arche ? arche.label : state.archetype}</span></div>
      <div class="stat-line"><span class="k">Race</span><span class="v">${state.race}</span></div>
      <div class="stat-line"><span class="k">Level</span><span class="v">${state.level} / ${D.mechanics.maxLevel}</span></div>
      <div class="stat-line"><span class="k">Weapon</span><span class="v c-${state.weaponRarity.toLowerCase()}">${state.weapon || '-'} [${state.weaponRarity} ${state.weaponCat}]</span></div>
      <div class="stat-line"><span class="k">Off-hand</span><span class="v">${state.offhand === 'shield' ? (state.shield || 'Shield') : state.offhand === 'dualwield' ? 'Dual Wield' : '2H / free'}</span></div>
      <div class="stat-line"><span class="k">Armor</span><span class="v">${state.armor || '-'}</span></div>
      <div class="stat-line"><span class="k">Scaling</span><span class="v"><span class="stat-tag ${STAT_COLOR[r.scaling]||''}">${r.scaling}</span> ${r.useMagic ? "(Magic-primary)" : "(Phys-primary)"}</span></div>
      <div class="stat-line"><span class="k">Points</span><span class="v ${r.spent > r.cap ? 'bad' : (r.spent === r.cap ? 'good' : 'warn')}">${r.spent} / ${r.cap}</span></div>
      <div class="stat-chips">${statChips}</div>
      <div class="note offhand-note">${r.offhandNote}</div>

      <h3>Offense</h3>
      ${line("PhysPOW", r.physPow, "good")}
      ${line("MagicPOW", r.magicPow, "magic")}
      ${line("CritRate", r.critRate + "%", "warn")}
      ${line("CritDMG (+bonus)", "+" + r.critDmgBonus + "% (crit x" + r.critMult.toFixed(2) + ")", "warn")}
      ${line("Attack Speed", "x" + r.atkSpdMult.toFixed(2))}
      ${line("Damage Multiplier", "x" + r.dmgMult.toFixed(2))}
      ${line("Normal-hit", r.normalHit)}
      ${line("Crit-hit", r.critHit, "warn")}
      ${line("Avg-hit", r.avgHit, "good")}
      ${line("Auto-attack DPS", r.autoDPS)}
      ${line("Skill rotation DPS", r.skillDPS)}
      ${line("Total est. DPS", r.totalDPS, "good")}

      <h3>Defense</h3>
      ${line("GuardPOW", r.guardPow + "%", state.offhand === "shield" ? "good" : "")}
      ${line("ArmorRATE", r.armorRate + "%")}
      ${line("PhysRES", r.physRes + "%")}
      ${line("MagicRES", r.magicRes + "%")}

      <h3>Vitals (Base + Armor)</h3>
      ${line("MaxHP", r.maxHP + "  (armor +" + r.armorHP + ")", "good")}
      ${line("MaxMP", r.maxMP + "  (armor +" + r.armorMP + ")", "magic")}
      ${line("MaxSTM", r.maxSTM)}
      ${line("WalkSPD", r.walkSpd)}

      <h3>Skill Damage Breakdown</h3>
      <table class="dmg-table">
        <thead><tr>
          <th>Skill</th><th>Type</th><th>MP</th><th>CD</th>
          <th>Normal</th><th>Crit</th><th>Avg</th><th>DPS</th><th>Req</th>
        </tr></thead>
        <tbody>${skillRows || '<tr><td colspan="9" class="note">No skills selected</td></tr>'}</tbody>
      </table>

      ${gearHtml}
      ${subsHtml}
      ${weaponRefHtml}

      <h3>Race Passive</h3>
      <ul>${r.raceNotes.map((x) => `<li>${x}</li>`).join("")}</ul>

      <h3>Active Talents</h3>
      <ul>${r.talentNotes.length ? r.talentNotes.map((x) => `<li>${x}</li>`).join("") : "<li>None selected</li>"}</ul>
    `;

    renderBoss();
  }

  function renderArchetypeDesc(a) {
    return `<div>${a.description}</div>
      <div class="preset-tags">
        <span class="pill blue">Wpn: ${a.recommendedWeapons.join(" / ")}</span>
        <span class="pill ${a.recommendedOffhand === 'shield' ? 'gold' : a.recommendedOffhand === 'dualwield' ? 'pink' : 'grey'}">Off-hand: ${a.recommendedOffhand}</span>
      </div>`;
  }

  function renderGearPanel(a) {
    if (!a) return "";
    const armorPills = (a.recommendedArmor || []).map((n) => `<span class="pill gold">${n}</span>`).join(" ");
    const shieldPill = a.recommendedShield ? `<span class="pill gold">${a.recommendedShield}</span>` : `<span class="pill grey">No shield</span>`;
    return `
      <h3>Recommended Gear</h3>
      <div class="gear-panel">
        <div><b class="c-accent">Armor:</b> ${armorPills}</div>
        <div><b class="c-accent">Shield:</b> ${shieldPill}</div>
        <div><b class="c-accent">Off-hand:</b> <span class="pill ${a.recommendedOffhand === 'shield' ? 'gold' : a.recommendedOffhand === 'dualwield' ? 'pink' : 'grey'}">${a.recommendedOffhand}</span></div>
      </div>`;
  }

  function renderSubsPanel(a) {
    if (!a || !a.recommendedSubs) return "";
    const wSubs = a.recommendedSubs.weapon.map((s, i) => `<span class="pill sub-rank-${i+1}">${i+1}. ${s}</span>`).join(" ");
    const aSubs = a.recommendedSubs.armor.map((s, i) => `<span class="pill sub-rank-${i+1}">${i+1}. ${s}</span>`).join(" ");
    return `
      <h3>Recommended Sub-Stats (roll for these)</h3>
      <div class="subs-panel">
        <div><b class="c-accent">Weapon:</b> ${wSubs}</div>
        <div><b class="c-accent">Armor:</b> ${aSubs}</div>
        <div class="note">Roll pink/gold rarity affixes on these lines. Ignore brown - it can go negative.</div>
      </div>`;
  }

  // Panel: for the currently selected weapon category, list the scaling stat,
  // exclusive skill list, and the ALWAYS-ON talents that boost this weapon.
  // Also shows live per-level stats of the currently equipped weapon (uses the
  // new per-weapon fields: fromLv / basePhysPOW / perLv*).
  function renderWeaponRefPanel(cat) {
    const ref = D.weaponReference[cat];
    if (!ref) return "";
    const scColor = STAT_COLOR[ref.scaling] || "";
    // Live stats block for the current weapon.
    const cw = getCurrentWeapon();
    let curStatsHtml = "";
    if (cw) {
      const now = weaponStatsAtLevel(cw, state.level);
      const max = weaponStatsAtLevel(cw, D.mechanics.maxLevel);
      const drop = cw.dropRate ? ` <span class="note-inline">(DropRate ${cw.dropRate}%)</span>` : "";
      curStatsHtml = `
        <div class="wref-line">
          <b class="c-accent">Equipped:</b> ${cw.name} <span class="note-inline">[${cw.rarity} ${cw.category}, from L${cw.fromLv}]</span>${drop}
        </div>
        <div class="wref-line">
          <b class="c-accent">Stats @ L${Math.max(state.level, cw.fromLv)} (Avg):</b>
          <span class="pill good">PhysPOW ${now.physPow}</span>
          <span class="pill magic">MagicPOW ${now.magicPow}</span>
          <span class="pill warn">CritRate ${now.critRate}%</span>
          <span class="pill warn">CritDMG +${now.critDmg}%</span>
          <span class="pill blue">GuardPOW ${now.guardPow}</span>
        </div>
        <div class="wref-line">
          <b class="c-accent">Stats @ L${D.mechanics.maxLevel} (Max):</b>
          <span class="pill good">PhysPOW ${max.physPow}</span>
          <span class="pill magic">MagicPOW ${max.magicPow}</span>
          <span class="pill blue">GuardPOW ${max.guardPow}</span>
          <span class="note-inline">(+${cw.perLvPhys}/${cw.perLvMagic}/${cw.perLvGuard} per lv)</span>
        </div>`;
    }
    const skillPills = ref.skills.map((n) => {
      const sk = D.skills.find((x) => x.name === n);
      if (!sk) return `<span class="pill grey">${n}</span>`;
      const dw = sk.dualWield ? ' <span class="pill pink">DUAL</span>' : '';
      const req = Object.entries(sk.req || {}).map(([k, v]) => `${k}${v}`).join(",");
      const cls = sk.type === "Magic" ? "c-magic" : sk.type === "Support" ? "c-good" : sk.type === "Hybrid" ? "c-accent" : "c-warn";
      return `<span class="pill blue">${n}${dw} <span class="${cls}">[${sk.type}]</span>${req ? ' <span class="note-inline">(' + req + ')</span>' : ''}</span>`;
    }).join(" ");
    const talentPills = ref.talents.map((n) => {
      const t = findTalent(n);
      if (!t) return `<span class="pill grey">${n}</span>`;
      const badge = t.alwaysOn ? "good" : "warn";
      const flag  = t.alwaysOn ? "ALWAYS-ON" : "COND";
      return `<span class="pill ${badge}">${n} <span class="note-inline">${t.effect}</span></span>`;
    }).join(" ");
    return `
      <h3>Weapon Reference - <span class="c-accent">${cat}</span></h3>
      <div class="weapon-ref">
        ${curStatsHtml}
        <div class="wref-line">
          <b class="c-accent">Scaling Stat:</b>
          <span class="stat-tag ${scColor}">${ref.scaling}</span>
          <span class="note">${ref.scalingLabel}</span>
        </div>
        <div class="wref-line">
          <b class="c-accent">Rarity Requirement:</b>
          <span class="note">${ref.recommendedRarity}</span>
        </div>
        <div class="wref-line">
          <b class="c-accent">Skills that use this weapon:</b><br/>
          ${skillPills}
        </div>
        <div class="wref-line">
          <b class="c-accent">Always-on talents that boost this weapon:</b><br/>
          ${talentPills}
        </div>
      </div>`;
  }


  function renderBoss() {
    const name = $("dungeon").value;
    const el = $("bossRec");
    if (!name) { el.textContent = "Pick a dungeon to see counter-build tips."; return; }
    const d = D.dungeons.find((x) => x.name === name);
    if (!d) { el.textContent = ""; return; }
    const rec = counterBuild(d);
    el.innerHTML = `
      <b class="c-accent">${d.name}</b> - ${d.location} (L${d.levelRange[0]}-${d.levelRange[1]})<br/>
      <b>Boss:</b> <span class="c-warn">${d.boss}</span><br/>
      ${d.monsters.length ? "<b>Enemies:</b> " + d.monsters.join(", ") + "<br/>" : ""}
      ${d.drops.length ? "<b>Drops:</b> " + d.drops.map((x) => `<span class="pill gold">${x}</span>`).join(" ") + "<br/>" : ""}
      <br/>
      <b>Recommended Approach:</b><br/>
      ${rec.strategy}<br/>
      <b>Best Archetypes:</b> ${rec.archetypes.map((a) => `<span class="pill blue">${a}</span>`).join(" ")}<br/>
      <b>Key Talents:</b> ${rec.talents.map((t) => `<span class="pill pink">${t}</span>`).join(" ")}
    `;
  }

  function counterBuild(d) {
    const b = (d.boss || "").toLowerCase();
    if (b.includes("skeleton") || b.includes("lich")) return {
      strategy: "Undead - stack CritRate + PhysPOW with Dagger/Sword. Bring Heal or Vampiric Blade.",
      archetypes: ["Dagger_HighCrit", "Sword_GlassCannon", "Sword_AllAround"],
      talents: ["Surprise Attack", "Vampire", "Confident"],
    };
    if (b.includes("dragon")) return {
      strategy: "Long boss fight, wide AoE. Tank/AllAround with shield, or nuker with Meteor Rain / Blaze Cannon.",
      archetypes: ["Greatsword_Tank", "Staff_HighDamage", "Sword_AllAround"],
      talents: ["Well Built", "Heroic", "Resilient", "Fortified"],
    };
    if (b.includes("penguin") || b.includes("yeti") || b.includes("golem") || b.includes("space moth")) return {
      strategy: "Ice/cold themed - use Staff nukes (Fireball, Blaze Cannon). Mobility matters.",
      archetypes: ["Staff_HighDamage", "Staff_SpellSpam", "Staff_Support"],
      talents: ["Specialist", "Smart Casting", "Concentration"],
    };
    if (b.includes("puppet") || b.includes("beating heart") || b.includes("bunny")) return {
      strategy: "High-HP event boss with adds. Group runs - bring Inspiring + Healer.",
      archetypes: ["Rapier_Support", "Sword_AllAround", "Greatsword_HighDamage"],
      talents: ["Inspiring", "Healer", "Hunting Pack"],
    };
    if (b.includes("daemon") || b.includes("shaman") || b.includes("forest")) return {
      strategy: "Magic-heavy caster - stack MagicRES, bring interrupts (Sonic Slash, Twin Blades).",
      archetypes: ["Greatsword_Tank", "Dagger_HighCrit", "Sword_AllAround"],
      talents: ["Resistant", "Fortified", "Composed"],
    };
    if (b.includes("goblin")) return {
      strategy: "Swarm of low-HP mobs - AoE clears (Whirlwind Blade, Meteor Rain, Flower Field).",
      archetypes: ["Dagger_GlassCannon", "Staff_HighDamage", "Staff_Support"],
      talents: ["Two's Company", "Lone Wolf", "Hunting Pack"],
    };
    return {
      strategy: "Balanced approach - AllAround or HighDamage. Bring Heal + one big nuke.",
      archetypes: ["Sword_AllAround", "Greatsword_HighDamage"],
      talents: ["Well Built", "Vampire", "Hunting Pack"],
    };
  }

  // ---------------- Event wiring ----------------
  function wire() {
    $("archetype").addEventListener("change", () => { state.archetype = $("archetype").value; render(); });
    $("applyPreset").addEventListener("click", applyPreset);
    $("race").addEventListener("change", () => { state.race = $("race").value; render(); });
    $("level").addEventListener("input", () => { state.level = Math.max(1, Math.min(D.mechanics.maxLevel, parseInt($("level").value || "1", 10))); $("level").value = state.level; render(); });

    $("weaponCat").addEventListener("change", () => {
      state.weaponCat = $("weaponCat").value;
      refreshWeapons();
      autoPickWeapon();
      autoPickSkills(false);
      buildSkillSlots();
      render();
    });
    $("weaponRarity").addEventListener("change", () => {
      state.weaponRarity = $("weaponRarity").value;
      refreshWeaponList();
      autoPickWeapon();
      autoPickSkills(false);
      buildSkillSlots();
      render();
    });
    $("weapon").addEventListener("change", () => { state.weapon = $("weapon").value; render(); });
    $("offhand").addEventListener("change", () => { state.offhand = $("offhand").value; render(); });
    $("shield").addEventListener("change", () => { state.shield = $("shield").value; render(); });
    $("armor").addEventListener("change", () => { state.armor = $("armor").value; render(); });

    ["wPhys","wMag","wCR","wCD","wGP","aPR","aMR","aAR","aWS","aGP"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => { state.subs[id] = parseFloat(el.value || "0"); render(); });
    });

    $("autoAllocate").addEventListener("click", autoAllocate);
    $("resetStats").addEventListener("click", resetStats);
    $("dungeon").addEventListener("change", renderBoss);
  }

  // ---------------- Boot ----------------
  function boot() {
    initSelects();
    buildStatsGrid();
    buildTalentSlots();
    buildSkillSlots();
    wire();
    applyPreset();
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
