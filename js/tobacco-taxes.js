"use strict";

var DATA_PATH =
  "https://static.taxfoundation.org/tobacco-taxes/data/data.min.json";

(function () {
  var dimensions = {
    height: 520,
    width: document.getElementById("tobacco-taxes").getBoundingClientRect()
      .width,
  };

  var padding = {
    top: 20,
    right: 30,
    bottom: 30,
    left: 130,
  };

  d3.json(DATA_PATH, function (error, data) {
    if (error) {
      console.log(error);
    }

    app.init(data, dimensions, padding);
  });
})();

var app = {
  init: function (data, dimensions, padding) {
    this.data = data;
    this.dimensions = dimensions;
    this.padding = padding;

    app.createDropdown(app.data);
    app.setupListeners();

    this.svg = d3.select("#tobacco-taxes").append("svg");

    app.svg
      .attr("id", "tobacco-svg")
      .attr("height", app.dimensions.height)
      .attr("width", app.dimensions.width);

    app.svg
      .append("g")
      .attr("id", "x-axis")
      .attr("class", "axis")
      .attr(
        "transform",
        "translate(0, " + (app.dimensions.height - app.padding.bottom) + ")"
      );

    app.svg
      .append("g")
      .attr("id", "y-collections")
      .attr("class", "axis")
      .attr(
        "transform",
        "translate(" + app.padding.left + ", " + app.padding.top + ")"
      );

    app.svg
      .append("text")
      .attr("id", "y-label")
      .attr("text-anchor", "middle")
      .attr(
        "transform",
        "translate(30, " + app.dimensions.height / 2 + ") rotate(-90)"
      )
      .text("Net Collections (thousands)");

    // app.svg.append('g')
    //   .attr('id', 'y-rates')
    //   .attr(
    //     'transform',
    //     'translate(' + (app.dimensions.width - app.padding.right) + ', 0)');

    this.hikes = app.svg
      .append("g")
      .attr("id", "hikes-group")
      .attr("transform", "translate(0, " + app.padding.top + ")");

    this.collections = app.svg
      .append("path")
      .attr("id", "collections-line")
      .attr("style", "stroke: #0094ff; stroke-width: 3; fill: none;")
      .attr("transform", "translate(0, " + app.padding.top + ")");

    // this.taxPercentage = app.svg.append('path')
    //   .attr('id', 'tax-as-percentage-of-price')
    //   .attr('style', 'stroke: red; stroke-width: 2; fill: none;');

    this.inflationAdjusted = true;

    this.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("opacity", 0)
      .style("border", "1px solid #333333")
      .style("background-color", "#fefefe")
      .style("padding", "8px")
      .style("width", "150px");

    this.dateFormat = d3.utcFormat("%B %e, %Y");
    this.adjustment = d3
      .scaleLinear()
      .domain([0, window.outerWidth])
      .range([0, 150]);
    this.dollarFormat = d3.format(",.2f");

    app.draw();
    window.addEventListener("resize", app.resize);
  },

  resize: function () {
    var width = document.getElementById("tobacco-taxes").getBoundingClientRect()
      .width;
    app.dimensions.width = width;
    app.svg.attr("width", app.dimensions.width);
    app.adjustment = d3
      .scaleLinear()
      .domain([0, app.dimensions.width])
      .range([0, 150]);
    app.draw();
  },

  createDropdown: function (data) {
    var keys = Object.keys(data);
    for (var key in data) {
      d3.select("#stateTobaccoSelect")
        .append("option")
        .attr("value", key)
        .property("selected", function (d) {
          return key === "new-york" ? true : false;
        })
        .html(data[key].name);
    }
  },

  setupListeners: function () {
    document
      .getElementById("stateTobaccoSelect")
      .addEventListener("change", function () {
        app.draw();
      });
    document
      .getElementById("inflation")
      .addEventListener("change", function () {
        app.inflationAdjusted = !app.inflationAdjusted;
        app.draw();
      });
  },

  draw: function (state) {
    var state = document.getElementById("stateTobaccoSelect").value;
    var stateData = app.data[state];

    //Sacles
    var xMin = 1954;
    var xMax = d3.max(
      stateData.collections.map(function (d) {
        return +d.y;
      })
    );

    var collectionsMin = 0;
    var collectionsMax = app.inflationAdjusted
      ? d3.max(
          stateData.collections.map(function (d) {
            return +d.nCol * cpiU[+d.y];
          })
        )
      : d3.max(
          stateData.collections.map(function (d) {
            return +d.nCol;
          })
        );

    // var ratesMax = app.findMax(stateData.collections, 'tP');

    var dateScale = d3
      .scaleTime()
      .domain([
        new Date(Date.parse(xMin + "-01-01")),
        new Date(Date.parse(xMax + "-12-31")),
      ])
      .range([app.padding.left, app.dimensions.width - app.padding.right]);

    var collectionsScale = d3
      .scaleLinear()
      .domain([collectionsMax, collectionsMin])
      .range([0, app.dimensions.height - app.padding.top - app.padding.bottom]);

    // var rateScale = d3.scaleLinear()
    //   .domain([ratesMax, 0])
    //   .range([0, app.dimensions.height - app.padding.top - app.padding.bottom]);

    //Axes
    var xAxis = d3.axisBottom(dateScale);
    var yCollections = d3.axisLeft(collectionsScale);
    // var yRates = d3.axisRight(rateScale);
    if (app.dimensions.width <= 640) {
      xAxis.ticks(6);
    } else {
      xAxis.ticks(13);
    }

    //Collections line
    var collectionsLine = d3
      .line()
      .x(function (d) {
        return dateScale(new Date(Date.parse(d.y + "-12-31")));
      })
      .y(function (d) {
        return collectionsScale(
          app.inflationAdjusted ? +d.nCol * cpiU[+d.y] : +d.nCol
        );
      });

    //Tax as Percentage of Price line
    // var taxPercentageLine = d3.line()
    //   .x(function(d) {
    //     return dateScale(new Date(Date.parse(d.y + '-12-31')));
    //   })
    //   .y(function(d) {
    //     return rateScale(+d.tP);
    //   });

    var chart = app.svg.transition().duration(750);
    chart.select("#x-axis").call(xAxis);
    chart
      .select("#y-collections")
      .call(yCollections.tickFormat(d3.format("$,")));
    // chart.select('#y-rates').call(yRates);

    app.collections
      .data([stateData["collections"]])
      .transition()
      .duration(750)
      .attr("d", collectionsLine);

    // app.taxPercentage
    //   .data([stateData['collections']])
    //   .transition()
    //   .duration(750)
    //   .attr('d', taxPercentageLine);

    app.hikes.selectAll("line").remove();
    app.hikes
      .selectAll("line")
      .data(stateData.rates)
      .enter()
      .append("line")
      .attr("x1", function (d) {
        return dateScale(new Date(Date.parse(d.date)));
      })
      .attr("x2", function (d) {
        return dateScale(new Date(Date.parse(d.date)));
      })
      .attr("y1", 0)
      .attr("y2", app.dimensions.height - app.padding.top - app.padding.bottom)
      .attr("style", "stroke: #FFE082; stroke-width: 5; fill: none;")
      .on("mouseover", function (d) {
        return app.addTooltip(d.date, d.rate);
      })
      .on("mouseout", function () {
        app.tooltip.transition().duration(200).style("opacity", 0);
      });
  },

  addTooltip: function (date, rate) {
    app.tooltip.transition().duration(200).style("opacity", 0.9);

    app.tooltip
      .html(
        "Rate changed on<br>" +
          app.dateFormat(new Date(date)) +
          " to<br>" +
          (+rate >= 1
            ? "$" + app.dollarFormat(rate)
            : Math.round(100 * rate) + "&cent;") +
          " per pack."
      )
      .style("left", d3.event.pageX - app.adjustment(d3.event.pageX) + "px")
      .style("top", d3.event.pageY + 20 + "px");
  },
};

