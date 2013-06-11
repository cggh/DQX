define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/ChannelPlot/ChannelCanvas", "DQX/DataFetcher/DataFetcherSnp2"],
    function ($, DocEl, Msg, ChannelCanvas, DataFetcherSnp) {
        var ChannelSnps = {};

        function warp(ps, center) {
            var range = 30;
            var dff = (ps - center) / range;
            if (dff < -2) dff = -2;
            if (dff > +2) dff = +2;
            var offs = Math.sin(dff * Math.PI / 2);
            return ps + 30 * offs;
        }

        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        // ChannelPlotChannelSnps: derives from ChannelPlotChannel
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////

        ChannelSnps.Channel = function (iid, imyDataFetcher) {
            var that = ChannelCanvas.Base(iid);
            that._height = 170;
            that.setTitle('Snps');

            that.myDataFetcher = new DataFetcherSnp.Fetcher(serverUrl);
            that.colorByParent = false;
            that.covRange = 0;
            that.useMagnifyingGlass = false;
            that.allowSmallBlocks = false;
            that.fillBlocks = false;
            that.hideFiltered = true;
            that.hoverSnp = -1;
            that.hoverSeqNr = -1;
            that.filter = DataFetcherSnp.SnpFilterData();
            that.rowHeight = 14; //height of a row containing a single sequence
            that.seqOffset = 0; //start nr of the top sequence in the view

            that.showHoverSnpInfo = false; //set to true to show a right bar with hover info


            that.setDataSource = function (dataid) {//call this to attach to a data source on the server
                this.myDataFetcher.setDataSource(dataid, function () {
                    if (that._CallBackFirstDataFetch) {
                        that._CallBackFirstDataFetch();
                        that._CallBackFirstDataFetch = null;
                    }
                    that.getMyPlotter().render();
                });
            }

            //Call this function to set a callback function that will be called the first time data was fetched from the server
            that.setCallBackFirstDataFetch = function (handler) {
                DQX.checkIsFunction(handler);
                that._CallBackFirstDataFetch = handler;
            }


            that.setPlotter = function (thePlotter) {
                thePlotter.addDataFetcher(this.myDataFetcher);
            }

            that.getRequiredRightWidth = function () {
                if (this.showHoverSnpInfo) return 80;
                else return 0;
            }

            that.needVScrollbar = function () { return true; }

            that.getSequenceDisplayName = function (seqID) {//can be overriden
                return seqID.replace(/__/g, " / ");
            }

            that.draw = function (drawInfo, args) {
                this.drawStandardGradientCenter(drawInfo, 1.1);
                this.drawStandardGradientLeft(drawInfo, 1.0);
                this.drawStandardGradientRight(drawInfo, 1.0);



                var sizeX = drawInfo.sizeCenterX;
                var sizeY = drawInfo.sizeY;
                var topSizeY = 50;


                this.PosMin = Math.round((-60 + drawInfo.offsetX) / drawInfo.zoomFactX);
                this.PosMax = Math.round((drawInfo.sizeCenterX + 60 + drawInfo.offsetX) / drawInfo.zoomFactX);

                var alldataready = true;
                var fetcherror = false;
                if (!that.myDataFetcher.IsDataReady(this.PosMin, this.PosMax, false))
                    alldataready = false;
                if (that.myDataFetcher.hasFetchFailed)
                    fetcherror = true;
                var data = this.myDataFetcher.getSnpInfoRange(this.PosMin, this.PosMax, this.filter, this.hideFiltered);
                if (!data.Present) return;
                this.data = data;
                var posits = data.posits;

                //Determine vertical size of bottom part with per SNP position graphs
                var graphSizeY = 20;
                $.each(this.myDataFetcher.getSnPositInfoList(), function (idx, info) {
                    if (info.Display)
                        graphSizeY += info.displaySizeY;
                });
                var bottomSize = graphSizeY;


                this.parentIDs = this.myDataFetcher.getParentIDs();
                this.mySeqIDs = this.myDataFetcher.getSequenceIDList();
                this.seqcount = this.mySeqIDs.length;

                var visiblecount = Math.round((this.getHeight() - topSizeY - bottomSize) / this.rowHeight);
                this.getVScroller().ScrollSize = Math.min(1, (visiblecount - 1) / this.seqcount); !!!
                this.getVScroller().draw();

                //calculate Y positions of sequences in the view
                this.seqPy = [];
                this.seqLy = [];
                for (var seqnr = 0; seqnr < this.mySeqIDs.length; seqnr++) {
                    this.seqPy.push(-1);
                    this.seqLy.push(-1);
                }
                var maxPosY = 0;
                for (var seqnr = this.seqOffset; seqnr < this.seqcount; seqnr++) {
                    var py = topSizeY + (seqnr - this.seqOffset) * this.rowHeight;
                    ly = this.rowHeight;
                    if (py + ly < this.getHeight() - bottomSize) {
                        this.seqPy[seqnr] = py;
                        this.seqLy[seqnr] = ly;
                        maxPosY = Math.max(maxPosY, py + ly);
                    }
                }
                bottomSize = this.getHeight() - maxPosY;

                //Calculate X positions of sequences in the view
                var positXCorrLeft = [], positXCorrRight = [], positXCorrCent = [], positXCorrLength = [], positXUnCorr = [];
                this.calcXPositions(drawInfo, positXCorrLeft, positXCorrRight, positXCorrCent, positXCorrLength, positXUnCorr);

                //determine if this can be displayed in the current zoom level
                if (posits.length > 100) {
                    var inviewcount = 0;
                    for (var i = 0; i < posits.length; i++)
                        if ((positXCorrCent[i] >= 0) && (positXCorrCent[i] <= sizeX))
                            inviewcount++;
                    if (inviewcount < 0.5 * posits.length) {
                        this.drawMessage(drawInfo, "SNP display channel: too much information to display.", "Please zoom in to see this channel");
                        return;
                    }
                }


                //draw connecting lines for visible snps
                drawInfo.centerContext.strokeStyle = "rgb(0,0,0)";
                drawInfo.centerContext.globalAlpha = 0.45;
                drawInfo.centerContext.beginPath();
                for (var i = 0; i < posits.length; i++) {
                    if ((positXCorrRight[i] >= -3) && (positXCorrLeft[i] <= sizeX + 3)) {
                        drawInfo.centerContext.moveTo(positXCorrCent[i] + 0.5, topSizeY);
                        drawInfo.centerContext.lineTo(positXUnCorr[i], 0);
                    }
                }
                drawInfo.centerContext.stroke();
                drawInfo.centerContext.globalAlpha = 1;
                //draw connecting lines for invisible snps
                drawInfo.centerContext.strokeStyle = "rgb(192,0,0)";
                drawInfo.centerContext.globalAlpha = 0.35;
                drawInfo.centerContext.beginPath();
                for (var i = 0; i < posits.length; i++) {
                    if ((positXCorrCent[i] < -3) || (positXCorrCent[i] > sizeX + 3)) {
                        drawInfo.centerContext.moveTo(positXCorrCent[i] + 0.5, topSizeY);
                        drawInfo.centerContext.lineTo(positXUnCorr[i], 0);
                    }
                }
                drawInfo.centerContext.stroke();
                drawInfo.centerContext.globalAlpha = 1;

                if (this.colorByParent && (this.parentIDs.length == 2)) {//determine parent states
                    var parentstates = [];
                    for (var pnr = 0; pnr < 2; pnr++) {
                        var GT = data.seqdata[this.parentIDs[pnr]].GT;
                        var pst = [];
                        for (var i = 0; i < posits.length; i++)
                            pst.push(GT[i]);
                        parentstates.push(pst);
                    }
                    var parentstate0 = parentstates[0];
                    var parentstate1 = parentstates[1];
                    var parentpresents = [];
                    var parentconc = []; //-1: discordant, 0=concordant ref 1=concordant alt 2=concordant alt2
                    for (var i = 0; i < posits.length; i++) {
                        parentpresents.push((parentstate0[i] != null) && (parentstate1[i] != null));
                        if (parentstate0[i] != parentstate1[i])
                            parentconc.push(-1);
                        else
                            parentconc.push(parentstate0[i]);
                    }
                }

                //Create the color lut
                var colors = [' rgb(0,0,255)', 'rgb(220,0,0)', 'rgb(0,150,150)'];
                var absentcolor = 'rgb(180,180,180)';
                var conformcolor1 = 'rgb(200,150,0)';
                var conformcolor2 = 'rgb(0,180,0)';
                var disconformcolor = 'rgb(0,0,0)';
                var conformcolorparent1 = 'rgb(0,0,240)';
                var conformcolorparent2 = 'rgb(240,0,0)';

                drawInfo.leftContext.fillStyle = "rgb(0,0,0)";
                drawInfo.leftContext.font = '11px sans-serif';
                drawInfo.leftContext.textBaseline = 'bottom';
                drawInfo.leftContext.textAlign = 'left';

                drawInfo.rightContext.fillStyle = "rgb(0,0,0)";
                drawInfo.rightContext.font = '11px sans-serif';
                drawInfo.rightContext.textBaseline = 'bottom';
                drawInfo.rightContext.textAlign = 'right';

                //Create alternating line background
                drawInfo.centerContext.fillStyle = "rgb(255,255,255)";
                drawInfo.centerContext.globalAlpha = 0.325;
                drawInfo.leftContext.fillStyle = "rgb(255,255,255)";
                drawInfo.leftContext.globalAlpha = 0.325;
                drawInfo.rightContext.fillStyle = "rgb(255,255,255)";
                drawInfo.rightContext.globalAlpha = 0.325;
                for (var seqnr = 0; seqnr < this.mySeqIDs.length; seqnr++) {
                    var py = this.seqPy[seqnr];
                    var ly = this.seqLy[seqnr];
                    if (ly > 0) {
                        if (seqnr % 2 == 0) {
                            drawInfo.centerContext.fillRect(0, py, sizeX, ly);
                            drawInfo.leftContext.fillRect(0, py, 150, ly);
                            drawInfo.rightContext.fillRect(0, py, 100, ly);
                        }
                    }
                }
                drawInfo.centerContext.globalAlpha = 1;
                drawInfo.leftContext.globalAlpha = 1;
                drawInfo.rightContext.globalAlpha = 1;
                drawInfo.rightContext.fillStyle = "rgb(0,0,0)";
                drawInfo.leftContext.fillStyle = "rgb(0,0,0)";
                drawInfo.centerContext.textAlign = 'left';

                var shl = +0.5;
                var shr = -0.25;

                if (posits.length > 250) {
                    shl = -0.25;
                    shr = 0.5;
                }

                //draw the snps
                var lastcolornr = -1;
                for (var seqnr = 0; seqnr < this.mySeqIDs.length; seqnr++) {
                    if (this.seqLy[seqnr] > 0) {
                        var py = this.seqPy[seqnr];
                        var ly = this.seqLy[seqnr];

                        var GT = data.seqdata[that.mySeqIDs[seqnr]].GT;
                        var DP = data.seqdata[that.mySeqIDs[seqnr]].DP;
                        //var pres = data.seqdata[that.mySeqIDs[seqnr]].pres;
                        for (var i = 0; i < posits.length; i++) {
                            if ((positXCorrCent[i] >= -40) && (positXCorrCent[i] <= sizeX + 40)) {
                                if (GT[i] != null) {
                                    var call = GT[i];
                                    var covtot = DP[i];

                                    if (this.colorByParent && (this.parentIDs.length == 2)) {//color by parents
                                        if (!parentpresents[i]) {
                                            colornr = 99;
                                            if (colornr != lastcolornr) {
                                                drawInfo.centerContext.fillStyle = absentcolor;
                                                lastcolornr = colornr;
                                            }
                                        }
                                        else {
                                            if (parentconc[i] >= 0) {
                                                if (call == parentstate0[i]) {
                                                    if (parentconc[i] == 0) {
                                                        colornr = 101;
                                                        //if (colornr != lastcolornr)
                                                        drawInfo.centerContext.fillStyle = conformcolor1;
                                                    }
                                                    else {
                                                        colornr = 102;
                                                        //if (colornr != lastcolornr)
                                                        drawInfo.centerContext.fillStyle = conformcolor2;
                                                    }
                                                }
                                                else {
                                                    colornr = 97;
                                                    //if (colornr != lastcolornr)
                                                    drawInfo.centerContext.fillStyle = disconformcolor;
                                                }
                                            }
                                            else {
                                                if (call == parentstate0[i]) {
                                                    colornr = 101;
                                                    //if (colornr != lastcolornr)
                                                    drawInfo.centerContext.fillStyle = conformcolorparent1;
                                                }
                                                else if (call == parentstate1[i]) {
                                                    colornr = 102;
                                                    //if (colornr != lastcolornr)
                                                    drawInfo.centerContext.fillStyle = conformcolorparent2;
                                                }
                                                else {
                                                    colornr = 97;
                                                    //if (colornr != lastcolornr)
                                                    drawInfo.centerContext.fillStyle = disconformcolor;
                                                }
                                            }
                                        }
                                        lastcolornr = colornr;
                                    }


                                    else {//non-parent coloring
                                        colornr = GT[i];
                                        if (colornr != lastcolornr) {
                                            drawInfo.centerContext.fillStyle = colors[colornr];
                                            lastcolornr = colornr;
                                        }
                                    }
                                    var h = 2 + Math.round((ly - 3) * Math.min(1.0, covtot / this.covRange));
                                    drawInfo.centerContext.fillRect(positXCorrLeft[i] + shl, py + ly - h, positXCorrLength[i] + shr, h);
                                }


                                else {//snp not present
                                    colornr = 99;
                                    if (colornr != lastcolornr) {
                                        drawInfo.centerContext.fillStyle = absentcolor;
                                        lastcolornr = colornr;
                                    }
                                    drawInfo.centerContext.fillRect(positXCorrLeft[i] + shl, py + 5, positXCorrLength[i] + shr, ly - 9);
                                }
                            }
                        }


                        //separating line between snps
                        drawInfo.centerContext.strokeStyle = "rgb(0,0,0)";
                        drawInfo.centerContext.globalAlpha = 0.15;
                        drawInfo.centerContext.beginPath();
                        drawInfo.centerContext.moveTo(0, py + ly + 0.5);
                        drawInfo.centerContext.lineTo(sizeX, py + ly + 0.5);
                        drawInfo.centerContext.stroke();
                        drawInfo.centerContext.globalAlpha = 1;

                        //show snp name on the left
                        drawInfo.leftContext.fillText(this.getSequenceDisplayName(this.mySeqIDs[seqnr]), 0, py + ly + 1);

                        if ((this.showHoverSnpInfo) && (this.hoverSnp >= 0)) {//show snp values on the right
                            drawInfo.rightContext.fillText(cov1[this.hoverSnp], 35, py + ly + 1);
                            drawInfo.rightContext.fillText(cov2[this.hoverSnp], 75, py + ly + 1);
                        }
                    }
                }



                if (true) {//show overlay for filtered snps
                    var isFiltered = data.isFiltered;
                    drawInfo.centerContext.fillStyle = "rgb(220,220,220)";
                    drawInfo.centerContext.globalAlpha = 0.65;
                    for (var i = 0; i < posits.length; i++) {
                        if ((positXCorrCent[i] >= -40) && (positXCorrCent[i] <= sizeX + 40)) {
                            if (isFiltered[i]) {
                                drawInfo.centerContext.fillRect(positXCorrLeft[i], topSizeY, positXCorrLength[i], sizeY - topSizeY - bottomSize);
                            }
                        }
                    }
                    drawInfo.centerContext.strokeStyle = "rgb(0,0,0)";
                    drawInfo.centerContext.globalAlpha = 0.15;
                    drawInfo.centerContext.beginPath();
                    for (var i = 0; i < posits.length; i++) {
                        if ((positXCorrCent[i] >= -40) && (positXCorrCent[i] <= sizeX + 40)) {
                            if (isFiltered[i]) {
                                var px = Math.round(positXCorrCent[i]) + 0.5;
                                drawInfo.centerContext.moveTo(px, topSizeY);
                                drawInfo.centerContext.lineTo(px, 0);
                            }
                        }
                    }
                    drawInfo.centerContext.stroke();
                    drawInfo.centerContext.globalAlpha = 1;
                    drawInfo.centerContext.strokeStyle = "rgb(150,0,0)";
                    drawInfo.centerContext.beginPath();
                    for (var i = 0; i < posits.length; i++) {
                        if ((positXCorrCent[i] >= -40) && (positXCorrCent[i] <= sizeX + 40)) {
                            if (isFiltered[i]) {
                                var len = Math.min(3, positXCorrLength[i]) + 0.5;
                                var centx = Math.round((positXCorrLeft[i] + positXCorrRight[i]) / 2.0) - len + 2;
                                drawInfo.centerContext.moveTo(centx, sizeY - bottomSize);
                                drawInfo.centerContext.lineTo(centx + len, sizeY - bottomSize + len);
                                drawInfo.centerContext.moveTo(centx + len, sizeY - bottomSize);
                                drawInfo.centerContext.lineTo(centx, sizeY - bottomSize + len);
                            }
                        }
                    }
                    drawInfo.centerContext.stroke();
                }


                //show snp ref+alt allele states
                if (((this.showHoverSnpInfo)) && (this.hoverSnp >= 0)) {
                    drawInfo.rightContext.fillText(data.SnpRefBase[this.hoverSnp], 35, topSizeY - 5);
                    drawInfo.rightContext.fillText(data.SnpAltBase[this.hoverSnp], 75, topSizeY - 5);
                    drawInfo.rightContext.globalAlpha = 0.28;
                    drawInfo.rightContext.fillStyle = "rgb(0,70,255)";
                    drawInfo.rightContext.fillRect(0, 0, 40, sizeY);
                    drawInfo.rightContext.fillStyle = "rgb(255,0,0)";
                    drawInfo.rightContext.fillRect(40, 0, 40, sizeY);
                    drawInfo.rightContext.globalAlpha = 1;
                }

                //show per-position graphics
                drawInfo.centerContext.fillStyle = DQX.Color(0.85, 0.85, 0.85).toString();
                drawInfo.centerContext.fillRect(0, maxPosY, sizeX, sizeY - maxPosY - 1);
                this.drawSnpPosInfo(drawInfo, maxPosY, graphSizeY);

                if (this.useMagnifyingGlass) {//Magnifying glass visual effect
                    if (this.hoverCenter >= 0) {
                        var backgrad = drawInfo.centerContext.createLinearGradient(this.hoverCenter - 70, 0, this.hoverCenter + 70, 0);
                        backgrad.addColorStop(0.0, "rgb(50,50,50)");
                        backgrad.addColorStop(0.45, "rgb(255,255,255)");
                        backgrad.addColorStop(0.7, "rgb(255,255,255)");
                        backgrad.addColorStop(1.0, "rgb(50,50,50)");
                        drawInfo.centerContext.fillStyle = backgrad; // "rgb(255,255,100)";
                        drawInfo.centerContext.globalAlpha = 0.28;
                        drawInfo.centerContext.fillRect(this.hoverCenter - 70, topSizeY, 140, sizeY - topSizeY);
                        drawInfo.centerContext.globalAlpha = 1;
                    }
                }


                if (/*(this.showHoverSnpInfo) &&*/(this.hoverSnp >= 0)) {//draw the outline for the hover snp in a higher contrast
                    drawInfo.centerContext.strokeStyle = "rgb(0,0,0)";
                    drawInfo.centerContext.beginPath();
                    drawInfo.centerContext.moveTo(positXCorrLeft[this.hoverSnp] + 0.5, topSizeY);
                    drawInfo.centerContext.lineTo(positXCorrLeft[this.hoverSnp] + 0.5, sizeY);
                    drawInfo.centerContext.moveTo(positXCorrRight[this.hoverSnp] + 0.5, topSizeY);
                    drawInfo.centerContext.lineTo(positXCorrRight[this.hoverSnp] + 0.5, sizeY);
                    drawInfo.centerContext.stroke();
                }

                if (this.hoverSeqNr >= 0) {//draw the outline of the highlight sequence in higher contrast
                    var py1 = this.seqPy[this.hoverSeqNr] + 0.5;
                    var py2 = this.seqPy[this.hoverSeqNr] + this.seqLy[this.hoverSeqNr] + 0.5;
                    drawInfo.centerContext.strokeStyle = "rgb(0,0,0)";
                    drawInfo.leftContext.strokeStyle = "rgb(0,0,0)";
                    drawInfo.rightContext.strokeStyle = "rgb(0,0,0)";
                    drawInfo.centerContext.beginPath();
                    drawInfo.centerContext.moveTo(0, py1); drawInfo.centerContext.lineTo(sizeX, py1);
                    drawInfo.centerContext.moveTo(0, py2); drawInfo.centerContext.lineTo(sizeX, py2);
                    drawInfo.centerContext.stroke();
                    drawInfo.leftContext.beginPath();
                    drawInfo.leftContext.moveTo(0, py1); drawInfo.leftContext.lineTo(sizeX, py1);
                    drawInfo.leftContext.moveTo(0, py2); drawInfo.leftContext.lineTo(sizeX, py2);
                    drawInfo.leftContext.stroke();
                    drawInfo.rightContext.beginPath();
                    drawInfo.rightContext.moveTo(0, py1); drawInfo.rightContext.lineTo(sizeX, py1);
                    drawInfo.rightContext.moveTo(0, py2); drawInfo.rightContext.lineTo(sizeX, py2);
                    drawInfo.rightContext.stroke();
                }

                this.drawMark(drawInfo);

                if (!alldataready) {
                    drawInfo.centerContext.fillStyle = "rgb(0,192,0)";
                    drawInfo.centerContext.font = '25px sans-serif';
                    drawInfo.centerContext.textBaseline = 'bottom';
                    drawInfo.centerContext.textAlign = 'center';
                    drawInfo.centerContext.fillText("Fetching data...", drawInfo.sizeCenterX / 2, 0 + 30);
                }
                if (fetcherror) {
                    drawInfo.centerContext.fillStyle = "rgb(255,0,0)";
                    drawInfo.centerContext.font = '25px sans-serif';
                    drawInfo.centerContext.textBaseline = 'bottom';
                    drawInfo.centerContext.textAlign = 'center';
                    drawInfo.centerContext.fillText("Fetch failed!", drawInfo.sizeCenterX / 2, 0 + 60);
                }

            }

            that.scrollTo = function (newscrollpos) {
                this.seqOffset = Math.round(newscrollpos * this.seqcount);
                this.getMyPlotter().render();
            }

            that.calcXPositions = function (drawInfo, positXCorrLeft, positXCorrRight, positXCorrCent, positXCorrLength, positXUnCorr) {
                var data = this.data;
                var posits = data.posits;
                var sizeX = drawInfo.sizeCenterX;

                var minsize = 1;
                if (this.allowSmallBlocks)
                    minsize = 0.15;

                for (var i = 0; i < posits.length; i++) {
                    if ((i > 0) && (posits[i] < posits[i - 1]))
                        throw 'Invalid position'
                    positXUnCorr.push(posits[i] * drawInfo.zoomFactX - drawInfo.offsetX);
                    positXCorrCent.push(Math.round(positXUnCorr[i]));
                }

                if (!this.fillBlocks) {
                    //Calculating positions & corrected positions
                    for (cf = 0.1; cf <= 1; cf += 0.1) {

                        var psxlast = -1000;
                        for (var i = 0; i < posits.length; i++) {
                            if (positXCorrCent[i] < psxlast + cf * minsize)
                                positXCorrCent[i] = psxlast + cf * minsize;
                            psxlast = positXCorrCent[i];
                        }
                        cf += 0.1;
                        var psxlast = 100000000;
                        for (var i = posits.length - 1; i >= 0; i--) {
                            if (positXCorrCent[i] > psxlast - cf * minsize)
                                positXCorrCent[i] = psxlast - cf * minsize;
                            psxlast = positXCorrCent[i];
                        }
                    }
                    var psxlast = -1000;
                    for (var i = 0; i < posits.length; i++) {
                        positXCorrCent[i] = Math.round(positXCorrCent[i]);
                        if (positXCorrCent[i] < psxlast + minsize)
                            positXCorrCent[i] = psxlast + minsize;
                        psxlast = positXCorrCent[i];
                    }
                    var hdesiredsize = 4;
                    for (var i = 0; i < posits.length; i++) {
                        positXCorrLeft.push(positXCorrCent[i] - hdesiredsize);
                        if (i > 0) {
                            if (positXCorrLeft[i] < positXCorrRight[i - 1]) {
                                var halfway = Math.round((positXCorrLeft[i] + positXCorrRight[i - 1]) / 2.0);
                                positXCorrRight[i - 1] = halfway;
                                positXCorrLeft[i] = halfway;
                            }
                        }
                        positXCorrRight.push(positXCorrCent[i] + hdesiredsize);
                    }
                }
                else {//calculating fixed block size & position
                    var firstPos = 0;
                    while (positXUnCorr[firstPos] < 0) firstPos += 1;
                    var lastPos = posits.length-1;
                    while (positXUnCorr[lastPos] > sizeX) lastPos -= 1;
                    var size = (positXUnCorr[lastPos - 1] - positXUnCorr[firstPos]) / (lastPos - firstPos);
                    if (size < minsize) size = minsize;
                    //first pass: use all snps to determine shift
                    var shift = 0;
                    /*                    for (var i = 0; i < posits.length; i++)
                    shift += positXUnCorr[i] - i * size;
                    shift = Math.round(shift / posits.length);*/
                    for (var i = 0; i < posits.length; i++)
                        positXCorrCent[i] = (i - firstPos) * size + shift ;
                    //second pass: use what's in view to determine shift
                    var shift = 0;
/*                    for (var i = 0; i < posits.length; i++)
                        if ((positXCorrCent[i] >= 0) && (positXCorrCent[i] <= sizeX))
                            shift += positXUnCorr[i] - i * size;
                    shift = Math.round(shift / posits.length);*/
                    for (var i = 0; i < posits.length; i++) {
                        positXCorrCent[i] = (i-firstPos) * size + shift+ positXUnCorr[firstPos];
                        positXCorrLeft.push(positXCorrCent[i] - size / 2);
                        positXCorrRight.push(positXCorrCent[i] + size / 2);
                    }
                }

                this._psxcorr1 = positXCorrLeft;
                this._psxcorr2 = positXCorrRight;

                if (this.useMagnifyingGlass) {//Apply Magnifying glass distortion
                    if (this.hoverCenter >= 0) {
                        var centerpos = this.hoverCenter;
                        for (var i = 0; i < posits.length; i++) {
                            positXCorrLeft[i] = warp(positXCorrLeft[i], centerpos);
                            positXCorrRight[i] = warp(positXCorrRight[i], centerpos);
                            if (positXCorrRight[i] < positXCorrLeft[i]) {
                                positXCorrLeft[i] = (positXCorrLeft[i] + positXCorrRight[i]) / 2.0;
                                positXCorrRight[i] = positXCorrLeft[i];
                            }
                        }
                    }
                }

                //final: calculate dimensions & center position
                for (var i = 0; i < posits.length; i++) {
                    positXCorrLength.push(positXCorrRight[i] - positXCorrLeft[i]);
                    positXCorrCent[i] = Math.round((positXCorrLeft[i] + positXCorrRight[i]) / 2);
                }
            }

            that.drawSnpPosInfo = function (drawInfo, graphOffsetY, graphSizeY) {
                var sizeX = drawInfo.sizeCenterX;
                var data = this.data;
                var posits = data.posits;
                var positXCorrLeft = this._psxcorr1;
                var positXCorrRight = this._psxcorr2;

                drawInfo.leftContext.font = '11 sans-serif';
                drawInfo.leftContext.textBaseline = 'bottom';
                drawInfo.leftContext.textAlign = 'left';

                //indicate structural variations
                var posY = graphOffsetY + 1;
                var channelSizeY = 18;
                for (var i = 0; i < posits.length; i++) {
                    if ((positXCorrRight[i] >= -40) && (positXCorrLeft[i] <= sizeX + 40)) {
                        var refBase = data.SnpRefBase[i];
                        var altBase = data.SnpAltBase[i];
                        var showIndication = false;
                        if ((refBase != '+') && (altBase == '+')) { showIndication = true; drawInfo.centerContext.fillStyle = DQX.Color(1, 0, 0).toString(); }
                        if ((refBase == '+') && (altBase != '+')) { showIndication = true; drawInfo.centerContext.fillStyle = DQX.Color(0, 0.7, 0).toString(); }
                        if ((refBase == '+') && (altBase == '+')) { showIndication = true; drawInfo.centerContext.fillStyle = DQX.Color(0, 0, 1).toString(); }
                        if (showIndication)
                            drawInfo.centerContext.fillRect(positXCorrLeft[i] + 0.5, posY + 5, positXCorrRight[i] - positXCorrLeft[i] - 0.25, 10);
                    }
                }
                drawInfo.centerContext.fillStyle = "rgb(80,80,80)";
                drawInfo.centerContext.fillRect(0, graphOffsetY, drawInfo.sizeCenterX, 2);
                drawInfo.leftContext.fillStyle = "rgb(80,80,80)";
                drawInfo.leftContext.fillRect(0, graphOffsetY, drawInfo.sizeLeftX, 2);
                drawInfo.leftContext.fillStyle = "black";
                drawInfo.leftContext.fillText("Variant type", 2, posY + channelSizeY / 2 + 7);
                posY += channelSizeY;


                var self = this;
                $.each(this.myDataFetcher.getSnPositInfoList(), function (idx, info) {
                    if (info.Display) {
                        var channelSizeY = info.displaySizeY;
                        var backgrad = drawInfo.centerContext.createLinearGradient(0, posY, 0, posY + channelSizeY);
                        backgrad.addColorStop(0.0, "rgb(250,250,250)"); backgrad.addColorStop(1.0, "rgb(190,190,190)");
                        drawInfo.centerContext.fillStyle = backgrad;
                        drawInfo.centerContext.fillRect(0, posY, drawInfo.sizeCenterX, channelSizeY);
                        var backgrad = drawInfo.leftContext.createLinearGradient(0, posY, 0, posY + channelSizeY);
                        backgrad.addColorStop(0.0, "rgb(220,220,220)"); backgrad.addColorStop(1.0, "rgb(170,170,170)");
                        drawInfo.leftContext.fillStyle = backgrad;
                        drawInfo.leftContext.fillRect(0, posY, drawInfo.sizeLeftX, channelSizeY);
                        var vals = self.data.getSnpInfo(info.ID); //!!!todo: make this a generic factory based handler that can handle other data types than vaules
                        var maxval = info.Max;
                        drawInfo.centerContext.fillStyle = DQX.Color(0.4, 0.4, 0.4).toString();
                        for (var i = 0; i < posits.length; i++) {
                            if ((positXCorrRight[i] >= -40) && (positXCorrLeft[i] <= sizeX + 40)) {
                                var vly = vals[i] / maxval;
                                if (vly > 1) vly = 1;
                                vly *= 0.8 * channelSizeY;
                                drawInfo.centerContext.fillRect(positXCorrLeft[i] + 0.5, posY + channelSizeY - vly, positXCorrRight[i] - positXCorrLeft[i] - 0.25, vly);
                            }
                        }
                        drawInfo.centerContext.fillStyle = "rgb(120,120,120)";
                        drawInfo.centerContext.fillRect(0, posY, drawInfo.sizeCenterX, 1);
                        drawInfo.centerContext.fillRect(0, posY + channelSizeY, drawInfo.sizeCenterX, 1);
                        drawInfo.leftContext.fillStyle = "rgb(120,120,120)";
                        drawInfo.leftContext.fillRect(0, posY, drawInfo.sizeLeftX, 1);
                        drawInfo.leftContext.fillRect(0, posY + channelSizeY, drawInfo.sizeLeftX, 1);
                        drawInfo.leftContext.globalAlpha = 1.0;
                        drawInfo.leftContext.fillStyle = "black";
                        drawInfo.leftContext.fillText(info.Name, 2, posY + channelSizeY / 2 + 5);
                        posY += channelSizeY;
                    }
                });

            }

            that.xyToSnpSeq = function (xp, yp) {
                var ret = { snp: -1, seq: -1 };
                if (!this._psxcorr1) return ret;
                for (var i = 0; i < this._psxcorr1.length; i++)
                    if ((xp >= this._psxcorr1[i]) && (xp <= this._psxcorr2[i]))
                        ret.snp = i;
                for (var i = 0; i < this.mySeqIDs.length; i++)
                    if ((yp >= this.seqPy[i]) && (yp <= this.seqPy[i] + this.seqLy[i]))
                        ret.seq = i;
                return ret;
            }

            that.handleMouseClicked = function (px, py) {
                var snpseq = this.xyToSnpSeq(px, py);
                this.hoverSnp = snpseq.snp;
                this.createSnpInfo();
                var seq = this.mySeqIDs[snpseq.seq];
                Msg.broadcast({ type: 'SnpClicked', id: this.getID() }, { seq: seq, snp: this.hoverSnpInfo, chrom: this.getMyPlotter().getCurrentChromoID() });
            }

            that.onHoverOverChannel = function (xp, yp) {
                if (!this._psxcorr1) return;
                this.hoverCenter = xp;
                var snpseq = this.xyToSnpSeq(xp, yp);
                var needredraw = false;

                if (snpseq.snp != this.hoverSnp) {
                    this.hoverSnp = snpseq.snp;
                    needredraw = true;
                }
                if (snpseq.seq != this.hoverSeqNr) {
                    this.hoverSeqNr = snpseq.seq;
                    needredraw = true;
                }
                if (needredraw) this.createSnpInfo();
                if (this.useMagnifyingGlass) needredraw = true;
                if (needredraw)
                    this.getMyPlotter().render();
            }

            that.onStopHoverOverChannel = function () {
                this.hoverCenter = -1;
                var needredraw = false;
                if (this.hoverSnp >= 0) {
                    this.hoverSnp = -1;
                    needredraw = true;
                }
                if (this.hoverSeqNr >= 0) {
                    this.hoverSeqNr = -1;
                    needredraw = true;
                }
                if (needredraw) this.createSnpInfo();
                if (this.useMagnifyingGlass) needredraw = true;
                if (needredraw)
                    this.getMyPlotter().render();
            }

            that.createSnpInfo = function () {
                var infostr = '';
                var snp_info = {};
                if (this.hoverSnp >= 0) {
                    infostr = 'SNP info<br/>';
                    infostr += 'Position: ' + this.data.posits[this.hoverSnp] + '<br/>';
                    snp_info.position = this.data.posits[this.hoverSnp];
                    var self = this;
                    $.each(this.myDataFetcher.getSnPositInfoList(), function (idx, info) {
                        var vl = self.data.getSnpInfo(info.ID)[self.hoverSnp];
                        if (info.DataType == 'Value') vl = vl.toFixed(3); //!!!a hack that needs to be resolved
                        infostr += info.Name + '= ';
                        infostr += vl;
                        infostr += '<br/>';
                        snp_info[info.Name] = vl;
                    });
                    //show filters that were applied to this snp
                    infostr += '<b>Applied filters</b><br/>';
                    var filterFlagList = self.data.getSnpInfo('FilterFlags')[self.hoverSnp];
                    $.each(filterFlagList, function (idx, flag) {
                        if (flag)
                            infostr += self.myDataFetcher._filters[idx] + '<br>';
                    });
                    this.hoverSnpInfo = snp_info;
                }
                Msg.broadcast({ type: 'SnpInfoChanged', id: this.getID() }, infostr);
            }

            that.sortByParents = function () {
                if (this.parentIDs.length != 2) return;
                var seqdata = [];
                data = this.data;
                for (var seqnr = 0; seqnr < this.mySeqIDs.length; seqnr++) {
                    var snplst = [];
                    var GT = data.seqdata[this.mySeqIDs[seqnr]].GT;
                    for (var i = 0; i < data.posits.length; i++) {
                        snplst.push(GT[i]);
                    }
                    seqdata.push(snplst);
                    if (this.mySeqIDs[seqnr] == this.parentIDs[0])
                        var parent1data = snplst;
                    if (this.mySeqIDs[seqnr] == this.parentIDs[1])
                        var parent2data = snplst;
                }

                //calculate distances
                var seqdists = [];
                for (var seqnr = 0; seqnr < this.mySeqIDs.length; seqnr++) {
                    var dst1 = 0;
                    var dst2 = 0;
                    for (var i = 0; i < data.posits.length; i++) {
                        dst1 += Math.abs(seqdata[seqnr][i] - parent1data[i]);
                        dst2 += Math.abs(seqdata[seqnr][i] - parent2data[i]);
                    }
                    var dst = 1 / (0.1 + dst2) - 1 / (0.1 + dst1);
                    if (this.mySeqIDs[seqnr] == this.parentIDs[0])
                        dst = -1.0E99;
                    if (this.mySeqIDs[seqnr] == this.parentIDs[1])
                        dst = +1.0E99;
                    seqdists.push(dst);
                }
                var sortarray = [];
                for (var seqnr = 0; seqnr < this.mySeqIDs.length; seqnr++)
                    sortarray.push({ vl: seqdists[seqnr], obj: this.mySeqIDs[seqnr] });
                sortarray.sort(function (x, y) { return x.vl - y.vl; });
                this.mySeqIDs = [];
                for (var seqnr = 0; seqnr < sortarray.length; seqnr++)
                    this.mySeqIDs.push(sortarray[seqnr].obj);
                this.myDataFetcher._sequenceIDList = this.mySeqIDs;
                this.getMyPlotter().render();
            }

            that.setCoverageRange = function (newrange) {
                this.covRange = Math.max(1, newrange);
                this.getMyPlotter().render();
            }

            that.setMinPresence = function (newval) {
                this.filter.minPresence = newval;
                this.getMyPlotter().render();
            }

            that.setMinSnpCoverage = function (newval) {
                this.filter.minSnpCoverage = Math.round(newval);
                this.getMyPlotter().render();
            }

            return that;
        }

        return ChannelSnps;
    });
