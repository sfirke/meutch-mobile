#!/usr/bin/env node
/**
 * Flags dependency additions and version changes against a base ref.
 *
 * Agents install packages liberally and the React Native supply chain is a real
 * attack surface, so a new package should never slip into this app as an
 * unremarked line in a large diff. Any addition or version change fails this
 * check until the pull request body carries an explicit acknowledgement:
 *
 *   Approved-dependency-change: adds expo-image-picker for camera uploads
 *
 * Run locally with: node scripts/check-dependency-changes.mjs [base-ref]
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';

const ACK_PATTERN = /^Approved-dependency-change:\s*\S+/im;
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies'];

function readPackageJsonAtRef(ref) {
  const contents = execFileSync('git', ['show', `${ref}:package.json`], {
    encoding: 'utf8',
  });

  return JSON.parse(contents);
}

function collectDependencies(packageJson) {
  const collected = new Map();

  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, range] of Object.entries(packageJson[field] ?? {})) {
      collected.set(name, { field, range });
    }
  }

  return collected;
}

function diffDependencies(baseDependencies, headDependencies) {
  const added = [];
  const changed = [];
  const removed = [];

  for (const [name, head] of headDependencies) {
    const base = baseDependencies.get(name);

    if (!base) {
      added.push({ name, field: head.field, range: head.range });
    } else if (base.range !== head.range) {
      changed.push({
        name,
        field: head.field,
        from: base.range,
        to: head.range,
      });
    }
  }

  for (const [name, base] of baseDependencies) {
    if (!headDependencies.has(name)) {
      removed.push({ name, field: base.field, range: base.range });
    }
  }

  return { added, changed, removed };
}

function report(lines) {
  const body = lines.join('\n');

  process.stdout.write(`${body}\n`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${body}\n`);
  }
}

function main() {
  const baseRef = process.argv[2] ?? 'origin/main';
  const baseDependencies = collectDependencies(readPackageJsonAtRef(baseRef));
  const headDependencies = collectDependencies(
    JSON.parse(readFileSync('package.json', 'utf8')),
  );
  const { added, changed, removed } = diffDependencies(
    baseDependencies,
    headDependencies,
  );

  if (added.length === 0 && changed.length === 0 && removed.length === 0) {
    report([`No dependency changes against ${baseRef}.`]);
    return;
  }

  const lines = [`## Dependency changes against ${baseRef}`, ''];

  for (const { name, field, range } of added) {
    lines.push(`- **added** \`${name}@${range}\` (${field})`);
  }

  for (const { name, field, from, to } of changed) {
    lines.push(`- **changed** \`${name}\` ${from} → ${to} (${field})`);
  }

  for (const { name, field, range } of removed) {
    lines.push(`- removed \`${name}@${range}\` (${field})`);
  }

  const needsAcknowledgement = added.length > 0 || changed.length > 0;

  if (!needsAcknowledgement) {
    lines.push('', 'Removals only, nothing to acknowledge.');
    report(lines);
    return;
  }

  if (ACK_PATTERN.test(process.env.DEPENDENCY_CHANGE_ACK ?? '')) {
    lines.push('', 'Acknowledged in the pull request body.');
    report(lines);
    return;
  }

  lines.push(
    '',
    'Review each package above — its publisher, its transitive tree, and whether',
    'the app genuinely needs it — then add a line to the pull request body:',
    '',
    '    Approved-dependency-change: <why this package is needed>',
  );
  report(lines);
  process.exitCode = 1;
}

main();
