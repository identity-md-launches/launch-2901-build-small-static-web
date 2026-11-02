import { useState } from 'react';
import { API_URL, formatInteger, formatTokens, supplyPercent } from './economy';
import type { ContractIdentity, Economy } from './economy';
import { useEconomy } from './useEconomy';
import { HamsterMark, Icon, WheelIllustration } from './components/Icon';

function timeLabel(value: string | number) {
  return new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC';
}

function fullDate(value: string | number) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' }) + ' UTC';
}

function ExternalLink({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return <a href={href} className={`external-link ${className}`} target="_blank" rel="noopener noreferrer">{children}<Icon name="arrow"/><span className="sr-only"> (opens in a new tab)</span></a>;
}

function Value({ children, loading, className = '' }: { children: React.ReactNode; loading: boolean; className?: string }) {
  return <div className={`metric-value ${className} ${loading ? 'is-loading' : ''}`}>{children ?? <span className="unknown">{loading ? 'Loading…' : 'Unavailable'}</span>}</div>;
}

function Metrics({ data, loading }: { data: Economy | null; loading: boolean }) {
  return <section className="metrics" aria-label="Economy overview" aria-busy={loading}>
    <article className="metric metric-round">
      <div className="round-content">
        <h2>Current mining round</h2>
        <Value loading={loading}>{data && formatInteger(data.currentRound)}</Value>
        <p className="metric-foot">{data ? <><span className={`state-dot ${data.paused ? 'dot-paused' : ''}`}/>{data.paused ? 'Mining paused' : data.stage === 'active' ? 'Mining active' : `Stage: ${data.stage}`}</> : 'Confirmed on Sepolia'}</p>
      </div>
      <WheelIllustration/>
    </article>
    <article className="metric metric-mined">
      <div className="metric-label"><h2>Total SQK mined</h2><Icon name="token"/></div>
      <Value loading={loading}>{data && formatTokens(data.mined, data.decimals)}</Value>
      <p className="metric-foot">SQK · whole tokens</p>
      <a className="metric-detail" href="#supply">View supply breakdown <Icon name="arrow"/></a>
    </article>
    <article className="metric metric-nft">
      <div className="metric-label"><h2>Live Squeeks</h2><Icon name="nft"/></div>
      <Value loading={loading}>{data && formatInteger(data.nftLive)}</Value>
      <p className="metric-foot">NFTs currently in existence</p>
      <span className="metric-detail muted">{data ? `${formatInteger(data.nftBurned)} burned in total` : 'Issued NFTs minus burned NFTs'}</span>
    </article>
  </section>;
}

function Supply({ data }: { data: Economy | null }) {
  const percentage = data ? supplyPercent(data.totalMinted, data.cap) : null;
  return <section className="supply-panel" id="supply" aria-labelledby="supply-heading">
    <div className="section-heading"><h2 id="supply-heading">SQK supply</h2><Icon name="token"/></div>
    <p className="section-description">SQK issued so far, against its lifetime cap.</p>
    <div className="supply-summary"><span className="supply-percentage">{percentage === null ? 'Unavailable' : `${percentage.toFixed(2)}%`}</span><span className="muted">of the cap minted</span></div>
    <div className="supply-track" role={percentage === null ? undefined : 'meter'} aria-label={percentage === null ? undefined : 'SQK lifetime cap minted'} aria-valuemin={percentage === null ? undefined : 0} aria-valuemax={percentage === null ? undefined : 100} aria-valuenow={percentage ?? undefined} aria-valuetext={percentage === null ? undefined : `${percentage.toFixed(2)} percent minted`}><div style={{ width: `${percentage ?? 0}%` }}/></div>
    <div className="supply-legend"><span><i className="legend-mark issued"/>Minted</span><span><i className="legend-mark"/>Not yet minted</span></div>
    <dl className="supply-values">
      <div><dt>Total minted</dt><dd>{data ? formatTokens(data.totalMinted, data.decimals) : 'Unavailable'} <span>SQK</span></dd></div>
      <div><dt>Lifetime cap</dt><dd>{data ? formatTokens(data.cap, data.decimals) : 'Unavailable'} <span>SQK</span></dd></div>
    </dl>
    <details className="exact-details">
      <summary>View exact amounts <Icon name="chevron"/></summary>
      {data ? <dl className="exact-values">
        <div><dt>Mined SQK</dt><dd>{formatTokens(data.mined, data.decimals, data.decimals)}</dd></div>
        <div><dt>Total minted SQK</dt><dd>{formatTokens(data.totalMinted, data.decimals, data.decimals)}</dd></div>
        <div><dt>Unminted capacity in SQK</dt><dd>{formatTokens(data.remaining, data.decimals, data.decimals)}</dd></div>
      </dl> : <p className="muted">Amounts will appear after a successful refresh.</p>}
    </details>
  </section>;
}

function NewcomerGuide() {
  return <section className="guide-panel" id="how-it-works" aria-labelledby="guide-heading">
    <div className="section-heading"><h2 id="guide-heading">How Squeekchain works</h2><Icon name="info"/></div>
    <p className="section-description">A hamster powers the work. Ethereum keeps the record.</p>
    <ol className="guide-steps">
      <li><span className="step-number">1</span><div><h3>The wheel turns</h3><p>A sensor records the hamster’s wheel activity. Measurements are grouped into rounds.</p></div></li>
      <li><span className="step-number">2</span><div><h3>Work becomes SQK</h3><p>Accepted work is recorded on Ethereum. Completed Squeek blocks lead to new SQK tokens.</p></div></li>
      <li><span className="step-number">3</span><div><h3>Squeeks share the rewards</h3><p>Squeeks are NFTs with power that determines their share under the reward rules.</p></div></li>
    </ol>
    <ExternalLink href="https://docs.squeekchain.com/start/overview/" className="guide-link">Read the Squeekchain guide</ExternalLink>
  </section>;
}

function Contracts({ data }: { data: Economy | null }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState('Copy an address or open it on Sepolia Etherscan.');
  async function copyContract(contract: ContractIdentity) {
    if (!contract.address) return;
    try {
      await navigator.clipboard.writeText(contract.address);
      setCopied(contract.name);
      setCopyMessage(`${contract.name} address copied.`);
    } catch {
      setCopied(null);
      setCopyMessage('Copy was unavailable. Select the full address and copy it using your browser.');
    }
  }
  function row(contract: ContractIdentity) {
    return <div className="contract-row" key={contract.name}>
      <div className="contract-name"><h3>{contract.name}</h3><p>{contract.role}</p></div>
      {contract.address ? <>
        <a href={`https://sepolia.etherscan.io/address/${contract.address}`} className="contract-address" target="_blank" rel="noopener noreferrer" aria-label={`View ${contract.name} at ${contract.address} on Sepolia Etherscan (opens in a new tab)`}><code>{contract.address}</code><Icon name="arrow"/></a>
        <button className="copy-button" type="button" onClick={() => void copyContract(contract)} aria-label={`${copied === contract.name ? 'Copied' : 'Copy'} ${contract.name} address`}><Icon name={copied === contract.name ? 'check' : 'copy'}/><span>{copied === contract.name ? 'Copied' : 'Copy'}</span></button>
      </> : <p className="contract-unbound">Not bound in this deployment</p>}
    </div>;
  }
  return <section className="contracts-section" id="contracts" aria-labelledby="contracts-heading">
    <div className="contracts-intro"><div><h2 id="contracts-heading">Follow the contracts</h2><p className="section-description">The addresses behind this snapshot. All on Sepolia.</p></div><span className="network-label"><span className="network-diamond"/>Ethereum Sepolia</span></div>
    <div className="contract-list">
      {data ? data.contracts.filter(c => !c.additional).map(row) : <p className="contracts-unavailable">Contract addresses will appear when the API is available. Refresh to try again.</p>}
    </div>
    {data && data.contracts.some(c => c.additional) && <details className="additional-contracts"><summary>View supporting contracts <Icon name="chevron"/></summary><div className="contract-list">{data.contracts.filter(c => c.additional).map(row)}</div></details>}
    <p className="copy-status" role="status">{copyMessage}</p>
  </section>;
}

function Snapshot({ data, checkedAt }: { data: Economy | null; checkedAt: number | null }) {
  return <details className="snapshot-details">
    <summary><span><Icon name="blocks"/>About this snapshot</span><Icon name="chevron"/></summary>
    <p>This is an indexed view, not the chain tip. {data ? `The API waits ${formatInteger(data.confirmations)} Ethereum confirmations before including chain data.` : 'The API includes chain data after a confirmation delay.'} Refreshing checks for a newer snapshot.</p>
    <dl className="snapshot-values">
      <div><dt>Confirmed through block</dt><dd>{data ? <ExternalLink href={`https://sepolia.etherscan.io/block/${data.safeBlock}`}>{formatInteger(data.safeBlock)}</ExternalLink> : 'Unavailable'}</dd></div>
      <div><dt>Block time</dt><dd>{data ? fullDate(data.safeAt) : 'Unavailable'}</dd></div>
      <div><dt>API generated</dt><dd>{data ? fullDate(data.generatedAt) : 'Unavailable'}</dd></div>
      <div><dt>Last successful check</dt><dd>{checkedAt ? fullDate(checkedAt) : 'Not yet checked successfully'}</dd></div>
      <div><dt>Mining processed through round</dt><dd>{data ? formatInteger(data.processedRound) : 'Unavailable'}</dd></div>
      <div><dt>Release</dt><dd><code>{data ? data.release : 'Unavailable'}</code></dd></div>
    </dl>
    <ExternalLink href="https://docs.squeekchain.com/developers/api/#economy-state--get-v1economystate">Read the API reference</ExternalLink>
  </details>;
}

export function App() {
  const { data, loading, error, autoRefresh, setAutoRefresh, checkedAt, stale, refresh, retrySeconds } = useEconomy();
  const status = loading ? 'Checking the API…' : error ? (data ? 'Last known snapshot' : 'API unavailable') : stale ? 'Snapshot delayed' : 'API connected';
  return <>
    <a className="skip-link" href="#main">Skip to dashboard</a>
    <header className="site-header"><div className="header-inner">
      <a className="brand" href="#" aria-label="Squeekchain dashboard home"><HamsterMark/><span>squeekchain<span className="brand-period">.</span></span></a>
      <nav className="main-nav" aria-label="Main navigation"><a href="#main" className="nav-active">Overview</a><a href="#how-it-works">How it works</a><a href="#contracts">Contracts</a></nav>
      <span className="testnet-tag"><span className="network-diamond"/>Sepolia testnet</span>
    </div></header>

    <main id="main" className="page" tabIndex={-1}>
      <div className="page-intro">
        <div><h1>The wheel, in numbers.</h1><p>A public window into Squeekchain’s hamster-powered economy.</p></div>
        <div className="refresh-controls">
          <button type="button" className="primary-button" onClick={() => void refresh()} disabled={loading || retrySeconds > 0}><Icon name="refresh" className={loading ? 'refreshing' : ''}/><span>{loading ? 'Refreshing…' : retrySeconds > 0 ? `Wait ${retrySeconds}s` : 'Refresh now'}</span></button>
          <label className="auto-refresh"><input type="checkbox" checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)}/><span>Auto refresh <span className="muted">· 30s</span></span></label>
        </div>
      </div>

      <div className="data-status"><span className={`connection-status ${error || stale ? 'status-warning' : ''}`} role="status"><span className="state-dot"/>{status}</span><span className="last-checked">{checkedAt ? <>Checked <time dateTime={new Date(checkedAt).toISOString()} title={fullDate(checkedAt)}>{timeLabel(checkedAt)}</time></> : 'Reading the public API'}</span><ExternalLink href={API_URL} className="source-link">View source</ExternalLink></div>

      {error && <div className="notice error-notice" role="alert"><Icon name="info"/><div><strong>{data ? 'Refresh failed.' : 'Data could not be loaded.'}</strong> {error}{data && <span> Values below are from the last successful snapshot, generated {fullDate(data.generatedAt)}.</span>}</div></div>}
      {!error && stale && data && <div className="notice" role="status"><Icon name="info"/><div><strong>This snapshot may be delayed.</strong> Its confirmed block is from {fullDate(data.safeAt)}. Refresh to check for newer data.</div></div>}

      <Metrics data={data} loading={loading && !data}/>
      <div className="read-only-note"><Icon name="shield"/><span>Just looking? You’re in the right place. This dashboard is read-only.</span><span className="note-tail">No wallet needed.</span></div>

      <div className="detail-grid"><Supply data={data}/><NewcomerGuide/></div>
      <Contracts data={data}/>
      <Snapshot data={data} checkedAt={checkedAt}/>
      <aside className="testnet-note"><Icon name="info"/><p><strong>A test network, a work in progress.</strong> Sepolia is Ethereum’s testing network. These figures describe a test deployment, not a mainnet token launch or a promise of value.</p></aside>
    </main>

    <footer className="site-footer"><div><span className="footer-brand">squeekchain.</span><span>A small wheel. An open record.</span></div><div><ExternalLink href="https://docs.squeekchain.com/">Squeekchain docs</ExternalLink><ExternalLink href={API_URL}>Public API</ExternalLink></div></footer>
  </>;
}
