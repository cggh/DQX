/************************************************************************************************************************************
*************************************************************************************************************************************


*************************************************************************************************************************************
*************************************************************************************************************************************/

define([DQXSCJQ(), DQXSC("Utils"), DQXSC("DocEl"), DQXSC("Msg"), DQXSC("FrameWork"), DQXSC("Popup")],
    function ($, DQX, DocEl, Msg, FrameWork, Popup) {
        var PopupFrame = {};


        PopupFrame.PopupFrame = function (iframeRoot, settings) {
            var that = {};

            that.frameRoot = iframeRoot;
            that.frameRoot._frameContainer = that;
            that.getFrameRoot = function () { return this.frameRoot; }

            that._title = 'Frame'; if (settings.title) that._title = settings.title;
            that._sizeX = 800; if (settings.sizeX) that._sizeX = settings.sizeX;
            that._sizeY = 600; if (settings.sizeY) that._sizeY = settings.sizeY;
            DQX._popupIndex++;
            that.ID = 'DXPopup' + DQX._popupIndex;


            that.render = function () {
                var thebox = DocEl.Div({ id: that.ID });
                thebox.setCssClass("DQXFloatBox");
                thebox.addStyle("position", "absolute");
                thebox.addStyle("left", 70 + Math.round(Math.random() * 50) + 'px');
                thebox.addStyle("top", 70 + Math.round(Math.random() * 50) + 'px');

                var theheader = DocEl.Div({ id: that.ID + 'Handler', parent: thebox });
                theheader.setCssClass("DQXFloatBoxHeader DQXDragHeader");
                theheader.addElem(DQX.interpolate(this._title));

                var thebody = DocEl.Div({ id: that.ID + 'Body', parent: thebox });
                thebody.setCssClass("DQXFloatBoxContent");
                thebody.addStyle("width", that._sizeX + 'px');
                thebody.addStyle("height", that._sizeY + 'px');
                thebody.addStyle("position", 'relative');
                thebody.addStyle("overflow", "hidden");
                thebody.makeAutoVerticalScroller();

                Popup._floatBoxMaxIndex++;
                thebody.addStyle('z-index', Popup._floatBoxMaxIndex);

                var html = that.frameRoot._createElements(1).toString();
                thebody.addElem(html);

                var thecloser = DocEl.JavaScriptBitmaplink(DQXBMP("close2.png"), "Close", "");
                thecloser.addAttribute("id", that.ID + 'closeButton');

                thebox.addElem(thecloser);
                thecloser.addStyle('position', 'absolute');
                thecloser.addStyle('right', '-16px');
                thecloser.addStyle('top', '-16px');

                var content = thebox.toString();
                $('#DQXUtilContainer').append(content);

                $('#' + that.ID + 'closeButton').click($.proxy(that.close, that));


                that.frameRoot._postCreateHTML();
                //$(window).resize(that._handleResize);
                that._handleResize();

                /*                Popup.makeDraggable(ID);
                var w = $('#' + ID).width();
                var h = $('#' + ID).height();
                var pageSizeX = $(window).width();
                var pageSizeY = $(window).height();
                $('#' + ID).offset({ left: (pageSizeX - w) / 2, top: (pageSizeY - h) / 2 });*/
                DQX.ExecPostCreateHtml();

                Popup.makeDraggable(that.ID);
            }

            that.close = function () {
                $("#" + that.ID).remove();
                //!!!todo: all necessary actions to make sure this object gets garbage collected
            }

            that._handleResize = function () {
                var myparent = $('#' + that.ID + 'Body');
                var v1 = myparent.attr('id');
                var v2 = myparent.get(0).tagName;
                var sx = myparent.innerWidth();
                var sy = myparent.innerHeight();
                that.frameRoot._executeInitialisers();
                that.frameRoot._setPosition(0, 0, sx, sy, false, false);
                that.frameRoot._executePostInitialisers();
            }


            return that;
        }

        return PopupFrame;
    });
