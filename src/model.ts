export type RuleMode = 'either' | 'both';
export type PoolType = 'Concentrated' | 'Constant product';
export type Pool = {
  id: string;
  token0: string;
  token1: string;
  type: PoolType;
  fee: string;
  liquidity: number;
  createdAt: number;
};
export type Settings = { enabled: boolean; mode: RuleMode; poolType: 'All types' | PoolType };
export type PoolAlert = { id: string; pair: string; createdAt: number; read: boolean; test: boolean };
export const defaults: Settings = { enabled: true, mode: 'either', poolType: 'All types' };
export const storageKey = 'poolwatch.settings.v1';

// Illustrative sample events only. These are not on-chain pool identifiers or observations.
const samples: Omit<Pool, 'id' | 'createdAt'>[] = [
  { token0: 'USDC', token1: 'WETH', type: 'Concentrated', fee: '0.05%', liquidity: 84200 },
  { token0: 'LINK', token1: 'WETH', type: 'Concentrated', fee: '0.30%', liquidity: 32650 },
  { token0: 'DAI', token1: 'USDC', type: 'Constant product', fee: '0.30%', liquidity: 126800 },
  { token0: 'ETH', token1: 'WETH', type: 'Concentrated', fee: '0.01%', liquidity: 218500 },
  { token0: 'WBTC', token1: 'USDC', type: 'Concentrated', fee: '0.30%', liquidity: 67300 },
  { token0: 'UNI', token1: 'WETH', type: 'Constant product', fee: '0.30%', liquidity: 18450 },
  { token0: 'ETH', token1: 'WETH', type: 'Constant product', fee: '0.30%', liquidity: 95300 },
  { token0: 'AAVE', token1: 'USDC', type: 'Concentrated', fee: '0.30%', liquidity: 41900 },
];
export function samplePool(sequence: number, createdAt = Date.now()): Pool {
  return { ...samples[((sequence % samples.length) + samples.length) % samples.length], id: `sample-${sequence}`, createdAt };
}
export function initialPools(now = Date.now()): Pool[] {
  return samples.map((_, i) => samplePool(i, now - (i + 1) * 120000));
}
export function matchesRule(pool: Pool, settings: Settings): boolean {
  const nonNative = (token: string) => !['ETH', 'WETH'].includes(token.toUpperCase());
  const tokensMatch = settings.mode === 'either'
    ? nonNative(pool.token0) || nonNative(pool.token1)
    : nonNative(pool.token0) && nonNative(pool.token1);
  return tokensMatch && (settings.poolType === 'All types' || settings.poolType === pool.type);
}
export function readSettings(): { settings: Settings; unavailable: boolean } {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (typeof parsed === 'object' && parsed !== null && 'enabled' in parsed && 'mode' in parsed && 'poolType' in parsed &&
      typeof parsed.enabled === 'boolean' && ['either', 'both'].includes(String(parsed.mode)) &&
      ['All types', 'Concentrated', 'Constant product'].includes(String(parsed.poolType))) {
      return { settings: parsed as Settings, unavailable: false };
    }
    return { settings: defaults, unavailable: false };
  } catch { return { settings: defaults, unavailable: true }; }
}
export function poolsToCsv(pools: Pool[], settings: Settings): string {
  const escape = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const rows = pools.map(p => [p.id, p.token0, p.token1, p.type, p.fee, p.liquidity, new Date(p.createdAt).toISOString(), matchesRule(p, settings) ? 'Match' : 'Excluded', 'Illustrative sample']);
  return [['Sample ID', 'Token 1', 'Token 2', 'Pool type', 'Fee', 'Sample liquidity USD', 'Simulated time UTC', 'Rule result', 'Source'], ...rows].map(r => r.map(escape).join(',')).join('\r\n');
}
