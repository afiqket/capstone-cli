function _1(md){return(
md`# Geography of Educational Attainment in California`
)}

async function _2(d3,data,topojson,html,invalidation)
{
  const colors = {
    scale: d3.scaleThreshold()
      .domain([15, 30, 45, 60])
      .range(["#e8e0ef", "#c2afd4", "#9975b9", "#6a3d9a", "#3d0060"]),
    insufficient: "#f0eeec"
  }

  const groupMap = {
    "All adults":                                 "all",
    "Asian":                                      "asian",
    "Black":                                      "black",
    "Latino":                                     "latino",
    "Native American and Alaska Native":          "native",
    "Native Hawaiian and Other Pacific Islander": "pacific",
    "White":                                      "white"
  }

  const caFipsName = {
    "06001":"Alameda","06003":"Alpine","06005":"Amador","06007":"Butte",
    "06009":"Calaveras","06011":"Colusa","06013":"Contra Costa","06015":"Del Norte",
    "06017":"El Dorado","06019":"Fresno","06021":"Glenn","06023":"Humboldt",
    "06025":"Imperial","06027":"Inyo","06029":"Kern","06031":"Kings",
    "06033":"Lake","06035":"Lassen","06037":"Los Angeles","06039":"Madera",
    "06041":"Marin","06043":"Mariposa","06045":"Mendocino","06047":"Merced",
    "06049":"Modoc","06051":"Mono","06053":"Monterey","06055":"Napa",
    "06057":"Nevada","06059":"Orange","06061":"Placer","06063":"Plumas",
    "06065":"Riverside","06067":"Sacramento","06069":"San Benito","06071":"San Bernardino",
    "06073":"San Diego","06075":"San Francisco","06077":"San Joaquin","06079":"San Luis Obispo",
    "06081":"San Mateo","06083":"Santa Barbara","06085":"Santa Clara","06087":"Santa Cruz",
    "06089":"Shasta","06091":"Sierra","06093":"Siskiyou","06095":"Solano",
    "06097":"Sonoma","06099":"Stanislaus","06101":"Sutter","06103":"Tehama",
    "06105":"Trinity","06107":"Tulare","06109":"Tuolumne","06111":"Ventura",
    "06113":"Yolo","06115":"Yuba"
  }

  const byCounty = new Map(data.map(d => [d.county.trim().toLowerCase(), d]))

  // ── TOOLTIP ──────────────────────────────────────────────
  const tooltip = d3.select("body").append("div")
    .style("position","fixed").style("background","white")
    .style("border","1px solid #ccc").style("border-radius","3px")
    .style("padding","8px 12px").style("font-size","12px")
    .style("font-family","sans-serif").style("pointer-events","none")
    .style("display","none").style("box-shadow","2px 2px 6px rgba(0,0,0,0.15)")
    .style("line-height","1.8")

  // ── FETCH TOPOLOGY ───────────────────────────────────────
  const us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json")
  const allCounties = topojson.feature(us, us.objects.counties)
  allCounties.features = allCounties.features.filter(d =>
    String(d.id).padStart(5,"0").startsWith("06")
  )

  // ── PROJECTION fitted to CA only, no extra translate ─────
  const width = 380, height = 520
  const projection = d3.geoMercator().fitSize([width, height], allCounties)
  const path = d3.geoPath().projection(projection)

  // ── SVG ──────────────────────────────────────────────────
  const svgEl = d3.create("svg")
    .attr("width", width).attr("height", height)

  // ── LEGEND ───────────────────────────────────────────────
  const legendItems = [
    { label: "More than 60%",     color: "#3d0060" },
    { label: "45 – 60%",          color: "#6a3d9a" },
    { label: "30 – 45%",          color: "#9975b9" },
    { label: "15 – 30%",          color: "#c2afd4" },
    { label: "Less than 15%",     color: "#e8e0ef" },
    { label: "Insufficient data", color: "#f0eeec" },
  ]
  const legendDiv = html`<div style="font-family:sans-serif;font-size:13px;
    padding-top:40px;padding-left:20px;min-width:220px"></div>`
  legendDiv.append(html`<div style="font-size:13px;font-weight:600;line-height:1.5;
    margin-bottom:12px;color:#333">Percent with a<br>bachelor's degree</div>`)
  legendItems.forEach(({ label, color }) => {
    legendDiv.append(html`<div style="display:flex;align-items:center;
      justify-content:space-between;gap:16px;margin:5px 0">
      <span style="color:#333">${label}</span>
      <span style="width:22px;height:22px;flex-shrink:0;background:${color};
        border:1px solid #ccc;display:inline-block"></span>
    </div>`)
  })

  // ── DROPDOWN ─────────────────────────────────────────────
  let selectedGroup = "All adults"
  const selectEl = html`<select style="padding:6px 24px 6px 10px;border:1px solid #bbb;
    border-radius:3px;font-size:14px;min-width:300px;margin-bottom:12px">
    ${Object.keys(groupMap).map(g => `<option>${g}</option>`).join("")}
  </select>`
  selectEl.addEventListener("change", () => { selectedGroup = selectEl.value; draw() })

  // ── DRAW ─────────────────────────────────────────────────
  function draw() {
    svgEl.selectAll("*").remove()
    const col = groupMap[selectedGroup]

    svgEl.append("g").selectAll("path")
      .data(allCounties.features)
      .join("path")
      .attr("d", path)
      .attr("fill", d => {
        const fips = String(d.id).padStart(5, "0")
        const name = caFipsName[fips]
        if (!name) return colors.insufficient
        const row = byCounty.get(name.toLowerCase())
        if (!row) return colors.insufficient
        const val = row[col]
        return (val != null && !isNaN(val)) ? colors.scale(val) : colors.insufficient
      })
      .attr("stroke", "white")
      .attr("stroke-width", 0.8)
      .on("mousemove", function(event, d) {
        const fips = String(d.id).padStart(5, "0")
        const name = caFipsName[fips]
        if (!name) return
        const row = byCounty.get(name.toLowerCase())
        const val = row ? row[col] : null
        d3.select(this).attr("stroke","#333").attr("stroke-width", 1.5)
        tooltip.style("display","block")
          .style("left",(event.clientX+14)+"px")
          .style("top",(event.clientY-10)+"px")
          .html(`<strong>${name} County</strong><br>
            <span style="color:#555">${selectedGroup}:</span>
            <strong> ${val != null && !isNaN(val) ? val.toFixed(1)+"%" : "Insufficient data"}</strong>`)
      })
      .on("mouseleave", function() {
        d3.select(this).attr("stroke","white").attr("stroke-width", 0.8)
        tooltip.style("display","none")
      })
  }

  draw()

  // ── ROOT ─────────────────────────────────────────────────
  const root = html`<div style="font-family:sans-serif;max-width:700px">
    <div style="font-style:italic;color:#555;font-size:14px;margin-bottom:10px">
      Select a racial/ethnic group to see more detail
    </div>
  </div>`
  root.append(selectEl)
  const row = html`<div style="display:flex;align-items:flex-start"></div>`
  row.append(svgEl.node(), legendDiv)
  root.append(row)

  invalidation.then(() => tooltip.remove())
  return root
}


function _d3(require){return(
require("d3@7")
)}

function _topojson(require){return(
require("topojson-client@3")
)}

function _data(FileAttachment){return(
FileAttachment("california_edu.csv").csv({ typed: true })
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["california_edu.csv", {url: new URL("./files/762b06bdc00b4c99e2ecf1319e658c9f778a28bb99802c0cf96a34e471d717a87ee3a262cec3444a948d239e15cbda271d7870952793714b22b98c58f7102e47.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["d3","data","topojson","html","invalidation"], _2);
  main.variable(observer("d3")).define("d3", ["require"], _d3);
  main.variable(observer("topojson")).define("topojson", ["require"], _topojson);
  main.variable(observer("data")).define("data", ["FileAttachment"], _data);
  return main;
}
