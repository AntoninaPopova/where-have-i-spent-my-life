// ==========================================
// BASIC SETUP
// ==========================================

const width = 1100;
const height = 650;

const svg = d3.select("#map")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");


// ==========================================
// MAP GROUP
// Countries and circles are inside the same
// group so they zoom together.
// ==========================================

const mapGroup = svg.append("g");


// ==========================================
// PROJECTION
// ==========================================

const projection = d3.geoNaturalEarth1()
    .scale(195)
    .translate([width / 2, height / 2]);

const path = d3.geoPath()
    .projection(projection);


// ==========================================
// TOOLTIP
// ==========================================

const tooltip = d3.select("#tooltip");


// ==========================================
// LOAD DATA
// ==========================================

Promise.all([

    d3.json(
        "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
    ),

    d3.csv("data/places.csv")

])

.then(([world, places]) => {


    // ==========================================
    // PREPARE DATA
    // ==========================================

    places.forEach(d => {

        // Numeric fields

        d.latitude = +d.latitude;
        d.longitude = +d.longitude;
        d.days = +d.days;


        // Text fields

        d.type = (d.type || "")
            .trim()
            .toLowerCase();

        d.life_stage = (d.life_stage || "")
            .trim()
            .toLowerCase();

        d.companion = (d.companion || "")
            .trim()
            .toLowerCase();

        d.date_type = (d.date_type || "")
            .trim()
            .toLowerCase();


        // Keep date fields as strings.
        // They describe the time period but do not
        // determine the bubble size.

        d.year = (d.year || "").trim();
        d.date_apx = (d.date_apx || "").trim();
        d.start_date = (d.start_date || "").trim();
        d.end_date = (d.end_date || "").trim();

    });


    // ==========================================
    // DEBUG INFORMATION
    // ==========================================

    console.log("CSV columns:", places.columns);

    console.log("Number of places:", places.length);

    console.log("First place:", places[0]);

    console.log(
        "Min days:",
        d3.min(places, d => d.days)
    );

    console.log(
        "Max days:",
        d3.max(places, d => d.days)
    );

    console.log(
        "Invalid days:",
        places.filter(d => !Number.isFinite(d.days))
    );

    console.log(
        "Invalid coordinates:",
        places.filter(d =>
            !Number.isFinite(d.latitude) ||
            !Number.isFinite(d.longitude)
        )
    );

    console.table(
        places.filter(d =>
            !Number.isFinite(d.latitude) ||
            !Number.isFinite(d.longitude)
        )
    );


    // ==========================================
    // COUNTRIES
    // ==========================================

    const countries = topojson.feature(
        world,
        world.objects.countries
    );


    mapGroup
        .append("g")
        .selectAll("path")
        .data(countries.features)
        .join("path")
        .attr("class", "country")
        .attr("d", path);


    // ==========================================
    // TIME RANGE
    // ==========================================

    const minDays = d3.min(
        places,
        d => d.days
    );

    const maxDays = d3.max(
        places,
        d => d.days
    );


    // ==========================================
    // TIME SCALE
    // ==========================================

    let currentScale = "log";


    // ==========================================
    // POWER RADIUS
    // ==========================================

    const radiusPower = d3.scalePow()
        .exponent(0.15)
        .domain([minDays, maxDays])
        .range([2.5, 12]);


    // ==========================================
    // LOGARITHMIC RADIUS
    // ==========================================

    const radiusLog = d3.scaleLog()
        .domain([minDays, maxDays])
        .range([2.5, 12]);


    // ==========================================
    // POWER OPACITY
    // ==========================================

    const opacityPower = d3.scalePow()
        .exponent(0.35)
        .domain([minDays, maxDays])
        .range([0.9, 0.18]);


    // ==========================================
    // LOGARITHMIC OPACITY
    // ==========================================

    const opacityLog = d3.scaleLog()
        .domain([minDays, maxDays])
        .range([0.9, 0.18]);


    // ==========================================
    // FUNCTIONS FOR CURRENT SCALE
    // ==========================================

    function getRadius(days) {

        if (currentScale === "power") {
            return radiusPower(days);
        }

        return radiusLog(days);
    }


    function getOpacity(days) {

        if (currentScale === "power") {
            return opacityPower(days);
        }

        return opacityLog(days);
    }


    // ==========================================
    // COMPANION COLOURS
    // ==========================================

    const companionColors = {

        "alone": "#C9ADA7",

        "with family": "#9A8C98",

        "with friends": "#22223B"

    };


    // ==========================================
    // DISPLAY LABELS
    // ==========================================

    const displayLabels = {

        // Type

        "home": "Home",

        "purpose": "Purpose",

        "leisure": "Leisure",


        // Life stage

        "childhood": "Childhood",

        "student": "Student",

        "early career": "Early career",

        "international career": "International career",

        "transition": "Transition",

        "family": "Family",


        // Companion

        "alone": "Alone",

        "with family": "With family",

        "with friends": "With friends"

    };


    function formatLabel(value) {

        return displayLabels[value] || value;

    }


    // ==========================================
    // CALCULATE PROJECTED POSITIONS
    // ==========================================

    places.forEach(d => {

        const projected = projection([
            d.longitude,
            d.latitude
        ]);

        d.baseX = projected[0];
        d.baseY = projected[1];

    });


    // ==========================================
    // HANDLE REPEATED LOCATIONS
    //
    // If several observations have exactly the
    // same coordinates, slightly separate them
    // around the original point so that every
    // observation remains accessible.
    // ==========================================

    const locationGroups = d3.group(
        places,
        d => `${d.latitude},${d.longitude}`
    );


    locationGroups.forEach(group => {

        if (group.length <= 1) {
            return;
        }


        // Small visual separation in SVG coordinates

        const offsetDistance = 5;


        group.forEach((d, i) => {

            const angle =
                (2 * Math.PI * i) / group.length;

            d.offsetX =
                Math.cos(angle) * offsetDistance;

            d.offsetY =
                Math.sin(angle) * offsetDistance;

        });

    });


    // ==========================================
    // PLACES GROUP
    // ==========================================

    const placesGroup = mapGroup
        .append("g")
        .attr("class", "places");


    // ==========================================
    // PLACE CIRCLES
    // ==========================================

    const placeCircles = placesGroup
        .selectAll(".place")
        .data(places)
        .join("circle")

        .attr("class", "place")


        // ==========================================
        // POSITION
        // ==========================================

        .attr("cx", d => {

            return d.baseX + (d.offsetX || 0);

        })

        .attr("cy", d => {

            return d.baseY + (d.offsetY || 0);

        })


        // ==========================================
        // SIZE
        // ==========================================

        .attr("r", d => {

            return getRadius(d.days);

        })


        // ==========================================
        // COLOUR
        // ==========================================

        .attr("fill", d => {

            return companionColors[d.companion]
                || "#22223B";

        })


        // ==========================================
        // TRANSPARENCY
        // ==========================================

        .attr("fill-opacity", d => {

            return getOpacity(d.days);

        })


        // ==========================================
        // TOOLTIP
        // ==========================================

        .on("mouseenter", function(event, d) {

            tooltip
                .style("display", "block")

                .html(`

                    <div class="tooltip-place">

                        ${d.city}, ${d.country}

                        ${d.year

                            ? `<span class="tooltip-date"> · ${d.year}</span>`

                            : ""

                        }

                    </div>

                    <div class="tooltip-story">

                        ${d.tooltip || ""}

                    </div>

                    <div class="tooltip-meta">

                        ${d.days.toLocaleString()} days

                        · ${d.type}

                        · ${d.companion}

                    </div>

                `);

        })


        .on("mousemove", function(event) {

            const tooltipNode = tooltip.node();

            const tooltipWidth =
                tooltipNode.offsetWidth;

            const tooltipHeight =
                tooltipNode.offsetHeight;


            let left =
                event.clientX + 15;

            let top =
                event.clientY + 15;


            // Keep tooltip inside right edge

            if (
                left + tooltipWidth >
                window.innerWidth - 10
            ) {

                left =
                    event.clientX -
                    tooltipWidth -
                    15;

            }


            // Keep tooltip inside bottom edge

            if (
                top + tooltipHeight >
                window.innerHeight - 10
            ) {

                top =
                    event.clientY -
                    tooltipHeight -
                    15;

            }


            tooltip
                .style("left", `${left}px`)
                .style("top", `${top}px`);

        })


        .on("mouseleave", function() {

            tooltip
                .style("display", "none");

        });


    // ==========================================
    // PLACE TYPE FILTER
    // ==========================================

    const filterButtons =
        d3.selectAll(".filter-btn");


    filterButtons.on("click", function() {

        const selectedType =
            d3.select(this)
                .attr("data-filter");


        // Hide any existing tooltip

        tooltip
            .style("display", "none");


        // Update active button

        filterButtons
            .classed("active", false);

        d3.select(this)
            .classed("active", true);


        // Show only selected places

        placeCircles
            .transition()
            .duration(300)

            .style("opacity", d => {

                if (selectedType === "all") {

                    return 1;

                }

                return d.type === selectedType

                    ? 1

                    : 0;

            })

            .style("pointer-events", d => {

                if (selectedType === "all") {

                    return "all";

                }

                return d.type === selectedType

                    ? "all"

                    : "none";

            });

    });


    // ==========================================
    // POWER / LOGARITHMIC SCALE SWITCH
    // ==========================================

    const scaleButtons =
        d3.selectAll(".scale-btn");


    scaleButtons.on("click", function() {

        currentScale =
            d3.select(this)
                .attr("data-scale");


        // Update active button

        scaleButtons
            .classed("active", false);

        d3.select(this)
            .classed("active", true);


        // Animate circles

        placeCircles
            .transition()
            .duration(600)

            .attr("r", d => {

                return getRadius(d.days);

            })

            .attr("fill-opacity", d => {

                return getOpacity(d.days);

            });

    });


    // ==========================================
    // ZOOM
    // ==========================================

    const zoom = d3.zoom()

        .scaleExtent([1, 8])

        .on("zoom", event => {

            mapGroup
                .attr(
                    "transform",
                    event.transform
                );

        });


    svg.call(zoom);


    // ==========================================
    // INITIAL MAP POSITION
    // ==========================================

    svg.call(
        zoom.transform,
        d3.zoomIdentity
            .translate(-250, -55)
            .scale(1.65)
    );


    // ==========================================
    // ZOOM IN
    // ==========================================

    d3.select("#zoom-in")
        .on("click", () => {

            svg.transition()
                .duration(400)

                .call(
                    zoom.scaleBy,
                    1.5
                );

        });


    // ==========================================
    // ZOOM OUT
    // ==========================================

    d3.select("#zoom-out")
        .on("click", () => {

            svg.transition()
                .duration(300)

                .call(
                    zoom.scaleBy,
                    1 / 1.5
                );

        });


    // ==========================================
    // RESET ZOOM
    // ==========================================

    d3.select("#zoom-reset")
        .on("click", () => {

            svg.transition()
                .duration(400)

                .call(
                    zoom.transform,
                    d3.zoomIdentity
                );

        });

})
.catch(error => {

    console.error(
        "Error loading map or places data:",
        error
    );

});