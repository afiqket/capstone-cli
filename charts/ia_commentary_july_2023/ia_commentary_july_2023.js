function _1(md){return(
md`# IA commentary July 2023
by Migration Observatory`
)}

function _2(md){return(
md`## Wait time for an initial asylum decision, by outcome and nationality of applicant, for decisions made in 2021 (or other selected period)
Main applicants only`
)}

async function _chart(FileAttachment,d3,html)
{
  const raw = await FileAttachment("asylum.csv").csv();

  const waitOrder = [
    "Under 6 months",
    "6 months to under 1 year",
    "1 year to under 1.5 years",
    "1.5 years to under 2 years",
    "2 years to under 2.5 years",
    "2.5 years to under 3 years",
    "3 years or more"
  ];

  const nationalities = Array.from(new Set(raw.map(d => d.Nationality))).sort(d3.ascending);
  const outcomes = Array.from(new Set(raw.map(d => d.Outcome))).sort(d3.ascending);
  const periods = Array.from(new Set(raw.map(d => d["Period in which decisions made"]))).sort(d3.ascending);

  function createMultiSelect(labelText, options, defaultSelected = options) {
    const wrapper = html`<div style="position:relative; min-width:260px; font:12px sans-serif;"></div>`;

    const label = html`<div style="font-size:14px; margin-bottom:4px;">${labelText}</div>`;

    const button = html`<button type="button" style="
      width:100%;
      text-align:left;
      padding:6px 28px 6px 8px;
      border:1px solid #999;
      background:white;
      cursor:pointer;
      position:relative;
      font:12px sans-serif;
    "></button>`;

    const arrow = html`<span style="
      position:absolute;
      right:8px;
      top:50%;
      transform:translateY(-50%);
      pointer-events:none;
      font-size:10px;
    ">▼</span>`;
    button.appendChild(arrow);

    const panel = html`<div style="
      display:none;
      position:absolute;
      top:100%;
      left:0;
      width:100%;
      max-height:220px;
      overflow:auto;
      background:white;
      border:1px solid #999;
      box-shadow:0 2px 6px rgba(0,0,0,0.15);
      padding:6px 8px;
      z-index:1000;
    "></div>`;

    const allRow = html`<label style="display:flex; align-items:center; gap:6px; margin:2px 0;">
      <input type="checkbox">
      <span>(All)</span>
    </label>`;
    panel.appendChild(allRow);
    const allBox = allRow.querySelector("input");

    const rows = options.map(option => {
      const row = html`<label style="display:flex; align-items:center; gap:6px; margin:2px 0;">
        <input type="checkbox" value="${option}">
        <span>${option}</span>
      </label>`;
      panel.appendChild(row);
      return row.querySelector("input");
    });

    function getSelected() {
      return rows.filter(input => input.checked).map(input => input.value);
    }

    function setButtonText(text) {
      while (button.firstChild && button.firstChild !== arrow) {
        button.removeChild(button.firstChild);
      }
      button.insertBefore(document.createTextNode(text), arrow);
    }

    function updateButtonText() {
      const selected = getSelected();
      if (selected.length === options.length) setButtonText("(All)");
      else if (selected.length === 0) setButtonText("(None)");
      else if (selected.length === 1) setButtonText(selected[0]);
      else setButtonText(`(${selected.length} selected)`);
    }

    function syncAllBox() {
      allBox.checked = getSelected().length === options.length;
    }

    rows.forEach(input => {
      input.checked = defaultSelected.includes(input.value);
      input.addEventListener("input", () => {
        syncAllBox();
        updateButtonText();
        wrapper.dispatchEvent(new CustomEvent("input"));
      });
    });

    allBox.checked = defaultSelected.length === options.length;

    allBox.addEventListener("input", e => {
      const checked = e.target.checked;
      rows.forEach(input => input.checked = checked);
      updateButtonText();
      wrapper.dispatchEvent(new CustomEvent("input"));
    });

    button.addEventListener("click", e => {
      e.stopPropagation();
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

    document.addEventListener("click", e => {
      if (!wrapper.contains(e.target)) panel.style.display = "none";
    });

    wrapper.getSelected = getSelected;
    updateButtonText();
    wrapper.append(label, button, panel);
    return wrapper;
  }

  const nationalitySelect = createMultiSelect("Nationality", nationalities, nationalities);
  const outcomeSelect = createMultiSelect("Outcome", outcomes, outcomes);
  const periodSelect = createMultiSelect("Period in which decisions made", periods, periods);

  const controls = html`<div style="
    display:flex;
    gap:24px;
    align-items:flex-start;
    margin-bottom:18px;
    flex-wrap:wrap;
  "></div>`;
  controls.append(nationalitySelect, outcomeSelect, periodSelect);

  const container = html`<div></div>`;
  const chartHolder = html`<div></div>`;
  container.append(controls, chartHolder);

  const width = 900;
  const height = 470;
  const marginTop = 30;
  const marginRight = 20;
  const marginBottom = 120;
  const marginLeft = 90;

  function renderMessage(svg, message) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#555")
      .style("font-size", "14px")
      .text(message);
  }

  function render() {
    const selectedNationalities = nationalitySelect.getSelected();
    const selectedOutcomes = outcomeSelect.getSelected();
    const selectedPeriods = periodSelect.getSelected();

    chartHolder.innerHTML = "";

    const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .style("max-width", "100%")
      .style("height", "auto")
      .style("font", "12px sans-serif");

    if (
      selectedNationalities.length === 0 ||
      selectedOutcomes.length === 0 ||
      selectedPeriods.length === 0
    ) {
      renderMessage(svg, "No data selected. Please choose at least one option in each dropdown.");
      chartHolder.append(svg.node());
      return;
    }

    const filtered = raw.filter(d =>
      selectedNationalities.includes(d.Nationality) &&
      selectedOutcomes.includes(d.Outcome) &&
      selectedPeriods.includes(d["Period in which decisions made"])
    );

    const grouped = Array.from(
      d3.rollup(
        filtered,
        v => d3.sum(v, d => +d.Count),
        d => d["Wait Time"]
      ),
      ([waitTime, count]) => ({ waitTime, count })
    );

    const countsByWait = new Map(grouped.map(d => [d.waitTime, d.count]));
    const data = waitOrder.map(waitTime => ({
      waitTime,
      count: countsByWait.get(waitTime) || 0
    }));

    const total = d3.sum(data, d => d.count);

    if (total === 0) {
      renderMessage(svg, "No matching data for the selected filters.");
      chartHolder.append(svg.node());
      return;
    }

    const chartData = data.map(d => ({
      waitTime: d.waitTime,
      share: d.count / total,
      count: d.count
    }));

    const x = d3.scaleBand()
      .domain(chartData.map(d => d.waitTime))
      .range([marginLeft, width - marginRight])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.share)])
      .nice()
      .range([height - marginBottom, marginTop]);

    svg.append("g")
      .selectAll("rect")
      .data(chartData)
      .join("rect")
      .attr("x", d => x(d.waitTime))
      .attr("y", d => y(d.share))
      .attr("width", x.bandwidth())
      .attr("height", d => y(0) - y(d.share))
      .attr("fill", "#4e79a7");

    svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(
        d3.axisLeft(y)
          .ticks(6)
          .tickFormat(d3.format(".0%"))
      )
      .call(g => g.select(".domain").remove());

    svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x))
      .call(g => g.selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end"))
      .call(g => g.select(".domain").remove());

    svg.append("text")
      .attr("x", -height / 2)
      .attr("y", 20)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .style("font-size", "14px")
      .text("Share of applicants");

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 20)
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .style("font-size", "14px")
      .text("Wait time");

    svg.append("g")
      .selectAll("text.bar-label")
      .data(chartData)
      .join("text")
      .attr("x", d => x(d.waitTime) + x.bandwidth() / 2)
      .attr("y", d => y(d.share) - 6)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "black")
      .text(d => d.share > 0 ? d3.format(".1%")(d.share) : "");

    chartHolder.append(svg.node());
  }

  nationalitySelect.addEventListener("input", render);
  outcomeSelect.addEventListener("input", render);
  periodSelect.addEventListener("input", render);

  render();
  return container;
}


function _4(md){return(
md`Original Tableau Viz:
https://public.tableau.com/app/profile/migobs/viz/IAcommentaryJuly2023/9`
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["asylum.csv", {url: new URL("./files/69f09c9bfc20a238296ee6ef0c63eb805d711b43d7e39c930cba7712d6dadab00088f4178a4b58110e45cd876be74a3ce0fa8951ba80091299ae346407274c29.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["md"], _2);
  main.variable(observer("chart")).define("chart", ["FileAttachment","d3","html"], _chart);
  main.variable(observer()).define(["md"], _4);
  return main;
}
