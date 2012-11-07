define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/Controls"],
    function ($, DocEl, Msg, Controls) {
        var Framework = {};
        //two constants defining the X and Y direction
        Framework.dimX = 0;
        Framework.dimY = 1;
        Framework.isValidDim = function (dim) {
            if ((dim !== 0) && (dim !== 1))
                throw "Invalid dimension identifier";
        }

        Framework.frameTitleBarH = 33;
        Framework.sepSizeLarge = 14;
        Framework.sepSizeSmall = 6;


        Framework.FrameTypes = [
        'Final', //contains no more subpanels, and holds a client area
        'GroupHor', //Contains a horizontally spread set of subframes
        'GroupVert', //Contains a vertically spread set of subframes
        'Tab'//Contains a set of subframes organised as tabs
        ];

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
            that.isFixedSize = function () {
                return this.maxSize == this.minSize;
            }
            that.getMinSize = function () {
                if (this.minSize == 510)
                    var q = 0;
                return this.minSize;
            }
            that.getMaxSize = function () {
                return this.maxSize;
            }
            return that;
        }

        Framework.FrameGroupHor = function (iid, isizeweight) {
            return Framework.Frame(iid, 'GroupHor', isizeweight);
        }

        Framework.FrameGroupVert = function (iid, isizeweight) {
            return Framework.Frame(iid, 'GroupVert', isizeweight);
        }

        Framework.FrameGroupTab = function (iid, isizeweight) {
            return Framework.Frame(iid, 'Tab', isizeweight);
        }

        Framework.FrameFinal = function (iid, isizeweight) {
            return Framework.Frame(iid, 'Final', isizeweight);
        }


        Framework.Frame = function (iid, itype, isizeweight) {
            var that = {};

            that.myParent = null;
            that.myFrameID = iid;
            that.myDisplayTitle = '';
            that.myType = itype;
            that.mySizeWeight = isizeweight;
            that.sizeRange = [Framework.SizeRange(), Framework.SizeRange()]; //allowed frame size range in X and Y dir
            that.marginLeft = 0;
            that.marginRight = 0;
            that.marginTop = 0;
            that.marginBottom = 0;
            that.memberFrames = [];
            that.myClientObject = null;
            that.myID = '';
            that.sepSize = 10;
            that.frameClass = ''; //css class of the div that makes the border of this panel
            that.frameClassClient = ''; //css class of the div that makes the client area this panel

            that.allowYScrollbar = true;
            that.allowXScrollbar = false;

            ////////////////// GETNERAL GETTERS

            that.getVisibleTyleDivID = function () {
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

            that.isTabber = function () {
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

            that.splitterDim = function () {
                if (this.isHorSplitter()) return 0;
                if (this.isVertSplitter()) return 1;
                throw "Frame is not a splitter";
            }

            that.getTitle = function () {
                if (this.myDisplayTitle.length > 0) return this.myDisplayTitle;
                return this.myFrameID;
            }

            that.hasTitleBar = function () {
                return (this.myDisplayTitle) && ((!this.myParent) || (!this.myParent.isTabber()));
            }

            that.getTitleBarHeight = function () {
                if (this.hasTitleBar())
                    return Framework.frameTitleBarH;
                else
                    return 0;
            }

            ///////////////// TO BE CALLED CREATION TIME

            that.setFixedSize = function (dim, sz) {
                Framework.isValidDim(dim);
                this.sizeRange[dim].setFixedSize(sz);
                return this;
            }

            that.setMargins = function (sz) {
                this.marginLeft = sz;
                this.marginRight = sz;
                this.marginTop = sz;
                this.marginBottom = sz;
                return this;
            }

            that.setDisplayTitle = function (ttle) {
                this.myDisplayTitle = ttle;
            }

            that.getMarginTop = function () {
                return this.marginTop + (this.hasTitleBar() ? Framework.frameTitleBarH : 0);
            }

            that.isFixedSize = function (dim) {
                Framework.isValidDim(dim);
                return this.sizeRange[dim].isFixedSize();
            }

            that.getMinSize = function (dim) {
                var subminsize = 0;
                if ((this.isSplitter()) && (this.splitterDim() == dim)) {
                    for (var i = 0; i < this.memberFrames.length; i++)
                        subminsize += this.memberFrames[i].getMinSize(dim);
                }
                else {
                    for (var i = 0; i < this.memberFrames.length; i++)
                        subminsize = Math.max(subminsize, this.memberFrames[i].getMinSize(dim));
                }
                var minsize = Math.max(subminsize, this.sizeRange[dim].getMinSize());
                if ((dim == Framework.dimY) && this.hasTitleBar())
                    minsize += Framework.frameTitleBarH;
                return minsize;
            }

            that.getMaxSize = function (dim) {
                var submaxsize = 0;
                if ((this.isSplitter()) && (this.splitterDim() == dim)) {
                    for (var i = 0; i < this.memberFrames.length; i++)
                        submaxsize += this.memberFrames[i].getMaxSize(dim);
                }
                else {
                    for (var i = 0; i < this.memberFrames.length; i++)
                        submaxsize = Math.max(submaxsize, this.memberFrames[i].getMaxSize(dim));
                }
                var maxsize = Math.max(submaxsize, this.sizeRange[dim].getMaxSize());
                if ((dim == Framework.dimY) && this.hasTitleBar())
                    maxsize += Framework.frameTitleBarH;
                return maxsize;
            }


            that.addMemberFrame = function (iframe) {
                if (this.isFinalPanel()) throw "Can't add frames to a final panel";
                iframe.myID = this.myID + '_' + this.memberFrames.length.toString();
                this.memberFrames.push(iframe);
                iframe.myParent = this;
                return iframe;
            }

            that.setClientObject = function (iobj) {
                this.myClientObject = iobj;
            }



            /////////////// INTERNAL FUNCTIONS

            that._reactClickTab = function (scope, id) {
                this.setSubFramesPosition();
                for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                    var tabid = this.getClientDivID() + '_tab_' + fnr;
                    if (tabid == id) {
                        this.activeTabNr = fnr;
                        this.onChangeTab(this.memberFrames[fnr].myFrameID);
                    }
                }
            }

            that.createElements = function (level) {
                if (this.myID.length == 0) throw "Frame without ID";
                var thediv = DocEl.Div({ id: this.myID });

                var theclientcontainerdiv = DocEl.Div({ parent: thediv, id: this.getClientContainerDivID() });

                var theclientdiv = DocEl.Div({ parent: theclientcontainerdiv, id: this.getClientDivID() });
                thediv.setWidthPx(100);
                thediv.setHeightPx(100);
                var fr = 1 - 0.1 * level;

                if (this.frameClass.length > 0)
                    thediv.setCssClass(this.frameClass);

                if (this.isFinalPanel()) {
                    if (this.allowYScrollbar) theclientdiv.addStyle('overflow-y', 'auto');
                    if (this.allowXScrollbar) theclientdiv.addStyle('overflow-x', 'auto');
                    theclientdiv.setCssClass('DQXClient');
                }

                if (this.hasTitleBar()) {
                    var titlediv = DocEl.Div({ parent: thediv, id: this.getVisibleTyleDivID() });
                    titlediv.setHeightPx(Framework.frameTitleBarH);
                    titlediv.setCssClass('DQXTitleBar');
                    titlediv.addElem(this.myDisplayTitle);
                }

                /*                if (this.marginTop > 0) {
                var titlediv = DocEl.Div({ parent: thediv, id: this.getVisibleTyleDivID() });
                }*/

                if (this.isSplitter()) {
                    for (var fnr = 0; fnr < this.memberFrames.length - 1; fnr++) {
                        var splitdiv = DocEl.Div({ parent: thediv, id: this.getSeparatorDivID(fnr) });
                        if (this.canMoveSeparator(fnr)) {
                            if (this.isHorSplitter())
                                splitdiv.addStyle('cursor', 'col-resize');
                            else
                                splitdiv.addStyle('cursor', 'row-resize');
                        }
                    }
                    for (var fnr = 0; fnr < this.memberFrames.length; fnr++)
                        theclientdiv.addElem(this.memberFrames[fnr].createElements(level + 1));
                }

                if (this.isTabber()) {
                    theclientdiv.setCssClass("DQXTabSet");
                    var tabheader = DocEl.Div({ parent: theclientdiv, id: this.getClientDivID() + '_tabheader' });
                    tabheader.setCssClass("DQXTabs");
                    var tabbody = DocEl.Div({ parent: theclientdiv, id: this.getClientDivID() + '_tabbody' });
                    tabbody.setCssClass("DQXTabBody");
                    this.activeTabNr = 0;
                    for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                        var tabid = this.getClientDivID() + '_tab_' + fnr;
                        var tabcontent = DocEl.Div({ parent: tabbody, id: 'C' + tabid });
                        tabcontent.setCssClass("DQXTabContent");
                        tabcontent.addElem(this.memberFrames[fnr].createElements(level + 1));
                    }
                    Msg.listen('', { type: 'ClickTab', id: this.getClientDivID() }, that._reactClickTab, that);
                }

                if (this.frameClassClient.length > 0) {
                    theclientdiv.setCssClass(this.frameClassClient);
                    theclientcontainerdiv.setCssClass(this.frameClassClient);
                }

                return thediv;
            }


            that._createTabItems = function () {
                var availabeWidth = $('#' + this.getClientDivID() + '_tabheader').width() - 20;
                if (availabeWidth < 0)
                    var q = 0;
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
                        $(tabset).children('.DQXTabs').children('.DQXTab').removeClass('DQXTabActive');
                        $(tabset).children('.DQXTabs').children('.DQXTab').addClass('DQXTabInactive');
                        $(this).addClass("DQXTabActive");
                        $(this).removeClass("DQXTabInactive");
                        $(tabset).children('.DQXTabBody').children('.DQXTabContent').css('display', 'none');
                        var content_show = 'C' + $(this).attr("id");
                        $(tabset).find("#" + content_show).css('display', 'inline');
                        Msg.send({ type: 'ClickTab', id: that.getClientDivID() }, this.id);
                    });
                }

            }


            that.postCreateHTML = function () {
                var clientel = $('#' + this.getClientDivID());
                clientel.mousedown($.proxy(this._handleOnMouseDown, this));
                clientel.mousemove($.proxy(this._handleOnMouseMove, this));
                for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                    if (fnr < this.memberFrames.length - 1) {
                        $('#' + this.getSeparatorDivID(fnr)).mousedown($.proxy(this._handleSplitterOnMouseDown, this));
                        $('#' + this.getSeparatorDivID(fnr)).mousemove($.proxy(this._handleSplitterOnMouseMove, this));
                        clientel.mousemove($.proxy(this._handleSplitterOnMouseMove, this));
                    }
                    this.memberFrames[fnr].postCreateHTML();
                }

            }

            that.canMoveSeparator = function (sepnr) {
                var flex1 = false;
                for (var i = 0; i <= sepnr; i++)
                    if (!this.memberFrames[i].isFixedSize(this.splitterDim()))
                        flex1 = true;
                var flex2 = false;
                for (var i = sepnr + 1; i < this.memberFrames.length; i++)
                    if (!this.memberFrames[i].isFixedSize(this.splitterDim()))
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
                if (this.canMoveSeparator(sepnr)) {
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
                    this.setSubFramesPosition();
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
                    if (fnr > 0) this.sepPosits.push(pos);
                    var pos2 = pos + totsize * this.memberFrames[fnr].mySizeWeight;
                    var mar1 = Math.round(pos + ((fnr > 0) ? (this.sepSize / 2) : 0));
                    var mar2 = Math.round(pos2 - ((fnr < this.memberFrames.length - 1) ? (this.sepSize / 2) : 0));
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
                    this.memberFrames[i].mySizeWeight = (posits[i] - prevposit) / totsize;
                    prevposit = posits[i];
                }
                this._adjustFrameSizeFractions(totsize);
            }


            //adjusts the frame size fraction so that they obey the size limitations
            that._adjustFrameSizeFractions = function (totsize) {

                var widths = [];
                for (var i = 0; i < this.memberFrames.length; i++) {
                    widths.push(this.memberFrames[i].mySizeWeight * totsize);
                }

                var modif = true;
                for (var iter = 0; (iter < 5) && modif; iter++) {
                    modif = false;
                    for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                        var theminsize = this.memberFrames[fnr].getMinSize(this.splitterDim());
                        if (widths[fnr] < theminsize) {
                            var extra = theminsize - widths[fnr];
                            widths[fnr] += extra;
                            for (var i = 0; i < this.memberFrames.length; i++)
                                if (i != fnr)
                                    widths[i] -= extra / (this.memberFrames.length - 1);
                            modif = true;
                        }
                        if (widths[fnr] > this.memberFrames[fnr].getMaxSize(this.splitterDim())) {
                            var extra = this.memberFrames[fnr].getMaxSize(this.splitterDim()) - widths[fnr];
                            widths[fnr] += extra;
                            for (var i = 0; i < this.memberFrames.length; i++)
                                if (i != fnr)
                                    widths[i] -= extra / (this.memberFrames.length - 1);
                            modif = true;
                        }
                    }
                }

                for (var fnr = 0; fnr < this.memberFrames.length; fnr++)
                    this.memberFrames[fnr].mySizeWeight = widths[fnr] / totsize;

            }

            that.setSubFramesPosition = function () {
                var frameel = $('#' + this.myID);
                this.setPosition(frameel.position().left, frameel.position().top, frameel.width(), frameel.height(), true);
            }

            that.setPosition = function (x0, y0, sx, sy, subFramesOnly) {
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

                //normalise size weights
                var totsubsizeweight = 0.0;
                for (var fnr = 0; fnr < this.memberFrames.length; fnr++)
                    totsubsizeweight += this.memberFrames[fnr].mySizeWeight;
                for (var fnr = 0; fnr < this.memberFrames.length; fnr++)
                    this.memberFrames[fnr].mySizeWeight /= totsubsizeweight;

                if (this.isHorSplitter()) {
                    this._adjustFrameSizeFractions(sx);
                    this.sepPosits = [];
                    var framePosits = that._calculateFramePositions(clientWidth);
                    for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                        this.memberFrames[fnr].setPosition(framePosits[fnr].pos1, 0, framePosits[fnr].pos2 - framePosits[fnr].pos1 + 1, clientHeight);
                        if (fnr < this.memberFrames.length - 1) {
                            var splitterel = $('#' + this.getSeparatorDivID(fnr));
                            splitterel.css('position', 'absolute');
                            splitterel.css('left', (framePosits[fnr].pos2 + this.marginLeft) + 'px');
                            splitterel.css('top', this.getMarginTop() + 'px');
                            splitterel.css('width', this.sepSize + 'px');
                            splitterel.css('height', clientHeight + 'px');
                        }
                    }
                }

                if (this.isVertSplitter()) {
                    this._adjustFrameSizeFractions(sy);
                    this.sepPosits = [];
                    var framePosits = that._calculateFramePositions(clientHeight);
                    for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                        this.memberFrames[fnr].setPosition(0, framePosits[fnr].pos1, clientWidth, framePosits[fnr].pos2 - framePosits[fnr].pos1 + 1);
                        if (fnr < this.memberFrames.length - 1) {
                            var splitterel = $('#' + this.getSeparatorDivID(fnr));
                            splitterel.css('position', 'absolute');
                            splitterel.css('top', (framePosits[fnr].pos2 + this.getMarginTop()) + 'px');
                            splitterel.css('left', this.marginLeft + 'px');
                            splitterel.css('height', this.sepSize + 'px');
                            splitterel.css('width', clientWidth + 'px');
                        }
                    }
                }

                if (this.isTabber()) {
                    $('#' + this.getClientDivID() + '_tabbody').css('height', clientHeight - 47);
                    //tabbody.setCssClass("DQXTabBody");
                    for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                        this.memberFrames[fnr].setPosition(0, 30, clientWidth, clientHeight - 30);
                    }
                }

                if (!subFramesOnly)
                    if (this.isTabber()) this._createTabItems();


                if (this.isFinalPanel()) {
                    this._needUpdateSize = true;
                    //                    if (this.myClientObject != null) {
                    //                        this.myClientObject.handleResize();
                    //                    }
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

            that.switchTab = function (newtab) {
                if (!this.isTabber()) throw "Container is not a tab";
                if (this.getActiveTabFrameID() == newtab)
                    return false;
                for (var fnr = 0; fnr < this.memberFrames.length; fnr++) {
                    if (newtab == this.memberFrames[fnr].myFrameID) {
                        var tabid = this.getClientDivID() + '_tab_' + fnr;
                        $('#' + tabid).trigger('click');
                    }
                }
                return true;
            }

            that.getActiveTabFrameID = function () {
                if (!this.isTabber()) throw "Container is not a tab";
                return this.memberFrames[this.activeTabNr].myFrameID;
            }


            that.modifyDisplayTitle = function (newtitle) {
                $('#' + this.getVisibleTyleDivID()).text(newtitle);
            }

            //Determines if a frame is currently visible (e.g. not hidden behind a tab)
            that.isVisible = function () {
                var fr = this;
                while (fr.myParent != null) {
                    if (fr.myParent.isTabber())
                        if (fr.myParent.getActiveTabFrameID() != fr.myFrameID)
                            return false;
                    fr = fr.myParent;
                }
                return true;
            }

            that.makeVisible = function () {
                if (this.isVisible())
                    return;
                var fr = this;
                while (fr.myParent != null) {
                    if (fr.myParent.isTabber())
                        fr.myParent.switchTab(fr.myFrameID);
                    fr = fr.myParent;
                }
                if (this.myClientObject != null)
                    this.myClientObject.handleResize(); //this triggers immediate correct sizing of the panel;
                return true;
            }


            that.setStaticContent = function (divid) {
                var content = $('#' + divid).html();
                $('#' + this.getClientDivID()).html(content);
            }


            /////////////// NOTIFICATION FUNCTIONS

            that.onChangeTab = function (newtab) {
                Msg.send({ type: 'ChangeTab', id: this.myFrameID }, this.getActiveTabFrameID());
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
            Framework.frameRoot.setPosition(0, 0, sx, sy);
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
            var html = frameRoot.createElements(1).toString();
            $('#' + divid).html(html);
            frameRoot.postCreateHTML();

            $(window).resize(Framework._handleResize)

            Framework._handleResize();
        }










        ///////////////////////////////////////////////////////////////////////////////////////////////

        Framework.Form = function (iid, idivid) {
            var that = {};
            that.myID = iid;
            that.myDivID = idivid;
            that._content = Controls.CompoundHor([]);

            that.clear = function () {
                that._content.clear();
            }

            that.addControl = function (ctrl) {
                that._content.append(ctrl);
                return ctrl;
            }

            that.addHtml = function (content) {
                that._content.append(Controls.Label(content));
            }


            that.render = function () {
                var st = that._content.renderHtml();
                $('#' + this.myDivID).html(st);
                that._content.postCreateHtml();
            }


            that.handleResize = function () {
            }

            return that;
        }
        return Framework;
    });

