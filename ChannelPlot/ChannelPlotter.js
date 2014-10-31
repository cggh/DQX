// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

/************************************************************************************************************************************
/************************************************************************************************************************************
*************************************************************************************************************************************



*************************************************************************************************************************************
*************************************************************************************************************************************/

define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/FramePanel", "DQX/Scroller", "DQX/ChannelPlot/ChannelCanvas", "DQX/ChannelPlot/ChannelYVals"],
    function ($, DocEl, Msg, FramePanel, Scroller, ChannelCanvas, ChannelYVals) {
        var ChannelPlotter = {};




        ChannelPlotter.Panel = function (iParentRef, args) {
            var that = FramePanel(iParentRef);
            that._leftWidth = 140;
            if ('leftWidth' in args) that._leftWidth = args.leftWidth;
            that._rightWidth = 0; //size of the right side panel
            that._rightOffset = 0; //size of the right offset, including e.g. area for vertical scroll bars

            that.scaleConversionFactor = 1.0e6;

            that.hasIntegralPositions = false;

            that._headerHeight = 30;
            that._hasHeader = true;
            if ('hasHeader' in args)
                that._hasHeader = args.hasHeader;
            if (!that._hasHeader)
                that._headerHeight = 0;

            that._footerHeight = 32;
            that._hasFooter = true;
            if ('hasFoother' in args)
                that._hasFooter = args.hasFoother;
            if (!that._hasFoother)
                that._footerHeight = 0;

            that._hasXScale = true;
            if ('hasXScale' in args)
                that._hasXScale = args.hasXScale;

            that._navigatorHeight = 25;
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

            that.getRightOffset = function () { return that._rightOffset; }


            // maxZoomFactor is defined as 1/(minimum fraction of the full range that should be in the viewport)
            that.setRange = function(rangeMin, rangeMax, maxZoomFactor) {
                if (!this._sizeCenterX)
                    DQX.reportError('Not initialised');
                that._fullRangeMin = rangeMin;
                that._fullRangeMax = rangeMax;
                that._offsetX = 0;
                that._zoomFactX = this._sizeCenterX / ((this._fullRangeMax - this._fullRangeMin));
                if (maxZoomFactor) {
                    that._MaxZoomFactX = maxZoomFactor;
                    that.getNavigator().setMinScrollSize(1.0/that._MaxZoomFactX);
                }
                that.render();
                that.updateNavigator();
            };

            that.addChannel = function (channel, onTop) {
                if (onTop)
                    channel._isOnTopPart = true;
                if (channel._myID in that._idChannelMap) DQX.reportError("Channel id already present: " + channel._myID);
                this._channels.push(channel);
                that._idChannelMap[channel._myID] = channel;
                if ('_setPlotter' in channel)
                    channel._setPlotter(this);
                channel._myPlotter = this;
                this.getElemJQ(onTop ? 'BodyFixed' : 'BodyScroll').append(channel.renderHtml());
                channel.postCreateHtml();
                $('#' + channel.getCenterElementID()).bind('DOMMouseScroll mousewheel', $.proxy(that.handleMouseWheel, that));
                channel.setPlotter(this);
                this._rightWidth = Math.max(this._rightWidth, channel.getRequiredRightWidth());
                if (channel.needVScrollbar())
                    this._rightOffset = Scroller.vScrollWidth;
            }

            that.getChannelList = function() {
                return that._channels;

            }

            that.findChannel = function (id) {
                return that._idChannelMap[id];
            }

            that.findChannelRequired = function (id) {
                rs = that._idChannelMap[id];
                if (!rs)
                    DQX.reportError("Invalid channel " + id);
                return rs;
            }

            that.delChannel =function(id) {
                 if (id in that._idChannelMap) {
                     var nr =-1;
                     $.each(that._channels,function(idx,cha) {
                         if (cha._myID==id)
                            nr=idx;
                     })


                     var channelid = that._idChannelMap[id].getCanvasID('wrapper');
                     this.getElemJQ('Body').find('#'+channelid).remove();

                     that._channels.splice(nr,1);
                     delete that._idChannelMap[id];
                }
            }

            //Call this function to define a notification function called when the user selects a range
            that.setOnRangeSelected = function(handler) {
                that._onRangeSelected = handler;
            }

            that.handleScrollBar = function() {
                if (!that.suppressScrollEvent) {
                    that.hideToolTip();
                    that.render();
                }
                that.suppressScrollEvent = false;
            };


            //////////////////////////////////////////////////////////////////////////////////////////
            // Create basic html emelents
            //////////////////////////////////////////////////////////////////////////////////////////
            var html = '';
            {//Create header
                var header = DocEl.Div({ id: that.getSubID("Header") });
                header.addStyle("white-space", "nowrap").addStyle("overflow", "hidden");
                header.setWidthFull();
                header.setCssClass('DQXButtonBar');
                header.addStyle('overflow', 'hidden');
                html += header;
            }
            {//Create navigator (scrollbar & zoomslider)
                var el = DocEl.Div({ id: that.getSubID("Navigator") });
                el.setWidthFull();
                el.addStyle("white-space", "nowrap").addStyle("overflow", "hidden");
                var scroll = DocEl.Create('canvas', { parent: el, id: that.getSubID("HScroller") });
                scroll.setWidthPx(10).addAttribute("height", that._navigatorHeight-2);
                scroll.setWidthPx(10).setHeightPx(that._navigatorHeight-2);
                scroll.addStyle('border-top', '1px solid rgb(192,192,192)');
                scroll.addStyle('border-bottom', '1px solid rgb(192,192,192)');
                html += el;
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
            {//Create footer
                var footer = DocEl.Div({ id: that.getSubID("Footer") });
                footer.setWidthFull();
                footer.setCssClass('DQXLight2');
                footer.addStyle('overflow', 'hidden');
                html += footer;
            }
            that.getElemJQ('').html(html);
            that.getElemJQ('BodyScroll').scroll(that.handleScrollBar);

            that._myNavigator = Scroller.HScrollBar(that.getSubID("HScroller"));
            that._myNavigator.myConsumer = that;


            ///////////////////////////////////////////////////////////////////////////////////////////////////////
            //Add a DataFetcher object to the plot
            that.addDataFetcher = function (idatafetcher) {
                var isPresent=false;
                $.each(this._myDataFetchers,function(idx,fetcher) {
                    if (fetcher===idatafetcher)
                        isPresent=true;
                })
                if (!isPresent)
                    this._myDataFetchers.push(idatafetcher);
                idatafetcher.myDataConsumer = this;
                if (this._chromosomes[this.currentChromoNr - 1])
                    idatafetcher.setChromoID(this._chromosomes[this.currentChromoNr - 1].id);
            }


            that.delDataFetcher = function (idatafetcher) {
                var nr=-1;
                $.each(this._myDataFetchers,function(idx,fetcher) {
                    if (fetcher===idatafetcher)
                        nr = idx;
                })
                if (nr>=0) {
                    idatafetcher.myDataConsumer = null;
                    this._myDataFetchers.splice(nr,1);
                }
            }


            that.channelModifyVisibility = function (channelID, newStatus, preventReDraw) {
                var theChannel = this._idChannelMap[channelID];
                if (!theChannel) DQX.reportError("Invalid channel id " + channelID);
                if (newStatus!=theChannel.getVisible()) {
                    theChannel._setVisible(newStatus);
                    if (!preventReDraw) {
                        this.render();
                    }
                }
            }

            that.channelScrollInView = function(channelID) {
                if (that.recallingSettings)
                    return;
                that.channelScrollInViewThrottled(channelID);
            };

            that.channelScrollInViewThrottled = DQX.debounce(function(channelID) {
                var theChannel = this._idChannelMap[channelID];
                if (!theChannel) DQX.reportError("Invalid channel id " + channelID);
                var trackTopOffset = $('#' + theChannel.getCanvasID('wrapper')).offset().top
                    - that.getElemJQ('BodyScroll').offset().top;
                var scrollPos = that.getElemJQ('BodyScroll').scrollTop();
                var trackH = $('#' + theChannel.getCanvasID('wrapper')).height();
                var containerH = that.getElemJQ('BodyScroll').height();
                if (trackTopOffset<0) {
                    that.getElemJQ('BodyScroll').scrollTop(trackTopOffset+scrollPos);
                } else if (trackTopOffset+trackH>containerH) {
                    that.getElemJQ('BodyScroll').scrollTop(Math.min(
                        trackTopOffset+scrollPos-containerH+trackH,
                        trackTopOffset+scrollPos
                    ));
                }
            }, 200);

            ///////////////////////////////////////////////////////////////////////////////////////////////////////
            // Some internally used functions
            ///////////////////////////////////////////////////////////////////////////////////////////////////////

            that._notifyZoomChanged = function () {
                Msg.broadcast({ type: 'ZoomFactorXChanged', id: that.myID });
            }

            //sets the position and width
            that.setPosition = function (centerpos, width) {
                var viewPortWidth = this.getViewPortWidth();
                if (viewPortWidth > 0) {
                    var oldZoomFactor = this._zoomFactX;
                    this._zoomFactX = viewPortWidth / width;
                    if (Math.abs(this._zoomFactX - oldZoomFactor) > 1E-6 * this._zoomFactX) this._notifyZoomChanged();
                    this._offsetX = (centerpos - 0.5 * width) * this._zoomFactX;
                    this.render();
                    this.updateNavigator();
                }
            }

            //sets the position and width
            that.getPosition = function (centerpos, width) {
                var rs = {};
                rs.left = this._offsetX / this._zoomFactX;
                var viewPortWidth = this.getViewPortWidth();
                if (viewPortWidth > 0) {
                    rs.right = (this._offsetX+viewPortWidth) / this._zoomFactX;
                }
                return rs;
            }


            //Converts canvas screen X coordinate to logical X coordinate
            that.screenPos2XVal = function (ScreenPosX) {
                return (ScreenPosX + this._offsetX) / this._zoomFactX;
            }

            that.getNavigator = function () {
                return this._myNavigator;
            }

            that.getVisibleRange = function() {
                return {
                    min : (this._offsetX) / this._zoomFactX,
                    max : (this._sizeCenterX + this._offsetX) / this._zoomFactX
                }
            }

            //Updates the navigator
            that.updateNavigator = function () {
                if (!this._sizeCenterX) return; //not yet initialised
                var ps1 = (this.screenPos2XVal(0) - this._fullRangeMin) / (this._fullRangeMax - this._fullRangeMin);
                var ps2 = (this.screenPos2XVal(this._sizeCenterX) - this._fullRangeMin) / (this._fullRangeMax - this._fullRangeMin);
                this._myNavigator.setRange(this._fullRangeMin / that.scaleConversionFactor, this._fullRangeMax / that.scaleConversionFactor);
                this._myNavigator.setValue(ps1, ps2 - ps1);
                if (!this._preventSendPositionChangeNotification)
                    Msg.broadcast({ type: 'PosOrZoomFactorXChanged', id: that.myID });
            }

            //responds to a navigator notification
            that.scrollTo = function (fraction) {
                var psx = this._fullRangeMin + fraction * (this._fullRangeMax - this._fullRangeMin);
                this._offsetX = psx * this._zoomFactX;
                this.render();
                if (!this._preventSendPositionChangeNotification)
                    Msg.broadcast({ type: 'PosOrZoomFactorXChanged', id: that.myID });
            }

            //responds to a navigator notification
            that.zoomScrollTo = function (scrollPosFraction, scrollSizeFraction) {
                if (!this._sizeCenterX) return; //not yet initialised
                var oldZoomFactor = this._zoomFactX;
                this._zoomFactX = this._sizeCenterX / ((this._fullRangeMax - this._fullRangeMin) * scrollSizeFraction);
                if (Math.abs(this._zoomFactX - oldZoomFactor) > 1E-6 * this._zoomFactX) this._notifyZoomChanged();
                var psx = this._fullRangeMin + scrollPosFraction * (this._fullRangeMax - this._fullRangeMin);
                this._offsetX = psx * this._zoomFactX;
                this.render();
                if (!this._preventSendPositionChangeNotification)
                    Msg.broadcast({ type: 'PosOrZoomFactorXChanged', id: that.myID });
            }

            that.clipViewRange = function (ev) {
                this._zoomFactX = Math.max(this._zoomFactX, this._sizeCenterX / (this._fullRangeMax - this._fullRangeMin));
                this._offsetX = Math.min(this._fullRangeMax * this._zoomFactX - this._sizeCenterX, this._offsetX);
                this._offsetX = Math.max(this._fullRangeMin * this._zoomFactX, this._offsetX);
            }


            that.handleMouseDown = function (channel, ev, args) {
                this._mousePressX0 = args.x;
                this._mousePressY0 = args.pageY;
                this._hasMouseMoved = false;
                this._dragging = false;
                this._mousemarking = false;
                if (!ev.shiftKey && (!this.isSelecting) ) {
                    //                    $(this.canvasCenterElement).css('cursor', 'col-resize');
                    this._dragging = true;
                    this._dragstartoffsetX = this._offsetX;
                    this._dragstartx = args.x;
                    this._dragstartoffsetY = this.getElemJQ("BodyScroll").scrollTop();
                    this._dragstarty = args.pageY;
                    this._lastmouseposx = args.x;
                }
                else {
                    this._mousemarking = true;
                    this._markPresent = false;
                    var posx = this.screenPos2XVal(args.x);
                    if (channel.mapPositionsReverse)
                        posx = channel.mapPositionsReverse(posx);
                    this._markPos1 = posx;
                    this._markPos2 = this.markPos1;
                    this.render();
                }
            }

            that.handleMouseUp = function (channel, ev, args) {
                if (that._mousemarking && that._onRangeSelected) {
                    that._onRangeSelected();
//                    if (that._onToggleSelection && that.isSelecting) {
//                        that._onToggleSelection();
//                    }
                }
            }

            that.handleMouseMove = function (channel, ev, args) {
                var mousePressX1 = args.x;
                var mousePressY1 = args.pageY;
                if (Math.abs(mousePressX1 - this._mousePressX0) + Math.abs(mousePressY1 - this._mousePressY0) > 5)
                    this._hasMouseMoved = true;

                if (this._dragging) {
                    var mouseposx = args.x;
                    this._offsetX = this._dragstartoffsetX - (mouseposx - this._dragstartx);
                    this.clipViewRange();
                    //this.delToolTip();
                    if (args.pageY != this._dragstarty)
                        that.suppressScrollEvent = true;
                    this.getElemJQ("BodyScroll").scrollTop(this._dragstartoffsetY - (args.pageY - this._dragstarty))
                    this.updateNavigator();
                    this.render();
                    this._lastmouseposx = mouseposx;
                }
                if (this._mousemarking) {
                    var posx = this.screenPos2XVal(mousePressX1);
                    if (channel.mapPositionsReverse)
                        posx = channel.mapPositionsReverse(posx);
                    this._markPos2 = posx;
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
                if (delta!=0) {
                    if (delta < 0)//zoom out
                        var scaleFactor = 1.0 / (1.0 + 0.4 * Math.abs(delta));
                    else//zoom in
                        var scaleFactor = 1.0 + 0.4 * Math.abs(delta);
                    this.reScale(scaleFactor, PosX);
                    ev.returnValue = false;
                    return false;
                }
                var deltaX = DQX.getMouseWheelDeltaX(ev);
                if (deltaX!=0) {
                    this._myNavigator.setValue(Math.max(0, Math.min(1.0 - this._myNavigator.ScrollSize, this._myNavigator.scrollPos - this._myNavigator.ScrollSize * deltaX * 0.07)));
                    this.zoomScrollTo(this._myNavigator.scrollPos, this._myNavigator.ScrollSize);
                    this.render();
                }
            }

            that.reScale = function (scaleFactor, centerPosX) {
                if (!centerPosX) {
                    centerPosX = this.getElemJQ('').innerHeight() / 2.0;
                }
                dff = Math.min(scaleFactor, this._MaxZoomFactX / this._zoomFactX);
                this._offsetX = this._offsetX * dff + centerPosX * (dff - 1);
                var oldZoomFactor = this._zoomFactX;
                this._zoomFactX *= dff;
                this.clipViewRange();
                if (Math.abs(this._zoomFactX - oldZoomFactor) > 1E-6 * this._zoomFactX) this._notifyZoomChanged();
                this.updateNavigator();
                this.render();
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

            that.delMark = function() {
                this._markPresent = false;
                this.render();
            }


            that.getMark = function() {
                if (!this._markPresent)
                    return null;
                return {
                    min:this._markPos1,
                    max:this._markPos2
                };
            }

            that.render = function () {
                if (!this._sizeCenterX) return; //not yet initialised
                var drawInfo = {
                    offsetX: this._offsetX,
                    zoomFactX: this._zoomFactX,
                    sizeLeftX: that._leftWidth,
                    sizeCenterX: this._sizeCenterX,
                    sizeRightX: that.getRightWidth(),
                    mark: { present: this._markPresent, pos1: this._markPos1, pos2: this._markPos2 },
                    HorAxisScaleJumps: DQX.DrawUtil.getScaleJump(30 / this._zoomFactX)
                };

                if (that.hasIntegralPositions) {
                    if (drawInfo.HorAxisScaleJumps.Jump1<1) {
                        drawInfo.HorAxisScaleJumps.Jump1 = 1;
                        drawInfo.HorAxisScaleJumps.JumpReduc = 5;
                    }
                }

                if (this._myNavigator)
                    drawInfo.rightSideNotComplete = this._myNavigator.canScrollRight();
                for (var i = 0; i < this._channels.length; i++)
                    this._channels[i].render(drawInfo);
                this._myNavigator.draw();
            }

            that.getViewPortWidth = function () {
                return this._sizeX;
            }

            that.getZoomFactorX = function () {
                return this._zoomFactX;
            };

            that.resizeHeight = function (rerender) {
                var H = this.getElemJQ('').innerHeight();
                var bodyH = H - this._headerHeight - this._footerHeight - this._navigatorHeight;

                //determine height of auto-fill channels
                var autoHeightChannelCount = 0;
                for (var i = 0; i < this._channels.length; i++)
                    if (this._channels[i].getAutoFillHeight())
                        autoHeightChannelCount++;
                if (autoHeightChannelCount > 0) {
                    //measure total height of fixed channels
                    var fixedChannelHeight = 0
                    for (var i = 0; i < this._channels.length; i++)
                        if (!this._channels[i].getAutoFillHeight())
                            fixedChannelHeight += this._channels[i].getHeight();
                    var autoChannelH = (bodyH - fixedChannelHeight) / autoHeightChannelCount;
                }

                //measure total height of nonscrolling channels
                var nonScrollChannelHeight = 0
                var hasScrollChannels = false;
                for (var i = 0; i < this._channels.length; i++) {
                    if (this._channels[i]._isOnTopPart) {
                        if (!this._channels[i].getAutoFillHeight())
                            nonScrollChannelHeight += this._channels[i].getHeight();
                        else
                            nonScrollChannelHeight += autoChannelH;
                    }
                    else {
                        hasScrollChannels = true;
                    }
                }

                if ((autoHeightChannelCount > 0) && (hasScrollChannels))
                    DQX.reportError("Scrolling channels and auto height channels are not compatible");
                this.getElemJQ('Header').height(this._headerHeight);
                this.getElemJQ('Body').height(bodyH);
                this.getElemJQ('Footer').height(this._footerHeight);
                this.getElemJQ('BodyFixed').height(nonScrollChannelHeight);
                this.getElemJQ('BodyScroll').height(bodyH - nonScrollChannelHeight);
                if (hasScrollChannels)
                    this.getElemJQ('BodyScroll').show();
                else
                    this.getElemJQ('BodyScroll').hide();
                for (var i = 0; i < this._channels.length; i++)
                    if (this._channels[i].getAutoFillHeight())
                        this._channels[i].resizeY(autoChannelH);
                if (rerender) this.render();
            };

            that.resizeWidth = function () {
                var hasScrollChannels = false;
                for (var i = 0; i < this._channels.length; i++) {
                    if (!this._channels[i]._isOnTopPart) {
                        hasScrollChannels = true;
                    }
                }

                var scrollbaroffset = 0;
                if (hasScrollChannels)
                    scrollbaroffset = DQX.scrollBarWidth;

                var W = this.getElemJQ('').innerWidth() - scrollbaroffset;
                if (W < 5) return;
                this._sizeX = W - this._leftWidth - this.getRightWidth() - this.getRightOffset();
                if (this._sizeX < 1) this._sizeX = 1;
                this._sizeCenterX = W - this._leftWidth - this.getRightWidth() - this.getRightOffset();
                if (this._sizeCenterX < 1) this._sizeCenterX = 1;
                that._myNavigator.resize(W + scrollbaroffset);


                for (var i = 0; i < this._channels.length; i++)
                    this._channels[i].handleResizeX(W);

                this._preventSendPositionChangeNotification = true;
                this.zoomScrollTo(this._myNavigator.scrollPos, this._myNavigator.ScrollSize);
                this._preventSendPositionChangeNotification = false;
            };

            that.handleResize = function () {
                that.resizeHeight();
                that.resizeWidth();
                this.render();
            };

            //Add scale channel
            if (that._hasXScale)
                that.addChannel(ChannelCanvas.XScale('_XScale'), true);

            return that;
        }



        return ChannelPlotter;
    });
