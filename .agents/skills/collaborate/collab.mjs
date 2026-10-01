#!/usr/bin/env node
// collab.mjs — deterministische Zustandsmaschine für das collaborate-Protokoll (siehe SKILL.md, Abschnitt 11).
// Keine Abhängigkeiten. Ersetzt das händische JSON-Editieren der <topic>.pid: Index-Arithmetik, revision,
// atomares Schreiben (tmp + rename) und eine echte Sperre (O_EXCL-Lockfile) liegen hier, nicht beim LLM.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const DEFAULT_DIR = '.agents/collaborate';
const LOCK_STALE_MS = 120_000;
const DEFAULT_NAMES = ['Alice', 'Bob', 'Charly', 'Dave', 'Erin', 'Frank']; // Reihenfolge für Einladungen ohne Namen
const BLOCKED_BEGIN = ['paused', 'terminated', 'deadlock', 'waiting_for_moderator'];

const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');

class CollabError extends Error {}

// Wirft statt process.exit, damit das finally in withLock die Sperre auch bei Fehlern freigibt.
function fail(msg) {
  throw new CollabError(msg);
}

function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) opt[a.slice(2)] = true;
    else { opt[a.slice(2)] = next; i++; }
  }
  return { pos, opt };
}

function resolvePid(topic) {
  if (!topic) fail('Topic-Datei fehlt.');
  let t = topic;
  if (!t.includes('/') && !fs.existsSync(t)) t = path.join(DEFAULT_DIR, t);
  return t.replace(/\.[^./]+$/, '') + '.pid';
}

// ---- Sperre + atomares Schreiben -----------------------------------------------------------

function withLock(pidPath, fn) {
  const lockPath = `${pidPath}.lock`;
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  let fd;
  try {
    fd = fs.openSync(lockPath, 'wx');
  } catch {
    const age = Date.now() - fs.statSync(lockPath).mtimeMs;
    fail(`Sperre ${lockPath} gehalten (Alter ${Math.round(age / 1000)}s). ` +
      (age > LOCK_STALE_MS ? 'Veraltet — falls kein Zug läuft, Datei löschen.' : 'Ein anderer Zug läuft — warten.'));
  }
  fs.writeSync(fd, `${process.pid} ${now()}\n`);
  fs.closeSync(fd);
  try {
    return fn();
  } finally {
    fs.rmSync(lockPath, { force: true });
  }
}

function load(pidPath) {
  if (!fs.existsSync(pidPath)) fail(`${pidPath} existiert nicht (zuerst "init" bzw. "invite").`);
  const s = JSON.parse(fs.readFileSync(pidPath, 'utf8'));
  s.mode ??= 'plan';
  s.outcome ??= null;
  s.consensus ??= { reached: false, proposal_id: null, proposed_by: null, signatures: [] };
  return s;
}

