function _1(md){return(
md`# Percent of D.C. Workers Who Are Immigrants, by Occupation`
)}

function _2(data,d3)
{
  // ════════════════════════════════════════════
  //  PARSE
  // ════════════════════════════════════════════
  const allData = data.map(d => ({
    occupation: d["Occupation Name"],
    wage:       d["Wage"],
    pct:        +d["Percent Immigrants"],
    total:      +d["Total Workers"],
    immigrants: +d["Number of Immigrants"],
  })).sort((a, b) => b.pct - a.pct);  // sorted descending by %
 
  const occupations = [...new Set(allData.map(d => d.occupation))].sort();
 
  // ════════════════════════════════════════════
  //  COLOR MAP
  // ════════════════════════════════════════════
  const wageColor = {
    "Low-wage job":    "#f5d44a",
    "Middle-wage job": "#7ec8c0",
    "High-wage job":   "#2d7a7a"
  };
 
  // ════════════════════════════════════════════
  //  STATE
  // ════════════════════════════════════════════
  let selectedWage       = "(All)";
  let selectedOccupation = "(All)";
 
  // ════════════════════════════════════════════
  //  WRAPPER
  // ════════════════════════════════════════════
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background: #fff; color: #222;
    max-width: 980px; box-sizing: border-box;
    padding: 8px 0;
  `;
 
  // ── Title ─────────────────────────────────
  const title = wrapper.appendChild(document.createElement("h2"));
  title.style.cssText = "font-size:1.3rem;font-weight:700;margin:0 0 4px;color:#111;";
  title.textContent = "Percent of D.C. Workers Who Are Immigrants, by Occupation";
 
  const sub = wrapper.appendChild(document.createElement("p"));
  sub.style.cssText = "font-size:0.88rem;font-style:italic;color:#555;margin:0 0 14px;";
  sub.textContent = "80% of carpenters and 78% of maids and housekeepers working in D.C. are immigrants";
 
  // ── Legend ────────────────────────────────
  const legendRow = wrapper.appendChild(document.createElement("div"));
  legendRow.style.cssText = "display:flex;gap:24px;margin-bottom:12px;align-items:center;";
  Object.entries(wageColor).forEach(([label, color]) => {
    const item = legendRow.appendChild(document.createElement("div"));
    item.style.cssText = "display:flex;align-items:center;gap:6px;font-size:0.82rem;color:#333;";
    const sw = item.appendChild(document.createElement("span"));
    sw.style.cssText = `display:inline-block;width:22px;height:14px;background:${color};border-radius:2px;`;
    item.appendChild(document.createTextNode(label));
  });
 
  // ── Main layout: chart + sidebar ──────────
  const layout = wrapper.appendChild(document.createElement("div"));
  layout.style.cssText = "display:flex;gap:32px;align-items:flex-start;";
 
  // Chart area (scrollable)
  const chartWrap = layout.appendChild(document.createElement("div"));
  chartWrap.style.cssText = "flex:1;min-width:0;";
 
  const chartDiv = chartWrap.appendChild(document.createElement("div"));
  chartDiv.style.cssText = "overflow-y:auto;max-height:680px;border:1px solid #ddd;";
 
  // Sidebar
  const sidebar = layout.appendChild(document.createElement("div"));
  sidebar.style.cssText = "flex-shrink:0;width:180px;padding-top:4px;";
 
  // FILTER BY label
  const filterLabel = sidebar.appendChild(document.createElement("p"));
  filterLabel.style.cssText = "font-size:0.82rem;font-weight:700;color:#333;margin:0 0 8px;letter-spacing:0.05em;";
  filterLabel.textContent = "FILTER BY:";
 
  // Wage radio group
  const wageLabel = sidebar.appendChild(document.createElement("p"));
  wageLabel.style.cssText = "font-size:0.88rem;font-weight:700;margin:0 0 6px;";
  wageLabel.textContent = "Wage";
 
  const wageOptions = ["(All)", "High-wage job", "Low-wage job", "Middle-wage job"];
  const wageRadios  = {};
  wageOptions.forEach(opt => {
    const row = sidebar.appendChild(document.createElement("label"));
    row.style.cssText = "display:flex;align-items:center;gap:6px;font-size:0.83rem;color:#333;margin-bottom:5px;cursor:pointer;";
    const radio = row.appendChild(document.createElement("input"));
    radio.type  = "radio";
    radio.name  = "wage";
    radio.value = opt;
    radio.style.cursor = "pointer";
    if (opt === "(All)") radio.checked = true;
    row.appendChild(document.createTextNode(opt));
    wageRadios[opt] = radio;
    radio.addEventListener("change", () => {
      selectedWage = opt;
      // Reset occupation when wage changes
      selectedOccupation = "(All)";
      occSelect.value = "(All)";
      render();
    });
  });
 
  // Occupation dropdown
  const occLabel = sidebar.appendChild(document.createElement("p"));
  occLabel.style.cssText = "font-size:0.88rem;font-weight:700;margin:14px 0 6px;";
  occLabel.textContent = "Occupation";
 
  const occSelect = sidebar.appendChild(document.createElement("select"));
  occSelect.style.cssText = `
    width:100%;padding:6px 8px;border:1px solid #aaa;
    border-radius:2px;font-size:0.82rem;font-family:inherit;
    background:#fff;cursor:pointer;
  `;
 
  // Populate occupation dropdown
  function populateOccupations(filtered) {
    occSelect.innerHTML = "";
    const visibleOccs = ["(All)", ...filtered.map(d => d.occupation)];
    visibleOccs.forEach(occ => {
      const o = occSelect.appendChild(document.createElement("option"));
      o.value = occ; o.textContent = occ.length > 28 ? occ.slice(0,28)+"…" : occ;
      if (occ === selectedOccupation) o.selected = true;
    });
  }
 
  occSelect.addEventListener("change", () => {
    selectedOccupation = occSelect.value;
    render();
  });
 
  // ── Notes ─────────────────────────────────
  const notes = wrapper.appendChild(document.createElement("p"));
  notes.style.cssText = "font-size:0.75rem;color:#666;margin-top:14px;line-height:1.5;";
  notes.innerHTML = `Note: "Immigrants" include naturalized U.S. citizens and non-citizens. "High-wage workers" are people in occupations with median wages in the top 25% in DC, "low-wage workers" are people in occupations with median wages in the bottom 25%, and "middle-wage workers" have wages in the middle.<br>Data Source: 2015 ACS PUMS (1-yr) and 2015 BLS Occupational Employment Statistics Survey`;
 
  const source = wrapper.appendChild(document.createElement("p"));
  source.style.cssText = "font-size:0.75rem;font-weight:700;color:#555;margin-top:8px;letter-spacing:0.05em;";
  source.textContent = "DISTRICTMEASURED.COM";
 
  // ════════════════════════════════════════════
  //  TOOLTIP
  // ════════════════════════════════════════════
  const tipEl = document.createElement("div");
  tipEl.style.cssText = `
    position:fixed;background:#222;color:#fff;padding:9px 13px;
    border-radius:4px;font-size:11px;line-height:1.7;pointer-events:none;
    z-index:9999;box-shadow:0 3px 12px rgba(0,0,0,0.3);display:none;min-width:180px;
  `;
  document.body.appendChild(tipEl);
 
  // ════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════
  const M   = { top: 4, right: 56, bottom: 4, left: 186 };
  const W   = 580;
  const iW  = W - M.left - M.right;
  const ROW = 26;
  const BAR = 18;
 
  function filteredData() {
    return allData
      .filter(d => selectedWage === "(All)"       || d.wage === selectedWage)
      .filter(d => selectedOccupation === "(All)" || d.occupation === selectedOccupation);
  }
 
  function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + ".." : str;
  }
 
  function render() {
    chartDiv.innerHTML = "";
    const filtered = filteredData();
    populateOccupations(
      allData.filter(d => selectedWage === "(All)" || d.wage === selectedWage)
    );
 
    if (!filtered.length) {
      chartDiv.innerHTML = `<p style="padding:20px;color:#999;">No data for this selection.</p>`;
      return;
    }
 
    const n  = filtered.length;
    const iH = n * ROW;
    const H  = iH + M.top + M.bottom;
 
    const svg = d3.select(chartDiv).append("svg")
      .attr("width", W).attr("height", H)
      .style("display", "block").style("background", "#fff");
 
    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);
 
    // Scales
    const x = d3.scaleLinear().domain([0, 1]).range([0, iW]);
    const y = d3.scaleBand()
      .domain(filtered.map(d => d.occupation))
      .range([0, iH])
      .padding(0.18);
 
    // Light horizontal row stripes
    filtered.forEach((d, i) => {
      g.append("rect")
        .attr("x", 0).attr("width", iW)
        .attr("y", y(d.occupation))
        .attr("height", y.bandwidth())
        .attr("fill", i % 2 === 0 ? "#fafafa" : "#fff");
    });
 
    // Top border
    g.append("line").attr("x1",0).attr("x2",iW).attr("y1",0).attr("y2",0)
      .attr("stroke","#ccc").attr("stroke-width",1);
    // Bottom border
    g.append("line").attr("x1",0).attr("x2",iW).attr("y1",iH).attr("y2",iH)
      .attr("stroke","#ccc").attr("stroke-width",1);
 
    // Bars
    const barG = g.selectAll(".bar-g")
      .data(filtered).enter()
      .append("g").attr("class","bar-g")
      .attr("transform", d => `translate(0, ${y(d.occupation) + (y.bandwidth()-BAR)/2})`);
 
    barG.append("rect")
      .attr("x", 0)
      .attr("width", d => x(d.pct))
      .attr("height", BAR)
      .attr("fill", d => wageColor[d.wage])
      .on("mousemove", function(event, d) {
        tipEl.innerHTML = `
          <span style="color:#bbb">Occupation Name:</span>${d.occupation}<br>
          <span style="color:#bbb">Wage:</span> ${d.wage}<br>
          <span style="color:#bbb">Percent Immigrants:</span> ${d3.format(".0%")(d.pct)}<br>
          <span style="color:#bbb">Number of Immigrants:</span> ${d3.format(",")(d.immigrants)}
        `;
        tipEl.style.display = "block";
        tipEl.style.left = (event.clientX + 14) + "px";
        tipEl.style.top  = (event.clientY - 14) + "px";
      })
      .on("mouseleave", () => { tipEl.style.display = "none"; });
 
    // % label to the right of bar
    barG.append("text")
      .attr("x", d => x(d.pct) + 4)
      .attr("y", BAR / 2)
      .attr("dy", "0.35em")
      .style("font-size", "11px")
      .style("fill", "#444")
      .text(d => d3.format(".0%")(d.pct));
 
    // Y axis — occupation names (bold, right-aligned, truncated)
    g.append("g")
      .call(d3.axisLeft(y).tickSize(0)
        .tickFormat(d => truncate(d, 22)))
      .call(ax => ax.select(".domain").remove())
      .call(ax => ax.selectAll("text")
        .style("font-size", "11.5px")
        .style("font-weight", "700")
        .style("fill", "#222")
        .style("text-anchor", "end")
        .attr("dx", "-6px"));
  }
 
  render();
  return wrapper;
}


function _d3(require){return(
require("d3@7")
)}

function _data(FileAttachment){return(
FileAttachment("workers.csv").csv({ typed: true })
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["workers.csv", {url: new URL("./files/899584d54db2b20a3c2bbae35b5a9636cb3303fb65fef5daa2a9ee27c361ae00397d8206a8c9beae7926ac5ad7d8f072ed12e2b53bdddd331fa13c502b0969f3.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["data","d3"], _2);
  main.variable(observer("d3")).define("d3", ["require"], _d3);
  main.variable(observer("data")).define("data", ["FileAttachment"], _data);
  return main;
}
