function _1(md){return(
md`# International Merchandise Trade Malaysia and ASEAN`
)}

async function _2(FileAttachment,d3,topojson,html)
{
  const raw = await FileAttachment("International Merchandise Trade Malaysia and ASEAN.csv")
    .csv({ typed: true });

  const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json");
  const countries = topojson.feature(world, world.objects.countries);

  const countryMap = new Map([
    ["Brunei", "Brunei"],
    ["Cambodia", "Cambodia"],
    ["Indonesia", "Indonesia"],
    ["Lao PDR", "Laos"],
    ["Myanmar", "Myanmar"],
    ["Phillipines", "Philippines"],
    ["Philippines", "Philippines"],
    ["Singapore", "Singapore"],
    ["Thailand", "Thailand"],
    ["Viet Nam", "Vietnam"]
  ]);

  const data = raw;

  const aseanNames = new Set([
    "Brunei",
    "Cambodia",
    "Indonesia",
    "Laos",
    "Malaysia",
    "Myanmar",
    "Philippines",
    "Singapore",
    "Thailand",
    "Vietnam"
  ]);

  const width = 1100;
  const height = 640;
  const panelWidth = 260;
  const mapWidth = width - panelWidth;

  const projection = d3.geoMercator()
    .center([117, 4])
    .scale(690)
    .translate([mapWidth / 2 - 35, height / 2 + 8]);

  const path = d3.geoPath(projection);

  const wrapper = html`<div style="
    position: relative;
    width: ${width}px;
    height: ${height}px;
    background: #f5f5f5;
    font-family: sans-serif;
  "></div>`;

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .style("width", `${width}px`)
    .style("height", `${height}px`)
    .style("display", "block");

  wrapper.appendChild(svg.node());

  const defs = svg.append("defs");

  defs.append("clipPath")
    .attr("id", "map-clip")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", mapWidth)
    .attr("height", height);

  const mapViewport = svg.append("g")
    .attr("clip-path", "url(#map-clip)");

  const mapLayer = mapViewport.append("g");
  const countryLayer = mapLayer.append("g");
  const singaporeLayer = mapLayer.append("g");
  const uiLayer = svg.append("g");

  const tooltip = d3.select(document.createElement("div"))
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #bbb")
    .style("padding", "8px 10px")
    .style("border-radius", "6px")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("font-family", "sans-serif")
    .style("font-size", "12px")
    .style("line-height", "1.5")
    .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)");
  document.body.appendChild(tooltip.node());

  let currentCategory = "all";
  let selectedCountry = "all";

  function cleanString(v) {
    return String(v ?? "").trim();
  }

  function matchCountryName(name) {
    const cleaned = cleanString(name);
    return countryMap.get(cleaned) ?? cleaned;
  }

  function normalizeCategory(cat) {
    return cleanString(cat).toLowerCase();
  }

  function parseTotalRM(val) {
    return +val;
  }

  function getRowsForCountry(mapCountryName) {
    let rows = data.filter(d => matchCountryName(d.Country) === mapCountryName);

    if (currentCategory !== "all") {
      rows = rows.filter(d => normalizeCategory(d.Category) === currentCategory);
    }

    return rows;
  }

  function getValue(mapCountryName) {
    const rows = getRowsForCountry(mapCountryName);
    return d3.sum(rows, d => parseTotalRM(d["Total RM"]));
  }

  // smoother palette ordering for gradient
  const palette = [
    "#f47c2c", // orange
    "#eed3a5", // beige
    "#e91e63", // pink-red
    "#a0008f", // magenta
    "#76b5b0", // teal
    "#2a11b5"  // indigo
  ];

  const interpolator = d3.interpolateRgbBasis(palette);

  function makeColorScale(values) {
    const positive = values.filter(v => v > 0);
    const minVal = d3.min(positive) ?? 1;
    const maxVal = d3.max(positive) ?? 1;

    const logT = d3.scaleLog()
      .domain([Math.max(1, minVal), maxVal])
      .range([0, 1]);

    function color(value) {
      if (value <= 0 || !isFinite(value)) return "#dddddd";
      return interpolator(logT(value));
    }

    return {
      color,
      minVal: Math.max(1, minVal),
      maxVal
    };
  }

  function showTooltip(event, countryName) {
    const rows = getRowsForCountry(countryName);
    const total = d3.sum(rows, r => parseTotalRM(r["Total RM"]));

    const detail = rows.length
      ? rows.map(r =>
          `${cleanString(r.Country)} | ${cleanString(r.Category)} | RM ${Number(r["Total RM"]).toLocaleString()}`
        ).join("<br>")
      : "No data";

    tooltip
      .style("opacity", 1)
      .style("left", `${event.pageX + 12}px`)
      .style("top", `${event.pageY - 18}px`)
      .html(`
        <b>${countryName}</b><br>
        Total: RM ${Number(total).toLocaleString()}<br><br>
        ${detail}
      `);
  }

  function hideTooltip() {
    tooltip.style("opacity", 0);
  }

  function drawPanelBackground() {
    uiLayer.selectAll(".panel-bg").remove();

    uiLayer.append("rect")
      .attr("class", "panel-bg")
      .attr("x", mapWidth + 20)
      .attr("y", 30)
      .attr("width", panelWidth - 40)
      .attr("height", height - 60)
      .attr("rx", 14)
      .attr("fill", "rgba(255,255,255,0.95)")
      .attr("stroke", "#d9d9d9");
  }

  function drawLegend(color, minVal, maxVal) {
    uiLayer.selectAll(".legend-group").remove();

    const legendX = mapWidth + 150;
    const legendY = 450;
    const legendWidth = 28;
    const legendHeight = 140;
    const steps = 80;

    const legend = uiLayer.append("g")
      .attr("class", "legend-group");

    legend.append("text")
      .attr("x", legendX + legendWidth / 2)
      .attr("y", legendY - 18)
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .attr("font-weight", 600)
      .attr("fill", "#333")
      .text("Total RM");

    // draw many tiny rects to guarantee visible gradient
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;

      const value = minVal * Math.pow(maxVal / minVal, 1 - t0);
      const y = legendY + t0 * legendHeight;
      const h = Math.max(1, (t1 - t0) * legendHeight + 0.5);

      legend.append("rect")
        .attr("x", legendX)
        .attr("y", y)
        .attr("width", legendWidth)
        .attr("height", h)
        .attr("fill", color(value))
        .attr("stroke", "none");
    }

    legend.append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .attr("rx", 3)
      .attr("fill", "none")
      .attr("stroke", "#bbb");

    const ticks = [
      maxVal,
      minVal * Math.pow(maxVal / minVal, 0.75),
      minVal * Math.pow(maxVal / minVal, 0.5),
      minVal * Math.pow(maxVal / minVal, 0.25),
      minVal
    ];

    ticks.forEach((tick, i) => {
      const y = legendY + (legendHeight / (ticks.length - 1)) * i;

      legend.append("text")
        .attr("x", legendX - 12)
        .attr("y", y)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 12)
        .attr("fill", "#555")
        .text(d3.format(".2s")(tick).replace("G", "B"));
    });
  }

  function draw() {
    countryLayer.selectAll("path").remove();
    singaporeLayer.selectAll("*").remove();
    uiLayer.selectAll(".legend-group").remove();

    const values = Array.from(aseanNames, c => getValue(c));
    const { color, minVal, maxVal } = makeColorScale(values);

    const features = countries.features.filter(d => aseanNames.has(d.properties.name));

    countryLayer.selectAll("path")
      .data(features)
      .join("path")
      .attr("d", path)
      .attr("fill", d => {
        const name = d.properties.name;
        const v = getValue(name);

        if (selectedCountry !== "all" && name !== selectedCountry) {
          return "#dddddd";
        }

        return v > 0 ? color(v) : "#dddddd";
      })
      .attr("stroke", d => d.properties.name === selectedCountry ? "#111" : "#555")
      .attr("stroke-width", d => d.properties.name === selectedCountry ? 2.2 : 1)
      .on("mousemove", (event, d) => showTooltip(event, d.properties.name))
      .on("mouseout", hideTooltip);

    const singaporeValue = getValue("Singapore");
    const [sx, sy] = projection([103.8198, 1.3521]);

    singaporeLayer.append("circle")
      .attr("cx", sx)
      .attr("cy", sy)
      .attr("r", selectedCountry === "all" || selectedCountry === "Singapore" ? 5.2 : 4.5)
      .attr("fill",
        selectedCountry !== "all" && selectedCountry !== "Singapore"
          ? "#dddddd"
          : singaporeValue > 0
          ? color(singaporeValue)
          : "#dddddd"
      )
      .attr("stroke", selectedCountry === "Singapore" ? "#111" : "#555")
      .attr("stroke-width", selectedCountry === "Singapore" ? 2 : 1.1)
      .style("pointer-events", "all")
      .on("mousemove", (event) => showTooltip(event, "Singapore"))
      .on("mouseout", hideTooltip);

    drawLegend(color, minVal, maxVal);
  }

  drawPanelBackground();
  draw();

  const zoom = d3.zoom()
    .scaleExtent([1, 6])
    .translateExtent([[0, 0], [mapWidth, height]])
    .extent([[0, 0], [mapWidth, height]])
    .filter((event) => {
      const [x, y] = d3.pointer(event, svg.node());
      const insideMap = x >= 0 && x <= mapWidth && y >= 0 && y <= height;
      if (!insideMap) return false;
      return event.type === "wheel" || event.type === "mousedown" || event.type === "touchstart";
    })
    .on("zoom", (event) => {
      mapLayer.attr("transform", event.transform);
    });

  svg.call(zoom);

  const panel = html`<div style="
    position: absolute;
    top: 60px;
    left: ${mapWidth + 40}px;
    width: ${panelWidth - 80}px;
    z-index: 10;
    font-family: sans-serif;
    color: #333;
  ">
    <div style="
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 26px;
    ">Filters</div>

    <div style="font-size: 14px; margin-bottom: 8px;">Country</div>
    <select id="country-select" style="
      width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #bbb;
      margin-bottom: 24px;
      font-size: 14px;
      background: white;
    ">
      <option value="all">(All)</option>
      ${Array.from(aseanNames).sort().map(c => `<option value="${c}">${c}</option>`).join("")}
    </select>

    <div style="font-size: 14px; margin-bottom: 8px;">Category</div>
    <select id="category-select" style="
      width: 100%;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #bbb;
      margin-bottom: 24px;
      font-size: 14px;
      background: white;
    ">
      <option value="all">(All)</option>
      <option value="export">Export</option>
      <option value="import">Import</option>
    </select>
  </div>`;

  wrapper.appendChild(panel);

  panel.querySelector("#country-select")
    .addEventListener("change", e => {
      selectedCountry = e.target.value;
      draw();
    });

  panel.querySelector("#category-select")
    .addEventListener("change", e => {
      currentCategory = e.target.value;
      draw();
    });

  return wrapper;
}


export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["International Merchandise Trade Malaysia and ASEAN.csv", {url: new URL("./files/fc5a32c324e1f14e69876f73c6c4c468a2649fef8437d1542170707fd0e07a0eaf27b7a75f69df003d78e39c8b12a2e61e0d051d1830996a5b0a15d638c904b7.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["FileAttachment","d3","topojson","html"], _2);
  return main;
}
