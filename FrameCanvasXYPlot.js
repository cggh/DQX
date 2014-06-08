// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

/************************************************************************************************************************************
 *************************************************************************************************************************************

 A FramePanel that implements a html Canvas drawing area

 *************************************************************************************************************************************
 *************************************************************************************************************************************/

define(["jquery", "DQX/Utils", "DQX/DocEl", "DQX/Msg", "DQX/FrameCanvas"],
    function ($, DQX, DocEl, Msg, FrameCanvas) {

        var Scaler = function(iScaler) {
            var that = {};

            if (iScaler) {
                that.minVal = iScaler.minVal;
                that.maxVal = iScaler.maxVal;
                that.range =  iScaler.range;
                that.offset = iScaler.offset;
            }


            that.setRange = function(minVal, maxVal) {
                that.minVal = minVal;
                that.maxVal = maxVal;
                that.range =  that.maxVal-that.minVal;
                that.offset = that.minVal;
                that.isZoomed = false;
            }

            that.getRange = function() {
                return that.range;
            }

            that.getOffset = function() {
                return that.offset;
            }

            that.getMinVisibleRange = function() {
                return that.offset;
            }

            that.getMaxVisibleRange = function() {
                return that.offset+that.range;
            }

            that.toFraction = function(vl) {
                return (vl-that.offset)/that.range;
            }

            that.getViewPortFraction = function() {
                return {
                    mn: (that.offset-that.minVal) / (that.maxVal-that.minVal),
                    mx: (that.offset+that.range-that.minVal) / (that.maxVal-that.minVal)
                }
            }

            that.clipRange = function() {
                if (that.range>that.maxVal-that.minVal)
                    that.range = that.maxVal-that.minVal;

                var minval = 0.0*that.range + that.offset;
                if (minval<that.minVal)
                    that.offset = that.minVal;

                var maxval = 1.0*that.range + that.offset;
                if (maxval>that.maxVal)
                    that.offset = that.maxVal - that.range;

            }


            that.zoom = function(fac, centerFrac) {
                var fixedPosValue = centerFrac*that.range + that.offset;
                that.range /= fac;
                that.offset = (fixedPosValue/that.range - centerFrac) * that.range;
                that.clipRange();
                if (fac>1)
                    that.isZoomed = true;
            }

            that.panFraction = function(fr) {
                that.offset += fr*that.range;
                that.clipRange();
            }


            that.store = function() {
                var sett = {};
                if (!that.isZoomed)
                    sett.default= true;
                else {
                    sett.range = that.range;
                    sett.offset = that.offset;
                }
                return sett;
            }

            that.recall = function(sett) {
                if (sett.default) {
                }
                else {
                    that.range = sett.range;
                    that.offset = sett.offset;
                    that.isZoomed = true;
                }
            }

            return that;
        }

        return function (iParentRef) {
            var that = FrameCanvas(iParentRef);

            that.scaleMarginX = 37;
            that.scaleMarginY = 37;
            that._dragActionPan = true;

            that.xScaler = Scaler();
            that.yScaler = Scaler();

            that.setXRange = function(minval, maxval) {
                that.xScaler.setRange(minval, maxval);
            }

            that.setYRange = function(minval, maxval) {
                that.yScaler.setRange(minval, maxval);
            }


            that.getXScale = function() {
                return 1.0/that.xScaler.getRange()*(that.drawSizeX-that.scaleMarginX);
            }
            that.getXOffset = function() {
                return that.scaleMarginX - that.xScaler.getOffset()*that.getXScale();
            }

            that.getYScale = function() {
                return  - 1.0/that.yScaler.getRange()*(that.drawSizeY-that.scaleMarginY);
            }
            that.getYOffset = function() {
                return (that.drawSizeY - that.scaleMarginY) - that.yScaler.getOffset()*that.getYScale();
            }


            that.draw = function(drawInfo) {
                that.drawSizeX = drawInfo.sizeX;
                that.drawSizeY = drawInfo.sizeY;
                that.drawCenter(drawInfo);
                that.drawScale(drawInfo);
            }

            that.drawScale = function(drawInfo) {
                that.drawSizeX = drawInfo.sizeX;
                that.drawSizeY = drawInfo.sizeY;
                var ctx = drawInfo.ctx;

                ctx.fillStyle="rgb(220,220,220)";
                ctx.fillRect(0,0,that.scaleMarginX, drawInfo.sizeY);
                ctx.fillRect(0,drawInfo.sizeY-that.scaleMarginY,drawInfo.sizeX,that.scaleMarginY);

                that.drawXScale(drawInfo);
                that.drawYScale(drawInfo);

                ctx.fillStyle="rgba(0,0,0,0.2)";
                var vpFraction = that.xScaler.getViewPortFraction();
                var imW = drawInfo.sizeX-that.scaleMarginX;
                ctx.fillRect(that.scaleMarginX + vpFraction.mn*imW, drawInfo.sizeY-5,(vpFraction.mx-vpFraction.mn)*imW, 5);
                var vpFraction = that.yScaler.getViewPortFraction();
                var imH = drawInfo.sizeY-that.scaleMarginY;
                ctx.fillRect(0, (1-vpFraction.mx)*imH, 5,(vpFraction.mx-vpFraction.mn)*imH);
            }

            that.renderScale = function() {
                var ctx = that.getMyCanvasElement('main').getContext("2d");
                ctx.fillStyle="#FFFFFF";
                var drawInfo = {
                    ctx: ctx,
                    sizeX: that._cnvWidth,
                    sizeY: that._cnvHeight,
                    scaleBorderOnly: true
                };
                that.drawScale(drawInfo);
            }


            that.finishZoomPan = function() {
                if (that.zoompanProcessing) {
                    that.zoompanProcessing = false;
                    that.render();
                }
            };

            that.ThrottledFinishZoomPan =DQX.debounce(that.finishZoomPan, 250);
            
            
            that._setNewScalers = function(newXScaler, newYScaler) {
                if (that._directRedraw) {
                    that.xScaler = newXScaler;
                    that.yScaler = newYScaler;
                    that.render();
                }
                else {
                    var mainCanvas = that.getMyCanvasElement('main');
                    var ctx = mainCanvas.getContext("2d");
                    if (!that.zoompanProcessing) {
                        that.zoompanProcessing = true;
                        that.zoompanImage = new Image();
                        that.zoompanImage.id = "tempzoompic";
                        that.zoompanImage.src = mainCanvas.toDataURL();
                        that.origXScaler = Scaler(that.xScaler);
                        that.origYScaler = Scaler(that.yScaler);
                    }
                    that.xScaler = newXScaler;
                    that.yScaler = newYScaler;
                    if (!that.zoompanProcessing) {
                        that.zoompanProcessing = true;
                        that.zoompanImage = new Image();
                        that.zoompanImage.id = "tempzoompic";
                        that.zoompanImage.src = mainCanvas.toDataURL();
                    }
                    ctx.fillStyle="rgb(240,240,240)";
                    ctx.fillRect(0, 0, that._cnvWidth,that._cnvHeight);
                    var frx1 = that.xScaler.toFraction(that.origXScaler.getMinVisibleRange());
                    var frx2 = that.xScaler.toFraction(that.origXScaler.getMaxVisibleRange());
                    var fry1 = that.yScaler.toFraction(that.origYScaler.getMinVisibleRange());
                    var fry2 = that.yScaler.toFraction(that.origYScaler.getMaxVisibleRange());
                    var imW = that.zoompanImage.width-that.scaleMarginX;
                    var imH = that.zoompanImage.height-that.scaleMarginY;
                    ctx.drawImage(that.zoompanImage,
                        that.scaleMarginX, 0,
                        imW, imH,
                        that.scaleMarginX + imW*frx1, imH*(1-fry2),
                        imW*(frx2-frx1), imH*(fry2-fry1)
                    );
                    that.renderScale();
                    that.ThrottledFinishZoomPan();
                }
            }

            that._handleMouseWheel = function (ev) {
                var delta = DQX.getMouseWheelDelta(ev);
                if (delta!=0) {
                    if (delta < 0)//zoom out
                        var scaleFactor = 1.0 / (1.0 + 0.4 * Math.abs(delta));
                    else//zoom in
                        var scaleFactor = 1.0 + 0.4 * Math.abs(delta);
                    var px = that.getEventPosX(ev);
                    var py = that.getEventPosY(ev);
                    that._handleZoom(scaleFactor, px, py);
                    ev.returnValue = false;
                    return false;
                }
            }

            that._handleZoom = function(scaleFactor, px, py) {

                var centerFracX = (px-that.scaleMarginX)*1.0/(that.drawSizeX-that.scaleMarginX);
                var centerFracY = (that.drawSizeY-that.scaleMarginY-py)/(that.drawSizeY-that.scaleMarginY);

                var newXScaler = Scaler(that.xScaler);newXScaler.zoom(scaleFactor, centerFracX);
                var newYScaler = Scaler(that.yScaler);newYScaler.zoom(scaleFactor, centerFracY);

                that._setNewScalers(newXScaler, newYScaler);
            }

            that.panningStart = function(px, py) {
                that._panning_x0 = px;
                that._panning_y0 = py;
                that.origXScaler = Scaler(that.xScaler);
                that.origYScaler = Scaler(that.yScaler);
            };

            that.panningDo = function(px, py) {
                var imW = that.drawSizeX - that.scaleMarginX;
                var imH = that.drawSizeY - that.scaleMarginY;
                var newXScaler = Scaler(that.xScaler);newXScaler.panFraction(-(px-that._panning_x0)/imW);
                var newYScaler = Scaler(that.yScaler);newYScaler.panFraction((py-that._panning_y0)/imH);
                that._panning_x0 = px;
                that._panning_y0 = py;
                that._setNewScalers(newXScaler, newYScaler);
            };

            that.panningStop = function() {
                that.finishZoomPan();
            };



            that.handleTouchStart = function (info, ev) {
                that.panningStart(info.elemX, info.elemY);
            }

            that.handleTouchMove = function (info, ev) {
                that.panningDo(info.elemX, info.elemY);
            }

            that.handleTouchEnd = function (ev) {
                that.panningStop();
            }

            that.handleTouchCancel = function (ev) {
                that.panningStop();
            }

            that.handleTouchClick = function (info, ev) {
                if (that.onMouseClick)
                    that.onMouseClick(ev, info);
            }


            that.handleGestureStart = function (ev) {
                that.previousScale = 1.0;
                that.scaleCenterPosX = that.getEventPosX(ev);
                that.scaleCenterPosY = that.getEventPosY(ev);
            }

            that.handleGestureChange = function (ev) {
                if (ev.scale) {
                    that._handleZoom(ev.scale / that.previousScale, that.scaleCenterPosX, that.scaleCenterPosY);
                    that.previousScale = ev.scale;
                }
            }

            that.handleGestureEnd = function (ev) {
                that.finishZoomPan();
            }




            $('#' + that.clickLayerId).bind('DOMMouseScroll mousewheel', that._handleMouseWheel);
            DQX.augmentTouchEvents(that, that.clickLayerId, true, true);

            return that;
        };
    });