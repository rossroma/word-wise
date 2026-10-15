// 网站规则：裸域名匹配自身及子域名；带协议的规则还可以限定路径。
(function (global) {
  function normalizeRule(input) {
    if (typeof input !== 'string') return null;
    const rule = input.trim().toLowerCase();
    const match = rule.match(/^(https?:\/\/)?([^/?#]+)(\/[^?#]*)?$/);
    if (!match) return null;
    if (match[3] && !match[1]) return null;
    const host = match[2].replace(/\.$/, '');
    const port = host.match(/:(\d+)$/)?.[1];
    if (!host || host === '*' || !/^[a-z0-9.*-]+(?::\d+)?$/.test(host) ||
        (port && (Number(port) < 1 || Number(port) > 65535)) ||
        host.includes('..') || host.startsWith('.') || host.endsWith('.') ||
        !host.replace(/:\d+$/, '').split('.').every(part => part && (part === '*' || !part.startsWith('-') && !part.endsWith('-')))) return null;
    if (!host.includes('.') && host !== 'localhost') return null;
    return `${match[1] || ''}${host}${match[3] || ''}`;
  }

  function escapeRegex(text) {
    return text.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  }

  function matchesRule(url, input) {
    const rule = normalizeRule(input);
    if (!rule) return false;
    let page;
    try { page = new URL(url); } catch { return false; }
    if (!['http:', 'https:'].includes(page.protocol)) return false;
    const match = rule.match(/^(https?:\/\/)?([^/]+)(\/.*)?$/);
    if (match[1] && match[1].slice(0, -2) !== page.protocol) return false;
    const host = match[2];
    const requestedPort = host.match(/:(\d+)$/)?.[1];
    const hostname = host.replace(/:\d+$/, '');
    const hostPattern = hostname.split('*').map(escapeRegex).join('[^.]*');
    const domain = hostname.includes('*') || match[1] ? `^${hostPattern}$` : `^(?:[^.]+\\.)*${hostPattern}$`;
    if (!new RegExp(domain, 'i').test(page.hostname) || (requestedPort && page.port !== requestedPort)) return false;
    if (!match[3]) return true;
    const path = match[3].split('*').map(escapeRegex).join('.*');
    return new RegExp(`^${path}$`).test(page.pathname);
  }

  function sitePolicy(url, config = {}) {
    if ((config.blacklist || []).some(rule => matchesRule(url, rule))) return 'blocked';
    if ((config.whitelist || []).some(rule => matchesRule(url, rule))) return 'automatic';
    return config.autoTranslate ? 'automatic' : 'manual';
  }

  global.WordwiseSiteRules = { normalizeRule, matchesRule, sitePolicy };
})(typeof window !== 'undefined' ? window : self);
