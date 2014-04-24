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
        PopupFrame.hasThumbNails = false;

        PopupFrame.setHasThumbNails = function() {
            PopupFrame.hasThumbNails = true;
        }

        PopupFrame.PopupFrame = function (itypeID, settings) {
            DQX.checkIsString(itypeID);
            DQX.requireMember(settings, 'title');

            var that = {};
            that.typeID = itypeID;
            that.frameRoot = FrameWork.FrameGeneric('');
            that.frameRoot._frameContainer = that;
            that.getFrameRoot = function () { return this.frameRoot; }
            that.maximised = false;
            that.minimised = false;

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
                thecloser.addStyle('right', '-12px');
                thecloser.addStyle('top', '-12px');

                var theMaximiser = DocEl.JavaScriptBitmaplinkTransparent(DQX.BMP("maximize.png"), "Maximise", "");
                theMaximiser.addAttribute("id", that.ID + 'maximiseButton');
                thebox.addElem(theMaximiser);
                theMaximiser.addStyle('position', 'absolute');
                theMaximiser.addStyle('right', '20px');
                theMaximiser.addStyle('top', '2px');

                if (PopupFrame.hasThumbNails && (!that.blocking)) {
                    var theMinimiser = DocEl.JavaScriptBitmaplinkTransparent(DQX.BMP("minimize.png"), "Minimise", "");
                    theMinimiser.addAttribute("id", that.ID + 'minimiseButton');
                    thebox.addElem(theMinimiser);
                    theMinimiser.addStyle('position', 'absolute');
                    theMinimiser.addStyle('right', '55px');
                    theMinimiser.addStyle('top', '2px');
                }

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
                $('#' + that.ID + 'maximiseButton').click(that.maximise);
                $('#' + that.ID + 'minimiseButton').click(that.minimise);

                $('#' + that.ID).find('.DQXPopupFrameResizer').mousedown($.proxy(that._onResizeMouseDown, that))


                that.frameRoot._postCreateHTML();
                that._handleResize(false);

                DQX.ExecPostCreateHtml();

                Popup.makeDraggable(that.ID);

                if (PopupFrame.hasThumbNails && (!that.blocking)) {
                        that.thumbNailId = that.ID+'_minimisedThumbNail';
                    var iconStr = '<div class="DQXThumbNail" style="position:relative" id="{id}">{title}<img id="{closeboxid}" SRC="{closebmp}" style="position:absolute;right:1px;top:1px;"/></div>'.DQXformat({
                        id: that.thumbNailId,
                        title: that._title,
                        closebmp: DQX.BMP("closeSmall.png"),
                        closeboxid: that.thumbNailId+'_closebox'
                    });
                    $('.DQXThumbNailBox').append(iconStr);
//                    $('#'+that.thumbNailId).dblclick(function() {
//                        if (that.minimised)
//                            that.restore()
//                        else {
//                            Popup._floatBoxMaxIndex++;
//                            $('#' + that.ID).css('z-index', Popup._floatBoxMaxIndex);
//                        }
//                    });
                    $('#' + that.thumbNailId+'_closebox').mousedown(function(ev) {
                        that.close();
                        if (ev.stopPropagation)
                            ev.stopPropagation();
                        if (ev.preventDefault)
                            ev.preventDefault();
                        return 0;
                    });

                    $('#'+that.thumbNailId).click(function(ev) {
                        if (that.minimised) {
                            that.restore();
                        }
                        else {
                            that.minimise();
                        }
                        if (ev.stopPropagation)
                            ev.stopPropagation();
                        if (ev.preventDefault)
                            ev.preventDefault();
                        return 0;
                    });

                    that.animateTransition($('#' + that.thumbNailId), $('#' + that.ID));
                }

            }

            that.notifyLayoutChanged = function () {
                PopupFrame._settingsHistory[that.typeID].frameSettings = this.frameRoot.settingsStreamOut();
            }

            that.maximise = function() {
                that.maximised = !that.maximised;
                if (that.maximised) {
                    that.animateTransition($("#" + that.ID),$('body'), function() {
                        that.unMaximisedPosX = $("#" + that.ID).position().left;
                        that.unMaximisedPosY = $("#" + that.ID).position().top;
                        that.unMaximisedSizeX = that._sizeX;
                        that.unMaximisedSizeY = that._sizeY;
                        newSizeX = DQX.getWindowClientW() - 10;
                        newSizeY = DQX.getWindowClientH() - 50;
                        that._sizeX = $('#' + this.ID + 'Body').width();
                        that._sizeY = $('#' + this.ID + 'Body').height();
                        $('#' + that.ID).offset({top: 5, left: 0});
                        $('#' + that.ID + 'Body').width(newSizeX);
                        $('#' + that.ID + 'Body').height(newSizeY);
                        that._handleResize(false);
                    });
                }
                else {
                    $('#' + that.ID).offset({left: that.unMaximisedPosX, top: that.unMaximisedPosY});
                    $('#' + that.ID + 'Body').width(that.unMaximisedSizeX);
                    $('#' + that.ID + 'Body').height(that.unMaximisedSizeY);
                    that._sizeX = that.unMaximisedSizeX;
                    that._sizeY = that.unMaximisedSizeY;
                    that.animateTransition($('body'), $("#" + that.ID) );
                    that._handleResize(false);
                }
            }

            that.animateTransition = function(elementFrom, elementTo, onCompleted) {
                var px0 = elementFrom.position().left;
                var py0 = elementFrom.position().top;
                var lx0 = elementFrom.width();
                var ly0 = elementFrom.height();


                var px1 = elementTo.position().left;
                var py1 = elementTo.position().top;
                var lx1 = elementTo.width();
                var ly1 = elementTo.height();

                var thebox = DocEl.Div({ id: '_transientAnim_' });
                thebox.addStyle("position", "absolute");
                thebox.addStyle("left", px0 + 'px');
                thebox.addStyle("top", py0 + 'px');
                thebox.addStyle("width", lx0 + 'px');
                thebox.addStyle("height", ly0 + 'px');
                thebox.addStyle('border', '4px solid black');
//                thebox.addStyle('background-color', 'rgba(0,0,0,0.2)');
                thebox.addStyle('z-index', Popup._floatBoxMaxIndex+1);

                $('#DQXUtilContainer').append(thebox.toString());

                $('#_transientAnim_').animate({left:px1+'px', top:py1+'px', width:lx1+'px', height:ly1+'px'}, 250, function() {
                    $('#_transientAnim_').remove();
                    if (onCompleted)
                        onCompleted();
                });


            }

            that.minimise = function() {
                if (that.minimised)
                    return;
                that.minimised = true;
                that.animateTransition($("#" + that.ID), $("#" + that.thumbNailId), function() {
                    $("#" + that.thumbNailId).addClass('DQXThumbNailMinimised');
                });
                $('#' + that.ID).hide();
            }

            that.restore = function () {
                if (that.minimised) {
                    that.minimised = false;
                    $("#" + that.ID).css('opacity',0.0);
                    $('#' + that.ID).show();
                    Popup._floatBoxMaxIndex++;
                    $('#' + that.ID).css('z-index', Popup._floatBoxMaxIndex);
                    $("#" + that.thumbNailId).removeClass('DQXThumbNailMinimised');
                    that.animateTransition($("#" + that.thumbNailId), $("#" + that.ID), function() {
                        $("#" + that.ID).css('opacity',1);
                    });
                }
            }

            that.close = function () {
                var settingHist = PopupFrame._settingsHistory[that.typeID];
                if ((!that.maximised)&&((!that.minimised))) {
                    settingHist.posX = $("#" + that.ID).position().left;
                    settingHist.posY = $("#" + that.ID).position().top;
                }
                settingHist.frameSettings = this.frameRoot.settingsStreamOut();
                $("#" + that.ID).remove();
                $('#BlockingBackGround').remove();
                that.onClose();
                that.frameRoot.applyOnPanels(function(panel) {
                    if (panel.tearDown)
                        panel.tearDown();
                });
                if (PopupFrame.hasThumbNails)
                    $('#'+that.thumbNailId).remove();
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
                if (!that.maximised) {
                    var newSizeX = this._resizeW0 + ev.pageX - this._resizeX0;
                    var newSizeY = this._resizeH0 + ev.pageY - this._resizeY0;
                    newSizeX = Math.max(newSizeX, this._minSizeX);
                    newSizeY = Math.max(newSizeY, this._minSizeY);
                    newSizeX = Math.min(newSizeX, DQX.getWindowClientW() - 50);
                    newSizeY = Math.min(newSizeY, DQX.getWindowClientH() - 50);
                    $('#' + this.ID + 'Body').width(newSizeX);
                    $('#' + this.ID + 'Body').height(newSizeY);
                    //$('#' + this.ID + 'Handler').width(newSizeX-19);//<-- this is used to force resize the handler to a width smaller than its natural size
                    this._sizeX = newSizeX;
                    this._sizeY = newSizeY;
                    var settingHist = PopupFrame._settingsHistory[this.typeID];
                    settingHist.sizeX = this._sizeX;
                    settingHist.sizeY = this._sizeY;
                    this._handleResize(true);
                }
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
