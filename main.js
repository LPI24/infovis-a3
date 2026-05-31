var d3;

window.onload = () => {
  console.log("DOM geladen, starte Fetch...");

  // load dataset
  fetch('data/football.json')
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network trouble");
      }
      return response.json();
    })
    .then((json) => {
      console.log("Data fetching successful: #Players:", json.nodes.length);

      // Both visualizations
      initPCP(json.nodes);
      initSPLOM(json.nodes);
    })
    .catch((error) => {
      console.error("Fehler beim Laden oder Verarbeiten der Daten:", error);
    });

 // PCP

  function initPCP(data) {
    console.log("initPCP gestartet...");
// Measurements of Plot
    const width = 800;
    const height = 500;
    const marginTop = 30;
    const marginRight = 40;
    const marginBottom = 30;
    const marginLeft = 40;

    // Feature Selection
    const keys = ["appearance", "mins_played", "ball_recovery", "touches"];
    const keyz = "appearance"; // feature for color encoding

    // X-scaling
    const x = d3.scalePoint(keys, [marginLeft, width - marginRight]);

    // Y-scaling
    const y = new Map(Array.from(keys, key => [
      key,
      d3.scaleLinear(d3.extent(data, d => +(d[key] || 0)), [height - marginBottom, marginTop])
    ]));

    // color scaling
    const color = d3.scaleSequential(y.get(keyz).domain(), t => d3.interpolateBrBG(1 - t));

    // SCG in Body
    const svg = d3.select("body").append("svg")
        .attr("viewBox", [0, 0, width, height])
        .attr("width", width)
        .attr("height", height)
        .attr("style", "max-width: 100%; height: auto; background-color: #fafafa; display: block; margin-bottom: 20px;");


    const line = d3.line()
      .defined(([, value]) => value != null)
      .x(([key]) => x(key))
      .y(([key, value]) => y.get(key)(+(value || 0)));


    const path = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.7)
      .selectAll("path")
      .data(data)
      .join("path")
        .attr("stroke", d => color(+d[keyz]))
        .attr("d", d => line(d3.cross(keys, [d], (key, d) => [key, d[key] || 0])));
    console.log("Spieler-Linien gezeichnet.");


    const axes = svg.append("g")
      .selectAll("g")
      .data(keys)
      .join("g")
        .attr("transform", d => `translate(${x(d)},0)`)
        .each(function(d) { d3.select(this).call(d3.axisLeft(y.get(d))); })
        .call(g => g.append("text")
          .attr("x", 0)
          .attr("y", marginTop - 10)
          .attr("text-anchor", "middle")
          .attr("fill", "black")
          .style("font-weight", "bold")
          .text(d => d))
        .call(g => g.selectAll("text")
          .clone(true).lower()
          .attr("fill", "none")
          .attr("stroke-width", 5)
          .attr("stroke-linejoin", "round")
          .attr("stroke", "white"));
    console.log("Achsen gezeichnet.");

