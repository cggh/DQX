/************************************************************************************************************************************
*************************************************************************************************************************************



*************************************************************************************************************************************
*************************************************************************************************************************************/


define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/Controls", "DQX/ChannelPlot/ChannelCanvas"],
    function ($, DocEl, Msg, Controls, ChannelCanvas) {
        var ChannelYVals = {};


        ////////////////////////////////////////////////////////////////////////
        // A class that encapsulates various styling aspects for drawing values on a plotter
        ////////////////////////////////////////////////////////////////////////

        ChannelYVals.PlotHints = function () {
            var that = {};
            that.drawLines = false;
            that.drawPoints = true;
            that.interruptLineAtAbsent = false;
            that.color = DQX.Color(0, 0, 0);
            that.opacity = 1.0;
            that.pointStyle = 0; //0: rectangle 1: crossed lines 2: bitmap

            //Call this function to let plots connect the dots with lines, if separated up to a given distance
            that.makeDrawLines = function (maxdist) {
                this.drawLines = true;
                this.maxLineDist = maxdist;
            }

            return that;
        }

        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Class ChannelYVals.YValsComp: implements a single component for ChannelYVals.Channel
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////

        //NOTE: a channel component is identified by a DataFetcher.Curve, and a column id in this fetcher
        ChannelYVals.Comp = function (iID, imyDataFetcher, iValueID) {
            var that = {};
            that.myfetcher = imyDataFetcher; //DataFetcher.Curve used
            if (!iID) iID=iValueID;
            that.ID = iID; // id of this component
            that.valueID = iValueID; // id of the component in the datafetched
            that.isActive = false;
            that.myPlotHints = ChannelYVals.PlotHints();
            that._maxViewportSizeX=1.0e99;//info will be hidden if the viewport gets larger than this

            if ('addFetchColumnValue' in that.myfetcher) {//Convenience function: for fetcher that allow this, add column now if necessary
                if (!that.myfetcher.hasFetchColumn(that.valueID)) //add column to datafetcher now
                    var colinfo = that.myfetcher.addFetchColumnValue(that.valueID);
            }

            if (!that.myfetcher.hasFetchColumn(that.valueID))
                DQX.reportError("Data fetcher does not have column "+that.valueID);

            that.getID = function () { return this.ID; }

            //return the color used to draw this channel
            that.getColor = function () {
                return this.myPlotHints.color;
            }

            that.setColor = function (icolor) {
                this.myPlotHints.color = icolor
            }

            that.getActive = function() { return that.isActive; }

            //modifies the activity status of this component
            that.modifyComponentActiveStatus = function (newstatus) {
                if (this.isActive == newstatus)
                    return;
                this.isActive = newstatus;
                if (newstatus)
                    this.myfetcher.activateFetchColumn(this.valueID);
                else
                    this.myfetcher.deactivateFetchColumn(this.valueID);
            }

            that.setMaxViewportSizeX = function(maxval) {
                that._maxViewportSizeX= maxval;
                return that;
            }



            that.draw = function (drawInfo, args) {

                this._pointsX = []; this._pointsY = []; this._pointsIndex = [];

                if ( drawInfo.sizeCenterX/drawInfo.zoomFactX > that._maxViewportSizeX+1 ) {
                    drawInfo.centerContext.fillStyle = "black";
                    drawInfo.centerContext.font = 'bold 14px sans-serif';
                    drawInfo.centerContext.textBaseline = 'bottom';
                    drawInfo.centerContext.textAlign = 'left';
                    drawInfo.centerContext.globalAlpha = 0.5;
                    drawInfo.centerContext.fillText("Zoom in to see individual points", 10, 15);
                    drawInfo.centerContext.globalAlpha = 1.0;
                    return;
                }

                var rangemin = args.rangemin;
                var rangemax = args.rangemax;
                var points = this.myfetcher.getColumnPoints(args.PosMin, args.PosMax, this.valueID);
                var xvals = points.xVals;
                var yvals = points.YVals;
                var psz = 3;
                if (xvals.length > 10000) psz = 2;
                var plothints = this.myPlotHints;
                var hasYFunction = "YFunction" in this;
                var pointsX = this._pointsX;
                var pointsY = this._pointsY;
                var pointsIndex = this._pointsIndex;

                var psy_fact = 1.0 / (rangemax - rangemin) * drawInfo.sizeY * 0.8;
                var psy_offset = drawInfo.sizeY - drawInfo.sizeY * 0.1 + rangemin * psy_fact;

                if (plothints.drawLines) {//draw connecting lines
                    drawInfo.centerContext.strokeStyle = plothints.color.toStringCanvas();
                    drawInfo.centerContext.globalAlpha = plothints.opacity;
                    if (plothints.drawPoints)
                        drawInfo.centerContext.globalAlpha = 0.4;
                    drawInfo.centerContext.beginPath();
                    var thefirst = true;
                    var maxlinedist = plothints.maxLineDist;
                    for (i = 0; i < xvals.length; i++) {
                        if (yvals[i] != null) {
                            var x = xvals[i];
                            var y = yvals[i];
                            if (hasYFunction)
                                y = this.YFunction(y);
                            var psx = x * drawInfo.zoomFactX - drawInfo.offsetX;
                            var psy = psy_offset - y * psy_fact;
                            if ((!thefirst) && (x - xlast > maxlinedist))
                                thefirst = true;
                            if (thefirst) drawInfo.centerContext.moveTo(psx, psy);
                            else drawInfo.centerContext.lineTo(psx, psy);
                            thefirst = false;
                            var xlast = x;
                        }
                        else {
                            if ((!thefirst) && (plothints.interruptLineAtAbsent)) {
                                thefirst = true;
                            }
                        }
                    }
                    drawInfo.centerContext.stroke();
                    drawInfo.centerContext.globalAlpha = 1.0;
                }

                var pointstyle = plothints.pointStyle;

                if (pointstyle == 2) {
                    var img = document.getElementById(plothints.pointBitmapID);
                }

                if (pointstyle == 1) {
                    drawInfo.centerContext.strokeStyle = plothints.color.toStringCanvas();
                    drawInfo.centerContext.beginPath();
                }
                if (plothints.drawPoints) {//draw points
                    drawInfo.centerContext.fillStyle = plothints.color.toStringCanvas();
                    for (i = 0; i < xvals.length; i++) {
                        if (yvals[i] != null) {
                            var x = xvals[i];
                            var y = yvals[i];
                            if (hasYFunction)
                                y = this.YFunction(y);
                            var psx = Math.round(x * drawInfo.zoomFactX - drawInfo.offsetX);
                            var psy = Math.round(psy_offset - y * psy_fact);
                            pointsX.push(psx); pointsY.push(psy); pointsIndex.push(i + points.startIndex);
                            switch (pointstyle) {
                                case 0:
                                    drawInfo.centerContext.fillRect(psx - 1, psy - 1, psz, psz);
                                    break;
                                case 1:
                                    drawInfo.centerContext.moveTo(psx - 2, psy - 0.5);
                                    drawInfo.centerContext.lineTo(psx + 1, psy - 0.5);
                                    drawInfo.centerContext.moveTo(psx - 0.5, psy - 2);
                                    drawInfo.centerContext.lineTo(psx - 0.5, psy + 1);
                                    break;
                                case 2:
                                    drawInfo.centerContext.drawImage(img, psx, psy);
                                    break;
                            }
                        }
                    }
                }
                if (pointstyle == 1) {
                    drawInfo.centerContext.stroke();
                }
            }

            that.getClosestPoint = function (px, py) {
                var mindst = 6;
                var closestPointIndex = null; var mpx = null; var mpy = null;
                var pointsX = this._pointsX;
                var pointsY = this._pointsY;
                var pointsIndex = this._pointsIndex;
                var len = pointsX.length;
                for (var i = 0; i < len; i++) {
                    var dst = Math.abs(pointsX[i] - px) + Math.abs(pointsY[i] - py);
                    if (dst < mindst) {
                        mindst = dst;
                        closestPointIndex = pointsIndex[i];
                        mpx = pointsX[i];
                        mpy = pointsY[i];
                    }
                }
                return { minDistance: mindst, closestPointIndex: closestPointIndex, px: mpx, py: mpy, highlightPoint: true };
            }



            return that;
        }



        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Class ChannelYVals.YValsCompFilled: implements a single component for ChannelYVals.Channel; zith a filled background
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////

        //NOTE: a channel component is identified by a DataFetcher.Curve, and a column id in this fetcher
        ChannelYVals.CompFilled = function (iID, imyDataFetcher, iValueID) {
            var that = {};
            that.myfetcher = imyDataFetcher; //DataFetcher.Curve used
            if (!iID) iID=iValueID;
            that.ID = iID; // id of this component
            that.valueID = iValueID; // id of the component in the datafetched
            that.isActive = false;
            that.myPlotHints = ChannelYVals.PlotHints();
            that.myPlotHints.opacity = 0.5;

            if ('addFetchColumnValue' in that.myfetcher) {//Convenience function: for fetcher that allow this, add column now if necessary
                if (!that.myfetcher.hasFetchColumn(that.valueID)) //add column to datafetcher now
                    var colinfo = that.myfetcher.addFetchColumnValue(that.valueID);
            }

            if (!that.myfetcher.hasFetchColumn(that.valueID))
                DQX.reportError("Data fetcher does not have column "+that.valueID);


            that.getID = function () { return this.ID; }

            //return the color used to draw this channel
            that.getColor = function () {
                return this.myPlotHints.color;
            }

            that.setColor = function (icolor, opacity) {
                this.myPlotHints.color = icolor;
                if (opacity)
                    that.myPlotHints.opacity = opacity;
            }

            that.getActive = function() { return that.isActive; }


            //modifies the activity status of this component
            that.modifyComponentActiveStatus = function (newstatus) {
                if (this.isActive == newstatus)
                    return;
                this.isActive = newstatus;
                if (newstatus)
                    this.myfetcher.activateFetchColumn(this.valueID);
                else
                    this.myfetcher.deactivateFetchColumn(this.valueID);
            }


            that.draw = function (drawInfo, args) {
                var rangemin = args.rangemin;
                var rangemax = args.rangemax;
                var points = this.myfetcher.getColumnPoints(args.PosMin, args.PosMax, this.valueID);
                var xvals = points.xVals;
                var yvals = points.YVals;
                var psz = 3;
                if (xvals.length > 10000) psz = 2;
                var plothints = this.myPlotHints;
                var hasYFunction = "YFunction" in this;
                this._pointsX = []; this._pointsY = []; this._pointsIndex = [];
                var pointsX = this._pointsX;
                var pointsY = this._pointsY;
                var pointsIndex = this._pointsIndex;

                var psy_fact = 1.0 / (rangemax - rangemin) * drawInfo.sizeY * 0.8;
                var psy_offset = drawInfo.sizeY - drawInfo.sizeY * 0.1 + rangemin * psy_fact;

                var closePath = function () {
                    if (!thefirst) {
                        drawInfo.centerContext.lineTo(psx, psy_offset);
                        drawInfo.centerContext.globalAlpha = 0.5 * that.myPlotHints.opacity;
                        drawInfo.centerContext.fill();
                        drawInfo.centerContext.globalAlpha = that.myPlotHints.opacity;
                        drawInfo.centerContext.stroke();
                        drawInfo.centerContext.globalAlpha = 1.0;
                        theFirst = true;
                    }
                }
                var startPath = function () {
                    if (thefirst) {
                        drawInfo.centerContext.beginPath();
                        drawInfo.centerContext.moveTo(psx, psy_offset);
                    }
                }

                drawInfo.centerContext.fillStyle = plothints.color.toStringCanvas();
                drawInfo.centerContext.strokeStyle = plothints.color.toStringCanvas();
                var thefirst = true;
                var maxlinedist = plothints.maxLineDist;
                for (i = 0; i < xvals.length; i++) {
                    if (yvals[i] != null) {
                        var x = xvals[i];
                        var y = yvals[i];
                        if (hasYFunction)
                            y = this.YFunction(y);
                        var psx = x * drawInfo.zoomFactX - drawInfo.offsetX;
                        var psy = psy_offset - y * psy_fact;
                        if ((!thefirst) && (x - xlast > maxlinedist)) {
                            closePath();
                            thefirst = true;
                        }
                        if (thefirst) startPath();
                        drawInfo.centerContext.lineTo(psx, psy);
                        thefirst = false;
                        var xlast = x;
                    }
                    else {
                        if ((!thefirst) && (plothints.interruptLineAtAbsent)) {
                            closePath();
                            thefirst = true;
                        }
                    }
                }
                closePath();

            }

            that.getClosestPoint = function (px, py) {
                return null;
            }

            return that;
        }



        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Class ChannelYVals.YRangeComp: implements a single component for ChannelYVals.Channel,
        // drawing a range between a minimum Y curve value and a maximum Y curve value
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////

        //NOTE: a channel component is identified by a DataFetcher.Curve, and a column id in this fetcher
        ChannelYVals.YRange = function (iID, imyDataFetcher, iYIDMin, iYIDMax, iColor) {
            var that = {};
            that.myfetcher = imyDataFetcher; //DataFetcher.Curve used
            if (!iID) iID=iYIDMin;
            that.ID = iID; // id of this component
            that.YIDMin = iYIDMin; //id of the minimum value in the datafetcher
            that.YIDMax = iYIDMax; //id of the maximum value in the datafetcher
            that.myColor = iColor;
            that.isActive = false;
            that.myPlotHints = ChannelYVals.PlotHints();


            if ('addFetchColumnValue' in that.myfetcher) {//Convenience function: for fetcher that allow this, add column now if necessary
                if (!that.myfetcher.hasFetchColumn(that.valueID)) {//add column to datafetcher now
                    var colinfo = that.myfetcher.addFetchColumnValue(that.YIDMin);
                    var colinfo = that.myfetcher.addFetchColumnValue(that.YIDMax);
                }
            }

            if (!that.myfetcher.hasFetchColumn(that.YIDMin))
                DQX.reportError("Data fetcher does not have column "+that.YIDMin);
            if (!that.myfetcher.hasFetchColumn(that.YIDMax))
                DQX.reportError("Data fetcher does not have column "+that.YIDMax);


            that.getID = function () { return this.ID; }

            //return the color used to draw this channel
            that.getColor = function () {
                return this.myPlotHints.color;
            }

            that.setColor = function (icolor) {
                this.myPlotHints.color = icolor
            }

            that.getActive = function() { return that.isActive; }


            //modifies the activity status of this component
            that.modifyComponentActiveStatus = function (newstatus) {
                if (this.isActive == newstatus)
                    return;
                this.isActive = newstatus;
                if (newstatus) {
                    this.myfetcher.activateFetchColumn(this.YIDMin);
                    this.myfetcher.activateFetchColumn(this.YIDMax);
                }
                else {
                    this.myfetcher.deactivateFetchColumn(this.YIDMin);
                    this.myfetcher.deactivateFetchColumn(this.YIDMax);
                }
            }


            that.draw = function (drawInfo, args) {
                var rangemin = args.rangemin;
                var rangemax = args.rangemax;
                var points1 = this.myfetcher.getColumnPoints(args.PosMin, args.PosMax, this.YIDMin);
                var points2 = this.myfetcher.getColumnPoints(args.PosMin, args.PosMax, this.YIDMax);
                var xvals1 = points1.xVals;
                var yvals1 = points1.YVals;
                var xvals2 = points1.xVals;
                var yvals2 = points2.YVals;
                var thefirst = true;
                drawInfo.centerContext.beginPath();
                drawInfo.centerContext.fillStyle = this.myColor.toStringCanvas();

                var psy_fact = 1.0 / (rangemax - rangemin) * drawInfo.sizeY * 0.8;
                var psy_offset = drawInfo.sizeY - drawInfo.sizeY * 0.1 + rangemin * psy_fact;
                var hasYFunction = "YFunction" in this;

                var psx, psy;
                for (i = 0; i < xvals1.length; i++) {
                    psx = xvals1[i] * drawInfo.zoomFactX - drawInfo.offsetX;
                    if (yvals1[i] != null) {
                        var y = yvals1[i];
                        if (hasYFunction)
                            y = this.YFunction(y);
                        psy = psy_offset - y * psy_fact;
                    }
                    else
                        psy = psy_offset;
                    if (thefirst) {
                        drawInfo.centerContext.moveTo(psx, psy);
                        thefirst = false;
                    }
                    else drawInfo.centerContext.lineTo(psx, psy);
                }
                for (i = xvals2.length - 1; i >= 0; i--) {
                    var psx = xvals2[i] * drawInfo.zoomFactX - drawInfo.offsetX;
                    if (yvals2[i] != null) {
                        var y = yvals2[i];
                        if (hasYFunction)
                            y = this.YFunction(y);
                        psy = psy_offset - y * psy_fact;
                    }
                    else
                        psy = psy_offset;
                    drawInfo.centerContext.lineTo(psx, psy);
                }
                drawInfo.centerContext.fill();
            }

            that.getClosestPoint = function (px, py) {
                return null;
            }


            return that;
        }

        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Class ChannelYVals.YColorZone: implements a single component for ChannelYVals.Channel,
        // drawing a horizontal color bar indication between a constant min and max Y value
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////

        ChannelYVals.YColorZone = function (iID, iminval, imaxval, iColor) {
            var that = {};
            if (!iID) iID='YValComp'+DQX.getNextUniqueID();
            that.ID = iID; // id of this component
            that.minVal = iminval;
            that.maxVal = imaxval;
            that.myColor = iColor;
            that.isActive = true;
            //that.myPlotHints = ChannelYVals.PlotHints();

            that.getID = function () { return this.ID; }

            //return the color used to draw this channel
            //that.getColor = function () {
            //    return this.myPlotHints.color;
            //}

            //that.setColor = function (icolor) {
            //    this.myPlotHints.color = icolor
            //}

            //modifies the activity status of this component
            that.modifyComponentActiveStatus = function (newstatus) {
                if (this.isActive == newstatus)
                    return;
                this.isActive = newstatus;
            }

            that.getActive = function() { return that.isActive; }


            that.draw = function (drawInfo, args) {
                var rangemin = args.rangemin;
                var rangemax = args.rangemax;
                var psy_fact = 1.0 / (rangemax - rangemin) * drawInfo.sizeY * 0.8;
                var psy_offset = drawInfo.sizeY - drawInfo.sizeY * 0.1 + rangemin * psy_fact;
                var psy1 = Math.round(psy_offset - this.minVal * psy_fact) - 0.5;
                var psy2 = Math.round(psy_offset - this.maxVal * psy_fact) - 0.5;
                drawInfo.centerContext.fillStyle = that.myColor.toStringCanvas();
                drawInfo.centerContext.fillRect(0, psy2, drawInfo.sizeCenterX, psy1 - psy2 + 1);
                drawInfo.centerContext.strokeStyle = that.myColor.toStringCanvas();
                drawInfo.centerContext.beginPath();
                drawInfo.centerContext.moveTo(0, psy1); drawInfo.centerContext.lineTo(drawInfo.sizeCenterX, psy1);
                drawInfo.centerContext.moveTo(0, psy2); drawInfo.centerContext.lineTo(drawInfo.sizeCenterX, psy2);
                drawInfo.centerContext.moveTo(0, psy2); drawInfo.centerContext.lineTo(drawInfo.sizeCenterX, psy2);
                drawInfo.centerContext.stroke();
                drawInfo.centerContext.beginPath();
                drawInfo.centerContext.moveTo(0, psy1); drawInfo.centerContext.lineTo(drawInfo.sizeCenterX, psy1);
                drawInfo.centerContext.moveTo(0, psy2); drawInfo.centerContext.lineTo(drawInfo.sizeCenterX, psy2);
                drawInfo.centerContext.moveTo(0, psy2); drawInfo.centerContext.lineTo(drawInfo.sizeCenterX, psy2);
                drawInfo.centerContext.stroke();
            }

            that.getClosestPoint = function (px, py) {
                return null;
            }


            return that;
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Class ChannelYVals.Channel: implements a channel that displays an X-Y plot
        // This plot consists of one or more components
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////

        ChannelYVals.Channel = function (id, args) {
            var that = ChannelCanvas.Base(id);
            that._height = 120;
            that._minVal = args.minVal;
            that._maxVal = args.maxVal;
            that.myComponents = {}; //maps components ids to ChannelPlotChannelYValsComp objects
            that.minDrawZoomFactX = 0; //if the zoom factor drops below this point, the channel isn't drawn anymore

            //add a nw component to the plot
            that.addComponent = function (icomp, isActive) {
                if (!that._myPlotter)
                    DQX.reportError('Channel should be attached to a plotter before adding components');
                if (icomp.myfetcher)
                    that._myPlotter.addDataFetcher(icomp.myfetcher);
                icomp.level = 0;
                if (icomp.getID() in this.myComponents)
                    DQX.reportError('YValue channel component already present: '+icomp.getID());
                this.myComponents[icomp.getID()] = icomp;
                icomp.myChannel = this;
                if (isActive)
                    that.modifyComponentActiveStatus(icomp.getID(),true);
                return icomp;
            }

            that.getComponentList = function () {
                return this.myComponents;
            }

            that.findComponent = function (cmpid) {
                if (!(cmpid in this.myComponents))
                    DQX.reportError('Invalid component ' + cmpid);
                return this.myComponents[cmpid];
            }

            //Modifies the activity status of a component inside this channel
            that.modifyComponentActiveStatus = function (cmpid, newstatus, redraw) {
                this.myComponents[cmpid].modifyComponentActiveStatus(newstatus);
                if (redraw)
                    this._myPlotter.render();
            }


            that.createComponentVisibilityControl = function(cmpid, label, showColor, defaultHidden) {
                var theLabel=label;
                if (defaultHidden) {
                    that.modifyComponentActiveStatus(cmpid,false,false);
                    that._myPlotter.channelModifyVisibility(that.getID(),false);
                }
                if (showColor)
                    theLabel='<span style="background-color:{cl}">&nbsp&nbsp&nbsp</span>&nbsp'.DQXformat({cl:that.myComponents[cmpid].myPlotHints.color})+theLabel;
                var chk=Controls.Check(null,{ label:theLabel, value:(!defaultHidden) }).setOnChanged(function() {
                    that.modifyComponentActiveStatus(cmpid,chk.getValue(),false);
                    //check if any component is still visible
                    var channelActive=false;
                    for (var othercompid in that.myComponents)
                        if (that.myComponents[othercompid].getActive()) channelActive=true;
                    that._myPlotter.channelModifyVisibility(that.getID(),channelActive);

                    that._myPlotter.render();
                });
                return chk;
            }


            that.createVisibilityControl = function(defaultHidden) {
                if (defaultHidden) {
                    for (var compid in that.myComponents)
                        that.modifyComponentActiveStatus(compid,false,false);
                    that._myPlotter.channelModifyVisibility(that.getID(),false);
                }
                var chk=Controls.Check(null,{ label:that.getTitle(), value:(!defaultHidden) }).setOnChanged(function() {
                    //check if any component is still visible
                    var channelActive=false;
                    for (var compid in that.myComponents)
                        that.modifyComponentActiveStatus(compid,chk.getValue(),false);
                    that._myPlotter.channelModifyVisibility(that.getID(),chk.getValue());
                    that._myPlotter.render();
                });
                return chk;
            }



            that.setChangeYScale = function (canChangeMinVal, canChangeMaxVal) {
                that._canChangeYScaleBottom = canChangeMinVal;
                that._canChangeYScaleTop = canChangeMaxVal;
                return that;
            }

            //returns a list of all fetchers that are currently active in this plot (i.e. correspond to active components)
            that.getActiveDataFetchers = function () {
                var lst = [];
                for (var compid in this.myComponents) {
                    if (this.myComponents[compid].isActive) {
                        var fetcher = this.myComponents[compid].myfetcher;
                        if (fetcher) {
                            var found = false;
                            for (var i = 0; i < lst.length; i++)
                                if (fetcher == lst[i])
                                    found = true;
                            if (!found)
                                lst.push(fetcher);
                        }
                    }
                }
                return lst;
            }

            var parent_postCreateHtml = $.proxy(that.postCreateHtml, that);
            that.postCreateHtml = function () {
                parent_postCreateHtml();

                $('#' + this.getCanvasID('left')).mousedown($.proxy(that._onMouseDownLeft, that));
                $('#' + this.getCanvasID('left')).mousemove($.proxy(that._onMouseMoveLeft, that));
                $('#' + this.getCanvasID('left')).mouseenter($.proxy(that._onMouseEnterLeft, that));
                $('#' + this.getCanvasID('left')).mouseleave($.proxy(that._onMouseLeaveLeft, that));
            }


            /////////////////// Event handlers for left panel ///////////////////////////


            that._onMouseMoveLeft = function (ev) {
                var px = this.getEventPosX(ev);
                var py = this.getEventPosY(ev);
                if ((this._canChangeYScaleTop) || (this._canChangeYScaleBottom)) {
                    if (px > -50)
                        $('#' + this.getCanvasID('left')).css('cursor', 'row-resize');
                    else
                        $('#' + this.getCanvasID('left')).css('cursor', 'auto');

                }
            }

            that._onMouseDownLeft = function (ev) {
                $(document).bind("mouseup.ChannelCanvasLeft", $.proxy(that._onMouseDragUpLeft, that));
                $(document).bind("mousemove.ChannelCanvasLeft", $.proxy(that._onMouseDragMoveLeft, that));
                var px = this.getEventPosX(ev);
                var py = this.getEventPosY(ev);
                var channelH = $('#' + this.getCanvasID('left')).height();
                this._draggingYScaleTop = false;
                this._draggingYScaleBottom = false;
                this._draggingYScaleTop = ((this._canChangeYScaleTop) && (px > -50));
                if ((this._canChangeYScaleBottom) && (px > -50) && (py >= channelH / 2)) {
                    this._draggingYScaleTop = false;
                    this._draggingYScaleBottom = true;
                }
                this._draggingY0 = py;
                this.draggingMinVal0 = this._minVal;
                this.draggingMaxVal0 = this._maxVal;
                ev.returnValue = false;
                return false;
            }

            that._onMouseDragUpLeft = function (ev) {
                $(document).unbind("mouseup.ChannelCanvasLeft");
                $(document).unbind("mousemove.ChannelCanvasLeft");
                ev.returnValue = false;
                return false;
            }

            that._onMouseDragMoveLeft = function (ev) {
                var px = this.getEventPosX(ev);
                var py = this.getEventPosY(ev);
                if (this._draggingYScaleTop) {
                    this._maxVal = this.draggingMinVal0 + (this.draggingMaxVal0 - this.draggingMinVal0) * Math.exp((py - this._draggingY0) / 70);
                    this.getMyPlotter().render();
                }
                if (this._draggingYScaleBottom) {
                    this._minVal = this.draggingMaxVal0 - (this.draggingMaxVal0 - this.draggingMinVal0) * Math.exp(-(py - this._draggingY0) / 70);
                    this.getMyPlotter().render();
                }
                ev.returnValue = false;
                return false;
            }





            that.draw = function (drawInfo) {
                this.drawStandardGradientCenter(drawInfo, 1);
                this.drawStandardGradientLeft(drawInfo, 1);
                this.drawStandardGradientRight(drawInfo, 1);

                this.drawVertScale(drawInfo, this._minVal, this._maxVal);

                var hasdata = false;
                for (var compid in this.myComponents)
                    if (this.myComponents[compid].isActive)
                        hasdata = true;

                if ( (drawInfo.needZoomIn) || (drawInfo.zoomFactX < this.minDrawZoomFactX) ) {
                    if (!hasdata)
                        this.drawMessage(drawInfo, "");
                    else
                        this.drawMessage(drawInfo, "Zoom in to see " + this.getTitle());
                    return;
                }
                if (!hasdata) return;


                drawInfo.centerContext.strokeStyle = "black";
                this.PosMin = Math.round((-50 + drawInfo.offsetX) / drawInfo.zoomFactX);
                this.PosMax = Math.round((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX);

                var fetcherlist = this.getActiveDataFetchers();
                var alldataready = true;
                var fetcherror = false;
                for (var fetchnr = 0; fetchnr < fetcherlist.length; fetchnr++) {
                    if (!fetcherlist[fetchnr].IsDataReady(this.PosMin, this.PosMax, false))
                        alldataready = false;
                    if (fetcherlist[fetchnr].hasFetchFailed)
                        fetcherror = true;
                }
                if ((!alldataready) && (!fetcherror)) this.drawFetchBusyMessage(drawInfo);
                if (fetcherror) this.drawFetchFailedMessage(drawInfo);

                if (alldataready)
                    var q = 0;

                for (var levelnr = 0; levelnr < 2; levelnr++) {
                    for (var compid in this.myComponents) {
                        var comp = this.myComponents[compid];
                        if ((comp.isActive) && (levelnr == comp.level)) {
                            comp.draw(drawInfo, { PosMin: this.PosMin, PosMax: this.PosMax, rangemin: this._minVal, rangemax: this._maxVal });
                        }
                    }
                }

                this.drawMark(drawInfo);
                this.drawTitle(drawInfo);
                this.drawXScale(drawInfo);
            }

            that.handleMouseClicked = function (px, py) {
                var tooltipInfo = that.getToolTipInfo(px, py);
                if (tooltipInfo) {
                    that.handlePointClicked(tooltipInfo.compID, tooltipInfo.closestPointIndex);
                }
            }

            that.getToolTipInfo = function (px, py) {
                var bestMatch = { minDistance: 6, closestPointIndex: null };
                for (var compid in this.myComponents) {
                    var comp = this.myComponents[compid];
                    if (comp.isActive) {
                        var tryMatch = comp.getClosestPoint(px, py);
                        if (tryMatch && (tryMatch.minDistance < bestMatch.minDistance)) {
                            bestMatch = tryMatch;
                            bestMatch.compID = compid;
                            bestMatch.ID = compid + '_' + bestMatch.closestPointIndex;
                            bestMatch.showPointer = true;
                        }
                    }
                }
                if (bestMatch.ID) {
                    bestMatch.content = this.getToolTipContent(bestMatch.compID, bestMatch.closestPointIndex);
                    return bestMatch;
                }
                else
                    return null;
                return null;
            }

            //Returns the tooltip content for a given point. This function can be overridden to implement a specific behaviour
            that.getToolTipContent = function (compID, pointIndex) {
                var comp = this.myComponents[compID];
                var value = comp.myfetcher.getColumnPoint(pointIndex, compID);
                return compID + '= ' + value;
            }

            //Reacts on a click event on a point. This function can be overridden to implement a specific behaviour
            that.handlePointClicked = function (compID, pointIndex) {
            }


            return that;
        }




        return ChannelYVals;
    });
