'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Archive, ArrowUpRight, BookOpen, Check, ChevronRight, Clock3,
  FileText, GitBranch, LayoutDashboard, LoaderCircle, RefreshCw, Search,
  ShieldCheck, Users, Workflow, X, AlertTriangle, CircleHelp, Plus,
} from 'lucide-react';

type Project = { id: string; name: string; description: string; created_at: string };
type Evidence = { id: string; source_title: string; excerpt: string; locator: Record<string, unknown>; observed_at?: string | null };
type ClaimStatus = 'proposed' | 'needs_review' | 'verified' | 'rejected' | 'conflict';
type Claim = { id: string; statement: string; category: string; status: ClaimStatus; confidence?: number | null; owner?: string | null; created_at: string; evidence: Evidence[] };
type Summary = { claim_count: number; source_count: number; verified_count: number; needs_review_count: number; conflict_count: number; rejected_count: number; knowledge_coverage: number };
type Source = { id: string; kind: string; title: string; uri?: string | null; access_scope: string; imported_at: string; evidence_count: number; is_demo: boolean };
type Event = { id: string; actor: string; action: string; entity_type: string; entity_id: string; details: Record<string, unknown>; created_at: string };
type Handover = { project_id: string; recipient: string; scope: string; generated_at: string; verified: Claim[]; needs_review: Claim[]; conflicts: Claim[]; excluded_count: number };

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const nav = [
  { group: 'WORKSPACE', items: [{ name: 'Overview', icon: LayoutDashboard }, { name: 'Knowledge graph', icon: Workflow }, { name: 'Chronicle', icon: Clock3 }, { name: 'Evidence room', icon: Archive }] },
  { group: 'CONTINUITY', items: [{ name: 'Handovers', icon: BookOpen }, { name: 'People & ownership', icon: Users }, { name: 'Source library', icon: FileText }] },
];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, cache: 'no-store' });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body.slice(0, 240)}`);
  }
  return response.json();
}

function Status({ status }: { status: ClaimStatus }) {
  const labels: Record<ClaimStatus, string> = { verified: 'Verified', needs_review: 'Needs review', proposed: 'Proposed', conflict: 'Conflict', rejected: 'Rejected' };
  return <span className={`status status-${status}`}><i />{labels[status]}</span>;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [active, setActive] = useState('Overview');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [scope, setScope] = useState('project');
  const [handover, setHandover] = useState<Handover | null>(null);
  const [githubRepository, setGithubRepository] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const list = await request<Project[]>('/api/v1/projects');
      setProjects(list);
      const current = project && list.find(p => p.id === project.id) ? list.find(p => p.id === project.id)! : list[0];
      setProject(current || null);
      if (!current) { setSummary(null); setClaims([]); setSources([]); setEvents([]); return; }
      const [s, c, src, ev] = await Promise.all([
        request<Summary>(`/api/v1/projects/${current.id}/summary`),
        request<Claim[]>(`/api/v1/projects/${current.id}/claims`),
        request<Source[]>(`/api/v1/projects/${current.id}/sources`),
        request<Event[]>(`/api/v1/projects/${current.id}/events`),
      ]);
      setSummary(s); setClaims(c); setSources(src); setEvents(ev);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not connect to CONTINUUM API.'); }
    finally { setLoading(false); }
  }, [project?.id]);

  useEffect(() => { void load(); }, []); // initial connection only; explicit refresh and mutations reload data

  const filtered = useMemo(() => claims.filter(c => `${c.statement} ${c.category} ${c.owner || ''} ${c.evidence.map(e => e.source_title + ' ' + e.excerpt).join(' ')}`.toLowerCase().includes(query.toLowerCase())), [claims, query]);

  async function review(claim: Claim, status: ClaimStatus) {
    setBusy(claim.id); setError('');
    try {
      await request<Claim>(`/api/v1/claims/${claim.id}/review`, { method: 'POST', body: JSON.stringify({ status, reviewer: 'Workspace owner', note: 'Reviewed in CONTINUUM workspace.' }) });
      setNotice(`Claim moved to ${status.replace('_', ' ')}.`); setSelected(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Review failed.'); }
    finally { setBusy(''); }
  }

  async function importGithub() {
    if (!project || !githubRepository.trim()) return;
    setBusy('github'); setError(''); setNotice('');
    try {
      const result = await request<{repository:string;claims:number;evidence:number}>(`/api/v1/projects/${project.id}/sources/github`, { method: 'POST', body: JSON.stringify({ repository: githubRepository.trim() }) });
      setNotice(`Imported ${result.repository}: ${result.claims} proposed claims and ${result.evidence} evidence records. Review them before verification.`);
      setGithubRepository(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'GitHub import failed.'); }
    finally { setBusy(''); }
  }

  async function createHandover() {
    if (!project || !recipient.trim()) return;
    setBusy('handover'); setError('');
    try {
      const result = await request<Handover>(`/api/v1/projects/${project.id}/handovers`, { method: 'POST', body: JSON.stringify({ recipient: recipient.trim(), scope }) });
      setHandover(result); setActive('Handovers'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Handover draft failed.'); }
    finally { setBusy(''); }
  }

  const title = active === 'Overview' ? 'The project, remembered.' : active;
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><div className="brand-mark"><span/><span/><span/></div><div><div className="brand-name">CONTINUUM</div><div className="brand-kicker">THE LIVING ARCHIVE</div></div></div>
      <div className="workspace-switch"><div className="workspace-avatar">C</div><span><b>Continuity workspace</b><small>Project intelligence</small></span></div>
      <div className="nav-scroll">{nav.map(group => <div className="nav-group" key={group.group}><div className="nav-label">{group.group}</div>{group.items.map(item => <button key={item.name} onClick={() => setActive(item.name)} className={`nav-item ${active === item.name ? 'active' : ''}`}><item.icon size={17}/><span>{item.name}</span></button>)}</div>)}</div>
      <div className="sidebar-bottom"><div className="sync-card"><div className="sync-top"><span className="sync-indicator"/> API CONNECTION</div><b>{error ? 'Needs attention' : loading ? 'Connecting…' : 'Connected'}</b><small>{error ? 'Check backend status' : 'Live project data'}</small></div><div className="profile"><div className="profile-avatar">SA</div><div><b>Workspace owner</b><small>Local development</small></div></div></div>
    </aside>
    <section className="main-area">
      <header className="topbar"><div className="breadcrumbs"><span>{project?.name || 'Workspace'}</span><ChevronRight size={14}/><b>{active}</b></div><div className="top-actions"><div className="search-box"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search claims and evidence"/></div><button className="icon-button" aria-label="Refresh data" onClick={() => void load()}><RefreshCw size={16}/></button><div className="top-avatar">SA</div></div></header>
      <div className="content-wrap">
        <div className="eyebrow"><span className="eyebrow-rule"/> PROJECT INTELLIGENCE <span className="eyebrow-sep">/</span> LIVE WORKSPACE</div>
        <div className="page-heading"><div><h1>{title.split(',')[0]}{active === 'Overview' ? <>, <em>remembered.</em></> : null}</h1><p className="lead">{active === 'Overview' ? 'A living record of what changed, why it changed, and what must happen next.' : pageDescription(active)}</p></div><div className="heading-actions"><button className="button button-quiet" onClick={() => setActive('Source library')}><Plus size={15}/> Sources</button><button className="button button-primary" onClick={() => { setActive('Handovers'); setHandover(null); }}><BookOpen size={15}/> Create handover</button></div></div>
        {error && <div className="error-banner"><AlertTriangle size={16}/><span><b>API connection problem.</b> {error} Start the FastAPI server and refresh.</span><button onClick={() => void load()}>Retry</button></div>}
        {notice && <div className="notice-banner"><Check size={15}/>{notice}<button onClick={() => setNotice('')}><X size={14}/></button></div>}
        {loading && !project ? <div className="loading-state"><LoaderCircle className="spin" size={22}/> Connecting to the project archive…</div> : !project ? <div className="empty-state large">No projects exist in this workspace yet.</div> : <>
          {active === 'Overview' && <Overview project={project} summary={summary} claims={filtered} events={events} selected={selected} setSelected={setSelected} review={review} busy={busy} setActive={setActive}/>}
          {active === 'Evidence room' && <EvidenceRoom claims={filtered} selected={selected} setSelected={setSelected} review={review} busy={busy}/>}
          {active === 'Source library' && <SourceLibrary sources={sources} repository={githubRepository} setRepository={setGithubRepository} importRepository={importGithub} busy={busy}/>}
          {active === 'Chronicle' && <Chronicle events={events}/>}
          {active === 'Knowledge graph' && <GraphView claims={claims}/>}
          {active === 'People & ownership' && <Ownership claims={claims}/>}
          {active === 'Handovers' && <HandoverView recipient={recipient} setRecipient={setRecipient} scope={scope} setScope={setScope} create={createHandover} handover={handover} busy={busy}/>}
        </>}
        <footer className="footer-note"><span>CONTINUUM <i>·</i> THE LIVING ARCHIVE</span><span>Knowledge should outlast the people who create it.</span><span>{sources.some(s => s.is_demo) ? 'DEMO SOURCES' : 'LIVE WORKSPACE'}</span></footer>
      </div>
    </section>
  </main>;
}

function pageDescription(page: string) {
  const descriptions: Record<string,string> = {
    'Evidence room': 'Inspect every claim against the source material that supports it.',
    'Source library': 'See what has been ingested, where it came from, and its access scope.',
    'Chronicle': 'An auditable timeline of reviews and changes to project knowledge.',
    'Knowledge graph': 'Explore the connections between extracted claims and their evidence.',
    'People & ownership': 'Find ownership signals and gaps that need human attention.',
    'Handovers': 'Assemble a recipient-specific draft from the current verified project record.',
  };
  return descriptions[page] || 'Project knowledge continuity.';
}

function Overview({ project, summary, claims, events, selected, setSelected, review, busy, setActive }: any) {
  return <>
    <section className="project-banner"><div className="banner-copy"><div className="banner-label"><span className="live-dot"/> CONTINUITY PULSE <span className="banner-divider">·</span> PROJECT</div><h2>{project.name}</h2><p>{project.description}</p><div className="banner-meta"><span><GitBranch size={13}/> Project record</span><span><Clock3 size={13}/> Created {new Date(project.created_at).toLocaleDateString()}</span></div></div><div className="pulse-visual"><div className="pulse-ring ring-one"/><div className="pulse-ring ring-two"/><div className="pulse-ring ring-three"/><div className="pulse-core"><Archive size={23}/></div></div></section>
    <section className="metrics-grid"><Metric label="Knowledge captured" value={`${summary?.knowledge_coverage ?? 0}%`} note="Verified claims / all claims" progress={summary?.knowledge_coverage ?? 0}/><Metric label="Verified claims" value={String(summary?.verified_count ?? 0)} note="Approved for handover" progress={summary?.claim_count ? (summary.verified_count/summary.claim_count)*100 : 0}/><Metric label="Needs review" value={String(summary?.needs_review_count ?? 0)} note="Awaiting human decision" progress={summary?.claim_count ? (summary.needs_review_count/summary.claim_count)*100 : 0}/><Metric label="Conflicts" value={String(summary?.conflict_count ?? 0)} note="Conflicting evidence signals" progress={summary?.claim_count ? (summary.conflict_count/summary.claim_count)*100 : 0}/></section>
    <div className="section-heading"><div><div className="section-overline">THE RECORD</div><h3>What needs your attention</h3><p>Real claims returned by the CONTINUUM API.</p></div><button className="text-action" onClick={() => setActive('Evidence room')}>Open evidence room <ArrowUpRight size={14}/></button></div>
    <ClaimList claims={claims.slice(0,4)} selected={selected} setSelected={setSelected} review={review} busy={busy}/>
    <div className="section-heading compact-heading"><div><div className="section-overline">RECENT ACTIVITY</div><h3>Project chronicle</h3></div><button className="text-action" onClick={() => setActive('Chronicle')}>View all events <ArrowUpRight size={14}/></button></div>
    <Chronicle events={events.slice(0,4)} compact/>
  </>;
}

function Metric({label,value,note,progress}:{label:string;value:string;note:string;progress:number}) {
  return <div className="metric-card"><div className="metric-top"><span className="metric-icon"><Activity size={16}/></span><span className="trend">{note}</span></div><div className="metric-value">{value}</div><div className="metric-label">{label}</div><div className="metric-track"><span style={{width:`${Math.max(0,Math.min(100,progress))}%`}}/></div></div>;
}

function ClaimList({claims,selected,setSelected,review,busy}:any) {
  if (!claims.length) return <div className="empty-state">No claims match this search.</div>;
  return <div className="claims-panel"><div className="claim-list">{claims.map((claim:Claim) => <article className={`claim-row ${selected===claim.id?'claim-selected':''}`} key={claim.id}><div className="claim-marker"><span className={`marker-${claim.status}`}/></div><div className="claim-content"><div className="claim-topline"><span>{claim.id.slice(0,12)}</span><Status status={claim.status}/></div><h4>{claim.statement}</h4><p>{claim.category} · {claim.owner || 'No owner assigned'}{claim.confidence != null ? ` · confidence ${Math.round(claim.confidence*100)}%` : ''}</p><div className="claim-meta"><span><FileText size={12}/>{claim.evidence.length} evidence record(s)</span><span>{new Date(claim.created_at).toLocaleString()}</span></div>{selected===claim.id && <div className="claim-expanded"><b>Evidence trail</b>{claim.evidence.length ? claim.evidence.map(e=><blockquote key={e.id}><strong>{e.source_title}</strong><br/>{e.excerpt}</blockquote>) : <p>No evidence is attached. Do not verify this claim until provenance is supplied.</p>}<div className="review-actions"><button disabled={busy===claim.id} onClick={()=>review(claim,'verified')}><Check size={13}/> Verify</button><button disabled={busy===claim.id} onClick={()=>review(claim,'needs_review')}>Needs review</button><button disabled={busy===claim.id} onClick={()=>review(claim,'conflict')}>Flag conflict</button><button disabled={busy===claim.id} onClick={()=>review(claim,'rejected')}>Reject</button></div></div>}</div><button className="claim-open" onClick={()=>setSelected(selected===claim.id?null:claim.id)} aria-label="Inspect claim"><ChevronRight size={16}/></button></article>)}</div></div>;
}

function EvidenceRoom({claims,selected,setSelected,review,busy}:any) {
  return <><div className="section-heading"><div><div className="section-overline">PROVENANCE & REVIEW</div><h3>Claims and supporting evidence</h3><p>Expand a claim to inspect its source excerpts and record a review decision.</p></div></div><ClaimList claims={claims} selected={selected} setSelected={setSelected} review={review} busy={busy}/></>;
}

function SourceLibrary({sources,repository,setRepository,importRepository,busy}:any) {
  return <>
    <div className="surface-panel">
      <div className="panel-head"><div><b>Connect a public GitHub repository</b><small>Import README context, recent commits and open issues as evidence-backed proposed claims.</small></div><GitBranch size={18}/></div>
      <div className="github-import"><input value={repository} onChange={e=>setRepository(e.target.value)} placeholder="owner/repository or https://github.com/owner/repository"/><button className="button button-primary" disabled={!repository.trim()||busy==='github'} onClick={importRepository}>{busy==='github'?<LoaderCircle className="spin" size={14}/>:<Plus size={14}/>} Import repository</button></div>
      <div className="callout-note"><ShieldCheck size={15}/> Public repositories only. Imported records start as proposed and require human review. Private repository OAuth is not enabled.</div>
    </div>
    <div className="surface-panel">
      <div className="panel-head"><div><b>Ingested sources</b><small>{sources.length} source records · immutable evidence provenance</small></div><span className="coverage-count">{sources.filter((s:Source)=>s.is_demo).length} DEMO</span></div>
      {sources.length ? sources.map((source:Source)=><div className="coverage-row source-row" key={source.id}><span className="coverage-icon"><FileText size={15}/></span><span className="coverage-name"><b>{source.title}</b><small>{source.kind} · {source.evidence_count} evidence · scope: {source.access_scope}</small>{source.uri && <a href={source.uri} target="_blank" rel="noreferrer" className="source-link">Open original source ↗</a>}</span><span className="connected">{source.is_demo?'Demo record':'Imported'}</span></div>) : <div className="empty-state">No sources have been ingested.</div>}
      <div className="callout-note"><CircleHelp size={15}/> Imported GitHub records are source-linked but remain proposed until a human reviewer verifies them.</div>
    </div>
  </>;
}
function Chronicle({events,compact=false}:{events:Event[];compact?:boolean}) {
  return <div className="chronicle-panel"><div className="chronicle-list">{events.length ? events.map(event=><div className="chronicle-item" key={event.id}><div className="chronicle-pin pin-sage"/><div className="chronicle-body"><div className="chronicle-date">{new Date(event.created_at).toLocaleString()} · {event.actor}</div><b>{event.action.replaceAll('_',' ')}</b><p>{event.entity_type} · {event.entity_id}</p><span className="chronicle-tag">{Object.keys(event.details || {}).length ? JSON.stringify(event.details) : 'AUDIT EVENT'}</span></div></div>) : <div className="empty-state">No recorded events yet.</div>}</div></div>;
}

function GraphView({claims}:{claims:Claim[]}) {
  return <div className="surface-panel"><div className="panel-head"><div><b>Evidence relationship map</b><small>Current claim-to-evidence relationships</small></div><span className="coverage-count">{claims.length} CLAIMS</span></div><div className="graph-list">{claims.map(c=><div className="graph-row" key={c.id}><div className="graph-node claim-node"><span>CLAIM</span><b>{c.statement}</b><small>{c.status.replace('_',' ')}</small></div><div className="graph-edges"><span/> {c.evidence.length} linked evidence item(s) <span/></div><div className="graph-evidence">{c.evidence.length ? c.evidence.map(e=><div className="graph-node evidence-node" key={e.id}><span>SOURCE EVIDENCE</span><b>{e.source_title}</b><small>{e.excerpt}</small></div>) : <div className="graph-node evidence-node missing"><span>MISSING</span><b>No linked evidence</b></div>}</div></div>)}</div><div className="callout-note">This is a data-backed relationship view, not yet an interactive force-directed graph. Relationship types and cross-claim edges are future work.</div></div>;
}

function Ownership({claims}:{claims:Claim[]}) {
  const owners = new Map<string,Claim[]>();
  claims.forEach(c=>{const key=c.owner || 'Unassigned'; owners.set(key,[...(owners.get(key)||[]),c]);});
  return <div className="surface-panel"><div className="panel-head"><div><b>Ownership signals</b><small>Derived from claim owner fields; not identity-provider data</small></div></div>{[...owners.entries()].map(([owner,items])=><div className="coverage-row" key={owner}><span className="coverage-icon"><Users size={15}/></span><span className="coverage-name"><b>{owner}</b><small>{items.length} associated claim(s) · {items.filter(c=>c.status==='conflict').length} conflict(s)</small></span><span className={owner==='Unassigned'?'status status-conflict':'connected'}>{owner==='Unassigned'?'Gap detected':'Recorded'}</span></div>)}</div>;
}

function HandoverView({recipient,setRecipient,scope,setScope,create,handover,busy}:any) {
  return <div className="handover-workspace"><section className="handover-form surface-panel"><div className="section-overline">KNOWLEDGE TRANSFER</div><h3>Prepare a <em>handover.</em></h3><p>Build a draft from the current project record. Only verified claims are placed in the recipient-facing section; uncertain claims and conflicts remain visibly separated for review.</p><label>Incoming team member<input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="Name or work email"/></label><label>Knowledge scope<select value={scope} onChange={e=>setScope(e.target.value)}><option value="project">Entire project</option><option value="engineering">Engineering and delivery</option><option value="operations">Operations and dependencies</option></select></label><button className="button button-primary" disabled={!recipient.trim()||busy==='handover'} onClick={create}>{busy==='handover'?<LoaderCircle className="spin" size={15}/>:<BookOpen size={15}/>} Generate handover draft</button><div className="callout-note"><ShieldCheck size={15}/> This MVP filters by review status only. Recipient-specific authorization and source permission propagation are not implemented; do not share sensitive information.</div></section>
    {handover ? <section className="handover-result"><div className="handover-result-head"><div className="section-overline">DRAFT GENERATED · {new Date(handover.generated_at).toLocaleString()}</div><h3>Handover for {handover.recipient}</h3><p>Scope: {handover.scope}. Review the uncertainty sections before sharing.</p></div><HandoverGroup title="Verified knowledge" items={handover.verified} tone="sage"/><HandoverGroup title="Needs human review" items={handover.needs_review} tone="brass"/><HandoverGroup title="Conflicting evidence" items={handover.conflicts} tone="copper"/></section> : <div className="handover-placeholder"><BookOpen size={27}/><h3>Your handover draft will appear here.</h3><p>Verified knowledge, unresolved questions and conflicts are kept distinct.</p></div>}
  </div>;
}

function HandoverGroup({title,items,tone}:{title:string;items:Claim[];tone:string}) {
  return <div className="handover-group"><h4 className={`tone-${tone}`}>{title} <span>{items.length}</span></h4>{items.length?items.map(item=><article key={item.id}><b>{item.statement}</b><p>{item.evidence.map(e=>e.source_title).join(' · ') || 'No evidence attached'}</p></article>):<p className="muted-copy">No records in this section.</p>}</div>;
}
