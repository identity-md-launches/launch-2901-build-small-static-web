import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formatInteger, formatTokens, parseEconomy, retryAfterAt, supplyPercent } from '../src/economy.ts';

// A recorded public API response; altered copies below are test inputs, never production data.
const fixture = JSON.parse(await readFile(new URL('./fixtures/economy.json', import.meta.url), 'utf8'));
const copy = () => structuredClone(fixture);

test('maps the actual schema and uses mining issuance rather than total minted', () => {
  const state = parseEconomy(fixture);
  assert.equal(state.currentRound, fixture.lifecycle.currentRound);
  assert.equal(state.mined, fixture.supply.miningMintedBaseUnits);
  assert.equal(state.nftLive, fixture.nft.live);
  assert.equal(state.contracts.find(c => c.name === 'SqueekToken')?.address, fixture.identities.token);
  assert.equal(state.contracts.find(c => c.name === 'SqueekMining')?.address, fixture.identities.mining.proxy);
});
test('keeps all 18 decimal places without a floating-point conversion', () => {
  assert.equal(formatTokens('28935304258689777280764915', 18, 18), '28,935,304.258689777280764915');
  assert.equal(formatTokens('1', 18, 18), '0.000000000000000001');
  assert.equal(formatTokens('999999999999999999999999999', 18), '999,999,999');
  assert.equal(formatInteger('9007199254740993'), '9,007,199,254,740,993');
  assert.equal(supplyPercent('28935304258689777280764916', '2100000000000000000000000000'), 1.37);
});
test('rejects unavailable, unsupported and different-network responses', () => {
  assert.throws(() => parseEconomy({ schemaVersion: 2, status: 'unavailable', reason: 'indexer_unavailable' }), /unavailable/);
  const version = copy(); version.schemaVersion = 3;
  assert.throws(() => parseEconomy(version), /version/);
  const chain = copy(); chain.chain.chainId = '1';
  assert.throws(() => parseEconomy(chain), /different network/);
});
test('rejects missing, unsafe or inconsistent data instead of displaying zero', () => {
  const missing = copy(); delete missing.nft.live;
  assert.throws(() => parseEconomy(missing), /incomplete/);
  const invalid = copy(); invalid.supply.miningMintedBaseUnits = 28_935_304;
  assert.throws(() => parseEconomy(invalid), /incomplete/);
  const nft = copy(); nft.nft.live = '1';
  assert.throws(() => parseEconomy(nft), /incomplete/);
  const address = copy(); address.identities.token = 'https://example.com';
  assert.throws(() => parseEconomy(address), /incomplete/);
  const cap = copy(); cap.supply.capBaseUnits = '0';
  assert.throws(() => parseEconomy(cap), /incomplete/);
});
test('accepts genuine zero counts and an unbound staking contract', () => {
  const zero = copy(); zero.nft.live = '0'; zero.nft.burned = zero.nft.issued; zero.identities.staking = null;
  const state = parseEconomy(zero);
  assert.equal(state.nftLive, '0');
  assert.equal(state.contracts.find(c => c.name === 'SqueekStaking')?.address, null);
});
test('ignores additive schema fields and accepts string proxy identities', () => {
  const additive = copy(); additive.futureField = { ignored: true }; additive.identities.mining = fixture.identities.mining.proxy;
  assert.equal(parseEconomy(additive).contracts.find(c => c.name === 'SqueekMining')?.address, fixture.identities.mining.proxy);
});
test('honors Retry-After seconds and date formats', () => {
  const now = Date.parse('2026-11-03T00:00:00Z');
  assert.equal(retryAfterAt('30', now), now + 30_000);
  assert.equal(retryAfterAt('Tue, 03 Nov 2026 00:00:05 GMT', now), now + 5000);
  assert.equal(retryAfterAt('invalid', now), 0);
  assert.equal(retryAfterAt(null, now), 0);
});
