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
		left: 30
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

		var svg = d3.select('#tobacco-taxes')
			.append('svg')
			.attr('height', app.dimensions.height)
			.attr('width', app.dimensions.width);

		svg.append('g')
			.attr('id', 'x-axis')
			.attr(
				'transform',
				'translate(0, ' + (app.dimensions.height - app.padding.left) + ')'
			);

		svg.append('g')
			.attr('id', 'y-collections')
			.attr('transform', 'translate(' + app.padding.left + ', 0)');

		svg.append('g')
			.attr('id', 'y-rates')
			.attr(
				'transform',
				'translate(' + (app.dimensions.width - app.padding.right) + ', 0)');

		var state = document.getElementById('stateTobaccoSelect').value;

		app.draw(state);
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
			var stateData = app.data[state];

			var dateScale = d3.scaleTime()
				.domain([new Date(Date.parse('2000-01-01')),new Date(Date.parse('2010-01-01'))])
				.range([app.padding.left, app.dimensions.width - app.padding.right]);

			var collectionsScale = d3.scaleLinear()
				.domain([0,1])
				.range([0, app.dimensions.height - app.padding.top - app.padding.bottom]);

			var rateScale = d3.scaleLinear()
				.domain([0,1])
				.range([0, app.dimensions.height - app.padding.top - app.padding.bottom]);

			var xAxis = d3.axisBottom(dateScale);
			var yCollections = d3.axisLeft(collectionsScale);
			var yRates = d3.axisRight(rateScale);

			d3.select('#x-axis').call(xAxis);
			d3.select('#y-collections').call(yCollections);
			d3.select('#y-rates').call(yRates);
	}
};