define(["jquery", "DQX/DocEl", "DQX/Msg"],
    function ($, DocEl, Msg, Scroller) {
        var ChannelCanvas = {};



        ChannelCanvas.Base = function (id) {
            if (!id) throw "No channel ID provided";
            var that = {};
            that._myID = id;
            that._height = 120;

            that.getMyPlotter = function () {
                if (!this._myPlotter) throw "Channel is not yet associated to a plotter";
                return this._myPlotter;
            }
            that.getHeight = function () { return this._height; }

            that.getCanvasID = function (ext) {
                return this.getMyPlotter().getSubID() + '_channel_' + this._myID + '_' + ext;
            }

            that.getCanvasElement = function (ext) {
                return $("#" + this.getCanvasID(ext))[0];
            }

            that.renderHtml = function () {
                var wrapper = DocEl.Div();
                wrapper.addStyle("white-space", "nowrap").addStyle("overflow", "hidden");
                var elemLeft = DocEl.Create('canvas', { id: this.getCanvasID('left'), parent: wrapper });
                elemLeft.addAttribute("width", this.getMyPlotter().getLeftWidth());
                elemLeft.addAttribute("height", this._height);
                elemLeft.addStyle('display', 'inline-block');
                elemLeft.setWidthPx(this.getMyPlotter().getLeftWidth()).setHeightPx(that._height);
                var elemCenter = DocEl.Create('canvas', { id: this.getCanvasID('center'), parent: wrapper });
                elemCenter.setCssClass('DQXChannelPlotChannelCenter');
                elemCenter.addAttribute("height", that._height);
                elemCenter.addStyle('display', 'inline-block');
                elemCenter.setWidthPx(10).setHeightPx(that._height);
                var elemRight = DocEl.Create('canvas', { id: this.getCanvasID('right'), parent: wrapper });
                elemRight.addAttribute("width", this.getMyPlotter().getRightWidth());
                elemRight.addAttribute("height", this._height);
                elemRight.addStyle('display', 'inline-block');
                elemRight.setWidthPx(this.getMyPlotter().getRightWidth()).setHeightPx(that._height);
                return wrapper.toString();
            }

            that.postCreateHtml = function () {
                $('#' + this.getCanvasID('center')).mousedown($.proxy(that._onMouseDown, that));
            }

            that.handleResizeX = function (width) {
                var w2 = width - this.getMyPlotter().getLeftWidth() - this.getMyPlotter().getRightWidth();
                $('#' + this.getCanvasID('center')).width(w2);
                this.getCanvasElement('center').width = w2;
            }

            that._onMouseDown = function (ev) {
                $(document).bind("mouseup.ChannelCanvas", $.proxy(that._onMouseUp, that));
                $(document).bind("mousemove.ChannelCanvas", $.proxy(that._onMouseMove, that));
                this.getMyPlotter().handleMouseDown(that, ev, { x: this.getEventPosX(ev), Y: this.getEventPosY(ev) });
                ev.returnValue = false;
                return false;
            }

            that._onMouseUp = function (ev) {
                $(document).unbind("mouseup.ChannelCanvas");
                $(document).unbind("mousemove.ChannelCanvas");
                this.getMyPlotter().handleMouseUp(that, ev, { x: this.getEventPosX(ev), Y: this.getEventPosY(ev) });
                ev.returnValue = false;
                return false;
            }

            that._onMouseMove = function (ev) {
                this.getMyPlotter().handleMouseMove(that, ev, { x: this.getEventPosX(ev), Y: this.getEventPosY(ev) });
                ev.returnValue = false;
                return false;
            }

            //Returns the position X coordinate of an event, relative to the center canvas element
            that.getEventPosX = function (ev) {
                return ev.pageX - $(this.getCanvasElement('center')).offset().left;
            }

            //Returns the position Y coordinate of an event, relative to the center canvas element
            that.getEventPosY = function (ev) {
                return ev.pageY - $(this.getCanvasElement('center')).offset().top;
            }


            that.drawStandardGradientCenter = function (drawInfo) {
                var backgrad = drawInfo.centerContext.createLinearGradient(0, 0, 0, drawInfo.sizeY);
                backgrad.addColorStop(0, "rgb(255,255,255)");
                backgrad.addColorStop(1, "rgb(210,210,210)");
                drawInfo.centerContext.fillStyle = backgrad;
                drawInfo.centerContext.fillRect(0, 0, drawInfo.sizeCenterX, drawInfo.sizeY);
            }

            that.drawStandardGradientLeft = function (drawInfo) {
                var backgrad = drawInfo.leftContext.createLinearGradient(0, 0, 0, drawInfo.sizeY);
                backgrad.addColorStop(0, "rgb(230,230,230)");
                backgrad.addColorStop(1, "rgb(180,180,180)");
                drawInfo.leftContext.fillStyle = backgrad;
                drawInfo.leftContext.fillRect(0, 0, drawInfo.sizeLeftX, drawInfo.sizeY);
            }

            that.drawStandardGradientRight = function (drawInfo) {
                if (drawInfo.sizeRightX > 2) {
                    var backgrad = drawInfo.rightContext.createLinearGradient(0, 0, 0, drawInfo.sizeY);
                    backgrad.addColorStop(0, "rgb(230,230,230)");
                    backgrad.addColorStop(1, "rgb(180,180,180)");
                    drawInfo.rightContext.fillStyle = backgrad;
                    drawInfo.rightContext.fillRect(0, 0, drawInfo.sizeRightX, drawInfo.sizeY);
                }
            }

            that.render = function (drawInfo) {
                // X position conversion: X_screen = X_logical * drawInfo._zoomFactX - drawInfo._offsetX
                var locDrawInfo = {
                    offsetX: drawInfo.offsetX,
                    zoomFactX: drawInfo.zoomFactX,
                    HorAxisScaleJumps: drawInfo.HorAxisScaleJumps,
                    leftContext: this.getCanvasElement('left').getContext("2d"),
                    centerContext: this.getCanvasElement('center').getContext("2d"),
                    rightContext: this.getCanvasElement('right').getContext("2d"),
                    sizeLeftX: drawInfo.sizeLeftX,
                    sizeCenterX: drawInfo.sizeCenterX,
                    sizeRightX: drawInfo.sizeRightX,
                    sizeY: this._height
                };
                this.draw(locDrawInfo);
            }
            return that;
        }



        ChannelCanvas.XScale = function (id) {
            var that = ChannelCanvas.Base(id);
            that._height = 30;

            that.draw = function (drawInfo) {
                //center background
                var backgrad = drawInfo.centerContext.createLinearGradient(0, 0, 0, drawInfo.sizeY);
                backgrad.addColorStop(0, "rgb(180,180,180)");
                backgrad.addColorStop(1, "rgb(120,120,120)");
                drawInfo.centerContext.fillStyle = backgrad;
                drawInfo.centerContext.fillRect(0, 0, drawInfo.sizeCenterX, drawInfo.sizeY);

                var backgrad = drawInfo.leftContext.createLinearGradient(0, 0, 0, drawInfo.sizeY);
                backgrad.addColorStop(0, "rgb(150,150,150)");
                backgrad.addColorStop(1, "rgb(100,100,100)");
                drawInfo.leftContext.fillStyle = backgrad;
                drawInfo.leftContext.fillRect(0, 0, drawInfo.sizeLeftX, drawInfo.sizeY);

                drawInfo.centerContext.fillStyle = "black";
                drawInfo.centerContext.font = '10px sans-serif';
                drawInfo.centerContext.textBaseline = 'top';
                drawInfo.centerContext.textAlign = 'center';

                var i1 = Math.round(((-50 + drawInfo.offsetX) / drawInfo.zoomFactX) / drawInfo.HorAxisScaleJumps.Jump1);
                if (i1 < 0) i1 = 0;
                var i2 = Math.round(((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX) / drawInfo.HorAxisScaleJumps.Jump1);

                for (i = i1; i <= i2; i++) {
                    drawInfo.centerContext.beginPath();
                    var value = i * drawInfo.HorAxisScaleJumps.Jump1;
                    var psx = Math.round((value) * drawInfo.zoomFactX - drawInfo.offsetX) + 0.5;
                    if ((psx >= -50) && (psx <= drawInfo.sizeCenterX + 50)) {
                        drawInfo.centerContext.moveTo(psx, 0);
                        drawInfo.centerContext.lineTo(psx, 15);
                        drawInfo.centerContext.strokeStyle = "gray";
                        if (i % drawInfo.HorAxisScaleJumps.JumpReduc == 0) {
                            drawInfo.centerContext.strokeStyle = "black";
                            drawInfo.centerContext.fillText((value / 1.0e6), psx, 15);
                        }
                        drawInfo.centerContext.stroke();
                    }
                }
            }

            return that;
        }



        return ChannelCanvas;
    });
