const d3 = require('d3');
const dscc = require('@google/dscc');
const local = require('./localMessage.js');

function sortByDateAscending(a, b) {
  return a.start_date - b.start_date;
}

// change this to 'true' for local development
// change this to 'false' before deploying
export const LOCAL = false;

// parse the style value
const styleVal = (message, styleId) => {
  if (typeof message.style[styleId].defaultValue === "object") {
    return message.style[styleId].value.color !== undefined
      ? message.style[styleId].value.color
      : message.style[styleId].defaultValue.color;
  }
  return message.style[styleId].value !== undefined
    ? message.style[styleId].value
    : message.style[styleId].defaultValue;
};

// write viz code here
const drawViz = (message) => {

  let data = message.tables.DEFAULT;
  var time_parse      =   d3.timeParse( '%Y%m%d' );
  var time_format     =   d3.timeFormat( '%b %e' );
  var time_format_annotation     =   d3.timeFormat( '%B %d, %Y' );
  var margin = { top: 10, bottom: 0, right: 10, left: 10 };
  var chart_width     =   dscc.getWidth();
  var chart_height    =   dscc.getHeight();
  var padding         =   50;

  // Format Date
  data.forEach(function(e, i){
    data[i].start_date    =   time_parse(e.start_date);
    data[i].end_date    =   time_parse(e.end_date);
  });

  data = data.sort(sortByDateAscending);

  // Scales
  var x_scale         =   d3.scaleTime()
    .domain(d3.extent(data, function(d){
      return d.start_date;
    }))
    .range([padding, chart_width - padding]);
  var y_scale         =   d3.scaleLinear()
    .domain([ 0,
        d3.max(data, function(d) {
            return d.arbitraryMetric[0];
        }) +
        d3.max(data, function(d) {
          return d.arbitraryMetric[0];
      }) * 0.05
    ])
    .range([chart_height - padding, padding]);

  // remove the SVG if it already exists
  if (document.querySelector("svg")) {
    let oldSvg = document.querySelector("svg");
    oldSvg.parentNode.removeChild(oldSvg);
  }

  // gridlines in x axis function
  function make_x_gridlines() {		
    return d3.axisBottom(x_scale)
      .ticks(5)
  }

  // gridlines in y axis function
  function make_y_gridlines() {		
    return d3.axisLeft(y_scale)
        .ticks(5)
  }

  // Create SVG
  var svg             =   d3.select("body")
    .append("svg")
    .attr("width", chart_width)
    .attr("height", chart_height);

  // add the X (vertical) gridlines
  let xTickSize = chart_height - padding*2;
  svg.append("g")			
    .attr("class", "grid")
    .attr("transform", "translate(0," + (chart_height - padding) + ")")
    .call(make_x_gridlines()
        .tickSize(-xTickSize)
        .tickFormat("")
    );

  // add the Y (horizonal) gridlines
  let yTickSize = chart_width - padding*2;
  svg.append("g")			
    .attr("class", "grid")
    .attr("transform", "translate(" + padding + ",0)")
    .call(make_y_gridlines()
        .tickSize(-yTickSize)
        .tickFormat("")
    );

  // Calculate number of ticks based on chart height to maintain consistent spacing
  let yAxisLabelSpace = 75;
  let numTicksY = Math.floor(chart_height / yAxisLabelSpace);

  // Create Axes
  var x_axis          =   d3.axisBottom(x_scale)
    .ticks(10)
    .tickFormat(time_format);

  var y_axis          =   d3.axisLeft(y_scale)
    .ticks(numTicksY);
    // .ticks(numTicksY, "~s");
    // this uses compact numbers, i.e. 1.5K instead of 1,500
    
  svg.append("g")
    .attr("transform", "translate(0," + (chart_height - padding) + ")")
    .call(x_axis);
  svg.append("g")
    .attr("transform", "translate(" + padding + ",0)")
    .call(y_axis);

  
  /////////////////////////////////
  //  Range Annotations
  /////////////////////////////////

    var range_annotations = [];
    function get_range_annotations( d ){
      if( d.annotation != undefined && d.end_date ){
        if( d.start_date.valueOf() != d.end_date.valueOf() ){
          range_annotations.push( d );
        }
      }
    }
    data.forEach(get_range_annotations);

    // Get the user-selected style options for range annotations
    let rectStroke = styleVal(message, "rectStroke");
    let rectWeight = styleVal(message, "rectWeight");
    let rectFill = styleVal(message, "rectFill");
    let rectFillOpacity = styleVal(message, "rectFillOpacity");
    let rectFillHover = styleVal(message, "rectFillHover");

    // Bind Data and create bars
    svg.selectAll( 'rect' )
      .data( range_annotations )
      .enter()
      .append( 'rect' )
      .attr( 'x', function( d ){
        return x_scale(d.start_date);
      })
      .attr( 'y', function( d ){
        return y_scale.range()[1];
      })
      .attr( 'width', function( d ){
        return x_scale(d.end_date) - x_scale(d.start_date);
      })
      .attr( 'height', y_scale.range()[0] - padding)
      .attr( 'fill', rectFill )
      .attr( 'opacity', rectFillOpacity )
      .attr( 'stroke', rectStroke )
      .attr( 'stroke-width', rectWeight )
      .on( 'mouseover', function( d ){
        d3.select( this )
          .transition()
          .attr('fill', rectFillHover);
        // https://medium.com/@louisemoxy/create-an-accurate-tooltip-for-a-d3-area-chart-bf59783f8a2d
        const currentXPosition = d3.mouse(this)[0];
        const currentYPosition = d3.mouse(this)[1];

        // create a DIV for the tooltip
        var chartElement = document.createElement('div');
        chartElement.id = 'tooltip';
        document.body.appendChild(chartElement);

        // Tooltip is positioned to the right of the cursor. If cursor
        // is too close to the right of the chart, we need to reposition
        // it to the left of the cursor.
        let flipTooltip = chart_width - currentXPosition < 220 ? -1 : 0;

        d3.select( '#tooltip' )
            .style( 'left', currentXPosition + 15 + (250 * flipTooltip) + "px" )
            .style( 'top', currentYPosition - 30 + "px" )
            .style( 'display', 'block' )
            .style( 'width', '200px')
            .html( "<p style='font-weight: bold'>" + time_format_annotation(d.start_date) +
                    " - " + time_format_annotation(d.end_date) + "</p> <p>" + d.annotation[0] + "</p>" );
      })
      .on( 'mouseout', function(){
          d3.select( '#tooltip' )
              .style( 'display', 'none');
          d3.select( this )
            .transition()
            .attr('fill', rectFill);
      });


  // Get the user-selected line style options
  let lineColor = styleVal(message, "lineColor");
  let lineWeight = styleVal(message, "lineWeight");

  // Create Line
  var line            =   d3.line()
  .defined(function( d ){
    return d.arbitraryMetric[0];
  })
    .x(function(d){
        return x_scale(d.start_date);
    })
    .y(function(d){
        return y_scale(d.arbitraryMetric[0]);
    });

    svg.append('path')
    .datum( data )
    .attr( 'fill', 'none' )
    .attr( 'stroke', lineColor )
    .attr( 'stroke-width', lineWeight )
    .attr( 'd', line );

  // Get the user-selected style options for point annotations
  let circleStroke = styleVal(message, "circleStroke");
  let circleWeight = styleVal(message, "circleWeight");
  let circleFill = styleVal(message, "circleFill");
  let circleFillOpacity = styleVal(message, "circleFillOpacity");
  let circleRadius = styleVal(message, "circleRadius");

  var point_annotations = [];
  function get_annotations( d ){
    if( d.annotation != undefined && d.annotation[0] ){
      if( d.end_date == null || d.start_date.valueOf() == d.end_date.valueOf() ){
        point_annotations.push( d );
      }
    }
  }
  data.forEach(get_annotations);
  
  if(point_annotations.length){
    var circles = svg.selectAll('circle')
      .data( point_annotations )
      .enter()
      .append('circle')
      .on( 'mouseover', function( d ){
        // https://medium.com/@louisemoxy/create-an-accurate-tooltip-for-a-d3-area-chart-bf59783f8a2d
        const currentXPosition = d3.mouse(this)[0];
        const currentYPosition = d3.mouse(this)[1];

        // create a DIV for the tooltip
        var chartElement = document.createElement('div');
        chartElement.id = 'tooltip';
        document.body.appendChild(chartElement);

        let flipTooltip = chart_width - currentXPosition < 220 ? -1 : 0;
        
        d3.select( '#tooltip' )
            .style( 'left', currentXPosition + 15 + (250 * flipTooltip) + "px" )
            .style( 'top', currentYPosition - 30 + "px" )
            .style( 'display', 'block' )
            .style( 'width', '200px')
            .html( "<p style='font-weight: bold'>" + time_format_annotation(d.start_date) + "</p> <p>" + d.annotation[0] + "</p>" );
      })
      .on( 'mouseout', function(){
          d3.select( '#tooltip' )
              .style( 'display', 'none');
      });
    
    var circleAttributes = circles
      .attr( 'cx', function( d ){
        return x_scale(d.start_date);
      })
      .attr( 'cy', function( d ){
        return y_scale(d.arbitraryMetric[0]);
      })
      .attr( 'r', circleRadius )
      .attr( 'fill', circleFill )
      .attr( 'stroke', circleStroke )
      .attr( 'stroke-width', circleWeight )
      .attr('fill-opacity', circleFillOpacity);
  }
}

// renders locally
if (LOCAL) {
  drawViz(local.message);
} else {
  dscc.subscribeToData(drawViz, {transform: dscc.objectTransform});
}
