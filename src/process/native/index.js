export const getProcesses = async (winModeLegacy) => {
    switch (process.platform) {
        case 'win32':
            if (winModeLegacy) {
                return await import("./win32Legacy.js").then(module => module.getProcesses());
            } else {
                return await import("./win32.js").then(module => module.getProcesses());
            }
        case 'linux':
            return await import("./linux.js").then(module => module.getProcesses());
        case 'darwin':
            return await import("./darwin.js").then(module => module.getProcesses());
        default:
            return [];
    }
}