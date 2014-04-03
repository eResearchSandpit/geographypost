///////////////////////////////////////////////////////////////////////
//
// Global Variables
//
///////////////////////////////////////////////////////////////////////

var width = $(document).width(),
    height = 750,
    margin = {
        top: 20,
        right: 40,
        bottom: 30,
        left: 20
    },
    barchart_width = $(document).width() - margin.left - margin.right - 300,
    barchart_height = 180 - margin.top - margin.bottom,
    barWidth = 25,
    num_mapped = 50,
    totalShown = 100,
    mappedHeight = 57,
    unmappedHeight = 43,
    currYear = 0,
    shownOpacity = .9,
    fadeOpacity = 0,
    refreshSet = 0;

// Scales
var x = d3.scale.ordinal().rangeRoundBands([0, barchart_width - 60], .1);
var y = d3.scale.linear().range([barchart_height, 0]);

// Legend variables
var legend_x = 25,
    legend_y = 30,
    legend_width = 175,
    legend_height = 420,
    legend_margin = 20
    key_y = 40,
    key_x = 16,
    mapped_y = legend_y + legend_height - 90;

// Colors
var aliveThroughout = "#009939"; // active throughout
var diesDuring =  "#ff6600";     // closed
var bornDuring =  "0089cd";      // established
var aliveDuring = "#C00000";     // est and closed
var autoColor = "#15b290";
var currYearColor = "#CB709D";

// Brush Dates
var brushStart = 1849; // TODO(jheppler): find `floor` date automatically
var brushEnd = 1903; // TODO(jheppler): find `ceiling` date automatically (end year + 1)
var defaultDis = 1905;

///////////////////////////////////////////////////////////////////////
//
// Map
//
///////////////////////////////////////////////////////////////////////

// Get our map data ready
queue()
    .defer(d3.json, "data/us.json")
    .defer(d3.csv, "data/post_data.csv")
    .await(ready);

var projection = d3.geo.azimuthalEqualArea()
    .translate([680, 380])
    .rotate([118.9, 0])
    .center([1, 37.5])
    .scale(1170 * 2);

var svg = d3.select("body").append("svg")
    .attr("width", width - margin.right)
    .attr("height", "700")
    .attr("class", "mapviz");

var graticule = d3.geo.graticule()
    .extent([
        [-98 - 45, 38 - 45],
        [-98 + 45, 38 + 45]
    ])
    .step([22.5 / 4, 22.5 / 4]);

path = d3.geo.path()
    .projection(projection);

