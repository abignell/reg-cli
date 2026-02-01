import { type ChildProcess, fork } from 'node:child_process';
import type EventEmitter from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DiffCreatorParams, DiffResult } from './diff.js';

export default class ProcessAdaptor {
  _isRunning: boolean;
  _process: ChildProcess;
  _emitter: EventEmitter;

  constructor(emitter: EventEmitter) {
    this._process = fork(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), './diff.js'),
    );
    this._isRunning = false;
    this._emitter = emitter;
  }

  isRunning() {
    return this._isRunning;
  }

  run(params: DiffCreatorParams): Promise<DiffResult | null> {
    return new Promise((resolve) => {
      this._isRunning = true;
      if (!this._process || !this._process.send) resolve(null);
      this._process.send(params);
      this._process.once('message', (result: DiffResult) => {
        this._isRunning = false;
        this._emitter.emit('compare', {
          type: result.passed ? 'pass' : 'fail',
          path: result.image,
        });
        resolve(result);
      });
    });
  }

  close() {
    if (!this._process || !this._process.kill) return;
    this._process.kill();
  }
}
