define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/Scroller", "DQX/ChannelCanvas", "DQX/ChannelYVals"],
    function ($, DocEl, Msg, Scroller, ChannelCanvas, ChannelYVals) {
        var ChannelPlotter = {};




        ChannelPlotter.Plotter = function (iDivID, args) {
            var that = {};
            that._leftWidth = 120;
            that._rightWidth = 50;
            that._headerHeight = 30;
            that._footerHeight = 40;
            that._navigatorHeight = 30;
            that._myDivID = iDivID;
            that._channels = [];
            that._idChannelMap = {};
            if ($('#' + that._myDivID).length == 0) throw "Invalid Gui component " + iid;
            //some internal stuff
            that._offsetX = 0
            that._BaseZoomFactX = 1.0 / 50000.0;
            that._MaxZoomFactX = 1.0 / 30.0;
            that._fullRangeMin = -0.25E6; //start point of the full x range
            that._fullRangeMax = 250.0E6; //end point of the full x range
            that._zoomFactX = that._BaseZoomFactX;

            that.getSubID = function (ext) { return that._myDivID + ext; }
            that.getElemJQ = function (ext) { return $('#' + this.getSubID(ext)); }

            that.getLeftWidth = function () { return that._leftWidth; }
            that.getRightWidth = function () { return that._rightWidth; }

            that.addChannel = function (channel) {
                if (channel._myID in that._idChannelMap) throw "Channel id already present: " + channel._myID;
                this._channels.push(channel);
                that._idChannelMap[channel._myID] = channel;
                channel._myPlotter = this;
                this.getElemJQ('Body').append(channel.renderHtml());
                channel.postCreateHtml();
            }

            //////////////////////////////////////////////////////////////////////////////////////////
            // Create basic html emelents
            //////////////////////////////////////////////////////////////////////////////////////////
            var html = '';
            {//Create header
                var header = DocEl.Div({ id: that.getSubID("Header") });
                header.addStyle("white-space", "nowrap").addStyle("overflow", "hidden");
                header.setWidthFull();
                header.setCssClass('DQXLight');
                header.addStyle('overflow', 'hidden');
                //header.addStyle('padding-bottom', '5px');
                html += header;
            }
            {//Create body
                var body = DocEl.Div({ id: that.getSubID("Body") });
                body.setWidthFull();
                body.addStyle('overflow-x', 'hidden');
                body.addStyle('overflow-y', 'scroll');
                html += body;
            }
            {//Create navigator (scrollbar & zoomslider)
                var el = DocEl.Div({ id: that.getSubID("Navigator") });
                el.setWidthFull();
                el.addStyle("white-space", "nowrap").addStyle("overflow", "hidden");
                var scroll = DocEl.Create('canvas', { parent: el, id: that.getSubID("HScroller") });
                scroll.setWidthPx(10).addAttribute("height", that._navigatorHeight);
                scroll.setWidthPx(10).setHeightPx(that._navigatorHeight);
                html += el;
            }
            {//Create footer
                var footer = DocEl.Div({ id: that.getSubID("Footer") });
                footer.setWidthFull();
                footer.setCssClass('DQXLight');
                footer.addStyle('overflow', 'hidden');
                html += footer;
            }
            that.getElemJQ('').html(html);

            that._myNavigator = Scroller.HScrollBar(that.getSubID("HScroller"));
            that._myNavigator.myConsumer = that;

            //add some random channels
            for (var i = 0; i < 10; i++) {
                that.addChannel(ChannelYVals.Channel('n' + i));
                that.addChannel(ChannelCanvas.XScale('id' + i));
            }


            ///////////////////////////////////////////////////////////////////////////////////////////////////////
            // Some internally used functions
            ///////////////////////////////////////////////////////////////////////////////////////////////////////

            //sets the position and width
            that.setPosition = function (centerpos, width) {
                this._zoomFactX = this.sizeX / width;
                this._offsetX = (centerpos - 0.5 * width) * this._zoomFactX;
                this.render();
                this.updateNavigator();
            }

            //Converts canvas screen X coordinate to logical X coordinate
            that.screenPos2XVal = function (ScreenPosX) {
                return (ScreenPosX + this._offsetX) / this._zoomFactX;
            }

            //Updates the navigator
            that.updateNavigator = function () {
                var ps1 = (this.screenPos2XVal(0) - this._fullRangeMin) / (this._fullRangeMax - this._fullRangeMin);
                var ps2 = (this.screenPos2XVal(this._sizeX) - this._fullRangeMin) / (this._fullRangeMax - this._fullRangeMin);
                this._myNavigator.setRange(this._fullRangeMin / 1.0e6, this._fullRangeMax / 1.0e6);
                this._myNavigator.setValue(ps1, ps2 - ps1);
            }

            //responds to a navigator notification
            that.scrollTo = function (fraction) {
                var psx = this._fullRangeMin + fraction * (this._fullRangeMax - this._fullRangeMin);
                this._offsetX = psx * this._zoomFactX;
                this.render();
            }

            //responds to a navigator notification
            that.zoomScrollTo = function (scrollPosFraction, scrollSizeFraction) {
                this._zoomFactX = this._sizeX / ((this._fullRangeMax - this._fullRangeMin) * scrollSizeFraction);
                var psx = this._fullRangeMin + scrollPosFraction * (this._fullRangeMax - this._fullRangeMin);
                this._offsetX = psx * this._zoomFactX;
                this.render();
            }

            that.clipViewRange = function (ev) {
                this._zoomFactX = Math.max(this._zoomFactX, this._sizeX / (this._fullRangeMax - this._fullRangeMin));
                this._offsetX = Math.min(this._fullRangeMax * this._zoomFactX - this._sizeX, this._offsetX);
                this._offsetX = Math.max(this._fullRangeMin * this._zoomFactX, this._offsetX);
            }


            that.handleMouseDown = function (channel, ev, args) {
                this._mousePressX0 = args.x;
                this._mousePressY0 = args.y;
                this._hasMouseMoved = false;
                this._dragging = false;
                this._mousemarking = false;
                if (!ev.ctrlKey) {
                    //                    $(this.canvasCenterElement).css('cursor', 'col-resize');
                    this._dragging = true;
                    this._dragstartoffset = this._offsetX;
                    this._dragstartx = args.x;
                    this._lastmouseposx = args.x;
                }
                else {
                    this.mousemarking = true;
                    this._markPresent = false;
                    this._markPos1 = this.screenPos2XVal(this.getEventPosX(ev));
                    this._markPos2 = this.markPos1;
                    this.render();
                }
            }

            that.handleMouseUp = function (channel, ev, args) {
            }

            that.handleMouseMove = function (channel, ev, args) {
                var mousePressX1 = args.x;
                var mousePressY1 = args.y;
                if (Math.abs(mousePressX1 - this._mousePressX0) + Math.abs(mousePressY1 - this._mousePressY0) > 5)
                    this._hasMouseMoved = true;

                if (this._dragging) {
                    var mouseposx = args.x;
                    this._offsetX = this._dragstartoffset - (mouseposx - this._dragstartx);
                    this.clipViewRange();
                    //this.delToolTip();
                    this.updateNavigator();
                    this.render();
                    this._lastmouseposx = mouseposx;
                }
                if (this.mousemarking) {
                    this._markPos2 = this.screenPos2XVal(mousePressX1);
                    this._markPresent = true;
                    this.delToolTip();
                    this.render();
                }
            }

            that.handleMouseWheel = function (ev) {
                if (this._channels[0].length == 0) return;
                var PosX = this._channels[0].getEventPosX(ev);//a dirty solution to find the offset inside a center panel of a channel
                var delta = DQX.getMouseWheelDelta(ev);

                var dff = 1.3 * Math.abs(delta); //unit zoom factor

                if (delta < 0) {//zoom out
                    this._offsetX = this._offsetX / dff - PosX * (dff - 1) / dff;
                    this._zoomFactX /= dff;
                }
                else {//zoom in
                    dff = Math.min(dff, this._MaxZoomFactX / this._zoomFactX);
                    this._offsetX = this._offsetX * dff + PosX * (dff - 1);
                    this._zoomFactX *= dff;
                }
                this.clipViewRange();
                //this.delToolTip();
                this.updateNavigator();
                this.render();
                ev.returnValue = false;
                return false;
            }


            that.render = function () {
                var drawInfo = {
                    offsetX: this._offsetX,
                    zoomFactX: this._zoomFactX,
                    sizeX: this._sizeX,
                    HorAxisScaleJumps: DQX.DrawUtil.getScaleJump(20 / this._zoomFactX)
                };
                for (var i = 0; i < this._channels.length; i++)
                    this._channels[i].render(drawInfo);
                this._myNavigator.draw();
            }

            that.handleResize = function () {
                var W = this.getElemJQ('').innerWidth();
                var H = this.getElemJQ('').innerHeight();
                this._sizeX = W;
                this.getElemJQ('Header').height(this._headerHeight);
                this.getElemJQ('Body').height(H - this._headerHeight - this._footerHeight - this._navigatorHeight);
                this.getElemJQ('Footer').height(this._footerHeight);
                that._myNavigator.resize(W);

                for (var i = 0; i < this._channels.length; i++)
                    this._channels[i].handleResizeX(W - DQX.scrollBarWidth);

                this.render();
            };

            //some final code that needs to run after the functions are defined
            $('#' + that.getSubID("Body")).find(".DQXChannelPlotChannelCenter").bind('DOMMouseScroll mousewheel', $.proxy(that.handleMouseWheel, that));

            return that;
        }



        return ChannelPlotter;
    });
