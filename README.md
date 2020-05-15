# Data Studio Community Visualization - Annotated Time Series

This community visualization, built with [D3], enables anotations to be added to time series charts in Data Studio.

There are two types of annotations that can be added and visualized:
1. Single point annotations
1. Date range annotations

## Single Point Annotations
Single point annotations show as a circle on the line at a specific date. Hovering over the circle shows a tooltip / window that includes the date and the text of the annotation.

## Date Range Annotations
Date range annotations show as shaded rectangles that span the date range for the annotation. For example, if you have a marketing campaign that lasts for one week, the shaded rectangle would span the start and end date. Hovering over the rectangle shows a tooltip / window that includes the date range and the text of the annotation.




[D3]: https://d3js.org/