function save(pidPath, s) {
  const errs = validate(s);
  if (errs.length) fail(`Invariante verletzt, nichts geschrieben: ${errs.join('; ')}`);
  s.revision += 1;
  const tmp = `${pidPath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2) + '\n');
  fs.renameSync(tmp, pidPath);
}

function log(s, agent, action, extra = {}) {
  s.history.push({ round: s.current_round, agent, action, ...extra, timestamp: now() });
}

function validate(s) {
  const errs = [];
  if (!Number.isInteger(s.revision) || s.revision < 0) errs.push('revision ungültig');
  if (!['plan', 'decide'].includes(s.mode)) errs.push(`mode ungültig: ${s.mode}`);
  const names = s.roster.map((r) => r.name);
  if (new Set(names).size !== names.length) errs.push('Roster-Namen nicht eindeutig');
  const expected = s.roster[s.turn_index]?.name ?? null;
  if (s.active_agent !== expected) errs.push(`active_agent (${s.active_agent}) ≠ roster[turn_index] (${expected})`);
  if (s.status === 'working' && !s.active_agent) errs.push('working ohne active_agent');
  return errs;
}

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const blindPath = (pidPath, agent) => `${pidPath.replace(/\.pid$/, '')}.blind.${agent}.md`;
const blindHash = (s, agent) => s.history.findLast((h) => h.action === 'blind_submitted' && h.agent === agent)?.hash;

const soloPlan = (s) => s.mode === 'plan' && s.roster.length === 1;

function mustBeActive(s, agent, needStatus = 'working') {
  if (s.active_agent !== agent) fail(`${agent} ist nicht dran (aktiv: ${s.active_agent}).`);
  if (s.status !== needStatus) fail(`Status ist "${s.status}", erwartet "${needStatus}".`);
}

function out(s, extra = {}) {
  console.log(JSON.stringify({
    status: s.status, round: `${s.current_round}/${s.max_rounds}`, active_agent: s.active_agent,
    revision: s.revision, outcome: s.outcome, timestamp: s.history.at(-1)?.timestamp, ...extra,
  }, null, 2));
}

// ---- Handover (Section 5, Step 3) ----------------------------------------------------------

function handover(s, agent, skipLimit = false) {
  const n = s.roster.length;
  const turns = s.history.filter((h) => h.action === 'turn_completed');
  if (s.mode === 'decide' && turns.length >= n && turns.slice(-n).every((h) => h.novelty === false)) {
    s.status = 'deadlock';
    log(s, agent, 'deadlock_stalled');
    return { deadlock: 'stalled' };
  }
  const next = (s.turn_index + 1) % n;
  if (next === 0) s.current_round += 1;
  if (!skipLimit && s.current_round > s.max_rounds) {
    const c = s.consensus;
    const open = c.proposal_id && !c.reached;
    // Spec 5 Step 3 (Unterschriftsrunde): Das Limit ruht, bis jedes andere Roster-Mitglied nach dem Vorschlag
    // einen Zug hatte — aber nur für einen Vorschlag, der innerhalb des Limits gestellt wurde (sonst Endlos-Kette).
    const at = s.history.findLastIndex((h) => h.action === 'proposal' && h.proposal === c.proposal_id);
    const proposedInRound = at >= 0 ? s.history[at].round : Infinity;
    const hadTurn = new Set(s.history.slice(at + 1).filter((h) => h.action === 'turn_completed').map((h) => h.agent));
    const missing = s.roster.filter((r) => r.name !== c.proposed_by && !hadTurn.has(r.name));
    if (open && missing.length && proposedInRound <= s.max_rounds) {
      if (c.grace_for !== c.proposal_id) {
        c.grace_for = c.proposal_id;
        log(s, agent, 'signing_round_granted', { proposal: c.proposal_id });
      }
    } else {
      s.status = 'deadlock';
      log(s, agent, 'deadlock_round_limit');
      return { deadlock: 'round_limit' };
    }
  }
  s.turn_index = next;
  s.active_agent = s.roster[next].name;
  s.status = s.consensus.reached && s.status === 'consensus_reached' ? 'consensus_reached' : 'idle';
  return {};
}

// ---- Befehle -------------------------------------------------------------------------------

const commands = {
  init(pidPath, pos, opt) {
    if (fs.existsSync(pidPath)) fail(`${pidPath} existiert bereits.`);
    const mode = opt.mode ?? 'plan';
    if (!['plan', 'decide'].includes(mode)) fail('--mode plan|decide');
    const s = {
      protocol_version: '1.1', mode,
      topic_file: pidPath.replace(/\.pid$/, '.md'), pid_file: pidPath,
      revision: 0, max_rounds: Number(opt['max-rounds'] ?? 5), current_round: 1, turn_index: 0,
      active_agent: null, status: 'waiting_for_moderator', paused_agent: null, roster: [],
      consensus: { reached: false, proposal_id: null, proposed_by: null, signatures: [] },
      outcome: null, history: [], custom_data: {},
    };
    log(s, 'moderator', 'session_initialized');
    save(pidPath, s);
    if (!opt._quiet) out(s);
  },

  invite(pidPath, pos, opt) {
    if (!fs.existsSync(pidPath)) commands.init(pidPath, [], { ...opt, _quiet: true });
    const s = load(pidPath);
    // Ohne Namen: erster freier Standardname (Alice, Bob, Charly, Dave, Erin, Frank).
    const name = pos[0] ?? DEFAULT_NAMES.find((n) => !s.roster.some((r) => r.name === n));
    if (!name) fail('Alle Standardnamen (Alice … Frank) sind vergeben — bitte einen Namen angeben: invite <topic> <AgentName>');
    if (s.roster.some((r) => r.name === name)) return out(s, { name, roster: s.roster.map((r) => r.name), note: `${name} bereits registriert` });
    if (!['waiting_for_moderator', 'idle', 'paused', 'consensus_reached'].includes(s.status)) {
      fail(`Spät-Einstieg nur bei idle/paused, Status ist "${s.status}".`);
    }
    const entry = { name, role: opt.role ?? '', channel: opt.channel ?? 'manual' };
    if (opt.stance) entry.stance = String(opt.stance);
    if (entry.channel === 'unix_signal') {
      if (!opt.pid) fail('channel unix_signal braucht --pid <OS-PID>');
      entry.pid = Number(opt.pid);
    }
    s.roster.push(entry);
    if (s.roster.length === 1) { s.turn_index = 0; s.active_agent = name; }
    log(s, name, 'agent_invited');
    save(pidPath, s);
    out(s, { name, roster: s.roster.map((r) => r.name) });
  },

  start(pidPath, pos) {
    const s = load(pidPath);
    if (s.status !== 'waiting_for_moderator') fail(`start nur bei waiting_for_moderator, Status ist "${s.status}".`);
    if (s.roster.length < 1) fail('Mindestens 1 Agent nötig.');
    const idx = pos[0] ? s.roster.findIndex((r) => r.name === pos[0]) : 0;
    if (idx < 0) fail(`Starter ${pos[0]} nicht im Roster.`);
    s.turn_index = idx; s.active_agent = s.roster[idx].name; s.current_round = 1; s.status = 'working';
    log(s, s.active_agent, 'session_started');
    save(pidPath, s);
    out(s);
  },

  'begin-turn'(pidPath, pos) {
    const s = load(pidPath);
    const agent = pos[0];
    if (BLOCKED_BEGIN.includes(s.status) || (s.mode === 'decide' && s.status === 'consensus_reached')) {
      fail(`Kein Zug möglich: Status "${s.status}" (Statuszeile: Waiting).`);
    }
    if (s.active_agent !== agent) fail(`${agent} ist nicht dran (aktiv: ${s.active_agent}) — Waiting.`);
    // Läuft der Zug schon, darf nur der frisch übergebene Zug (nach start/resume) betreten werden.
    const last = s.history.at(-1)?.action;
    if (s.status === 'working' && !['session_started', 'session_resumed_by_moderator'].includes(last)) {
      fail(`Zug von ${agent} läuft bereits. Ist die Instanz abgestürzt: pause, dann resume --agent ${agent}.`);
    }
    s.status = 'working';
    log(s, agent, 'turn_started');
    save(pidPath, s);
    out(s);
  },

  'end-turn'(pidPath, pos, opt) {
    const s = load(pidPath);
    const agent = pos[0];
    if (s.active_agent !== agent) fail(`${agent} ist nicht dran (aktiv: ${s.active_agent}).`);
    if (s.status !== 'working') fail(`Status ist "${s.status}", erwartet "working" (begin-turn vergessen oder Moderator-Eingriff).`);
    if (s.mode === 'decide' && opt.novelty === undefined) fail('Modus decide: --novelty true|false ist Pflicht.');
    if (s.mode === 'decide' && s.roster.length > 1 && s.current_round === 1 && !blindHash(s, agent)) {
      fail('Runde 1 (decide) ist blind: zuerst blind <topic> <Agent> (Beitrag in <topic>.blind.<Agent>.md).');
    }
    log(s, agent, 'turn_completed', opt.novelty === undefined ? {} : { novelty: opt.novelty === 'true' });
    let result = {};
    if (opt.consensus) {
      const c = s.consensus;
      const required = s.roster.map((r) => r.name);
      if (soloPlan(s)) required.push('moderator'); // Selbst-Planung: Moderator ist zweiter Teilnehmer (--approve)
      const missing = required.filter((n) => !c.signatures.includes(n));
      if (!c.proposal_id || missing.length) fail(`Konsens nicht belegt: Vorschlag ${c.proposal_id}, es fehlen Unterschriften von: ${missing.join(', ') || '—'}`);
      c.reached = true; s.status = 'consensus_reached'; s.outcome = 'CONSENSUS';
      log(s, agent, 'consensus_reached', { proposal: c.proposal_id });
      if (s.mode === 'decide') { save(pidPath, s); return out(s, { next: 'Endzustand — der Ergebnis-Block (10.6) muss im Topic-Dokument stehen (vorher schreiben, danach sind keine Züge mehr möglich)' }); }
    }
    result = handover(s, agent, Boolean(opt.consensus)); // Konsenszug ist vom Limit ausgenommen
    save(pidPath, s);
    out(s, { ...result, handoff: s.status === 'deadlock' ? null : `/collaborate --invite ${s.active_agent} ${topic}` });
  },

  propose(pidPath, pos) {
    const s = load(pidPath);
    const [agent, id] = pos;
    mustBeActive(s, agent);
    if (!id) fail('propose <topic> <Agent> <P<n>>');
    if (s.history.some((h) => h.action === 'proposal' && h.proposal === id)) fail(`Vorschlags-ID ${id} wurde schon verwendet.`);
    s.consensus = { reached: false, proposal_id: id, proposed_by: agent, signatures: [agent] };
    log(s, agent, 'proposal', { proposal: id });
    save(pidPath, s);
    out(s, { proposal: id });
  },

  sign(pidPath, pos) {
    const s = load(pidPath);
    const agent = pos[0];
    mustBeActive(s, agent);
    const c = s.consensus;
    if (!c.proposal_id) fail('Kein offener Vorschlag.');
    if (!c.signatures.includes(agent)) c.signatures.push(agent);
    log(s, agent, 'signed', { proposal: c.proposal_id });
    save(pidPath, s);
    const missing = s.roster.filter((r) => !c.signatures.includes(r.name)).map((r) => r.name);
    out(s, { proposal: c.proposal_id, missing });
  },

  blind(pidPath, pos) {
    const s = load(pidPath);
    const agent = pos[0];
    if (s.mode !== 'decide' || s.roster.length < 2) fail('blind gilt nur im Modus decide mit mindestens 2 Agenten.');
    if (s.current_round !== 1) fail('Blind-Beiträge gibt es nur in Runde 1.');
    mustBeActive(s, agent);
    const file = blindPath(pidPath, agent);
    if (!fs.existsSync(file)) fail(`${file} fehlt — zuerst den Blind-Beitrag dort schreiben.`);
    if (blindHash(s, agent)) fail(`${agent} hat bereits eingereicht (Hash festgeschrieben).`);
    const hash = sha(fs.readFileSync(file, 'utf8'));
    log(s, agent, 'blind_submitted', { hash });
    save(pidPath, s);
    out(s, { committed: hash.slice(0, 12) });
  },

  reveal(pidPath, pos) {
    const s = load(pidPath);
    const agent = pos[0];
    mustBeActive(s, agent);
    if (s.mode !== 'decide' || s.current_round !== 1) fail('reveal nur in Runde 1 (decide).');
    if (agent !== s.roster.at(-1).name) fail(`Aufdecken darf nur der letzte Agent der Rotation (${s.roster.at(-1).name}).`);
    const parts = [];
    for (const r of s.roster) {
      const hash = blindHash(s, r.name);
      if (!hash) fail(`${r.name} hat keinen Blind-Beitrag eingereicht.`);
      const text = fs.readFileSync(blindPath(pidPath, r.name), 'utf8');
      if (sha(text) !== hash) fail(`${r.name}: Blind-Datei wurde nach dem Einreichen verändert (Hash stimmt nicht).`);
      parts.push(`## Round 1: ${r.name} (blind)\n\n${text.trim()}\n`);
    }
    log(s, agent, 'blind_revealed');
    save(pidPath, s);
    console.log(parts.join('\n'));
  },

  approve(pidPath, pos) {
    const s = load(pidPath);
    if (!soloPlan(s)) fail('approve gilt nur im Modus plan mit genau 1 Agent (Selbst-Planung); sonst unterschreiben die Agenten.');
    if (['terminated', 'waiting_for_moderator'].includes(s.status)) fail(`approve nicht möglich im Status "${s.status}".`);
    const c = s.consensus;
    if (!c.proposal_id || c.reached) fail('Kein offener Vorschlag.');
    if (pos[0] && pos[0] !== c.proposal_id) fail(`Offener Vorschlag ist ${c.proposal_id}, nicht ${pos[0]}.`);
    if (!c.signatures.includes('moderator')) c.signatures.push('moderator');
    const ts = now();
    s.history.push({ round: s.current_round, agent: 'moderator', action: 'moderator_approval', proposal: c.proposal_id, timestamp: ts });
    save(pidPath, s);
    console.log(`[MODERATOR_APPROVAL ${c.proposal_id} ${ts}]`);
  },

  pause(pidPath) {
    const s = load(pidPath);
    if (['paused', 'terminated'].includes(s.status)) return out(s, { note: 'No-op (bereits ' + s.status + ')' });
    if (s.status === 'waiting_for_moderator') fail('pause erst nach start (nichts zu pausieren).');
    s.paused_agent = s.active_agent; s.status = 'paused';
    log(s, s.active_agent, 'session_paused_by_moderator');
    save(pidPath, s);
    out(s, { paused_agent: s.paused_agent });
  },

  resume(pidPath, pos, opt) {
    const s = load(pidPath);
    if (s.status !== 'paused') return out(s, { note: 'No-op (nicht pausiert)' });
    s.status = opt.agent && opt.agent === s.paused_agent ? 'working' : 'idle';
    s.active_agent = s.paused_agent;
    s.turn_index = s.roster.findIndex((r) => r.name === s.paused_agent);
    log(s, s.active_agent, 'session_resumed_by_moderator');
    save(pidPath, s);
    out(s);
  },

  stop(pidPath, pos, opt) {
    const s = load(pidPath);
    if (s.status === 'terminated') return out(s, { note: 'No-op (bereits terminated)' });
    const before = s.status;
    s.status = 'terminated';
    if (opt.outcome) {
      if (opt.outcome === 'MAJORITY_WITH_DISSENT') {
        const c = s.consensus;
        const votes = c.signatures.filter((n) => s.roster.some((r) => r.name === n)).length;
        if (s.mode !== 'decide' || before !== 'deadlock' || !c.proposal_id) fail('MAJORITY_WITH_DISSENT nur im Modus decide, Status deadlock, mit offenem Vorschlag.');
        if (votes * 2 <= s.roster.length) fail(`Keine Mehrheit: ${votes} von ${s.roster.length} haben unterschrieben (> 50 % nötig).`);
      } else if (opt.outcome !== 'NO_CONSENSUS') {
        fail('stop --outcome erlaubt nur NO_CONSENSUS oder MAJORITY_WITH_DISSENT (Entscheidung des Moderators: decide).');
      }
      s.outcome = String(opt.outcome);
    }
    else if (!s.outcome && !s.consensus.reached) s.outcome = s.mode === 'decide' ? 'NO_CONSENSUS' : null;
    log(s, s.active_agent, 'session_terminated_by_moderator');
    save(pidPath, s);
    out(s);
  },

  decide(pidPath, pos) {
    const s = load(pidPath);
    if (s.status === 'terminated') fail('Session ist bereits beendet.');
    if (!pos[0]) fail('decide <topic> "<Entscheidung>"');
    s.status = 'terminated'; s.outcome = 'MODERATOR_DECISION';
    log(s, 'moderator', 'moderator_decision', { text: pos[0] });
    save(pidPath, s);
    out(s, { next: 'Ergebnis-Block schreiben (10.6)' });
  },

  extend(pidPath, pos) {
    const s = load(pidPath);
    const k = Number(pos[0]);
    if (!Number.isInteger(k) || k < 1) fail('extend <topic> <Runden>');
    s.max_rounds += k;
    if (s.status === 'deadlock') s.status = 'idle';
    log(s, 'moderator', 'rounds_extended', { by: k });
    save(pidPath, s);
    out(s);
  },

  note(pidPath, pos) {
    const s = load(pidPath);
    if (!pos[0]) fail('note <topic> "<Text>"');
    const ts = now();
    s.history.push({ round: s.current_round, agent: 'moderator', action: 'moderator_note', timestamp: ts });
    save(pidPath, s);
    console.log(`[MODERATOR_NOTE ${ts}] ${pos[0]}`);
  },

  kick(pidPath, pos) {
    const s = load(pidPath);
    const name = pos[0];
    const old = s.roster.findIndex((r) => r.name === name);
    if (old < 0) fail(`${name} nicht im Roster.`);
    const wasActive = s.active_agent === name;
    const prev = s.active_agent;
    const nextName = s.roster[(old + 1) % s.roster.length].name;
    const wrapped = wasActive && old === s.roster.length - 1;
    s.roster.splice(old, 1);
    s.consensus.signatures = s.consensus.signatures.filter((n) => n !== name);
    const orphan = s.consensus.proposed_by === name && s.consensus.proposal_id && !s.consensus.reached;
    if (orphan) s.consensus = { reached: false, proposal_id: null, proposed_by: null, signatures: [] };
    let extra = {};
    if (s.roster.length === 0) {
      s.status = 'terminated'; s.active_agent = null; s.turn_index = 0;
    } else if (wasActive) {
      s.turn_index = s.roster.findIndex((r) => r.name === nextName);
      s.active_agent = nextName; s.status = 'idle';
      if (wrapped) {
        s.current_round += 1;
        if (s.current_round > s.max_rounds) { s.status = 'deadlock'; extra = { deadlock: 'round_limit' }; }
      }
    } else {
      s.turn_index = s.roster.findIndex((r) => r.name === prev);
    }
    log(s, 'moderator', 'agent_kicked_by_moderator', { removed: name, case: wasActive ? 'B' : 'A', ...(orphan ? { withdrawn_proposal: true } : {}) });
    save(pidPath, s);
    out(s, extra);
  },

  validate(pidPath) {
    const errs = validate(load(pidPath));
    if (errs.length) {
      const e = new CollabError(`INVALID: ${errs.join('; ')}`);
      e.exitCode = 2;
      throw e;
    }
    console.log('OK');
  },

  status() {
    const dir = DEFAULT_DIR;
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.pid')) : [];
    if (!files.length) return console.log(`Keine .pid-Dateien in ${dir}.`);
    console.log('| Thema | Modus | Status | Runde | Aktiv | Letzter Eintrag |\n| :-- | :-- | :-- | :-- | :-- | :-- |');
    for (const f of files) {
      const s = load(path.join(dir, f));
      const last = s.history.at(-1)?.timestamp ?? '—';
      console.log(`| ${f.replace(/\.pid$/, '')} | ${s.mode} | ${s.status} | ${s.current_round}/${s.max_rounds} | ${s.active_agent ?? '—'} | ${last} |`);
    }
  },
};

// ---- Einstieg ------------------------------------------------------------------------------

const { pos, opt } = parseArgs(process.argv.slice(2));
const [cmd, topic, ...rest] = pos;
if (!cmd || !commands[cmd]) {
  console.error(`Befehle: ${Object.keys(commands).join(' | ')}\nBeispiel: node collab.mjs end-turn diorama.md Alice --novelty true`);
  process.exit(1);
}
if (cmd === 'status') { commands.status(); process.exit(0); }
const pidPath = resolvePid(topic);
try {
  withLock(pidPath, () => commands[cmd](pidPath, rest, opt));
} catch (e) {
  if (!(e instanceof CollabError)) throw e;
  console.error(`ERROR: ${e.message}`);
  process.exitCode = e.exitCode ?? 1;
}
