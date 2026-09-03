"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
const nav = [["/","Dashboard","▦"],["/cases","Cases","▤"],["/service-desk","Service Desk","◫"],["/customers","Customers","♙"],["/tasks","Tasks","✓"],["/questions","Questions & Rules","⌘"],["/reports","Reports","↗"],["/users","Users","♧"],["/administration","Administration","◇"],["/settings","Settings","⚙"]] as const;
export function AppShell({children}:{children:React.ReactNode}) { const pathname=usePathname(); const [open,setOpen]=useState(false); return <div className="app-frame">
  {open && <button className="scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}<aside className={`sidebar ${open?"open":""}`}>
    <div className="brand"><div className="brand-mark">D3</div><div><strong>DM3iQCM™</strong><span>Case Management Intelligence</span></div></div>
    <nav aria-label="Primary navigation">{nav.map(([href,label,icon])=>{const active=href==="/"?pathname===href:pathname.startsWith(href); return <Link key={href} href={href} onClick={()=>setOpen(false)} className={active?"active":""}><span aria-hidden>{icon}</span>{label}</Link>})}</nav>
    <div className="sidebar-foot"><span className="avatar">MC</span><span><strong>Maya Chen</strong><small>Business Administrator</small></span></div>
  </aside><div className="main-column"><header className="topbar"><button className="menu-button" onClick={()=>setOpen(true)} aria-label="Open navigation">☰</button><div className="workspace"><span className="org-icon">N</span><span><strong>Northstar Community Services</strong><small>Operations workspace</small></span></div><div className="header-actions"><button aria-label="Search">⌕</button><button aria-label="Notifications">♢<i/></button><span className="avatar">MC</span></div></header><main>{children}</main></div>
 </div> }
