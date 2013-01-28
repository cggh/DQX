define([DQXSCJQ(), DQXSC("Utils"), DQXSC("DocEl"), DQXSC("Msg"), DQXSC("Controls")],
    function ($, DQX, DocEl, Msg, Controls) {
        var Popup = {};


        DQX.ClosePopup = function (index) {
            $("#" + index).remove();
        }
        DQX._popupIndex = 0;

        DQX.SwitchPinned = function (ID) {
            var elem = $("#" + ID);
            var newStatus = !Popup.isPinned(ID);
            elem.find('.DQXPinBoxUnpinned').remove();
            elem.find('.DQXPinBoxPinned').remove();
            elem.append(Popup.createPinBox(ID, newStatus));
        }

        Popup._floatBoxMaxIndex = 99;

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
                var newPosX = Math.max(10, ev.pageX + dragOffsetX);
                var newPosY = Math.max(10, ev.pageY + dragOffsetY);
                newPosX = Math.min(newPosX, DQX.getWindowClientW() - boxW - 10);
                newPosY = Math.min(newPosY, DQX.getWindowClientH() - 40);
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

                handleTouchStop: function() {
                    dragElem.css('opacity', 1);
                }
            }


            DQX.augmentTouchEvents(touchHandler, headerID, true, false);
        }

        Popup.isPinned = function (ID) {
            var elem = $("#" + ID);
            return elem.find('.DQXPinBoxPinned').length > 0;
        }

        Popup.createPinBox = function (ID, isPinned) {
            var bmp = isPinned ? DQXBMP('pin2.png') : DQXBMP('pin0.png');
            var thepinner = DocEl.JavaScriptBitmaplink(bmp, "Keep this info box visible", "DQX.SwitchPinned('" + ID + "')");
            thepinner.setCssClass(isPinned ? "DQXPinBoxPinned" : "DQXPinBoxUnpinned");
            thepinner.addStyle('position', 'absolute');
            thepinner.addStyle('right', '-7px');
            thepinner.addStyle('top', '-14px');
            return thepinner.toString();
        }

        Popup.create = function (title, content) {
            var wasSet = false;
            var popupID = '';
            $(".DQXFloatBox").each(function (index, Element) {
                if (!wasSet) {
                    if ($(this).find(".DQXPinBoxUnpinned").length > 0) {
                        $(this).find(".DQXFloatBoxHeader").html(title);
                        $(this).find(".DQXFloatBoxContent").html(content);
                        wasSet = true;
                        popupID = $(this).attr('id');
                    }
                }
            });
            if (wasSet) {
                return popupID;
            }
            else {

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
                theheader.addElem(title);

                var thebody = DocEl.Div({ parent: thebox });
                thebody.setCssClass("DQXFloatBoxContent");
                thebody.addElem(content);

                var thecloser = DocEl.JavaScriptBitmaplink(DQXBMP("close.png"), "Close", "DQX.ClosePopup('" + ID + "')");
                thebox.addElem(thecloser);
                thecloser.addStyle('position', 'absolute');
                thecloser.addStyle('left', '-10px');
                thecloser.addStyle('top', '-10px');

                thebox.addElem(Popup.createPinBox(ID, false));

                var content = thebox.toString();
                $('#DQXUtilContainer').append(content);
                Popup.makeDraggable(ID);
                var w = $('#' + ID).width();
                var h = $('#' + ID).height();
                var pageSizeX = $(window).width();
                var pageSizeY = $(window).height();
                $('#' + ID).offset({ left: (pageSizeX - w) / 2, top: (pageSizeY - h) / 2 });
            }
            return ID;
        }

        //Show a help box corresponding to a help id item in the DOM
        Popup.showHelp = function (id) {
            var docElem = $('#DQXDocumentation').find('#' + id);
            if (docElem.length == 0) DQX.reportError("Broken help link " + id);
            var helpcontent = docElem.html();
            var div = DocEl.Div();
            var docH = DQX.getWindowClientH();
            div.addStyle('max-width', '750px');
            div.addStyle('max-height', (docH - 100) + 'px');
            div.addStyle("overflow", "auto");
            div.addElem(helpcontent);
            Popup.create('Help', div.toString());
        }

        return Popup;
    });
