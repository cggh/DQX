// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/Controls", "DQX/ChannelPlot/ChannelCanvas"],
    function ($, DocEl, Msg, Controls, ChannelCanvas) {
        var ChannelAnnotation = {};



        ChannelAnnotation.Channel = function (id, annotationFetcher, args) {
            var that = ChannelCanvas.Base(id);
            that._annotationFetcher = annotationFetcher;
            that.setHeight(55);
            if (args) {
                if (args.annotationChannelHeight)
                    that.setHeight(args.annotationChannelHeight);
            }
            that._minDrawZoomFactX = 1 / 300.0;
            that._clickInfo = []; //will hold info about clickable areas
            that.darkenFactor = 1.0;
            that._drawLabels = true;
            that._showIDInToolTip = true;
            that._autoVerticalPosition = true;
            that._colorByName = false;
            that._slotH = 10;

            that.setSlotHeight = function(vl) {
                that._slotH = vl;
            }

            that.setMinDrawZoomFactX = function (vl) {
                this._minDrawZoomFactX = vl;
            }

            that.setDrawLabels = function (vl) {
                this._drawLabels = vl;
            }

            that.setAutoVerticalPosition = function(vl) {
                that._autoVerticalPosition = vl;
            }

            that.showIDInToolTip = function(vl) {
                that._showIDInToolTip = vl;
            }


            that.setColorByName = function(name2ColorMap) {
                that._colorByName = true;
                that._name2ColorMap = name2ColorMap;
            }

            that.draw = function (drawInfo) {
                this.drawStandardGradientCenter(drawInfo, this.darkenFactor);
                this.drawStandardGradientLeft(drawInfo, this.darkenFactor);
                this.drawStandardGradientRight(drawInfo, this.darkenFactor);
                this._clickInfo = [];

                if ((drawInfo.needZoomIn) || (drawInfo.zoomFactX < this._minDrawZoomFactX)) {
                    this.drawMessage(drawInfo, "Zoom in to see " + this._title);
                    return;
                }

                var imin = Math.round((-400 + drawInfo.offsetX) / drawInfo.zoomFactX);
                var imax = Math.round((drawInfo.sizeCenterX + 10 + drawInfo.offsetX) / drawInfo.zoomFactX);

                if (!this._annotationFetcher.IsDataReady(imin, imax))
                    this.drawFetchBusyMessage(drawInfo);

                var annot = this._annotationFetcher.getData(imin, imax);

                var hasColors = (!!(this._annotationFetcher.extrafield1)) && (this.funcMapExtraField2Color);

                if (hasColors) {
                    var colorList = this.funcMapExtraField2Color(annot.extraField1List);
                }

                var ps = -4500;
                ranseed = 0;
                drawInfo.centerContext.strokeStyle = "black";
                var slotcount = Math.floor((this._height - 5) / that._slotH);
                var slotmaxpos = [];
                for (var i = 0; i < 3; i++) slotmaxpos[i] = -10000;

                var displayLabels = false;
                if (annot.myStartList.length>0) {
                    if (this._drawLabels && this._annotationFetcher.field_name) {
                        displayLabels = true;
                        var totalTextLen = 0;
                        for (var i = 0; i < annot.myStartList.length; i++)
                                totalTextLen += annot.myNameList[i].length;
                        var psx1 = annot.myStartList[0] * drawInfo.zoomFactX - drawInfo.offsetX;
                        var psx2 = annot.myStartList[annot.myStartList.length-1] * drawInfo.zoomFactX - drawInfo.offsetX;
                        var abbrevLen = -1;
                        if (psx2>psx1) {
                            if (5*totalTextLen>psx2-psx1) {
                                var abbrevLen = Math.round(3*(psx2-psx1)/totalTextLen);
                                if (abbrevLen<4)
                                    displayLabels = false;
                            }
                        }
                    }
                }

                for (var i = 0; i < annot.myStartList.length; i++) {
                    var label = '';
                    if (this._annotationFetcher.field_name)
                        label = annot.myNameList[i];
                    ps = annot.myStartList[i];
                    var len = annot.myStopList[i] - annot.myStartList[i];
                    var psx1 = ps * drawInfo.zoomFactX - drawInfo.offsetX;
                    var psx2 = (ps + len) * drawInfo.zoomFactX - drawInfo.offsetX;
                    drawInfo.centerContext.fillStyle = "black";
                    drawInfo.centerContext.font = '10px sans-serif';
                    drawInfo.centerContext.textBaseline = 'bottom';
                    drawInfo.centerContext.textAlign = 'left';
                    var abbrevlabel = label;
                    if (abbrevLen>0)
                        abbrevlabel = DQX.truncateString(label, abbrevLen,'..');
                    var slotnr = 0;
                    if (that._autoVerticalPosition) {
                        for (var slotnr = 0; (slotnr < slotcount) && (slotmaxpos[slotnr] > psx1); slotnr++);
                    }
                    if (slotnr < slotcount) {
                        if (displayLabels) {
                            var labellen = drawInfo.centerContext.measureText(abbrevlabel).width+5;
                        }
                        else
                            var labellen = 0;
                        var clickpt = {};
                        clickpt.x0 = Math.round(psx1 + 2);
                        clickpt.y0 = Math.round(3 + that._slotH * slotnr);
                        clickpt.Y1 = clickpt.y0 + that._slotH;
                        clickpt.name = label;
                        clickpt.ID = annot.myIDList[i];
                        clickpt.StartPs = annot.myStartList[i];
                        clickpt.Len = len;

                        drawInfo.centerContext.fillStyle = "rgb(180,225,230)";
                        drawInfo.centerContext.strokeStyle = "rgb(128,128,128)";

                        if (that._colorByName) {
                            drawInfo.centerContext.fillStyle = that._name2ColorMap[annot.myNameList[i]].toStringCanvas();
                        }

                        if (hasColors) {
                            if (colorList[i]) {
                                var colstr = colorList[i].toString();
                                drawInfo.centerContext.fillStyle = colstr;
                                drawInfo.centerContext.strokeStyle = colstr;
                            }
                            else {
                                drawInfo.centerContext.fillStyle = 'rgb(128,128,128)';
                                drawInfo.centerContext.strokeStyle = 'rgb(128,128,128)';
                            }
                        }

                        drawInfo.centerContext.beginPath();
                        drawInfo.centerContext.rect(Math.round(psx1) + 0.5, Math.round(clickpt.y0) + 0.5, Math.round(psx2 - psx1), that._slotH - 2);
                        drawInfo.centerContext.fill();
                        drawInfo.centerContext.stroke();

                        if (imax - imin < 2000000) {//draw exons
                            drawInfo.centerContext.fillStyle = "rgb(128,194,200)";
                            drawInfo.centerContext.strokeStyle = "rgb(0,0,0)";
                            var exstartlist = annot.myExonStarts[i];
                            var exstoplist = annot.myExonStops[i];
                            for (var exnr = 0; exnr < exstartlist.length; exnr++) {
                                var epsx1 = exstartlist[exnr] * drawInfo.zoomFactX - drawInfo.offsetX;
                                var epsx2 = exstoplist[exnr] * drawInfo.zoomFactX - drawInfo.offsetX;
                                drawInfo.centerContext.beginPath();
                                drawInfo.centerContext.rect(Math.round(epsx1) + 0.5, Math.round(clickpt.y0) + 0.5, Math.round(epsx2 - epsx1) + 1, that._slotH - 2);
                                drawInfo.centerContext.fill();
                                drawInfo.centerContext.stroke();
                            }
                        }

                        if (displayLabels) {
                            drawInfo.centerContext.fillStyle = "rgb(80,80,80)";
                            drawInfo.centerContext.fillText(abbrevlabel, Math.round(psx2 + 2) + 0.5, clickpt.Y1 + 0.5);
                            slotmaxpos[slotnr] = psx2 + labellen;
                        }
                        else
                            slotmaxpos[slotnr] = psx2 + 1;

                        clickpt.XCent = Math.round((psx1 + psx2) / 2);
                        clickpt.X1 = psx2 + labellen;

                        this._clickInfo.push(clickpt);
                    }
                    if (slotnr == slotcount) {
                        drawInfo.centerContext.fillStyle = "rgb(255,200,100)";
                        drawInfo.centerContext.fillRect(Math.round(psx1 + 2) + 0.5, this.getHeight() - 4 + 0.5, 20, 1.5);
                    }

                    ps += len;
                }

                this.drawMark(drawInfo);
                this.drawXScale(drawInfo);
                this.drawTitle(drawInfo);
            }

            that.getClickInfoAtPoint = function (xp, yp) {
                var minDst = 5;
                var closest = null;
                for (var clicknr = 0; clicknr < this._clickInfo.length; clicknr++) {
                    var clickpt = this._clickInfo[clicknr];
                    var dstX = 0;
                    var dstY = 0;
                    if (xp < clickpt.x0) dstX = clickpt.x0 - xp;
                    if (xp > clickpt.X1) dstX = xp - clickpt.X1;
                    if (yp < clickpt.y0) dstY = clickpt.y0 - yp;
                    if (yp > clickpt.Y1) dstY = yp - clickpt.Y1;
                    var dst = Math.max(dstX, dstY);
                    if (dst <= minDst) {
                        minDst = dst;
                        closest = clickpt;
                    }
                }
                return closest;
            }

            that.getToolTipInfo = function (px, py) {
                var clickpt = this.getClickInfoAtPoint(px, py);
                var thetip = null;
                if (clickpt != null) {
                    thetip = {};
                    thetip.px = Math.min(clickpt.X1 - 50, Math.max(clickpt.x0, px));
                    thetip.py = clickpt.Y1 - 5;
                    thetip.content = clickpt.name;
                    if (that._showIDInToolTip)
                        thetip.content += "<br>" + clickpt.ID;
                    thetip.ID = clickpt.ID;
                    thetip.showPointer = true;
                }
                return thetip;
            }

            that.handleMouseClicked = function (px, py, area, params) {
                var tooltipInfo = that.getToolTipInfo(px, py);
                if (tooltipInfo) {
                    this.handleFeatureClicked(tooltipInfo.ID);
                }
            }


            that.handleFeatureClicked = function (geneID) { //override this to implement behavour when a gene is clicked
            }

            that.modifyVisibility = function(isVisible, preventReDraw) {
                that._myPlotter.channelModifyVisibility(that.getID(), isVisible, preventReDraw);
                if (!preventReDraw)
                    that._myPlotter.render();
            }

            that.createVisibilityControl = function(defaultHidden, name) {
                if (defaultHidden) {
                    that._myPlotter.channelModifyVisibility(that.getID(),false);
                }
                var chk=Controls.Check(null,{ label:name||that.getTitle(), value:(!defaultHidden) }).setClassID(that._myID).setOnChanged(function() {
                    that.modifyVisibility(chk.getValue());
                    if (chk.getValue())
                        that.scrollInView();
                });
                return chk;
            }



            return that;
        }



        return ChannelAnnotation;
    });
