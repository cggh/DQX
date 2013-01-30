define([DQXSCJQ(), DQXSC("DocEl"), DQXSC("Msg"), DQXSC("Controls"), DQXSC("FramePanel"), DQXSC("HistoryManager")],
    function ($, DocEl, Msg, Controls, FramePanel, HistoryManager) {
        var Framework = {};
        //two constants defining the X and Y direction
        Framework.dimX = 0;
        Framework.dimY = 1;
        Framework.isValidDim = function (dim) {
            if ((dim !== 0) && (dim !== 1))
                DQX.reportError("Invalid dimension identifier");
        }

        Framework.frameCounter = 0;

        Framework.frameTitleBarH = 33;
        Framework.sepSizeLarge = 14;
        Framework.sepSizeSmall = 6;

        //Enumerates the possible types of frames
        Framework.FrameTypes = {
            'Final': 0, //contains no more subpanels, and holds a client area (= a 'panel')
            'GroupHor': 1, //Contains a horizontally spread set of subframes
            'GroupVert': 2, //Contains a vertically spread set of subframes
            'Tab': 3, //Contains a set of subframes organised as tabs
            'Stack': 4//Contains a set of subframes organised as a stack without tabs
        };

        //A class that encapsulates a Range of possible sizes for a frame (used for both X and Y sizes)
        Framework.SizeRange = function () {
            var that = {};
            that.minSize = 120;
            that.maxSize = 99999999;
            that.setMinSize = function (sz) {
                this.minSize = sz;
            }
            that.setFixedSize = function (sz) {
                this.minSize = sz;
                this.maxSize = sz;
                return this;
            }
            that._isFixedSize = function () {
                return this.maxSize == this.minSize;
            }
            that._getMinSize = function () {
                return this.minSize;
            }
            that._getMaxSize = function () {
                return this.maxSize;
            }
            return that;
        }

        //Creates an instance of a frame has a not yet determined function
        Framework.FrameGeneric = function (iid, isizeweight) {
            return Framework.Frame(iid, '-', isizeweight);
        }

        //Creates an instance of a frame that groups a set of subframes in a horizontal way (i.e. with vertical separators)
        Framework.FrameGroupHor = function (iid, isizeweight) {
            return Framework.Frame(iid, 'GroupHor', isizeweight);
        }

        //Creates an instance of a frame that groups a set of subframes in a vertical way (i.e. with horizontal separators)
        Framework.FrameGroupVert = function (iid, isizeweight) {
            return Framework.Frame(iid, 'GroupVert', isizeweight);
        }

        //Creates an instance of a frame that groups a set of subframes as a set of tabs
        Framework.FrameGroupTab = function (iid, isizeweight) {
            return Framework.Frame(iid, 'Tab', isizeweight);
        }

        //Creates an instance of a frame that groups a set of subframes as a stack without tabs
        Framework.FrameGroupStack = function (iid, isizeweight) {
            return Framework.Frame(iid, 'Stack', isizeweight);
        }

        //Creates an instance of a frame contains a single client panel holding actual content
        Framework.FrameFinal = function (iid, isizeweight) {
            return Framework.Frame(iid, 'Final', isizeweight).setFrameClassClient('DQXClient');
        }

        //A class that implements a frame
        Framework.Frame = function (iid, itype, isizeweight) {
            DQX.checkIsString(iid);
            if (itype != '-')
                if (!(itype in Framework.FrameTypes)) DQX.reportError('Invalid frame type');
            var that = {};

            that._parentFrame = null;
            that.myFrameID = iid;
            that.myDisplayTitle = '';
            that.myType = itype;
            that.mySizeWeight = isizeweight;
            that.autoSizeY = false;
            that.sizeRange = [Framework.SizeRange(), Framework.SizeRange()]; //allowed frame size range in X and Y dir
            that.marginLeft = 0;
            that.marginRight = 0;
            that.marginTop = 0;
            that.marginBottom = 0;
            that.memberFrames = [];
            that.myClientObject = null;
            that.myID = '_';
            that._separatorSize = 10;
            that.frameClass = ''; //css class of the div that makes the border of this panel
            that.frameClassClient = ''; //css class of the div that makes the client area this panel
            that._handleInitialise = null; //this function will be called the first time this frame goes live

            that.allowYScrollbar = true;
            that.allowXScrollbar = false;

            ////////////////// GENERAL GETTERS

            that.getFramework = function () { return Framework; }

            that.getVisibleTitleDivID = function () {
                return this.myID + '_DisplayTitle';
            }
            that.getClientContainerDivID = function () {
                return this.myID + '_clientcontainer';
            }
            that.getClientDivID = function () {
                return this.myID + '_client';
            }
            that.getSeparatorDivID = function (sepnr) {
                return this.myID + '_sep_' + sepnr;
            }
            that.isFinalPanel = function () {
                return (this.myType == 'Final');
            }
            that.isStacker = function () {
                return (this.myType == 'Tab') || (this.myType == 'Stack');
            }
            that.hasTabs = function () {
                return (this.myType == 'Tab');
            }
            that.isHorSplitter = function () {
                return (this.myType == 'GroupHor');
            }
            that.isVertSplitter = function () {
                return (this.myType == 'GroupVert');
            }
            that.isSplitter = function () {
                return (this.isHorSplitter()) || (this.isVertSplitter());
            }
            that.checkSplitter = function () {//This function throws an error of the frame is not of the splitter type
                if (!this.isSplitter())
                    DQX.reportError("Frame is not a splitter");
            }
            that.checkFinalPanel = function () {//This function throws an error of the frame is not of the final type
                if (!this.isFinalPanel())
                    DQX.reportError("Frame is not a final frame (i.e. containing a client panel)");
            }
            that.splitterDim = function () {//returns the orientation of the splitter
                if (this.isHorSplitter()) return 0;
                if (this.isVertSplitter()) return 1;
                DQX.reportError("Frame is not a splitter");
            }
            that.getTitle = function () {//return the display title
                if (this.myDisplayTitle.length > 0) return this.myDisplayTitle;
                DQX.reportError("Frame does not have a title");
                return this.myFrameID;
            }
            that.hasTitleBar = function () {//returns true of the frame has a visible title bar
                return (this.myDisplayTitle) && ((!this._parentFrame) || (!this._parentFrame.hasTabs()));
            }
            that.getTitleBarHeight = function () {//returns the height of the title bar (0 if none)
                if (this.hasTitleBar())
                    return Framework.frameTitleBarH;
                else
                    return 0;
            }

            that.isStackMember = function () {
                if (!this._parentFrame) return false;
                return this._parentFrame.isStacker();
            }


            ///////////////// TO BE CALLED CREATION TIME

            //Sets an initialisation handler function. This function will be called the first time the frame becomes visible
            that.setInitialiseFunction = function (handler) {
                if (handler)
                    DQX.checkIsFunction(handler);
                this._handleInitialise = handler;
                return this;
            }

            //Converts a generic frame into a vertical splitter
            that.makeGroupVert = function () {
                if (this.myType != '-')
                    DQX.reportError('Frame is not generic');
                this.myType = 'GroupVert';
                return this;
            }

            //Converts a generic frame into a horizontal splitter
            that.makeGroupHor = function () {
                if (this.myType != '-')
                    DQX.reportError('Frame is not generic');
                this.myType = 'GroupHor';
                return this;
            }

            //Specifies the minimum size of the frame in a given dimension
            that.setMinSize = function (dim, sze) {
                Framework.isValidDim(dim);
                DQX.checkIsNumber(sze);
                this.sizeRange[dim].setMinSize(sze);
                return this;
            }

            //Specifies the frame to have a fixed size in a given dimension
            that.setFixedSize = function (dim, sz) {
                Framework.isValidDim(dim);
                DQX.checkIsNumber(sz);
                this.sizeRange[dim].setFixedSize(sz);
                return this;
            }

            that.setAutoSize = function () {
                this.setMinSize(Framework.dimY, 1);
                this.autoSizeY = true;
                return this;
            }

            that.setAnimateTransition = function () {
                this._animateTransition = true;
                return this;
            }

            //Set the margin size (i.e. the space between the outer border of this frame and the outer border of its client frame, containing subframes or the final panel)
            that.setMargins = function (sz) {
                DQX.checkIsNumber(sz);
                this.marginLeft = sz;
                this.marginRight = sz;
                this.marginTop = sz;
                this.marginBottom = sz;
                return this;
            }

            that.setMarginsIndividual = function (left, top, right, bottom) {
                DQX.checkIsNumber(left); DQX.checkIsNumber(top); DQX.checkIsNumber(right); DQX.checkIsNumber(bottom);
                this.marginLeft = left;
                this.marginRight = right;
                this.marginTop = top;
                this.marginBottom = bottom;
                return this;
            }

            //Set the title that will be visible for this frame
            that.setDisplayTitle = function (ttle) {
                DQX.checkIsString(ttle);
                this.myDisplayTitle = ttle;
                return this;
            }

            //For final frames: specify for both dimensions whether or not scroll bars will show up if the client panel grows larger than the frame
            that.setAllowScrollBars = function (allowX, allowY) {
                this.checkFinalPanel();
                DQX.checkIsBoolean(allowX); DQX.checkIsBoolean(allowY);
                this.allowXScrollbar = allowX;
                this.allowYScrollbar = allowY;
                return this;
            }

            //css class of the div that defines the border of this panel
            that.setFrameClass = function (styleClass) {
                DQX.checkIsString(styleClass);
                this.frameClass = styleClass;
                return this;
            }

            //css class of the div that defines the client area of this panel
            that.setFrameClassClient = function (clientStyleClass) {
                DQX.checkIsString(clientStyleClass);
                this.frameClassClient = clientStyleClass;
                return this;
            }

            //For splitter type frames, sets the size of the separator(s) that separate the subframes
            that.setSeparatorSize = function (sepsize) {
                DQX.checkIsNumber(sepsize);
                this.checkSplitter();
                this._separatorSize = sepsize;
                return this;
            }

            //Adds a new subframe to an existing container-style frame (= splitter or tab)
            that.addMemberFrame = function (iframe) {
                if (this.isFinalPanel()) DQX.reportError("Can't add frames to a final panel");
                //iframe.myID = this.myID + '_' + this.memberFrames.length.toString();
                iframe.myID = "Frame" + Framework.frameCounter;
                Framework.frameCounter++;
                this.memberFrames.push(iframe);
                iframe._setParentFrame(this);
                return iframe;
            }

            //Inserts a new frame at the top of an existing frame
            that.InsertFrameTop = function (iframe) {
                var parent = this._parentFrame;
                if (!parent)
                    DQX.reportError("Unable to insert at root frame");
                var intermediate = Framework.FrameGroupVert('', 0.5);
                intermediate._setParentFrame(parent);
                intermediate.myID = this.myID;
                intermediate.mySizeWeight = this.mySizeWeight;
                this.myID = "Frame" + Framework.frameCounter;
                Framework.frameCounter++;
                for (var i = 0; i < parent.memberFrames.length; i++)
                    if (parent.memberFrames[i] == this)
                        parent.memberFrames[i] = intermediate;
                iframe._setParentFrame(intermediate);
                intermediate.addMemberFrame(iframe);
                intermediate.addMemberFrame(this);
                return iframe;
            }

            that.InsertStaticHeader = function (content, iclss, tpe) {
                var clss = iclss;
                if (!clss)
                    clss = 'DQXClientInfo';
                var frame = this.InsertFrameTop(Framework.FrameFinal('', 0.01));
                frame.setFrameClassClient(clss).setFrameClass(clss).setMargins(5).setAllowScrollBars(false, false);
                frame.setAutoSize();
                frame._parentFrame.setSeparatorSize(3);
                if (!tpe) {
                    frame._parentFrame.setDisplayTitle(this.myDisplayTitle); this.myDisplayTitle = '';
                }
                else
                    frame._parentFrame.setSeparatorSize(6);
                frame.setInitialiseFunction(function () {
                    var bmp = '<img src="' + DQXBMP('info2.png') + '" alt="info" style="float:left;margin-right:5px"/>'
                    var info = Framework.Form(frame);
                    info.addHtml(bmp + content);
                    info.render();
                });
            }

            that.InsertIntroBox = function (bitmap, content, helpDocID) {
                var frame = this.InsertFrameTop(Framework.FrameFinal('', 0.01));
                frame.setFrameClassClient('DQXIntroInfo').setFrameClass('DQXIntroInfo').setMargins(12).setAllowScrollBars(false, false);
                frame.setAutoSize();
                frame._parentFrame.setSeparatorSize(6);
                frame.setMinSize(Framework.dimY, 80);
                frame.setInitialiseFunction(function () {
                    var str = '';
                    if (bitmap)
                        str += '<img src="Bitmaps/' + bitmap + '" alt="info" style="float:left;margin-left:0px;margin-top:5px;margin-right:5px;margin-bottom:5px"/>'
                    str += content;
                    var info = Framework.Form(frame);
                    info.addHtml(str);
                    info.render();
                    if (helpDocID) {
                        var helpButton = DocEl.Div({ id: 'LNK' + helpDocID });
                        helpButton.setCssClass('DQXHelpLink DQXIntroBoxHelpLink');
                        helpButton.addElem('<IMG SRC="' + DQXBMP('info4.png') + '" border=0  ALT="" style="float:left;margin-right:2px">More information...')
                        $('#' + frame.myID).append(helpButton.toString());
                        $('#' + frame.myID).mousedown(function () {
                            Msg.send({ type: 'ShowHelp' }, helpButton.getID());
                            return false;
                        });
                    }

                });
                return frame;
            }


            //Sets the client panel for a final frame
            that.setClientObject = function (iobj) {
                this.myClientObject = iobj;
            }



            /////////////// INTERNAL FUNCTIONS

            that._setParentFrame = function (pframe) {
                this._parentFrame = pframe;
            }

            that._calcAutoSizeY = function () {
                var szy = 0;
                if (this.myClientObject)
                    szy = this.myClientObject.getAutoSizeY();
                if (this._parentFrame)
                    szy += this._parentFrame._separatorSize / 2;
                return szy + this.marginTop + this.marginBottom;
            }

            that._getMinSize = function (dim) {
                Framework.isValidDim(dim);

                if ((dim == Framework.dimY) && (this.autoSizeY)) {
                    var minsize = Math.max(this._calcAutoSizeY(), this.sizeRange[dim]._getMinSize());
                    return minsize;
                }

                var subminsize = 0;
                if ((this.isSplitter()) && (this.splitterDim() == dim)) {
                    for (var i = 0; i < this.memberFrames.length; i++)
                        subminsize += this.memberFrames[i]._getMinSize(dim);
                }
                else {
                    for (var i = 0; i < this.memberFrames.length; i++)
                        subminsize = Math.max(subminsize, this.memberFrames[i]._getMinSize(dim));
                }
                var minsize = Math.max(subminsize, this.sizeRange[dim]._getMinSize());
                if ((dim == Framework.dimY) && this.hasTitleBar())
                    minsize += Framework.frameTitleBarH;
                return minsize;
            }

            that._getMaxSize = function (dim) {
                Framework.isValidDim(dim);

                if ((dim == Framework.dimY) && (this.autoSizeY))
                    return that._getMinSize(dim);

                var submaxsize = 0;
                if ((this.isSplitter()) && (this.splitterDim() == dim)) {
                    for (var i = 0; i < this.memberFrames.length; i++)
                        submaxsize += this.memberFrames[i]._getMaxSize(dim);
                }
                else {
                    for (var i = 0; i < this.memberFrames.length; i++)
                        submaxsize = Math.max(submaxsize, this.memberFrames[i]._getMaxSize(dim));
                }
                var maxsize = Math.max(submaxsize, this.sizeRange[dim]._getMaxSize());
                if ((dim == Framework.dimY) && this.hasTitleBar())
                    maxsize += Framework.frameTitleBarH;
                return maxsize;
            }

            //Returns the total margin at the top, including the header area
            that._getMarginTop = function () {
                return this.marginTop + (this.hasTitleBar() ? Framework.frameTitleBarH : 0);
            }

            //Returns true if the frame has a fixed size in a specified dimension
            that._isFixedSize = function (dim) {
                Framework.isValidDim(dim);
                if ((dim == Framework.dimY) && (this.autoSizeY))
                    return true;
                return this.sizeRange[dim]._isFixedSize();
            }

            that._reactClickTab = function (scope, id) {
                for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                    var tabid = this.getClientDivID() + '_tab_' + fnr;
                    if (tabid == id)
                        this.activeTabNr = fnr;
                }
                this._setSubFramesPosition();
                this._onChangeTab(this.memberFrames[this.activeTabNr].myFrameID);
            }

            that._createElements = function (level) {
                if (this.myID.length == 0) DQX.reportError("Frame without ID");
                var thediv = DocEl.Div({ id: this.myID });

                var theclientcontainerdiv = DocEl.Div({ parent: thediv, id: this.getClientContainerDivID() });

                var thescrollerdiv = DocEl.Div({ parent: theclientcontainerdiv, id: this.getClientDivID() + 'Scroller' });
                var theclientdiv = DocEl.Div({ parent: thescrollerdiv, id: this.getClientDivID() });
                thediv.setWidthPx(100);
                thediv.setHeightPx(100);
                var fr = 1 - 0.1 * level;

                if (this.frameClass.length > 0)
                    thediv.setCssClass(this.frameClass);

                if (this.isFinalPanel()) {
                    if (this.allowYScrollbar)
                        theclientdiv.addStyle('overflow-y', 'auto');
                    else
                        theclientdiv.addStyle('overflow-y', 'hidden');
                    if (this.allowXScrollbar)
                        theclientdiv.addStyle('overflow-x', 'auto');
                    else
                        theclientdiv.addStyle('overflow-x', 'hidden');
                    theclientdiv.setCssClass('DQXClient');
                }

                if (this.hasTitleBar()) {
                    var titlediv = DocEl.Div({ parent: thediv, id: this.getVisibleTitleDivID() });
                    titlediv.setHeightPx(Framework.frameTitleBarH);
                    if (!this.isStackMember())
                        titlediv.setCssClass('DQXTitleBarRounded');
                    else
                        titlediv.setCssClass('DQXTitleBar');
                    titlediv.addElem(this.myDisplayTitle);
                }

                /*                if (this.marginTop > 0) {
                var titlediv = DocEl.Div({ parent: thediv, id: this.getVisibleTitleDivID() });
                }*/

                if (this.isSplitter()) {
                    for (var fnr = 0; fnr < this.memberFrames.length - 1; fnr++) {
                        var splitdiv = DocEl.Div({ parent: thediv, id: this.getSeparatorDivID(fnr) });
                        if (this._canMoveSeparator(fnr)) {
                            if (this.isHorSplitter())
                                splitdiv.addStyle('cursor', 'col-resize');
                            else
                                splitdiv.addStyle('cursor', 'row-resize');
                        }
                    }
                    for (var fnr = 0; fnr < this.memberFrames.length; fnr++)
                        theclientdiv.addElem(this.memberFrames[fnr]._createElements(level + 1));
                }

                if (this.isStacker()) {
                    this.activeTabNr = 0;
                    theclientdiv.setCssClass("DQXTabSet");
                    var tabheader = DocEl.Div({ parent: theclientdiv, id: this.getClientDivID() + '_tabheader' });
                    tabheader.setCssClass("DQXTabs");
                    if (!this.hasTabs())
                        tabheader.addStyle('display', 'none');
                    var tabbody = DocEl.Div({ parent: theclientdiv, id: this.getClientDivID() + '_tabbody' });
                    tabbody.setCssClass("DQXTabBody");
                    for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                        var tabid = this.getClientDivID() + '_tab_' + fnr;
                        var tabcontent = DocEl.Div({ parent: tabbody, id: 'C' + tabid });
                        tabcontent.setCssClass("DQXTabContent");
                        tabcontent.addElem(this.memberFrames[fnr]._createElements(level + 1));
                    }
                    Msg.listen('', { type: 'ClickTab', id: this.getClientDivID() }, that._reactClickTab, that);
                }

                if (this.frameClassClient.length > 0) {
                    theclientdiv.setCssClass(this.frameClassClient);
                    theclientcontainerdiv.setCssClass(this.frameClassClient);
                }

                return thediv;
            }

            that._performSwitchTab = function (newid) {
                var tabset = $('#' + that.getClientDivID());
                $(tabset).children('.DQXTabs').children('.DQXTab').removeClass('DQXTabActive');
                $(tabset).children('.DQXTabs').children('.DQXTab').addClass('DQXTabInactive');
                $('#' + newid).addClass("DQXTabActive");
                $('#' + newid).removeClass("DQXTabInactive");

                var content_show = 'C' + newid;

                var content_hide = null;
                $.each($(tabset).children('.DQXTabBody').children('.DQXTabContent'), function (idx, obj) {
                    if ($(obj).css('display') != 'none')
                        content_hide = $(obj).attr('id');
                });
                if (!content_hide) DQX.reportError('Unable to determine active tab');


                var elemHide = $(tabset).find("#" + content_hide);
                var elemShow = $(tabset).find("#" + content_show);
                if (elemHide.length != 1) DQX.reportError('Invalid tab ' + content_hide);
                if (elemShow.length != 1) DQX.reportError('Invalid tab ' + content_show);

                if (this._animateTransition) {
                    var transientOpacity = 0.8;
                    var elemClient = $('#' + that.getClientDivID() + '_tabbody');
                    var x0 = elemClient.offset().left;
                    var y0 = elemClient.offset().top;
                    var lx = elemClient.outerWidth();
                    var ly = elemClient.outerHeight();
                    var background = DocEl.Div({ id: 'DQXTabTransientBlocker' });
                    background.addStyle("position", "absolute");
                    background.addStyle("left", x0 + 'px');
                    background.addStyle("top", y0 + 'px');
                    background.addStyle('width', lx + 'px');
                    background.addStyle('height', ly + 'px');
                    background.addStyle('background-color', 'rgb(60,60,60)');
                    background.addStyle('opacity', transientOpacity);
                    background.addStyle('z-index', '2000');
                    $('#DQXUtilContainer').append(background.toString());
                }

                elemHide.hide();
                elemShow.show();
                Msg.broadcast({ type: 'ClickTab', id: that.getClientDivID() }, newid);

                if (this._animateTransition) {
                    var transientAction = function () {
                        if (transientOpacity > 0) {
                            $('#DQXTabTransientBlocker').css('opacity', transientOpacity);
                            transientOpacity -= 0.3;
                            setTimeout(transientAction, 50);
                        }
                        else {
                            $('#DQXTabTransientBlocker').remove();
                        }
                    }
                    setTimeout(transientAction, 125);
                }

            };

            that._createTabItems = function () {
                var availabeWidth = $('#' + this.getClientDivID() + '_tabbody').width() - 20;
                if (availabeWidth > 0) {
                    var longestTitleLength = 0;
                    for (var fnr = 0; fnr < this.memberFrames.length; fnr++)
                        longestTitleLength = Math.max(longestTitleLength, this.memberFrames[fnr].getTitle().length);

                    var maxTitleLength = longestTitleLength;
                    do {
                        var content = '';
                        for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                            var tabid = this.getClientDivID() + '_tab_' + fnr;
                            var tabheaderitem = DocEl.Div({ id: tabid });
                            tabheaderitem.setCssClass(fnr == this.activeTabNr ? "DQXTab DQXTabActive" : "DQXTab DQXTabInactive");
                            var shortTitle = this.memberFrames[fnr].getTitle();
                            if (maxTitleLength < shortTitle.length)
                                shortTitle = shortTitle.substring(0, maxTitleLength) + '...';
                            tabheaderitem.addElem(shortTitle);
                            content += tabheaderitem;
                        }
                        $('#' + this.getClientDivID() + '_tabheader').html(content);
                        var consumedWidth = 0;
                        for (var fnr = 0; fnr < this.memberFrames.length; fnr++)
                            consumedWidth += $('#' + this.getClientDivID() + '_tab_' + fnr).outerWidth();
                        maxTitleLength--;
                    }
                    while ((consumedWidth > availabeWidth) && (maxTitleLength > 0));

                    var tabset = $('#' + this.getClientDivID());

                    $(tabset).children('.DQXTabBody').children('.DQXTabContent').css('display', 'none');
                    var activeid = 'C' + $(tabset).find('.DQXTabActive').attr('id');
                    $(tabset).find('#' + activeid).css('display', 'inline');
                    $(tabset).children('.DQXTabs').children('.DQXTab').click(function () {
                        that._performSwitchTab($(this).attr("id"));
                    });
                }

            }


            that._postCreateHTML = function () {
                var clientel = $('#' + this.getClientDivID());
                clientel.mousedown($.proxy(this._handleOnMouseDown, this));
                clientel.mousemove($.proxy(this._handleOnMouseMove, this));
                for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                    if (fnr < this.memberFrames.length - 1) {
                        if (this.isSplitter()) {
                            $('#' + this.getSeparatorDivID(fnr)).mousedown($.proxy(this._handleSplitterOnMouseDown, this));
                            $('#' + this.getSeparatorDivID(fnr)).mousemove($.proxy(this._handleSplitterOnMouseMove, this));
                            clientel.mousemove($.proxy(this._handleSplitterOnMouseMove, this));
/*Code to make splitters moveable on touc devices
                            var touchHandler = {
                                handleTouchStart: function (info, ev) {
                                    var splitid = that.getSeparatorDivID(fnr);
                                    ev.pageX = info.pageX;
                                    ev.pageY = info.pageY;
                                    ev.target = { id: splitid };
                                    that._handleSplitterOnMouseDown(ev);
                                },
                                handleTouchMove: function (info, ev) {
                                    var splitid = that.getSeparatorDivID(fnr);
                                    ev.pageX = info.pageX;
                                    ev.pageY = info.pageY;
                                    ev.target = { id: splitid };
                                    that._handleSplitterOnMouseMove(ev);
                                }
                            };
                            DQX.augmentTouchEvents(touchHandler, this.getSeparatorDivID(fnr), true, false);
*/
                        }
                    }
                    this.memberFrames[fnr]._postCreateHTML();
                }

            }

            that._canMoveSeparator = function (sepnr) {
                var flex1 = false;
                for (var i = 0; i <= sepnr; i++)
                    if (!this.memberFrames[i]._isFixedSize(this.splitterDim()))
                        flex1 = true;
                var flex2 = false;
                for (var i = sepnr + 1; i < this.memberFrames.length; i++)
                    if (!this.memberFrames[i]._isFixedSize(this.splitterDim()))
                        flex2 = true;
                return flex1 && flex2;
            }

            that._handleSplitterOnMouseDown = function (ev) {
                var frameel = $('#' + this.myID);
                var clientel = $('#' + this.getClientDivID());
                var posx = ev.pageX - clientel.offset().left;
                var posy = ev.pageY - clientel.offset().top;
                var pos = this.isHorSplitter() ? posx : posy;
                var idcomps = ev.target.id.split('_');
                var sepnr = parseInt(idcomps[idcomps.length - 1]);
                if (this._canMoveSeparator(sepnr)) {
                    this.dragSep = true;
                    this.dragSepNr = sepnr;
                    this.dragOffset = pos - this.sepPosits[sepnr];
                    $(document).bind('mouseup', that._handleOnMouseUp);
                    return false;
                }
            }

            that._handleSplitterOnMouseMove = function (ev) {
                var clientel = $('#' + this.getClientDivID());
                var posx = ev.pageX - clientel.offset().left;
                var posy = ev.pageY - clientel.offset().top;

                if (this.dragSep) {
                    var totsize = this.isHorSplitter() ? clientel.width() : clientel.height();
                    var pos = this.isHorSplitter() ? posx : posy;
                    this._calculateNewFrameSizeFractions(this.dragSepNr, pos - this.dragOffset, totsize);
                    this._setSubFramesPosition();
                    return false;
                }
            }


            that._handleOnMouseDown = function (ev) {
            }

            that._handleOnMouseMove = function (ev) {
            }


            that._handleOnMouseUp = function (ev) {
                $(document).unbind('mouseup', that._handleOnMouseUp);
                that.dragSep = false;
            }

            //calculate & return the frame pixel positions from the fractions
            that._calculateFramePositions = function (totsize) {
                var pos = 0;
                this.sepPosits = [];
                var framePosits = [];
                for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                    if (!this.memberFrames[fnr].mySizeWeight)
                        DQX.reportError('Frame "' + this.memberFrames[fnr].myFrameID + '" does not have size weight information');
                    if (fnr > 0) this.sepPosits.push(pos);
                    var pos2 = pos + totsize * this.memberFrames[fnr].mySizeWeight;
                    var mar1 = Math.round(pos + ((fnr > 0) ? (this._separatorSize / 2) : 0));
                    var mar2 = Math.round(pos2 - ((fnr < this.memberFrames.length - 1) ? (this._separatorSize / 2) : 0));
                    framePosits.push({ pos1: mar1, pos2: mar2 });
                    pos = pos2;
                }
                return framePosits;
            }

            //recalculate new frame size fractions, with a separator at a new position
            that._calculateNewFrameSizeFractions = function (sepnr, pos, totsize) {
                var posits = [];
                var ps = 0;
                for (var i = 0; i < this.memberFrames.length; i++) {
                    ps += this.memberFrames[i].mySizeWeight * totsize;
                    posits.push(ps);
                }
                posits[sepnr] = pos;
                var prevposit = 0;
                for (var i = 0; i < this.memberFrames.length; i++) {
                    this.memberFrames[i].mySizeWeight = Math.max(1.0e-9, (posits[i] - prevposit) / totsize);
                    prevposit = posits[i];
                }
                this._adjustFrameSizeFractions(totsize);
            }


            //adjusts the frame size fraction so that they obey the size limitations
            that._adjustFrameSizeFractions = function (totsize) {

                var widths = [];
                var widths_min = [];
                var widths_max = [];
                for (var i = 0; i < this.memberFrames.length; i++) {
                    widths.push(this.memberFrames[i].mySizeWeight * totsize);
                    widths_min.push(this.memberFrames[i]._getMinSize(this.splitterDim()));
                    widths_max.push(this.memberFrames[i]._getMaxSize(this.splitterDim()));
                }

                var modif = true;
                for (var iter = 0; (iter < 5) && modif; iter++) {
                    modif = false;
                    for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                        if (widths[fnr] < widths_min[fnr] - 1) {
                            var extra = widths_min[fnr] - widths[fnr];
                            widths[fnr] += extra;
                            for (var i = 0; i < this.memberFrames.length; i++)
                                if (i != fnr)
                                    widths[i] -= extra / (this.memberFrames.length - 1);
                            modif = true;
                        }
                        if (widths[fnr] > widths_max[fnr] + 1) {
                            var extra = widths_max[fnr] - widths[fnr];
                            widths[fnr] += extra;
                            for (var i = 0; i < this.memberFrames.length; i++)
                                if (i != fnr)
                                    widths[i] -= extra / (this.memberFrames.length - 1);
                            modif = true;
                        }
                    }
                }

                for (var fnr = 0; fnr < this.memberFrames.length; fnr++)
                    this.memberFrames[fnr].mySizeWeight = Math.max(1.0e-9, widths[fnr] / totsize);

            }

            that._setSubFramesPosition = function () {
                this._executeInitialisers();
                var frameel = $('#' + this.myID);
                this._setPosition(frameel.position().left, frameel.position().top, frameel.width(), frameel.height(), true, false);
            }


            that._executeInitialisers = function () {
                for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                    var hidden = false;
                    if (this.isStacker())
                        if (fnr != this.activeTabNr)
                            hidden = true;
                    if (!hidden)
                        this.memberFrames[fnr]._executeInitialisers();
                }
                if (!this._initialised) {
                    this._initialised = true;
                    if (this._handleInitialise)
                        this._handleInitialise();
                }
            }


            that._setPosition = function (x0, y0, sx, sy, subFramesOnly, isHidden) {
                var frameel = $('#' + this.myID);

                if (!subFramesOnly) {
                    frameel.css('position', 'absolute');
                    frameel.css('left', x0 + 'px');
                    frameel.css('top', y0 + 'px');
                    frameel.css('width', sx + 'px');
                    frameel.css('height', sy + 'px');
                }

                var clientWidth = sx - this.marginRight - this.marginLeft;
                var clientHeight = sy - this.getTitleBarHeight() - this.marginBottom - this.marginTop;

                if (!subFramesOnly) {
                    var clientcontainerel = $('#' + this.getClientContainerDivID());
                    clientcontainerel.css('position', 'absolute');
                    clientcontainerel.css('left', '0px');
                    clientcontainerel.css('top', this.getTitleBarHeight() + 'px');
                    clientcontainerel.css('width', sx + 'px');
                    clientcontainerel.css('height', (sy - this.getTitleBarHeight()) + 'px');
                    var clientel = $('#' + this.getClientDivID());
                    clientel.css('position', 'absolute');
                    clientel.css('left', this.marginLeft + 'px');
                    clientel.css('top', this.marginTop + 'px');
                    clientel.css('width', clientWidth + 'px');
                    clientel.css('height', clientHeight + 'px');
                }

                if (!this._initialised && (!isHidden)) {
                    this._initialised = true;
                    if (this._handleInitialise)
                        this._handleInitialise();
                }


                //normalise size weights
                var totsubsizeweight = 0.0;
                for (var fnr = 0; fnr < this.memberFrames.length; fnr++)
                    totsubsizeweight += this.memberFrames[fnr].mySizeWeight;
                for (var fnr = 0; fnr < this.memberFrames.length; fnr++)
                    this.memberFrames[fnr].mySizeWeight /= totsubsizeweight;

                if (this.isHorSplitter()) {
                    this._adjustFrameSizeFractions(clientWidth);
                    this.sepPosits = [];
                    var framePosits = that._calculateFramePositions(clientWidth);
                    for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                        this.memberFrames[fnr]._setPosition(framePosits[fnr].pos1, 0, framePosits[fnr].pos2 - framePosits[fnr].pos1 + 1, clientHeight, false, isHidden);
                        if (fnr < this.memberFrames.length - 1) {
                            var splitterel = $('#' + this.getSeparatorDivID(fnr));
                            splitterel.css('position', 'absolute');
                            splitterel.css('left', (framePosits[fnr].pos2 + this.marginLeft) + 'px');
                            splitterel.css('top', this._getMarginTop() + 'px');
                            splitterel.css('width', this._separatorSize + 'px');
                            splitterel.css('height', clientHeight + 'px');
                        }
                    }
                }

                if (this.isVertSplitter()) {
                    this._adjustFrameSizeFractions(clientHeight);
                    this.sepPosits = [];
                    var framePosits = that._calculateFramePositions(clientHeight);
                    for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                        this.memberFrames[fnr]._setPosition(0, framePosits[fnr].pos1, clientWidth, framePosits[fnr].pos2 - framePosits[fnr].pos1 + 1, false, isHidden);
                        if (fnr < this.memberFrames.length - 1) {
                            var splitterel = $('#' + this.getSeparatorDivID(fnr));
                            splitterel.css('position', 'absolute');
                            splitterel.css('top', (framePosits[fnr].pos2 + this._getMarginTop()) + 'px');
                            splitterel.css('left', this.marginLeft + 'px');
                            splitterel.css('height', this._separatorSize + 'px');
                            splitterel.css('width', clientWidth + 'px');
                        }
                    }
                }

                if (this.isStacker()) {
                    var tabOffset = 0;
                    if (this.hasTabs())
                        tabOffset = 30;
                    $('#' + this.getClientDivID() + '_tabbody').css('height', clientHeight /*- 47*/ - tabOffset - 17);
                    for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                        this.memberFrames[fnr]._setPosition(0, tabOffset, clientWidth, clientHeight - tabOffset, false, isHidden || (fnr != this.activeTabNr));
                    }
                }

                if (!subFramesOnly)
                    if (this.isStacker())
                        this._createTabItems();

                if (this.isFinalPanel()) {
                    if (this.myClientObject != null)
                        this.myClientObject.handleResize();
                    else
                        this._needUpdateSize = true;
                }

            }

            that._updateSize = function () {
                for (var fnr = 0; fnr < this.memberFrames.length; fnr++)
                    this.memberFrames[fnr]._updateSize();
                if ((this.isFinalPanel()) && (this._needUpdateSize)) {
                    this._needUpdateSize = false;
                    if (this.myClientObject != null) {
                        this.myClientObject.handleResize();
                    }
                }
            }


            ///////////// RUNTIME CALLS

            //Activates another subframe in a tabbed frame, specified by its ID
            //The function returns true if this invoked an actual change
            that.switchTab = function (newtab) {
                if (!this.isStacker()) DQX.reportError("Container is not a tab");
                if (this.getActiveTabFrameID() == newtab)
                    return false;
                var newTabID = null;
                for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                    if (newtab == this.memberFrames[fnr].myFrameID)
                        newTabID = this.getClientDivID() + '_tab_' + fnr;
                }
                if (!newTabID) DQX.reportError('Tab switch: invalid end tag');
                that._performSwitchTab(newTabID);
                return true;
            }

            //Returns the ID of the active subframe in a tabbed frame
            that.getActiveTabFrameID = function () {
                if (!this.isStacker()) DQX.reportError("Container is not a tab");
                return this.memberFrames[this.activeTabNr].myFrameID;
            }

            //Sets a new display title
            that.modifyDisplayTitle = function (newtitle) {
                $('#' + this.getVisibleTitleDivID()).text(newtitle);
            }

            //Determines if a frame is currently visible (e.g. not hidden behind a tab)
            that.isVisible = function () {
                var fr = this;
                while (fr._parentFrame != null) {
                    if (fr._parentFrame.isStacker())
                        if (fr._parentFrame.getActiveTabFrameID() != fr.myFrameID)
                            return false;
                    fr = fr._parentFrame;
                }
                return true;
            }

            //Ensures that a frame is visible (e.g. by activating all required tabs in the parent chain)
            that.makeVisible = function () {
                if (this.isVisible())
                    return;
                var fr = this;
                var tabSwitchList = [];
                while (fr._parentFrame != null) {
                    if (fr._parentFrame.isStacker())
                        tabSwitchList.unshift(fr);
                    fr = fr._parentFrame;
                }
                HistoryManager.__ignoreSwitchTab = true;
                for (var i = 0; i < tabSwitchList.length; i++) {
                    tabSwitchList[i]._parentFrame.switchTab(tabSwitchList[i].myFrameID);
                }
                HistoryManager.__ignoreSwitchTab = false;
                if (tabSwitchList.length > 0) {
                    var fr = tabSwitchList[tabSwitchList.length - 1];
                    Msg.broadcast({ type: 'ChangeTab', id: fr._parentFrame }, fr.myFrameID);
                }

                if (this.myClientObject != null)
                    this.myClientObject.handleResize(); //this triggers immediate correct sizing of the panel;
                return true;
            }

            //Fills a final frame with some static content
            that.setStaticContent = function (divid) {
                this.checkFinalPanel();
                var content = $('#' + divid).html();
                $('#' + this.getClientDivID()).html(content);
            }


            /////////////// NOTIFICATION FUNCTIONS

            that._onChangeTab = function (newtab) {
                Msg.broadcast({ type: 'ChangeTab', id: this.myFrameID }, this.getActiveTabFrameID());
            }




            ////////////// FINAL INITIALISATION CODE

            if (that.isFinalPanel()) {
                that.marginLeft = 5;
                that.marginRight = 5;
                that.marginTop = 5;
                that.marginBottom = 5;
            }
            return that;
        }




        Framework._handleResize = function () {
            var myparent = $('#' + Framework.frameRoot.myID).parent();
            var v1 = myparent.attr('id');
            var v2 = myparent.get(0).tagName;
            var sx = myparent.innerWidth();
            var sy = myparent.innerHeight();
            Framework.frameRoot._executeInitialisers();
            Framework.frameRoot._setPosition(0, 0, sx, sy, false, false);
        }

        //This function is called periodically the monitor the required size updates of panels in frames
        Framework._updateSize = function () {
            if (Framework.frameRoot)
                Framework.frameRoot._updateSize();
            setTimeout(Framework._updateSize, 100);
        }
        Framework._updateSize();




        //Renders the framework to the html page, in a div
        Framework.render = function (frameRoot, divid) {
            Framework.frameRoot = frameRoot;
            var html = frameRoot._createElements(1).toString();
            $('#' + divid).html(html);
            frameRoot._postCreateHTML();

            $(window).resize(Framework._handleResize)

            Framework._handleResize();
        }





        ///////////////////////////////////////////////////////////////////////////////////////////////

        Framework.ViewSet = function (iFrame, iStateID) {
            var that = {};
            that.myFrame = iFrame;
            that.myStateID = iStateID;

            that.registerView = function () {
                HistoryManager.addView(this);
            }

            that.getStateID = function () { return this.myStateID; }


            that.getStateKeys = function () {//default implementation, can be overwritten
                var mp = {};
                mp[this.myStateID] = null;
                return mp;
            }

            that._initialisePanels = function () {
                that.createPanels();
            }

            that.disableAutoCreatePanels = function () {
                that.myFrame.setInitialiseFunction(null);
            }


            that.myFrame.setInitialiseFunction(that._initialisePanels);

            return that;
        }





        ///////////////////////////////////////////////////////////////////////////////////////////////

        Framework.Form = function (iid, iParentRef) {
            var that = FramePanel(iid, iParentRef);
            that._content = Controls.CompoundHor([]);

            that.clear = function () {
                that._content.clear();
            }

            that.addControl = function (ctrl) {
                that._content.addControl(ctrl);
                return ctrl;
            }

            that.addHtml = function (content) {
                that._content.addControl(Controls.Label(content));
            }

            that._getInnerDivID = function () {
                return this.getDivID() + 'Inner';
            }

            that.render = function () {
                var st = that._content.renderHtml();
                st = '<div id="' + this._getInnerDivID() + '">' + st + '</div>';
                $('#' + this.getDivID()).html(st);
                this.content = st;
                that._content.postCreateHtml();

                if (this.myParentFrame.autoSizeY)
                    Framework._handleResize(); //force resizing of the frames if the content was changed
            }

            that.getAutoSizeY = function () {
                var obj = document.getElementById(this._getInnerDivID());
                if (obj)
                    return obj.offsetHeight;
                else
                    return 0;
            }

            that.handleResize = function () {
            }

            return that;
        }
        return Framework;
    });