// Printing the map
function ready(error, us, post) {

    // A little coercion, since the CSV is untyped.
    post.forEach(function (d, i) {
        d.index = i;
        d.name = d["Name"];
        d.est = parseInt(d.Est.split("-")[0]);
        d.re1 = parseInt(d.Re1.split("-")[0]);
        d.re2 = parseInt(d.Re2.split("-")[0]);
        d.re3 = parseInt(d.Re3.split("-")[0]);
        d.dis1 = parseInt(d.Dis1.split("-")[0]);
        d.dis1 = parseInt(d.Dis1.split("-")[0]);
        if (d.Dis1 == "") {
            d.dis1 = defaultDis;
        }
        d.dis2 = parseInt(d.Dis2.split("-")[0]);
        if (d.Dis2 == "") {
            d.dis2 = defaultDis;
        }

        d.dis3 = parseInt(d.Dis3.split("-")[0]);
        if (d.dis3 == "") {
            d.dis3 = defaultDis;
        }
        d.dis4 = parseInt(d.Dis4.split("-")[0]);
        if (d.Dis4 == "") {
            d.dis4 = defaultDis;
        }
        d.lat = d["Latitude"];
        d.long = d["Longitude"];
    });

    var zoom = d3.behavior.zoom()
        .translate([0, 0])
        .scale(1)
        .scaleExtent([.8, 8])
        .on("zoomstart", zoomstart)
        .on("zoom", zoomed)
        .on("zoomend", zoomend);

    var carto = svg.append("g");
    var postOfficePoints = svg.append("g");

    carto.append("path")
        .datum(graticule.outline)
        .attr("class", "background")
        .attr("d", path);

    carto.append("path")
        .datum(topojson.feature(us, us.objects.land))
        .attr("class", "land")
        .attr("d", path);

    land = carto.append("path")
        .datum(topojson.mesh(us, us.objects.states, function (a, b) {
            return a.id !== b.id;
        }))
        .attr("class", "boundary")
        .attr("d", path);

    carto.append("clipPath")
        .attr("id", "clip")
        .append("use")
        .attr("xlink:href", "#land");

    // Make the legend
    var legend = svg.append("g")
        .attr("class", "legend");

    legend.append("rect")
        .attr("id", "legendBox")
        .attr("x", legend_x)
        .attr("y", legend_y - 15)
        .attr("width", legend_width)
        .attr("height", legend_height)
        .style();

    // Numbers showing the start and end brush dates.
    var brushYears = legend.append("g");

    // Brush Dates
    var brushStart = 1849; // TODO(jheppler): find `floor` date automatically
    var brushEnd = 1903; // TODO(jheppler): find `ceiling` date automatically (end year + 1)
    var defaultDis = 1905;

    brushYears.append("text")
        .attr("id", "brushYears")
        .classed("yearText", true)
        .text(brushStart + " - " + brushEnd)
        .attr("x", legend_x + 35)
        .attr("y", legend_y + 12);

    var key = legend.append("g");

    // Established during brush
    key.append("circle")
        .attr("id", "keyCircle1")
        .attr("cx", function () {
            return legend_x + key_x
        })
        .attr("cy", function () {
            return legend_y + key_y + 5
        })
        .attr("r", 5)
        .style("fill", autoColor);

    key.append("text")
        .attr("class", "legendText")
        .attr("id", "keyLabel1")
        .attr("x", function () {
            return legend_x + key_x + 10
        })
        .attr("y", function () {
            return legend_y + 10 + key_y
        })
        .text("Longer Lifespan");

    // Closed during brush
    key.append("circle")
        .attr("id", "keyCircle2")
        .attr("cx", function () {
            return legend_x + key_x
        })
        .attr("cy", function () {
            return legend_y + legend_margin + key_y + 5
        })
        .attr("r", 5)
        .style("fill", autoColor)
        .style("opacity", .75);

    key.append("text")
        .attr("class", "legendText")
        .attr("id", "keyLabel2")
        .attr("x", function () {
            return legend_x + key_x + 10
        })
        .attr("y", function () {
            return legend_y + legend_margin + 10 + key_y
        })
        .style("display", "none")
        .text("Closed");

    // Alive throughout brush
    key.append("circle")
        .attr("id", "keyCircle3")
        .attr("cx", function () {
            return legend_x + key_x
        })
        .attr("cy", function () {
            return legend_y + 2 * legend_margin + key_y + 5
        })
        .attr("r", 5)
        .style("fill", autoColor)
        .style("opacity", .5);

    key.append("text")
        .attr("class", "legendText")
        .attr("id", "keyLabel3")
        .attr("x", function () {
            return legend_x + key_x + 10
        })
        .attr("y", function () {
            return legend_y + 2 * legend_margin + 10 + key_y
        })
        .style("display", "none")
        .text("Active throughout");

    // Lives and dies during brush
    key.append("circle")
        .attr("id", "keyCircle4")
        .attr("cx", function () {
            return legend_x + key_x
        })
        .attr("cy", function () {
            return legend_y + 3 * legend_margin + key_y + 5
        })
        .attr("r", 5)
        .style("fill", autoColor)
        .style("opacity", .5);

    key.append("text")
        .attr("class", "legendText")
        .attr("id", "keyLabel4")
        .attr("x", function () {
            return legend_x + key_x + 10
        })
        .attr("y", function () {
            return legend_y + 3 * legend_margin + 10 + key_y
        })
        .text("Shorter Lifespan");

    // Post office toggles
    // Bar chart showing the percentage of mapped to unmapped data points within
    // the given brush
    var mappedChart = legend.append("g");

    // Mapped bar
    mappedChart.append("rect")
        .attr("id", "onMap")
        .attr("x", legend_x + 40)
        .attr("y", mapped_y - mappedHeight)
        .attr("width", barWidth)
        .attr("height", mappedHeight);

    // "Mapped" label
    mappedChart.append("text")
        .text("Mapped")
        .attr("class", "mapText")
        .attr("y", mapped_y + 15)
        .attr("x", legend_x + 25);

    // Mapped percentage label
    mappedChart.append("text")
        .text(mappedHeight + "%")
        .attr("class", "percentLabel")
        .attr("id", "mappedPercent")
        .attr("y", mapped_y - mappedHeight - 3)
        .attr("x", legend_x + 41);

    // Unmapped bar
    mappedChart.append("rect")
        .attr("id", "notOnMap")
        .attr("x", legend_x + 95)
        .attr("y", mapped_y - unmappedHeight)
        .attr("width", barWidth)
        .attr("height", unmappedHeight);

    // Unmapped percentage label
    mappedChart.append("text")
        .text(unmappedHeight + "%")
        .attr("class", "percentLabel")
        .attr("id", "unmappedPercent")
        .attr("y", mapped_y - unmappedHeight - 3)
        .attr("x", legend_x + 96);

    // "Unmapped" label
    mappedChart.append("text")
        .text("Unmapped")
        .attr("class", "mapText")
        .attr("y", mapped_y + 15)
        .attr("x", legend_x + 80);

    svg
      .call(zoom);

    // Printing points
    postoffices = postOfficePoints.selectAll("g.points-est")
        .data(post)
      .enter().append("g")
        .attr("class", "points-est")
        .style("fill", "midnightblue")
        .attr("transform", function (d) {
            return "translate(" + projection([d.long, d.lat]) + ")";
        })
        .on("mouseover", showLabel)
        .on("mouseout", function () {
            d3.selectAll("text.map-tooltip").remove();
            d3.selectAll("rect.bar").transition().duration(600).style("fill", function (d, i) {
                if (d.x == currYear) {
                    return currYearColor;
                } else {
                    return z[i]
                }
            });
        });

        d3.selectAll("g.points-est").filter(function(d) {return d["long"] == 0 && d["long"] == ""}).remove()

        unMappedPost = post.filter(function(el) {return el["long"] == 0 && el["long"] == ""});

    postoffices
        .append("circle")
        .attr("r", 2.5)
        .attr("class", "points-est")
        .style("fill", autoColor);

    styleOpacity();

    // *********************************************
    // Map Functions
    // *********************************************

    // On hover, lifespan of a post office
    function showLabel(d, i) {
        this.parentNode.appendChild(this);
        var startDate = d.est;
        var endDate = d.dis1;
        d3.selectAll("rect.bar").transition().duration(600).style("fill", function (d) {

            if (d.x >= startDate && d.x <= endDate) {
                return "goldenrod";
            }

            if (d.x == currYear) {
                return currYearColor;
            }

        });
    }

    // Some jQuery for the mouseover tooltip
    $('g.points-est').tipsy({
        gravity: 's',
        html: true,
        title: function () {
            var d = this.__data__;
            return "Name: " + d["Name"] + "<br>" + "Established: " + d["Est"] + "<br>" + "Discontinued: " + d["Dis1"];
        }
    });

    // *********************************************
    // Zoom functions
    // *********************************************

    function zoomstart() {
        d3.selectAll("g.points-est").style("display", "none");
    }

    function zoomed() {
        currentZoom = -99;

        postOfficePoints.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        carto.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        carto.select(".boundary").style("stroke-width", 1.5 / d3.event.scale + "px");
        if (currentZoom != d3.event.scale) {
            currentZoom = d3.event.scale;
            svg.selectAll("circle.points-est").attr("r", function () {
                return 2.5 / d3.event.scale + "px"
            });
        }
        labelSize = 16 / d3.event.scale;
        d3.select(".map-tooltip").style("font-size", 16 / d3.event.scale + "px");
    }

    function zoomend() {
        d3.selectAll("g.points-est").transition().duration(600).style("display", "block");
    }

}


