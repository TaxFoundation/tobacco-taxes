"use strict";

var DATA_PATH = "/data/data.min.json";

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
  1955: 10.535580524344569,
  1956: 10.494402985074627,
  1957: 10.185507246376812,
  1958: 9.823426573426573,
  1959: 9.694413793103448,
  1960: 9.593548387096774,
  1961: 9.436241610738255,
  1962: 9.3716,
  1963: 9.245394736842105,
  1964: 9.099837133550489,
  1965: 9.006410256410257,
  1966: 8.842767295597484,
  1967: 8.53921052631579,
  1968: 8.245864661654135,
  1969: 7.900505617977528,
  1970: 7.437566137566137,
  1971: 7.065075376884422,
  1972: 6.836613216715258,
  1973: 6.597183098591549,
  1974: 6.029046563192904,
  1975: 5.39452736318408,
  1976: 5.057014388489209,
  1977: 4.805854700854701,
  1978: 4.498368,
  1979: 4.115293233082707,
  1980: 3.6146022514071295,
  1981: 3.230551724137931,
  1982: 2.9849498327759197,
  1983: 2.8747440273037546,
  1984: 2.759381898454746,
  1985: 2.6662277070063693,
  1986: 2.566906735751296,
  1987: 2.5277748478701826,
  1988: 2.4298829458272357,
  1989: 2.3225002062627804,
  1990: 2.207163325841622,
  1991: 2.089119170984456,
  1992: 2.0364963503649636,
  1993: 1.972420262664165,
  1994: 1.9232101616628174,
  1995: 1.8705521472392638,
  1996: 1.8208479415670651,
  1997: 1.767809364548495,
  1998: 1.7389981132075473,
  1999: 1.711399878903275,
  2000: 1.6658892128279884,
  2001: 1.605168759811617,
  2002: 1.5879556257077146,
  2003: 1.5470938016528925,
  2004: 1.5167713004484304,
  2005: 1.4744069912609238,
  2006: 1.4179079471341125,
  2007: 1.3893004769475357,
  2008: 1.3320059061302682,
  2009: 1.3317626651017216,
  2010: 1.2975666431593795,
  2011: 1.276984035667107,
  2012: 1.240148930672927,
  2013: 1.2212900432900433,
  2014: 1.2021003937007874,
  2015: 1.2029532157676348,
  2016: 1.186655290102389,
  2017: 1.1575539568345325,
  2018: 1.134274061990212,
  2019: 1.1168351810790867,
  2020: 1.0898203592814372,
  2021: 1.0748539603960396,
  2022: 1.0
};
