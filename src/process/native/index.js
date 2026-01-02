export const getProcesses = async () => {
    switch (process.platform) {
        case 'win32':
            return await import("./win32.js").then(module => module.getProcesses());
        case 'linux':
            return await import("./linux.js").then(module => module.getProcesses());
        case 'darwin':
            return await import("./darwin.js").then(module => module.getProcesses());
        default:
            return [];
    }
}