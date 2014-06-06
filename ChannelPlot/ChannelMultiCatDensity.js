# This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

/************************************************************************************************************************************
 *************************************************************************************************************************************



 *************************************************************************************************************************************
 *************************************************************************************************************************************/


define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/Controls", "DQX/ChannelPlot/ChannelCanvas", "DQX/DataFetcher/DataFetchers"],
    function ($, DocEl, Msg, Controls, ChannelCanvas, DataFetchers) {
        var ChannelMultiCatDensity = {};



        ChannelMultiCatDensity.Channel = function (id, ifetcher, icol, args) {
            var that = ChannelCanvas.Base(id);
            that._height = 120;
            that.myfetcher = ifetcher;
            that._minVal = 0;
            that._maxVal = 1;
            that._categoryColors = {};
            that._scaleRelative = false;
            that._canChangeYScaleTop = true;
            that._canChangeYScaleBottom = false;

            that.mycol = icol;

            if (args.categoryColors)
                that._categoryColors = args.categoryColors;
            if (args.maxVal)
                that._maxVal = args.maxVal;
            that.minDrawZoomFactX = 0; //if the zoom factor drops below this point, the channel isn't drawn anymore



            that.setChangeYScale = function (canChangeMinVal, canChangeMaxVal) {
                that._canChangeYScaleBottom = canChangeMinVal;
                that._canChangeYScaleTop = canChangeMaxVal;
                return that;
            }

            that.getActiveDataFetchers = function () {
                return [this.myfetcher];
            }

            that.setPlotter = function (thePlotter) {
                thePlotter.addDataFetcher(this.myfetcher);
            }


            var parent_postCreateHtml = $.proxy(that.postCreateHtml, that);
            that.postCreateHtml = function () {
                parent_postCreateHtml();

                $('#' + this.getCanvasID('left')).mousedown($.proxy(that._onMouseDownLeft, that));
                $('#' + this.getCanvasID('left')).mousemove($.proxy(that._onMouseMoveLeft, that));
            }


            /////////////////// Event handlers for left panel ///////////////////////////


            that._onMouseMoveLeft = function (ev) {
                var px = this.getEventPosX(ev);
                var py = this.getEventPosY(ev);
                if ( (!that._scaleRelative) && ((this._canChangeYScaleTop) || (this._canChangeYScaleBottom)) ) {
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

                if ( (!that._scaleRelative) && (!this._draggingYScaleTop) && (!this._draggingYScaleBottom) && (this._onClickHandler)) {
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

                if (!that._scaleRelative) {
                    that.drawVertScale(drawInfo, that._minVal, that._maxVal,  {offsetFrac:0.07, rangeFrac:0.86});
                    var psy_fact = 1.0 / (that._maxVal - that._minVal) * drawInfo.sizeY * 0.86;
                    var psy_offset = drawInfo.sizeY - drawInfo.sizeY * 0.07 + that._minVal * psy_fact;
                }
                else
                {
                    that.drawVertScale(drawInfo, 0, 100, {offsetFrac:0.07, rangeFrac:0.86});
                    var psy_fact = 1.0 / (100.0) * drawInfo.sizeY * 0.9;
                    var psy_offset = drawInfo.sizeY - drawInfo.sizeY * 0.05;
                }



                var PosMin = Math.round((-50 + drawInfo.offsetX) / drawInfo.zoomFactX);
                var PosMax = Math.round((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX);

                if (!that.myfetcher.IsDataReady(PosMin, PosMax))
                    alldataready = false;
                if (that.myfetcher.hasFetchFailed)
                    fetcherror = true;


                var points = this.myfetcher.getColumnPoints(PosMin, PosMax, that.mycol.myID);
                var xvals = points.xVals;
                var yvals = points.YVals;
                var blockSize = points.blockSize;


                var categories = null;
                if (that.myfetcher._propertySummerariserInfo)
                    if (that.myfetcher._propertySummerariserInfo[that.mycol.myID])
                        categories = that.myfetcher._propertySummerariserInfo[that.mycol.myID].Categories;

                if (categories) {
                    categoryColors = [];
                    for (var j = 0; j<categories.length; j++) {
                        var cl = that._categoryColors[categories[j]];
                        if (!cl)
                            cl = DQX.Color(0.75, 0.75, 0.75).toStringCanvas();
                        categoryColors.push(cl);
                    }

                    for (var i = 0; i < xvals.length; i++) {
                        var psx1 = Math.round((xvals[i]-blockSize/2) * drawInfo.zoomFactX - drawInfo.offsetX);
                        var psx2 = Math.round((xvals[i]+blockSize/2) * drawInfo.zoomFactX - drawInfo.offsetX);
                        var totDens = 0;
                        $.each(yvals[i], function(idx, vl) { totDens += vl});
                        if (totDens>0) {
                            totDens /= blockSize;
                            if (!totDens)
                                totDens =1;
                            var dens1 = 0;
                            var yp1 = psy_offset;
                            for (var j = 0; j<categories.length; j++) {
                                drawInfo.centerContext.fillStyle = categoryColors[j];
                                var blockcount = yvals[i][j];
                                var dens2 = dens1 + blockcount/blockSize;
                                if (!that._scaleRelative)
                                    var yp2 = psy_offset-dens2*psy_fact;
                                else
                                    var yp2 = psy_offset-dens2/totDens*100*psy_fact;
                                drawInfo.centerContext.fillRect(
                                    psx1,
                                    yp1,
                                    psx2 - psx1 + 1,
                                    yp2-yp1
                                );
                                dens1 = dens2;yp1 = yp2;
                            }
                        }

                    }
                    drawInfo.leftContext.textBaseline = 'top';
                    drawInfo.leftContext.textAlign = 'left';
                    drawInfo.leftContext.font = '10px sans-serif';
                    drawInfo.leftContext.fillStyle = "rgba(0,0,0,0.5)";
                    drawInfo.leftContext.fillText(blockSize.toString()+'bp', 1, 1);
                }


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
