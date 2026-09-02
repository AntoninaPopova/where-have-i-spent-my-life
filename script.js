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

        d.latitude = +d.latitude;
        d.longitude = +d.longitude;
        d.days = +d.days;

    });

    console.log("Places:", places);


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
    // TIME SCALES
    // ==========================================

    let currentScale = "log";


    // Linear radius

    const radiusLinear = d3.scaleLinear()
        .domain([minDays, maxDays])
        .range([2.5, 18]);


    // Logarithmic radius

    const radiusLog = d3.scaleLog()
        .domain([minDays, maxDays])
        .range([2.5, 18]);


    // Linear opacity

    const opacityLinear = d3.scaleLinear()
        .domain([minDays, maxDays])
        .range([0.9, 0.18]);


    // Logarithmic opacity

    const opacityLog = d3.scaleLog()
        .domain([minDays, maxDays])
        .range([0.9, 0.18]);


    // ==========================================
    // FUNCTIONS FOR CURRENT SCALE
    // ==========================================

    function getRadius(days) {

        if (currentScale === "linear") {
            return radiusLinear(days);
        }

        return radiusLog(days);

    }


    function getOpacity(days) {

        if (currentScale === "linear") {
            return opacityLinear(days);
        }

        return opacityLog(days);

    }


    // ==========================================
    // COMPANION COLOURS
    // ==========================================

    const companionColors = {

        "alone": "#C9ADA7",

        "with family": "#9A8C98",

        /*"with husband": "#4A4E69",*/

        "with friends": "#22223B"

    };


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


        // Position

        .attr("cx", d => {

            return projection([
                d.longitude,
                d.latitude
            ])[0];

        })

        .attr("cy", d => {

            return projection([
                d.longitude,
                d.latitude
            ])[1];

        })


        // Size

        .attr("r", d =>
            getRadius(d.days)
        )


        // Colour

        .attr("fill", d =>

            companionColors[d.companions]
            || "#22223B"

        )


        // Transparency

        .attr("fill-opacity", d =>
            getOpacity(d.days)
        )


        // ==========================================
        // TOOLTIP
        // ==========================================

        .on("mouseenter", function(event, d) {

            tooltip
                .style("display", "block")

                .html(`

                    <strong>
                        ${d.city}, ${d.country}
                    </strong>

                    <div class="tooltip-story">
                        ${d.tooltip}
                    </div>

                    <div class="tooltip-meta">
                        ${d.days.toLocaleString()} days ·
                        ${d.type} ·
                        ${d.companions}
                    </div>

                `);

        })


        .on("mousemove", function(event) {

            tooltip
                .style(
                    "left",
                    `${event.clientX + 15}px`
                )

                .style(
                    "top",
                    `${event.clientY + 15}px`
                );

        })


        .on("mouseleave", function() {

            tooltip
                .style("display", "none");

        });


    // ==========================================
    // PLACE TYPE FILTER
    // ==========================================

    const filterButtons =
        d3.selectAll(".filter");


    filterButtons.on("click", function() {

        const selectedType =
            d3.select(this)
                .attr("data-type");


        // Update active button

        filterButtons
            .classed("active", false);

        d3.select(this)
            .classed("active", true);


        // Show / hide places

        placeCircles
            .transition()
            .duration(400)

            .style("opacity", d => {

                if (selectedType === "all") {
                    return 1;
                }

                return d.type === selectedType
                    ? 1
                    : 0;

            });

    });


    // ==========================================
    // LINEAR / LOGARITHMIC SCALE SWITCH
    // ==========================================

    const scaleButtons =
        d3.selectAll(".scale-button");


    scaleButtons.on("click", function() {

        // Get selected scale

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

            .attr("r", d =>
                getRadius(d.days)
            )

            .attr("fill-opacity", d =>
                getOpacity(d.days)
            );

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
    // ZOOM IN
    // ==========================================

    d3.select("#zoom-in")
        .on("click", () => {

            svg.transition()
                .duration(300)

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

});