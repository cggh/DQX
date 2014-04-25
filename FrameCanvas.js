/************************************************************************************************************************************
 *************************************************************************************************************************************

 A FramePanel that implements a html Canvas drawing area

 *************************************************************************************************************************************
 *************************************************************************************************************************************/

define(["jquery", "DQX/Utils", "DQX/DocEl", "DQX/Msg", "DQX/FramePanel"],
    function ($, DQX, DocEl, Msg, FramePanel) {
        return function (iParentRef) {
            var that = FramePanel(iParentRef);


            that._panelfirstRendered = false;
            that._toolTipInfo = { ID: null };
            that._directRedraw = true;
            that._fixedWidth = null; // if this has a non-zero value, specifies a fixed dimension, if null, specifies autoscaling
            that._fixedHeight = null; // if this has a non-zero value, specifies a fixed dimension, if null, specifies autoscaling

            that._dragActionPan = false;

            that.selectionHorOnly = false;//Set to true to have the user (mouse driven) selection restricted to horizontal areas

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

            that.setFixedWidth = function(w) {
                that._fixedWidth = w;
                that.handleResize();
            };

            that.setFixedHeight = function(w) {
                that._fixedHeight = w;
                that.handleResize();
            };


            that.getCanvasID = function(layerid) {
                if (!(layerid in that._canvasLayerMap))
                    DQX.reportError('Invalid canvas id: '+layerid);
                return that.canvasBaseId+'_'+layerid;
            };

            that.getMyCanvasElement = function (layerid) {
                return $("#" + that.getCanvasID(layerid))[0];
            }

            that.render_exec = function () {
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

            that.render = function () {
                if (that._directRedraw)
                    that.render_exec();
                else
                    DQX.executeProcessing(function() { that.render_exec(); });
            }

            that.invalidate = DQX.debounce(that.render, 150);

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
                if ( (!that._hasMouseMoved) && (!that.isSelecting()) )
                    that.onMouseClick(ev, { x: that.getEventPosX(ev), y: that.getEventPosY(ev), pageY: ev.pageY });
            };

            that._onMouseDown = function(ev) {
                if (!that.lassoSelecting) {
                    $(document).bind("mouseup.FrameCanvas", that._onMouseDragUp);
                    $(document).bind("mousemove.FrameCanvas", that._onMouseDragMove);
                    that.hideToolTip();
                    that.dragging = true;
                    that._hasMouseMoved = false;
                    that.dragX0 = that.getEventPosX(ev);
                    that.dragY0 = that.getEventPosY(ev);
                    that.dragX1 = that.dragX0;
                    that.dragY1 = that.dragY0;
                    if (that._dragActionPan && (!ev.shiftKey)) {
                        that.isPanning = true;
                        that.panningStart(that.dragX0, that.dragY0);
                    }
                }
                ev.returnValue = false;
                return false;
            };

            that._onMouseDragUp = function (ev) {
                $(document).unbind("mouseup.FrameCanvas");
                $(document).unbind("mousemove.FrameCanvas");
                that.dragging = false;
                if (that.isPanning) {
                    that.isPanning = false;
                    that.panningStop();
                }
                else {
                    if (that._hasMouseMoved) {
                        var selCanvas = that.getMyCanvasElement('selection');
                        var ctx = selCanvas.getContext("2d");
                        ctx.clearRect(0, 0, selCanvas.width, selCanvas.height);
                        that.onSelected(Math.min(that.dragX0,that.dragX1), Math.min(that.dragY0,that.dragY1), Math.max(that.dragX0,that.dragX1), Math.max(that.dragY0,that.dragY1),
                            ev.shiftKey,
                            ev.ctrlKey,
                            ev.altKey);
                    }
                }
                ev.returnValue = false;
                return false;
            }

            that._drawSelRect = function() {
                var selCanvas = that.getMyCanvasElement('selection');
                var ctx = selCanvas.getContext("2d");
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, selCanvas.width, selCanvas.height);
                ctx.fillStyle='rgba(255,0,0,0.1)';
                ctx.strokeStyle='rgba(255,0,0,0.5)';
                var yp0 = that.dragY0;
                var yp1 = that.dragY1;
                if (that.selectionHorOnly) {
                    yp0 = 0;
                    yp1 = that.getMyCanvasElement('selection').height;
                }
                ctx.beginPath();
                ctx.moveTo(that.dragX0, yp0);
                ctx.lineTo(that.dragX0, yp1);
                ctx.lineTo(that.dragX1, yp1);
                ctx.lineTo(that.dragX1, yp0);
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
                if (that.isPanning) {
                    that.panningDo(that.dragX1, that.dragY1);
                }
                else {
                    if (that._hasMouseMoved)
                        that._drawSelRect();
                }
                ev.returnValue = false;
                return false;
            }

            that.isSelecting = function() {
                return that.dragging || that.lassoSelecting || that.halfPlaneSelecting || that.rectangleSelecting;
            }

            that._onMouseMove = function(ev) {
                var px = that.getEventPosX(ev);
                var py = that.getEventPosY(ev);
                if (!that.isSelecting()) {
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
                    var pointerType = showPointer?"pointer":"auto";
                    $('#' + that.canvasID).css('cursor', pointerType);
                    $('#'+that.getCanvasID('main')).css('cursor', pointerType);
                    $('#'+that.getCanvasID('selection')).css('cursor', pointerType);
                }
            };

            that._onMouseEnter = function(ev) {};

            that._onMouseLeave = function(ev) {
                that.hideToolTip();
            };


            that.startLassoSelection = function(callbackOnComplete) {
                if (that.lassoSelecting)
                    return;
                that.lassoSelecting = true;
                that.lassoSelectingCallbackOnComplete = callbackOnComplete;
                var selPts = [];

                var drawSelArea = function(tempPt) {
                    var selCanvas = that.getMyCanvasElement('selection');
                    var ctx = selCanvas.getContext("2d");
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.clearRect(0, 0, selCanvas.width, selCanvas.height);
                    ctx.fillStyle='rgba(255,0,0,0.1)';
                    ctx.strokeStyle='rgba(255,0,0,0.5)';
                    ctx.beginPath();
                    $.each(selPts, function(idx, pt) {
                        if (idx==0)
                            ctx.moveTo(pt.x, pt.y);
                        else
                            ctx.lineTo(pt.x, pt.y);
                    });
                    if (tempPt && (selPts.length>0))
                        ctx.lineTo(tempPt.x, tempPt.y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }


                var lassoEventListener_click = function(ev) {
                    var px = that.getEventPosX(ev);
                    var py = that.getEventPosY(ev);
                    if ( (selPts.length==0) || (px!=selPts[selPts.length-1].x) || (py!=selPts[selPts.length-1].y) )
                        selPts.push({x:px, y:py});
                    drawSelArea();
                    //debugger;
                    //alert('point click');
                };

                var lassoEventListener_dblclick = function() {
                    $('#' + that.clickLayerId).unbind("click.FrameCanvasLasso");
                    $('#' + that.clickLayerId).unbind("dblclick.FrameCanvasLasso");
                    $(document).unbind("mousemove.FrameCanvasLasso");
                    var selectedPoints = selPts;
                    selPts = [];
                    drawSelArea();
                    $('#' + that.clickLayerId).css('cursor', 'auto');
                    that.lassoSelecting = false;
                    if (that.lassoSelectingCallbackOnComplete)
                        that.lassoSelectingCallbackOnComplete(selectedPoints);
                };

                var lassoEventListener_mousemove = function(ev) {
                    var px = that.getEventPosX(ev);
                    var py = that.getEventPosY(ev);
                    drawSelArea({x:px, y:py});
                };

                $('#' + that.clickLayerId).bind("click.FrameCanvasLasso", lassoEventListener_click);
                $('#' + that.clickLayerId).bind("dblclick.FrameCanvasLasso", lassoEventListener_dblclick);
                $(document).bind("mousemove.FrameCanvasLasso", lassoEventListener_mousemove);
                $('#' + that.clickLayerId).css('cursor', 'crosshair');
            };


            that.startHalfPlaneSelection = function(callbackOnComplete) {
                if (that.halfPlaneSelecting)
                    return;
                that.halfPlaneSelecting = true;
                that.halfPlaneSelectingCallbackOnComplete = callbackOnComplete;

                var drawSelArea = function(tempPt) {
                    var selCanvas = that.getMyCanvasElement('selection');
                    var ctx = selCanvas.getContext("2d");
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.clearRect(0, 0, selCanvas.width, selCanvas.height);
                    ctx.fillStyle='rgba(255,0,0,0.1)';
                    ctx.strokeStyle='rgba(255,0,0,0.5)';
                    if (firstPoint && tempPt) {
                        var ptcent = firstPoint;
                        dir = {x:tempPt.x-firstPoint.x, y:tempPt.y-firstPoint.y}
                        var dirSize = Math.sqrt(dir.x*dir.x+dir.y*dir.y);
                        if (dirSize>10) {
                            dir.x /= dirSize;
                            dir.y /= dirSize;
                            if (Math.abs(dir.y)<0.05) dir.y = 0;
                            if (Math.abs(dir.x)<0.05) dir.x = 0;
                            var mg = 10000;
                            ctx.beginPath();
                            ctx.moveTo(ptcent.x-mg*dir.x, ptcent.y-mg*dir.y);
                            ctx.lineTo(ptcent.x+mg*dir.x, ptcent.y+mg*dir.y);
                            ctx.lineTo(ptcent.x+mg*dir.x + mg*dir.y, ptcent.y+mg*dir.y - mg*dir.x);
                            ctx.lineTo(ptcent.x-mg*dir.x + mg*dir.y, ptcent.y-mg*dir.y - mg*dir.x);
                            ctx.closePath();
                            ctx.fill();
                            ctx.stroke();
                        }
                        else
                            dir = null;
                    }
                }

                var firstPoint = null;
                var dir = null;

                var eventListener_click = function(ev) {
                    var px = that.getEventPosX(ev);
                    var py = that.getEventPosY(ev);
                    if (!firstPoint) {
                        firstPoint = {x:px, y:py};
                        drawSelArea(null);
                    }
                    else {
                        $('#' + that.clickLayerId).unbind("click.FrameCanvasHalfPlaneSelection");
                        $(document).unbind("mousemove.FrameCanvasHalfPlaneSelection");
                        drawSelArea(null);
                        $('#' + that.clickLayerId).css('cursor', 'auto');
                        that.halfPlaneSelecting = false;
                        if (that.halfPlaneSelectingCallbackOnComplete && dir)
                            that.halfPlaneSelectingCallbackOnComplete(firstPoint, dir);
                    }
                };

                var eventListener_mousemove = function(ev) {
                    var px = that.getEventPosX(ev);
                    var py = that.getEventPosY(ev);
                    drawSelArea({x:px, y:py});
                };

                $('#' + that.clickLayerId).bind("click.FrameCanvasHalfPlaneSelection", eventListener_click);
                $(document).bind("mousemove.FrameCanvasHalfPlaneSelection", eventListener_mousemove);
                $('#' + that.clickLayerId).css('cursor', 'crosshair');


            };



            that.startRectangleSelection = function(callbackOnComplete) {
                if (that.rectangleSelecting)
                    return;
                that.rectangleSelecting = true;
                that.rectangleSelectingCallbackOnComplete = callbackOnComplete;

                var drawSelArea = function(tempPt) {
                    var selCanvas = that.getMyCanvasElement('selection');
                    var ctx = selCanvas.getContext("2d");
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.clearRect(0, 0, selCanvas.width, selCanvas.height);
                    ctx.fillStyle='rgba(255,0,0,0.1)';
                    ctx.strokeStyle='rgba(255,0,0,0.5)';
                    if (firstPoint && tempPt) {
                        secondPoint = tempPt;
                        ctx.beginPath();
                        ctx.moveTo(firstPoint.x, firstPoint.y);
                        ctx.lineTo(firstPoint.x, secondPoint.y);
                        ctx.lineTo(secondPoint.x, secondPoint.y);
                        ctx.lineTo(secondPoint.x, firstPoint.y);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    }
                }

                var firstPoint = null;
                var secondPoint = null;

                var eventListener_click = function(ev) {
                    var px = that.getEventPosX(ev);
                    var py = that.getEventPosY(ev);
                    if (!firstPoint) {
                        firstPoint = {x:px, y:py};
                        drawSelArea(null);
                    }
                    else {
                        $('#' + that.clickLayerId).unbind("click.FrameCanvasRectangleSelection");
                        $(document).unbind("mousemove.FrameCanvasRectangleSelection");
                        drawSelArea(null);
                        $('#' + that.clickLayerId).css('cursor', 'auto');
                        that.rectangleSelecting = false;
                        if (that.rectangleSelectingCallbackOnComplete && secondPoint)
                            that.rectangleSelectingCallbackOnComplete(firstPoint, secondPoint);
                    }
                };

                var eventListener_mousemove = function(ev) {
                    var px = that.getEventPosX(ev);
                    var py = that.getEventPosY(ev);
                    drawSelArea({x:px, y:py});
                };

                $('#' + that.clickLayerId).bind("click.FrameCanvasRectangleSelection", eventListener_click);
                $(document).bind("mousemove.FrameCanvasRectangleSelection", eventListener_mousemove);
                $('#' + that.clickLayerId).css('cursor', 'crosshair');


            };


            that.hideToolTip = function () {
                that._toolTipInfo.ID = null;
                $('#DQXUtilContainer').find('.DQXChannelToolTip').remove();
                $('#DQXUtilContainer').find('.DQXChannelToolTipHighlightPoint').remove();
            }


            that.handleResize = function (isDragging) {
                if (that._fixedWidth!=null)
                    that._cnvWidth = that._fixedWidth;
                else
                    that._cnvWidth = $('#' + that.getDivID()).innerWidth();
                if (that._fixedHeight!=null)
                    that._cnvHeight = that._fixedHeight;
                else
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

            that.clickLayerId = that.getCanvasID('selection');
            $('#' + that.clickLayerId).click($.proxy(that._onMouseClick, that));
            $('#' + that.clickLayerId).mousedown($.proxy(that._onMouseDown, that));
            $('#' + that.clickLayerId).mousemove($.proxy(that._onMouseMove, that));
            $('#' + that.clickLayerId).mouseenter($.proxy(that._onMouseEnter, that));
            $('#' + that.clickLayerId).mouseleave($.proxy(that._onMouseLeave, that));


            DQX.ExecPostCreateHtml();
            that.myParentFrame.notifyContentChanged();

            return that;
        };
    });