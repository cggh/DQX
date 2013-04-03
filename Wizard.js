﻿define([DQXSCJQ(), DQXSC("DocEl"), DQXSC("Msg"), DQXSC("Utils"), DQXSC("Framework"), DQXSC("Controls"), DQXSC("Popup")],
    function ($, DocEl, Msg, DQX, Framework, Controls, Popup) {
        var Wizard = {};

        /////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Wizard class
        // This implements a transient popup window, showing a sequence of page with back/forward/ok/cancel buttons
        // Each wizard page contains a form with a set controls
        //  -> use 'addPage' to design the wizard by adding pages
        //  -> use 'run' to execute the wizard
        /////////////////////////////////////////////////////////////////////////////////////////////////////////

        closeWizard = function () {
            if (dqxCurrentWizard)
                dqxCurrentWizard._onCancel();
        }

        //Creates a wizard, providing a unique identifier
        Wizard.Create = function (iID) {
            var that = {};

            that.ID = iID;
            that._title = "Wizard";
            that._pages = [];
            that._pageIndex = {};

            //Sets the title of the wizard
            that.setTitle = function (title) {
                that._title = DQX.interpolate(title);
            }

            //Adds a page to the wizard. 'page' should be an object containing:
            //   id : identifier of the page (unique inside the wizard)
            //   form : of the type Controls.Control, usually this will be a compound control (e.g. Controls.CompoundVert)
            //   helpUrl (optional) : the document url with help content (introduces a help button on the page)
            //   hideNext (optional) : if true, the "Next" button will be hidden on this page
            //   reportValidationError (optional) : A function that will be called when the page is about to be completed, and that validates the content of the page.
            //        Errors can be reported by returning a string from this function. This will block the progress, and display the error
            //  onFinish (optional) : a function indicating that this is the final page of the wizard session. If this function is present, the page will have a 'finish' button,
            //        the wizard will complete after the page was completed, and this onFinish function will be called
            that.addPage = function (page) {
                this._checkNotRunning();
                DQX.requireMember(page, 'id');
                DQX.requireMember(page, 'form');
                DQX.requireMemberFunction(page.form, 'getID');
                page.form.setContextID(this.ID);
                if (page.id in this._pageIndex)
                    DQX.reportError('Page already present in wizard ' + page.id);
                this._pageIndex[page.id] = this._pages.length;
                this._pages.push(page);
            }

            //returns the currently active page
            that.getCurrentPage = function () {
                var pg = this._pages[this.pageNr];
                if (!pg) DQX.reportError("Invalid wizard page");
                return pg;
            }

            //returns the index of a page, providing the page ID
            that.getPageNr = function (pageID) {
                if (!(pageID in this._pageIndex))
                    DQX.reportError("Invalid wizard page " + pageID);
                return this._pageIndex[pageID];
            }

            //returns a page by page ID
            that.getPage = function (pageID) {
                return this._pages[this.getPageNr(pageID)];
            }

            //For internal checks: throws an error if the wizard is running
            that._checkNotRunning = function () {
                if (this._isRunning)
                    DQX.reportError('Wizard is running');
            }

            //For internal checks: throws an error if the wizard is not running
            that._checkRunning = function () {
                if (!this._isRunning)
                    DQX.reportError('Wizard is not running');
            }

            //Internal
            that._onKeyDown = function (ev) {
                if (ev.isEscape)
                    this._onCancel();
            }


            //Executes the wizard
            //onFinishFunction will be called when the wizard is completed
            that.run = function (onFinishFunction) {
                dqxCurrentWizard = that;
                DQX.checkIsFunction(onFinishFunction);
                this._checkNotRunning();
                this._onFinishFunction = onFinishFunction;
                this._isRunning = true;
                var background = DocEl.Div({ id: 'WizBackGround' });
                background.addStyle("position", "absolute");
                background.addStyle("left", '0px');
                background.addStyle("top", '0px');
                background.addStyle('width', '100%');
                background.addStyle('height', '100%');
                var wizbackcol = 'rgba(100,100,100,0.4)';
                background.addStyle('background-color', wizbackcol);
                background.addStyle('z-index', '2000');
                $('#DQXUtilContainer').append(background.toString());

                $('#WizBackGround').mousedown(function (ev) {
                    if (ev.target.id == 'WizBackGround') {
                        $('#WizBackGround').css('background-color', 'rgba(50,50,50,0.6)');
                        setTimeout(function () {
                            $('#WizBackGround').css('background-color', wizbackcol);
                            setTimeout(function () {
                                $('#WizBackGround').css('background-color', 'rgba(50,50,50,0.6)');
                                setTimeout(function () {
                                    $('#WizBackGround').css('background-color', wizbackcol);
                                }, 150);
                            }, 150);
                        }, 150);
                    }
                });

                var pageSizeX = DQX.getWindowClientW();
                var pageSizeY = DQX.getWindowClientH();

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
                boxHeader.setCssClass("DQXWizardBoxHeader DQXDragHeader");
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

                var thecloser = DocEl.JavaScriptBitmaplink(DQXBMP("close2.png"), "Close", "closeWizard();");
                box.addElem(thecloser);
                thecloser.addStyle('position', 'absolute');
                thecloser.addStyle('right', '-16px');
                thecloser.addStyle('top', '-16px');


                var buttons = [
                    { id: 'WizBoxButtonCancel', name: 'Cancel', bitmap: DQXBMP('cancel.png'), floatPos: 'left', handler: that._onCancel },
                    { id: 'WizBoxButtonPrevious', name: 'Previous', bitmap: DQXBMP('arrow5left.png'), floatPos: 'left', handler: that._onPrevious },
                    { id: 'WizBoxButtonNext', name: 'Next', bitmap: DQXBMP('arrow5right.png'), floatPos: 'right', handler: that._onNext },
                    { id: 'WizBoxButtonFinish', name: 'Finish', bitmap: DQXBMP('ok.png'), floatPos: 'left', handler: that._onFinish }
                ];

                for (var buttonNr = 0; buttonNr < buttons.length; buttonNr++) {
                    var buttonInfo = buttons[buttonNr];
                    var buttonContent = '<IMG SRC="' + buttonInfo.bitmap + '" border=0 ALT="" style="float:' + buttonInfo.floatPos + ';margin-right:3px;margin-left:3px"></IMG>' + buttonInfo.name;
                    buttonInfo.control = Controls.Button(buttonInfo.id, { content: buttonContent, buttonClass: 'DQXWizardButton', fastTouch: true });
                    boxButtons.addElem(buttonInfo.control.renderHtml());
                    buttonInfo.control.setOnChanged($.proxy(buttonInfo.handler, that));
                }

                //Help button
                var boxButtonHelp = DocEl.Div({ id: 'WizBoxButtonHelp', parent: boxFooter });
                boxButtonHelp.addStyle('padding-left', '8px');
                var helpButtonContent = '<IMG SRC="' + DQXBMP('info4.png') + '" border=0 ALT=""style="float:left;margin-right:5px;margin-left:3px;"></IMG>Help';
                helpButtonControl = Controls.Button('WizBoxButtonHelp', { content: helpButtonContent, buttonClass: 'DQXWizardButton', fastTouch: true });
                helpButtonControl.setOnChanged($.proxy(that._onHelp, that));
                boxButtonHelp.addElem(helpButtonControl.renderHtml());


                $('#WizBackGround').append(box.toString());

                Popup.makeDraggable(box.myID);

                $('#WizBoxButtonPrevious').hide();
                $('#WizBoxButtonFinish').hide();

                Controls.ExecPostCreateHtml();


                this._keyDownReceiverID = DQX.registerGlobalKeyDownReceiver($.proxy(that._onKeyDown, that));

                this._setPage(0);
            }

            //Internal: sets the active page while running the wizard
            that._setPage = function (ipageNr) {
                this._checkRunning();
                this.pageNr = ipageNr;
                $('#WizBoxContent').html(this._pages[this.pageNr].form.renderHtml());
                this._pages[this.pageNr].form.postCreateHtml();
                if (this._pages[this.pageNr].helpUrl)
                    $('#WizBoxButtonHelp').show();
                else
                    $('#WizBoxButtonHelp').hide();
                if (this._isFinalPage()) {
                    $('#WizBoxButtonFinish').show();
                    $('#WizBoxButtonNext').hide();
                }
                else {
                    $('#WizBoxButtonFinish').hide();
                    if (this._pages[this.pageNr].hideNext)
                        $('#WizBoxButtonNext').hide();
                    else
                        $('#WizBoxButtonNext').show();
                }
                if (this.pageNr == 0) {
                    $('#WizBoxButtonPrevious').hide();
                }
                else {
                    $('#WizBoxButtonPrevious').show();
                }
                if (this.getCurrentPage().onStart)
                    this.getCurrentPage().onStart();
            }

            //Internal: determines if the currently active page is the final one in the sequence
            that._isFinalPage = function () {
                if (this.pageNr == this._pages.length - 1) return true;
                return (this.getCurrentPage().onFinish);
            }

            //Internal: stops the execution of the wizard
            that._stopRunning = function () {
                dqxCurrentWizard = null;
                DQX.unRegisterGlobalKeyDownReceiver(this._keyDownReceiverID);
                $('#WizBackGround').remove();
                this._isRunning = false;
            }


            that._onCancel = function () {
                this._stopRunning();
            }

            that._onHelp = function () {
                Msg.send({ type: 'ShowHelp' }, this.getCurrentPage().helpUrl);
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

            //Performs the 'Finish' action
            that.performFinish = function () {
                this._checkRunning();
                this._stopRunning();
                this._onFinishFunction();
            }

            //jumps the wizard to a page, providing the page id
            that.jumpToPage = function (id) {
                this._checkRunning();
                this._pageTrace.push(this.pageNr);
                this._setPage(this.getPageNr(id));
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
