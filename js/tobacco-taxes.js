'use strict'

var DATA_PATH = 'https://static.taxfoundation.org/tobacco-taxes/data/data.min.json';

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
        console.log(d, cpiU[+d.y])
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
  1955: 9.539440299,
  1956: 9.399154412,
  1957: 9.098113879,
  1958: 8.846262976,
  1959: 8.785463918,
  1960: 8.637060811,
  1961: 8.550401338,
  1962: 8.465463576,
  1963: 8.354803922,
  1964: 8.247,
  1965: 8.116095238,
  1966: 7.890648148,
  1967: 7.654401198,
  1968: 7.346465517,
  1969: 6.96613079,
  1970: 6.589097938,
  1971: 6.312518519,
  1972: 6.116196172,
  1973: 5.758040541,
  1974: 5.185740365,
  1975: 4.751988848,
  1976: 4.493093146,
  1977: 4.218762376,
  1978: 3.921119632,
  1979: 3.521446281,
  1980: 3.102633495,
  1981: 2.812508251,
  1982: 2.649295337,
  1983: 2.566837349,
  1984: 2.460606352,
  1985: 2.375994424,
  1986: 2.332636861,
  1987: 2.250501761,
  1988: 2.161090448,
  1989: 2.06175,
  1990: 1.956059679,
  1991: 1.877070485,
  1992: 1.822216679,
  1993: 1.769252595,
  1994: 1.725080972,
  1995: 1.67753937,
  1996: 1.629426386,
  1997: 1.592878505,
  1998: 1.568447853,
  1999: 1.534555822,
  2000: 1.484651568,
  2001: 1.443574252,
  2002: 1.42110617,
  2003: 1.389440217,
  2004: 1.353398624,
  2005: 1.309047619,
  2006: 1.268139881,
  2007: 1.233020806,
  2008: 1.187428879,
  2009: 1.19166857,
  2010: 1.172437356,
  2011: 1.136561468,
  2012: 1.113517775,
  2013: 1.097442876,
  2014: 1.079924473,
  2015: 1.078644148,
  2016: 1.065206431,
  2017: 1.042987108,
  2018: 1.018119766,
  2019: 1,
};
