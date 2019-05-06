'use strict'

var DATA_PATH = 'https://tobacco-tax-revenues.netlify.com/data/data.min.json';

(function() {
  var dimensions = {
    height: 520,
    width: document.getElementById('tobacco-taxes').getBoundingClientRect().width
  };

  var padding = {
    top: 20,
    right: 30,
    bottom: 30,
    left: 130
  };

  d3.json(DATA_PATH, function(error, data) {
      if (error) { console.log(error); }

      app.init(data, dimensions, padding);
  });
})();

var app = {
  init: function(data, dimensions, padding) {
    this.data = data;
    this.dimensions = dimensions;
    this.padding = padding;

    app.createDropdown(app.data);
    app.setupListeners();

    this.svg = d3.select('#tobacco-taxes')
      .append('svg');

    app.svg.attr('id', 'tobacco-svg')
      .attr('height', app.dimensions.height)
      .attr('width', app.dimensions.width);

    app.svg.append('g')
      .attr('id', 'x-axis')
      .attr('class', 'axis')
      .attr(
        'transform',
        'translate(0, ' + (app.dimensions.height - app.padding.bottom) + ')'
      );

    app.svg.append('g')
      .attr('id', 'y-collections')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + app.padding.left + ', ' + app.padding.top + ')');

    app.svg.append('text')
      .attr('id', 'y-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'translate(30, ' + app.dimensions.height/2 + ') rotate(-90)')
      .text('Net Collections (thousands)');

    // app.svg.append('g')
    //   .attr('id', 'y-rates')
    //   .attr(
    //     'transform',
    //     'translate(' + (app.dimensions.width - app.padding.right) + ', 0)');

    this.hikes = app.svg.append('g')
      .attr('id', 'hikes-group')
      .attr('transform', 'translate(0, ' + app.padding.top + ')');

    this.collections = app.svg.append('path')
      .attr('id', 'collections-line')
      .attr('style', 'stroke: #0094ff; stroke-width: 3; fill: none;')
      .attr('transform', 'translate(0, ' + app.padding.top + ')');

    // this.taxPercentage = app.svg.append('path')
    //   .attr('id', 'tax-as-percentage-of-price')
    //   .attr('style', 'stroke: red; stroke-width: 2; fill: none;');

    this.inflationAdjusted = true;

    this.tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('opacity', 0)
      .style('border', '1px solid #333333')
      .style('background-color', '#fefefe')
      .style('padding', '8px')
      .style('width', '150px');

    this.dateFormat = d3.utcFormat('%B %e, %Y');
    this.adjustment = d3.scaleLinear()
        .domain([0, window.outerWidth])
        .range([0, 150]);
    this.dollarFormat = d3.format(',.2f');

    app.draw();
    window.addEventListener('resize', app.resize);
  },

  resize: function() {
    var width = document.getElementById('tobacco-taxes').getBoundingClientRect().width;
    app.dimensions.width = width;
    app.svg.attr('width', app.dimensions.width);
    app.adjustment = d3.scaleLinear()
        .domain([0, app.dimensions.width])
        .range([0, 150]);
    app.draw();
  },

  createDropdown: function(data) {
    var keys = Object.keys(data);
    for (var key in data) {
      d3.select('#stateTobaccoSelect').append('option')
        .attr('value', key)
        .property('selected', function(d) {
          return key === 'new-york' ? true : false;
        })
        .html(data[key].name);
    }
  },

  setupListeners: function() {
    document.getElementById('stateTobaccoSelect').addEventListener('change', function() {
      app.draw();
    });
    document.getElementById('inflation').addEventListener('change', function() {
      app.inflationAdjusted = !app.inflationAdjusted;
      app.draw();
    });
  },

  draw: function(state) {
    var state = document.getElementById('stateTobaccoSelect').value;
    var stateData = app.data[state];

    //Sacles
    var xMin = d3.min(stateData.collections.map(function(d) { return +d.y; }));
    var xMax = d3.max(stateData.collections.map(function(d) { return +d.y; }));

    var collectionsMin = 0;
    var collectionsMax = app.inflationAdjusted
      ? d3.max(stateData.collections.map(function(d) {
        return +d.nCol * cpiU[+d.y];
      }))
      : d3.max(stateData.collections.map(function(d) { return +d.nCol; }));

    // var ratesMax = app.findMax(stateData.collections, 'tP');

    var dateScale = d3.scaleTime()
      .domain([new Date(Date.parse(xMin + '-01-01')),new Date(Date.parse(xMax + '-12-31'))])
      .range([app.padding.left, app.dimensions.width - app.padding.right]);

    var collectionsScale = d3.scaleLinear()
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
    var collectionsLine = d3.line()
      .x(function(d) {
        return dateScale(new Date(Date.parse(d.y + '-12-31')));
      })
      .y(function(d) {
        return collectionsScale(app.inflationAdjusted ? +d.nCol * cpiU[+d.y] : +d.nCol);
      });

    //Tax as Percentage of Price line
    // var taxPercentageLine = d3.line()
    //   .x(function(d) {
    //     return dateScale(new Date(Date.parse(d.y + '-12-31')));
    //   })
    //   .y(function(d) {
    //     return rateScale(+d.tP);
    //   });

    var chart = app.svg
      .transition().duration(750);
    chart.select('#x-axis').call(xAxis);
    chart.select('#y-collections')
      .call(yCollections.tickFormat(d3.format('$,')));
    // chart.select('#y-rates').call(yRates);

    app.collections
      .data([stateData['collections']])
      .transition()
      .duration(750)
      .attr('d', collectionsLine);

    // app.taxPercentage
    //   .data([stateData['collections']])
    //   .transition()
    //   .duration(750)
    //   .attr('d', taxPercentageLine);

    app.hikes.selectAll('line').remove();
    app.hikes
      .selectAll('line')
      .data(stateData.rates)
      .enter()
      .append('line')
      .attr('x1', function(d) { return dateScale(new Date(Date.parse(d.date))); })
      .attr('x2', function(d) { return dateScale(new Date(Date.parse(d.date))); })
      .attr('y1', 0)
      .attr('y2', app.dimensions.height - app.padding.top - app.padding.bottom)
      .attr('style', 'stroke: #FFE082; stroke-width: 5; fill: none;')
      .on('mouseover', function (d) { return app.addTooltip(d.date, d.rate); })
      .on('mouseout', function () { app.tooltip.transition().duration(200).style('opacity', 0); });
  },

  addTooltip: function(date, rate) {
    app.tooltip.transition()
      .duration(200)
      .style('opacity', 0.9);

    app.tooltip.html(
        'Rate changed on<br>' + app.dateFormat(new Date(date)) + ' to<br>'
        + (+rate >= 1 ? '$' + app.dollarFormat(rate) : Math.round(100 * rate) + '&cent;')
        + ' per pack.'
      )
      .style('left', (d3.event.pageX - app.adjustment(d3.event.pageX)) + 'px')
      .style('top', (d3.event.pageY + 20) + 'px');
  },
};

