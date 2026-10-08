import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Ethereum, Icon, Mark, type IconName } from './Icon';
import { initialPools, matchesRule, poolsToCsv, readSettings, samplePool, storageKey, type Pool, type PoolAlert, type Settings } from './model';

type ModalKind = 'rule' | 'help' | Pool | null;
type Filter = 'all' | 'matches' | 'excluded';
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const timestamp = (value: number) => new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
function age(value: number, now: number) { const minutes = Math.max(0, Math.floor((now - value) / 60000)); return minutes === 0 ? 'Just now' : `${minutes}m ago`; }
function Token({ symbol }: { symbol: string }) { return <span className={`token token-${symbol.toLowerCase()}`} aria-hidden="true">{symbol === 'WETH' || symbol === 'ETH' ? <Ethereum /> : symbol === 'USDC' ? '$' : symbol === 'WBTC' ? 'B' : symbol[0]}</span>; }
function Pair({ pool }: { pool: Pool }) { return <div className="pair"><span className="token-pair"><Token symbol={pool.token0}/><Token symbol={pool.token1}/></span><span><strong>{pool.token0}<span className="pair-slash"> / </span>{pool.token1}</strong><span className="pair-sub">{pool.fee} fee tier</span></span></div>; }
function Button({ children, icon, onClick, primary = false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: IconName; primary?: boolean }) { return <button {...props} type={props.type || 'button'} className={`button ${primary ? 'button-primary' : ''} ${props.className || ''}`} onClick={onClick}>{icon && <Icon name={icon}/>} {children}</button>; }
function Dialog({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; const previousFocus = document.activeElement as HTMLElement | null; d?.showModal(); return () => { d?.close(); if (previousFocus?.isConnected) previousFocus.focus(); }; }, []);
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}><div className="dialog-heading"><h2 id="dialog-title">{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><Icon name="close"/></button></div>{children}</dialog>;
}
function RuleEditor({ settings, onSave, onClose }: { settings: Settings; onSave: (value: Settings) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(settings);
  return <form onSubmit={e => { e.preventDefault(); onSave(draft); }}>
    <p className="dialog-intro">Choose which new sample pools send an alert to your inbox. Changes apply to future events.</p>
    <label className="switch-row"><span><strong>Enable pool alerts</strong><small>Deliver matching events to the in-page inbox.</small></span><input type="checkbox" role="switch" checked={draft.enabled} onChange={e => setDraft({ ...draft, enabled: e.target.checked })}/></label>
    <fieldset><legend>Token matching</legend>
      <label className={`radio-card ${draft.mode === 'either' ? 'selected' : ''}`}><input type="radio" name="mode" value="either" checked={draft.mode === 'either'} onChange={() => setDraft({ ...draft, mode: 'either' })}/><span><strong>At least one token is not ETH or WETH</strong><small>USDC / WETH and DAI / USDC both qualify.</small><span className="recommended">Community request</span></span></label>
      <label className={`radio-card ${draft.mode === 'both' ? 'selected' : ''}`}><input type="radio" name="mode" value="both" checked={draft.mode === 'both'} onChange={() => setDraft({ ...draft, mode: 'both' })}/><span><strong>Both tokens are not ETH or WETH</strong><small>DAI / USDC qualifies. USDC / WETH does not.</small></span></label>
    </fieldset>
    <label className="field-label" htmlFor="rule-type">Pool type</label><select id="rule-type" value={draft.poolType} onChange={e => setDraft({ ...draft, poolType: e.target.value as Settings['poolType'] })}><option>All types</option><option>Concentrated</option><option>Constant product</option></select>
    <p className="field-hint"><Icon name="shield" size={15}/> Preferences stay in this browser when storage is available.</p>
    <div className="dialog-actions"><Button onClick={onClose}>Cancel</Button><Button primary type="submit" icon="check">Save rule</Button></div>
  </form>;
}
export default function App() {
  const [saved] = useState(readSettings);
  const [settings, setSettings] = useState<Settings>(saved.settings);
  const [storageUnavailable, setStorageUnavailable] = useState(saved.unavailable);
  const [pools, setPools] = useState<Pool[]>(initialPools);
  const [alerts, setAlerts] = useState<PoolAlert[]>([]);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [poolType, setPoolType] = useState('All types');
  const [visibleCount, setVisibleCount] = useState(6);
  const [modal, setModal] = useState<ModalKind>(null);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now);
  const [activeNav, setActiveNav] = useState('overview');
  const sequence = useRef(8);
  const testSequence = useRef(0);
  const matches = pools.filter(p => matchesRule(p, settings));
  const unread = alerts.filter(a => !a.read).length;
  const filtered = pools.filter(p => {
    const match = matchesRule(p, settings);
    return (filter === 'all' || (filter === 'matches' ? match : !match)) &&
      (poolType === 'All types' || p.type === poolType) &&
      `${p.token0} ${p.token1} ${p.token0}/${p.token1}`.toLowerCase().includes(query.trim().toLowerCase().replace(/\s*\/\s*/g, '/'));
  });
  const addSample = useCallback(() => {
    const pool = samplePool(sequence.current++);
    setPools(previous => [pool, ...previous].slice(0, 100));
    setNow(Date.now());
    if (settings.enabled && matchesRule(pool, settings)) {
      setAlerts(previous => [{ id: pool.id, pair: `${pool.token0} / ${pool.token1}`, createdAt: pool.createdAt, read: false, test: false }, ...previous].slice(0, 100));
      setNotice(`New sample match: ${pool.token0} / ${pool.token1}. Alert added to your inbox.`);
    } else { setNotice(`Sample pool added: ${pool.token0} / ${pool.token1}. ${settings.enabled ? 'Excluded by your rule.' : 'Alerts are disabled.'}`); }
  }, [settings]);
  useEffect(() => { if (!running) return; const timer = window.setInterval(addSample, 6000); return () => window.clearInterval(timer); }, [running, addSample]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  function saveRule(next: Settings) {
    setSettings(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageUnavailable(false); } catch { setStorageUnavailable(true); }
    setModal(null);
    setNotice('Alert rule saved. It applies to new sample events.');
  }
  function testAlert() {
    const testNumber = ++testSequence.current;
    const alert: PoolAlert = { id: `test-${testNumber}`, pair: 'Test notification', createdAt: Date.now(), read: false, test: true };
    setAlerts(previous => [alert, ...previous].slice(0, 100));
    setNotice(`Test alert ${testSequence.current} delivered to your inbox. This checks delivery independently of your rule.`);
  }
  function exportCsv() {
    const url = URL.createObjectURL(new Blob([poolsToCsv(filtered, settings)], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'poolwatch-sample-pools.csv'; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} sample ${filtered.length === 1 ? 'pool' : 'pools'} as CSV.`);
  }
  const ruleSummary = settings.mode === 'either' ? 'At least one token other than ETH or WETH' : 'Both tokens other than ETH or WETH';
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar" aria-label="Workspace navigation">
      <a href="#overview" className="brand" onClick={() => setActiveNav('overview')}><span className="brand-mark"><Mark/></span>poolwatch<span className="brand-period">.</span></a>
      <div className="workspace-label">Workspace</div>
      <nav aria-label="Main navigation">
        <a href="#overview" className={`nav-item ${activeNav === 'overview' ? 'nav-active' : ''}`} aria-current={activeNav === 'overview' ? 'location' : undefined} onClick={() => setActiveNav('overview')}><Icon name="grid"/>Overview</a>
        <a href="#alert-inbox" className={`nav-item ${activeNav === 'inbox' ? 'nav-active' : ''}`} aria-current={activeNav === 'inbox' ? 'location' : undefined} onClick={() => setActiveNav('inbox')}><Icon name="bell"/>Alert inbox<span className="nav-count">{unread}</span></a>
        <button type="button" className="nav-item" onClick={() => setModal('rule')}><Icon name="sliders"/>Alert rule</button>
      </nav>
      <div className="sidebar-bottom"><div className="local-note"><span className="local-note-icon"><Icon name="shield"/></span><strong>Private by design</strong><p>No wallet. No tracking.<br/>Everything stays here.</p></div><button type="button" className="nav-item help-button" onClick={() => setModal('help')}><Icon name="info"/>How it works<Icon name="arrow" size={16}/></button><div className="sidebar-foot">A little signal. Less noise.</div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><span className="breadcrumb">Workspace <Icon name="chevron" size={13}/><strong>Overview</strong></span><div className="network"><Ethereum/><span>Ethereum <span className="network-mainnet">mainnet</span></span><span className="network-dot"/></div></header>
      <main id="main">
        <section className="page-heading" id="overview"><div><div className="eyebrow">See the pair. Catch the signal.</div><h1>New pool monitor<span className="heading-dot">.</span></h1><p>Keep an eye on new pools. Find the pairs that matter.</p></div><Button primary icon={running ? 'pause' : 'play'} onClick={() => { if (!running) addSample(); setRunning(!running); if (running) setNotice('Demo feed paused. Your pools and alerts are still here.'); }}>{running ? 'Pause demo feed' : 'Start demo feed'}</Button></section>
        <div className="demo-banner"><span className="demo-label"><Icon name="info" size={16}/>Demo workspace</span><span>Illustrative sample events. No live Ethereum connection or external alerts.</span><button type="button" onClick={() => setModal('help')} aria-label="Read about demo workspace limitations"><Icon name="arrow" size={18}/></button></div>
        <section className="stats" aria-label="Session overview">
          <div className="stat-card"><div className="stat-label">Pools observed<span className="stat-icon"><Icon name="layers"/></span></div><div className="stat-value">{String(pools.length).padStart(2, '0')}<span className="mini-bars" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span></div><p>Sample pools in this session</p></div>
          <div className="stat-card"><div className="stat-label">Matching your rule<span className="stat-icon"><Icon name="sliders"/></span></div><div className="stat-value">{String(matches.length).padStart(2, '0')}<span className="stat-tag">{Math.round(matches.length / pools.length * 100)}% of pools</span></div><p>Based on your current token rule</p></div>
          <div className="stat-card"><div className="stat-label">Alerts delivered<span className="stat-icon"><Icon name="bell"/></span></div><div className="stat-value">{String(alerts.length).padStart(2, '0')}<span className="unread-label"><span className={unread > 0 ? 'status-dot' : 'status-dot muted-dot'}/>{unread} unread</span></div><p>In-page notifications, including tests</p></div>
        </section>
        <div className="dashboard-grid">
          <section className="panel pool-panel" aria-labelledby="pools-heading">
            <div className="panel-header"><div><h2 id="pools-heading">Pool feed <span className="count-badge">{pools.length}</span></h2><p>New pairs, in order of arrival.</p></div><span className={`feed-state ${running ? 'feed-running' : ''}`}><span className="status-dot"/>{running ? 'Demo running' : 'Demo paused'}</span></div>
            <div className="filter-tabs" role="group" aria-label="Filter by rule result">{([['all', 'All pools', pools.length], ['matches', 'Matches', matches.length], ['excluded', 'Excluded', pools.length - matches.length]] as const).map(([value, label, count]) => <button type="button" key={value} aria-pressed={filter === value} className={filter === value ? 'filter-active' : ''} onClick={() => { setFilter(value); setVisibleCount(6); }}>{label}<span>{count}</span></button>)}</div>
            <div className="feed-tools"><div className="search-field"><label htmlFor="pool-search" className="sr-only">Search token pairs</label><Icon name="search" size={17}/><input id="pool-search" type="search" placeholder="Search token pairs…" value={query} onChange={e => { setQuery(e.target.value); setVisibleCount(6); }}/></div><div className="type-filter"><label htmlFor="pool-type" className="sr-only">Filter pool type</label><select id="pool-type" value={poolType} onChange={e => { setPoolType(e.target.value); setVisibleCount(6); }}><option>All types</option><option>Concentrated</option><option>Constant product</option></select></div></div>
            <div className="pool-table" role="table" aria-label="Sample liquidity pools"><div className="pool-table-head" role="row"><span role="columnheader">Token pair</span><span role="columnheader">Pool type</span><span role="columnheader">Sample liquidity</span><span role="columnheader">Created</span><span className="sr-only" role="columnheader">Details</span></div><div role="rowgroup">
              {filtered.slice(0, visibleCount).map(pool => <div className="pool-row" role="row" key={pool.id}><div role="cell" className="pair-cell"><Pair pool={pool}/><span className={`match-badge ${matchesRule(pool, settings) ? '' : 'excluded'}`}><Icon name={matchesRule(pool, settings) ? 'check' : 'close'} size={11}/>{matchesRule(pool, settings) ? 'Match' : 'Excluded'}</span></div><div role="cell" className="pool-type-cell"><span className="mobile-label">Type</span>{pool.type}</div><div role="cell" className="liquidity-cell"><span className="mobile-label">Sample liquidity</span>{currency.format(pool.liquidity)}</div><div role="cell" className="time-cell"><span className="mobile-label">Created</span><time dateTime={new Date(pool.createdAt).toISOString()}>{age(pool.createdAt, now)}</time></div><div role="cell" className="row-action"><button type="button" className="icon-button" aria-label={`View ${pool.token0} / ${pool.token1} ${pool.id} details`} onClick={() => setModal(pool)}><Icon name="chevron" size={17}/></button></div></div>)}
            </div></div>
            {filtered.length === 0 && <div className="empty-state"><span className="empty-icon"><Icon name="search" size={24}/></span><h3>No pools found</h3><p>No sample pools match {query ? `“${query}” and these filters` : 'these filters'}.</p><Button onClick={() => { setQuery(''); setFilter('all'); setPoolType('All types'); }}>Clear filters</Button></div>}
            <div className="feed-footer"><span role="status">Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} pools</span>{visibleCount < filtered.length && <button type="button" className="text-button" onClick={() => setVisibleCount(v => v + 10)}>Show more<Icon name="plus" size={14}/></button>}<button type="button" className="text-button export-button" onClick={exportCsv} disabled={!filtered.length}><Icon name="download" size={15}/>Export CSV</button></div>
          </section>
          <section className="panel inbox-panel" id="alert-inbox" aria-labelledby="inbox-heading"><div className="panel-header"><div><h2 id="inbox-heading">Alert inbox <span className="count-badge">{unread}</span></h2><p>Every matching event has a place.</p></div><div className="inbox-actions"><button type="button" className="text-button" onClick={testAlert}><Icon name="bell" size={15}/>Send test alert</button>{unread > 0 && <button type="button" className="text-button" onClick={() => { setAlerts(current => current.map(a => ({ ...a, read: true }))); setNotice('All alerts marked as read.'); }}><Icon name="check" size={15}/>Mark all read</button>}</div></div>
            {alerts.length ? <ul className="alert-list">{alerts.slice(0, 8).map(alert => <li className={alert.read ? 'read-alert' : ''} key={alert.id}><span className="alert-symbol"><Icon name={alert.test ? 'bell' : 'check'} size={18}/></span><div className="alert-copy"><strong>{alert.pair}<span className="alert-kind">{alert.test ? 'Delivery test' : 'Sample match'}</span></strong><p>{alert.test ? 'Your in-page inbox is ready. No external notification was sent.' : 'This sample pool matched your rule when it arrived.'}</p><time dateTime={new Date(alert.createdAt).toISOString()}>{timestamp(alert.createdAt)}</time></div>{alert.read ? <span className="read-label">Read</span> : <button type="button" className="icon-button" aria-label={`Mark ${alert.pair} ${alert.id} as read`} onClick={() => setAlerts(current => current.map(a => a.id === alert.id ? { ...a, read: true } : a))}><Icon name="check" size={17}/></button>}</li>)}</ul> : <div className="inbox-empty"><span className="empty-icon"><Icon name="bell" size={25}/></span><div><h3>Your next match lands here</h3><p>Start the demo feed, or send a test alert to try it out.</p></div><span className="inbox-empty-line" aria-hidden="true"/></div>}
            {alerts.length > 8 && <p className="inbox-limit">Showing the latest 8 of {alerts.length} session alerts. “Mark all read” also clears older unread alerts.</p>}
          </section>
          <aside className="details-column" aria-label="Alert configuration">
            <section className="panel rule-panel"><div className="rule-top"><span className="square-icon"><Icon name="sliders" size={20}/></span><span className={`rule-state ${!settings.enabled ? 'rule-disabled' : ''}`}><span className="status-dot"/>{settings.enabled ? 'Enabled' : 'Disabled'}</span></div><h2>Your alert rule</h2><p className="rule-description">A new pool. A different token.<br/>A signal worth seeing.</p><div className="rule-definition"><span className="overline">Notify me when</span><strong>{ruleSummary}</strong><div className="excluded-tokens"><span><Ethereum/>ETH</span><span><Ethereum/>WETH</span><span className="excluded-note">excluded tokens</span></div></div><dl className="rule-meta"><div><dt>Network</dt><dd>Ethereum mainnet</dd></div><div><dt>Pool types</dt><dd>{settings.poolType}</dd></div><div><dt>Delivery</dt><dd>In-page inbox</dd></div></dl><Button icon="sliders" onClick={() => setModal('rule')}>Edit alert rule</Button><p className="local-caption"><Icon name="shield" size={13}/> {storageUnavailable ? 'Saved for this session only' : 'Preferences saved in this browser'}</p></section>
            <section className="signal-card"><div className="signal-illustration" aria-hidden="true"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><span className="orbit orbit-three"/><span className="signal-core"><Icon name="bell" size={27}/></span><span className="signal-token token-a">$</span><span className="signal-token token-b"><Ethereum/></span><span className="signal-spark">+</span></div><h2>Less watching.<br/>More knowing.</h2><p>Try the demo feed and see your rule turn new pools into useful alerts.</p><button type="button" className="signal-link" onClick={addSample}>Add a sample pool<Icon name="arrow" size={17}/></button></section>
          </aside>
        </div>
        <footer className="page-footer"><span><span className="status-dot muted-dot"/>Local workspace · Sample data only</span><span>Latest 100 pools and alerts · Resets on reload</span></footer>
      </main>
    </div>
    <div className={`toast ${notice ? 'toast-visible' : ''}`}><span className="toast-icon" aria-hidden="true"><Icon name="check" size={18}/></span><p role="status" aria-live="polite" aria-atomic="true">{notice}</p>{notice && <button type="button" className="icon-button" onClick={() => setNotice('')} aria-label="Dismiss notification"><Icon name="close" size={17}/></button>}</div>
    {modal && <Dialog title={modal === 'rule' ? 'Edit alert rule' : modal === 'help' ? 'A local window into new pools' : `${modal.token0} / ${modal.token1}`} onClose={() => setModal(null)}>{modal === 'rule' ? <RuleEditor settings={settings} onSave={saveRule} onClose={() => setModal(null)}/> : modal === 'help' ? <div className="help-content"><span className="demo-pill">Offline demo</span><p>Poolwatch demonstrates a new liquidity pool alert workflow for Ethereum mainnet. Every event, timestamp and liquidity value shown here is illustrative.</p><ol><li><strong>Choose your token rule.</strong><p>The default matches any pair containing at least one token other than ETH or WETH. ETH / WETH is excluded.</p></li><li><strong>Start the demo feed.</strong><p>A sample event arrives immediately, then every six seconds until you pause. You can also add one sample at a time.</p></li><li><strong>See matches in your inbox.</strong><p>Alerts appear in this page while it is open. Test alerts bypass the rule to check delivery. Rule edits only affect future alerts.</p></li></ol><div className="help-limit"><Icon name="info"/><p>There is no live chain connection, background monitoring, email, push notification or transaction support. This static module makes no external requests.</p></div><p>Rules can be stored locally; events and alerts reset on reload. In an iframe that blocks storage, rules last only for the current session. The latest 100 pools and 100 alerts are retained during a session.</p><Button onClick={() => setModal(null)}>Got it</Button></div> : <div className="pool-detail"><span className="demo-pill">Illustrative sample</span><Pair pool={modal}/><dl><div><dt>Rule result</dt><dd>{matchesRule(modal, settings) ? 'Matches your current rule' : 'Excluded by your current rule'}</dd></div><div><dt>Why</dt><dd>{ruleSummary}. {settings.poolType === 'All types' ? 'All pool types included.' : `Only ${settings.poolType.toLowerCase()} pools included.`}</dd></div><div><dt>Pool type</dt><dd>{modal.type}</dd></div><div><dt>Fee tier</dt><dd>{modal.fee}</dd></div><div><dt>Sample liquidity</dt><dd>{currency.format(modal.liquidity)}</dd></div><div><dt>Simulated creation time</dt><dd>{new Date(modal.createdAt).toISOString().replace('T', ' ').replace(/\.\d+Z/, ' UTC')}</dd></div></dl><p>This is a demonstration record, not an on-chain pool. No contract address or transaction is associated with it.</p><Button onClick={() => setModal(null)}>Close details</Button></div>}</Dialog>}
  </div>;
}
