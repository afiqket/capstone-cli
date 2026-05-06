function _1(md){return(
md`# How Many Members of the US Military Have Died in Each War?`
)}

function _2(data,d3)
{
  // ════════════════════════════════════════════
  //  PARSE
  // ════════════════════════════════════════════
  const wars = data.map(d => ({
    war:       d["War"],
    years:     d["Years"],
    deaths:    +String(d["Deaths"]).replace(/,/g, ""),
    perDay:    +String(d["Deaths per Day"]).replace(/,/g, ""),
    perPop:    +String(d["Deaths per Population"]).replace(/%/g, "") / 100,
    rank:      d["Rank"]
  }));
 
  // Preserve original CSV order (chronological as in Tableau)
  const order = [
    "American Revolutionary War",
    "War of 1812",
    "Mexican–American War",
    "American Civil War",
    "Philippine–American War",
    "World War I",
    "World War II",
    "Korean War",
    "Vietnam War",
    "Gulf War",
    "Iraq War/Afghanistan Wars"
  ];
 
  wars.sort((a, b) => {
    const ia = order.indexOf(a.war);
    const ib = order.indexOf(b.war);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
 
  // ════════════════════════════════════════════
  //  TABS CONFIG
  // ════════════════════════════════════════════
  const tabs = [
    {
      key:      "deaths",
      label:    "Deaths",
      accessor: d => d.deaths,
      fmt:      v => d3.format(",")(v),
      axisFmt:  v => (v === 0 ? "0K" : (v/1000).toFixed(0) + "K"),
      axisLabel:"Deaths"
    },
    {
      key:      "perDay",
      label:    "Deaths per Day",
      accessor: d => d.perDay,
      fmt:      v => d3.format(".2f")(v),
      axisFmt:  v => d3.format(".0f")(v),
      axisLabel:"Deaths per Day"
    },
    {
      key:      "perPop",
      label:    "Deaths per Population",
      accessor: d => d.perPop,
      fmt:      v => d3.format(".2%")(v),
      axisFmt:  v => d3.format(".1%")(v),
      axisLabel:"Deaths per Population"
    }
  ];
 
  let activeTab = tabs[0];
 
  // ════════════════════════════════════════════
  //  COLORS & STYLE
  // ════════════════════════════════════════════
  const BG       = "#2e2e2e";
  const BAR_CLR  = "#c8711a";
  const TEXT_CLR = "#e8e8e8";
  const MUTED    = "#888";
  const TAB_ACT  = "#444";
  const TAB_IDLE = "#2e2e2e";
 
  // ════════════════════════════════════════════
  //  WRAPPER
  // ════════════════════════════════════════════
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background: ${BG};
    color: ${TEXT_CLR};
    max-width: 900px;
    padding: 24px 28px 28px;
    box-sizing: border-box;
  `;
 
  // ── Title ─────────────────────────────────
  const title = wrapper.appendChild(document.createElement("h2"));
  title.style.cssText = `
    font-size: 1.35rem; font-weight: 700; color: #fff;
    margin: 0 0 20px; line-height: 1.3;
  `;
  title.textContent = "How Many Members of the US Military Have Died in Each War?";
 
  // ── Tab bar ───────────────────────────────
  const tabBar = wrapper.appendChild(document.createElement("div"));
  tabBar.style.cssText = `
    display: flex; margin-bottom: 24px;
    border: 1px solid #555; width: fit-content;
  `;
 
  const tabEls = {};
  tabs.forEach(tab => {
    const btn = tabBar.appendChild(document.createElement("button"));
    btn.textContent = tab.label;
    btn.style.cssText = `
      padding: 10px 28px; border: none; cursor: pointer;
      font-size: 0.88rem; font-family: inherit;
      color: ${TEXT_CLR}; background: ${TAB_IDLE};
      border-right: 1px solid #555; letter-spacing: 0.01em;
    `;
    tabEls[tab.key] = btn;
    btn.addEventListener("click", () => {
      activeTab = tab;
      setActiveTab(tab.key);
      renderChart();
    });
  });
  // Remove last border
  tabBar.lastChild.style.borderRight = "none";
 
  function setActiveTab(key) {
    Object.entries(tabEls).forEach(([k, btn]) => {
      btn.style.background = k === key ? TAB_ACT : TAB_IDLE;
      btn.style.color      = k === key ? "#fff"  : MUTED;
    });
  }
  setActiveTab("deaths");
 
  // ── Chart container ───────────────────────
  const chartDiv = wrapper.appendChild(document.createElement("div"));
 
  // ════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════
  const W  = 820;
  const M  = { top: 10, right: 80, bottom: 50, left: 190 };
  const iW = W - M.left - M.right;
  const ROW_H  = 46;   // height per bar row
  const BAR_H  = 22;   // bar thickness
 
  // Tooltip
  const tipEl = document.createElement("div");
  tipEl.style.cssText = `
    position: fixed; background: #111; color: #fff;
    padding: 8px 12px; border-radius: 4px; font-size: 11px;
    line-height: 1.6; pointer-events: none; z-index: 9999;
    box-shadow: 0 3px 10px rgba(0,0,0,0.5); display: none;
  `;
  document.body.appendChild(tipEl);
 
  function renderChart() {
    chartDiv.innerHTML = "";
 
    const cfg  = activeTab;
    const n    = wars.length;
    const iH   = n * ROW_H;
    const H    = iH + M.top + M.bottom;
 
    const svg = d3.select(chartDiv).append("svg")
      .attr("width", W).attr("height", H)
      .style("display", "block")
      .style("background", BG);
 
    const g = svg.append("g")
      .attr("transform", `translate(${M.left},${M.top})`);
 
    // ── Scales ──────────────────────────────
    const x = d3.scaleLinear()
      .domain([0, d3.max(wars, cfg.accessor) * 1.05])
      .range([0, iW]);
 
    const y = d3.scaleBand()
      .domain(wars.map(d => d.war))
      .range([0, iH])
      .padding(0.35);
 
    // ── Top border line ──────────────────────
    g.append("line")
      .attr("x1", 0).attr("x2", iW)
      .attr("y1", 0).attr("y2", 0)
      .attr("stroke", "#666").attr("stroke-width", 1);
 
    // ── Bottom border line ───────────────────
    g.append("line")
      .attr("x1", 0).attr("x2", iW)
      .attr("y1", iH).attr("y2", iH)
      .attr("stroke", "#666").attr("stroke-width", 1);
 
    // ── X axis ──────────────────────────────
    g.append("g")
      .attr("transform", `translate(0,${iH})`)
      .call(d3.axisBottom(x)
        .ticks(8)
        .tickFormat(cfg.axisFmt)
      )
      .call(ax => ax.select(".domain").remove())
      .call(ax => ax.selectAll(".tick line")
        .attr("stroke", "#555")
        .attr("y1", -iH)
        .attr("y2", 0))
      .call(ax => ax.selectAll("text")
        .style("font-size", "12px")
        .style("fill", MUTED));
 
    // ── X axis label ─────────────────────────
    g.append("text")
      .attr("x", iW / 2)
      .attr("y", iH + 42)
      .attr("text-anchor", "middle")
      .style("font-size", "13px")
      .style("fill", MUTED)
      .text(cfg.axisLabel);
 
    // ── Y axis (war names) ───────────────────
    g.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .call(ax => ax.select(".domain").remove())
      .call(ax => ax.selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "700")
        .style("fill", TEXT_CLR)
        .style("text-anchor", "end")
        .attr("dx", "-8px")
        .each(function(d) {
          // Word-wrap long war names
          const el   = d3.select(this);
          const words = d.split(/\s+/);
          if (words.length <= 2) return;
          el.text("");
          // split roughly in half
          const mid = Math.ceil(words.length / 2);
          const line1 = words.slice(0, mid).join(" ");
          const line2 = words.slice(mid).join(" ");
          el.append("tspan").attr("x", -8).attr("dy", "-0.5em").text(line1);
          el.append("tspan").attr("x", -8).attr("dy", "1.1em").text(line2);
        }));
 
    // ── Bars ─────────────────────────────────
    const barGroups = g.selectAll(".bar-group")
      .data(wars)
      .enter()
      .append("g")
      .attr("class", "bar-group")
      .attr("transform", d => `translate(0, ${y(d.war) + (y.bandwidth() - BAR_H) / 2})`);
 
    barGroups.append("rect")
      .attr("x", 0)
      .attr("width", d => Math.max(1, x(cfg.accessor(d))))
      .attr("height", BAR_H)
      .attr("fill", BAR_CLR)
      .on("mousemove", function(event, d) {
        tipEl.innerHTML = `
          <span style="color:#aaa">War:</span> ${d.war}<br>
          <span style="color:#aaa">Years:</span> ${d.years}<br>
          <span style="color:#aaa">Deaths per day:</span> ${d3.format(".2f")(d.perDay)}
        `;
        tipEl.style.display = "block";
        tipEl.style.left = (event.clientX + 14) + "px";
        tipEl.style.top  = (event.clientY - 14) + "px";
      })
      .on("mouseleave", () => { tipEl.style.display = "none"; });
 
    // ── Value labels ─────────────────────────
    barGroups.append("text")
      .attr("x", d => x(cfg.accessor(d)) + 5)
      .attr("y", BAR_H / 2)
      .attr("dy", "0.35em")
      .style("font-size", "11px")
      .style("fill", TEXT_CLR)
      .text(d => cfg.fmt(cfg.accessor(d)));
  }
 
  renderChart();
  return wrapper;
}


function _d3(require){return(
require("d3@7")
)}

function _data(FileAttachment){return(
FileAttachment("war.csv").csv({typed: true})
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["war.csv", {url: new URL("./files/94917c9c4468ce04221c11c44871a8af76add0d9250ca3fead3a37a738a077c85429ac3cf7ea3cb63feef81d6151addac659314f6efbb3f211566b9dbd93dbe9.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["data","d3"], _2);
  main.variable(observer("d3")).define("d3", ["require"], _d3);
  main.variable(observer("data")).define("data", ["FileAttachment"], _data);
  return main;
}