///////////////////////////////////////////////////////////////////////
//
// Graphing the year counts as a bar chart.
//
///////////////////////////////////////////////////////////////////////

// Prepare the barchart canvas
var barchart = d3.select("body").append("svg")
    .attr("class", "barchart")
    .attr("width", $(document).width())
    .attr("height", barchart_height + margin.top + margin.bottom)
    .attr("y", height - barchart_height - 100)
    .attr("x", legend_x + legend_width)
    .append("g")
    .attr("transform", "translate(" + (margin.left + legend_x + legend_width + 10) + "," + margin.top + ")");

var yDom = [0, 0];
var xDom = [0, 0];

// Set the stacked barchart colors
var z = d3.scale.ordinal().range(["#0089cd", "#C00000"]);

// Plot the barchart data
d3.csv("data/years_count2.csv", function (error, post) {

    // Coercion since CSV is untyped
    post.forEach(function (d) {
        d["frequency"] = +d["frequency"];
        d["frequency_discontinued"] = +d["frequency_discontinued"];
        d["year"] = d3.time.format("%Y").parse(d["year"]).getFullYear();
    });

    brush = d3.svg.brush()
        .x(x)
        // .on("brushstart", brushstart)
        .on("brush", brushmove)
        .on("brushend", brushend);

    var freqs = d3.layout.stack()(["frequency", "frequency_discontinued"].map(function (type) {
        return post.map(function (d) {
            return {
                x: d["year"],
                y: +d[type]
            };
        });
    }));

    x.domain(freqs[0].map(function (d) {
        return d.x;
    }));
    y.domain([0, d3.max(freqs[freqs.length - 1], function (d) {
        return d.y0 + d.y;
    })]);

    yDom = y.domain;
    xDom = x.domain;

    // Axis variables for the bar chart
    x_axis = d3.svg.axis().scale(x).tickValues([1846, 1850, 1855, 1860, 1865, 1870, 1875, 1880, 1885, 1890, 1895, 1900]).orient("bottom");
    y_axis = d3.svg.axis().scale(y).orient("right");

    // x axis
    barchart.append("g")
        .attr("class", "x axis")
        .call(x_axis)
        .style("fill", "#fff")
        .attr("transform", "translate(0," + barchart_height + ")");

    // y axis
    barchart.append("g")
        .attr("class", "y axis")
        .call(y_axis)
        .style("fill", "#fff")
        .attr("transform", "translate(" + barchart_width + ",0)");

    // var w = barchart_width - margin.right - margin.left;

    // Add a group for each cause.
    var freq = barchart.selectAll("g.freq")
        .data(freqs)
      .enter().append("g")
        .attr("class", "freq")
        .style("fill", function (d, i) {
            return z(i);
        })
        .style("stroke", "#CCE5E5");

    // Add a rect for each date.
    rect = freq.selectAll("rect")
        .data(Object)
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function (d) {
            return x(d.x);
        })
        .attr("y", function (d) {
            return y(d.y0) + y(d.y) - barchart_height;
        })
        .attr("height", function (d) {
            return barchart_height - y(d.y);
        })
        .attr("width", x.rangeBand())
        .attr("id", function (d) {
            return d["year"];
        });

    // Draw the brush
    var arc = d3.svg.arc()
      .outerRadius(barchart_height / 12)
      .startAngle(0)
      .endAngle(function(d, i) { return i ? -Math.PI : Math.PI; });

    var brushg = barchart.append("g")
      .attr("class", "brush")
      .call(brush);

    brushg.selectAll(".resize").append("path")
        .attr("transform", "translate(0," +  barchart_height / 2 + ")")
        .attr("d", arc);

    brushg.selectAll("rect")
        .attr("height", barchart_height);


    // ****************************************
    // Barchart Functions
    // ****************************************

    // function brushstart() {
    //     // d3.selectAll("g.points-est").transition().duration(600).style("display", "none");
    //
    // }

    function brushmove() {
        d3.selectAll("g.points-est").transition().duration(600).style("display", "none");
    }

    function brushend() {

        b = brush.empty() ? [0, 2000] : brush.extent();
        newscale = d3.scale.linear();
        newscale.domain(x.range()).range(x.domain());

        // console.log(brush.extent());

        var year_begin = newscale(b[0]); // remove?
        var year_end = newscale(b[1]); // remove?

        brushStart = Math.ceil(year_begin);
        brushEnd = Math.floor(year_end);

        // To make math work, set a disestablish date of greater than the maximum
        // date in the span of years if a post office is never disestablished.
        var defaultDis = 1905;

        // When brushed, depending on option selected call a function to show and style points
        filterPoints();
        colorPoints();
        styleOpacity();

        // Update percent mapped vs percent unmapped bars
        mappedHeight = (num_mapped / totalShown) * 100;
        //console.log(mappedHeight);
        unmappedHeight = ((totalShown - num_mapped) / totalShown) * 100;
        d3.select("#onMap").attr("height", mappedHeight)
            .attr("y", function () {
                return mapped_y - mappedHeight
            });
        d3.select("#notOnMap").attr("height", unmappedHeight)
            .attr("y", function () {
                return mapped_y - unmappedHeight
            });
        d3.select("svg").append("brushYears");
        d3.select("#mappedPercent").text(Math.round(mappedHeight) + "%");
        d3.select("#unmappedPercent").text(Math.round(unmappedHeight) + "%");
        d3.select("#mappedPercent").attr("y", mapped_y - mappedHeight - 3);
        d3.select("#unmappedPercent").attr("y", mapped_y - unmappedHeight - 3);

        // Update start and end years in upper right-hand corner of the map
        d3.select("#brushYears").text(brushStart + " - " + brushEnd);

        // Fade all years in the histogram not within the brush
        d3.selectAll("rect.bar").style("opacity", function (d, i) {
            return d.x >= year_begin && d.x <= year_end ? "1" : ".4"
        });
    }
});

