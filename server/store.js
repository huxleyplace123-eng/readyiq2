// server/store.js — JSON-on-disk persistence for the rail.
//
// The vault and connection state were built in-memory with a database-shaped interface;
// this is the smallest honest step past that: the referral log and the consumer state
// survive a restart. Writes are whole-file and atomic (write a temp file, rename it),
// so a crash mid-write cannot leave a half-written log — which matters for something
// that calls itself an audit trail.

import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

export class JsonStore {
  #file;
  constructor(file) {
    if (!file) throw new TypeError('file path required');
    this.#file = file;
    mkdirSync(dirname(file), { recursive: true });
  }
  get file() { return this.#file; }
  /** Returns the parsed file, or `fallback` when the file does not exist yet. */
  load(fallback = null) {
    if (!existsSync(this.#file)) return fallback;
    try { return JSON.parse(readFileSync(this.#file, 'utf8')); }
    catch (err) { throw new Error(`could not read ${this.#file}: ${err.message}`); }
  }
  save(value) {
    const tmp = `${this.#file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(value, null, 1));
    renameSync(tmp, this.#file);
    return value;
  }
}
