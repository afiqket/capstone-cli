function _1(md){return(
md`# Traffic-citations`
)}

function _2(data,d3)
{
  const raw = data.map(d => ({
  q:     d["Quarter of Quarter"],
  qoy:   +d["QuarterOfYear"],
  label: d["Label"],
  speed: +String(d["Speeding violations"]).replace(/,/g, ""),
  total: +String(d["Total violations"]).replace(/,/g, ""),
  pct:   +String(d["Percentage speeding of total violations"]).replace("%", "") / 100,
  date:  new Date(d["Quarter"])
})).sort((a, b) => a.date - b.date);

const avgTotal = d3.mean(raw, d => d.total);
const avgSpeed = d3.mean(raw, d => d.speed);
const avgPct   = d3.mean(raw, d => d.pct);
  
  let selectedQoY = "All";
 
  // ════════════════════════════════════════════
  //  WRAPPER
  // ════════════════════════════════════════════
  const wrapper = document.createElement("div");
  //wrapper.style.cssText = "font-family:'Helvetica Neue',Arial,sans-serif;background:#

//fff;max-width:900px;color:#222;";
 
  // ── Top controls ──────────────────────────
  const topRow = wrapper.appendChild(document.createElement("div"));
  topRow.style.cssText = "display:flex;align-items:flex-start;gap:40px;margin-bottom:16px;padding:10px 0;";
 
  const desc = topRow.appendChild(document.createElement("p"));
  desc.style.cssText = "margin:0;font-size:0.88rem;color:#444;line-height:1.5;max-width:340px;";
  desc.textContent = "Choose a quarter to see only the number of traffic citations issued by the Madison Police Department during those three months each year.";
 
  const ctrlRight = topRow.appendChild(document.createElement("div"));
  ctrlRight.style.cssText = "display:flex;gap:32px;align-items:flex-start;";
 
  // Quarter dropdown
  const qGroup = ctrlRight.appendChild(document.createElement("div"));
  qGroup.style.cssText = "display:flex;flex-direction:column;gap:4px;";
  const qLabel = qGroup.appendChild(document.createElement("label"));
  qLabel.textContent = "Quarter of year";
  qLabel.style.cssText = "font-size:0.82rem;font-weight:700;color:#222;";
  const qSelect = qGroup.appendChild(document.createElement("select"));
  qSelect.style.cssText = `padding:6px 28px 6px 8px;border:1px solid #aaa;border-radius:2px;
    font-size:0.88rem;font-family:inherit;background:#fff;cursor:pointer;min-width:140px;`;
  [["All","(All)"],["1","Q1 — Jan–Mar"],["2","Q2 — Apr–Jun"],
   ["3","Q3 — Jul–Sep"],["4","Q4 — Oct–Dec"]].forEach(([val, lbl]) => {
    const o = qSelect.appendChild(document.createElement("option"));
    o.value = val; o.textContent = lbl;
  });
 
  // Legend
  const legend = ctrlRight.appendChild(document.createElement("div"));
  legend.style.cssText = "display:flex;flex-direction:column;gap:6px;padding-top:20px;";
  [["#e07b39","Total violations"],["#4e87c4","Speeding violations"]].forEach(([color, lbl]) => {
    const item = legend.appendChild(document.createElement("div"));
    item.style.cssText = "display:flex;align-items:center;gap:8px;font-size:0.82rem;";
    const sw = item.appendChild(document.createElement("span"));
    sw.style.cssText = `display:inline-block;width:18px;height:18px;background:${color};border-radius:2px;flex-shrink:0;`;
    item.appendChild(document.createTextNode(lbl));
  });
 
  // ── Chart titles + containers ──────────────
  const t1 = wrapper.appendChild(document.createElement("p"));
  t1.style.cssText = "font-weight:700;font-size:1rem;margin:0 0 4px;";
  t1.textContent = "Traffic citations issued by the Madison Police Department by quarter since 2003";
  const chartDiv1 = wrapper.appendChild(document.createElement("div"));
 
  const t2 = wrapper.appendChild(document.createElement("p"));
  t2.style.cssText = "font-weight:700;font-size:1rem;margin:20px 0 4px;";
  t2.textContent = "Percentage of total traffic citations from speeding by quarter";
  const chartDiv2 = wrapper.appendChild(document.createElement("div"));
 
  const src = wrapper.appendChild(document.createElement("p"));
  src.style.cssText = "font-size:0.78rem;color:#444;margin-top:14px;";
  src.innerHTML = "<strong>Source:</strong> Madison Police Department presentations to Madison's Pedestrian, Bicycle and Motor Vehicle Commission";
 
  // ════════════════════════════════════════════
  //  TOOLTIP (shared, fixed position)
  // ════════════════════════════════════════════
  const tipEl = document.createElement("div");
  tipEl.style.cssText = `position:fixed;background:#1a252f;color:#fff;padding:8px 12px;
    border-radius:4px;font-size:11px;line-height:1.7;pointer-events:none;
    z-index:9999;box-shadow:0 3px 10px rgba(0,0,0,0.3);display:none;`;
  document.body.appendChild(tipEl);
 
  // ════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════
  const W = 780;
  const M = { top: 18, right: 72, bottom: 38, left: 58 };
  const iW = W - M.left - M.right;
 
  function qToDate(q) {
    const [yr, qstr] = q.split(" ");
    return new Date(+yr, (+qstr.replace("Q","") - 1) * 3, 1);
  }
 
  function filteredData() {
    return selectedQoY === "All" ? raw : raw.filter(d => d.qoy === +selectedQoY);
  }
 
  function xAxis(g, x, iH, data) {
    const ticks = (selectedQoY === "All")
      ? data.filter(d => d.qoy === 1).map(d => qToDate(d.q))
      : data.map(d => qToDate(d.q));
    const fmt = selectedQoY === "All"
      ? d => `${d.getFullYear()} Q1`
      : d => `${d.getFullYear()} Q${selectedQoY}`;
    g.append("g")
      .attr("transform",`translate(0,${iH})`)
      .call(d3.axisBottom(x).tickValues(ticks).tickFormat(fmt))
      .call(ax => ax.select(".domain").attr("stroke","#ccc"))
      .call(ax => ax.selectAll(".tick line").remove())
      .selectAll("text").style("font-size","11px").style("fill","#555");
  }
 
  function addHover(svg, g, x, iH, data, htmlFn) {
    const bisect = d3.bisector(d => qToDate(d.q)).left;
    const vLine  = g.append("line").attr("stroke","#aaa").attr("stroke-width",1)
      .attr("stroke-dasharray","3").attr("y1",0).attr("y2",iH).style("opacity",0);
 
    svg.append("rect")
      .attr("transform",`translate(${M.left},${M.top})`)
      .attr("width",iW).attr("height",iH)
      .attr("fill","none").attr("pointer-events","all")
      .on("mousemove", function(event) {
        const [mx] = d3.pointer(event);
        const t = x.invert(mx);
        const i = bisect(data, t, 1);
        const d0 = data[i-1] || data[0];
        const d1 = data[i]   || d0;
        const d  = Math.abs(t - qToDate(d0.q)) <= Math.abs(t - qToDate(d1.q)) ? d0 : d1;
        vLine.attr("x1",x(qToDate(d.q))).attr("x2",x(qToDate(d.q))).style("opacity",1);
        tipEl.innerHTML = htmlFn(d);
        tipEl.style.display = "block";
        tipEl.style.left = (event.clientX + 14) + "px";
        tipEl.style.top  = (event.clientY - 14) + "px";
      })
      .on("mouseleave", () => { vLine.style("opacity",0); tipEl.style.display="none"; });
  }
 
  function drawLine(g, x, y, data, accessor, color) {
    const pts = data.map(d => ({ date: qToDate(d.q), v: accessor(d) }));
    g.append("path").datum(pts)
      .attr("fill","none").attr("stroke",color).attr("stroke-width",2)
      .attr("d", d3.line().x(d=>x(d.date)).y(d=>y(d.v)));
    g.selectAll(null).data(pts).enter().append("circle")
      .attr("cx",d=>x(d.date)).attr("cy",d=>y(d.v))
      .attr("r",3).attr("fill",color).attr("stroke","#fff").attr("stroke-width",1.5);
  }
 

  function avgLine(g, x, y, iW, val, data, accessor, labelLeft, labelRight) {
  const yv = y(val);
  g.append("line").attr("x1",0).attr("x2",iW)
    .attr("y1",yv).attr("y2",yv).attr("stroke","#999").attr("stroke-width",1);

  // For a given x position, get the y pixel value of the data line there
  // and decide if the label should go above or below the average line
  function placeLabel(xPos) {
    // Find the data point closest to this x pixel position
    const date    = x.invert(xPos);
    const bisect  = d3.bisector(d => d.date).left;
    const i       = bisect(data, date, 1);
    const nearest = data[i - 1] || data[0];
    const dataY   = y(accessor(nearest));  // pixel y of the data line near the label

    // If data line is above the avg line (smaller y pixel = higher on screen),
    // put label below. Otherwise put it above.
    const below = dataY < yv;
    g.append("text")
      .attr("x", xPos)
      .attr("y", below ? yv + 12 : yv - 4)
      .style("font-size","11px")
      .style("fill","#555")
      .text("Average");
  }

  if (labelLeft)  placeLabel(4);
  if (labelRight) placeLabel(iW + 4);
}
  avgLine
 
  // ════════════════════════════════════════════
  //  CHART 1 — Total & Speeding counts
  // ════════════════════════════════════════════
  function renderChart1(data) {
    chartDiv1.innerHTML = "";
    const H = 280, iH = H - M.top - M.bottom;
    const svg = d3.select(chartDiv1).append("svg").attr("width",W).attr("height",H).style("display","block");
    const g   = svg.append("g").attr("transform",`translate(${M.left},${M.top})`);
 
    const x = d3.scaleTime().domain(d3.extent(data, d => qToDate(d.q))).range([0,iW]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.total)*1.08]).range([iH,0]).nice();
 
    g.append("g").call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(""))
      .call(gg=>gg.select(".domain").remove())
      .call(gg=>gg.selectAll(".tick line").attr("stroke","#e5e5e5"));
 
    xAxis(g, x, iH, data);
 
    g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",")))
      .call(ax=>ax.select(".domain").remove())
      .call(ax=>ax.selectAll(".tick line").remove())
      .selectAll("text").style("font-size","11px").style("fill","#555");
 

    // Chart 1 — Total
    avgLine(g, x, y, iW, avgTotal, data, d => d.total, false, true);
    // Chart 1 — Speeding  
    avgLine(g, x, y, iW, avgSpeed, data, d => d.speed, true, false);

 
    drawLine(g, x, y, data, d => d.total, "#e07b39");
    drawLine(g, x, y, data, d => d.speed, "#4e87c4");
 
    addHover(svg, g, x, iH, data, d =>
      `<strong style="color:#fff">${d.label}</strong><br>
       <span style="color:#e07b39">■</span> Total: ${d3.format(",")(d.total)}<br>
       <span style="color:#4e87c4">■</span> Speeding: ${d3.format(",")(d.speed)}`
    );
  }
 
  // ════════════════════════════════════════════
  //  CHART 2 — % speeding
  // ════════════════════════════════════════════
  function renderChart2(data) {
    chartDiv2.innerHTML = "";
    const H = 230, iH = H - M.top - M.bottom;
    const svg = d3.select(chartDiv2).append("svg").attr("width",W).attr("height",H).style("display","block");
    const g   = svg.append("g").attr("transform",`translate(${M.left},${M.top})`);
 
    const x = d3.scaleTime().domain(d3.extent(data, d => qToDate(d.q))).range([0,iW]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.pct)*1.1]).range([iH,0]).nice();
 
    g.append("g").call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(""))
      .call(gg=>gg.select(".domain").remove())
      .call(gg=>gg.selectAll(".tick line").attr("stroke","#e5e5e5"));
 
    xAxis(g, x, iH, data);
 
    g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d => d3.format(".1%")(d)))
      .call(ax=>ax.select(".domain").remove())
      .call(ax=>ax.selectAll(".tick line").remove())
      .selectAll("text").style("font-size","11px").style("fill","#555");
 
    
    avgLine(g, x, y, iW, avgPct, data, d => d.pct, true, false);
    drawLine(g, x, y, data, d => d.pct, "#3ba37c");
 
    addHover(svg, g, x, iH, data, d =>
      `<strong style="color:#fff">${d.label}</strong><br>
       <span style="color:#3ba37c">■</span> Speeding %: ${d3.format(".1%")(d.pct)}<br>
       Speeding: ${d3.format(",")(d.speed)} / Total: ${d3.format(",")(d.total)}`
    );
  }
 
  // ════════════════════════════════════════════
  //  WIRE UP & INIT
  // ════════════════════════════════════════════
  function render() {
    const data = filteredData();
    renderChart1(data);
    renderChart2(data);
  }
 
  qSelect.addEventListener("change", () => { selectedQoY = qSelect.value; render(); });
  render();
  return wrapper;
}


function _data(FileAttachment){return(
FileAttachment("traffic.csv").csv({typed: true})
)}

function _d3(require){return(
require("d3@7")
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["traffic.csv", {url: new URL("./files/1d58678cdf1d2e9ebec37ee121a7a31f873d96d21ba81108b037f86c2bf84975b9f4c704e440d4cd3d01b70c5c0e28c6613348150b6fd5e740f69d6ee7b98ccf.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["data","d3"], _2);
  main.variable(observer("data")).define("data", ["FileAttachment"], _data);
  main.variable(observer("d3")).define("d3", ["require"], _d3);
  return main;
}