// ****************************************
// Post office status functions
// These indicate one of four categories that a post office can be in during a
// d3.js brush event.
// ****************************************

var arrSize = 4;

//Returns whether or not the post office was alive at a given date
function isAliveStart(estArr, lifeSpanArr, brushDate) {
    for (var i = 0; i < arrSize; i++) {
        if (estArr[i] < brushDate && brushDate <= (estArr[i] + lifeSpanArr[i])) {
            return true;
        }
    }
    return false;
};

function isAliveEnd(estArr, lifeSpanArr, brushDate) {
    for (var j = 0; j < arrSize; j++) {
        if (estArr[j] <= brushDate && brushDate < (estArr[j] + lifeSpanArr[j])) {
            return true;
        }
    }
    return false;
};

// If the post office was established during the brush, it existed during the brush.
// Only post offices that were dead at the start and end of the brush are passed to this function.
function isDuring(est, brushMin, brushMax) {
    for (var k = 0; k < arrSize; k++) {
        if (brushMin <= est[k] && est[k] <= brushMax) {
            return true;
        }
    }
    return false;
};

function colorPoints() {

    //Colors the points to reflect their category within the brush
    d3.selectAll("circle.points-est").style("fill", function (d, i) {

        // Arrays of established dates and subsequent life spans of a single post office.
        // Note: assumes there are exactly 4 establish dates in the data
        var estArr = [d.est, d.re1, d.re2, d.re3];
        var lifespanArr = [d.dis1 - d.est, d.dis2 - d.re1, d.dis3 - d.re2, d.dis4 - d.re3];

        // Bools are true if post office was alive at the time of brushMin and brushMax
        var startAlive = false;
        var endAlive = false;

        // Determine whether or not a post is alive at the start and end of brush
        startAlive = isAliveStart(estArr, lifespanArr, brushStart);
        endAlive = isAliveEnd(estArr, lifespanArr, brushEnd);

        if (document.getElementById("regular").checked == true) {
            if (startAlive && endAlive) { //Alive throughout (or at least at start and end)
                return aliveThroughout;
            } else if (startAlive && !endAlive) { //Dies during brush
                return diesDuring;
            } else if (!startAlive && endAlive) { //Established during brush
                return bornDuring;
            } else if (isDuring(estArr, brushStart, brushEnd)) { //Est. and dies during brush.
                return aliveDuring;
            } else {
                return "black";
            }
        } else if (document.getElementById("snapshot").checked == true) {
            return autoColor;
        }

    });
};

