define(["jquery", DQXSC("DocEl"), DQXSC("Msg")],
    function ($, DocEl, Msg) {
        var Scroller = {};


        Scroller.HScrollBar = function (iCanvasID) {
            var that = DQX.CanvasElement(iCanvasID)
            that.myID = iCanvasID;
            that.sizeX = that.getMyCanvasElement().width;
            that.sizeY = that.getMyCanvasElement().height;
            that.rangeMin = 0; //zero fraction translates to this value
            that.rangeMax = 1; //one fraction translates to this value
            that.scrollPos = 0.0; //scroll position, as fraction
            that.ScrollSize = 0.2; //size, as fraction
            that.minScrollSize = 0.0005; //this determines the maximum zoom factor for the zoom slider
            that.myConsumer = null;

            that.zoomareafraction = 0.3;

            that.zoomDragging = false;
            that.scrollerDragging = false;

            that.registerHandlers(that.getMyCanvasElement());

            //Sets the scroll position & size
            that.setValue = function (iPos, iSize) {
                this.scrollPos = iPos;
                this.ScrollSize = iSize;
                this.draw();
            }

            //Sets the range
            that.setRange = function (imin, imax) {
                this.rangeMin = imin;
                this.rangeMax = imax;
                this.draw();
            }

            //Returns the zooming factor as a fraction
            that.getZoomFrac = function () {
                var zoomfrac = (Math.min(this.minScrollSize / this.ScrollSize) - this.minScrollSize) / (1 - this.minScrollSize);
                return Math.log(1 + 100 * zoomfrac) / Math.log(1 + 100);
            }

            //Resizes the element to a new x dimension
            that.resize = function (newsizex) {
                this.sizeX = newsizex;
                $('#' + this.myID).width(newsizex);
                this.getMyCanvasElement().width = newsizex;
                this.draw();
            }


            that._drawTriangle = function (context, psx, dir) {
                var ypc = Math.round(this.sizeY / 2);
                var sze = Math.round(this.sizeY / 4);
                context.beginPath();
                context.moveTo(psx, ypc - sze);
                context.lineTo(psx + dir * sze, ypc);
                context.lineTo(psx, ypc + sze);
                context.closePath();
                context.fill();
            }

            that.draw = function () {
                var SepSizeX = 15;

                var obj = this.getMyCanvasElement();
                var centercontext = obj.getContext("2d");

                var backgrad1 = centercontext.createLinearGradient(0, 0, 0, this.sizeY);
                backgrad1.addColorStop(0, "rgb(60,60,60)");
                backgrad1.addColorStop(0.4, "rgb(160,160,160)");
                backgrad1.addColorStop(1, "rgb(20,20,20)");

                var backgrad2 = centercontext.createLinearGradient(0, 0, 0, this.sizeY);
                backgrad2.addColorStop(0, "rgb(20,20,20)");
                backgrad2.addColorStop(0.4, "rgb(130,130,130)");
                backgrad2.addColorStop(1, "rgb(0,0,0)");

                centercontext.fillStyle = backgrad1;
                centercontext.fillRect(0, 0, this.sizeX, this.sizeY);

                this.ScrollAreaStartX = Math.round(this.sizeX * this.zoomareafraction) + SepSizeX;
                this.ScrollAreaSizeX = this.sizeX - this.ScrollAreaStartX - SepSizeX;
                this.ZoomAreaStartX = SepSizeX;
                this.ZoomAreaSizeX = this.ScrollAreaStartX - this.ZoomAreaStartX - SepSizeX;

                //---------- draw zoom bar -------------------
                var px1 = this.ZoomAreaStartX;
                var px2 = this.ZoomAreaStartX + Math.round(this.getZoomFrac() * this.ZoomAreaSizeX);
                px2 = Math.min(px2, this.ZoomAreaStartX + this.ZoomAreaSizeX);
                centercontext.globalAlpha = 0.4;
                var backgrad = centercontext.createLinearGradient(0, 5, 0, this.sizeY - 5);
                backgrad.addColorStop(0, "rgb(0,192,0)");
                backgrad.addColorStop(0.3, "rgb(192,255,128)");
                backgrad.addColorStop(1, "rgb(0,192,0)");
                centercontext.fillStyle = backgrad;
                centercontext.fillRect(px1, 6, px2 - px1, this.sizeY - 12);
                //arrow
                centercontext.fillStyle = "rgb(128,255,128)";
                this._drawTriangle(centercontext, px2 + 3, 1);
                centercontext.fillStyle = "rgb(40,100,40)";
                this._drawTriangle(centercontext, px2 - 3, -1);

                //text
                var txt = "Zoom: " + (1.0 / that.ScrollSize).toFixed(that.ScrollSize > 0.1 ? 1 : 0) + "x";
                centercontext.globalAlpha = 0.75;
                centercontext.fillStyle = "rgb(255,255,200)";
                centercontext.font = '13px sans-serif';
                centercontext.textBaseline = 'middle';
                centercontext.shadowColor = "black";
                centercontext.shadowBlur = 3;
                if (px2 + 15 + centercontext.measureText(txt).width < this.ZoomAreaStartX + this.ZoomAreaSizeX) {
                    centercontext.textAlign = 'left';
                    centercontext.fillText(txt, px2 + 15, this.sizeY / 2);
                }
                else {
                    centercontext.textAlign = 'right';
                    centercontext.fillText(txt, px2 - 15, this.sizeY / 2);
                }
                centercontext.shadowColor = "transparent";




                //---------- draw scroll bar -----------------
                var px1 = this.ScrollAreaStartX + Math.round(this.scrollPos * this.ScrollAreaSizeX);
                var px2 = this.ScrollAreaStartX + Math.round((this.scrollPos + this.ScrollSize) * this.ScrollAreaSizeX);
                if (px1 < this.ScrollAreaStartX) px1 = this.ScrollAreaStartX;
                if (px2 > this.ScrollAreaStartX + this.ScrollAreaSizeX) px2 = this.ScrollAreaStartX + this.ScrollAreaSizeX;

                //scroll bar position indicators
                centercontext.globalAlpha = 0.7;
                centercontext.fillStyle = "rgb(255,255,200)";
                centercontext.font = '11px sans-serif';
                centercontext.textBaseline = 'top';
                centercontext.textAlign = 'center';
                centercontext.shadowColor = "black";
                centercontext.shadowBlur = 3;
                var scalejumps = DQX.DrawUtil.getScaleJump(20 / this.sizeX * (this.rangeMax - this.rangeMin));
                var i2 = ((this.rangeMax - this.rangeMin)) / scalejumps.Jump1;
                for (var i = 0; i < i2; i++) {
                    var x = i * scalejumps.Jump1;
                    var psx = this.ScrollAreaStartX + Math.round((x - this.rangeMin) / (this.rangeMax - this.rangeMin) * this.ScrollAreaSizeX);
                    if ((psx > this.ScrollAreaStartX + 10) && (psx < this.ScrollAreaStartX + this.ScrollAreaSizeX - 10)) {
                        if (i % scalejumps.JumpReduc == 0) {
                            centercontext.fillText(x.toFixed(scalejumps.textDecimalCount), psx, this.sizeY / 2 - 7);
                        }
                    }
                }
                centercontext.shadowColor = "transparent";

                //scroll bar bar
                centercontext.globalAlpha = 0.35;
                var backgrad = centercontext.createLinearGradient(px1, 0, px2, 0);
                backgrad.addColorStop(0, "rgb(160,255,160)");
                backgrad.addColorStop(0.25, "rgb(0,192,0)");
                backgrad.addColorStop(0.75, "rgb(0,192,0)");
                backgrad.addColorStop(1, "rgb(160,255,160)");
                centercontext.fillStyle = backgrad;
                centercontext.fillRect(px1, 2, px2 - px1, this.sizeY - 4);
                //scroll bar arrows
                centercontext.fillStyle = "rgb(128,255,128)";
                this._drawTriangle(centercontext, px2 + 3, 1);
                this._drawTriangle(centercontext, px1 - 3, -1);



                centercontext.globalAlpha = 1.0;

                //draw separators
                centercontext.fillStyle = backgrad2;
                centercontext.fillRect(0, 0, SepSizeX, this.sizeY);
                centercontext.fillRect(this.ScrollAreaStartX - SepSizeX, 0, SepSizeX, this.sizeY);
                centercontext.fillRect(this.ScrollAreaStartX + this.ScrollAreaSizeX, 0, SepSizeX, this.sizeY);

            }

            that._onMouseDown = function (ev) {
                var px = this.getEventPosX(ev);
                this.scrollerDragging = false;
                this.zoomDragging = false;
                if ((px >= this.ScrollAreaStartX) && (px <= this.ScrollAreaStartX + this.ScrollAreaSizeX)) {//in scroller area
                    this.scrollerDragging = true;
                    var px1 = this.ScrollAreaStartX + Math.round(this.scrollPos * this.ScrollAreaSizeX);
                    this.dragxoffset = px - px1;
                }
                if ((px >= this.ZoomAreaStartX) && (px <= this.ZoomAreaStartX + this.ZoomAreaSizeX)) {//in zoom area
                    this.zoomDragging = true;
                    this.dragstartx = px;
                    this.dragstartzoompos = this.ZoomAreaStartX + Math.round(this.getZoomFrac() * this.ZoomAreaSizeX);
                }
            }

            that._onMouseMove = function (ev) {
                var px = this.getEventPosX(ev);
                if (this.scrollerDragging) {
                    var dragx = px - this.dragxoffset;
                    this.scrollPos = ((dragx - this.ScrollAreaStartX) * 1.0 / this.ScrollAreaSizeX);
                    if (this.scrollPos < 0) this.scrollPos = 0;
                    if (this.scrollPos + this.ScrollSize > 1) this.scrollPos = 1 - this.ScrollSize;
                    this.draw();
                    if (('myConsumer' in this) && (this.myConsumer != null))
                        this.myConsumer.scrollTo(this.scrollPos);
                }
                if (this.zoomDragging) {
                    var newzoompos = px - this.dragstartx + this.dragstartzoompos;
                    var newzoomfrac = (newzoompos - this.ZoomAreaStartX) / this.ZoomAreaSizeX;
                    newzoomfrac = Math.max(0, newzoomfrac);
                    newzoomfrac = Math.min(1, newzoomfrac);
                    newzoomfrac = (Math.exp(newzoomfrac * Math.log(1 + 100)) - 1) / 100;
                    var newscrollsize = this.minScrollSize / (newzoomfrac * (1 - this.minScrollSize) + this.minScrollSize);
                    newscrollsize = Math.min(1, newscrollsize);
                    newscrollsize = Math.max(this.minScrollSize, newscrollsize);
                    this.scrollPos = this.scrollPos + this.ScrollSize / 2 - newscrollsize / 2;
                    this.ScrollSize = newscrollsize;
                    if (this.scrollPos + this.ScrollSize > 1) this.scrollPos = 1 - this.ScrollSize;
                    if (this.scrollPos < 0) this.scrollPos = 0;
                    this.draw();
                    if (this.myConsumer)
                        this.myConsumer.zoomScrollTo(this.scrollPos, this.ScrollSize);
                }
            }

            that._onMouseUp = function (ev) {
            }

            that._onMouseHover = function (ev) {

                var px = this.getEventPosX(ev);
                var sizemouse = false;
                if ((px >= this.ScrollAreaStartX) && (px <= this.ScrollAreaStartX + this.ScrollAreaSizeX))
                    sizemouse = true;
                if ((px >= this.ZoomAreaStartX) && (px <= this.ZoomAreaStartX + this.ZoomAreaSizeX))
                    sizemouse = true;

                $('#' + this.myCanvasID).css('cursor', sizemouse ? 'col-resize' : 'auto');
            }


            return that;
        }







        Scroller.VScrollBar = function (iCanvasID) {
            var that = DQX.CanvasElement(iCanvasID)
            that.myID = iCanvasID;
            that.sizeX = that.getMyCanvasElement().width;
            that.sizeY = that.getMyCanvasElement().height;
            that.rangeMin = 0; //zero fraction translates to this value
            that.rangeMax = 1; //one fraction translates to this value
            that.scrollPos = 0.0; //scroll position, as fraction
            that.ScrollSize = 0.1; //size, as fraction
            that.minScrollSize = 0.0005; //this determines the maximum zoom factor for the zoom slider
            that.myConsumer = null;

            that.scrollerDragging = false;

            that.registerHandlers(that.getMyCanvasElement());

            //Sets the scroll position & size
            that.setValue = function (iPos, iSize) {
                this.scrollPos = iPos;
                this.ScrollSize = iSize;
                this.draw();
            }


            //Sets the range
            that.setRange = function (imin, imax) {
                this.rangeMin = imin;
                this.rangeMax = imax;
                this.draw();
            }

            //Returns the zooming factor as a fraction
            that.getZoomFrac = function () {
                var zoomfrac = (Math.min(this.minScrollSize / this.ScrollSize) - this.minScrollSize) / (1 - this.minScrollSize);
                return Math.log(1 + 100 * zoomfrac) / Math.log(1 + 100);
            }

            //Resizes the element to a new y dimension
            that.resize = function (newsizey) {
                this.sizeY = newsizey;
                $('#' + this.myID).height(newsizey);
                //this.myCanvasElement.height = newsizey;
                $("#" + this.myID)[0].height = newsizey;
                this.draw();
            }


            that._drawTriangle = function (context, psx, dir) {
                var ypc = Math.round(this.sizeY / 2);
                var sze = Math.round(this.sizeY / 4);
                context.beginPath();
                context.moveTo(psx, ypc - sze);
                context.lineTo(psx + dir * sze, ypc);
                context.lineTo(psx, ypc + sze);
                context.closePath();
                context.fill();
            }

            that.draw = function () {
                var SepSizeY = 15;

                var centercontext = this.getMyCanvasElement().getContext("2d");

                var backgrad1 = centercontext.createLinearGradient(0, 0, this.sizeX, 0);
                backgrad1.addColorStop(0, "rgb(60,60,60)");
                backgrad1.addColorStop(0.4, "rgb(160,160,160)");
                backgrad1.addColorStop(1, "rgb(20,20,20)");

                var backgrad2 = centercontext.createLinearGradient(0, 0, this.sizeX, 0);
                backgrad2.addColorStop(0, "rgb(20,20,20)");
                backgrad2.addColorStop(0.4, "rgb(130,130,130)");
                backgrad2.addColorStop(1, "rgb(0,0,0)");

                centercontext.fillStyle = backgrad1;
                centercontext.fillRect(0, 0, this.sizeX, this.sizeY);

                this.ScrollAreaStartY = +SepSizeY;
                this.ScrollAreaSizeY = this.sizeY - this.ScrollAreaStartY - SepSizeY;





                //---------- draw scroll bar -----------------
                var py1 = this.ScrollAreaStartY + Math.round(this.scrollPos * this.ScrollAreaSizeY);
                var py2 = this.ScrollAreaStartY + Math.round((this.scrollPos + this.ScrollSize) * this.ScrollAreaSizeY);
                if (py1 < this.ScrollAreaStartY) py1 = this.ScrollAreaStartY;
                if (py2 > this.ScrollAreaStartY + this.ScrollAreaSizeY) py2 = this.ScrollAreaStartY + this.ScrollAreaSizeY;


                //scroll bar bar
                centercontext.globalAlpha = 0.35;
                var backgrad = centercontext.createLinearGradient(0, py1, 0, py2);
                backgrad.addColorStop(0, "rgb(160,255,160)");
                backgrad.addColorStop(0.25, "rgb(0,192,0)");
                backgrad.addColorStop(0.75, "rgb(0,192,0)");
                backgrad.addColorStop(1, "rgb(160,255,160)");
                centercontext.fillStyle = backgrad;
                centercontext.fillRect(2, py1, this.sizeX - 4, py2 - py1);
                //scroll bar arrows
                /*        centercontext.fillStyle = "rgb(128,255,128)";
                this._drawTriangle(centercontext, px2 + 3, 1);
                this._drawTriangle(centercontext, px1 - 3, -1);*/



                centercontext.globalAlpha = 1.0;

                //draw separators
                centercontext.fillStyle = backgrad2;
                centercontext.fillRect(0, 0, this.sizeX, SepSizeY);
                centercontext.fillRect(0, this.ScrollAreaStartY - SepSizeY, this.sizeX, SepSizeY);
                centercontext.fillRect(0, this.ScrollAreaStartY + this.ScrollAreaSizeY, this.sizeX, SepSizeY);

            }

            that._onMouseDown = function (ev) {
                var py = this.getEventPosY(ev);
                this.scrollerDragging = false;
                if ((py >= this.ScrollAreaStartY) && (py <= this.ScrollAreaStartY + this.ScrollAreaSizeY)) {//in scroller area
                    this.scrollerDragging = true;
                    var py1 = this.ScrollAreaStartY + Math.round(this.scrollPos * this.ScrollAreaSizeY);
                    this.dragyoffset = py - py1;
                }
            }

            that._onMouseMove = function (ev) {
                var py = this.getEventPosY(ev);
                if (this.scrollerDragging) {
                    var dragy = py - this.dragyoffset;
                    this.scrollPos = ((dragy - this.ScrollAreaStartY) * 1.0 / this.ScrollAreaSizeY);
                    if (this.scrollPos < 0) this.scrollPos = 0;
                    if (this.scrollPos + this.ScrollSize > 1) this.scrollPos = 1 - this.ScrollSize;
                    this.draw();
                    if (('myConsumer' in this) && (this.myConsumer != null))
                        this.myConsumer.scrollTo(this.scrollPos);
                }
            }

            that._onMouseUp = function (ev) {
            }

            that._onMouseHover = function (ev) {

                var py = this.getEventPosY(ev);
                var sizemouse = false;
                if ((py >= this.ScrollAreaStartY) && (py <= this.ScrollAreaStartY + this.ScrollAreaSizeY))
                    sizemouse = true;
                if ((py >= this.ZoomAreaStartY) && (py <= this.ZoomAreaStartY + this.ZoomAreaSizeY))
                    sizemouse = true;

                $('#' + this.myCanvasID).css('cursor', sizemouse ? 'row-resize' : 'auto');
            }


            return that;
        }


        return Scroller;
    });
