// @ts-check
/**
 * Progress counting for docs/progress (rules: docs/progress/README.md). Pure functions.
 * Reads task tables in stages/stage-NN.md and regenerates the block between
 * <!-- progress:start --> and <!-- progress:end --> in STATUS.md.
 */

export const STATUSES = /** @type {const} */ (['TODO', 'DOING', 'REVIEW', 'DONE', 'BLOCKED', 'DEFERRED', 'DROPPED']);
const START = '<!-- progress:start -->';
const END = '<!-- progress:end -->';

/** @typedef {{ id: string, status: string, notes: string }} Task */
/** @typedef {{ stage: string, tasks: Task[], started: string, finished: string }} StageFile */
/** @typedef {{ done: number, total: number, deferred: number, percent: number, status: string }} StageCount */

/** @param {string} line */
const cells = (line) => line.split('|').slice(1, -1).map((c) => c.trim());

/**
 * @param {string} stage e.g. '00'
 * @param {string} markdown
 * @returns {StageFile}
 */
export function parseStageFile(stage, markdown) {
  const lines = markdown.split('\n');
  const field = (/** @type {string} */ name) => cells(lines.find((l) => l.startsWith(`| **${name}** |`)) ?? '| | — |')[1] ?? '—';
  const headerIndex = lines.findIndex((l) => /^\|\s*ID\s*\|/.test(l));
  if (headerIndex === -1) return { stage, tasks: [], started: field('Started'), finished: field('Finished') };
  const header = cells(lines[headerIndex] ?? '');
  const statusCol = header.indexOf('Status');
  const notesCol = header.indexOf('Notes');
  /** @type {Task[]} */
  const tasks = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith('|')) break;
    const row = cells(line);
    if (!/^S\d{2}-T\d{2}[a-z]?$/.test(row[0] ?? '')) continue;
    tasks.push({ id: row[0] ?? '', status: row[statusCol] ?? '', notes: row[notesCol] ?? '' });
  }
  return { stage, tasks, started: field('Started'), finished: field('Finished') };
}

/** @param {StageFile} file @returns {StageCount} */
export function countStage(file) {
  const live = file.tasks.filter((t) => t.status !== 'DROPPED');
  const done = live.filter((t) => t.status === 'DONE').length;
  const deferred = live.filter((t) => t.status === 'DEFERRED').length;
  const countable = live.length - deferred;
  const percent = countable === 0 ? 0 : Math.round((done / countable) * 100);
  let status = 'NOT_STARTED';
  if (live.some((t) => t.status === 'BLOCKED')) status = 'BLOCKED';
  else if (countable > 0 && done === countable) status = 'DONE';
  else if (live.some((t) => ['DOING', 'REVIEW', 'DONE'].includes(t.status))) status = 'IN_PROGRESS';
  return { done, total: live.length, deferred, percent, status };
}

/**
 * Problems a reviewer must fix (used by --check).
 * @param {StageFile[]} files @param {string} deferredMarkdown
 * @returns {string[]}
 */
export function validate(files, deferredMarkdown) {
  /** @type {string[]} */
  const problems = [];
  for (const f of files) {
    for (const t of f.tasks) {
      if (!(/** @type {readonly string[]} */ (STATUSES)).includes(t.status)) problems.push(`${t.id}: unknown status "${t.status}"`);
      if (t.status === 'DEFERRED') {
        const ref = /DEF-\d{3}/.exec(t.notes)?.[0];
        if (!ref) problems.push(`${t.id}: DEFERRED needs a DEF-nnn reference in Notes`);
        else if (!deferredMarkdown.includes(`| ${ref} |`)) problems.push(`${t.id}: ${ref} has no row in DEFERRED.md`);
      }
    }
  }
  return problems;
}

/**
 * Rewrites the generated block of STATUS.md for stages that have a stage file.
 * @param {string} statusMarkdown @param {StageFile[]} files @returns {string}
 */
export function renderStatus(statusMarkdown, files) {
  const start = statusMarkdown.indexOf(START);
  const end = statusMarkdown.indexOf(END);
  if (start === -1 || end === -1) throw new Error('STATUS.md has no progress block');
  const byStage = new Map(files.map((f) => [f.stage, f]));
  const block = statusMarkdown.slice(start + START.length, end).split('\n');
  let done = 0;
  let total = 0;
  let deferred = 0;
  const rows = block.map((line) => {
    const row = cells(line);
    const file = byStage.get(row[0] ?? '');
    if (!line.startsWith('|') || !file) return line;
    const c = countStage(file);
    done += c.done;
    total += c.total - c.deferred;
    deferred += c.deferred;
    const details = `[stage-${file.stage}](stages/stage-${file.stage}.md)`;
    return `| ${row[0]} | ${row[1]} | ${row[2]} | ${c.status} | ${c.done} / ${c.total} | ${c.deferred} | ${c.percent} % | ${file.started} | ${file.finished} | ${details} |`;
  });
  const overallPercent = total === 0 ? 0 : Math.round((done / total) * 100);
  const overall = `**Overall (stages with task lists):** ${done} of ${total} tasks done (${overallPercent} %) · deferred on purpose: ${deferred} (see \`DEFERRED.md\`, which also lists the plan-level deferrals)`;
  const body = rows.map((l) => (l.startsWith('**Overall') ? overall : l)).join('\n');
  return statusMarkdown.slice(0, start + START.length) + body + statusMarkdown.slice(end);
}