var cpiU = {
  1955: 9.347014925,
  1956: 9.209558824,
  1957: 8.914590747,
  1958: 8.667820069,
  1959: 8.578767123,
  1960: 8.462837838,
  1961: 8.377926421,
  1962: 8.267326733,
  1963: 8.18627451,
  1964: 8.080645161,
  1965: 7.952380952,
  1966: 7.707692308,
  1967: 7.5,
  1968: 7.198275862,
  1969: 6.825613079,
  1970: 6.456185567,
  1971: 6.185185185,
  1972: 5.992822967,
  1973: 5.641891892,
  1974: 5.081135903,
  1975: 4.656133829,
  1976: 4.402460457,
  1977: 4.133663366,
  1978: 3.84202454,
  1979: 3.450413223,
  1980: 3.040048544,
  1981: 2.755775578,
  1982: 2.595854922,
  1983: 2.515060241,
  1984: 2.410972089,
  1985: 2.328066914,
  1986: 2.285583942,
  1987: 2.205105634,
  1988: 2.117497887,
  1989: 2.02016129,
  1990: 1.916602907,
  1991: 1.839207048,
  1992: 1.785459729,
  1993: 1.733564014,
  1994: 1.690283401,
  1995: 1.643700787,
  1996: 1.596558317,
  1997: 1.560747664,
  1998: 1.536809816,
  1999: 1.503601441,
  2000: 1.454703833,
  2001: 1.41445511,
  2002: 1.392440245,
  2003: 1.361413043,
  2004: 1.326098465,
  2005: 1.282642089,
  2006: 1.242559524,
  2007: 1.208393632,
  2008: 1.163492801,
  2009: 1.167832168,
  2010: 1.148555708,
  2011: 1.113828368,
  2012: 1.091027875,
  2013: 1.075107296,
  2014: 1.058301648,
  2015: 1.056962025,
  2016: 1.04375,
  2017: 1.022031824,
  2018: 1
};