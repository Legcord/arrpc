import { EventEmitter } from "events";
type OS = "win32" | "linux" | "darwin";

interface Executable {
  is_launcher: boolean;
  name: string;
  os: OS;
}

interface Game {
  aliases: string[];
  executables: Executable[];
  hook: boolean;
  id: string;
  name: string;
  overlay: boolean;
  overlay_compatibility_hook: boolean;
  overlay_methods: number | null;
  overlay_warn: boolean;
  themes: string[];
}

type GameList = Game[];
type ProcessInfo = [number, string, string[]];

export default class RPCServer extends EventEmitter {
  constructor(detectables: GameList);
  getProcessesList(): Promise<ProcessInfo[]>;
}