///////////////////////////////////////////////////////////////////////
//
// Styling functions
//
///////////////////////////////////////////////////////////////////////

function styleOpacity() {

    d3.selectAll("circle.points-est").style("opacity", function (d) {
        if (document.getElementById("regular").checked == true) {
            return shownOpacity;
        } else if (document.getElementById("snapshot").checked == true) {
            var estArr = [d.est, d.re1, d.re2, d.re3];
            var lifespanArr = [d.dis1 - d.est, d.dis2 - d.re1, d.dis3 - d.re2, d.dis4 - d.re3];

            // Bools are true if post office was alive at the time of brushMin and brushMax
            var startAlive = false;
            var endAlive = false;

            // Determine whether or not a post is alive at the start and end of brush
            startAlive = isAliveStart(estArr, lifespanArr, brushStart);
            endAlive = isAliveEnd(estArr, lifespanArr, brushEnd);

            var brushSpan = brushEnd - brushStart;
            var percentAlive = 0;

            for (var i = 0; i < arrSize; i++) {
                // If the post office was alive at the start of the brush, add appropriate number of years
                if (estArr[i] < brushStart && brushStart <= (estArr[i] + lifespanArr[i])) {
                    if (estArr[i] + lifespanArr[i] >= brushEnd) {
                        return 1;
                    } else {
                        percentAlive += (estArr[i] + lifespanArr[i] - brushStart);
                    }
                }
                // Otherwise, if the post office was established any number of times during the brush, add appropriate years
                else if (brushStart <= estArr[i] && estArr[i] <= brushEnd) {
                    if (brushEnd >= (estArr[i] + lifespanArr[i])) {
                        percentAlive += lifespanArr[i];
                    } else {
                        percentAlive += (brushEnd - estArr[i]);
                    }
                }
            }
            return percentAlive / brushSpan;
        }

    });
};

