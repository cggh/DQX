define([DQXSCJQ(), DQXSC("DocEl"), DQXSC("Msg"), DQXSC("ChannelPlot/ChannelCanvas"), DQXSC("DataFetcher/DataFetcherSnp")],
    function ($, DocEl, Msg, ChannelCanvas, DataFetcherSnp) {
        var ChannelSnps = {};

        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        // ChannelPlotChannelSnps: derives from ChannelPlotChannel
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////

        ChannelSnps.Channel = function (iid, isamples, imyDataFetcher) {
            var that = ChannelCanvas.Base(iid);
            that._height = 170;
            that.setTitle('Snps');

            that.myDataFetcher = imyDataFetcher;
            that.mySeqIDs = isamples;
            that.allowScaleOverlay = false;
            that.colorByParent = false;
            that.covRange = 10;
            that.useMagnifyingGlass = false;
            that.allowSmallBlocks = false;
            that.fillBlocks = false;
            that.hideFiltered = false;
            that.hoverSnp = -1;
            that.hoverSeqNr = -1;
            that.filter = DataFetcherSnp.SnpFilterData();
            that.rowHeight = 11;
            that.seqOffset = 0; //start nr of the top sequence in the view



            that.setPlotter = function (thePlotter) {
                //thePlotter.addDataFetcher(this.myfetcher);
            }

            that.getRequiredRightWidth = function () { return 80; }

            that.needVScrollbar = function () { return true; }


            that.draw = function (drawInfo, args) {
                this.drawStandardGradientCenter(drawInfo, 1.1);
                this.drawStandardGradientLeft(drawInfo, 1.0);
                this.drawStandardGradientRight(drawInfo, 1.0);



                var sizeX = drawInfo.sizeCenterX;
                var sizeY = drawInfo.sizeY;

                var topSizeY = 50;
                var graphSizeY = 50;
                var bottomSize = 50;
                this.graphSizeY = graphSizeY;
                this.bottomSize = bottomSize;

                this.PosMin = Math.round((-60 + drawInfo.offsetX) / drawInfo.zoomFactX);
                this.PosMax = Math.round((drawInfo.sizeCenterX + 60 + drawInfo.offsetX) / drawInfo.zoomFactX);

                var alldataready = true;
                var fetcherror = false;
                if (!that.myDataFetcher.IsDataReady(this.PosMin, this.PosMax, false))
                    alldataready = false;
                if (that.myDataFetcher.hasFetchFailed)
                    fetcherror = true;
                var data = this.myDataFetcher.getSnpInfoRange(this.PosMin, this.PosMax, this.filter, this.hideFiltered);
                this.data = data;
                var posits = data.posits;

                this.parentIDs = this.myDataFetcher.parentIDs;

                this.seqcount = this.mySeqIDs.length;

                var visiblecount = Math.round((this.getHeight() - topSizeY - bottomSize) / this.rowHeight);
                this.getVScroller().ScrollSize = Math.min(1, (visiblecount - 1) / this.seqcount); !!!
                this.getVScroller().draw();

                var offsetY = 0;

                //calculate positions of sequences in the view
                this.seqPy = [];
                this.seqLy = [];
                for (var seqnr = 0; seqnr < this.mySeqIDs.length; seqnr++) {
                    this.seqPy.push(-1);
                    this.seqLy.push(-1);
                }
                for (var seqnr = this.seqOffset; seqnr < this.seqcount; seqnr++) {
                    var py = topSizeY + (seqnr - this.seqOffset) * this.rowHeight;
                    ly = this.rowHeight;
                    if (py + ly < this.getHeight() - bottomSize) {
                        this.seqPy[seqnr] = offsetY + py;
                        this.seqLy[seqnr] = ly;
                        var maxpos = py + ly;
                    }
                }
                bottomSize = this.getHeight() - maxpos;


                hminsize = 1;
                if (this.allowSmallBlocks)
                    hminsize = 0;
                var minsize = 2 * hminsize + 1;

                var psx = [];
                var psxcorr = [];
                for (var i = 0; i < posits.length; i++) {
                    if ((i > 0) && (posits[i] < posits[i - 1]))
                        throw 'Invalid position'
                    psx.push(posits[i] * drawInfo.zoomFactX - drawInfo.offsetX);
                    psxcorr.push(Math.round(psx[i]));
                }

                if (!this.fillBlocks) {
                    //Calculating positions & corrected positions
                    for (cf = 0.1; cf <= 1; cf += 0.1) {

                        var psxlast = -1000;
                        for (var i = 0; i < posits.length; i++) {
                            if (psxcorr[i] < psxlast + cf * minsize)
                                psxcorr[i] = psxlast + cf * minsize;
                            psxlast = psxcorr[i];
                        }
                        cf += 0.1;
                        var psxlast = 100000000;
                        for (var i = posits.length - 1; i >= 0; i--) {
                            if (psxcorr[i] > psxlast - cf * minsize)
                                psxcorr[i] = psxlast - cf * minsize;
                            psxlast = psxcorr[i];
                        }
                    }
                    var psxlast = -1000;
                    for (var i = 0; i < posits.length; i++) {
                        psxcorr[i] = Math.round(psxcorr[i]);
                        if (psxcorr[i] < psxlast + minsize)
                            psxcorr[i] = psxlast + minsize;
                        psxlast = psxcorr[i];
                    }
                    var hdesiredsize = 4;
                    var psxcorr1 = [];
                    var psxcorr2 = [];
                    for (var i = 0; i < posits.length; i++) {
                        psxcorr1.push(psxcorr[i] - hdesiredsize);
                        if (i > 0) {
                            if (psxcorr1[i] < psxcorr2[i - 1]) {
                                var halfway = Math.round((psxcorr1[i] + psxcorr2[i - 1]) / 2.0);
                                psxcorr2[i - 1] = halfway;
                                psxcorr1[i] = halfway;
                            }
                        }
                        psxcorr2.push(psxcorr[i] + hdesiredsize);
                    }
                }
                else {//calculating fixed block size & position
                    var psxcorr1 = [];
                    var psxcorr2 = [];
                    var size = Math.round((psx[posits.length - 1] - psx[0]) / (posits.length + 1));
                    if (size < minsize) size = minsize;
                    //first pass: use all snps to determine shift
                    var shift = 0;
                    for (var i = 0; i < posits.length; i++)
                        shift += psx[i] - i * size;
                    shift = Math.round(shift / posits.length);
                    for (var i = 0; i < posits.length; i++)
                        psxcorr[i] = i * size + shift;
                    //second pass: use what's in view to determine shift
                    var shift = 0;
                    for (var i = 0; i < posits.length; i++)
                        if ((psxcorr[i] >= 0) && (psxcorr[i] <= sizeX))
                            shift += psx[i] - i * size;
                    shift = Math.round(shift / posits.length);
                    for (var i = 0; i < posits.length; i++) {
                        psxcorr[i] = i * size + shift;
                        psxcorr1.push(psxcorr[i] - size / 2);
                        psxcorr2.push(psxcorr[i] + size / 2);
                    }
                }

                //determine if this can be displayed in the current zoom level
                if (posits.length > 100) {
                    var inviewcount = 0;
                    for (var i = 0; i < posits.length; i++)
                        if ((psxcorr[i] >= 0) && (psxcorr[i] <= sizeX))
                            inviewcount++;
                    if (inviewcount < 0.5 * posits.length) {
                        this.drawMessage(drawInfo, "SNP display channel: too much information to display.", "Please zoom in to see this channel");
                        return;
                    }
                }

                this._psxcorr1 = psxcorr1;
                this._psxcorr2 = psxcorr2;

                if (this.useMagnifyingGlass) {//Apply Magnifying glass distortion
                    if (this.hoverCenter >= 0) {
                        var centerpos = this.hoverCenter;
                        for (var i = 0; i < posits.length; i++) {
                            psxcorr1[i] = warp(psxcorr1[i], centerpos);
                            psxcorr2[i] = warp(psxcorr2[i], centerpos);
                            if (psxcorr2[i] < psxcorr1[i]) {
                                psxcorr1[i] = (psxcorr1[i] + psxcorr2[i]) / 2.0;
                                psxcorr2[i] = psxcorr1[i];
                            }
                        }
                    }
                }

                //final: calculate dimensions & center position
                var psxcorrlen = [];
                for (var i = 0; i < posits.length; i++) {
                    psxcorrlen.push(psxcorr2[i] - psxcorr1[i]);
                    psxcorr[i] = Math.round((psxcorr1[i] + psxcorr2[i]) / 2);
                }

                //draw connecting lines for visible snps
                drawInfo.centerContext.strokeStyle = "rgb(0,0,0)";
                drawInfo.centerContext.globalAlpha = 0.35;
                drawInfo.centerContext.beginPath();
                for (var i = 0; i < posits.length; i++) {
                    if ((psxcorr[i] >= -3) && (psxcorr[i] <= sizeX + 3)) {
                        drawInfo.centerContext.moveTo(psxcorr[i] + 0.5, topSizeY);
                        drawInfo.centerContext.lineTo(psx[i], 0);
                    }
                }
                drawInfo.centerContext.stroke();
                drawInfo.centerContext.globalAlpha = 1;
                //draw connecting lines for invisible snps
                drawInfo.centerContext.strokeStyle = "rgb(192,0,0)";
                drawInfo.centerContext.globalAlpha = 0.35;
                drawInfo.centerContext.beginPath();
                for (var i = 0; i < posits.length; i++) {
                    if ((psxcorr[i] < -3) || (psxcorr[i] > sizeX + 3)) {
                        drawInfo.centerContext.moveTo(psxcorr[i] + 0.5, topSizeY);
                        drawInfo.centerContext.lineTo(psx[i], 0);
                    }
                }
                drawInfo.centerContext.stroke();
                drawInfo.centerContext.globalAlpha = 1;

                if (this.colorByParent) {//determine parent states
                    var parentstates = [];
                    for (var pnr = 0; pnr < 2; pnr++) {
                        var cov1 = data.seqdata[this.parentIDs[pnr]].cov1;
                        var cov2 = data.seqdata[this.parentIDs[pnr]].cov2;
                        var pres = data.seqdata[this.parentIDs[pnr]].pres;
                        pst = [];
                        for (var i = 0; i < posits.length; i++) {
                            if (pres[i])
                                pst.push(cov1[i] / (cov1[i] + cov2[i]));
                            else
                                pst.push(0.5);
                        }
                        parentstates.push(pst);
                    }
                    var parentstate0 = parentstates[0];
                    var parentstate1 = parentstates[1];
                    var parentpresents = [];
                    var parentconc = [];
                    var parentbin0 = [];
                    for (var i = 0; i < posits.length; i++) {
                        parentpresents.push(data.seqdata[this.parentIDs[0]].pres[i] && data.seqdata[this.parentIDs[1]].pres[i]);
                        parentbin0.push(Math.round(parentstate0[i]));
                        if ((parentstate0[i] <= 0.5) && (parentstate1[i] <= 0.5)) {
                            parentconc.push(1);
                        } else {
                            if ((parentstate0[i] >= 0.5) && (parentstate1[i] >= 0.5)) {
                                parentconc.push(1);
                            }
                            else {
                                parentconc.push(0);
                            }
                        }
                    }
                }

                //Create the color lut
                var colorcount = 10;
                var colors = [];
                if (!this.colorByParent) {
                    for (var i = 0; i < colorcount; i++) {
                        var fr1 = i * 1.0 / colorcount;
                        var fr2 = Math.pow(1 - fr1, 0.3);
                        var frh = 1 - 2 * Math.abs(0.5 - fr1);
                        colors.push(DQX.Color(0.2 + 0.7 * Math.pow(fr1, 0.5), 0.0 + 0.5 * frh, 0.3 + 0.4 * fr2).toString());
                    }
                }
                else {
                    for (var i = 0; i < colorcount; i++) {
                        var fr1 = i * 1.0 / colorcount;
                        var fr2 = Math.pow(1 - fr1, 0.3);
                        var frh = 1 - 2 * Math.abs(0.5 - fr1);
                        colors.push(DQX.Color(0.7 * Math.pow(fr1, 0.5), 0.4, fr2).toString());
                    }
                }
                var absentcolor = 'rgb(180,180,180)';
                var conformcolor = 'rgb(100,180,100)';
                var disconformcolor = 'rgb(255,90,0)';

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

                //draw the snps
                var lastcolornr = -1;
                for (var seqnr = 0; seqnr < this.mySeqIDs.length; seqnr++) {
                    if (this.seqLy[seqnr] > 0) {
                        var py = this.seqPy[seqnr];
                        var ly = this.seqLy[seqnr];

                        var q = 0;
                        var cov1 = data.seqdata[that.mySeqIDs[seqnr]].cov1;
                        var cov2 = data.seqdata[that.mySeqIDs[seqnr]].cov2;
                        var pres = data.seqdata[that.mySeqIDs[seqnr]].pres;
                        for (var i = 0; i < posits.length; i++) {
                            if ((psxcorr[i] >= -40) && (psxcorr[i] <= sizeX + 40)) {
                                if (pres[i]) {
                                    var covtot = cov1[i] + cov2[i];
                                    var frac = cov2[i] * 1.0 / covtot;
                                    if (this.colorByParent) {
                                        if (!parentpresents[i]) {
                                            colornr = 99;
                                            if (colornr != lastcolornr) {
                                                drawInfo.centerContext.fillStyle = absentcolor;
                                                lastcolornr = colornr;
                                            }
                                        }
                                        else {
                                            if (parentconc[i]) {
                                                if (Math.round(frac) != parentbin0[i]) {
                                                    colornr = 98;
                                                    if (colornr != lastcolornr) {
                                                        drawInfo.centerContext.fillStyle = conformcolor;
                                                        lastcolornr = colornr;
                                                    }
                                                }
                                                else {
                                                    colornr = 97;
                                                    if (colornr != lastcolornr) {
                                                        drawInfo.centerContext.fillStyle = disconformcolor;
                                                        lastcolornr = colornr;
                                                    }
                                                }
                                            }
                                            else {
                                                frac = Math.abs(frac - parentbin0[i]);
                                                var colornr = Math.min(colorcount - 1, Math.floor(frac * colorcount));
                                            }
                                        }
                                    }
                                    else {//non-parent coloring
                                        var colornr = Math.min(colorcount - 1, Math.floor(frac * colorcount));
                                    }
                                    if (colornr != lastcolornr) {
                                        drawInfo.centerContext.fillStyle = colors[colornr];
                                        lastcolornr = colornr;
                                    }
                                    var h = 2 + Math.round((ly - 3) * Math.min(1.0, covtot / this.covRange));
                                    drawInfo.centerContext.fillRect(psxcorr1[i] + 0.5, py + ly - h, psxcorrlen[i] - 0.25, h);
                                }
                                else {
                                    colornr = 99;
                                    if (colornr != lastcolornr) {
                                        drawInfo.centerContext.fillStyle = absentcolor;
                                        lastcolornr = colornr;
                                    }
                                    drawInfo.centerContext.fillRect(psxcorr1[i] + 0.5, py + 5, psxcorrlen[i] - 0.25, ly - 9);
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
                        drawInfo.leftContext.fillText(this.mySeqIDs[seqnr], 0, py + ly + 1);

                        if (this.hoverSnp >= 0) {//show snp values on the right
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
                        if ((psxcorr[i] >= -40) && (psxcorr[i] <= sizeX + 40)) {
                            if (isFiltered[i]) {
                                drawInfo.centerContext.fillRect(psxcorr1[i], topSizeY, psxcorrlen[i], sizeY - topSizeY - bottomSize);
                            }
                        }
                    }
                    drawInfo.centerContext.strokeStyle = "rgb(0,0,0)";
                    drawInfo.centerContext.globalAlpha = 0.15;
                    drawInfo.centerContext.beginPath();
                    for (var i = 0; i < posits.length; i++) {
                        if ((psxcorr[i] >= -40) && (psxcorr[i] <= sizeX + 40)) {
                            if (isFiltered[i]) {
                                var px = Math.round(psxcorr[i]) + 0.5;
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
                        if ((psxcorr[i] >= -40) && (psxcorr[i] <= sizeX + 40)) {
                            if (isFiltered[i]) {
                                var len = Math.min(3, psxcorrlen[i]) + 0.5;
                                var centx = Math.round((psxcorr1[i] + psxcorr2[i]) / 2.0) - len + 2;
                                drawInfo.centerContext.moveTo(centx, offsetY + sizeY - bottomSize);
                                drawInfo.centerContext.lineTo(centx + len, offsetY + sizeY - bottomSize + len);
                                drawInfo.centerContext.moveTo(centx + len, offsetY + sizeY - bottomSize);
                                drawInfo.centerContext.lineTo(centx, offsetY + sizeY - bottomSize + len);
                            }
                        }
                    }
                    drawInfo.centerContext.stroke();
                }


                //show snp ref+alt allele states
                if (this.hoverSnp >= 0) {
                    drawInfo.rightContext.fillText(data.SnpRefBase[this.hoverSnp], 35, topSizeY - 5);
                    drawInfo.rightContext.fillText(data.SnpAltBase[this.hoverSnp], 75, topSizeY - 5);
                    drawInfo.rightContext.globalAlpha = 0.28;
                    drawInfo.rightContext.fillStyle = "rgb(0,70,255)";
                    drawInfo.rightContext.fillRect(0, offsetY + 0, 40, sizeY);
                    drawInfo.rightContext.fillStyle = "rgb(255,0,0)";
                    drawInfo.rightContext.fillRect(40, offsetY + 0, 40, sizeY);
                    drawInfo.rightContext.globalAlpha = 1;
                }


                if (this.useMagnifyingGlass) {//Magnifying glass visual effect
                    if (this.hoverCenter >= 0) {
                        var backgrad = drawInfo.centerContext.createLinearGradient(this.hoverCenter - 70, 0, this.hoverCenter + 70, 0);
                        backgrad.addColorStop(0.0, "rgb(50,50,50)");
                        backgrad.addColorStop(0.45, "rgb(255,255,255)");
                        backgrad.addColorStop(0.7, "rgb(255,255,255)");
                        backgrad.addColorStop(1.0, "rgb(50,50,50)");
                        drawInfo.centerContext.fillStyle = backgrad; // "rgb(255,255,100)";
                        drawInfo.centerContext.globalAlpha = 0.28;
                        drawInfo.centerContext.fillRect(this.hoverCenter - 70, offsetY + 0, 140, sizeY - bottomSize);
                        drawInfo.centerContext.globalAlpha = 1;
                    }
                }

                //show graphics
                var graphOffsetY = maxpos;
                var backgrad = drawInfo.centerContext.createLinearGradient(0, 0, 0, sizeY - graphOffsetY);
                backgrad.addColorStop(0.0, "rgb(235,235,235)");
                backgrad.addColorStop(1.0, "rgb(190,190,190)");
                drawInfo.centerContext.fillStyle = DQX.Color(0.75,0.75,0.75);
                drawInfo.centerContext.fillRect(0, graphOffsetY, sizeX, sizeY - graphOffsetY-1);
                var grinfo = [
                    { val: 'SnpAQ', col: 'rgb(120,120,120)', max: 100 },
                    { val: 'SnpMQ', col: 'rgb(120,120,120)', max: 100 },
                    { val: 'AvgCoverage', col: 'rgb(120,120,120)', max: 200 }
                ];
                var grcount = grinfo.length;
                for (var grnr = 0; grnr < grcount; grnr++) {
                    var vals = data[grinfo[grnr].val];
                    var maxval = grinfo[grnr].max;
                    drawInfo.centerContext.fillStyle = grinfo[grnr].col;
                    for (var i = 0; i < posits.length; i++) {
                        if ((psxcorr[i] >= -40) && (psxcorr[i] <= sizeX + 40)) {
                            var vly = vals[i] / maxval;
                            if (vly > 1) vly = 1;
                            vly *= 0.8 * graphSizeY / grcount;
                            drawInfo.centerContext.fillRect(psxcorr1[i] + 0.5, graphOffsetY + (grnr + 1) * 1.0 * graphSizeY / grcount - vly, psxcorrlen[i] - 0.25, vly);
                        }
                    }
                }

                //indicate structural variations
                for (var i = 0; i < posits.length; i++) {
                    if ((psxcorr[i] >= -40) && (psxcorr[i] <= sizeX + 40)) {
                        var refBase = data.SnpRefBase[i];
                        var altBase = data.SnpAltBase[i];
                        var showIndication = false;
                        if ((refBase == '.') && (altBase == '+')) { showIndication = true; drawInfo.centerContext.fillStyle = DQX.Color(1, 0, 0).toString(); }
                        if ((refBase == '+') && (altBase == '.')) { showIndication = true; drawInfo.centerContext.fillStyle = DQX.Color(0, 0.7, 0).toString(); }
                        if ((refBase == '+') && (altBase == '+')) { showIndication = true; drawInfo.centerContext.fillStyle = DQX.Color(0, 0, 1).toString(); }
                        if (showIndication)
                            drawInfo.centerContext.fillRect(psxcorr1[i] + 0.5, graphOffsetY + 2, psxcorrlen[i] - 0.25, 5);
                    }
                }

                if (this.hoverSnp >= 0) {//draw the outline for the hover snp in a higher contrast
                    drawInfo.centerContext.strokeStyle = "rgb(0,0,0)";
                    drawInfo.centerContext.beginPath();
                    drawInfo.centerContext.moveTo(psxcorr1[this.hoverSnp] + 0.5, offsetY);
                    drawInfo.centerContext.lineTo(psxcorr1[this.hoverSnp] + 0.5, offsetY + sizeY - bottomSize);
                    drawInfo.centerContext.moveTo(psxcorr2[this.hoverSnp] + 0.5, offsetY);
                    drawInfo.centerContext.lineTo(psxcorr2[this.hoverSnp] + 0.5, offsetY + sizeY - bottomSize);
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

            that.onHoverOverChannel = function (xp, yp) {
                this.hoverCenter = xp;
                var newhoversnp = -1;
                var needredraw = false;
                for (var i = 0; i < this._psxcorr1.length; i++) {
                    if ((xp >= this._psxcorr1[i]) && (xp <= this._psxcorr2[i]))
                        newhoversnp = i;
                }
                if (newhoversnp != this.hoverSnp) {
                    this.hoverSnp = newhoversnp;
                    needredraw = true;
                }
                var newhoverseqnr = -1;
                for (var i = 0; i < this.mySeqIDs.length; i++)
                    if ((yp >= this.seqPy[i]) && (yp <= this.seqPy[i] + this.seqLy[i]))
                        newhoverseqnr = i;
                if (newhoverseqnr != this.hoverSeqNr) {
                    this.hoverSeqNr = newhoverseqnr;
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
                if (this.hoverSnp >= 0) {
                    infostr = 'SNP info<br/>';
                    infostr += 'Position: ' + this.data.posits[this.hoverSnp] + '<br/>';
                    infostr += 'AQ: ' + this.data.SnpAQ[this.hoverSnp].toFixed(2) + '<br/>';
                    infostr += 'MQ: ' + this.data.SnpMQ[this.hoverSnp].toFixed(2) + '<br/>';
                    infostr += this.data.SnpFilter[this.hoverSnp] ? 'Passed' : 'Not passed' + '<br/>';
                }
                $('#SnpInfo').html(infostr);
            }


            return that;
        }

        return ChannelSnps;
    });
