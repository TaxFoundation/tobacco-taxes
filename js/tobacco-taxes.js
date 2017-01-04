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
			.attr('style', 'stroke: steelblue; stroke-width: 1; fill: none;');

		app.draw();
	},

	createDropdown: function(data) {
		d3.select('#tobacco-taxes').append('select')
			.attr('id', 'stateTobaccoSelect')
			.attr('onchange', 'app.draw()');

		var keys = Object.keys(data);
		for (var key in data) {
			d3.select('#stateTobaccoSelect').append('option')
				.attr('value', key)
				.html(data[key].name);
		}
	},

	draw: function(state) {
		var state = document.getElementById('stateTobaccoSelect').value;
		var stateData = app.data[state];

		//Sacles
		var xMin = app.findMin(stateData.collections, 'y');
		var xMax = app.findMax(stateData.collections, 'y');

		var collectionsMin = app.findMin(stateData.collections, 'nCol');
		var collectionsMax = app.findMax(stateData.collections, 'nCol');

		var ratesMax = app.findMax(stateData.rates, 'rate');

		var dateScale = d3.scaleTime()
			.domain([new Date(Date.parse(xMin + '-01-01')),new Date(Date.parse(xMax + '-12-31'))])
			.range([app.padding.left, app.dimensions.width - app.padding.right]);

		var collectionsScale = d3.scaleLinear()
			.domain([collectionsMax, collectionsMin])
			.range([0, app.dimensions.height - app.padding.top - app.padding.bottom]);

		var rateScale = d3.scaleLinear()
			.domain([ratesMax, 0])
			.range([0, app.dimensions.height - app.padding.top - app.padding.bottom]);

		//Axes
		var xAxis = d3.axisBottom(dateScale);
		var yCollections = d3.axisLeft(collectionsScale);
		var yRates = d3.axisRight(rateScale);

		//Collections line
		var collectionsLine = d3.line()
			.x(function(d) {
				return dateScale(new Date(Date.parse(d.y + '-12-31')));
			})
			.y(function(d) {
				return collectionsScale(+d.nCol);
			});

		var chart = app.svg
			.transition().duration(750);
		chart.select('#x-axis').call(xAxis);
		chart.select('#y-collections').call(yCollections);
		chart.select('#y-rates').call(yRates);
		app.collections
			.data([stateData['collections']])
			.transition()
			.duration(750)
			.attr('d', collectionsLine);
	},

	findMin: function(arr, obs) {
		return Math.min.apply(Math, arr.map(function(d) { return +d[obs]; }));
	},

	findMax: function(arr, obs) {
		return Math.max.apply(Math, arr.map(function(d) { return +d[obs]; }));
	},
};