function showEst() {
    d3.selectAll("g.points-est").transition().duration(500).style("display", function (d) {

        var estArr = [d.est, d.re1, d.re2, d.re3];

        for (var i = 0; i < arrSize; i++) {
            if (estArr[i] <= brushEnd && estArr[i] >= brushStart) {
                return "block";
            }
        }
        return "none";
    });
    return "none";
};

function showDis() {

    d3.selectAll("g.points-est").transition().duration(500).style("display", function(d) {

        var disArr = [d.dis1, d.dis2, d.dis3, d.dis4];

        for (var i = 0; i < arrSize; i++) {
            if (disArr[i] <= brushEnd && disArr[i] >= brushStart) {
                return "block";
            }
        }
        return "none";
    });
};

function showEstAndDis() {

    d3.selectAll("g.points-est").transition().duration(500).style("display", function(d) {

        var estArr = [d.est, d.re1, d.re2, d.re3];
        var disArr = [d.dis1, d.dis2, d.dis3, d.dis4];

        for (var i = 0; i < arrSize; i++) {
            if (disArr[i] <= brushEnd && disArr[i] >= brushStart) {
                return "block";
            } else if (estArr[i] <= brushEnd && estArr[i] >= brushStart) {
                return "block";
            }
        }
        return "none";
    });
};

function showAll() {
    totalShown = 0;
    num_mapped = 0;
    var num_unmapped = 0;

    var totalPoints = 0;
    var totalUnshown = 0;

    d3.selectAll("g.points-est").style("display", function (d) {
        totalPoints++;

        var estArr = [d.est, d.re1, d.re2, d.re3];
        var lifespanArr = [d.dis1 - d.est, d.dis2 - d.re1, d.dis3 - d.re2, d.dis4 - d.re3];

        // Bools are true if post office was alive at the time of brushMin and brushMax
        var startAlive = false;
        var endAlive = false;

        // Determine whether or not a post is alive at the start and end of brush
        startAlive = isAliveStart(estArr, lifespanArr, brushStart);
        endAlive = isAliveEnd(estArr, lifespanArr, brushEnd);

        // Show all offices alive at some point if 'all', only established during that time if 'established', and only disestablished if 'disestablished' radio button selected
        // Buggy: does not account for discontinuity in otherwise-classed offices.
        // Buggy: only goes into effect when the brush is changed; not automatic.
        if (startAlive && endAlive) {
            d3.select(this).style("opacity", shownOpacity);
            totalShown++;
            if (d["Latitude"] == 0 || d["Latitude"] == "") {
                num_unmapped++;
                return "none";
            } else {
                num_mapped++;
                return "block";
            }
        } else if (startAlive && !endAlive) {
            d3.select(this).style("opacity", shownOpacity);
            totalShown++;
            if (d["Latitude"] == 0 || d["Latitude"] == "") {
                num_unmapped++;
                return "none";
            } else {
                num_mapped++;
                return "block";
            }
        } else if (!startAlive && endAlive) {
            d3.select(this).style("opacity", shownOpacity);
            totalShown++;
            if (d["Latitude"] == 0 || d["Latitude"] == "") {
                num_unmapped++;
                return "none";
            } else {
                num_mapped++;
                return "block";
            }
        } else if (isDuring(estArr, brushStart, brushEnd)) {
            d3.select(this).style("opacity", shownOpacity);
            totalShown++;
            if (d["Latitude"] == 0 || d["Latitude"] == "") {
                num_unmapped++;
                return "none";
            } else {
                num_mapped++;
                return "block";
            }
        }
        return "none";

    });

  totalShown += unMappedPost.filter(function(el) {return isDuring([el.est, el.re1, el.re2, el.re3],brushStart, brushEnd)}).length;

};

