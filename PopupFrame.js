/************************************************************************************************************************************
*************************************************************************************************************************************
   settings contains:
      - title (required)
      - sizeX, sizeY (values, optional)
      - blocking (boolean, optional)
    onClose is called when the popup is closing (can be overridden)

*************************************************************************************************************************************
*************************************************************************************************************************************/

define(["jquery", "DQX/Utils", "DQX/DocEl", "DQX/Msg", "DQX/Framework", "DQX/Popup"],
    function ($, DQX, DocEl, Msg, FrameWork, Popup) {
        var PopupFrame = {};

        PopupFrame._settingsHistory = {}; //settings history for each type of PopupFrame, identified by its ID


        PopupFrame.PopupFrame = function (itypeID, settings) {
            DQX.checkIsString(itypeID);
            DQX.requireMember(settings, 'title');

            var that = {};
            that.typeID = itypeID;
            that.frameRoot = FrameWork.FrameGeneric('');
            that.frameRoot._frameContainer = that;
            that.getFrameRoot = function () { return this.frameRoot; }

            that.frameRoot.setFrameClass('DQXLightFrame');


            that._title = 'Frame'; if (settings.title) that._title = settings.title;
            that._sizeX = 800; if (settings.sizeX) that._sizeX = settings.sizeX;
            that._sizeY = 600; if (settings.sizeY) that._sizeY = settings.sizeY;
            that.blocking = false; if (settings.blocking) that.blocking = settings.blocking;
            if (that.typeID in PopupFrame._settingsHistory) {
                var settingHist = PopupFrame._settingsHistory[that.typeID];
                that._sizeX = settingHist.sizeX;
                that._sizeY = settingHist.sizeY;
            }
            else {
                var settingHist = {};
                PopupFrame._settingsHistory[that.typeID] = settingHist;
            }
            that._sizeX = Math.min(that._sizeX, DQX.getWindowClientW() - 50);
            that._sizeY = Math.min(that._sizeY, DQX.getWindowClientH() - 70);
            that._minSizeX = 180; if (settings.minSizeX) that._minSizeX = settings.minSizeX;
            that._minSizeY = 180; if (settings.minSizeY) that._minSizeY = settings.minSizeY;
            settingHist.sizeX = that._sizeX;
            settingHist.sizeY = that._sizeY;


            DQX._popupIndex++;
            that.ID = 'DXPopup' + DQX._popupIndex;

            that.posX = 70;
            that.posY = 70;
            if ('posX' in settingHist) that.posX = settingHist.posX;
            if ('posY' in settingHist) that.posY = settingHist.posY;
            $('.DQXPopupFrame').each(function (a, b) {
                if ((that.posX == $(this).position().left) && (that.posY == $(this).position().top)) {
                    that.posX += 25;
                    that.posY += 25;
                }
            });
            that.posX = Math.min(that.posX, DQX.getWindowClientW() - that._sizeX - 10);
            that.posY = Math.min(that.posY, DQX.getWindowClientH() - 40);



            that.onClose = function() {} // Override to get a notification if the popup is about to be closed


            that.createFrames = function() { DQX.reportError("Please override createFrames"); }; //override to define the frames of this view

            that.createPanels = function() { DQX.reportError("Please override createPanels"); }; //override to define the panels of this view

            that.create = function() {
                that.createFrames(that.frameRoot);
                that.render();
                that.createPanels();
                that.getFrameRoot().applyOnPanels(function(panel) {
                    if (panel._panelfirstRendered==false)
                        panel.render();
                })
            }


            that.render = function () {

                if (that.blocking) {
                    var background = DocEl.Div({ id: 'BlockingBackGround' });
                    background.addStyle("position", "absolute");
                    background.addStyle("left", '0px');
                    background.addStyle("top", '0px');
                    background.addStyle('width', '100%');
                    background.addStyle('height', '100%');
                    var wizbackcol = 'rgba(100,100,100,0.4)';
                    background.addStyle('background-color', wizbackcol);
                    background.addStyle('z-index', '2000');
                    $('#DQXUtilContainer').append(background.toString());

                    $('#BlockingBackGround').mousedown(function (ev) {
                        if (ev.target.id == 'BlockingBackGround') {
                            $('#BlockingBackGround').css('background-color', 'rgba(50,50,50,0.6)');
                            setTimeout(function () {
                                $('#BlockingBackGround').css('background-color', wizbackcol);
                                setTimeout(function () {
                                    $('#BlockingBackGround').css('background-color', 'rgba(50,50,50,0.6)');
                                    setTimeout(function () {
                                        $('#BlockingBackGround').css('background-color', wizbackcol);
                                    }, 150);
                                }, 150);
                            }, 150);
                        }
                    });
                }


                if ('frameSettings' in settingHist) {
                    that.frameRoot.settingsStreamIn(settingHist.frameSettings);
                }

                var thebox = DocEl.Div({ id: that.ID });
                thebox.setCssClass("DQXPopupFrame");
                thebox.addStyle("position", "absolute");
                thebox.addStyle("left", this.posX + 'px');
                thebox.addStyle("top", this.posY + 'px');

                var theheader = DocEl.Div({ id: that.ID + 'Handler', parent: thebox });
                theheader.setCssClass("DQXPopupFrameHeader DQXDragHeader");
                theheader.addElem(DQX.interpolate(this._title));

                var thebody = DocEl.Div({ id: that.ID + 'Body', parent: thebox });
                thebody.setCssClass("DQXPopupFrameContent");
                thebody.addStyle("width", that._sizeX + 'px');
                thebody.addStyle("height", that._sizeY + 'px');
                thebody.addStyle("position", 'relative');

                Popup._floatBoxMaxIndex++;
                thebox.addStyle('z-index', Popup._floatBoxMaxIndex);

                var html = that.frameRoot._createElements(1).toString();
                thebody.addElem(html);

                var thecloser = DocEl.JavaScriptBitmaplink(DQX.BMP("close2.png"), "Close", "");
                thecloser.addAttribute("id", that.ID + 'closeButton');

                thebox.addElem(thecloser);
                thecloser.addStyle('position', 'absolute');
                thecloser.addStyle('right', '-16px');
                thecloser.addStyle('top', '-16px');

                var resizer = DocEl.Div({ parent: thebox });
                resizer.setCssClass('DQXPopupFrameResizer DQXPopupFrameResizer1');
                var resizer = DocEl.Div({ parent: thebox });
                resizer.setCssClass('DQXPopupFrameResizer DQXPopupFrameResizer2');

                var content = thebox.toString();
                if (!that.blocking)
                    $('#DQXUtilContainer').append(content);
                else
                    $('#BlockingBackGround').append(content);

                $('#' + that.ID + 'closeButton').click($.proxy(that.close, that));

                $('#' + that.ID).find('.DQXPopupFrameResizer').mousedown($.proxy(that._onResizeMouseDown, that))


                that.frameRoot._postCreateHTML();
                that._handleResize(false);

                DQX.ExecPostCreateHtml();

                Popup.makeDraggable(that.ID);
            }

            that.notifyLayoutChanged = function () {
                PopupFrame._settingsHistory[that.typeID].frameSettings = this.frameRoot.settingsStreamOut();
            }

            that.close = function () {
                var settingHist = PopupFrame._settingsHistory[that.typeID];
                settingHist.posX = $("#" + that.ID).position().left;
                settingHist.posY = $("#" + that.ID).position().top;
                settingHist.frameSettings = this.frameRoot.settingsStreamOut();
                $("#" + that.ID).remove();
                $('#BlockingBackGround').remove();
                that.onClose();
                that.frameRoot.applyOnPanels(function(panel) {
                    if (panel.tearDown)
                        panel.tearDown();
                });
            }

            that._onResizeMouseDown = function (ev) {
                $(document).bind("mouseup.PopupFrameResize", $.proxy(that._onResizeMouseUp, that));
                $(document).bind("mousemove.PopupFrameResize", $.proxy(that._onResizeMouseMove, that));
                this._resizeX0 = ev.pageX;
                this._resizeY0 = ev.pageY;
                this._resizeW0 = $('#' + this.ID + 'Body').width();
                this._resizeH0 = $('#' + this.ID + 'Body').height();
                this._oldBoxShadow = $('#' + this.ID).css('box-shadow');
                $('#' + this.ID).css('box-shadow', 'none');
                return false;
            }

            that._onResizeMouseUp = function (ev) {
                $(document).unbind("mouseup.PopupFrameResize");
                $(document).unbind("mousemove.PopupFrameResize");
                $('#' + this.ID).css('box-shadow', this._oldBoxShadow);
                this._handleResize(false);
                return false;
            }

            that._onResizeMouseMove = function (ev) {
                var newSizeX = this._resizeW0 + ev.pageX - this._resizeX0;
                var newSizeY = this._resizeH0 + ev.pageY - this._resizeY0;
                newSizeX = Math.max(newSizeX, this._minSizeX);
                newSizeY = Math.max(newSizeY, this._minSizeY);
                newSizeX = Math.min(newSizeX, DQX.getWindowClientW() - 50);
                newSizeY = Math.min(newSizeY, DQX.getWindowClientH() - 50);
                $('#' + this.ID + 'Body').width(newSizeX);
                $('#' + this.ID + 'Body').height(newSizeY);
                this._sizeX = newSizeX;
                this._sizeY = newSizeY;
                var settingHist = PopupFrame._settingsHistory[this.typeID];
                settingHist.sizeX = this._sizeX;
                settingHist.sizeY = this._sizeY;
                this._handleResize(true);
                return false;
            }



            that._handleResize = function (isDragging) {
                var myparent = $('#' + that.ID + 'Body');
                var v1 = myparent.attr('id');
                var v2 = myparent.get(0).tagName;
                var sx = myparent.innerWidth();
                var sy = myparent.innerHeight();
                that.frameRoot._executeInitialisers();
                that.frameRoot._setPosition(0, 0, sx, sy, false, false, isDragging);
                that.frameRoot._executePostInitialisers();
            }


            return that;
        }

        return PopupFrame;
    });
