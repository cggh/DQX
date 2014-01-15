
define(["jquery", "DQX/data/countries", "DQX/lib/geo_json", "DQX/lib/StyledMarker", "DQX/Msg", "DQX/DocEl", "DQX/Utils", "DQX/FramePanel", "DQX/Map", "DQX/GMaps/CanvasLayer"],
    function ($, Countries, GeoJSON, StyledMarker, Msg, DocEl, DQX, FramePanel, Map, CanvasLayer) {

        var PointSet = {};


        PointSet.Create = function (imapobject, settings) {
            var that = {};
            that.myMapObject = imapobject;
            that.myPointSet = [];
            that.pointSize = 6;
            that.pieChartSize = 30;
            that.opacity = 0.75;
            that.pointShape = 0;
            that.aggregatePieChart = true;


            var canvasLayerOptions = {
                map: that.myMapObject.myMap,
                resizeHandler: function() { that._resize() },
                animate: false,
                updateHandler: function() { that.draw() }
            };
            that.canvasLayer = new CanvasLayer.CanvasLayer(canvasLayerOptions);
            that.context = that.canvasLayer.canvas.getContext('2d');

            that.googleEventListeners = [];

            that.googleEventListeners.push(google.maps.event.addListener(that.myMapObject.myMap, 'click', function(event) { that.onMouseClick(event); }));
            that.googleEventListeners.push(google.maps.event.addListener(that.myMapObject.myMap, 'mousemove', function(event) { that.onMouseMove(event); }));

            that.googleEventListeners.push(google.maps.event.addListener(that.myMapObject.myMap, 'mouseout', function(event) {
                that.removeTooltip();
            }));



            that.onCloseCustom = function() {
                $.each(that.googleEventListeners, function(idx, evid) {
                    google.maps.event.removeListener(evid);
                });
            };

            that.setPointStyle = function(sett) {
                that.opacity = sett.opacity;
                that.pointSize = sett.pointSize;
                that.pointShape = -1;
                if (sett.pointShape == 'rectangle')
                    that.pointShape = 0;
                if (sett.pointShape == 'circle')
                    that.pointShape = 1;
                if (sett.pointShape == 'fuzzy')
                    that.pointShape = 2;
                if (that.pointShape < 0)
                    DQX.reportError('Invalid point shape');
                that.pieChartSize = sett.aggrSize;
                that.aggregatePieChart = true;
                if (sett.aggregateStyle == 'cluster')
                    that.aggregatePieChart = false;
            }

            that._resize = function() {
            }

            // argument: Google latlong object
            that.findPointAtPosition = function(latLng) {
                var mapProjection = that.myMapObject.myMap.getProjection();
                if (!mapProjection)
                    return null;
                var mousept = mapProjection.fromLatLngToPoint(latLng);
                var mindst = 5;
                var matchpoint = null;
                var scale = Math.pow(2, that.myMapObject.myMap.zoom);
                $.each(that.myPointSet, function (idx, point) {
                    if ((!point.isAggregated) || (!that.aggregatePieChart) ) {
                        var dst = Math.sqrt(Math.pow(mousept.x-point.pt.x,2) + Math.pow(mousept.y-point.pt.y,2)) * scale;
                        if (dst<=mindst) {
                            mindst = dst;
                            matchpoint = point;
                        }
                    }
                });
                return matchpoint;
            }

            // argument: Google latlong object
            that.findPieChartAtPosition = function(latLng) {
                if ((!that.aggregatePieChart) || (!that.aggregators))
                    return;
                var mapProjection = that.myMapObject.myMap.getProjection();
                if (!mapProjection)
                    return null;
                var mousept = mapProjection.fromLatLngToPoint(latLng);
                var scale = Math.pow(2, that.myMapObject.myMap.zoom);
                var matchAggr = null;
                $.each(that.aggregators, function (idx, aggr) {
                    var dst = Math.sqrt(Math.pow(mousept.x-aggr.pt.x,2) + Math.pow(mousept.y-aggr.pt.y,2));
                    if (dst<=aggr.rd)
                        matchAggr = aggr;
                });
                return matchAggr;
            }

            that.removeTooltip = function() {
                if (that.toolTipShowingID) {
                    $('#DQXUtilContainer').find('.DQXChannelToolTip').remove();
                    that.toolTipShowingID = null;
                }
            }

            that.showTooltip = function(event, point) {
                var pointID = point.id;
                if (that.toolTipShowingID != pointID) {
                    if (that.toolTipShowingID)
                        that.removeTooltip();
                    that.toolTipShowingID = pointID;
                    var content =point.id + '<br>';
                    content += point.longit.toFixed(5) + ', ' + point.lattit.toFixed(5) + '<br>';
                    if (that.pointSettings.catData)
                        content += point.catName;
                    if (that.pointSettings.numData)
                        content += point.numProp;
                    var tooltip = DocEl.Div();
                    tooltip.setCssClass("DQXChannelToolTip");
                    tooltip.addStyle("position", "absolute");
                    //return px + $(this.getCanvasElement('center')).offset().left;

                    var offsetX = $('#'+that.myMapObject.getID()).offset().left;
                    var offsetY = $('#'+that.myMapObject.getID()).offset().top;

                    tooltip.addStyle("left", (offsetX + event.pixel.x + 10) + 'px');
                    tooltip.addStyle("top", (offsetY + event.pixel.y + 10) + 'px');
                    tooltip.addStyle("z-index", '9999999');
                    tooltip.addElem(content);
                    $('#DQXUtilContainer').append(tooltip.toString());
                }
            }

            that.onMouseMove = function(event) {
                if (that.myMapObject.lassoSelecting)
                    return;
                var matchpoint = that.findPointAtPosition(event.latLng);
                if (matchpoint) {
                    that.myMapObject.myMap.set('draggableCursor', 'pointer');
                    that.showTooltip(event, matchpoint);
                    return;
                }
                else
                    that.removeTooltip();
                if (that.aggregatePieChart && (that.aggregators)) {
                    var matchaggr = that.findPieChartAtPosition(event.latLng);
                    if (matchaggr) {
                        that.myMapObject.myMap.set('draggableCursor', 'pointer');
                        return;
                    }
                }
                that.myMapObject.myMap.set('draggableCursor', 'default');
            }

            that.onMouseClick = function(event) {
                if (that.myMapObject.lassoSelecting)
                    return;
                var matchpoint = that.findPointAtPosition(event.latLng);
                if (matchpoint && that._pointClickCallBack) {
                    that._pointClickCallBack(matchpoint.id);
                    return;
                }
                if (that.aggregatePieChart && that._pieChartClickCallBack && (that.aggregators)) {
                    var matchaggr = that.findPieChartAtPosition(event.latLng);
                    if (matchaggr) {
                        that._pieChartClickCallBack(matchaggr);
                        return;
                    }
                }
            }

            that.draw = function() {

                //Prepare color category strings
                var colorStrings0 = [];
                var colorStrings = [];
                var colorStrings2 = [];
                $.each(DQX.standardColors, function(idx, color) {
                    colorStrings0.push(color.changeOpacity(0.75).toStringCanvas());
                    colorStrings.push(color.changeOpacity(that.opacity).toStringCanvas());
                    colorStrings2.push(color.changeOpacity(0).toStringCanvas());
                });

                var canvasWidth = that.canvasLayer.canvas.width;
                var canvasHeight = that.canvasLayer.canvas.height;
                var ctx = that.context;
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);

                if ((!that.myPointSet) || (that.myPointSet.length == 0))
                    return;

                ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
                ctx.fillRect(0,0,canvasWidth,canvasHeight);

                ctx.fillStyle = 'rgba(0, 128, 0, 0.5)';

                var mapProjection = that.myMapObject.myMap.getProjection();
                if (!mapProjection)
                    return;

                ctx.setTransform(1, 0, 0, 1, 0, 0);

                // scale is just 2^zoom
                var scale = Math.pow(2, that.myMapObject.myMap.zoom);
                ctx.scale(scale, scale);
                var pts = (that.pointSize*that.pointSize)/scale;
                var ptso = pts/2;

                var drawPieChartSize = that.pieChartSize/scale;

                /* If the map was not translated, the topLeft corner would be 0,0 in
                 * world coordinates. Our translation is just the vector from the
                 * world coordinate of the topLeft corder to 0,0.
                 */
                var offset = mapProjection.fromLatLngToPoint(that.canvasLayer.getTopLeft());
                ctx.translate(-offset.x, -offset.y);

                // Draw pie charts
                if (that.aggregatePieChart && (that.aggregators)) {
                    $.each(that.aggregators, function(idx, aggr) {
                        var pt = mapProjection.fromLatLngToPoint(new google.maps.LatLng(aggr.lattit, aggr.longit));
                        aggr.pt = pt;
                        var rd = Math.sqrt(aggr.totCount*1.0/that.maxAggrCount) * drawPieChartSize;
                        aggr.rd = rd;
                        var incrCount = 0;
                        var prevAng = 0;
                        $.each(aggr.catsCount, function(catNr, count) {
                            ctx.fillStyle = colorStrings0[catNr];
                            incrCount += count;
                            var ang = incrCount*1.0/aggr.totCount * 2 * Math.PI;
                            ctx.beginPath();
                            ctx.moveTo(pt.x, pt.y);
                            ctx.arc(pt.x, pt.y, rd, prevAng, ang, false);
                            ctx.lineTo(pt.x, pt.y);
                            ctx.closePath();
                            ctx.fill();
                            prevAng = ang;
                        });
                        ctx.lineWidth = 1/scale;
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, rd, 0, 2 * Math.PI, false);
                        ctx.closePath();
                        ctx.stroke();
                        if (aggr.selCount>0) {
                            ctx.lineWidth = 4/scale;
                            ctx.beginPath();
                            ctx.arc(pt.x, pt.y, rd, 0, aggr.selCount*1.0 / aggr.totCount * 2 * Math.PI, false);
                            ctx.stroke();
                        }
                    });
                }

                // Draw individual points
                var hasCategoricalProperty = that.pointSettings.catData
                var hasNumericalProperty = that.pointSettings.numData
                $.each(that.myPointSet, function (idx, point) {
                    if ((!point.isAggregated) || (!that.aggregatePieChart) ) {
                        var pt = mapProjection.fromLatLngToPoint(new google.maps.LatLng(point.lattit, point.longit));
                        point.pt = pt;
                        if (hasNumericalProperty)
                            ctx.fillStyle = DQX.HSL2Color(0.5-point.numPropFrac*1.0,1,0.5).changeOpacity(that.opacity).toStringCanvas();
                        else
                            ctx.fillStyle = colorStrings[point.catNr];


                        pt.x += point.offsetX * drawPieChartSize/3;
                        pt.y += point.offsetY * drawPieChartSize/3;

                        if (that.pointShape == 0) {
                            ctx.fillRect(pt.x-ptso, pt.y-ptso, pts, pts);
                        }
                        if (that.pointShape == 1) {
                            ctx.beginPath();
                            ctx.arc(pt.x, pt.y, ptso, 0, 2 * Math.PI, false);
                            ctx.closePath();
                            ctx.fill();
                        }
                        if (that.pointShape == 2) {
                            var grd=ctx.createRadialGradient(pt.x,pt.y,0,pt.x,pt.y,ptso);
                            if (hasNumericalProperty) {
                                var cl = DQX.HSL2Color(0.5-point.numPropFrac*0.75,1,0.5).changeOpacity(that.opacity);
                                grd.addColorStop(0, cl.toStringCanvas());
                                grd.addColorStop(1, cl.changeOpacity(0).toStringCanvas());
                            }
                            else {
                                grd.addColorStop(0,colorStrings[point.catNr]);
                                grd.addColorStop(1,colorStrings2[point.catNr]);
                            }
                            ctx.fillStyle = grd;
                            ctx.beginPath();
                            ctx.arc(pt.x, pt.y, ptso, 0, 2 * Math.PI, false);
                            ctx.closePath();
                            ctx.fill();
                        }

                        if (point.sel) {
                            ctx.fillStyle = "rgba(0,0,0,0.5)";
                            ctx.fillRect(pt.x-pts/8, pt.y-ptso, pts/4, pts);
                            ctx.fillRect(pt.x-ptso, pt.y-pts/8, pts, pts/4);
                        }
                    }
                });


            }


            that.clearPoints = function () {
                this.myPointSet = [];
            }

            that.remove = function () {
                this.clearPoints();
            }

            that.setPointClickCallBack = function(handlerPoint, handlerPieChart) {
                that._pointClickCallBack = handlerPoint;
                that._pieChartClickCallBack = handlerPieChart;
            }




            that.setPoints = function (ipointset, ipointSettings) {
                that.pointSettings = ipointSettings;

                function normRand() {
                    var x1, x2, rad;

                    do {
                        x1 = 2 * Math.random() - 1;
                        x2 = 2 * Math.random() - 1;
                        rad = x1 * x1 + x2 * x2;
                    } while(rad >= 1 || rad == 0);

                    var c = Math.sqrt(-2 * Math.log(rad) / rad);

                    return x1 * c;
                };
                that.myPointSet = ipointset;
                var pointMap = {}
                $.each(that.myPointSet, function(idx, point) {
                    var id = Math.round(point.lattit*10000).toString()+'_'+Math.round(point.longit*10000).toString();
                    if (pointMap[id]) {
                        var rd = Math.sqrt(pointMap[id]/1000);
                        point.offsetX = normRand() * rd;
                        point.offsetY = normRand() * rd;
                        pointMap[id] += 1;
                    }
                    else {
                        point.offsetX = 0;
                        point.offsetY = 0;
                        pointMap[id] = 1;
                    }
                });
                that.aggregators = [];
                that.aggregatorMap = {};
                $.each(pointMap, function(key, val) {
                    if (val>1) {
                        var aggr = {
                            longit: 0,
                            lattit: 0,
                            totCount: 0,
                                catsCount: []
                        };
                        that.aggregators.push(aggr);
                        that.aggregatorMap[key] = aggr;
                    }
                });
                $.each(that.myPointSet, function(idx, point) {
                    var id = Math.round(point.lattit*10000).toString()+'_'+Math.round(point.longit*10000).toString();
                    point.isAggregated = !!that.aggregatorMap[id];
                    if (point.isAggregated) {
                        point.aggregid = id;
                        var aggr = that.aggregatorMap[id];
                        aggr.longit = point.longit;
                        aggr.lattit = point.lattit;
                        aggr.totCount += 1;
                        while (aggr.catsCount.length<=point.catNr)
                            aggr.catsCount.push(0);
                        aggr.catsCount[point.catNr] += 1;
                    }
                });

                that.maxAggrCount = 0;
                $.each(that.aggregators, function(idx, aggr) {
                    that.maxAggrCount = Math.max(that.maxAggrCount, aggr.totCount);
                });

                that.countAggregateSelection();

            };

            that.countAggregateSelection = function() {
                $.each(that.aggregators, function(idx, aggr) {
                    aggr.selCount = 0;
                });
                $.each(that.myPointSet, function(idx, point) {
                    var id = Math.round(point.lattit*10000).toString()+'_'+Math.round(point.longit*10000).toString();
                    point.isAggregated = !!that.aggregatorMap[id];
                    if (point.isAggregated && point.sel)
                        that.aggregatorMap[point.aggregid].selCount += 1;
                });

            }

            that.updateSelection = function() {
                that.countAggregateSelection();
                that.draw();
            };


            that.zoomFit = function (minsize) {
                if (that.myPointSet.length == 0)
                    return;
                var bounds = new google.maps.LatLngBounds();
                $.each(that.myPointSet, function(idx, point) {
                    bounds.extend(new google.maps.LatLng(point.lattit, point.longit));
                });

                var ne = bounds.getNorthEast();
                var sw = bounds.getSouthWest();
                var latrange = ne.lat() - sw.lat();
                var minsizearc = minsize / 40000.0 * 360.0;
                if (latrange < minsizearc) {
                    bounds.extend(new google.maps.LatLng(Math.min(89.9, ne.lat() + (minsizearc - latrange) / 2), ne.lng()));
                    bounds.extend(new google.maps.LatLng(Math.max(-89.9, sw.lat() - (minsizearc - latrange) / 2), sw.lng()));
                }
                that.myMapObject.myMap.fitBounds(bounds);
            }


            return that;
        }







        return PointSet;
    });


