define(["jquery", "jquery.dragndrop", "DQX/DocEl", "DQX/Msg", "DQX/Controls"],
    function ($, dragndrop, DocEl, Msg, Controls) {
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

        Popup.isPinned = function (ID) {
            var elem = $("#" + ID);
            return elem.find('.DQXPinBoxPinned').length > 0;
        }

        Popup.createPinBox = function (ID, isPinned) {
            var bmp = isPinned ? 'Bitmaps/pin2.png' : 'Bitmaps/pin0.png';
            var thepinner = DocEl.JavaScriptBitmaplink(bmp, "Keep this info box visible", "DQX.SwitchPinned('" + ID + "')");
            thepinner.setCssClass(isPinned ? "DQXPinBoxPinned" : "DQXPinBoxUnpinned");
            thepinner.addStyle('position', 'absolute');
            thepinner.addStyle('right', '-7px');
            thepinner.addStyle('top', '-14px');
            return thepinner.toString();
        }

        Popup.create = function (title, content) {
            var wasSet = false;
            $(".DQXFloatBox").each(function (index, Element) {
                if (!wasSet) {
                    if ($(this).find(".DQXPinBoxUnpinned").length > 0) {
                        $(this).find(".DQXFloatBoxHeader").html(title);
                        $(this).find(".DQXFloatBoxContent").html(content);
                        wasSet = true;
                    }
                }
            });
            if (!wasSet) {

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
                theheader.setCssClass("DQXFloatBoxHeader");
                theheader.addElem(title);

                var thebody = DocEl.Div({ parent: thebox });
                thebody.setCssClass("DQXFloatBoxContent");
                thebody.addElem(content);

                var thecloser = DocEl.JavaScriptBitmaplink("Bitmaps/close.png", "Close", "DQX.ClosePopup('" + ID + "')");
                thebox.addElem(thecloser);
                thecloser.addStyle('position', 'absolute');
                thecloser.addStyle('left', '-10px');
                thecloser.addStyle('top', '-10px');

                thebox.addElem(Popup.createPinBox(ID, false));

                var content = thebox.toString();
                $('#DQXUtilContainer').append(content);
                MakeDrag(ID);
                var w = $('#' + ID).width();
                var h = $('#' + ID).height();
                var pageSizeX = $(window).width();
                var pageSizeY = $(window).height();
                $('#' + ID).offset({ left: (pageSizeX - w) / 2, top: (pageSizeY-h) / 2 });
            }
            return ID;
        }

        return Popup;
    });
