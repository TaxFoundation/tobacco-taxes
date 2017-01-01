var container = document.getElementById('tobacco-taxes');
var dimensions = container.getBoundingClientRect();

var sidePadding = 30;
var bottomPadding = 30;
var topPadding = 0;
var height = 500;

var svg = d3.select('#tobacco-taxes')
	.append('svg')
	.attr('height', height)
	.attr('width', dimensions.width);


var dateScale = d3.scaleTime()
	.domain([new Date(Date.parse('2000-01-01')),new Date(Date.parse('2010-01-01'))])
	.range([sidePadding, dimensions.width - sidePadding]);

var collectionsScale = d3.scaleLinear()
	.domain([0,1])
	.range([0, height - topPadding - bottomPadding]);

var rateScale = d3.scaleLinear()
	.domain([0,1])
	.range([0, height - topPadding - bottomPadding]);	

var xAxis = d3.axisBottom(dateScale);
var yCollections = d3.axisLeft(collectionsScale);
var yRate = d3.axisRight(rateScale);

svg.append('g')
	.attr(
		'transform',
		'translate(0, ' + (height - sidePadding) + ')'
	)
	.call(xAxis);

svg.append('g')
	.attr('transform', 'translate(' + sidePadding + ', 0)')
	.call(yCollections);

svg.append('g')
	.attr(
		'transform',
		'translate(' + (dimensions.width - sidePadding) + ', 0)'
	)
	.call(yRate);

console.log(dimensions);