/************************************************************************************************************************************
*************************************************************************************************************************************

Defines a FramePanel that encapsulates a Google Maps view with overlays

IMPORTANT NOTE: this file needs 'async.js' to be present in the project!

*************************************************************************************************************************************
*************************************************************************************************************************************/

define(["jquery", "DQX/data/countries", "DQX/lib/geo_json", "DQX/lib/StyledMarker", "DQX/Msg", "DQX/DocEl", "DQX/Utils", "DQX/FramePanel"/*, "async!https://maps.googleapis.com/maps/api/js?libraries=visualization&sensor=false"*/],
    function ($, Countries, GeoJSON, StyledMarker, Msg, DocEl, DQX, FramePanel) {

        var GMaps = {}

        GMaps.defaults = {
            zoom: 2,
            center : new google.maps.LatLng(0, 0)
        };

        GMaps.Coord = function (longit, lattit) {
            var that = {};
            that.longit = longit;
            that.lattit = lattit;

            that.toGoogleLatLng = function () {
                return new google.maps.LatLng(this.lattit, this.longit);
            }

            return that;
        }


        GMaps.GoogleLatLng2Coord = function(latlng) {
            return GMaps.Coord(latlng.lng(), latlng.lat());
        }


        GMaps.MapItemLayouter = function (imapobject, iid, ioffset) {
            var that = {};
            that.mapObject = imapobject;
            that.id = iid;
            that.items = [];
            that.offset = 0.4;
            if (ioffset)
                that.offset = ioffset;

            that.addItem = function (longit, lattit, radius) {
                this.items.push({ longit: longit, lattit: lattit, radius: radius, longit2: longit, lattit2: lattit });
            }

            that.DX2Longit = function (dx, lattit) {
                return dx / Math.cos(lattit / 180 * Math.PI) / 40000 * 360;
            }

            that.DY2Lattit = function (dy) {
                return dy / 40000 * 360;
            }

            that.Longit2X = function (longit, lattit) {
                return longit * Math.cos(lattit / 180 * Math.PI) * 40000 / 360;
            }

            that.Lattit2Y = function (lattit) {
                return lattit / 360 * 40000;
            }


            that.calculatePositions0 = function () {
                for (var i = 0; i < this.items.length; i++) {
                    var item = this.items[i];
                    item.x0 = this.Longit2X(item.longit, item.lattit);
                    item.y0 = this.Lattit2Y(item.lattit);
                    item.dx = 0;
                    item.dy = 0;
                }

                for (var iter = 0; iter < 50; iter++) {
                    for (var i1 = 0; i1 < this.items.length; i1++) {
                        var item1 = this.items[i1];
                        var shiftx = 0;
                        var shifty = 0;
                        for (var i2 = 0; i2 < this.items.length; i2++) if (i1 != i2) {
                            var item2 = this.items[i2];
                            var dfx = (item2.x0 + item2.dx) - (item1.x0 + item1.dx);
                            var dfy = (item2.y0 + item2.dy) - (item1.y0 + item1.dy);
                            var dst = Math.sqrt(dfx * dfx + dfy * dfy);
                            dst2 = Math.max(0.5, dst / 50);
                            dfx /= dst; dfy /= dst;
                            var shiftsize = 0.5 / (dst2 * dst2);
                            shiftx += -dfx * shiftsize;
                            shifty += -dfy * shiftsize;
                        }
                        item1.dx += 0.5 * shiftx;
                        item1.dy += 0.5 * shifty;
                    }
                }

                for (var i = 0; i < this.items.length; i++) {
                    var item = this.items[i];
                    var longit2 = item.longit + this.DX2Longit(item.dx, item.lattit);
                    var lattit2 = item.lattit + this.DY2Lattit(item.dy);
                    item.longit2 = longit2;
                    item.lattit2 = lattit2;
                }

            }


            that.calculatePositions = function () {
                for (var i = 0; i < this.items.length; i++) {
                    var item = this.items[i];
                    item.x0 = this.Longit2X(item.longit, item.lattit);
                    item.y0 = this.Lattit2Y(item.lattit);
                    item.dx = 0;
                    item.dy = 0;
                }

                //Calculate initial directions
                for (var iter = 0; iter < 100; iter++) {
                    for (var i1 = 0; i1 < this.items.length; i1++) {
                        var item1 = this.items[i1];
                        var shiftx = 0;
                        var shifty = 0;
                        for (var i2 = 0; i2 < this.items.length; i2++) if (i1 != i2) {
                            var item2 = this.items[i2];
                            var dfx = item2.x0 - item1.x0;
                            var dfy = item2.y0 - item1.y0;
                            var dst = Math.sqrt(dfx * dfx + dfy * dfy);
                            shiftx += -dfx / (dst * dst * dst);
                            shifty += -dfy / (dst * dst * dst);
                        }
                        item1.dx = 30 * shiftx / Math.sqrt(shiftx * shiftx + shifty * shifty);
                        item1.dy = 30 * shifty / Math.sqrt(shiftx * shiftx + shifty * shifty);
                    }
                }

                for (var iter = 0; iter < 50; iter++) {
                    for (var i1 = 0; i1 < this.items.length; i1++) {
                        var item1 = this.items[i1];
                        var shiftx = 0;
                        var shifty = 0;
                        for (var i2 = 0; i2 < this.items.length; i2++) if (i1 != i2) {
                            var item2 = this.items[i2];
                            var dfx = (item2.x0 + item2.dx) - (item1.x0 + item1.dx);
                            var dfy = (item2.y0 + item2.dy) - (item1.y0 + item1.dy);
                            var dst = Math.sqrt(dfx * dfx + dfy * dfy);
                            var mindst = (1+that.offset/2) * (item1.radius + item2.radius);
                            if (dst < mindst) {
                                var shiftsize = (mindst - dst) / dst;
                                shiftx += -dfx * shiftsize;
                                shifty += -dfy * shiftsize;
                            }
                            else if (dst < 4 * mindst) {
                                var shiftsize = 0.05 / (dst * dst * dst);
                                shiftx += -dfx * shiftsize;
                                shifty += -dfy * shiftsize;
                            }
                        }
                        if (iter > 1) {
                            for (var i2 = 0; i2 < this.items.length; i2++) {
                                var item2 = this.items[i2];
                                var dfx = (item2.x0) - (item1.x0 + item1.dx);
                                var dfy = (item2.y0) - (item1.y0 + item1.dy);
                                var dst = Math.sqrt(dfx * dfx + dfy * dfy);
                                var mindst = (1+that.offset) * (item1.radius);
                                if (dst < mindst) {
                                    var shiftsize = (mindst - dst) / dst;
                                    shiftx += -dfx * shiftsize;
                                    shifty += -dfy * shiftsize;
                                }
                            }
                        }
                        item1.dx += 0.1 * shiftx;
                        item1.dy += 0.1 * shifty;
                    }
                }

                for (var i = 0; i < this.items.length; i++) {
                    var item = this.items[i];
                    var longit2 = item.longit + this.DX2Longit(item.dx, item.lattit);
                    var lattit2 = item.lattit + this.DY2Lattit(item.dy);
                    item.longit2 = longit2;
                    item.lattit2 = lattit2;
                }
            }
            return that;
        };


        //////////////////////////////////////////////////////////////////////////////////////////
        // Class displaying a KML
        //////////////////////////////////////////////////////////////////////////////////////////

        GMaps.KML = function (iid, imapobject, kmlurl) {
            var that = {};

            that.myID = iid;
            that.myMapObject = imapobject;
            that.myMapObject._addOverlay(that);
            that.myKmlUrl = kmlurl;

            that.kml = new google.maps.KmlLayer(that.myKmlUrl);
            that.kml.setMap(that.myMapObject.myMap);

            that.remove = function () {
                this.kml.setMap(null);
            }

            return that;
        }

        //////////////////////////////////////////////////////////////////////////////////////////
        // Class displaying a Country
        //////////////////////////////////////////////////////////////////////////////////////////
        GMaps.Country = function (iid, imapobject, country_name, gmap_options) {
            google_objs = GeoJSON(Countries.geo_json_by_fullname[country_name], gmap_options);
            if (google_objs.error) {
                console.log(google_objs);
                return;
            }
            var that = {};
            that.myID = iid;
            that.myMapObject = imapobject
            that.myMapObject._addOverlay(that);
            that.myData = country_name;
            that.myObjects = [];
            for (var i = 0; i < google_objs.length; i++) {
                that.myObjects.push(google_objs[i]);
                google_objs[i].setMap(that.myMapObject.myMap);
                google.maps.event.addListener(google_objs[i], 'click',
                function () { Msg.broadcast({ type: 'ClickMapPoint', id: that.myID }, that.myID); }
            );
            }
            that.remove = function () {
                for (var i = 0; i < this.myObjects.length; i++) {
                    this.myObjects[i].setMap(null);
                }
            }

            return that;
        }
        //////////////////////////////////////////////////////////////////////////////////////////
        // Class displaying a Polygon
        //////////////////////////////////////////////////////////////////////////////////////////

        GMaps.Polygon = function (iid, imapobject, data) {
            var that = {};

            that.myID = iid;
            that.myMapObject = imapobject;
            that.myMapObject._addOverlay(that);
            that.myData = data;

            var myCoordinates = [];
            for (var i = 0; i < data.length; i++)
                myCoordinates.push(new google.maps.LatLng(data[i].lattit, data[i].longit));
            var polyOptions = {
                path: myCoordinates,
                strokeColor: "#FF0000",
                strokeOpacity: 0.5,
                strokeWeight: 3,
                fillColor: "#FF0000",
                fillOpacity: 0.15
            }
            that.myObject = new google.maps.Polygon(polyOptions);
            that.myObject.setMap(that.myMapObject.myMap);

            that.remove = function () {
                this.myObject.setMap(null);
            }
            return that;
        }



        //////////////////////////////////////////////////////////////////////////////////////////
        // Class displaying a set of points
        //////////////////////////////////////////////////////////////////////////////////////////

        GMaps.PointSet = function (iid, imapobject, iminzoomlevel, bitmapfile, displayOptions) {
            var that = {};



            if (!displayOptions) {
                displayOptions = {
                    showMarkers: true,
                    polygonOptions: null
                };
            }

            if (!displayOptions.labelScaleFactor)
                displayOptions.labelScaleFactor = 1;

            that.myID = iid;
            that.myMapObject = imapobject;
            that.displayOptions = displayOptions;
            that.minZoomlevel = iminzoomlevel;
            that.myMapObject._addOverlay(that);
            that.myPointSet = [];
            that._pointClickCallBack = null;

            if (bitmapfile.length > 0)
                that.image = new google.maps.MarkerImage(bitmapfile, null, null, new google.maps.Point(10, 10));
            that.visibleUser = true;
            that.visibleZoomlevel = imapobject.myMap.zoom >= iminzoomlevel;
            that._currentVisible = false;

            that.clearPoints = function () {
                for (var pointnr = 0; pointnr < this.myPointSet.length; pointnr++)
                    for (var marknr = 0; marknr < this.myPointSet[pointnr].markers.length; marknr++)
                        this.myPointSet[pointnr].markers[marknr].setMap(null);
                this.myPointSet = [];
            }

            that.remove = function () {
                this.clearPoints();
            }

            that.setPointClickCallBack = function(handler) {
                that._pointClickCallBack = handler;
            }

            that._handleOnPointClicked = function (pointnr) {
                Msg.broadcast({ type: 'ClickMapPoint', id: this.myID }, this.myPointSet[pointnr].id);
                if (that._pointClickCallBack)
                    that._pointClickCallBack(this.myPointSet[pointnr].id);
            }

            that._updateVisible = function () {
                var newstatus = (this.visibleUser) && (this.myMapObject.myMap.zoom >= this.minZoomlevel);
                if (newstatus != this._currentVisible) {
                    this._currentVisible = newstatus;
                    for (var pointnr = 0; pointnr < this.myPointSet.length; pointnr++) {
                        if (!newstatus)
                            for (var marknr = 0; marknr < this.myPointSet[pointnr].markers.length; marknr++)
                                this.myPointSet[pointnr].markers[marknr].setMap(null);
                        else
                            for (var marknr = 0; marknr < this.myPointSet[pointnr].markers.length; marknr++) {
                                this.myPointSet[pointnr].markers[marknr].setMap(this.myMapObject.myMap);
                            }
                    }
                }
            }

            that.setPoints = function (ipointset) {
                this.clearPoints();
                this.myPointSet = ipointset;
                var obj = this;
                $.each(this.myPointSet, function (idx, point) {
                    point.markers = [];
                });

                if (this.displayOptions.showLabels) {
                    var layouter = GMaps.MapItemLayouter(this.myMapObject, '');
                    for (var i = 0; i < ipointset.length; i++) {
                        var pointInfo = ipointset[i];
                        layouter.addItem(pointInfo.longit, pointInfo.lattit, 150);
                    }
                    layouter.calculatePositions0();
                    $.each(this.myPointSet, function (i, pointInfo) {
                        var dx = layouter.items[i].dx;
                        var dy = layouter.items[i].dy;
                        if ((dx == 0) && (dy == 0)) {
                            dx = 1; dy = 1;
                        }
                        var rd = Math.sqrt(dx * dx + dy * dy);
                        dx *= 30 / rd; dy *= 30 / rd;
                        var labelPointer = GMaps.Overlay.LabelArrow(obj.myMapObject, '', GMaps.Coord(layouter.items[i].longit, layouter.items[i].lattit), dx, -dy, that.displayOptions.labelScaleFactor);
                        //we create two labels, one visible in the overlay layer, and one invisible in the mousetarget layer
                        var label1 = GMaps.Overlay.Label(obj.myMapObject, '', GMaps.Coord(layouter.items[i].longit, layouter.items[i].lattit), dx, -dy, pointInfo.labelName, false, that.displayOptions.labelScaleFactor);
                        var label2 = GMaps.Overlay.Label(obj.myMapObject, '', GMaps.Coord(layouter.items[i].longit, layouter.items[i].lattit), dx, -dy, pointInfo.labelName, true, that.displayOptions.labelScaleFactor);
                        label2.pointID = pointInfo.id;
                        label2.setOnClick(function () {
                            Msg.broadcast({ type: 'ClickMapPoint', id: that.myID }, this.pointID);
                            if (that._pointClickCallBack)
                                that._pointClickCallBack(this.pointID);
                        });
                        pointInfo.markers.push(labelPointer);
                        pointInfo.markers.push(label1);
                        pointInfo.markers.push(label2);
                    });
                }

                if (this.displayOptions.showMarkers) {

                    for (var i = 0; i < ipointset.length; i++) {
                        (function (iarg) {//closure because we need persistent counter
                            var pointnr = iarg;
                            var pointInfo = ipointset[pointnr];
                            var markerObject = null;
                            var markerOptions = {
                                position: new google.maps.LatLng(pointInfo.lattit, pointInfo.longit),
                                map: obj.myMapObject.myMap,
                                icon: obj.image
                            }
                            if (pointInfo.title)
                                markerOptions.title = pointInfo.title;
                            if ('styleIcon' in pointInfo) {
                                markerOptions.styleIcon = new StyledMarker.StyledIcon(StyledMarker.StyledIconTypes.MARKER, pointInfo.styleIcon);
                                markerObject = new StyledMarker.StyledMarker(markerOptions);
                            }
                            if (pointInfo.labelName) {
                                var labelColor = "ffffff";
                                if (pointInfo.labelColor)
                                    labelColor = pointInfo.labelColor;
                                //markerOptions.styleIcon = new StyledMarker.StyledIcon(StyledMarker.StyledIconTypes.BUBBLE, { color: labelColor, text: pointInfo.labelName });
                                //markerObject = new StyledMarker.StyledMarker(markerOptions);
                            }
                            if (!markerObject)
                                markerObject = new google.maps.Marker(markerOptions);

                            if (obj.myPointSet[pointnr].location_type == 'country') {
                                google_objs = GeoJSON(Countries.geo_json_by_fullname[obj.myPointSet[pointnr].given_name], obj.polygon_options);
                                if (!google_objs[0].error) {
                                    obj.myPointSet[pointnr].markers = google_objs;
                                    for (var j = 0; j < google_objs.length; j++) {
                                        google.maps.event.addListener(obj.myPointSet[pointnr].markers[j], 'click',
                                       function () { obj._handleOnPointClicked(pointnr); });
                                    }
                                } else {
                                    console.log(obj.myPointSet[pointnr].given_name);
                                    console.log(google_objs);
                                }

                            } else {
                                if (markerObject != null) {
                                    obj.myPointSet[pointnr].markers.push(markerObject);
                                    google.maps.event.addListener(markerObject, 'click',
                                        function () {
                                            obj._handleOnPointClicked(pointnr);
                                        }
                                        );
                                }
                            }

                        })(i);
                    }
                }
                this._updateVisible();
            }

            that.isInView = function () {
                var bounds = this.myMapObject.myMap.getBounds();
                if (!bounds) return false;
                for (var pointnr = 0; pointnr < this.myPointSet.length; pointnr++)
                    if (!bounds.contains(new google.maps.LatLng(this.myPointSet[pointnr].lattit, this.myPointSet[pointnr].longit)))
                        return false;
                return true;
            }

            that.zoomFit = function (minsize) {
                if (this.myPointSet.length == 0)
                    return;

                var bounds = new google.maps.LatLngBounds();
                for (var pointnr = 0; pointnr < this.myPointSet.length; pointnr++) {
                    bounds.extend(new google.maps.LatLng(this.myPointSet[pointnr].lattit, this.myPointSet[pointnr].longit));
                }
                var ne = bounds.getNorthEast();
                var sw = bounds.getSouthWest();
                var latrange = ne.lat() - sw.lat();
                var minsizearc = minsize / 40000.0 * 360.0;
                if (latrange < minsizearc) {
                    bounds.extend(new google.maps.LatLng(Math.min(89.9, ne.lat() + (minsizearc - latrange) / 2), ne.lng()));
                    bounds.extend(new google.maps.LatLng(Math.max(-89.9, sw.lat() - (minsizearc - latrange) / 2), sw.lng()));
                }
                this.myMapObject.myMap.fitBounds(bounds);
            }


            that.setVisible = function (status) {
                this.visibleUser = status;
                this._updateVisible();
            }


            that.onZoomLevelChanged = function () {
                this._updateVisible();
            }

            return that;
        }



        //////////////////////////////////////////////////////////////////////////////////////////
        // Class displaying a set of points as a heatmap
        //////////////////////////////////////////////////////////////////////////////////////////

        GMaps.PointSetHeatmap = function (imapobject, igradient) {
            var that = {};

            that.myMapObject = imapobject;
            that.myPointSet = [];
            that._myHeatMap = null;
            that.myGradient = igradient;

            that.clearPoints = function () {
                if (that._myHeatMap != null)
                    that._myHeatMap.setMap(null);
                that._myHeatMap = null;
            }

            that.setPoints = function (ipointset) {
                this.clearPoints();

                var heatmapData = [];
                for (var pointnr = 0; pointnr < ipointset.length; pointnr++)
                    heatmapData.push({
                        location: new google.maps.LatLng(pointInfo.lattit, pointInfo.longit),
                        weight: 1
                    });
                that._myHeatMap = new google.maps.visualization.HeatmapLayer({
                    data: heatmapData,
                    dissipating: false,
                    radius: 3.5,
                    opacity: 0.4,
                    maxIntensity: 5,
                    gradient: this.myGradient
                });
                that._myHeatMap.setMap(this.myMapObject.myMap);
            }

            return that;
        }



        //////////////////////////////////////////////////////////////////////////////////////////
        // Base class for a Google Maps overlay
        //////////////////////////////////////////////////////////////////////////////////////////

        GMaps.Overlay = {};
        GMaps._overlayIDNr = 0;
        GMaps.Overlay._Base = function (imapobject, iid, inOverlayLayer) {
            var that = new google.maps.OverlayView();

            that.myMapObject = imapobject;
            if (!iid) {
                GMaps._overlayIDNr++;
                iid = 'GMapOverlay' + GMaps._overlayIDNr;
            }
            that.myID = iid;
            imapobject._addOverlay(that);
            that.setMap(that.myMapObject.myMap);

            //if dist is defined, it converts a distance in km to pixels (approx.)
            that.convCoordToPixels = function (coord, dist) {
                var overlayProjection = this.getProjection();
                var pt = overlayProjection.fromLatLngToDivPixel(coord.toGoogleLatLng());
                if (typeof dist != 'undefined') {
                    var coord2 = GMaps.Coord(coord.longit+(dist / 40000.0 * 360), coord.lattit);
                    var pt2 = overlayProjection.fromLatLngToDivPixel(coord2.toGoogleLatLng());
                    pt.dist = Math.abs(pt.x - pt2.x);
                }
                return pt;
            }

            that.remove = function () {
                this.setMap(null);
            }



            that.onAdd = function () {
                this.myDiv = document.createElement('div');
                this.myDiv.style.position = 'absolute';
                this.myDiv.style.overflow = 'visible';
                var panes = this.getPanes();
                if (inOverlayLayer) {
                    panes.overlayLayer.appendChild(this.myDiv);
                }
                else {
                    panes.overlayMouseTarget.appendChild(this.myDiv);
                    google.maps.event.addDomListener(this.myDiv, 'mouseover', function () { $(that.myDiv).css('cursor', 'pointer'); });
                }
            }

            that.draw = function () {
                if (this.render) {
                    var bb = this.render();
                    this.myDiv.style.left = bb.x0 + 'px';
                    this.myDiv.style.top = bb.y0 + 'px';
                    this.myDiv.style.width = (bb.x1 - bb.x0 + 1) + 'px';
                    this.myDiv.style.height = (bb.y1 - bb.y0) + 'px';
                }
            }

            that.onRemove = function () {
                this.myDiv.parentNode.removeChild(this.myDiv);
                this.myDiv = null;
            }

            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////////
        // Class for a pie chart Google Maps overlay
        //////////////////////////////////////////////////////////////////////////////////////////
        //icentercoord of type GMaps.Coord
        //iradius in km
        //ichart of type DQX.SVG.PieChart

        GMaps.Overlay.PieChart = function (imapobject, iid, icentercoord, iradius, ichart) {
            var that = GMaps.Overlay._Base(imapobject, iid);
            that._centerCoordPieChart = icentercoord;
            that._centerCoord = icentercoord;
            that.myRadius = iradius;
            that.myChart = ichart;
            that.myChart.myCallbackObject = that;
            DQX.ObjectMapper.Add(that);
            if (iradius<0)
                DQX,reportError('Negative pie chart radius');

            that.setCoord = function (coord) {
                that._centerCoordPieChart = coord;
            }

            that.setOrigCoord = function (coord) {
                that._centerCoord = coord;
            }

            that.render = function () {
                var ps = this.convCoordToPixels(this._centerCoordPieChart, this.myRadius);
                var diskSize = ps.dist;
                var ps0 = this.convCoordToPixels(this._centerCoord, 0);
                var bb = {};
                bb.x0 = Math.min(ps0.x, ps.x - ps.dist);
                bb.y0 = Math.min(ps0.y, ps.y - ps.dist);
                bb.x1 = Math.max(ps0.x, ps.x + ps.dist)+3;
                bb.y1 = Math.max(ps0.y, ps.y + ps.dist)+3;
                var data = '<svg width={w} height={h} style="overflow:visible">'.DQXformat({ w: (bb.x1 - bb.x0), h: (bb.y1 - bb.y0) });
                //data += '<filter id="dropshadow" height="130%"><feGaussianBlur in="SourceAlpha" stdDeviation="3"/> <!-- stdDeviation is how much to blur --><feOffset dx="2" dy="2" result="offsetblur"/> <!-- how much to offset --><feMerge><feMergeNode/> <!-- this contains the offset blurred image --><feMergeNode in="SourceGraphic"/> <!-- this contains the element that the filter is applied to --></feMerge></filter>';
                data += this.myChart.render(ps.x - bb.x0, ps.y - bb.y0, ps.dist);
                var dfx = ps0.x - ps.x;
                var dfy = ps0.y - ps.y;
                var dst = Math.sqrt(dfx * dfx + dfy * dfy);
                if (dst > 2) {
                    var drx = dfx / dst;
                    var dry = dfy / dst;
                    var ps2x = ps.x + ps.dist * drx;
                    var ps2y = ps.y + ps.dist * dry;
                    var wd = diskSize / 10.0;
                    data += '<polygon points="{x1},{y1},{x2},{y2},{x3},{y3}" style="stroke-width: 2px; stroke: rgb(40,40,40); fill:rgb(40,40,40)"/>'.DQXformat({
                        x1: ps0.x - bb.x0,
                        y1: ps0.y - bb.y0,
                        x2: ps2x + wd * dry - bb.x0,
                        y2: ps2y - wd * drx - bb.y0,
                        x3: ps2x - wd * dry - bb.x0,
                        y3: ps2y + wd * drx - bb.y0
                    });
                }
                data += "</svg>";
                this.myDiv.innerHTML = data;
                return bb;
            }

            that.pieClick = function (pienr) {
                //alert('clicked ' + that.myID + ' ' + pienr);
                if (that.onClick)
                    that.onClick(this, pienr);
            }

            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////////
        // Class for a rectangular SVG Google Maps overlay
        //////////////////////////////////////////////////////////////////////////////////////////
        //icentercoord of type GMaps.Coord
        //isizex in km
        //isizey in km
        //ichart of type DQX.SVG.PieChart

        GMaps.Overlay.RectSVG = function (imapobject, iid, icentercoord, isizex, isizey, content) {
            var that = GMaps.Overlay._Base(imapobject, iid);
            that._centerCoordSVG = icentercoord;
            that._centerCoord = icentercoord;
            that.mySizeX = isizex;
            that.mySizeY = isizey;
            DQX.ObjectMapper.Add(that);

            that.setOrigCoord = function (coord) {
                that._centerCoord = coord;
            }

            that.render = function () {
                var ps = this.convCoordToPixels(this._centerCoordSVG, that.mySizeX/2);
                var distFactor = ps.dist/(that.mySizeX/2);
                var diskSize = ps.dist;
                var ps0 = this.convCoordToPixels(this._centerCoord, 0);
                var bb = {};
                bb.x0 = Math.min(ps0.x, ps.x - distFactor*that.mySizeX/2);
                bb.y0 = Math.min(ps0.y, ps.y - distFactor*that.mySizeY/2);
                bb.x1 = Math.max(ps0.x, ps.x + distFactor*that.mySizeX/2)+3;
                bb.y1 = Math.max(ps0.y, ps.y + distFactor*that.mySizeY/2)+3;
                var data = '<svg width={w} height={h} style="overflow:visible">'.DQXformat({ w: (bb.x1 - bb.x0), h: (bb.y1 - bb.y0) });

                //data += '<filter id="dropshadow" height="130%"><feGaussianBlur in="SourceAlpha" stdDeviation="3"/> <!-- stdDeviation is how much to blur --><feOffset dx="2" dy="2" result="offsetblur"/> <!-- how much to offset --><feMerge><feMergeNode/> <!-- this contains the offset blurred image --><feMergeNode in="SourceGraphic"/> <!-- this contains the element that the filter is applied to --></feMerge></filter>';
                //data += this.myChart.render(ps.x - bb.x0, ps.y - bb.y0, ps.dist);
                var dfx = ps0.x - ps.x;
                var dfy = ps0.y - ps.y;
                var dst = Math.sqrt(dfx * dfx + dfy * dfy);
                if (dst > 2) {
                    var drx = dfx / dst;
                    var dry = dfy / dst;
                    var ps2x = ps.x + ps.dist * drx;
                    var ps2y = ps.y + ps.dist * dry;
                    var wd = diskSize / 10.0;
                    data += '<polygon points="{x1},{y1},{x2},{y2},{x3},{y3}" style="stroke-width: 2px; stroke: rgb(40,40,40); fill:rgb(40,40,40)"/>'.DQXformat({
                        x1: ps0.x - bb.x0,
                        y1: ps0.y - bb.y0,
                        x2: ps2x + wd * dry - bb.x0,
                        y2: ps2y - wd * drx - bb.y0,
                        x3: ps2x - wd * dry - bb.x0,
                        y3: ps2y + wd * drx - bb.y0
                    });
                }

                data += '<rect x="{x}" y="{y}" width="{w}" height="{h}" style="stroke-width: 0px; stroke: none; fill:rgb(190,190,190)"/>'.DQXformat({
                    x: ps.x - distFactor*that.mySizeX/2 - bb.x0,
                    y: ps.y - distFactor*that.mySizeY/2 - bb.y0,
                    w: distFactor*that.mySizeX,
                    h: distFactor*that.mySizeY
                });

                var offs=3;
                data +='<g transform="translate({tx},{ty}) scale({sx},{sy})">'.DQXformat({
                    tx: ps.x - distFactor*that.mySizeX/2 - bb.x0+offs,
                    ty: ps.y - distFactor*that.mySizeY/2 - bb.y0+offs,
                    sx:distFactor*that.mySizeX-2*offs,
                    sy:distFactor*that.mySizeY-2*offs
                });
                data += content;
                data +='</g>'

                data += '<rect x="{x}" y="{y}" width="{w}" height="{h}" style="stroke-width: 3px; stroke: rgb(40,40,40); fill:none"/>'.DQXformat({
                    x: ps.x - distFactor*that.mySizeX/2 - bb.x0,
                    y: ps.y - distFactor*that.mySizeY/2 - bb.y0,
                    w: distFactor*that.mySizeX,
                    h: distFactor*that.mySizeY
                });

                data += "</svg>";
                this.myDiv.innerHTML = data;
                return bb;
            }

            that.pieClick = function (pienr) {
                //alert('clicked ' + that.myID + ' ' + pienr);
                if (that.onClick)
                    that.onClick(this, pienr);
            }

            return that;
        }



        //////////////////////////////////////////////////////////////////////////////////////////
        // 
        //////////////////////////////////////////////////////////////////////////////////////////

        GMaps.Overlay.LabelArrow = function (imapobject, iid, icentercoord, ioffsetX, ioffsetY, iscaleFactor) {
            var that = GMaps.Overlay._Base(imapobject, iid, true);
            that._centerCoord = icentercoord;
            that._offsetX = ioffsetX;
            that._offsetY = ioffsetY;
            that._scaleFactor = iscaleFactor;

            that.render = function () {
                var ps0 = this.convCoordToPixels(this._centerCoord, 8);
                var scaleFactor1 = 0.75*ps0.dist*that._scaleFactor;
                var scaleFactor2 = Math.sqrt(scaleFactor1);
                var ps1 = { x: ps0.x + this._offsetX, y: ps0.y + this._offsetY };
                var bb = {};
                var wd = Math.max(1, Math.min(4, Math.round(4 * scaleFactor2))); ;
                var opacity = Math.max(0, Math.min(1, scaleFactor2));
                bb.x0 = Math.min(ps0.x, ps1.x) - wd;
                bb.y0 = Math.min(ps0.y, ps1.y) - wd;
                bb.x1 = Math.max(ps0.x, ps1.x) + wd;
                bb.y1 = Math.max(ps0.y, ps1.y) + wd;

                var dfx = ps1.x - ps0.x;
                var dfy = ps1.y - ps0.y;
                var dst = Math.sqrt(dfx * dfx + dfy * dfy);
                var drx = dfx / dst;
                var dry = dfy / dst;

                var data = '<svg width={w} height={h}>'.DQXformat({ w: (bb.x1 - bb.x0), h: (bb.y1 - bb.y0) });
                data += '<polygon points="{x1},{y1},{x2},{y2},{x3},{y3}" style="stroke-width: 2px; fill:rgb(40,40,40); fill-opacity:{op};"/>'.DQXformat({
                    x1: ps0.x - bb.x0,
                    y1: ps0.y - bb.y0,
                    x2: ps1.x + wd * dry - bb.x0,
                    y2: ps1.y - wd * drx - bb.y0,
                    x3: ps1.x - wd * dry - bb.x0,
                    y3: ps1.y + wd * drx - bb.y0,
                    op: opacity.toFixed(3)
                });

                data += "</svg>";
                this.myDiv.innerHTML = data;
                return bb;
            }

            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////////
        // 
        //////////////////////////////////////////////////////////////////////////////////////////

        GMaps.Overlay.Label = function (imapobject, iid, icentercoord, ioffsetX, ioffsetY, itext, mouseTargetOnly, iscaleFactor) {
            var that = GMaps.Overlay._Base(imapobject, iid, !mouseTargetOnly);
            that._centerCoord = icentercoord;
            that._offsetX = ioffsetX;
            that._offsetY = ioffsetY;
            that._text = itext;
            that._onClickHandler = null;
            that._scaleFactor = iscaleFactor;

            that.setOnClick = function (handler) {
                this._onClickHandler = handler;
            }

            that.render = function () {
                var ps0 = this.convCoordToPixels(this._centerCoord, 8);
                var ps1 = { x: Math.round(ps0.x + this._offsetX), y: Math.round(ps0.y + this._offsetY) };

                var scaleFactor1 = that._scaleFactor * ps0.dist;
                var scaleFactor2 = Math.sqrt(scaleFactor1);
                var halfHeight = Math.max(4, Math.min(9, Math.round(9 * scaleFactor2)));
                var opacity1 = Math.min(1, scaleFactor1);
                var opacity2 = Math.min(1, scaleFactor1);
                if (mouseTargetOnly) {
                    opacity1 = 0;
                    opacity2 = 0;
                }

                var data = '<svg width={w} height={h}>'.DQXformat({ w: 300, h: 2 * halfHeight + 2 });

                if (!mouseTargetOnly) {
                    var txt = DocEl.Create('rect');
                    txt.addAttribute('x', 1);
                    txt.addAttribute('y', 1);
                    txt.addAttribute('width', 90);
                    txt.addAttribute('height', 2 * halfHeight);
                    txt.addStyle("fill", "rgb(255,220,30)");
                    txt.addStyle("stroke-width", "1");
                    txt.addStyle("stroke", "rgb(0,0,0)");
                    txt.addStyle("shape-rendering", "crispEdges");
                    txt.addStyle("fill-opacity", opacity1);
                    txt.addStyle("stroke-opacity", opacity1);
                    data += txt.toString();
                }

                var txt = DocEl.Create('text');
                txt.addAttribute('x', 5);
                txt.addAttribute('y', 1 + 2 * halfHeight - halfHeight / 2);
                txt.addAttribute('font-size', halfHeight * 1.4);
                txt.addAttribute('font-weight', 'bold');
                txt.addAttribute('fill', 'black');
                txt.addStyle("fill-opacity", opacity2);
                txt.addElem(this._text);
                data += txt.toString();
                data += "</svg>";
                this.myDiv.innerHTML = data;


                var txtElem = this.myDiv.getElementsByTagName('text')[0];
                var textLen = txtElem.getComputedTextLength();
                var recW = textLen + 10;

                if (!mouseTargetOnly) {
                    var rcElem = this.myDiv.getElementsByTagName('rect')[0];
                    rcElem.width.baseVal.value = recW;
                }

                var svgElem = this.myDiv.getElementsByTagName('svg')[0];
                svgElem.width.baseVal.value = recW + 2;

                if (this._onClickHandler) {
                    $(svgElem).click($.proxy(that._onClickHandler, that));
                }

                var bb = {};
                if (ps1.x >= ps0.x)
                    bb.x0 = ps1.x - 1 - halfHeight;
                else
                    bb.x0 = ps1.x - 1 - recW + halfHeight;
                bb.x1 = bb.x0 + recW + 2;
                bb.y0 = ps1.y - halfHeight - 1;
                bb.y1 = bb.y0 + 2 * halfHeight + 2;
                return bb;
            }

            return that;
        }




        //////////////////////////////////////////////////////////////////////////////////////////
        // Class Encapsulating Google Maps view with overlays
        //////////////////////////////////////////////////////////////////////////////////////////

        GMaps.GMap = function (iParentRef, istartcoord, istartzoomlevel, isSimplified) {
            var that = FramePanel(iParentRef);

            that.getRootElem().css('background-color', 'rgb(210,230,255)');

            var styles = [
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [
                { lightness: 100 },
                { visibility: "off" }
              ]
            },
            {
                featureType: "road",
                elementType: "labels",
                stylers: [
                { visibility: "off" }
              ]
            },
            {
                featureType: 'poi',
                elementType: "all",
                stylers: [
                { visibility: "off" }
              ]
            }
            ,
            {
                featureType: 'administrative',
                elementType: "all",
                stylers: [
                { lightness: 25}/*,
            { gamma: "0.25" }*/
            ]
            }
            ];

            if (isSimplified) {
                styles.push(
                {
                    featureType: "All",
                        elementType: "All",
                    stylers: [
                    { lightness: 40 },
                    { saturation: 0 }
                ]
                });
            }


            var styledMap = new google.maps.StyledMapType(styles, { name: "Simple" });

            var startZoom = GMaps.defaults.zoom;
            var startCenter = GMaps.defaults.center;
            if (istartzoomlevel)
                startZoom = istartzoomlevel;
            if (istartcoord)
                startCenter = new google.maps.LatLng(istartcoord.lattit, istartcoord.longit);

            var mapoptions = {
                zoom: startZoom,
                center: startCenter,
                mapTypeControlOptions: {
                    mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.TERRAIN, google.maps.MapTypeId.HYBRID, google.maps.MapTypeId.SATELLITE, 'map_style_simple']
                }
            };

            that.myMap = new google.maps.Map(document.getElementById(that.getDivID()), mapoptions);
            that.myMap.mapTypes.set('map_style_simple', styledMap);
            that.myMap.setMapTypeId('map_style_simple');


            /*
            //Create base overlay structure
            that.containerOverlay = new google.maps.OverlayView();
            that.containerOverlay.setMap(that.myMap);
            that.overlayDiv = document.createElement('div');
            that.overlayDiv.style.position = 'absolute';
            //that.overlayDiv.style.width = '3000px';
            //that.overlayDiv.style.height = '3000px';
            that.overlayDiv.style.backgroundColor = 'yellow';
            //that.overlayDiv.style.display = 'none';
            //that.overlayDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" style="display:inline"> <circle cx="100" cy="50" r="40" stroke="black" stroke-width="2" fill="red"/></svg>';
            that.containerOverlay.onAdd = function () {
            var panes = that.containerOverlay.getPanes();
            panes.overlayMouseTarget.appendChild(that.overlayDiv);
            }
            that.containerOverlay.draw = function (a, b, c) {
            that.overlayDiv.style.left = '0px';
            that.overlayDiv.style.top = '0px';
            var w=$('#'+that.getDivID()).width();
            var h = $('#' + that.getDivID()).width();
            that.overlayDiv.style.width = w + 'px';
            that.overlayDiv.style.height = h + 'px';
            }
            */

            that._myOverlays = [];

            that._addOverlay = function (obj) {
                that._myOverlays.push(obj);
            }

            that.getOverlayCount = function () { return that._myOverlays.length; }

            that.getOverlay = function (nr) {
                return this._myOverlays[nr];
            }

            that.removeOverlay = function (id) {
                for (var i = 0; i < that._myOverlays.length; i++) {
                    if (that._myOverlays[i].myID == id) {
                        that._myOverlays[i].remove();
                        that._myOverlays.splice(i, 1);
                        return;
                    }
                }
            }

            that._handleOnZoomChanged = function () {
                GMaps.defaults.zoom = that.myMap.getZoom();
                for (var i = 0; i < this._myOverlays.length; i++)
                    if ("onZoomLevelChanged" in this._myOverlays[i])
                        this._myOverlays[i].onZoomLevelChanged();
            }
            that._handleOnCenterChanged = function () {
                GMaps.defaults.center = that.myMap.getCenter();
            }


            that.lassoPointImage = new google.maps.MarkerImage(DQX.BMP("circle1.png"), null, null, new google.maps.Point(8, 8));

            that.isSelecting = function() {
                return that.lassoSelecting || that.rectSelecting;
            }

            that.startLassoSelection = function(callbackOnComplete) {
                if (that.lassoSelecting)
                    return;

                that.lassoSelecting = true;
                that.lassoSelectingCallbackOnComplete = callbackOnComplete;
                that.lassoPolygon1 = new google.maps.Polygon({
                    strokeColor: '#000000',
                    strokeOpacity: 1.0,
                    strokeWeight: 2,
                    fillColor: "rgb(255,128,0)",
                    fillOpacity: 0.3,
                    map: that.myMap,
                    clickable: false,
                    idx: 0
                });
                that.lassoPolygon2 = new google.maps.Polygon({
                    strokeColor: '#000000',
                    strokeOpacity: 0.25,
                    strokeWeight: 1,
                    fillColor: "rgb(0,0,0)",
                    fillOpacity: 0.1,
                    map: that.myMap,
                    clickable: false,
                    idx: 0
                });
                that.lassoPoints = [];
                that.selectionPolygonPoints = [];//lasso points, in flat coordinates
                that.selectionPolygonLattLongPoints = [];//lasso points, in geo coordinates

                that.lassoEventListener_click = google.maps.event.addListener(that.myMap, 'click', function(event) {
                    that.lassoPolygon1.getPath().push(event.latLng);
                    that.lassoPolygon2.getPath().push(event.latLng);

                    var markerObject = new google.maps.Marker({
                        position: event.latLng,
                        map: that.theMap,
                        icon: that.lassoPointImage,
                        clickable: false
                    });
                    markerObject.setMap(that.myMap);
                    that.lassoPoints.push(markerObject);

                    var point = that.myMap.getProjection().fromLatLngToPoint(event.latLng);
                    that.selectionPolygonLattLongPoints.push({
                        longit: event.latLng.lng(),
                        lattit: event.latLng.lat()
                    });
                    that.selectionPolygonPoints.push({
                        x: point.x,
                        y: point.y
                    });

                });

                that.lassoEventListener_dblclick = google.maps.event.addListener(that.myMap, 'dblclick', function(event) {
                    setTimeout(function() {
                        that.stopLassoSelection();
                        if (that.lassoSelectingCallbackOnComplete)
                            that.lassoSelectingCallbackOnComplete();
                    }, 100);
                });

                that.lassoEventListener_mousemove = google.maps.event.addListener(that.myMap, 'mousemove', function(event) {
                    var path = that.lassoPolygon2.getPath();
                    if (path.length>0) {
                        if (path.length>1)
                            path.pop();
                        path.push(event.latLng);
                    }

                });

                that.myMap.set('draggableCursor', 'crosshair');
                that.myMap.set('disableDoubleClickZoom', true);
            }

            that.stopLassoSelection = function() {
                if (!that.lassoSelecting)
                    return;
                that.lassoSelecting = false;
                google.maps.event.removeListener(that.lassoEventListener_click);
                google.maps.event.removeListener(that.lassoEventListener_mousemove);
                google.maps.event.removeListener(that.lassoEventListener_dblclick);
                that.myMap.set('draggableCursor', 'default');
                that.myMap.set('disableDoubleClickZoom', false);
                that.lassoPolygon1.setMap(null);that.lassoPolygon1 = null;
                that.lassoPolygon2.setMap(null);that.lassoPolygon2 = null;
                $.each(that.lassoPoints, function(idx, pt) {
                    pt.setMap(null);
                });
                that.lassoPoints = null;
            }

            function isPointInPoly(poly, pt) {
                for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
                    ((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
                        && (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
                    && (c = !c);
                return c;
            }

            // Expects a GMaps.Coord
            that.isCoordInsideLassoSelection = function(coord) {
                if (!that.selectionPolygonPoints)
                    return false;
                var point = that.myMap.getProjection().fromLatLngToPoint(coord.toGoogleLatLng());
                return isPointInPoly(that.selectionPolygonPoints,{
                    x: point.x,
                    y: point.y
                })
            }


            that.startRectSelection = function(callbackOnComplete) {
                if (that.rectSelecting)
                    return;

                that.rectSelecting = true;
                that.rectPointSelectCount = 0;
                that.rectSelectingCallbackOnComplete = callbackOnComplete;
                that.lassoPolygon1 = new google.maps.Polygon({
                    strokeColor: '#000000',
                    strokeOpacity: 1.0,
                    strokeWeight: 2,
                    fillColor: "rgb(255,128,0)",
                    fillOpacity: 0.3,
                    map: that.myMap,
                    clickable: false,
                    idx: 0
                });

                that.rectEventListener_click = google.maps.event.addListener(that.myMap, 'click', function(event) {
                    if (that.rectPointSelectCount==0) {
                        that.rectSelectPoint1 = event.latLng;
                        that.rectPointSelectCount = 1;
                        return;
                    }
                    if (that.rectPointSelectCount==1) {
                        setTimeout(function() {
                            that.stopRectSelection();
                            if (that.rectSelectingCallbackOnComplete)
                                that.rectSelectingCallbackOnComplete(GMaps.GoogleLatLng2Coord(that.rectSelectPoint1), GMaps.GoogleLatLng2Coord(that.rectSelectPoint2));
                        }, 100);
                        return;
                    }
                });


                that.rectEventListener_mousemove = google.maps.event.addListener(that.myMap, 'mousemove', function(event) {
                    if (that.rectPointSelectCount==1) {
                        that.rectSelectPoint2 = event.latLng;
                        var path = that.lassoPolygon1.getPath();
                        while (path.length>0) path.pop();
                        path.push(that.rectSelectPoint1);
                        path.push(new google.maps.LatLng(that.rectSelectPoint1.lat(), that.rectSelectPoint2.lng()));
                        path.push(that.rectSelectPoint2);
                        path.push(new google.maps.LatLng(that.rectSelectPoint2.lat(), that.rectSelectPoint1.lng()));
                    }
                });

                that.myMap.set('draggableCursor', 'crosshair');
                that.myMap.set('disableDoubleClickZoom', true);
            }


            that.stopRectSelection = function() {
                if (!that.rectSelecting)
                    return;
                that.rectSelecting = false;
                google.maps.event.removeListener(that.rectEventListener_click);
                google.maps.event.removeListener(that.rectEventListener_mousemove);
                that.myMap.set('draggableCursor', 'default');
                that.myMap.set('disableDoubleClickZoom', false);
                that.lassoPolygon1.setMap(null);that.lassoPolygon1 = null;
            }



            that.eventListener_Zoom = google.maps.event.addListener(that.myMap, 'zoom_changed', $.proxy(that._handleOnZoomChanged, that));
            that.eventListener_Moved = google.maps.event.addListener(that.myMap, 'center_changed', $.proxy(that._handleOnCenterChanged, that));


            that.storeSettings = function() {
                var sett = {
                    zoomFactor: that.myMap.zoom,
                    centerLongit: that.myMap.getCenter().lng(),
                    centerLattit: that.myMap.getCenter().lat()
                };
                return sett;
            };

            that.recallSettings = function(sett) {
                that.myMap.setZoom(sett.zoomFactor);
                that.myMap.setCenter(new google.maps.LatLng(sett.centerLattit, sett.centerLongit));
            }


            that.setCenter = function(centerCoord, zoomFactor) {
                if (zoomFactor)
                    that.myMap.setZoom(zoomFactor);
                that.myMap.setCenter(new google.maps.LatLng(centerCoord.lattit, centerCoord.longit));
            }


            that.handleResize = function () {
                google.maps.event.trigger(this.myMap, 'resize');
            }

            that.tearDown = function() {
                google.maps.event.removeListener(that.eventListener_Zoom);
                google.maps.event.removeListener(that.eventListener_Moved);
                that.myMap = null;
            }


            return that;
        }
        return GMaps;
    });

