function _1(md){return(
md`# Percent Change in Past Month Alcohol Use between 2011 and 2016 by State`
)}

async function _2(d3,data,topojson,invalidation)
{
  const width  = 960
  const height = 600

  // ── COLOR SCALE ─────────────────────────────────────────
  // Matches original: tan for negatives → white → blue for positives
  const minVal = -3.07
  const maxVal = 55.60

  const color = d3.scaleSequential()
    .domain([minVal, maxVal])
    .interpolator(t => {
      if (t < 0.05) return d3.interpolate("#D4A76A", "#f0e6d3")(t / 0.05)
      return d3.interpolateBlues((t - 0.05) / 0.95)
    })

  // Lookup map: state name → percentage
  const valueByState = new Map(data.map(d => [d.State, d.Percentage]))

  // ── TOOLTIP ──────────────────────────────────────────────
  const tooltip = d3.select("body").append("div")
    .style("position",       "fixed")
    .style("background",     "white")
    .style("border",         "1px solid #ccc")
    .style("border-radius",  "3px")
    .style("padding",        "10px 14px")
    .style("font-family",    "sans-serif")
    .style("font-size",      "13px")
    .style("pointer-events", "none")
    .style("display",        "none")
    .style("box-shadow",     "2px 2px 6px rgba(0,0,0,0.15)")
    .style("line-height",    "1.8")

  // ── SVG ──────────────────────────────────────────────────
  const svg = d3.create("svg")
    .attr("width",  width)
    .attr("height", height)
    .style("background", "#f5f5f5")

  // ── FETCH TOPOLOGY ───────────────────────────────────────
  const us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")

  const stateName = new Map()
  us.objects.states.geometries.forEach(g => {
    stateName.set(g.id, g.properties.name)
  })

  const projection = d3.geoAlbersUsa()
    .scale(1280)
    .translate([width / 2, height / 2])

  const path = d3.geoPath().projection(projection)
  const features = topojson.feature(us, us.objects.states).features

  // ── DRAW STATES ──────────────────────────────────────────
  svg.selectAll("path")
    .data(features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const name = stateName.get(d.id)
      const val  = valueByState.get(name)
      return val != null
        ? color(val)
        : "#ddd"   // states not in data
    })
    .attr("stroke",       "#fff")
    .attr("stroke-width", 0.8)
    .on("mousemove", function(event, d) {
      const name = stateName.get(d.id)
      const val  = valueByState.get(name)
      if (!name) return
      d3.select(this).attr("stroke", "#222").attr("stroke-width", 1.5)
      tooltip
        .style("display", "block")
        .style("left", (event.clientX + 14) + "px")
        .style("top",  (event.clientY - 10) + "px")
        .html(`
          <span style="color:#555">State:</span>
          <strong style="margin-left:8px">${name}</strong><br>
          <span style="color:#555">Percent change:</span>
          <strong style="margin-left:8px">${val != null ? val.toFixed(2) : "N/A"}</strong>
        `)
    })
    .on("mouseleave", function() {
      d3.select(this).attr("stroke", "#fff").attr("stroke-width", 0.8)
      tooltip.style("display", "none")
    })

  // ── LEGEND ───────────────────────────────────────────────
  const legendW = 200
  const legendH = 12
  const legendX = width - legendW - 20
  const legendY = 30

  const defs = svg.append("defs")
  const grad = defs.append("linearGradient").attr("id", "legend-grad")
  const steps = 20
  d3.range(steps + 1).forEach(i => {
    const t   = i / steps
    const val = minVal + t * (maxVal - minVal)
    grad.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", color(val))
  })

  const lg = svg.append("g").attr("transform", `translate(${legendX},${legendY})`)

  lg.append("text")
    .attr("x", 0).attr("y", -6)
    .attr("font-family", "sans-serif")
    .attr("font-size", 12)
    .attr("fill", "#333")
    .attr("font-weight", "600")
    .text("Percent change")

  lg.append("rect")
    .attr("width", legendW).attr("height", legendH)
    .attr("fill", "url(#legend-grad)")

  lg.append("text")
    .attr("x", 0).attr("y", legendH + 14)
    .attr("font-family", "sans-serif").attr("font-size", 11).attr("fill", "#555")
    .text(minVal.toFixed(2))

  lg.append("text")
    .attr("x", legendW).attr("y", legendH + 14)
    .attr("text-anchor", "end")
    .attr("font-family", "sans-serif").attr("font-size", 11).attr("fill", "#555")
    .text(maxVal.toFixed(2))


  invalidation.then(() => tooltip.remove())
  return svg.node()
}


function _d3(require){return(
require("d3@7")
)}

function _topojson(require){return(
require("topojson-client@3")
)}

function _data(FileAttachment){return(
FileAttachment("final_states-2.csv").csv({ typed: true })
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["final_states-2.csv", {url: new URL("./files/ad86488943869abc7d203c9e5e0347e9abe21fc31451d7168eeaa3de58411df9f69228f7bfc7331ff5b383bd175b52a872e1df0891b404793f3ec25b53edf20e.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["d3","data","topojson","invalidation"], _2);
  main.variable(observer("d3")).define("d3", ["require"], _d3);
  main.variable(observer("topojson")).define("topojson", ["require"], _topojson);
  main.variable(observer("data")).define("data", ["FileAttachment"], _data);
  return main;
}
