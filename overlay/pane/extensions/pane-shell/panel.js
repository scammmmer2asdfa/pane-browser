async function refresh() {
  const expression = `(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    return {
      nodes: document.querySelectorAll("*").length,
      load: nav ? Math.round(nav.loadEventEnd) : 0,
      transfer: resources.reduce((sum, item) => sum + (item.transferSize || 0), 0),
      resources: resources.length
    };
  })()`;
  const [result, exception] = await browser.devtools.inspectedWindow.eval(expression);
  if (exception) return;
  document.querySelector("#nodes").textContent = result.nodes.toLocaleString();
  document.querySelector("#load").textContent = `${result.load.toLocaleString()} ms`;
  document.querySelector("#transfer").textContent = `${(result.transfer / 1024).toFixed(1)} KB`;
  document.querySelector("#resources").textContent = result.resources.toLocaleString();
}

document.querySelector("#refresh").addEventListener("click", refresh);
document.querySelector("#settings").addEventListener("click", () => browser.runtime.openOptionsPage());
document.querySelector("#blocker").addEventListener("click", () => browser.tabs.create({ url: "about:addons" }));
refresh();
