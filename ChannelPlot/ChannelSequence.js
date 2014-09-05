// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

﻿/************************************************************************************************************************************
*************************************************************************************************************************************



*************************************************************************************************************************************
*************************************************************************************************************************************/

define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/ChannelPlot/ChannelCanvas", "DQX/DataFetcher/DataFetcherSummary"],
    function ($, DocEl, Msg, ChannelCanvas, DataFetcherSummary) {
        var ChannelSequence = {};

        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        // ChannelPlotChannelSequence: derives from ChannelPlotChannel, and plots a horizontal scale
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////

        ChannelSequence.Channel = function (
                serverurl,             //location of the DQXServer
                iFolder,               //Folder containing the summarised sequence data, relative to toe DQXServer base path
                iConfig,               //Summary configuration name
                useLowerCase           //True if bases are defined as lower case
            ) {
            var that = ChannelCanvas.Base("Sequence");
            that._height = 17;
            that.myFolder = iFolder;
            that.myConfig = iConfig;
            //that.canHide = false;
            that.setTitle('Sequence');

            that.baseList = ['A', 'T', 'C', 'G'];
            that.colors = { A: 'rgb(255,50,50)', T: 'rgb(255,170,0)', C: 'rgb(0,128,192)', G: 'rgb(0,192,120)' }
            if (useLowerCase) {
                that.baseList = ['a', 't', 'c', 'g'];
                that.colors = { a: 'rgb(255,50,50)', t: 'rgb(255,170,0)', c: 'rgb(0,128,192)', g: 'rgb(0,192,120)' }
            }

            that.myfetcher = new DataFetcherSummary.Fetcher(serverurl, 1, 800);
            //that.myfetcher.maxBlockSize = 1;
            that.mycol = that.myfetcher.addFetchColumn(that.myFolder, that.myConfig, "Base_avg", DQX.Color(1, 0, 0));
            that.myfetcher.activateFetchColumn(that.mycol.myID);

            that.setPlotter = function (thePlotter) {
                thePlotter.addDataFetcher(this.myfetcher);
            }

            that.drawTitle = function (drawInfo) {
                drawInfo.leftContext.save();
                drawInfo.leftContext.translate(2, drawInfo.sizeY / 2 - 3);
                drawInfo.leftContext.textAlign = "left";
                drawInfo.leftContext.textBaseline = 'baseline';
                drawInfo.leftContext.font = '11px sans-serif';

                var xp = 5;
                for (var basenr = 0; basenr < 4; basenr++) {
                    var base = this.baseList[basenr];
                    drawInfo.leftContext.fillStyle = this.colors[base];
                    drawInfo.leftContext.fillRect(xp, -2, 5, 9);
                    drawInfo.leftContext.fillStyle = "black";
                    drawInfo.leftContext.fillText(base, xp + 7, 5);
                    xp += 20;
                }

                drawInfo.leftContext.restore();
            }

            that.draw = function (drawInfo, args) {
                var PosMin = Math.round((-50 + drawInfo.offsetX) / drawInfo.zoomFactX);
                var PosMax = Math.round((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX);
                this.drawStandardGradientCenter(drawInfo, 0.85);
                this.drawStandardGradientLeft(drawInfo, 0.85);

                var alldataready = true;
                var fetcherror = false;
                if (!that.myfetcher.IsDataReady(PosMin, PosMax))
                    alldataready = false;
                if (that.myfetcher.hasFetchFailed)
                    fetcherror = true;

                var points = this.myfetcher.getColumnPoints(PosMin, PosMax, this.mycol.myID);
                var xvals = points.xVals;
                var yvals = points.YVals;

                var blockwidth = (xvals[xvals.length - 1] - xvals[0]) * drawInfo.zoomFactX / (xvals.length);


                if (xvals.length > 3000)
                    return;

                var h = 16;
                if (('extraInfo' in points) && (points.extraInfo.blockSize > 1)) {
                    //drawInfo.centerContext.fillStyle = 'rgb(192,192,192)';
                    //drawInfo.centerContext.fillRect(0, 10, drawInfo.sizeCenterX, 6);
                    h = 10;
                }

                //drawInfo.centerContext.fillStyle = 'rgb(128,128,128)';
                //drawInfo.centerContext.fillRect(0, 0, drawInfo.sizeCenterX, h);

                if (points.isOptimalResolution) {
                    drawInfo.centerContext.globalAlpha = 0.75;
                    if (blockwidth <= 2) {
                        for (var basenr = 0; basenr < 4; basenr++) {
                            var base = this.baseList[basenr];
                            drawInfo.centerContext.strokeStyle = this.colors[base];
                            drawInfo.centerContext.beginPath();
                            for (i = 0; i < xvals.length - 1; i++) {
                                if (yvals[i] == base) {
                                    var psx1 = xvals[i+1] * drawInfo.zoomFactX - drawInfo.offsetX;
                                    var psx2 = xvals[i + 2] * drawInfo.zoomFactX - drawInfo.offsetX;
                                    drawInfo.centerContext.moveTo(psx1, 0);
                                    drawInfo.centerContext.lineTo(psx1, 0 + h);
                                    if (psx2 > psx1 + 1) {
                                        drawInfo.centerContext.moveTo(psx1 + 1, 0);
                                        drawInfo.centerContext.lineTo(psx1 + 1, 0 + h);
                                    }
                                }
                            }
                            drawInfo.centerContext.stroke();
                        }
                    }
                    else {
                        for (i = 0; i < xvals.length - 1; i++) {
                            var base = yvals[i];
                            var psx1 = Math.round(xvals[i+1] * drawInfo.zoomFactX - drawInfo.offsetX);
                            var psx2 = Math.round(xvals[i + 2] * drawInfo.zoomFactX - drawInfo.offsetX);
                            var ofs = 0;
                            if (base in this.colors) {
                                drawInfo.centerContext.fillStyle = this.colors[base];
                                drawInfo.centerContext.fillRect(psx1, 0, psx2 - psx1 + 1, h);
                            }
                        }
                    }
                    if (blockwidth>3) {
                        var bwd = 1;
                        if (blockwidth>6)
                            bwd = 2;
                        drawInfo.centerContext.fillStyle = "rgba(255,255,255,0.75)";
                        for (i = 0; i < xvals.length - 1; i++) {
                            var psx1 = Math.round(xvals[i+1] * drawInfo.zoomFactX - drawInfo.offsetX);
                            var psx2 = Math.round(xvals[i + 2] * drawInfo.zoomFactX - drawInfo.offsetX);
                            drawInfo.centerContext.fillRect(psx1-bwd/2, 0, bwd, h);
                        }
                    }
                    if (blockwidth > drawInfo.centerContext.measureText('G').width) {
                      drawInfo.centerContext.save();
                      drawInfo.centerContext.textAlign = "center";
                      drawInfo.centerContext.textBaseline = 'middle';
                      drawInfo.centerContext.font = '11px sans-serif';
                      drawInfo.centerContext.fillStyle = "black";
                      for (i = 0; i < xvals.length - 1; i++) {
                        var psx1 = Math.round(xvals[i+1] * drawInfo.zoomFactX - drawInfo.offsetX);
                        var psx2 = Math.round(xvals[i + 2] * drawInfo.zoomFactX - drawInfo.offsetX);
                        var base = yvals[i];
                        drawInfo.centerContext.fillText(base, (psx1+psx2)/2, h/2);
                      }
                      drawInfo.centerContext.restore();
                    }
                    drawInfo.centerContext.globalAlpha = 1;
                }

                if ((!alldataready) && (!fetcherror)) this.drawFetchBusyMessage(drawInfo);
                if (fetcherror) this.drawFetchFailedMessage(drawInfo);

                this.drawMark(drawInfo);
                this.drawTitle(drawInfo);

            }
            return that;
        }

        return ChannelSequence;
    });
