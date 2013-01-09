define([DQXJQ(), DQXSC("DocEl"), DQXSC("Msg"), DQXSC("FramePanel"), DQXSC("Scroller"), DQXSC("ChannelPlot/ChannelCanvas"), DQXSC("ChannelPlot/ChannelYVals")],
    function ($, DocEl, Msg, FramePanel, Scroller, ChannelCanvas, ChannelYVals) {
        var ChannelPlotter = {};




        ChannelPlotter.Panel = function (iParentRef, args) {
            var that = FramePanel(iParentRef);
            that._leftWidth = 120;
            that._rightWidth = 10;
            that._headerHeight = 30;
            that._footerHeight = 30;
            that._navigatorHeight = 30;
            that._channels = [];
            that._idChannelMap = {};
            //some internal stuff
            that._offsetX = 0
            that._BaseZoomFactX = 1.0 / 50000.0;
            that._MaxZoomFactX = 1.0 / 30.0;
            that._fullRangeMin = -0.25E6; //start point of the full x range
            that._fullRangeMax = 250.0E6; //end point of the full x range
            that._zoomFactX = that._BaseZoomFactX;
            that._myDataFetchers = [];
            that._sizeCenterX = null; //indicates that panel is not yet initialised

            that.getSubID = function (ext) { return that.getDivID() + ext; }
            that.getElemJQ = function (ext) { return $('#' + this.getSubID(ext)); }

            that.getLeftWidth = function () { return that._leftWidth; }
            that.getRightWidth = function () { return that._rightWidth; }

            that.addChannel = function (channel, onTop) {
                if (onTop)
                    channel._isOnTopPart = true;
                if (channel._myID in that._idChannelMap) throw "Channel id already present: " + channel._myID;
                this._channels.push(channel);
                that._idChannelMap[channel._myID] = channel;
                channel._myPlotter = this;
                this.getElemJQ(onTop ? 'BodyFixed' : 'BodyScroll').append(channel.renderHtml());
                channel.postCreateHtml();
                $('#' + channel.getCenterElementID()).bind('DOMMouseScroll mousewheel', $.proxy(that.handleMouseWheel, that));
                channel.setPlotter(this);
            }

            that.findChannel = function (id) {
                return that._idChannelMap[id];
            }

            that.findChannelRequired = function (id) {
                rs = that._idChannelMap[id];
                if (!rs)
                    throw "Invalid channel " + id;
                return rs;
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
                html += header;
            }
            {//Create body
                var body = DocEl.Div({ id: that.getSubID("Body") });
                body.setWidthFull();
                body.addStyle('overflow', 'hidden');
                {//Create non-scrolling part of body
                    var body1 = DocEl.Div({ id: that.getSubID("BodyFixed"), parent: body });
                    body1.setWidthFull();
                    body1.addStyle('overflow', 'hidden');
                }
                {//Create scrolling part of body
                    var body2 = DocEl.Div({ id: that.getSubID("BodyScroll"), parent: body });
                    body2.setWidthFull();
                    body2.addStyle('overflow-x', 'hidden');
                    body2.addStyle('overflow-y', 'scroll');
                }
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



            ///////////////////////////////////////////////////////////////////////////////////////////////////////
            //Add a DataFetcher object to the plot
            that.addDataFetcher = function (idatafetcher) {
                this._myDataFetchers.push(idatafetcher);
                idatafetcher.myDataConsumer = this;
            }



            that.channelModifyVisibility = function (channelID, newStatus) {
                var theChannel = this._idChannelMap[channelID];
                if (!theChannel) throw "Invalid channel id " + channelID;
                theChannel._setVisible(newStatus);
                this.render();
                //this.handleResize();
            }

            ///////////////////////////////////////////////////////////////////////////////////////////////////////
            // Some internally used functions
            ///////////////////////////////////////////////////////////////////////////////////////////////////////

            //sets the position and width
            that.setPosition = function (centerpos, width) {
                var viewPortWidth = this.getViewPortWidth();
                if (viewPortWidth > 0) {
                    this._zoomFactX = viewPortWidth / width;
                    this._offsetX = (centerpos - 0.5 * width) * this._zoomFactX;
                    this.render();
                    this.updateNavigator();
                }
            }

            //Converts canvas screen X coordinate to logical X coordinate
            that.screenPos2XVal = function (ScreenPosX) {
                return (ScreenPosX + this._offsetX) / this._zoomFactX;
            }

            //Updates the navigator
            that.updateNavigator = function () {
                if (!this._sizeCenterX) return; //not yet initialised
                var ps1 = (this.screenPos2XVal(0) - this._fullRangeMin) / (this._fullRangeMax - this._fullRangeMin);
                var ps2 = (this.screenPos2XVal(this._sizeCenterX) - this._fullRangeMin) / (this._fullRangeMax - this._fullRangeMin);
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
                if (!this._sizeCenterX) return; //not yet initialised
                this._zoomFactX = this._sizeCenterX / ((this._fullRangeMax - this._fullRangeMin) * scrollSizeFraction);
                var psx = this._fullRangeMin + scrollPosFraction * (this._fullRangeMax - this._fullRangeMin);
                this._offsetX = psx * this._zoomFactX;
                this.render();
            }

            that.clipViewRange = function (ev) {
                this._zoomFactX = Math.max(this._zoomFactX, this._sizeCenterX / (this._fullRangeMax - this._fullRangeMin));
                this._offsetX = Math.min(this._fullRangeMax * this._zoomFactX - this._sizeCenterX, this._offsetX);
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
                    this._mousemarking = true;
                    this._markPresent = false;
                    this._markPos1 = this.screenPos2XVal(args.x);
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
                if (this._mousemarking) {
                    this._markPos2 = this.screenPos2XVal(mousePressX1);
                    this._markPresent = true;
                    this.hideToolTip();
                    this.render();
                }
            }

            that.hideToolTip = function () {
                for (var i = 0; i < this._channels.length; i++)
                    this._channels[i].hideToolTip();
            }


            that.handleMouseWheel = function (ev) {
                if (this._channels[0].length == 0) return;
                var PosX = this._channels[0].getEventPosX(ev); //a dirty solution to find the offset inside a center panel of a channel
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

            //Internal: this function is called by e.g. DQX.DataFetcher.Curve class to notify that data is ready and the plot should be redrawn
            that.notifyDataReady = function () {
                this.render();
            }

            //Invalidate all the data downloaded by the plot, forcing a reload upon the next drawing
            that.clearData = function () {
                for (var i = 0; i < this._myDataFetchers.length; i++)
                    this._myDataFetchers[i].clearData();
            }

            that.setMark = function (pos1, pos2) {
                this._markPresent = true;
                this._markPos1 = pos1;
                this._markPos2 = pos2;
                this.render();
            }

            that.render = function () {
                if (!this._sizeCenterX) return; //not yet initialised
                var drawInfo = {
                    offsetX: this._offsetX,
                    zoomFactX: this._zoomFactX,
                    sizeLeftX: that._leftWidth,
                    sizeCenterX: this._sizeCenterX,
                    sizeRightX: that._rightWidth,
                    mark: { present: this._markPresent, pos1: this._markPos1, pos2: this._markPos2 },
                    HorAxisScaleJumps: DQX.DrawUtil.getScaleJump(20 / this._zoomFactX)
                };
                for (var i = 0; i < this._channels.length; i++)
                    this._channels[i].render(drawInfo);
                this._myNavigator.draw();
            }

            that.getViewPortWidth = function () {
                return this._sizeX;
            }

            that.handleResize = function () {
                var W = this.getElemJQ('').innerWidth() - DQX.scrollBarWidth;
                if (W < 5) return;
                var H = this.getElemJQ('').innerHeight();
                var bodyH = H - this._headerHeight - this._footerHeight - this._navigatorHeight;
                this._sizeX = W - this._leftWidth - this._rightWidth;
                if (this._sizeX < 1) this._sizeX = 1;
                this._sizeCenterX = W - this._leftWidth - this._rightWidth;
                if (this._sizeCenterX < 1) this._sizeCenterX = 1;
                this.getElemJQ('Header').height(this._headerHeight);
                this.getElemJQ('Body').height(bodyH);
                this.getElemJQ('Footer').height(this._footerHeight);
                that._myNavigator.resize(W + DQX.scrollBarWidth);

                //measure total height of fixed channels
                var fixedChannelHeight = 0
                for (var i = 0; i < this._channels.length; i++)
                    if (this._channels[i]._isOnTopPart)
                        fixedChannelHeight += this._channels[i].getHeight();
                this.getElemJQ('BodyFixed').height(fixedChannelHeight);
                this.getElemJQ('BodyScroll').height(bodyH - fixedChannelHeight);

                for (var i = 0; i < this._channels.length; i++)
                    this._channels[i].handleResizeX(W);

                this.zoomScrollTo(this._myNavigator.scrollPos, this._myNavigator.ScrollSize);

                this.render();
            };

            //Add scale channel
            that.addChannel(ChannelCanvas.XScale('_XScale'), true);

            return that;
        }



        return ChannelPlotter;
    });
