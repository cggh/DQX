define(["jquery", "DQX/data/countries", "DQX/lib/geo_json", "DQX/Msg", "DQX/Utils", "async!https://maps.googleapis.com/maps/api/js?libraries=visualization&sensor=false"], 
    function ($, Countries, GeoJSON, Msg, DQX) {

    var GMaps = {}
    
    
    GMaps.Coord = function (longit, lattit) {
        var that = {};
        that.longit = longit;
        that.lattit = lattit;
    
        that.toGoogleLatLng = function () {
            return new google.maps.LatLng(this.lattit,this.longit);
        }
    
        return that;
    }
    
    
    
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
    GMaps.Country = function(iid, imapobject, country_name, gmap_options) {
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
                function () { Msg.send({ type: 'ClickMapPoint', id: that.myID }, that.myID); }
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
        for (var i=0; i<data.length; i++)
            myCoordinates.push(new google.maps.LatLng(data[i].lattit,data[i].longit));
        var polyOptions = {
            path: myCoordinates,
            strokeColor: "#FF0000",
            strokeOpacity: 0.5,
            strokeWeight: 3,
            fillColor: "#FF0000",
            fillOpacity:0.15
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
    
    GMaps.PointSet = function (iid, imapobject, iminzoomlevel, bitmapfile, polygon_options) {
        var that = {};
    
        that.myID = iid;
        that.myMapObject = imapobject;
        that.polygon_options = polygon_options;
        that.minZoomlevel = iminzoomlevel;
        that.myMapObject._addOverlay(that);
        that.myPointSet = [];
    
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
    
        that._handleOnPointClicked = function (pointnr) {
            //alert('clicked point ' + pointnr);
            Msg.send({ type: 'ClickMapPoint', id: this.myID }, this.myPointSet[pointnr].id);
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
                        for (var marknr = 0; marknr < this.myPointSet[pointnr].markers.length; marknr++)
                        {
                            this.myPointSet[pointnr].markers[marknr].setMap(this.myMapObject.myMap);
                        }
                }
            }
        }
    
        that.setPoints = function (ipointset) {
            this.clearPoints();
            this.myPointSet = ipointset;
            for (var i = 0; i < ipointset.length; i++) {
                var obj = this;
                (function (iarg) {//closure because we need persistent counter
                    var pointnr = iarg;
                    var markerobject = {
                        position: new google.maps.LatLng(ipointset[pointnr].lattit, ipointset[pointnr].longit),
                        map: obj.myMapObject.myMap
                    }
                    if ('image' in obj)
                        markerobject.icon = obj.image;
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
                        obj.myPointSet[pointnr].markers = [new google.maps.Marker(markerobject)];
                        google.maps.event.addListener(obj.myPointSet[pointnr].markers[0], 'click',
                            function () { obj._handleOnPointClicked(pointnr); }
                        );
                    }
                    
                })(i);
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
                    location: new google.maps.LatLng(ipointset[pointnr].lattit, ipointset[pointnr].longit),
                    weight: 1
                });
            that._myHeatMap = new google.maps.visualization.HeatmapLayer({
                data: heatmapData,
                dissipating: false,
                radius: 3.5,
                opacity: 0.4,
                maxIntensity:5,
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
    
    GMaps.Overlay._Base = function (imapobject, iid) {
        var that = new google.maps.OverlayView();
        that.myMapObject = imapobject;
        that.myID = iid;
        imapobject._addOverlay(that);
        that.setMap(that.myMapObject.myMap);
    
        //if dist is defined, it converts a distance in km to pixels (approx.)
        that.convCoordToPixels = function (coord, dist) {
            var overlayProjection = this.getProjection();
            var pt = overlayProjection.fromLatLngToDivPixel(coord.toGoogleLatLng());
            if (typeof dist != 'undefined') {
                var coord2 = GMaps.Coord(coord.longit, coord.lattit - +(dist / 40000.0 * 360));
                var pt2 = overlayProjection.fromLatLngToDivPixel(coord2.toGoogleLatLng());
                pt.dist = Math.abs(pt.y - pt2.y);
            }
            return pt;
        }
    
        that.remove = function () {
            this.setMap(null);
        }
    
    
    
        that.onAdd = function () {
            this.myDiv = document.createElement('div');
            this.myDiv.style.position = 'absolute';
    //        this.myDiv.style.backgroundColor = 'rgba(255,0,0,0.25)';
            var panes = this.getPanes();
            panes.overlayMouseTarget.appendChild(this.myDiv);
    
            google.maps.event.addDomListener(this.myDiv, 'mouseover', function () { $(this).css('cursor', 'pointer'); });
        }
    
        that.draw = function () {
            var bb = this.render();
            this.myDiv.style.left = bb.x0 + 'px';
            this.myDiv.style.top = bb.y0 + 'px';
            this.myDiv.style.width = (bb.x1 - bb.x0 + 1) + 'px';
            this.myDiv.style.height = (bb.y1 - bb.y0) + 'px';
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
        that.myID = iid;
        that.myCenterCoord = icentercoord;
        that.myRadius = iradius;
        that.myChart = ichart;
        that.myChart.myCallbackObject = that;
        DQX.ObjectMapper.Add(that);
    
        that.render = function () {
            var ps = this.convCoordToPixels(this.myCenterCoord, this.myRadius);
            var bb = {};
            bb.x0 = ps.x - ps.dist;
            bb.y0 = ps.y - ps.dist;
            bb.x1 = ps.x + ps.dist;
            bb.y1 = ps.y + ps.dist;
            var data = "<svg width={w} height={h}>".DQXformat({ w: 2 * ps.dist, h: 2 * ps.dist });
            data += this.myChart.render(ps.dist, ps.dist, ps.dist);
            data += "</svg>";
            this.myDiv.innerHTML = data;
            return bb;
        }
    
        that.pieClick = function (pienr) {
            alert('clicked ' + that.myID+ ' '+pienr);
        }
    
        return that;
    }
    
    
    
    //////////////////////////////////////////////////////////////////////////////////////////
    // Class Encapsulating Google Maps view with overlays
    //////////////////////////////////////////////////////////////////////////////////////////
    
    GMaps.GMap = function (idivid, istartcoord, istartzoomlevel) {
        var that = {};
        that.myDivID = idivid;
    
        $('#' + idivid).css('background-color', 'rgb(210,230,255)');
    
        var mapoptions = {
            zoom: istartzoomlevel,
            center: new google.maps.LatLng(istartcoord.lattit, istartcoord.longit),
            //        mapTypeId: google.maps.MapTypeId.ROADMAP
            mapTypeControlOptions: {
                mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.TERRAIN, google.maps.MapTypeId.SATELLITE, 'map_style_simple']
            }
        };
    
    
        that.myMap = new google.maps.Map(document.getElementById(idivid), mapoptions);
        that._myOverlays = [];
    
        that._addOverlay = function (obj) {
            that._myOverlays.push(obj);
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
            for (var i = 0; i < this._myOverlays.length; i++)
                if ("onZoomLevelChanged" in this._myOverlays[i])
                    this._myOverlays[i].onZoomLevelChanged();
        }
    
        google.maps.event.addListener(that.myMap, 'zoom_changed', $.proxy(that._handleOnZoomChanged, that));
    
        var styles = [
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [
                { lightness: 100 },
                { visibility: "simplified" }
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
            },
            {
                featureType: 'administrative.country',
                elementType: "all",
                stylers: [
                { gamma: "0.1" }
              ]
            }
          ];
    
        var styledMap = new google.maps.StyledMapType(styles, { name: "Simple" });
    
        that.myMap.mapTypes.set('map_style_simple', styledMap);
        that.myMap.setMapTypeId('map_style_simple');
    
        that.handleResize = function () {
            google.maps.event.trigger(this.myMap, 'resize');
        }
    
    
        return that;
    }
    return GMaps;
    });

