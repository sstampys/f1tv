import { EARLY_GLOBAL, CACHE_PREFIX, CACHE_VERSION } from "./config";

export type EarlyItem = { url: string; key: string; ttl: number };

/**
 * Inline head script that starts the critical request(s) during HTML parse,
 * before the JavaScript bundle runs, and only when the resource is not already
 * fresh in the cache. It stores each in-flight request on a global keyed by URL;
 * the data layer's request() consumes that promise instead of issuing a second
 * request, so there is exactly one request per resource.
 *
 * Kept deliberately small: it is on the critical path.
 */
export function earlyFetchScript(items: EarlyItem[]): string {
  const cfg = JSON.stringify(items).replace(/</g, "\\u003c");
  const P = `${CACHE_PREFIX}:${CACHE_VERSION}:`;
  return (
    `(function(){var g=window.${EARLY_GLOBAL}=window.${EARLY_GLOBAL}||{},P=${JSON.stringify(P)};` +
    `var a=${cfg};for(var i=0;i<a.length;i++){var it=a[i],u=it.url;` +
    `try{var e=localStorage.getItem(P+it.key);if(e){var p=JSON.parse(e);` +
    `if(p&&typeof p.t==="number"&&Date.now()-p.t<it.ttl)continue;}}catch(_){}` +
    `if(!g[u]){var f=fetch(u,{headers:{Accept:"application/json"},mode:"cors",credentials:"omit"});` +
    `g[u]=f;f.catch(function(){});}}})();`
  );
}
