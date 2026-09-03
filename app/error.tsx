"use client";
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <section className="panel empty"><span className="empty-icon">!</span><h2>Workspace temporarily unavailable</h2><p>DM3iQ could not load the organization’s case-management data. Please try again.</p><button className="primary-button" onClick={reset}>Try Again</button></section>}
