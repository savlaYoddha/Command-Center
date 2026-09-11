import os from "node:os";
import fs from "node:fs";
import { config } from "../config.js";

function cpuUsagePercent(): number {
  const cpus = os.cpus();
  if (cpus.length === 0) return 0;
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += cpu.times.idle + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq;
  }
  if (total === 0) return 0;
  return Math.round((1 - idle / total) * 100);
}

function memoryUsagePercent(): number {
  const total = os.totalmem();
  const free = os.freemem();
  if (total === 0) return 0;
  return Math.round(((total - free) / total) * 100);
}

function storageUsagePercent(): number {
  try {
    const stats = fs.statfsSync(config.dataDir);
    const total = stats.blocks * stats.bsize;
    const free = stats.bavail * stats.bsize;
    if (total === 0) return 0;
    return Math.round(((total - free) / total) * 100);
  } catch {
    return 0;
  }
}

export function getSystemMetrics() {
  return {
    cpu: cpuUsagePercent(),
    ram: memoryUsagePercent(),
    storage: storageUsagePercent(),
    hostname: os.hostname(),
    uptimeSeconds: Math.round(os.uptime()),
  };
}
