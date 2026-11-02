export const API_URL = 'https://api.squeekchain.com/v1/economy/state';
export const REFRESH_MS = 30_000;
export const REQUEST_TIMEOUT_MS = 12_000;
export const STALE_MS = 180_000;

export interface ContractIdentity {
  name: string;
  role: string;
  address: string | null;
  additional?: boolean;
}

export interface Economy {
  generatedAt: string;
  release: string;
  safeBlock: string;
  safeAt: string;
  confirmations: string;
  decimals: number;
  currentRound: string;
  processedRound: string;
  paused: boolean;
  stage: string;
  mined: string;
  totalMinted: string;
  cap: string;
  remaining: string;
  nftLive: string;
  nftIssued: string;
  nftBurned: string;
  contracts: ContractIdentity[];
}

export class EconomyError extends Error {
  retryAt: number;
  constructor(message: string, retryAt = 0) {
    super(message);
    this.name = 'EconomyError';
    this.retryAt = retryAt;
  }
}

type JsonObject = Record<string, unknown>;
const invalid = () => new EconomyError('The API response has changed or is incomplete. Try refreshing, or view the source API.');
const object = (value: unknown): JsonObject => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  return value as JsonObject;
};
const text = (value: unknown): string => {
  if (typeof value !== 'string' || !value.length) throw invalid();
  return value;
};
const uint = (value: unknown): string => {
  const result = text(value);
  if (!/^(0|[1-9]\d*)$/.test(result) || result.length > 78) throw invalid();
  return result;
};
const date = (value: unknown): string => {
  const result = text(value);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(result) || !Number.isFinite(Date.parse(result))) throw invalid();
  return result;
};
const address = (value: unknown): string => {
  const result = text(value);
  if (!/^0x[\da-fA-F]{40}$/.test(result) || /^0x0{40}$/i.test(result)) throw invalid();
  return result;
};
function proxy(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? address(value) : address(object(value).proxy);
}

export function parseEconomy(input: unknown): Economy {
  const root = object(input);
  if (root.schemaVersion !== 2) throw new EconomyError('This API version is not supported. View the source API or try again later.');
  if (root.status === 'unavailable') throw new EconomyError('The Squeekchain API reports that economy data is unavailable. Try refreshing in a moment.');
  if (root.status !== 'available') throw invalid();
  const chain = object(root.chain);
  if (chain.target !== 'sepolia' || chain.chainId !== '11155111') throw new EconomyError('The API returned a different network. Only Sepolia data is shown here.');
  const identities = object(root.identities);
  const asset = object(root.asset);
  if (asset.symbol !== 'SQK' || asset.decimals !== 18 || address(asset.address).toLowerCase() !== address(identities.token).toLowerCase()) throw invalid();
  const lifecycle = object(root.lifecycle);
  if (typeof lifecycle.paused !== 'boolean') throw invalid();
  const supply = object(root.supply);
  const nft = object(root.nft);
  const mining = object(root.mining);
  const contracts: ContractIdentity[] = [
    { name: 'SqueekCore', role: 'Records settled work', address: address(identities.core) },
    { name: 'SqueekMining', role: 'Issues mining rewards · proxy', address: proxy(identities.mining) },
    { name: 'SqueekToken', role: 'The SQK token', address: address(identities.token) },
    { name: 'SqueekNFT', role: 'The Squeeks collection', address: address(identities.genesis) },
    { name: 'SqueekStaking', role: 'Staking · proxy', address: proxy(identities.staking) },
  ];
  for (const [key, name, role] of [
    ['tokenFactory', 'Token factory', 'Creates the SQK token'],
    ['launch', 'Genesis launch', 'Collection launch contract'],
  ]) {
    if (identities[key] != null) contracts.push({ name, role, address: address(identities[key]), additional: true });
  }
  for (const [key, name] of [['mining', 'Mining implementation'], ['staking', 'Staking implementation']]) {
    const identity = identities[key];
    if (identity && typeof identity === 'object' && object(identity).implementation != null) {
      contracts.push({ name, role: 'Implementation behind the proxy', address: address(object(identity).implementation), additional: true });
    }
  }
  const result: Economy = {
    generatedAt: date(root.generatedAt), release: text(object(root.release).id),
    safeBlock: uint(chain.safeThroughBlock), safeAt: date(chain.safeBlockTimestamp), confirmations: uint(chain.confirmations),
    decimals: asset.decimals, currentRound: uint(lifecycle.currentRound), processedRound: uint(mining.processedThroughRound),
    paused: lifecycle.paused, stage: text(lifecycle.stage),
    mined: uint(supply.miningMintedBaseUnits), totalMinted: uint(supply.totalMintedBaseUnits),
    cap: uint(supply.capBaseUnits), remaining: uint(supply.unmintedCapacityBaseUnits),
    nftLive: uint(nft.live), nftIssued: uint(nft.issued), nftBurned: uint(nft.burned), contracts,
  };
  if (BigInt(result.cap) === 0n || BigInt(result.totalMinted) > BigInt(result.cap) ||
      BigInt(result.mined) > BigInt(result.totalMinted) ||
      BigInt(result.totalMinted) + BigInt(result.remaining) !== BigInt(result.cap) ||
      BigInt(result.nftLive) + BigInt(result.nftBurned) !== BigInt(result.nftIssued)) throw invalid();
  return result;
}

export function formatInteger(value: string): string {
  return BigInt(value).toLocaleString('en-US');
}

/** Integer arithmetic throughout: token quantities can exceed Number.MAX_SAFE_INTEGER. */
export function formatTokens(value: string, decimals: number, fractionDigits = 0): string {
  const amount = BigInt(value);
  const scale = 10n ** BigInt(decimals);
  const whole = (amount / scale).toLocaleString('en-US');
  if (!fractionDigits) return whole;
  const fraction = (amount % scale).toString().padStart(decimals, '0').slice(0, fractionDigits);
  return fraction ? `${whole}.${fraction}` : whole;
}

export function supplyPercent(total: string, cap: string): number {
  return Number(BigInt(total) * 10_000n / BigInt(cap)) / 100;
}

export function retryAfterAt(value: string | null, now = Date.now()): number {
  if (!value) return 0;
  const seconds = /^\d+$/.test(value) ? Number(value) : null;
  const time = seconds === null ? Date.parse(value) : now + seconds * 1000;
  return Number.isFinite(time) && time > now ? time : 0;
}

export async function fetchEconomy(signal: AbortSignal): Promise<Economy> {
  let response: Response;
  try {
    response = await fetch(API_URL, { signal, mode: 'cors', cache: 'no-cache', credentials: 'omit', headers: { Accept: 'application/json' } });
  } catch (error) {
    if (signal.aborted) throw new EconomyError('The API took too long to respond. Try refreshing.');
    throw new EconomyError('Could not reach the Squeekchain API. Check your connection and try refreshing.');
  }
  if (!response.ok) {
    const retryAt = retryAfterAt(response.headers.get('Retry-After'));
    throw new EconomyError(response.status === 429
      ? 'The API has asked us to slow down. Refresh will be available after its retry period.'
      : `The API returned HTTP ${response.status}. Try refreshing in a moment.`, retryAt);
  }
  try {
    return parseEconomy(await response.json());
  } catch (error) {
    if (error instanceof EconomyError) throw error;
    throw invalid();
  }
}
