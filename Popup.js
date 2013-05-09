/************************************************************************************************************************************
*************************************************************************************************************************************

Defines a popup window

Use Popup.create to create a new popup, and DQX.ClosePopup to close it.

*************************************************************************************************************************************
*************************************************************************************************************************************/

define([DQXSCJQ(), DQXSC("Utils"), DQXSC("DocEl"), DQXSC("Msg"), DQXSC("Controls")],
    function ($, DQX, DocEl, Msg, Controls) {
        var Popup = {};

        Popup.activePopupList = [];

        Popup._checkBackgroundBlockNeeded = function () {
            var blockingPopupsPresent = false;
            $('#DQXBackBlocker').find(".DQXFloatBox").each(function (index, Element) { blockingPopupsPresent = true; });
            if (!blockingPopupsPresent)
                $('#DQXBackBlocker').remove();
        }

        //Closes a popup, providing the unique identifier that was returned by Popup.create
        DQX.ClosePopup = function (index) {
            var posit = Popup.activePopupList.indexOf(index);
            if ((posit < 0) && (_debug_)) DQX.reportError('Unable to find popup');
            Popup.activePopupList.splice(posit, 1);
            $("#" + index).remove();
            DQX.unRegisterGlobalKeyDownReceiver(index);
            Popup._checkBackgroundBlockNeeded();
        }
        DQX._popupIndex = 0;

        //Internal
        DQX.SwitchPinned = function (ID) {
            var elem = $("#" + ID);
            var newStatus = !Popup.isPinned(ID);
            if (newStatus) {
                $("#" + ID).appendTo("#DQXUtilContainer");
                Popup._checkBackgroundBlockNeeded();
                elem.find('.DQXPinBoxUnpinned').remove();
                elem.find('.DQXPinBoxPinned').remove();
                elem.append(Popup._createPinBox(ID, newStatus));
                DQX.unRegisterGlobalKeyDownReceiver(ID); //should not receive global keyboard events anymore
            }
        }

        Popup._floatBoxMaxIndex = 99;

        //Converts a div element into a draggable box, providing the div id
        Popup.makeDraggable = function (id) {
            var dragElem = $('#' + id);
            if (dragElem.length == 0)
                DQX.reportError('Draggable container not found');
            var dragHeaderElem = dragElem.find('.DQXDragHeader');
            if (dragHeaderElem.length == 0)
                DQX.reportError('Draggable container has no header element');
            var headerID = dragHeaderElem.attr('id');
            var dragOffsetX = 0;
            var dragOffsetY = 0;
            var boxW = 0;
            var boxH = 0;
            var dragOnMouseMove = function (ev) {
                var newPosX = ev.pageX + dragOffsetX;
                var newPosY = ev.pageY + dragOffsetY;
                newPosX = Math.min(newPosX, DQX.getWindowClientW() - boxW - 10);
                newPosY = Math.min(newPosY, DQX.getWindowClientH() - 40);
                var newPosX = Math.max(10, newPosX);
                var newPosY = Math.max(10, newPosY);
                dragElem.css({ left: newPosX, top: newPosY });
                return false;
            }
            var dragOnMouseUp = function (ev) {
                $(document).unbind('mousemove.drag', dragOnMouseMove)
                $(document).unbind('mouseup.drag', dragOnMouseUp);
                dragElem.css('opacity', 1);
                return false;
            }
            dragHeaderElem.bind('mousedown.drag', function (ev) {
                var posX = dragElem.position().left;
                var posY = dragElem.position().top;
                var mouseStartX = ev.pageX;
                var mouseStartY = ev.pageY;
                dragOffsetX = posX - mouseStartX;
                dragOffsetY = posY - mouseStartY;
                boxW = dragElem.outerWidth();
                boxH = dragElem.outerHeight();
                $(document).bind('mousemove.drag', dragOnMouseMove);
                $(document).bind('mouseup.drag', dragOnMouseUp);
                dragElem.css('opacity', 0.7);
                Popup._floatBoxMaxIndex++;
                dragElem.css('z-index', Popup._floatBoxMaxIndex);
                return false;
            });

            var touchHandler = {
                handleTouchStart: function (info, ev) {
                    var posX = dragElem.position().left;
                    var posY = dragElem.position().top;
                    var mouseStartX = info.pageX;
                    var mouseStartY = info.pageY;
                    boxW = dragElem.outerWidth();
                    boxH = dragElem.outerHeight();
                    dragOffsetX = posX - mouseStartX;
                    dragOffsetY = posY - mouseStartY;
                    dragElem.css('opacity', 0.7);
                    Popup._floatBoxMaxIndex++;
                    dragElem.css('z-index', Popup._floatBoxMaxIndex);
                },

                handleTouchMove: function (info, ev) {
                    dragOnMouseMove(info);
                },

                handleTouchEnd: function () {
                    dragElem.css('opacity', 1);
                }
            }


            DQX.augmentTouchEvents(touchHandler, headerID, true, false);
        }

        Popup.isPinned = function (ID) {
            var elem = $("#" + ID);
            return elem.find('.DQXPinBoxPinned').length > 0;
        }

        //Call this function to close a popup box if it is not pinned, providing the popup unique identifier
        Popup.closeIfNeeded = function (ID) {
            if (!Popup.isPinned(ID))
                DQX.ClosePopup(ID);
        }

        //Automatically closes all unpinned (=blocking) popups
        Popup.closeUnPinnedPopups = function () {
            $.each(Popup.activePopupList, function (idx, popupID) {
                Popup.closeIfNeeded(popupID);
            });
        }

        Popup._createPinBox = function (ID, isPinned) {
            var bmp = isPinned ? DQXBMP('pin3.png') : DQXBMP('pin4.png');
            var thepinner = DocEl.JavaScriptBitmaplink(bmp, "Keep this info box visible", "DQX.SwitchPinned('" + ID + "')");
            thepinner.setCssClass(isPinned ? "DQXPinBoxPinned" : "DQXPinBoxUnpinned");
            thepinner.addStyle('position', 'absolute');
            thepinner.addStyle('left', '2px');
            thepinner.addStyle('top', '-21px');
            return thepinner.toString();
        }

        Popup._createBackBlocker = function () {
            if ($('#DQXBackBlocker').length > 0)
                return;

            var background = DocEl.Div({ id: 'DQXBackBlocker' });
            background.addStyle("position", "absolute");
            background.addStyle("left", '0px');
            background.addStyle("top", '0px');
            background.addStyle('width', '100%');
            background.addStyle('height', '100%');
            var wizbackcol = 'rgba(100,100,100,0.4)';
            background.addStyle('background-color', wizbackcol);
            background.addStyle('z-index', '2000');
            $('#DQXUtilContainer').append(background.toString());

            $('#DQXBackBlocker').mousedown(function (ev) {
                if (ev.target.id == 'DQXBackBlocker') {
                    $('#DQXBackBlocker').css('background-color', 'rgba(50,50,50,0.6)');
                    setTimeout(function () {
                        $('#DQXBackBlocker').css('background-color', wizbackcol);
                        setTimeout(function () {
                            $('#DQXBackBlocker').css('background-color', 'rgba(50,50,50,0.6)');
                            setTimeout(function () {
                                $('#DQXBackBlocker').css('background-color', wizbackcol);
                            }, 150);
                        }, 150);
                    }, 150);
                }
            });
        }

        //Creates a new popup box, providing a title and html content
        //The function returns a unique identifier for this popup
        Popup.create = function (title, content, helpID) {

            var wasSet = false;
            var popupID = '';
            $(".DQXFloatBox").each(function (index, Element) {
                if (!wasSet) {
                    if ($(this).find(".DQXPinBoxUnpinned").length > 0) {
                        $(this).find(".DQXFloatBoxHeader").html(title);
                        $(this).find(".DQXFloatBoxContent").html(content);
                        DQX.ExecPostCreateHtml();
                        wasSet = true;
                        popupID = $(this).attr('id');
                    }
                }
            });
            if (wasSet) {
                return popupID;
            }
            else {
                Popup._createBackBlocker();

                var posx = DQX.mousePosX + 10;
                var posy = DQX.mousePosY + 10;
                DQX._popupIndex++;
                var ID = 'DXPopup' + DQX._popupIndex;
                var thebox = DocEl.Div({ id: ID });
                thebox.setCssClass("DQXFloatBox");
                thebox.addStyle("position", "absolute");
                thebox.addStyle("left", '0px');
                thebox.addStyle("top", '0px');

                var theheader = DocEl.Div({ id: ID + 'Handler', parent: thebox });
                theheader.setCssClass("DQXFloatBoxHeader DQXDragHeader");
                theheader.addElem(DQX.interpolate(title));

                var thebody = DocEl.Div({ parent: thebox });
                thebody.setCssClass("DQXFloatBoxContent");
                thebody.addStyle("max-width", (DQX.getWindowClientW() - 100) + 'px');
                thebody.addStyle("max-height", (DQX.getWindowClientH() - 100) + 'px');
                thebody.addStyle("overflow-x", "hidden");
                thebody.makeAutoVerticalScroller();
                thebody.addElem(DQX.interpolate(content));

                var thecloser = DocEl.JavaScriptBitmaplink(DQXBMP("close2.png"), "Close", "DQX.ClosePopup('" + ID + "')");
                thebox.addElem(thecloser);
                thecloser.addStyle('position', 'absolute');
                thecloser.addStyle('right', '-16px');
                thecloser.addStyle('top', '-16px');

                thebox.addElem(Popup._createPinBox(ID, false));

                if (helpID) {//Help button
                    thebox.addElem('<IMG SRC="{bmp}" border=0 class="DQXBitmapLink Helpbutton" ALT="Help" TITLE="Help" style="opacity:0.70;position:absolute;right:35px;top:0px;">'.DQXformat({ bmp: DQXBMP("info2.png") }));
                }

                var content = thebox.toString();
                $('#DQXBackBlocker').append(content);
                Popup.makeDraggable(ID);
                var w = $('#' + ID).width();
                var h = $('#' + ID).height();
                var pageSizeX = $(window).width();
                var pageSizeY = $(window).height();
                $('#' + ID).offset({ left: (pageSizeX - w) / 2, top: (pageSizeY - h) / 2 });
                DQX.ExecPostCreateHtml();
                DQX.registerGlobalKeyDownReceiver(function (ev) {
                    if (ev.isEscape) DQX.ClosePopup(ID);
                }, ID);

                if (helpID) {
                    $('#' + ID).find('.Helpbutton').click(function () {
                        Msg.send({ type: 'ShowHelp' }, helpID);
                    });
                }
            }
            Popup.activePopupList.push(ID);
            return ID;
        }

        return Popup;
    });
