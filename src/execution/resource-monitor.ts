/**
 * Resource Monitor
 * 资源监控器 - 监控执行资源使用
 */

export interface ResourceUsage {
  cpuTime: number;
  memoryPeak: number;
  networkRequests: number;
  fileOperations: number;
}

export class ResourceMonitor {
  private usages = new Map<string, ResourceUsage>();

  startMonitoring(executionId: string): void {
    this.usages.set(executionId, {
      cpuTime: 0,
      memoryPeak: 0,
      networkRequests: 0,
      fileOperations: 0,
    });
  }

  stopMonitoring(_executionId: string): void {
    // 停止监控，但保留数据
  }

  getUsage(executionId: string): ResourceUsage | undefined {
    return this.usages.get(executionId);
  }

  updateUsage(executionId: string, usage: Partial<ResourceUsage>): void {
    const current = this.usages.get(executionId);
    if (current) {
      this.usages.set(executionId, { ...current, ...usage });
    }
  }

  recordNetworkRequest(executionId: string): void {
    const usage = this.usages.get(executionId);
    if (usage) {
      usage.networkRequests++;
    }
  }

  recordFileOperation(executionId: string): void {
    const usage = this.usages.get(executionId);
    if (usage) {
      usage.fileOperations++;
    }
  }

  updateMemoryPeak(executionId: string, memory: number): void {
    const usage = this.usages.get(executionId);
    if (usage && memory > usage.memoryPeak) {
      usage.memoryPeak = memory;
    }
  }

  clear(): void {
    this.usages.clear();
  }
}

export default ResourceMonitor;
