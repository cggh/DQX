/************************************************************************************************************************************
 *************************************************************************************************************************************

 A FramePanel that implements a html Canvas drawing area

 *************************************************************************************************************************************
 *************************************************************************************************************************************/

define(["jquery", "DQX/Utils", "DQX/DocEl", "DQX/Msg", "DQX/FramePanel"],
    function ($, DQX, DocEl, Msg, FramePanel) {
        return function (iid, iParentRef) {
            var that = FramePanel(iid, iParentRef);


            that._panelfirstRendered = false;
            that._toolTipInfo = { ID: null };
            that._directRedraw = true;

            that._canvasLayerIds = ['main','selection'];
            that._canvasLayerMap = {};
            $.each(that._canvasLayerIds, function(idx,id) {
                that._canvasLayerMap[id]={};
            })

            that.canvasBaseId = 'CNV_'+that.getDivID()+'_';

            //If set to false, the canvas is not redrawn during resizing actions
            that.setDirectDedraw = function(newStatus) {
                that._directRedraw = newStatus;
            }


            that.getCanvasID = function(layerid) {
                if (!(layerid in that._canvasLayerMap))
                    DQX.reportError('Invalid canvas id: '+layerid);
                return that.canvasBaseId+'_'+layerid;
            };

            that.getMyCanvasElement = function (layerid) {
                return $("#" + that.getCanvasID(layerid))[0];
            }

            that.render = function () {
                var ctx = that.getMyCanvasElement('main').getContext("2d");
                ctx.fillStyle="#FFFFFF";
                ctx.fillRect(0, 0, that._cnvWidth,that._cnvHeight);
                var drawInfo = {
                    ctx: ctx,
                    sizeX: that._cnvWidth,
                    sizeY: that._cnvHeight
                };
                that.draw(drawInfo);
            }

            // Override this function
            that.draw = function(drawInfo) {
                drawInfo.ctx.beginPath();
                drawInfo.ctx.moveTo(0, 0);
                drawInfo.ctx.lineTo(drawInfo.sizeX, drawInfo.sizeY);
                drawInfo.ctx.stroke();
            };

            // Override this function. Return a object with members ID, px,py, content
            that.getToolTipInfo = function (px, py) {
                return null;
            }

            // Override this function to get informed about clicks
            that.onMouseClick = function(ev, info) {}


            // Override
            that.onSelected = function(minX, minY, maxX, maxY, shiftPressed, controlPressed, altPressed) {}



            //Returns the position X coordinate of an event, relative to the center canvas element
            that.getEventPosX = function (ev) {
                var ev1 = ev;
                if (ev.originalEvent)
                    ev1 = ev.originalEvent;
                return ev1.pageX - $(that.getMyCanvasElement('main')).offset().left;
            }

            //Returns the position Y coordinate of an event, relative to the center canvas element
            that.getEventPosY = function (ev) {
                var ev1 = ev;
                if (ev.originalEvent)
                    ev1 = ev.originalEvent;
                return ev1.pageY - $(that.getMyCanvasElement('main')).offset().top;
            }

            that.posXCanvas2Screen = function (px) {
                return px + $(that.getMyCanvasElement('main')).offset().left;
            }

            that.posYCanvas2Screen = function (py) {
                return py + $(that.getMyCanvasElement('main')).offset().top;
            }



            that._onMouseClick = function(ev) {
                if (!that._hasMouseMoved)
                    that.onMouseClick(ev, { x: that.getEventPosX(ev), y: that.getEventPosY(ev), pageY: ev.pageY });
            };

            that._onMouseDown = function(ev) {
                $(document).bind("mouseup.FrameCanvas", that._onMouseDragUp);
                $(document).bind("mousemove.FrameCanvas", that._onMouseDragMove);
                that.hideToolTip();
                that.dragging = true;
                that._hasMouseMoved = false;
                that.dragX0 = that.getEventPosX(ev);
                that.dragY0 = that.getEventPosY(ev);
                that.dragX1 = that.dragX0;
                that.dragY1 = that.dragY0;
                ev.returnValue = false;
                return false;
            };

            that._onMouseDragUp = function (ev) {
                $(document).unbind("mouseup.FrameCanvas");
                $(document).unbind("mousemove.FrameCanvas");
                that.dragging = false;
                ev.returnValue = false;
                if (that._hasMouseMoved) {
                    var selCanvas = that.getMyCanvasElement('selection');
                    var ctx = selCanvas.getContext("2d");
                    ctx.clearRect(0, 0, selCanvas.width, selCanvas.height);
                    that.onSelected(Math.min(that.dragX0,that.dragX1), Math.min(that.dragY0,that.dragY1), Math.max(that.dragX0,that.dragX1), Math.max(that.dragY0,that.dragY1),
                        ev.shiftKey,
                        ev.ctrlKey,
                        ev.altKey);
                }
                return false;
            }

            that._drawSelRect = function() {
                var selCanvas = that.getMyCanvasElement('selection');
                var ctx = selCanvas.getContext("2d");
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, selCanvas.width, selCanvas.height);
                ctx.fillStyle='rgba(255,0,0,0.1)';
                ctx.strokeStyle='rgba(255,0,0,0.5)';
                ctx.beginPath();
                ctx.moveTo(that.dragX0, that.dragY0);
                ctx.lineTo(that.dragX0, that.dragY1);
                ctx.lineTo(that.dragX1, that.dragY1);
                ctx.lineTo(that.dragX1, that.dragY0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                //ctx.fillRect(that.dragX0, that.dragY0, that.dragX1 - that.dragX0, that.dragY1 - that.dragY0);
            }


            that._onMouseDragMove = function (ev) {
                //this.getMyPlotter().handleMouseMove(that, ev, { x: this.getEventPosX(ev), channelY: this.getEventPosY(ev), pageY: ev.pageY });
                that.dragX1 = that.getEventPosX(ev);
                that.dragY1 = that.getEventPosY(ev);
                if (Math.abs(that.dragX1 - that.dragX0) + Math.abs(that.dragY1 - that.dragY0) > 5)
                    that._hasMouseMoved = true;
                if (that._hasMouseMoved)
                    that._drawSelRect();
                ev.returnValue = false;
                return false;
            }


            that._onMouseMove = function(ev) {
                var px = that.getEventPosX(ev);
                var py = that.getEventPosY(ev);
                if (!that.dragging) {
                    var newToolTipInfo = that.getToolTipInfo(px, py);
                    var showPointer = false;
                    if (newToolTipInfo) {
                        if (newToolTipInfo.showPointer)
                            showPointer = true;
                        if (that._toolTipInfo.ID != newToolTipInfo.ID) {
                            that.hideToolTip();
                            that._toolTipInfo = newToolTipInfo;
                            var tooltip = DocEl.Div();
                            tooltip.setCssClass("DQXChannelToolTip");
                            tooltip.addStyle("position", "absolute");
                            var screenX = that.posXCanvas2Screen(that._toolTipInfo.px);
                            var screenY = that.posYCanvas2Screen(that._toolTipInfo.py);
                            tooltip.addStyle("left", (screenX + 10) + 'px');
                            tooltip.addStyle("top", (screenY + 10) + 'px');
                            tooltip.addStyle("z-index", '9999999');
                            tooltip.addElem(that._toolTipInfo.content);
                            $('#DQXUtilContainer').append(tooltip.toString());
                            if (that._toolTipInfo.highlightPoint) {
                                var tooltip = DocEl.Div();
                                tooltip.setCssClass("DQXChannelToolTipHighlightPoint");
                                tooltip.addStyle("position", "absolute");
                                tooltip.addStyle("left", (screenX - 5) + 'px');
                                tooltip.addStyle("top", (screenY - 5) + 'px');
                                $('#DQXUtilContainer').append(tooltip.toString());
                            }
                        }
                    }
                    else
                        that.hideToolTip();
                    if (showPointer)
                        $('#' + that.canvasID).css('cursor', 'pointer');
                    else
                        $('#' + that.canvasID).css('cursor', 'auto');
                }
            };

            that._onMouseEnter = function(ev) {};

            that._onMouseLeave = function(ev) {
                that.hideToolTip();
            };


            that.hideToolTip = function () {
                that._toolTipInfo.ID = null;
                $('#DQXUtilContainer').find('.DQXChannelToolTip').remove();
                $('#DQXUtilContainer').find('.DQXChannelToolTipHighlightPoint').remove();
            }


            that.handleResize = function (isDragging) {
                that._cnvWidth = $('#' + that.getDivID()).innerWidth();
                that._cnvHeight = $('#' + that.getDivID()).innerHeight();
                $.each(that._canvasLayerIds, function(idx, layerid) {
                    $('#' + that.getCanvasID(layerid)).width(that._cnvWidth);
                    $('#' + that.getCanvasID(layerid)).height(that._cnvHeight);
                });

                if ((!isDragging) || that._directRedraw) {
                    $.each(that._canvasLayerIds, function(idx, layerid) {
                        that.getMyCanvasElement(layerid).width = that._cnvWidth;
                        that.getMyCanvasElement(layerid).height = that._cnvHeight;
                    });
                    that.render();
                }
            };


            that._cnvWidth = $('#' + that.getDivID()).innerWidth();
            that._cnvHeight = $('#' + that.getDivID()).innerHeight();
            var canvasStr = '';
            $.each(that._canvasLayerIds, function(idx, layerid) {
                var cnv = DocEl.Create('canvas', { id: that.getCanvasID(layerid) });
                cnv.addAttribute("width", that._cnvWidth);
                cnv.addAttribute("height", that._cnvHeight);
                cnv.setWidthPx(that._cnvWidth).setHeightPx(that._cnvHeight);
                cnv.addStyle("position","absolute");
                cnv.addStyle("left","0");
                cnv.addStyle("top","0");
                canvasStr += cnv.toString();
            });
            $('#' + that.getDivID()).html(canvasStr);

            var clickLayerId = that.getCanvasID('selection');
            $('#' + clickLayerId).click($.proxy(that._onMouseClick, that));
            $('#' + clickLayerId).mousedown($.proxy(that._onMouseDown, that));
            $('#' + clickLayerId).mousemove($.proxy(that._onMouseMove, that));
            $('#' + clickLayerId).mouseenter($.proxy(that._onMouseEnter, that));
            $('#' + clickLayerId).mouseleave($.proxy(that._onMouseLeave, that));


            DQX.ExecPostCreateHtml();
            that.myParentFrame.notifyContentChanged();

            return that;
        };
    });