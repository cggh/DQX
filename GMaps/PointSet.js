
define(["jquery", "DQX/data/countries", "DQX/lib/geo_json", "DQX/lib/StyledMarker", "DQX/Msg", "DQX/DocEl", "DQX/Utils", "DQX/FramePanel", "DQX/Map"],
    function ($, Countries, GeoJSON, StyledMarker, Msg, DocEl, DQX, FramePanel, Map) {

        var PointSet = {};

        PointSet.Create = function (imapobject, settings) {
            var that = {};

            // Preparing the markers
            var canvas = document.createElement('canvas');
            var markerHalfWidth = 5;
            canvas.width = 2*markerHalfWidth;
            canvas.height = 2*markerHalfWidth;
            var ctx = canvas.getContext("2d");
            ctx.fillStyle="rgba(255,0,0,0.5)";
            ctx.beginPath();
            ctx.arc(markerHalfWidth, markerHalfWidth, markerHalfWidth, 0, 2 * Math.PI, false);
            ctx.fill();
//            ctx.strokeStyle = "rgba(0,0,0,0.5)";
//            ctx.stroke();
            url = canvas.toDataURL();
            that.markerImage1 = new google.maps.MarkerImage(url, null, null, new google.maps.Point(markerHalfWidth, markerHalfWidth));

            // Preparing the markers
            var canvas = document.createElement('canvas');
            var markerHalfWidth = 5;
            canvas.width = 2*markerHalfWidth+1;
            canvas.height = 2*markerHalfWidth+1;
            var ctx = canvas.getContext("2d");
            ctx.fillStyle="rgba(255,0,0,0.5)";
            ctx.beginPath();
            ctx.arc(markerHalfWidth, markerHalfWidth, markerHalfWidth-1, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.strokeStyle = "rgb(0,0,0)";
            ctx.lineWidth=2;
            ctx.stroke();
            url = canvas.toDataURL();
            that.markerImage2 = new google.maps.MarkerImage(url, null, null, new google.maps.Point(markerHalfWidth, markerHalfWidth));


//            https://chart.googleapis.com/chart?chst=d_map_spin&chld=0.25|0|FF0000|9|b|O
//  wget --output-document test.png "https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=A|B88A00|FF0000"
//            that.pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + "00AAAA",
//                new google.maps.Size(21, 34),
//                new google.maps.Point(0,0),
//                new google.maps.Point(10, 34));

//            that.markerImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + "00AAAA",
//                //new google.maps.Size(21, 34),
//                new google.maps.Size(11, 16),
//                new google.maps.Point(0,0),
//                new google.maps.Point(10, 34));


            that.myMapObject = imapobject;
            that.myPointSet = [];

            that.clearPoints = function () {
                for (var pointnr = 0; pointnr < that.myPointSet.length; pointnr++)
                    if (that.myPointSet[pointnr].marker)
                        that.myPointSet[pointnr].marker.setMap(null);
                this.myPointSet = [];
            }

            that.remove = function () {
                this.clearPoints();
            }

            that.setPointClickCallBack = function(handler) {
                that._pointClickCallBack = handler;
            }


            that.setPoints = function (ipointset) {
                that.clearPoints();
                that.myPointSet = ipointset;
                $.each(that.myPointSet, function (idx, point) {

                    var marker = point.sel?that.markerImage2:that.markerImage1;
                    var markerObject = new google.maps.Marker({
                        position: new google.maps.LatLng(point.lattit, point.longit),
                        icon: marker
                    });
                    markerObject.setMap(that.myMapObject.myMap);
                    google.maps.event.addListener(markerObject, 'click', function() {
                        if (that._pointClickCallBack)
                            that._pointClickCallBack(point.id);
                    });
                    point.marker = markerObject;

                });
            };

            that.updateSelectionState = function(pointnr) {
                if (!that.myPointSet)
                    return;
                if ( (pointnr<0) || (pointnr>=that.myPointSet.length) )
                    DQX.reportError('Invalid point nr');

                var point = that.myPointSet[pointnr];

                point.marker.setMap(null);

                var marker = point.sel?that.markerImage2:that.markerImage1;
                var markerObject = new google.maps.Marker({
                    position: new google.maps.LatLng(point.lattit, point.longit),
                    icon: marker
                });
                markerObject.setMap(that.myMapObject.myMap);
                google.maps.event.addListener(markerObject, 'click', function() {
                    if (that._pointClickCallBack)
                        that._pointClickCallBack(point.id);
                });
                point.marker = markerObject;

            }

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
        };


        return PointSet;
    });


