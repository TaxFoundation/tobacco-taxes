'use strict'

var DATA_PATH = 'data/data.min.json';

(function() {
	var dimensions = {
		height: 500,
		width: document.getElementById('tobacco-taxes').getBoundingClientRect().width
	};

	var padding = {
		top: 0,
		right: 30,
		bottom: 30,
		left: 90
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
			.append('svg')
			.attr('id', 'tobacco-svg')
			.attr('height', app.dimensions.height)
			.attr('width', app.dimensions.width);

		app.svg.append('g')
			.attr('id', 'x-axis')
			.attr(
				'transform',
				'translate(0, ' + (app.dimensions.height - app.padding.bottom) + ')'
			);

		app.svg.append('g')
			.attr('id', 'y-collections')
			.attr('transform', 'translate(' + app.padding.left + ', 0)');

		app.svg.append('g')
			.attr('id', 'y-rates')
			.attr(
				'transform',
				'translate(' + (app.dimensions.width - app.padding.right) + ', 0)');

		this.collections = app.svg.append('path')
			.attr('id', 'collections-line')
			.attr('style', 'stroke: steelblue; stroke-width: 2; fill: none;');

		// this.taxPercentage = app.svg.append('path')
		// 	.attr('id', 'tax-as-percentage-of-price')
		// 	.attr('style', 'stroke: red; stroke-width: 2; fill: none;');

		this.hikes = app.svg.append('g')
			.attr('id', 'hikes-group');

		this.inflationAdjusted = true;

		app.draw();
	},

	createDropdown: function(data) {
		var keys = Object.keys(data);
		for (var key in data) {
			d3.select('#stateTobaccoSelect').append('option')
				.attr('value', key)
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
		var xMin = app.findMin(stateData.collections, 'y');
		var xMax = app.findMax(stateData.collections, 'y');

		var collectionsMin = app.inflationAdjusted
			? d3.min(stateData.collections.map(function(d) {
				return +d.nCol * cpiU[+d.y];
			}))
			: app.findMin(stateData.collections, 'nCol');
		var collectionsMax = app.inflationAdjusted
			? d3.max(stateData.collections.map(function(d) {
				return +d.nCol * cpiU[+d.y];
			}))
			: app.findMax(stateData.collections, 'nCol');

		// var ratesMax = app.findMax(stateData.collections, 'tP');

		var dateScale = d3.scaleTime()
			.domain([new Date(Date.parse(xMin + '-01-01')),new Date(Date.parse(xMax + '-12-31'))])
			.range([app.padding.left, app.dimensions.width - app.padding.right]);

		var collectionsScale = d3.scaleLinear()
			.domain([collectionsMax, collectionsMin])
			.range([0, app.dimensions.height - app.padding.top - app.padding.bottom]);

		// var rateScale = d3.scaleLinear()
		// 	.domain([ratesMax, 0])
		// 	.range([0, app.dimensions.height - app.padding.top - app.padding.bottom]);

		//Axes
		var xAxis = d3.axisBottom(dateScale);
		var yCollections = d3.axisLeft(collectionsScale);
		// var yRates = d3.axisRight(rateScale);

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
		// 	.x(function(d) {
		// 		return dateScale(new Date(Date.parse(d.y + '-12-31')));
		// 	})
		// 	.y(function(d) {
		// 		return rateScale(+d.tP);
		// 	});

		var chart = app.svg
			.transition().duration(750);
		chart.select('#x-axis').call(xAxis);
		chart.select('#y-collections').call(yCollections);
		// chart.select('#y-rates').call(yRates);

		app.collections
			.data([stateData['collections']])
			.transition()
			.duration(750)
			.attr('d', collectionsLine);

		// app.taxPercentage
		// 	.data([stateData['collections']])
		// 	.transition()
		// 	.duration(750)
		// 	.attr('d', taxPercentageLine);

		app.hikes.selectAll('line').remove();
		app.hikes
			.selectAll('line')
			.data(stateData.rates)
			.enter()
			.append('line')
			.attr('x1', function(d) { return dateScale(new Date(Date.parse(d.date))); })
			.attr('x2', function(d) { return dateScale(new Date(Date.parse(d.date))); })
			.attr('y1', app.padding.top)
			.attr('y2', app.dimensions.height - app.padding.bottom)
			.attr('style', 'stroke: orange; stroke-width: 2; fill: none;');
	},

	findMin: function(arr, obs) {
		return Math.min.apply(Math, arr.map(function(d) { return +d[obs]; }));
	},

	findMax: function(arr, obs) {
		return Math.max.apply(Math, arr.map(function(d) { return +d[obs]; }));
	},
};

var cpiU = {
	1955: 8.84391791,
	1956: 8.713860294,
	1957: 8.434768683,
	1958: 8.201280277,
	1959: 8.144914089,
	1960: 8.007331081,
	1961: 7.926989967,
	1962: 7.848245033,
	1963: 7.745653595,
	1964: 7.645709677,
	1965: 7.524349206,
	1966: 7.315339506,
	1967: 7.096317365,
	1968: 6.810833333,
	1969: 6.458228883,
	1970: 6.108685567,
	1971: 5.852271605,
	1972: 5.670263158,
	1973: 5.338220721,
	1974: 4.807647059,
	1975: 4.405520446,
	1976: 4.165500879,
	1977: 3.911171617,
	1978: 3.635230061,
	1979: 3.26469697,
	1980: 2.876419903,
	1981: 2.607447745,
	1982: 2.456134715,
	1983: 2.379688755,
	1984: 2.28120308,
	1985: 2.202760223,
	1986: 2.162563869,
	1987: 2.086417254,
	1988: 2.003524937,
	1989: 1.911427419,
	1990: 1.813442999,
	1991: 1.740212922,
	1992: 1.689358517,
	1993: 1.640256055,
	1994: 1.599304993,
	1995: 1.555229659,
	1996: 1.510624602,
	1997: 1.476741433,
	1998: 1.454092025,
	1999: 1.422671068,
	2000: 1.376405343,
	2001: 1.338322981,
	2002: 1.317493052,
	2003: 1.28813587,
	2004: 1.254722075,
	2005: 1.213604711,
	2006: 1.175679563,
	2007: 1.143121027,
	2008: 1.100853216,
	2009: 1.10478379,
	2010: 1.086954727,
	2011: 1.053694557,
	2012: 1.032330984,
	2013: 1.017428109,
	2014: 1.001186976,
	2015: 1
};