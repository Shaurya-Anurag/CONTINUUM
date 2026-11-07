'use client';

import { useMemo, useState } from 'react';
import {
  Activity, Archive, ArrowDownRight, ArrowUpRight, Bell, BookOpen, Check,
  ChevronDown, ChevronRight, CircleHelp, Clock3, Command, FileText, GitBranch,
  LayoutDashboard, LockKeyhole, MoreHorizontal, Plus, Search, ShieldCheck,
  Sparkles, Users, Workflow, X, AlertTriangle, CircleDot, Link2,
} from 'lucide-react';

type ClaimStatus = 'verified' | 'review' | 'conflict';
type Claim = { id: string; title: string; detail: string; status: ClaimStatus; source: string; time: string; owner: string };

const initialClaims: Claim[] = [
  { id: 'CLM-024', title: 'API migration is blocked by legacy webhook consumers', detail: 'The v2 rollout is waiting on two downstream services to stop consuming the v1 payload.', status: 'review', source: 'Architecture sync · 14:32', time: '2h ago', owner: 'Maya Chen' },
  { id: 'CLM-021', title: 'PostgreSQL remains the system of record', detail: 'The team rejected a document-store migration for the current release because transactional integrity is required.', status: 'verified', source: 'ADR-008 · Decision record', time: 'Yesterday', owner: 'Arjun Rao' },
  { id: 'CLM-019', title: 'Search indexing has no confirmed operational owner', detail: 'The runbook names the platform team, while the latest incident thread assigns follow-up to infrastructure.', status: 'conflict', source: 'Runbook + incident #142', time: 'Yesterday', owner: 'Unassigned' },
];

const nav = [
  { label: 'Workspace', items: [{ name: 'Overview', icon: LayoutDashboard }, { name: 'Knowledge graph', icon: Workflow }, { name: 'Chronicle', icon: Clock3 }, { name: 'Evidence room', icon: Archive }] },
  { label: 'Continuity', items: [{ name: 'Handovers', icon: BookOpen }, { name: 'People & ownership', icon: Users }, { name: 'Source library', icon: FileText }] },
];

function Status({ status }: { status: ClaimStatus }) {
  const labels = { verified: 'Verified', review: 'Needs review', conflict: 'Conflict' };
  return <span className={`status status-${status}`}><i />{labels[status]}</span>;
}

