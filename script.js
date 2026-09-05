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

        /*
         * Support both possible column names.
         */

        d.companions = (
            d.companions ||
            d.companion ||
            ""
        )
            .trim()
            .toLowerCase();

        /*
         * Normalize place type as well.
         */

        d.type = (
            d.type ||
            ""
        )
            .trim()
            .toLowerCase();

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
    // TIME SCALE
    // ==========================================

    let currentScale = "log";


    // ==========================================
    // LINEAR RADIUS
    // ==========================================

    const radiusLinear = d3.scaleLinear()
        .domain([minDays, maxDays])
        .range([2.5, 18]);


    // ==========================================
    // LOGARITHMIC RADIUS
    // ==========================================

    const radiusLog = d3.scaleLog()
        .domain([minDays, maxDays])
        .range([2.5, 18]);


    // ==========================================
    // LINEAR OPACITY
    // ==========================================

    const opacityLinear = d3.scaleLinear()
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


        // ==========================================
        // POSITION
        // ==========================================

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

            return companionColors[d.companions]
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

                    <strong>
                        ${d.city}, ${d.country}
                    </strong>

                    <div class="tooltip-story">
                        ${d.tooltip || ""}
                    </div>

                    <div class="tooltip-meta">
                        ${d.days.toLocaleString()} days ·
                        ${d.type} ·
                        ${d.companions}
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


            /*
             * Keep tooltip inside right edge.
             */

            if (
                left + tooltipWidth >
                window.innerWidth - 10
            ) {

                left =
                    event.clientX -
                    tooltipWidth -
                    15;

            }


            /*
             * Keep tooltip inside bottom edge.
             */

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

    /*
     * IMPORTANT:
     *
     * Current HTML uses:
     *     .filter-btn
     *     data-filter
     *
     * So the JavaScript must use exactly
     * those names.
     */

    const filterButtons =
        d3.selectAll(".filter-btn");


    filterButtons.on("click", function() {

        const selectedType =
            d3.select(this)
                .attr("data-filter");


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
                    : 0.08;

            });

    });


    // ==========================================
    // LINEAR / LOGARITHMIC SCALE SWITCH
    // ==========================================

    /*
     * Current HTML uses:
     *     .scale-btn
     *
     * So the JavaScript must use that class.
     */

    const scaleButtons =
        d3.selectAll(".scale-btn");


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

})
.catch(error => {

    console.error(
        "Error loading map or places data:",
        error
    );

});