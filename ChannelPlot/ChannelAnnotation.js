define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/ChannelPlot/ChannelCanvas"],
    function ($, DocEl, Msg, ChannelCanvas) {
        var ChannelAnnotation = {};



        ChannelAnnotation.Channel = function (id, annotationFetcher) {
            var that = ChannelCanvas.Base(id);
            that._annotationFetcher = annotationFetcher;
            that._height = 105;
            that._minDrawZoomFactX = 1 / 300.0;

            that.getTitle = function () { return "Annotation"; }

            that.draw = function (drawInfo) {
                this.drawStandardGradientCenter(drawInfo);
                this.drawStandardGradientLeft(drawInfo);
                this.drawStandardGradientRight(drawInfo);

                if (drawInfo.zoomFactX < this._minDrawZoomFactX) {
                    this.drawMessage(drawInfo, "Zoom in to see " + this.getTitle());
                    return;
                }

                var imin = Math.round((-400 + drawInfo.offsetX) / drawInfo.zoomFactX);
                var imax = Math.round((drawInfo.sizeCenterX + 10 + drawInfo.offsetX) / drawInfo.zoomFactX);

                if (!this._annotationFetcher.IsDataReady(imin, imax))
                    this.drawFetchBusyMessage(drawInfo);

                var annot = this._annotationFetcher.getData(imin, imax);

                var ps = -4500;
                ranseed = 0;
                drawInfo.centerContext.strokeStyle = "black";
                var slotcount = 10;
                var slotmaxpos = [];
                for (var i = 0; i < 3; i++) slotmaxpos[i] = -100;

                for (var i = 0; i < annot.myStartList.length; i++) {
                    var label = annot.myNameList[i];
                    ps = annot.myStartList[i];
                    var len = annot.myStopList[i] - annot.myStartList[i];
                    var psx1 = ps * drawInfo.zoomFactX - drawInfo.offsetX;
                    var psx2 = (ps + len) * drawInfo.zoomFactX - drawInfo.offsetX;
                    drawInfo.centerContext.fillStyle = "black";
                    drawInfo.centerContext.font = '10px sans-serif';
                    drawInfo.centerContext.textBaseline = 'bottom';
                    drawInfo.centerContext.textAlign = 'left';
                    var abbrevlabel = label;
                    for (var slotnr = 0; (slotnr < slotcount) && (slotmaxpos[slotnr] > psx1); slotnr++);
                    if (slotnr < slotcount) {
                        var labellen = drawInfo.centerContext.measureText(label).width;
                        var clickpt = {};
                        clickpt.x0 = Math.round(psx1 + 2);
                        clickpt.y0 = Math.round(3 + 10 * slotnr);
                        clickpt.Y1 = clickpt.y0 + 10;
                        clickpt.name = label;
                        clickpt.ID = annot.myIDList[i];
                        clickpt.StartPs = annot.myStartList[i];
                        clickpt.Len = len;

                        drawInfo.centerContext.fillStyle = "rgb(140,180,140)";
                        drawInfo.centerContext.strokeStyle = "rgb(128,128,128)";
                        drawInfo.centerContext.beginPath();
                        drawInfo.centerContext.rect(Math.round(psx1) + 0.5, Math.round(clickpt.y0) + 0.5, Math.round(psx2 - psx1), 8);
                        drawInfo.centerContext.fill();
                        drawInfo.centerContext.stroke();

                        if (imax - imin < 2000000) {//draw exons
                            drawInfo.centerContext.fillStyle = "rgb(0,192,0)";
                            drawInfo.centerContext.strokeStyle = "rgb(0,80,0)";
                            var exstartlist = annot.myExonStarts[i];
                            var exstoplist = annot.myExonStops[i];
                            for (var exnr = 0; exnr < exstartlist.length; exnr++) {
                                var epsx1 = exstartlist[exnr] * drawInfo.zoomFactX - drawInfo.offsetX;
                                var epsx2 = exstoplist[exnr] * drawInfo.zoomFactX - drawInfo.offsetX;
                                drawInfo.centerContext.beginPath();
                                drawInfo.centerContext.rect(Math.round(epsx1) + 0.5, Math.round(clickpt.y0) + 0.5, Math.round(epsx2 - epsx1) + 1, 8);
                                drawInfo.centerContext.fill();
                                drawInfo.centerContext.stroke();
                            }
                        }

                        drawInfo.centerContext.fillStyle = "black";
                        drawInfo.centerContext.fillText(abbrevlabel, Math.round(psx2 + 2) + 0.5, clickpt.Y1 + 0.5);
                        slotmaxpos[slotnr] = psx2 + labellen + 6;

                        clickpt.XCent = Math.round((psx1 + psx2) / 2);
                        clickpt.X1 = psx2 + labellen;

                        //this._clickInfo.push(clickpt);
                    }
                    if (slotnr == slotcount) {
                        drawInfo.centerContext.fillStyle = "rgb(255,200,100)";
                        drawInfo.centerContext.fillRect(Math.round(psx1 + 2) + 0.5, this.getHeight() - 2 + 0.5, 20, 1.5);
                    }

                    ps += len;
                }

                this.drawMark(drawInfo);
            }

            return that;
        }



        return ChannelAnnotation;
    });