// When a filter checkbox is selected or unselected, update the points shown to reflect current filter
function filterPoints() {

    if (document.getElementById("estab").checked && !document.getElementById("discont").checked) {
        showEst();
    } else if (!document.getElementById("estab").checked && document.getElementById("discont").checked) {
        showDis();
    } else if (document.getElementById("estab").checked && document.getElementById("discont").checked) {
        showEstAndDis();
    } else {
        showAll();
    }
};

// For use in year-by-year: show only offices that were established or discontinued during that year
function showEstDis() {

    d3.selectAll("g.points-est").style("display", function (d) {

        var estArr = [d.est, d.re1, d.re2, d.re3];
        var lifespanArr = [d.dis1 - d.est, d.dis2 - d.re1, d.dis3 - d.re2, d.dis4 - d.re3];

        for (var i = 0; i < arrSize; i++) {
            if (estArr[i] == currYear) {
                return "block"
            } else if ((estArr[i] + lifespanArr[i]) == currYear) {
                return "block";
            } else {
                return "none";
            }
        }

    });

    d3.selectAll("circle.points-est").style("fill", function (d) {

        var estArr = [d.est, d.re1, d.re2, d.re3];
        var lifespanArr = [d.dis1 - d.est, d.dis2 - d.re1, d.dis3 - d.re2, d.dis4 - d.re3];

        for (var i = 0; i < arrSize; i++) {
            if (estArr[i] == currYear) {
                d3.select(this).style("opacity", .8);
            } else if ((estArr[i] + lifespanArr[i]) == currYear) {
                d3.select(this).style("opacity", .8);
            }
        }

    });
};

function clearPointData() {
    d3.selectAll("g.points-est").transition().duration(600).style("display", "none");
}

function brushComplete() {
  d3.selectAll("g.points-est").transition().duration(600).style("display", "block");
}


// Reprojecting the map

function reproject(newProjection) {
    console.log("reprojecting");
    path.projection(newProjection)
    d3.selectAll("path.land").transition().duration(500).attr("d", path);
    d3.selectAll("g.points-est").transition().duration(500).attr("transform", function (d) {
        return "translate(" + newProjection([d.long, d.lat]) + ")";
    });
    d3.selectAll("path.boundary").transition().duration(500).attr("d", path);
};

function showRegular() {
    fadeOpacity = .1;
    document.getElementById("regular").checked = true;
    document.getElementById("tab2").style.zIndex = "-3";
    document.getElementById("tab2").style.background = "#f7f7f7"
    document.getElementById("tab3").style.zIndex = "-5";
    document.getElementById("tab3").style.background = "#F5F1DE"
    document.getElementById("tab1").style.zIndex = "-4";
    document.getElementById("tab1").style.background = "#F5F1DE"
    showAll();
    document.getElementById("selections").style.visibility = "visible";
    colorPoints();
    styleOpacity();
    d3.selectAll("g.key").transition().duration(1000).style("opacity", .8);
    document.getElementById("keyCircle1").style.fill = bornDuring;
    document.getElementById("keyCircle2").style.fill = diesDuring;
    document.getElementById("keyCircle3").style.fill = aliveThroughout;
    document.getElementById("keyCircle4").style.fill = aliveDuring;
    document.getElementById("keyCircle2").style.opacity = 1;
    document.getElementById("keyCircle3").style.opacity = 1;
    document.getElementById("keyCircle4").style.opacity = 1;
    d3.select("#keyLabel1").text("Established");
    d3.select("#keyLabel2").style("display", "block");
    d3.select("#keyLabel3").style("display", "block");
    d3.select("#keyLabel4").text("Estab. and Closed");
};

