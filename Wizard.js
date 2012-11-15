define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/Utils", "DQX/Framework", "DQX/Controls"],
    function ($, DocEl, Msg, DQX, Framework, Controls) {
        var Wizard = {};

        Wizard.Create = function (iID) {
            var that = {};

            that.ID = iID;
            that._title = "Wizard";
            that._pages = [];
            that._pageIndex = {};

            that.addPage = function (page) {//each page should be a Control.XXX instance
                page.form.setContextID(this.ID);
                this._pageIndex[page.id] = this._pages.length;
                this._pages.push(page);
            }


            that.setTitle = function (title) {
                that._title = title;
            }

            that.getCurrentPage = function () {
                var pg = this._pages[this.pageNr];
                if (!pg) throw "Invalid wizard page";
                return pg;
            }
            that.getPageNr = function (pageID) {
                if (!(pageID in this._pageIndex))
                    throw "Invalid wizard page " + pageID;
                return this._pageIndex[pageID];
            }

            that.getPage = function (pageID) {
                return this._pages[this.getPageNr(pageID)];
            }

            that.run = function (onFinishFunction) {
                this._onFinishFunction = onFinishFunction;
                var background = DocEl.Div({ id: 'WizBackGround' });
                background.addStyle("position", "absolute");
                background.addStyle("left", '0px');
                background.addStyle("top", '0px');
                background.addStyle('width', '100%');
                background.addStyle('height', '100%');
                //                background.addStyle('background-color', 'rgba(0,0,0,0.25)');
                background.addStyle('background-color', 'rgba(100,100,100,0.4)');
                background.addStyle('z-index', '2000');
                $('#DQXUtilContainer').append(background.toString());

                var pageSizeX = $(window).width();
                var pageSizeY = $(window).height();

                var boxSizeX = 600;
                var boxSizeY = 500;

                this._pageTrace = [];

                var box = DocEl.Div({ id: 'WizBox' });
                box.addStyle("position", "absolute");
                box.addStyle("left", (pageSizeX - boxSizeX) / 2 + 'px');
                box.addStyle("top", (pageSizeY - boxSizeY) / 2 + 'px');
                box.addStyle('width', boxSizeX + 'px');
                box.addStyle('height', boxSizeY + 'px');
                box.setCssClass("DQXWizardBox");
                var boxHeader = DocEl.Div({ id: 'WizBoxHeader', parent: box });
                boxHeader.setCssClass("DQXWizardBoxHeader");
                boxHeader.addElem(this._title);
                var boxContent = DocEl.Div({ id: 'WizBoxContent', parent: box });
                boxContent.setCssClass("DQXWizardBoxBody");
                boxContent.setHeightPx(boxSizeY - 4 - 105);

                var boxFooter = DocEl.Div({ id: 'WizBoxFooter', parent: box });
                boxFooter.setCssClass("DQXWizardBoxFooter");
                var boxButtons = DocEl.Div({ id: 'WizBoxButtons', parent: boxFooter });
                boxButtons.addStyle("position", "absolute");
                boxButtons.addStyle("top", "0px");
                boxButtons.addStyle("right", "0px");
                //boxButtons.addElem("jdffkjfkj");

                var buttons = [
                    { id: 'WizBoxButtonCancel', name: 'Cancel', bitmap: 'cancel.png', floatPos: 'left', handler: that._onCancel },
                    { id: 'WizBoxButtonPrevious', name: 'Previous', bitmap: 'arrow5left.png', floatPos: 'left', handler: that._onPrevious },
                    { id: 'WizBoxButtonNext', name: 'Next', bitmap: 'arrow5right.png', floatPos: 'right', handler: that._onNext },
                    { id: 'WizBoxButtonFinish', name: 'Finish', bitmap: 'ok.png', floatPos: 'left', handler: that._onFinish }
                ];

                for (var buttonNr = 0; buttonNr < buttons.length; buttonNr++) {
                    var button = buttons[buttonNr];
                    var boxButtonCancel = DocEl.Div({ id: button.id, parent: boxButtons });
                    boxButtonCancel.setCssClass("DQXWizardButton");
                    boxButtonCancel.addElem('<IMG SRC="Bitmaps/' + button.bitmap + '" border=0 ALT="" style="float:' + button.floatPos + ';margin-right:3px;margin-left:3px"></IMG>');
                    boxButtonCancel.addElem(button.name);
                }

                $('#WizBackGround').append(box.toString());

                $('#WizBoxButtonPrevious').hide();
                $('#WizBoxButtonFinish').hide();

                for (var buttonNr = 0; buttonNr < buttons.length; buttonNr++) {
                    var button = buttons[buttonNr];
                    $('#' + button.id).mousedown($.proxy(button.handler, this));
                }

                this._setPage(0);
            }

            that._setPage = function (ipageNr) {
                this.pageNr = ipageNr;
                $('#WizBoxContent').html(this._pages[this.pageNr].form.renderHtml());
                this._pages[this.pageNr].form.postCreateHtml();
                if (this._isFinalPage()) {
                    $('#WizBoxButtonFinish').show();
                    $('#WizBoxButtonNext').hide();
                }
                else {
                    $('#WizBoxButtonFinish').hide();
                    $('#WizBoxButtonNext').show();
                }
                if (this.pageNr == 0) {
                    $('#WizBoxButtonPrevious').hide();
                }
                else {
                    $('#WizBoxButtonPrevious').show();
                }
            }

            that._isFinalPage = function () {
                if (this.pageNr == this._pages.length - 1) return true;
                return (this.getCurrentPage().onFinish);
            }

            that._onCancel = function () {
                $('#WizBackGround').remove();
            }

            that._onFinish = function () {
                if (this.getCurrentPage().reportValidationError) {
                    var error = this.getCurrentPage().reportValidationError();
                    if (error) {
                        alert(error)
                        return;
                    }
                }
                if (this.getCurrentPage().onFinish)
                    this.getCurrentPage().onFinish();
                this.performFinish();
                return false;
            }

            that.performFinish = function () {
                $('#WizBackGround').remove();
                this._onFinishFunction();
            }

            that._onNext = function () {
                if (this.getCurrentPage().reportValidationError) {
                    var error = this.getCurrentPage().reportValidationError();
                    if (error) {
                        alert(error)
                        return;
                    }
                }
                if (this._isFinalPage()) {
                    this._onFinish();
                    return;
                }
                this._pageTrace.push(this.pageNr);
                var newPageNr = this.pageNr + 1;
                if (this.getCurrentPage().getNextPage) {
                    newPageNr = this.getPageNr(this.getCurrentPage().getNextPage());
                }

                this._setPage(newPageNr);
                return false;
            }

            that._onPrevious = function () {
                if (this._pageTrace.length > 0) {
                    var prevpagenr = this._pageTrace[this._pageTrace.length - 1];
                    this._pageTrace.pop();
                    this._setPage(prevpagenr);
                }
                return false;
            }


            return that;
        }



        return Wizard
    });
