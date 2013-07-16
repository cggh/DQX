define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/Utils", "DQX/Map", "DQX/SVG"],
    function ($, DocEl, Msg, DQX, Map, SVG) {

        var MapUtils = {};

        MapUtils.PieChartLayouter = function (imap, ioffset) {
            var that = {};

            that._map = imap;
            that._layoutCalculated = false;
            that._offset = ioffset;
            that._pies = [];

            // position: coordinates of the center position (of type Map.Coord)
            // pieChart: piechart data (of type SVG.PieChart)
            that.addPieChart = function(position, pieChart, radius, clickHandler) {
                that._layoutCalculated = false;

                var pie = Map.Overlay.PieChart(that._map, null,
                    position,
                    radius, pieChart);
                that._pies.push(pie);

                // We hack ourselves in the middle of the rendering call, so that we get notified if the pie chart is about to be rendered
                pie._render_orig_replacedlayouter = pie.render;
                pie.render = function() {
                    that._updateOffsetsIfNeeded();
                    return pie._render_orig_replacedlayouter();
                }

                pie.onClick = function(obj,id) {
                    if (clickHandler!=null)
                        clickHandler(pieChart,id);
                }

            }


            that._updateOffsetsIfNeeded = function() {
                if (that._layoutCalculated) return;
                if (that._offset>0) {
                    var graphics = Map.MapItemLayouter(that._map, '', that._offset);
                    $.each(that._pies, function(idx,pie) {
                        graphics.addItem(pie._centerCoordPieChart.longit, pie._centerCoordPieChart.lattit, pie.myRadius);
                    });
                }
                graphics.calculatePositions();
                $.each(that._pies, function(idx,pie) {
                    pie.setCoord(Map.Coord(graphics.items[idx].longit2, graphics.items[idx].lattit2));
                });
                that._layoutCalculated = true;
            }

            return that;
        }


        return MapUtils;
    });