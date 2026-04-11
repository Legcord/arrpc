import { exec } from 'child_process';

const SYSTEM_PATH_PREFIXES = [
  '/system/',
  '/usr/',
  '/bin/',
  '/sbin/',
  '/private/var/',
  '/library/apple/',
  '/library/system/',
];

const SYSTEM_APP_NAMES = new Set([
  'finder.app',
  'windowmanager.app',
  'windowserver.app',
  'controlcenter.app',
  'dock.app',
  'loginwindow.app',
  'notificationcenter.app',
  'system settings.app',
  'system preferences.app',
]);

const getFirstToken = (line) => {
  const value = line.trim();
  if (!value) return '';

  if (value[0] === '"' || value[0] === "'") {
    const quote = value[0];
    const closing = value.indexOf(quote, 1);
    return (closing > 1 ? value.slice(1, closing) : value.slice(1)).trim();
  }

  const splitAt = value.search(/\s/);
  if (splitAt === -1) return value;
  return value.slice(0, splitAt).trim();
};

const extractProcessName = (commandLine) => {
  const trimmed = commandLine.trim();
  if (!trimmed) return null;

  // Prefer app bundle segment, e.g. /Applications/Roblox.app/Contents/... => /Applications/Roblox.app
  const appMatch = trimmed.match(/\/(.+?\.app)(?:\/|\s|$)/i);
  if (appMatch) {
    const fullBundlePath = appMatch[0].replace(/\/$/, '');
    const bundleName = appMatch[1].split('/').pop();

    if (!bundleName) return null;

    const lowerBundleName = bundleName.toLowerCase();
    const lowerBundlePath = fullBundlePath.toLowerCase();
    if (SYSTEM_APP_NAMES.has(lowerBundleName)) return null;
    if (SYSTEM_PATH_PREFIXES.some(prefix => lowerBundlePath.startsWith(prefix))) return null;

    return lowerBundlePath;
  }

  const token = getFirstToken(trimmed)
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\ /g, ' ');

  if (!token) return null;

  const lowerToken = token.toLowerCase();
  if (SYSTEM_PATH_PREFIXES.some(prefix => lowerToken.startsWith(prefix))) return null;

  const pieces = token.split('/').filter(Boolean);
  return (pieces.length ? pieces[pieces.length - 1] : token).toLowerCase();
};

const getProcesses = async () => {
  return new Promise((resolve) => {
    exec('/bin/ps -awwx -o pid=,command=', (error, stdout, stderr) => {
      if (error || stderr) {
        resolve([]);
        return;
      }
      const lines = stdout.trim().split('\n');
      const seenNames = new Set();
      const processes = lines.map(line => {
        const match = line.trim().match(/^(\d+)\s+(.*)$/);
        if (!match) return null;
        const pid = +match[1];
        const fullCmd = match[2].trim();
        const command = extractProcessName(fullCmd);
        if (!command) return null;

        const normalizedName = command.toLowerCase();
        if (seenNames.has(normalizedName)) return null;
        seenNames.add(normalizedName);

        // Keep the full command line as a searchable argument blob for detectable argument matching.
        return [pid, command, [fullCmd]];
      }).filter(Boolean);
      resolve(processes);
    });
  });
};

export { getProcesses };