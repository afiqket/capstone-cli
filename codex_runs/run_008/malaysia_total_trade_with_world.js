function _1(md){return(
md`# Malaysia Total Trade with World`
)}

async function _2(FileAttachment,d3)
{
  const width = 900;
  const height = 560;
  const margin = { top: 30, right: 30, bottom: 60, left: 80 };

  const data = (await FileAttachment("Malaysia Total Trade with World.csv").csv())
    .map(d => ({
      year: +d["Year of Year"],
      value: +d["Total Trade (%)"]
    }))
    .sort((a, b) => d3.ascending(a.year, b.year));

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)]).nice()
    .range([height - margin.bottom, margin.top]);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .style("max-width", "100%")
    .style("height", "auto")
    .style("background", "#f3f3f3")
    .style("font-family", "sans-serif");

  // Title
  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 18)
    .attr("font-size", 18)
    .attr("font-weight", 700)
    .text("Figure 1: Malaysia's Total Trade with World, Percentage of GDP (%)");

  // X axis
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3.axisBottom(x)
        .tickFormat(d3.format("d"))
        .ticks(10)
    )
    .call(g => g.select(".domain").attr("stroke", "#999"))
    .call(g => g.selectAll(".tick line").attr("stroke", "#ddd"));

  // Y axis
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(
      d3.axisLeft(y)
        .ticks(10)
    )
    .call(g => g.select(".domain").attr("stroke", "#999"))
    .call(g => g.selectAll(".tick line")
      .clone()
      .attr("x2", width - margin.left - margin.right)
      .attr("stroke", "#ddd"))
    .call(g => g.selectAll(".tick line").attr("stroke", "#ddd"));

  // Y-axis label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(height / 2))
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", 14)
    .text("Total Trade, Percentage of GDP (%)");

  // Line
  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value));

  svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#1f77b4")
    .attr("stroke-width", 4)
    .attr("d", line);

  // Hover elements
  const focus = svg.append("g").style("display", "none");

  focus.append("line")
    .attr("class", "hover-line")
    .attr("y1", margin.top)
    .attr("y2", height - margin.bottom)
    .attr("stroke", "#888")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "4,4");

  focus.append("circle")
    .attr("r", 5)
    .attr("fill", "#1f77b4")
    .attr("stroke", "white")
    .attr("stroke-width", 2);

  const tooltip = focus.append("g");

  tooltip.append("rect")
    .attr("width", 210)
    .attr("height", 70)
    .attr("rx", 2)
    .attr("fill", "white")
    .attr("stroke", "#bbb")
    .attr("filter", "drop-shadow(2px 2px 2px rgba(0,0,0,0.2))");

  tooltip.append("text")
    .attr("class", "year-text")
    .attr("x", 16)
    .attr("y", 30)
    .attr("font-size", 14);

  tooltip.append("text")
    .attr("class", "value-text")
    .attr("x", 16)
    .attr("y", 50)
    .attr("font-size", 14);

  // Bisector
  const bisect = d3.bisector(d => d.year).left;

  svg.append("rect")
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width - margin.left - margin.right)
    .attr("height", height - margin.top - margin.bottom)
    .on("mouseenter", () => focus.style("display", null))
    .on("mouseleave", () => focus.style("display", "none"))
    .on("mousemove", function (event) {
      const [mx] = d3.pointer(event, this);
      const x0 = x.invert(mx);
      const i = bisect(data, x0, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      const d = !d1 ? d0 : (x0 - d0.year > d1.year - x0 ? d1 : d0);

      const px = x(d.year);
      const py = y(d.value);

      focus.select(".hover-line")
        .attr("x1", px)
        .attr("x2", px);

      focus.select("circle")
        .attr("cx", px)
        .attr("cy", py);

      let tx = px + 12;
      let ty = py - 35;

      if (tx + 210 > width - margin.right) tx = px - 222;
      if (ty < margin.top) ty = py + 10;

      tooltip.attr("transform", `translate(${tx},${ty})`);

      tooltip.select(".year-text")
        .html(null)
        .append("tspan")
        .text("Year of Year: ")
        .attr("fill", "#666");

      tooltip.select(".year-text")
        .append("tspan")
        .text(d.year)
        .attr("font-weight", 700)
        .attr("fill", "#111");

      tooltip.select(".value-text")
        .html(null)
        .append("tspan")
        .text("Total Trade (%): ")
        .attr("fill", "#666");

      tooltip.select(".value-text")
        .append("tspan")
        .text(d.value.toFixed(1))
        .attr("font-weight", 700)
        .attr("fill", "#111");
    });

  // Source note
  svg.append("text")
    .attr("x", margin.left)
    .attr("y", height - 10)
    .attr("font-size", 12)
    .attr("fill", "#444")
    .text("Source: CEIC");

  return svg.node();
}


export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["Malaysia Total Trade with World.csv", {url: new URL("./files/0feeeace7bd35a9bfff9ec703c398a6dbd4889e0dd92e677ac33457e1e669158cff61dd3b8cd40bcb1a42095497380708e68f3f5e9cb88fa58b5d8b6ef781a17.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["FileAttachment","d3"], _2);
  return main;
}
