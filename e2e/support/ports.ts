// The app is built against fixed stand-in URLs, so these ports are fixed for a
// whole run. Set E2E_PORT_BASE to run suites side by side, e.g. in two worktrees.
const base = Number(process.env.E2E_PORT_BASE ?? 4310);

export const appPort = base;
export const cloudPort = base + 1;
export const aiPort = base + 2;