export default function Home() {
  const [active, setActive] = useState('Overview');
  const [claims, setClaims] = useState(initialClaims);
  const [query, setQuery] = useState('');
  const [showHandover, setShowHandover] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const filtered = useMemo(() => claims.filter(c => `${c.title} ${c.detail} ${c.source}`.toLowerCase().includes(query.toLowerCase())), [claims, query]);

  function verify(id: string) {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'verified' } : c));
    setSelectedClaim(null);
    setNotice('Claim marked as verified in this demo workspace.');
    window.setTimeout(() => setNotice(''), 3200);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><div className="brand-mark"><span /><span /><span /></div><div><div className="brand-name">CONTINUUM</div><div className="brand-kicker">THE LIVING ARCHIVE</div></div></div>
        <button className="workspace-switch"><div className="workspace-avatar">N</div><span><b>Northstar Platform</b><small>Engineering workspace</small></span><ChevronDown size={15}/></button>
        <div className="nav-scroll">
          {nav.map(group => <div className="nav-group" key={group.label}><div className="nav-label">{group.label}</div>{group.items.map(item => <button key={item.name} onClick={() => setActive(item.name)} className={`nav-item ${active === item.name ? 'active' : ''}`}><item.icon size={17}/><span>{item.name}</span>{item.name === 'Evidence room' && <em>3</em>}</button>)}</div>)}
          <div className="nav-group"><div className="nav-label">Recent projects</div><button className="project-link active-project"><span className="project-dot"/>Northstar Platform</button><button className="project-link"><span className="project-dot sage"/>Atlas Mobile</button><button className="project-link"><span className="project-dot copper"/>Mercury Data</button><button className="add-project"><Plus size={14}/> Add a project</button></div>
        </div>
        <div className="sidebar-bottom"><div className="sync-card"><div className="sync-top"><span className="sync-indicator"/>Archive status</div><b>Up to date</b><small>Last reconstructed 18 min ago</small><div className="sync-line"><span/></div></div><button className="nav-item"><CircleHelp size={17}/>Help & documentation</button><div className="profile"><div className="profile-avatar">SA</div><div><b>Shaurya Anurag</b><small>Workspace owner</small></div><MoreHorizontal size={18}/></div></div>
      </aside>

      <section className="main-area">
        <header className="topbar"><div className="breadcrumbs"><span>Northstar Platform</span><ChevronRight size={14}/><b>{active}</b></div><div className="top-actions"><div className="search-box"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the archive"/><kbd>⌘ K</kbd></div><button className="icon-button" aria-label="Notifications"><Bell size={17}/><i/></button><div className="top-avatar">SA</div></div></header>
        <div className="content-wrap">
          <div className="eyebrow"><span className="eyebrow-rule"/>PROJECT INTELLIGENCE <span className="eyebrow-sep">/</span> 07 NOVEMBER 2026</div>
          <div className="page-heading"><div><h1>The project, <em>remembered.</em></h1><p className="lead">A living record of what changed, why it changed, and what must happen next.</p></div><div className="heading-actions"><button className="button button-quiet" onClick={() => setNotice('Source connection flow is the next integration milestone.')}><Plus size={15}/> Connect source</button><button className="button button-primary" onClick={() => setShowHandover(true)}><Sparkles size={15}/> Create handover</button></div></div>

          <section className="project-banner"><div className="banner-copy"><div className="banner-label"><span className="live-dot"/> CONTINUITY PULSE <span className="banner-divider">·</span> PROJECT 001</div><h2>Northstar Platform</h2><p>Reconstructing the knowledge behind your team's work.</p><div className="banner-meta"><span><GitBranch size={13}/> main</span><span><Users size={13}/> 8 contributors</span><span><Clock3 size={13}/> Active for 14 months</span></div></div><div className="pulse-visual"><div className="pulse-ring ring-one"/><div className="pulse-ring ring-two"/><div className="pulse-ring ring-three"/><div className="pulse-core"><Archive size={23}/></div><span className="pulse-node node-a"/><span className="pulse-node node-b"/><span className="pulse-node node-c"/></div><div className="banner-index">01 <span>—</span> 03</div></section>

          <section className="metrics-grid"><Metric label="Knowledge captured" value="86%" note="+12% this month" trend="up" icon={<Archive size={16}/>} progress={86}/><Metric label="Verified claims" value="124" note="18 awaiting review" trend="up" icon={<ShieldCheck size={16}/>} progress={72}/><Metric label="Open dependencies" value="07" note="2 need an owner" trend="down" icon={<GitBranch size={16}/>} progress={38}/><Metric label="Continuity readiness" value="B+" note="Good · gaps remain" trend="up" icon={<Activity size={16}/>} progress={78}/></section>

          <div className="section-heading"><div><div className="section-overline">THE RECORD</div><h3>What the archive knows</h3><p>Extracted knowledge, connected to its original evidence.</p></div><button className="text-action" onClick={() => setActive('Evidence room')}>Open evidence room <ArrowUpRight size={14}/></button></div>
          <section className="knowledge-layout"><div className="claims-panel"><div className="panel-head"><div><b>Knowledge requiring attention</b><small>Claims that shape the current project state</small></div><button className="filter-button">All claims <ChevronDown size={13}/></button></div><div className="claim-list">{filtered.map(claim => <article className={`claim-row ${selectedClaim === claim.id ? 'claim-selected' : ''}`} key={claim.id} onClick={() => setSelectedClaim(selectedClaim === claim.id ? null : claim.id)}><div className="claim-marker"><span className={`marker-${claim.status}`}/></div><div className="claim-content"><div className="claim-topline"><span>{claim.id}</span><Status status={claim.status}/></div><h4>{claim.title}</h4><p>{claim.detail}</p><div className="claim-meta"><span><FileText size={12}/>{claim.source}</span><span>{claim.time}</span></div>{selectedClaim === claim.id && <div className="claim-expanded"><div><b>Current owner</b><span>{claim.owner}</span></div><div><b>Evidence trace</b><span>{claim.source}</span></div><button className="verify-button" onClick={e => {e.stopPropagation(); verify(claim.id)}}><Check size={13}/> Mark verified</button></div>}</div><ChevronRight className="claim-chevron" size={16}/></article>)}{filtered.length === 0 && <div className="empty-state">No archive records match “{query}”.</div>}</div><button className="panel-footer" onClick={() => setActive('Evidence room')}>View all knowledge records <ArrowUpRight size={14}/></button></div>

            <aside className="chronicle-panel"><div className="panel-head"><div><b>Recent chronicle</b><small>Events that changed the project</small></div><button className="more-button"><MoreHorizontal size={17}/></button></div><div className="chronicle-list"><ChronicleItem color="brass" date="TODAY · 10:42" title="Release scope reaffirmed" text="Decision recorded in Product sync." tag="DECISION"/><ChronicleItem color="sage" date="YESTERDAY · 16:18" title="Database ownership updated" text="Arjun Rao became primary owner." tag="OWNERSHIP"/><ChronicleItem color="copper" date="YESTERDAY · 11:06" title="Webhook dependency surfaced" text="Two consumers remain on v1 payload." tag="DEPENDENCY"/><ChronicleItem color="stone" date="NOV 05 · 14:20" title="Runbook revised" text="Deployment sequence clarified." tag="SOURCE CHANGE"/></div><button className="panel-footer" onClick={() => setActive('Chronicle')}>Explore the chronicle <ArrowUpRight size={14}/></button></aside></section>

          <section className="bottom-grid"><div className="handover-card"><div className="card-ornament"><BookOpen size={19}/></div><div className="card-copy"><div className="section-overline">KNOWLEDGE TRANSFER</div><h3>Someone new is joining?</h3><p>Give them more than a folder of documents. Give them the context behind the work.</p><button className="button button-dark" onClick={() => setShowHandover(true)}>Prepare a handover <ArrowUpRight size={14}/></button></div><div className="handover-watermark">C</div></div><div className="coverage-card"><div className="panel-head"><div><b>Source coverage</b><small>Connected knowledge surfaces</small></div><span className="coverage-count">03 / 05</span></div><Coverage icon={<GitBranch size={15}/>} name="GitHub repository" detail="northstar/platform" status="Connected"/><Coverage icon={<FileText size={15}/>} name="Project documents" detail="12 indexed files" status="Connected"/><Coverage icon={<Users size={15}/>} name="Meeting records" detail="28 transcripts" status="Connected"/><div className="coverage-pending"><LockKeyhole size={14}/> Task board and team messages not connected</div></div></section>
          <footer className="footer-note"><span>CONTINUUM <i>·</i> THE LIVING ARCHIVE</span><span>Knowledge should outlast the people who create it.</span><span>LOCAL DEMO DATA</span></footer>
        </div>
      </section>
      {notice && <div className="toast"><Check size={15}/>{notice}<button onClick={() => setNotice('')}><X size={14}/></button></div>}
      {showHandover && <div className="modal-backdrop" onClick={() => setShowHandover(false)}><div className="handover-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowHandover(false)}><X size={17}/></button><div className="modal-symbol"><BookOpen size={20}/></div><div className="section-overline">CONTINUITY WORKSPACE</div><h2>Prepare a <em>handover.</em></h2><p>Choose who is receiving the knowledge. CONTINUUM will assemble a draft from verified project records and clearly flag anything uncertain.</p><label>Incoming team member<input placeholder="Name or work email"/></label><label>Knowledge scope<select defaultValue="project"><option value="project">Entire project</option><option value="engineering">Engineering and delivery</option><option value="operations">Operations and dependencies</option></select></label><div className="modal-assurance"><ShieldCheck size={16}/><span>Only information permitted for the recipient should be included. Access checks will be enforced in the connected workflow.</span></div><button className="button button-primary modal-submit" onClick={() => {setShowHandover(false);setNotice('Handover draft flow is scaffolded; recipient access checks are not yet connected.')}}>Continue to draft <ArrowUpRight size={15}/></button></div></div>}
    </main>
  );
}

function Metric({label,value,note,trend,icon,progress}:{label:string;value:string;note:string;trend:'up'|'down';icon:React.ReactNode;progress:number}) { return <div className="metric-card"><div className="metric-top"><span className="metric-icon">{icon}</span><span className={`trend trend-${trend}`}>{trend==='up'?<ArrowUpRight size={13}/>:<ArrowDownRight size={13}/>} {note}</span></div><div className="metric-value">{value}</div><div className="metric-label">{label}</div><div className="metric-track"><span style={{width:`${progress}%`}}/></div></div> }
function ChronicleItem({color,date,title,text,tag}:{color:string;date:string;title:string;text:string;tag:string}) { return <div className="chronicle-item"><div className={`chronicle-pin pin-${color}`}/><div className="chronicle-body"><div className="chronicle-date">{date}</div><b>{title}</b><p>{text}</p><span className={`chronicle-tag tag-${color}`}>{tag}</span></div></div> }
function Coverage({icon,name,detail,status}:{icon:React.ReactNode;name:string;detail:string;status:string}) { return <div className="coverage-row"><span className="coverage-icon">{icon}</span><span className="coverage-name"><b>{name}</b><small>{detail}</small></span><span className="connected"><i/>{status}</span></div> }