function showSnapshot() {
    fadeOpacity = 0;
    document.getElementById("snapshot").checked = true;
    document.getElementById("tab2").style.zIndex = "-4";
    document.getElementById("tab2").style.background = "#F5F1DE";
    document.getElementById("tab1").style.zIndex = "-3";
    document.getElementById("tab1").style.background = "#f7f7f7"
    showAll();
    colorPoints();
    d3.selectAll("g.key").transition().duration(1000).style("opacity", 0);
    styleOpacity();
    document.getElementById("keyCircle1").style.fill = autoColor;
    document.getElementById("keyCircle1").style.opacity = 1;
    d3.select("#keyLabel1").text("Longer Lifespan");
    document.getElementById("keyCircle2").style.fill = autoColor;
    document.getElementById("keyCircle2").style.opacity = .75;
    d3.select("#keyLabel2").style("display", "none");
    document.getElementById("keyCircle3").style.fill = autoColor;
    document.getElementById("keyCircle3").style.opacity = .5;
    d3.select("#keyLabel3").style("display", "none");
    document.getElementById("keyCircle4").style.fill = autoColor;
    document.getElementById("keyCircle4").style.opacity = .25;
    d3.select("#keyLabel4").text("Shorter Lifespan");
};

// Fade in the box containing the information about the project
function showAbout() {
    if (document.getElementById("aboutText").style.display == "none") {
        document.getElementById("aboutText").style.display = "block";
    } else {
        document.getElementById("aboutText").style.display = "none";
    }
};

// If brush is active, highlights first possible year. Otherwise, moves the display forward a year.
function yearForward() {
    // TODO(jheppler): Let's rework this so it uses the Brush properly
    if (currYear == 0) {
        d3.selectAll(".brush").style("display", "none");
        d3.selectAll("rect.bar").style("opacity", 1);
        currYear = 1847;
        document.getElementById("returnBrush").style.visibility = "visible";
    } else {
        currYear++;
    }

    d3.selectAll("rect.bar").transition().duration(600).style("fill", function (d) {
        if (d.x == currYear) {
            var marker = d3.select("barchart").append("rect")
                .attr("x", x(d.x))
                .attr("width", x.rangeBand())
                .attr("height", barchart_height);
            return currYearColor;
        }
    });

    d3.selectAll("rect.bar").attr("height", function (d) {
        if (d.x == currYear) {
            d3.select(this).attr("y", 0);
            return barchart_height;
        } else {
            d3.select(this).attr("y", function (d) {
                return y(d.y0) + y(d.y) - barchart_height;
            });
            return barchart_height - y(d.y);
        }
    });
    brushStart = currYear;
    brushEnd = currYear;
    showAll();

    // Update start and end years in upper right-hand corner of the map
    d3.select("#brushYears").text(currYear);
};

// If brush is active, highlights first possible year. Otherwise, moves the display forward a year.
function yearBack() {
    if (currYear == 0) {
        d3.selectAll(".brush").style("display", "none");
        d3.selectAll("rect.bar").style("opacity", 1);
        currYear = 1902;
        document.getElementById("returnBrush").style.visibility = "visible";
    } else {
        currYear--;
    }

    d3.selectAll("rect.bar").transition().duration(600).style("fill", function (d) {
        if (d.x == currYear) {
            return currYearColor;
        }
    });
    console.log(currYear);
    brushStart = currYear;
    brushEnd = currYear;
    showAll();

    // Update start and end years in upper right-hand corner of the map
    d3.select("#brushYears").text(currYear);
}

function returnBrush() {
    // currYear = 0;
    document.getElementById("returnBrush").style.visibility = "hidden";
    d3.selectAll("rect.bar").style("fill", function () {
        return;
    });
    d3.selectAll(".brush").style("display", "block");
    brushStart = 1849;
    brushEnd = 1905;
    d3.select("#brushYears").text(brushStart + " - " + brushEnd);
}