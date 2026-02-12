import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NodeSecureSandbox } from '../src/security/node-sandbox.js';
import type { NodeSandboxConfig } from '../src/security/node-sandbox.js';

function createSecureSandbox(config?: Partial<NodeSandboxConfig>): NodeSecureSandbox {
  return new NodeSecureSandbox(config);
}

describe('NodeSecureSandbox', () => {
  let sandbox: NodeSecureSandbox;

  beforeEach(() => {
    sandbox = createSecureSandbox({
      timeout: 5000,
      memoryLimit: 50,
      cpuLimit: 1000,
    });
  });

  afterEach(async () => {
    await sandbox.destroy();
  });

  describe('Basic Execution', () => {
    it('should execute simple code', async () => {
      const result = await sandbox.execute('1 + 1');

      expect(result.success).toBe(true);
      expect(result.result).toBe(2);
    });

    it('should execute async code', async () => {
      const result = await sandbox.execute(`
        (async function() { return await Promise.resolve(42) })()
      `);

      expect(result.success).toBe(true);
    });

    it('should return execution metadata', async () => {
      const result = await sandbox.execute('"test"');

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle syntax errors', async () => {
      const result = await sandbox.execute('invalid javascript code');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle runtime errors', async () => {
      const result = await sandbox.execute('throw new Error("test error")');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('test error');
    });
  });

  describe('Context Injection', () => {
    it('should inject context variables', async () => {
      const context = {
        $value: 100,
        $name: 'test',
      };

      const result = await sandbox.execute('$value + $name.length', context);

      expect(result.success).toBe(true);
      expect(result.result).toBe(104);
    });

    it('should handle complex context objects', async () => {
      const context = {
        $data: { foo: 'bar', nested: { value: 42 } },
      };

      const result = await sandbox.execute('$data.nested.value', context);

      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
    });
  });

  describe('Security Restrictions', () => {
    it('should block require', async () => {
      const result = await sandbox.execute('require("fs")');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should block process.exit', async () => {
      const result = await sandbox.execute('process.exit(1)');

      expect(result.success).toBe(false);
    });

    it('should block eval', async () => {
      const result = await sandbox.execute('eval("1+1")');

      expect(result.success).toBe(false);
    });

    it('should block Function constructor', async () => {
      const result = await sandbox.execute('new Function("return 1")()');

      expect(result.success).toBe(false);
    });
  });

  describe('Timeout', () => {
    it('should enforce timeout', async () => {
      const shortSandbox = createSecureSandbox({
        timeout: 100,
        memoryLimit: 50,
      });

      const result = await shortSandbox.execute(`
        (function() {
          const start = Date.now();
          while (Date.now() - start < 1000) {}
          return 'done';
        })()
      `);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('timeout');

      await shortSandbox.destroy();
    });

    it('should allow fast execution', async () => {
      const result = await sandbox.execute('1 + 1');

      expect(result.success).toBe(true);
    });
  });

  describe('Memory Limits', () => {
    it('should track memory usage', async () => {
      const result = await sandbox.execute(`
        (function() {
          const arr = new Array(1000).fill(0);
          return arr.length;
        })()
      `);

      expect(result.success).toBe(true);
      expect(result.memoryUsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Sandbox Isolation', () => {
    it('should isolate between executions', async () => {
      await sandbox.execute('var x = 1');
      const result = await sandbox.execute('typeof x');

      expect(result.success).toBe(true);
      expect(result.result).toBe('undefined');
    });
  });

  describe('Code Compilation Caching', () => {
    it('should cache compiled code', async () => {
      const code = '1 + 1';

      const result1 = await sandbox.execute(code);
      const result2 = await sandbox.execute(code);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Sandbox Stats', () => {
    it('should return stats', async () => {
      await sandbox.execute('1 + 1');
      
      const stats = sandbox.getStats();
      
      expect(stats.backend).toBe('node-vm');
      expect(stats.healthy).toBe(true);
      expect(stats.executionCount).toBe(1);
    });

    it('should check health', () => {
      expect(sandbox.isHealthy()).toBe(true);
    });
  });
});

describe('createSecureSandbox', () => {
  it('should create sandbox with default config', () => {
    const sandbox = createSecureSandbox();
    expect(sandbox).toBeInstanceOf(NodeSecureSandbox);
    sandbox.destroy();
  });

  it('should create sandbox with custom config', () => {
    const sandbox = createSecureSandbox({
      timeout: 10000,
      memoryLimit: 100,
      cpuLimit: 2000,
      useContextIsolation: true,
      cacheCompiledCode: true,
    });

    expect(sandbox).toBeInstanceOf(NodeSecureSandbox);
    sandbox.destroy();
  });
});

describe('Security Edge Cases', () => {
  let sandbox: NodeSecureSandbox;

  beforeEach(() => {
    sandbox = createSecureSandbox({
      timeout: 5000,
      memoryLimit: 50,
    });
  });

  afterEach(async () => {
    await sandbox.destroy();
  });

  it('should handle deep nesting', async () => {
    const result = await sandbox.execute(`
      (function() {
        let obj = { value: 1 };
        for (let i = 0; i < 100; i++) {
          obj = { nested: obj };
        }
        return 'ok';
      })()
    `);

    expect(result.success).toBe(true);
  });

  it('should handle large arrays', async () => {
    const result = await sandbox.execute(`
      (function() {
        const arr = new Array(10000).fill(0);
        return arr.length;
      })()
    `);

    expect(result.success).toBe(true);
    expect(result.result).toBe(10000);
  });

  it('should handle recursive functions', async () => {
    const result = await sandbox.execute(`
      (function() {
        function fib(n) {
          if (n <= 1) return n;
          return fib(n - 1) + fib(n - 2);
        }
        return fib(10);
      })()
    `);

    expect(result.success).toBe(true);
    expect(result.result).toBe(55);
  });
});
