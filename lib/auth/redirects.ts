const fallbackPath="/";
export function safeInternalPath(value:string|null|undefined){if(!value||!value.startsWith("/")||value.startsWith("//"))return fallbackPath;try{const parsed=new URL(value,"https://dm3iq-case.local");return parsed.origin==="https://dm3iq-case.local"?`${parsed.pathname}${parsed.search}${parsed.hash}`:fallbackPath;}catch{return fallbackPath;}}
