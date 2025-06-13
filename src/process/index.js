const rgb = (r, g, b, msg) => `\x1b[38;2;${r};${g};${b}m${msg}\x1b[0m`;
const log = (...args) => console.log(`[${rgb(88, 101, 242, 'arRPC')} > ${rgb(237, 66, 69, 'process')}]`, ...args);

let db;
let customDetectables = [];

import * as Natives from './native/index.js';
import fs from 'node:fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const Native = Natives[process.platform];


const timestamps = {}, names = {}, pids = {};
export default class ProcessServer {
  constructor(handlers) {
    if (!Native) return log('unsupported platform:', process.platform);

    this.handlers = handlers;

    this.scan = this.scan.bind(this);
    this.getDetectables();
    customDetectables = handlers.customDetectables || [];
    this.scan();
    setInterval(this.scan, 5000);

    log('started');
  }

  async scan() {
    // const startTime = performance.now();
    const processes = await Native.getProcesses();
    const ids = [];
    const DetectableDB = await this.getDetectables();

    // log(`got processed in ${(performance.now() - startTime).toFixed(2)}ms`);

    for (const [ pid, _path, args ] of processes) {
      let path = _path.toLowerCase().replaceAll('\\', '/');
      if (process.platform === "darwin") {
        // add to path dot app for better detection
        path = path + ".app"
      }
      const toCompare = [];
      const splitPath = path.split('/');
      for (let i = 1; i < splitPath.length; i++) {
        toCompare.push(splitPath.slice(-i).join('/'));
      }

      for (const p of toCompare.slice()) { // add more possible tweaked paths for less false negatives
        toCompare.push(p.replace('64', '')); // remove 64bit identifiers-ish
        toCompare.push(p.replace('.x64', ''));
        toCompare.push(p.replace('x64', ''));
        toCompare.push(p.replace('_64', ''));
      }

      
      for (const { executables, id, name } of DetectableDB) {
        if (executables?.some(x => {
          if (x.is_launcher) return false;
          if (x.name[0] === '>' ? x.name.substring(1) !== toCompare[0] : !toCompare.some(y => x.name === y)) return false;
          if (args && x.arguments) return args.join(" ").indexOf(x.arguments) > -1;
          return true;
        })) {
          names[id] = name;
          pids[id] = pid;

          ids.push(id);
          if (!timestamps[id]) {
            log('detected game!', name);
            timestamps[id] = Date.now();
          }

          // Resending this on evry scan is intentional, so that in the case that arRPC scans processes before Discord, existing activities will be sent
          this.handlers.message({
            socketId: id
          }, {
            cmd: 'SET_ACTIVITY',
            args: {
              activity: {
                application_id: id,
                name,
                timestamps: {
                  start: timestamps[id]
                }
              },
              pid
            }
          });
        }
      }
    }

    for (const id in timestamps) {
      if (!ids.includes(id)) {
        log('lost game!', names[id]);
        delete timestamps[id];

        this.handlers.message({
          socketId: id
        }, {
          cmd: 'SET_ACTIVITY',
          args: {
            activity: null,
            pid: pids[id]
          }
        });
      }
    }

    // log(`finished scan in ${(performance.now() - startTime).toFixed(2)}ms`);
    // process.stdout.write(`\r${' '.repeat(100)}\r[${rgb(88, 101, 242, 'arRPC')} > ${rgb(237, 66, 69, 'process')}] scanned (took ${(performance.now() - startTime).toFixed(2)}ms)`);
  }
  async getDetectables() {
    if (typeof db !== "object") {
      const data = await fetch(
        "https://discord.com/api/v9/applications/detectable"
      );
      if (!data.ok) {
        log('failed to fetch detectables, falling back to local copy');
        return JSON.parse(fs.readFileSync(join(__dirname, 'detectables.json'), 'utf8'));;
      }
      db = await data.json();
      if (customDetectables.length) {
        log('adding custom detectables');
        db = db.concat(customDetectables);
      }
    }
    return db;
  }
}
