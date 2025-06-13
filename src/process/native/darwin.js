const { exec } = require('child_process');

export const getProcesses = async () => {
  return new Promise((resolve) => {
    exec('ps -axo pid,comm,args', (error, stdout, stderr) => {
      if (error || stderr) {
        resolve([]);
        return;
      }
      const lines = stdout.trim().split('\n').slice(1);
      const processes = lines.map(line => {
        const match = line.trim().match(/^(\d+)\s+(\S+)\s*(.*)$/);
        if (!match) return null;
        const pid = +match[1];
        const command = match[2];
        const args = match[3] ? match[3].split(' ').filter(Boolean) : [];
        return [pid, command, args];
      }).filter(Boolean);
      resolve(processes);
    });
  });
};