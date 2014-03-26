/************************************************************************************************************************************
 *************************************************************************************************************************************



 *************************************************************************************************************************************
 *************************************************************************************************************************************/


define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/Controls", "DQX/ChannelPlot/ChannelCanvas", "DQX/DataFetcher/DataFetchers"],
    function ($, DocEl, Msg, Controls, ChannelCanvas, DataFetchers) {
        var ChannelMultiCatDensity = {};



        ChannelMultiCatDensity.Channel = function (id, ifetcher, icol) {
            var that = ChannelCanvas.Base(id);
            that._height = 120;
            that.myfetcher = ifetcher;

            that.mycol = icol;

//            that._minVal = args.minVal;
//            that._maxVal = args.maxVal;
//            that.myComponents = {}; //maps components ids to ChannelPlotChannelMultiCatDensityComp objects
            that.minDrawZoomFactX = 0; //if the zoom factor drops below this point, the channel isn't drawn anymore



            that.setChangeYScale = function (canChangeMinVal, canChangeMaxVal) {
                that._canChangeYScaleBottom = canChangeMinVal;
                that._canChangeYScaleTop = canChangeMaxVal;
                return that;
            }

            //returns a list of all fetchers that are currently active in this plot (i.e. correspond to active components)
            that.getActiveDataFetchers = function () {
                var lst = [];
                return lst;
            }

            var parent_postCreateHtml = $.proxy(that.postCreateHtml, that);
            that.postCreateHtml = function () {
                parent_postCreateHtml();

                $('#' + this.getCanvasID('left')).mousedown($.proxy(that._onMouseDownLeft, that));
                $('#' + this.getCanvasID('left')).mousemove($.proxy(that._onMouseMoveLeft, that));
//                $('#' + this.getCanvasID('left')).mouseenter($.proxy(that._onMouseEnterLeft, that));
//                $('#' + this.getCanvasID('left')).mouseleave($.proxy(that._onMouseLeaveLeft, that));
            }


            /////////////////// Event handlers for left panel ///////////////////////////


            that._onMouseMoveLeft = function (ev) {
                var px = this.getEventPosX(ev);
                var py = this.getEventPosY(ev);
                if ((this._canChangeYScaleTop) || (this._canChangeYScaleBottom)) {
                    if (px > -50)
                        var cursorName = 'row-resize';
                    else {
                        if (that._onClickHandler)
                            var cursorName = 'pointer';
                        else
                            var cursorName = 'auto';
                    }
                    $('#' + this.getCanvasID('left')).css('cursor', cursorName);

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

                if ( (!this._draggingYScaleTop) && (!this._draggingYScaleBottom) && (this._onClickHandler)) {
                    this._onClickHandler();
                }

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

                var PosMin = Math.round((-50 + drawInfo.offsetX) / drawInfo.zoomFactX);
                var PosMax = Math.round((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX);

                if (!that.myfetcher.IsDataReady(PosMin, PosMax))
                    alldataready = false;
                if (that.myfetcher.hasFetchFailed)
                    fetcherror = true;

                //var blockSize = this.myfetcher.getCurrentBlockSize(PosMin, PosMax);
                var points = this.myfetcher.getColumnPoints(PosMin, PosMax, that.mycol.myID);
                var xvals = points.xVals;
                var yvals = points.YVals;
                var blockSize = points.blockSize;

                for (i = 0; i < xvals.length - 1; i++) {
                    var psx1 = Math.round(xvals[i] * drawInfo.zoomFactX - drawInfo.offsetX);
                    var psx2 = Math.round(xvals[i + 1] * drawInfo.zoomFactX - drawInfo.offsetX);
                    var dens1 = 0;
                    for (var j = 0; j<2; j++) {
                        if (j==0) drawInfo.centerContext.fillStyle = 'rgb(192,100,100)';
                        if (j==1) drawInfo.centerContext.fillStyle = 'rgb(100,100,192)';
                        var dens2 = dens1 + yvals[i][0]/blockSize;
                        drawInfo.centerContext.fillRect(psx1, dens1*800, psx2 - psx1 + 1, dens2*800);
                        dens1 = dens2;
                    }
                }


//                var hasdata = false;
//                for (var compid in this.myComponents)
//                    if (this.myComponents[compid].isActive)
//                        hasdata = true;
//
//                if ( (drawInfo.needZoomIn) || (drawInfo.zoomFactX < this.minDrawZoomFactX) ) {
//                    if (!hasdata)
//                        this.drawMessage(drawInfo, "");
//                    else
//                        this.drawMessage(drawInfo, "Zoom in to see " + this.getTitle());
//                    return;
//                }
//                if (!hasdata) return;
//
//
//                drawInfo.centerContext.strokeStyle = "black";
//                this.PosMin = Math.round((-50 + drawInfo.offsetX) / drawInfo.zoomFactX);
//                this.PosMax = Math.round((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX);
//
//                var fetcherlist = this.getActiveDataFetchers();
//                var alldataready = true;
//                var fetcherror = false;
//                for (var fetchnr = 0; fetchnr < fetcherlist.length; fetchnr++) {
//                    if (!fetcherlist[fetchnr].IsDataReady(this.PosMin, this.PosMax, DataFetchers.RecordCountFetchType.NONE))
//                        alldataready = false;
//                    if (fetcherlist[fetchnr].hasFetchFailed)
//                        fetcherror = true;
//                }
//                if ((!alldataready) && (!fetcherror)) this.drawFetchBusyMessage(drawInfo);
//                if (fetcherror) this.drawFetchFailedMessage(drawInfo);
//
//                if (alldataready)
//                    var q = 0;
//
//                for (var levelnr = 0; levelnr < 2; levelnr++) {
//                    for (var compid in this.myComponents) {
//                        var comp = this.myComponents[compid];
//                        if ((comp.isActive) && (levelnr == comp.level)) {
//                            comp.draw(drawInfo, { PosMin: this.PosMin, PosMax: this.PosMax, rangemin: this._minVal, rangemax: this._maxVal });
//                        }
//                    }
//                }

                this.drawMark(drawInfo);
                this.drawTitle(drawInfo);
                this.drawXScale(drawInfo);
            }

            that.handleMouseClicked = function (px, py) {
            }

            that.getToolTipInfo = function (px, py) {
                return null;
            }

            //Returns the tooltip content for a given point. This function can be overridden to implement a specific behaviour
            that.getToolTipContent = function (compID, pointIndex) {
            }

            //Reacts on a click event on a point. This function can be overridden to implement a specific behaviour
            that.handlePointClicked = function (compID, pointIndex) {
            }


            return that;
        }




        return ChannelMultiCatDensity;
    });