// Brushing
    const deselectedColor = "#ddd";
    const brushWidth = 30;

    // vertical brushing
    const brush = d3.brushY()
        .extent([
            [-(brushWidth / 2), marginTop],
            [brushWidth / 2, height - marginBottom]
        ])
        .on("start brush end", pcpBrushed);

    // Brush on all axis
    axes.call(brush);

    // Map to safe current brushing area
    const activeFilters = new Map();

    // invert pixel which is selected due brush -> real data value
    function pcpBrushed({selection}, key) {
        if (selection === null) {
            activeFilters.delete(key);
        } else {
            const [y1, y0] = selection.map(y.get(key).invert);
            activeFilters.set(key, [y0, y1]);
        }

        const selectedIds = [];

        // check if player belongs to brush
        path.each(function(d) {
            const isActive = Array.from(activeFilters).every(([axisKey, [min, max]]) => {
                const val = +(d[axisKey] || 0);
                return val >= min && val <= max;
            });

            // visuel Feedback in PCP
            d3.select(this)
              .style("stroke", isActive ? color(+d[keyz]) : deselectedColor)
              .style("stroke-opacity", isActive ? 0.7 : 0.1);

            if (isActive) {
                d3.select(this).raise();
                selectedIds.push(d.id);
            }
        });

        // if no filter all are selected
        const finalSelection = activeFilters.size === 0 ? data.map(d => d.id) : selectedIds;

        // CUSTOM EVENT: IDs of filtered players
        window.dispatchEvent(new CustomEvent("pcpSelectionChanged", {
            detail: {
                selectedIds: finalSelection,
                hasActiveFilter: activeFilters.size > 0
            }
        }));
    }
  }


  //############################################################################################
  //############################################################################################
  //############################################################################################
  //############################################################################################

  // SPLOM

  function initSPLOM(data) {
    console.log("initSPLOM gestartet...");

    const width = 600;
    const padding = 20;

    // Same Features as PCP
    const keys = ["appearance", "mins_played", "ball_recovery", "touches"];
    const n = keys.length;

    // Size of ine cell
    const size = (width - padding) / n;


    const x = new Map(Array.from(keys, key => [
      key,
      d3.scaleLinear(d3.extent(data, d => +(d[key] || 0)), [padding / 2, size - padding / 2])
    ]));

    const y = new Map(Array.from(keys, key => [
      key,
      d3.scaleLinear(d3.extent(data, d => +(d[key] || 0)), [size - padding / 2, padding / 2])
    ]));

    // SVG container for body
    const svg = d3.select("body").append("svg")
        .attr("viewBox", [0, 0, width, width])
        .attr("width", width)
        .attr("height", width)
        .attr("style", "max-width: 100%; height: auto; background-color: #fafafa; display: block;");


    const cell = svg.append("g")
      .selectAll("g")
      .data(d3.cross(d3.range(n), d3.range(n)))
      .join("g")
        .attr("transform", ([i, j]) => `translate(${i * size},${j * size})`);

    // Padding of cell
    cell.append("rect")
        .attr("fill", "none")
        .attr("stroke", "#aaa")
        .attr("x", padding / 2)
        .attr("y", padding / 2)
        .attr("width", size - padding)
        .attr("height", size - padding);

    // fill cells
    cell.each(function([i, j]) {
      const cellSelection = d3.select(this);
      const xKey = keys[i];
      const yKey = keys[j];

      // imortant for \ -> /
      if (i + j === n - 1) {

        cellSelection.append("text")
            .attr("x", size / 2)
            .attr("y", size / 2)
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .attr("fill", "black")
            .text(xKey);
      } else {
        // data points as circles
        cellSelection.selectAll("circle")
          .data(data)
          .join("circle")
            // IDs for brushed data points
            .attr("class", d => `player-circle player-id-${d.id}`)
            .attr("cx", d => x.get(xKey)(+(d[xKey] || 0)))
            .attr("cy", d => y.get(yKey)(+(d[yKey] || 0)))
            .attr("r", 3)
            .attr("fill", "royalblue")
            .attr("fill-opacity", 0.7);
      }
    });

    // Event >Listender
    window.addEventListener("pcpSelectionChanged", (event) => {
      const { selectedIds, hasActiveFilter } = event.detail;

      if (!hasActiveFilter) {
        // no filter
        svg.selectAll(".player-circle")
           .attr("fill", "royalblue")
           .attr("fill-opacity", 0.7)
           .attr("r", 3);
      } else {
        // all points deselected
        svg.selectAll(".player-circle")
           .attr("fill", "#ddd")
           .attr("fill-opacity", 0.2)
           .attr("r", 2);

        // only selected points
        selectedIds.forEach(id => {
          svg.selectAll(`.player-id-${id}`)
             .attr("fill", "crimson")
             .attr("fill-opacity", 0.9)
             .attr("r", 4.5)
             .raise();
        });
      }
    });

    console.log("SPLOM erfolgreich gezeichnet.");
  }
};