var cpiU = {
  1954: 9.621226766,
  1955: 9.657126866,
  1956: 9.515110294,
  1957: 9.210355872,
  1958: 8.955397924,
  1959: 8.893848797,
  1960: 8.743614865,
  1961: 8.655886288,
  1962: 8.569900662,
  1963: 8.457875817,
  1964: 8.348741935,
  1965: 8.216222222,
  1966: 7.987993827,
  1967: 7.748832335,
  1968: 7.437097701,
  1969: 7.052070845,
  1970: 6.670386598,
  1971: 6.390395062,
  1972: 6.191650718,
  1973: 5.829076577,
  1974: 5.249716024,
  1975: 4.810613383,
  1976: 4.548523726,
  1977: 4.270808581,
  1978: 3.969493865,
  1979: 3.564889807,
  1980: 3.140910194,
  1981: 2.847205721,
  1982: 2.681979275,
  1983: 2.598504016,
  1984: 2.490962464,
  1985: 2.405306691,
  1986: 2.361414234,
  1987: 2.278265845,
  1988: 2.187751479,
  1989: 2.087185484,
  1990: 1.980191278,
  1991: 1.900227606,
  1992: 1.844697078,
  1993: 1.791079585,
  1994: 1.746363023,
  1995: 1.698234908,
  1996: 1.649528362,
  1997: 1.612529595,
  1998: 1.587797546,
  1999: 1.553487395,
  2000: 1.50296748,
  2001: 1.461383399,
  2002: 1.438638132,
  2003: 1.406581522,
  2004: 1.370095289,
  2005: 1.325197133,
  2006: 1.283784722,
  2007: 1.248232389,
  2008: 1.202078002,
  2009: 1.206369997,
  2010: 1.18690153,
  2011: 1.150583047,
  2012: 1.127255068,
  2013: 1.110981855,
  2014: 1.09324733,
  2015: 1.09195121,
  2016: 1.078347715,
  2017: 1.055854275,
  2018: 1.030680148,
  2019: 1.012336842,
  2020: 1,
};
