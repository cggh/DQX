define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/ChannelPlot/ChannelCanvas"],
    function ($, DocEl, Msg, ChannelCanvas) {
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

        //NOTE: a channel is identified by a DataFetcher.Curve, and a column id in this fetcher
        ChannelYVals.Comp = function (iID, imyDataFetcher, iValueID) {
            var that = {};
            that.myfetcher = imyDataFetcher; //DataFetcher.Curve used
            that.ID = iID; // id of this component
            that.valueID = iValueID; // id of the component in the datafetched
            that.isActive = false;
            that.myPlotHints = ChannelYVals.PlotHints();

            that.getID = function () { return this.ID; }

            //return the color used to draw this channel
            that.getColor = function () {
                return this.myPlotHints.color;
            }

            that.setColor = function (icolor) {
                this.myPlotHints.color = icolor
            }

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

            return that;
        }


        ChannelYVals.Channel = function (id, args) {
            var that = ChannelCanvas.Base(id);
            that._height = 120;
            that._minVal = args.minVal;
            that._maxVal = args.maxVal;
            that.myComponents = {}; //maps components ids to ChannelPlotChannelYValsComp objects
            that.minDrawZoomFactX = 0; //if the zoom factor drops below this point, the channel isn't drawn anymore

            //add a nw component to the plot
            that.addComponent = function (icomp) {
                icomp.level = 0;
                this.myComponents[icomp.getID()] = icomp;
                icomp.myChannel = this;
                return icomp;
            }

            that.modifyComponentActiveStatus = function (cmpid, newstatus, redraw) {
                this.myComponents[cmpid].modifyComponentActiveStatus(newstatus);
                if (redraw)
                    this.myPlot.render();
            }

            //returns a list of all fetchers that are currently active in this plot (i.e. correspond to active components)
            that.getActiveDataFetchers = function () {
                var lst = [];
                for (var compid in this.myComponents) {
                    if (this.myComponents[compid].isActive) {
                        var fetcher = this.myComponents[compid].myfetcher;
                        var found = false;
                        for (var i = 0; i < lst.length; i++)
                            if (fetcher == lst[i])
                                found = true;
                        if (!found)
                            lst.push(fetcher);
                    }
                }
                return lst;
            }

            that.draw = function (drawInfo) {
                this.drawStandardGradientCenter(drawInfo);
                this.drawStandardGradientLeft(drawInfo);
                this.drawStandardGradientRight(drawInfo);

                this.drawVertScale(drawInfo, this._minVal, this._maxVal);

                var hasdata = false;
                for (var compid in this.myComponents)
                    if (this.myComponents[compid].isActive)
                        hasdata = true;

                if (drawInfo.zoomFactX < this.minDrawZoomFactX) {
                    if (!hasdata)
                        this.drawMessage(drawInfo, "");
                    else
                        this.drawMessage(drawInfo, "Zoom in to see " + this.myTitle);
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

                var NrPointsDrawn = 0;
                for (var levelnr = 0; levelnr < 2; levelnr++) {
                    for (var compid in this.myComponents) {
                        var comp = this.myComponents[compid];
                        if ((comp.isActive) && (levelnr == comp.level)) {
                            comp.draw(drawInfo, { PosMin: this.PosMin, PosMax: this.PosMax, rangemin: this._minVal, rangemax: this._maxVal });
                        }
                    }
                }
                this.allowToolTipsInCurrentView = NrPointsDrawn < 5000;

                this.drawMark(drawInfo);
                this.drawTitle(drawInfo);
            }

            return that;
        }



        return ChannelYVals;
    });
