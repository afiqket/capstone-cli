function _1(md){return(
md`# Dublin Stats`
)}

function _2(d3,data,html,invalidation)
{
  // ── CONFIG ───────────────────────────────────────────────
  const measureColors = {
    "Requests in":   "#b2dfb2",
    "Transfers in":  "#2d6a2d",
    "Requests out":  "#e8c840",
    "Transfers out": "#e05050"
  }
  const measures = ["Requests in","Transfers in","Requests out","Transfers out"]
  const years    = d3.range(2008, 2021)
  const countries = [...new Set(data.map(d => d.country))].sort()

  // ── STATE ────────────────────────────────────────────────
  let country1 = countries[0]
  let country2 = countries[1] || countries[0]
  let measure1 = "(All)"
  let measure2 = "(All)"

  // ── TOOLTIP ──────────────────────────────────────────────
  const tip = d3.select("body").append("div")
    .style("position","fixed").style("background","white")
    .style("border","1px solid #ccc").style("border-radius","4px")
    .style("padding","8px 12px").style("font-size","12px")
    .style("pointer-events","none").style("display","none")
    .style("box-shadow","2px 2px 6px rgba(0,0,0,0.2)")
    .style("line-height","1.8")

  // ── CHART HELPER ─────────────────────────────────────────
  function makeChart(country, measureFilter) {
    const W = 460, H = 340
    const m = { top: 20, right: 20, bottom: 40, left: 70 }
    const iW = W - m.left - m.right
    const iH = H - m.top  - m.bottom

    const activeMeasures = measureFilter === "(All)" ? measures : [measureFilter]

    // Filter data for this country + measures
    const chartData = {}
    activeMeasures.forEach(ms => {
      chartData[ms] = data
        .filter(d => d.country === country && d.measure === ms)
        .sort((a, b) => a.year - b.year)
    })

    // Y domain across all active measures
    const allVals = Object.values(chartData).flat().map(d => d.value).filter(v => v != null && !isNaN(v))
    const yMax = d3.max(allVals) * 1.1 || 1

    const xScale = d3.scaleLinear().domain([2008, 2020]).range([0, iW])
    const yScale = d3.scaleLinear().domain([0, yMax]).range([iH, 0])

    const svg = d3.create("svg").attr("width", W).attr("height", H)
      .style("font-family","sans-serif")
    const g = svg.append("g").attr("transform",`translate(${m.left},${m.top})`)

    // Gridlines
    g.append("g").selectAll("line")
      .data(yScale.ticks(5)).join("line")
      .attr("x1",0).attr("x2",iW)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke","#e8e8e8").attr("stroke-width",1)

    // Lines + dots per measure
    activeMeasures.forEach(ms => {
      const pts = chartData[ms]
      if (!pts.length) return
      const color = measureColors[ms]

      // Split into segments at NaN gaps
      const segments = []
      let seg = []
      pts.forEach(d => {
        if (d.value != null && !isNaN(d.value)) {
          seg.push(d)
        } else {
          if (seg.length > 1) segments.push(seg)
          seg = []
        }
      })
      if (seg.length > 1) segments.push(seg)

      const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX)

      segments.forEach(s => {
        g.append("path").datum(s)
          .attr("fill","none")
          .attr("stroke", color)
          .attr("stroke-width", 1.8)
          .attr("d", line)
      })

      // Dots
      pts.filter(d => d.value != null && !isNaN(d.value)).forEach(d => {
        g.append("circle")
          .attr("cx", xScale(d.year))
          .attr("cy", yScale(d.value))
          .attr("r", 3)
          .attr("fill", color)
          .on("mousemove", function(event) {
            tip.style("display","block")
              .style("left",(event.clientX+14)+"px")
              .style("top",(event.clientY-10)+"px")
              .html(`<strong>${country}</strong><br>
                <span style="color:#555">${ms}:</span>
                <strong>${d3.format(",")(d.value)}</strong><br>
                <span style="color:#555">Year:</span> ${d.year}`)
          })
          .on("mouseleave", () => tip.style("display","none"))
      })
    })

    // X axis
    g.append("g").attr("transform",`translate(0,${iH})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).tickValues(years))
      .call(ax => ax.select(".domain").attr("stroke","#aaa"))
      .call(ax => ax.selectAll(".tick line").attr("stroke","#aaa"))
      .selectAll("text").attr("transform","rotate(-45)").attr("text-anchor","end").attr("dy","0.5em")

    // Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => d >= 1000 ? `${d3.format(",")(d)}` : d))
      .call(ax => ax.select(".domain").remove())
      .call(ax => ax.selectAll(".tick line").remove())

    // Y label
    g.append("text").attr("transform","rotate(-90)")
      .attr("x",-iH/2).attr("y",-58)
      .attr("text-anchor","middle").attr("font-size",11).attr("fill","#555")
      .text("Number of requests or transfers")

    return svg.node()
  }

  // ── SELECTS ──────────────────────────────────────────────
  function makeSelect(label, options, current, onChange) {
    const wrap = html`<div style="display:flex;flex-direction:column;gap:4px;
      font-family:sans-serif;font-size:13px"></div>`
    wrap.append(html`<label style="font-weight:600;color:#333">${label}</label>`)
    const sel = html`<select style="padding:6px 8px;border:1px solid #bbb;
      border-radius:3px;font-size:13px;min-width:280px">
      ${options.map(o => `<option ${o===current?"selected":""}>${o}</option>`).join("")}
    </select>`
    sel.addEventListener("change", e => { onChange(e.target.value); redraw() })
    wrap.append(sel)
    return wrap
  }

  // ── LEGEND ───────────────────────────────────────────────
  const legendDiv = html`<div style="display:flex;flex-wrap:wrap;gap:16px;
    font-family:sans-serif;font-size:12px;margin-top:16px"></div>`
  measures.forEach(ms => {
    legendDiv.append(html`<div style="display:flex;align-items:center;gap:6px">
      <span style="width:28px;height:3px;background:${measureColors[ms]};display:inline-block"></span>
      <span style="color:#333">${ms}</span>
    </div>`)
  })

  // ── CHARTS CONTAINER ─────────────────────────────────────
  const chartsRow = html`<div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:16px"></div>`
  const chart1Div = html`<div></div>`
  const chart2Div = html`<div></div>`
  chartsRow.append(chart1Div, chart2Div)

  function redraw() {
    chart1Div.innerHTML = ""
    chart2Div.innerHTML = ""
    chart1Div.append(makeChart(country1, measure1))
    chart2Div.append(makeChart(country2, measure2))
  }

  // ── CONTROLS ─────────────────────────────────────────────
  const ctrl1 = html`<div style="display:flex;flex-direction:column;gap:10px"></div>`
  ctrl1.append(
    makeSelect("Select Country 1:", countries, country1, v => country1 = v),
    makeSelect("Select measure:", ["(All)",...measures], measure1, v => measure1 = v)
  )
  const ctrl2 = html`<div style="display:flex;flex-direction:column;gap:10px"></div>`
  ctrl2.append(
    makeSelect("Select Country 2:", countries, country2, v => country2 = v),
    makeSelect("Select measure:", ["(All)",...measures], measure2, v => measure2 = v)
  )
  const ctrlRow = html`<div style="display:flex;gap:48px;flex-wrap:wrap;margin-bottom:8px"></div>`
  ctrlRow.append(ctrl1, ctrl2)

  redraw()

  const root = html`<div style="font-family:sans-serif;max-width:980px">
    <h3 style="font-size:16px;font-weight:700;margin-bottom:2px">
      Number of Dublin requests and transfers, in and out, per year, 2008 to 2020</h3>
    <p style="font-size:13px;color:#555;margin-bottom:16px">
      For the EU+ and UK; breaks in the series indicate missing data</p>
  </div>`
  root.append(ctrlRow, chartsRow, legendDiv)

  invalidation.then(() => tip.remove())
  return root
}


function _d3(require){return(
require("d3@7")
)}

function _data(FileAttachment){return(
FileAttachment("dublin_data.csv").csv({ typed: true })
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["dublin_data.csv", {url: new URL("./files/c17853a64279c6ad17bf1979e9f856cae7e2b05be2954859372bf041684ed65803d67c181c68e25a6ce6585d6a53c910689a427f0c6a0dc862dc62b4d2a6d2e7.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["d3","data","html","invalidation"], _2);
  main.variable(observer("d3")).define("d3", ["require"], _d3);
  main.variable(observer("data")).define("data", ["FileAttachment"], _data);
  return main;
}
