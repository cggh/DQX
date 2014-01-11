
define(["jquery", "DQX/data/countries", "DQX/lib/geo_json", "DQX/lib/StyledMarker", "DQX/Msg", "DQX/DocEl", "DQX/Utils", "DQX/FramePanel", "DQX/Map", "DQX/GMaps/CanvasLayer"],
    function ($, Countries, GeoJSON, StyledMarker, Msg, DocEl, DQX, FramePanel, Map, CanvasLayer) {

        var PointSet = {};


        PointSet.Create = function (imapobject, settings) {
            var that = {};
            that.myMapObject = imapobject;
            that.myPointSet = [];
            that.pointSize = 6;
            that.opacity = 0.75;
            that.pointShape = 0;


            var canvasLayerOptions = {
                map: that.myMapObject.myMap,
                resizeHandler: function() { that._resize() },
                animate: false,
                updateHandler: function() { that.draw() }
            };
            that.canvasLayer = new CanvasLayer.CanvasLayer(canvasLayerOptions);
            that.context = that.canvasLayer.canvas.getContext('2d');

            google.maps.event.addListener(that.myMapObject.myMap, 'click', function(event) { that.onMouseClick(event); });
            google.maps.event.addListener(that.myMapObject.myMap, 'mousemove', function(event) { that.onMouseMove(event); });


            that.setPointStyle = function(sett) {
                that.opacity = sett.opacity;
                that.pointSize = sett.pointSize;
                that.pointShape = -1;
                if (sett.pointShape == 'rectangle')
                    that.pointShape = 0;
                if (sett.pointShape == 'circle')
                    that.pointShape = 1;
                if (that.pointShape < 0)
                    DQX.reportError('Invalid point shape');
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
                    var dst = Math.sqrt(Math.pow(mousept.x-point.pt.x,2) + Math.pow(mousept.y-point.pt.y,2)) * scale;
                    if (dst<=mindst) {
                        mindst = dst;
                        matchpoint = point;
                    }
                });
                return matchpoint;
            }

            that.onMouseMove = function(event) {
                if (that.myMapObject.lassoSelecting)
                    return;
                var matchpoint = that.findPointAtPosition(event.latLng);
                if (matchpoint)
                    that.myMapObject.myMap.set('draggableCursor', 'pointer');
                else
                    that.myMapObject.myMap.set('draggableCursor', 'default');
            }

            that.onMouseClick = function(event) {
                if (that.myMapObject.lassoSelecting)
                    return;
                var matchpoint = that.findPointAtPosition(event.latLng);
                if (matchpoint && that._pointClickCallBack)
                    that._pointClickCallBack(matchpoint.id);
            }

            that.draw = function() {

                //Prepare color category strings
                var colorStrings = [];
                $.each(DQX.standardColors, function(idx, color) {
                    colorStrings.push(color.changeOpacity(that.opacity).toStringCanvas());
                });

                var canvasWidth = that.canvasLayer.canvas.width;
                var canvasHeight = that.canvasLayer.canvas.height;
                var ctx = that.context;
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);

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
                var pts = that.pointSize/scale;
                var ptso = pts/2;

                /* If the map was not translated, the topLeft corner would be 0,0 in
                 * world coordinates. Our translation is just the vector from the
                 * world coordinate of the topLeft corder to 0,0.
                 */
                var offset = mapProjection.fromLatLngToPoint(that.canvasLayer.getTopLeft());
                ctx.translate(-offset.x, -offset.y);

                // project rectLatLng to world coordinates and draw
                $.each(that.myPointSet, function (idx, point) {
                    var pt = mapProjection.fromLatLngToPoint(new google.maps.LatLng(point.lattit, point.longit));
                    point.pt = pt;
                    ctx.fillStyle = colorStrings[point.catNr];

                    if (that.pointShape == 0)
                        ctx.fillRect(pt.x-ptso, pt.y-ptso, pts, pts);
                    else {
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
                });


            }


            that.clearPoints = function () {
                this.myPointSet = [];
            }

            that.remove = function () {
                this.clearPoints();
            }

            that.setPointClickCallBack = function(handler) {
                that._pointClickCallBack = handler;
            }


            that.setPoints = function (ipointset) {
                that.myPointSet = ipointset;
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


