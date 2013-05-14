/************************************************************************************************************************************
*************************************************************************************************************************************

Controls are a set of UI widgets (edit boxes, checkboxes, ...) that can be
* put on a Framework.Form FramePanel
* put on a Wizard page
* used as a branch in a Tree (see TreeCtrl.Control)
* used independently

Each control implements at least the following member functions:
- getID : returns the identifier of the control
- modifyEnabled(bool) : modifies the enabled/disabled state of the control
- renderHtml : returns the html string that defines the control
- postCreateHtml : executes necessary code after the control's html was inserted into the DOM (e.g. register event handlers)

NOTE: The 'real' UI widgets are derived from the base class Controls.Control

NOTE: when controls are part of a Form or a Wizard, most actions such as renderHtml and postCreateHtml are called automatically
When used independently, you can call renderHtml explicitely to obtain the markup for the control
In this case, Controls.ExecPostCreateHtml must be called explicitely after the html was added to the DOM


*************************************************************************************************************************************
*************************************************************************************************************************************/

define([DQXSC("Msg"), DQXSC("DocEl"), DQXSC("Scroller"), DQXSC("Documentation")],
    function (Msg, DocEl, Scroller, Documentation) {
        var Controls = {};


        Controls._currentControlNr = 0;

        Controls._getNextControlID = function () {
            Controls._currentControlNr++;
            return "AutoControlID_" + Controls._currentControlNr;
        }

        Controls._postCreateWaitList = {}

        Controls._addToControlPostCreateWaitList = function (ctrl) {
            Controls._postCreateWaitList[ctrl.getID()] = ctrl;
        }

        Controls._removeFromControlPostCreateWaitList = function (ctrl) {
            delete Controls._postCreateWaitList[ctrl.getID()];
        }

        //Call this function to automatically execute any necessary code for controls after the rendering of the control html to the DOM (e.g. registering event handlers).
        //In most cases, this function is called automatically by the framework
        Controls.ExecPostCreateHtml = function () {
            $.each(Controls._postCreateWaitList, function (key, ctrl) {
                if (ctrl.isRendered()) {
                    ctrl.postCreateHtml();
                    delete Controls._postCreateWaitList[key];
                }
            });
            DQX._registerStaticLinkHandlers();
            DQX._registerActionLinkHandlers();
        }

        DQX.ExecPostCreateHtml = function () { Controls.ExecPostCreateHtml(); }

        //Initiate some surveillance code that performs some sanity checks
        Controls._surveillance = function () {
            $.each(Controls._postCreateWaitList, function (key, ctrl) {
                DQX.reportError('Post Html creation not executed for control ' + key);
            });
            setTimeout(Controls._surveillance, 6000);
        }
        if (_debug_) Controls._surveillance();

        ////////////////////////////////////////////////////////////////////////////////////////////
        // This control can be used to show or hide another control
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.ShowHide = function (icontrol) {
            var that = {};
            that._control = icontrol;
            that.myID = Controls._getNextControlID();
            that._visible = true;


            that.getID = function () {
                return myID;
            }

            that.setVisible = function (newStatus) {
                if (newStatus != that._visible) {
                    that._visible = newStatus;
                    if (newStatus)
                        $('#' + that.myID).show();
                    else
                        $('#' + that.myID).hide();
                }
                return this;
            }


            that.renderHtml = function () {
                var el = DocEl.Div({ id: this.myID });
                el.addElem(this._control.renderHtml());
                return el.toString();
            }

            that.postCreateHtml = function () {
                if (!that._visible)
                    $('#' + that.myID).hide();
            }

            return that;
        }



        ////////////////////////////////////////////////////////////////////////////////////////////
        //Base class for a compound control grouping a list of controls
        // A compound control is not a control by itself in a strict sense,
        // but acts as a container to layout a set of controls
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.CompoundGenericList = function (icontrols) {
            var that = {};
            that._legend = '';
            that._controls = [];
            that._margin = 3;
            that.myID = Controls._getNextControlID();
            that._visible = true;

            //Clears the list of member controls
            that.clear = function () { that._controls = []; }

            //add a new control to the list
            that.addControl = function (item) {
                DQX.requireMemberFunction(item, 'getID');
                that._controls.push(item);
                return item;
            }

            if (icontrols)
                $.each(icontrols, function (idx, ctrl) { that.addControl(ctrl); });

            //Sets a header legend for the group
            that.setLegend = function (txt) { this._legend = txt; return this; }

            that.getID = function () {
                if (this._controls.length == 0) DQX.reportError('Compound control has no components');
                return this._controls[0].getID(id);
            }

            that.setContextID = function (id) {
                for (var i = 0; i < this._controls.length; i++)
                    this._controls[i].setContextID(id);
            }

            //Modify the enabled status of all member controls
            that.modifyEnabled = function (newstate) {
                for (var i = 0; i < this._controls.length; i++)
                    this._controls[i].modifyEnabled(id);
            }

            that.postCreateHtml = function () {
                for (var i = 0; i < this._controls.length; i++)
                    this._controls[i].postCreateHtml(id);
                setTimeout(function () {
                    for (var i = 0; i < that._controls.length; i++)
                        if (that._controls[i]._hasDefaultFocus)
                            that._controls[i].setFocus();
                }, 200);
            }

            //Finds & returns a member control by id
            that.findControl = function (id) {
                for (var i = 0; i < this._controls.length; i++) {
                    var rs = this._controls[i].findControl(id);
                    if (rs != null) return rs;
                }
                return null;
            }

            return that;
        }

        ////////////////////////////////////////////////////////////////////////////////////////////
        //A compound control grouping a list of controls in a horizontal way
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.CompoundHor = function (icontrols) {
            var that = Controls.CompoundGenericList(icontrols);

            that.renderHtml = function () {
                var st = '';
                if (this._legend.length > 0) {
                    st += '<fieldset class="DQXFormFieldSet">';
                    st += '<legend>' + this._legend + '</legend>';
                }
                for (var i = 0; i < this._controls.length; i++)
                    st += this._controls[i].renderHtml();
                if (this._legend.length > 0) {
                    st += '</fieldset>';
                }
                return st;
            }

            return that;
        }


        ////////////////////////////////////////////////////////////////////////////////////////////
        //A compound control grouping a list of controls in a horizontal way
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.CompoundVert = function (icontrols) {
            var that = Controls.CompoundGenericList(icontrols);

            that.renderHtml = function () {
                var st = '';
                if (this._legend.length > 0) {
                    st += '<fieldset class="DQXFormFieldSet">';
                    st += '<legend>' + this._legend + '</legend>';
                }
                for (var i = 0; i < this._controls.length; i++) {
                    var el = DocEl.Div({});
                    el.addStyle('margin-top', this._margin + 'px');
                    el.addStyle('margin-bottom', this._margin + 'px');
                    el.addElem(this._controls[i].renderHtml());
                    st += el.toString();
                }
                if (this._legend.length > 0) {
                    st += '</fieldset>';
                }
                return st;
            }

            return that;
        }


        ////////////////////////////////////////////////////////////////////////////////////////////
        //A compound control grouping a list of controls on a grid
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.CompoundGrid = function () {
            var that = {};
            that._controlRows = [];
            that.sepH = 12;
            that.sepV = 5;

            //Clears the member controls
            that.clear = function () {
                that._controlRows = [];
            }

            //Adds a member control
            that.setItem = function (rowNr, colNr, item) {
                DQX.requireMemberFunction(item, 'getID');
                while (this._controlRows.length <= rowNr)
                    this._controlRows.push([]);
                while (this._controlRows[rowNr].length <= colNr)
                    this._controlRows[rowNr].push(null);
                this._controlRows[rowNr][colNr] = item;
                return item;
            }

            //Gets a member control by position in the grid
            that.getItem = function (rowNr, colNr) {
                if ((rowNr < 0) || (rowNr >= this._controlRows.length))
                    return null;
                if ((colNr < 0) || (colNr >= this._controlRows[rowNr].length))
                    return null;
                return this._controlRows[rowNr][colNr];
            }

            //Internal helper function that applies an action on all member items
            that._loopItems = function (fnc) {
                for (var rowNr = 0; rowNr < this._controlRows.length; rowNr++)
                    for (var colNr = 0; colNr < this._controlRows[rowNr].length; colNr++)
                        if (this._controlRows[rowNr][colNr] != null)
                            fnc(this._controlRows[rowNr][colNr]);
            }

            that.getID = function () {
                if (!this.getItem(0, 0)) DQX.reportError('Compound control has no components');
                return this.getItem(0, 0).getID(id);
            }

            that.setContextID = function (id) {
                this._loopItems(function (it) { it.setContextID(id); });
            }

            that.modifyEnabled = function (newstate) {
                this._loopItems(function (it) { it.modifyEnabled(id); });
            }

            that.renderHtml = function () {
                var st = '<table style="padding-top:{pt}px;">'.DQXformat({ pt: this.sepV });
                for (var rowNr = 0; rowNr < this._controlRows.length; rowNr++) {
                    st += '<tr>';
                    for (var colNr = 0; colNr < this._controlRows[rowNr].length; colNr++) {
                        st += '<td style="padding-right:{sepH}px;padding-bottom:{sepV}px;">'.DQXformat({ sepH: this.sepH, sepV: this.sepV });
                        var item = this.getItem(rowNr, colNr);
                        if (item != null)
                            st += item.renderHtml();
                        st += '</td>';
                    }
                    st += '</tr>';
                }
                st += '</table>';
                return st;
            }

            that.postCreateHtml = function () {
                this._loopItems(function (it) { it.postCreateHtml(); });
            }

            //Finds & returns a member control by id
            that.findControl = function (id) {
                this._loopItems(function (it) {
                    var rs = it.findControl(id);
                    if (rs != null) return rs;
                });
                return null;
            }

            return that;
        }




        //////////////////////////////////////////////////////////////////////////////////////////////
        //A static label control
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Label = function (icontent) {
            var that = {};
            that._content = DQX.interpolate(icontent);

            that.getID = function () { return ''; }

            that.setContextID = function (id) { }

            that.modifyEnabled = function (newstate) { }

            that.renderHtml = function () { return this._content; }

            that.postCreateHtml = function () { }

            return that;
        }



        ////////////////////////////////////////////////////////////////////////////////////////////
        // Base class for all controls that implement an UI element (which are the 'real' widgets)
        // Each leaf class derived from this should implement at least:
        //    _execRenderHtml : returns the html markup string
        //    _execPostCreateHtml : executes actions after the html was added to the DOM (e.g. add event handlers)
        //    getValue : returns the current value of the control
        //    modifyValue : changes the current value of the control
        // The following messages are sent:
        //    CtrlValueChanged : when the content of the control was changed
        // The control listens to the following messages:
        //    ModifyValue : to modify the value of the control
        //    ModifyEnabled : to change the enabled/disabled status of the control
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Control = function (iid) {
            var that = {};
            that.myID = iid;
            if (!iid)
                that.myID = Controls._getNextControlID();
            that.myContextID = '';
            that._enabled = true;
            that._controlExtensionList = ['']; //A list of all the ID's of member DOM elements of the control, registered as extensions to the base ID of the control
            that._hasDefaultFocus = false;

            if (_debug_) {
                if ($('#' + iid).length > 0)
                    DQX.reportError('Control creation error: element with ID ' + iid + ' is already present in the DOM tree');
            }

            //Defines this control to have the focus
            that.setHasDefaultFocus = function () {
                this._hasDefaultFocus = true;
                return this;
            }

            that.getID = function () { return this.myID; }

            //Internal
            that.getFullID = function (extension) { return this.myContextID + this.myID + extension; }

            that._reactModifyValue = function (scope, value) {
                if (scope.contextid == this.myContextID) {
                    this.modifyValue(value);
                }
            }
            //We install a listener so that we can send an event to modify the value of the control
            Msg.listen('ModifyValue' + that.getFullID(''), { type: 'CtrlModifyValue', id: that.myID }, $.proxy(that._reactModifyValue, that));


            that._reactModifyEnabled = function (scope, value) {
                if (scope.contextid == this.myContextID) {
                    this.modifyEnabled(value);
                }
            }
            //We install a listener so that we can send an event to modify the enabled state of the control
            Msg.listen('ModifyEnabled' + that.getFullID(), { type: 'CtrlModifyEnabled', id: that.myID }, $.proxy(that._reactModifyEnabled, that));


            that.setContextID = function (id) {
                if ((this.myContextID != '') && (this.myContextID !== id))
                    DQX.reportError('Control context id is already set');
                this.myContextID = id;
            }

            //Base implementation of renderHtml, calling _execRenderHtml in the leaf classes
            that.renderHtml = function () {
                Controls._addToControlPostCreateWaitList(this);
                this._postCreateHtmlExecuted = false;
                return this._execRenderHtml();
            }

            //Internal
            that.getJQElement = function (extension) {
                return $('#' + this.getFullID(extension));
            }

            //Modifies the enabled/disabled state of a control
            that.modifyEnabled = function (newstate) {
                this._enabled = newstate;
                for (var i = 0; i < this._controlExtensionList.length; i++) {
                    if (this._enabled)
                        this.getJQElement(this._controlExtensionList[i]).removeAttr('disabled');
                    else
                        this.getJQElement(this._controlExtensionList[i]).attr("disabled", "disabled");
                }
            }

            //Use this function to add a callback function that will be called when the value of the control was changed
            //note: more than one handler can be added
            that.addValueChangedListener = function (handler) {
                Msg.listen('', { type: 'CtrlValueChanged', id: this.getID() }, handler);
            }

            //Use this function to provide a single handler function that will be called when the control changes
            //note: only a single handler can be set in this way
            that.setOnChanged = function (handler) {
                this.onChanged = handler;
                return this;
            }

            //Internal
            that._notifyChanged = function () {
                if (this.onChanged)
                    this.onChanged(this.myID, this);
                Msg.broadcast({ type: 'CtrlValueChanged', id: this.myID, contextid: this.myContextID }, this);
            }

            //Trivial implementation of finding a control
            that.findControl = function (id) {
                if (id == this.myID) return this;
                else return null;
            }

            //Determines if the control is currently rendered in the DOM tree
            that.isRendered = function () {
                return this.getJQElement('').length > 0;
            }

            //Sets the focus to this control
            that.setFocus = function () {
                if (!this.isRendered) DQX.reportError('Control is not rendered');
                document.getElementById(this.getFullID('')).focus();
            }

            //Internal: called after the html was rendered
            that.postCreateHtml = function () {
                if (!this._postCreateHtmlExecuted) {
                    if (_debug_)
                        if (!this.isRendered())
                            DQX.reportError('PostCreate called on unrendered control: ' + this.myID);
                    var ln0 = this.getJQElement().length;
                    Controls._removeFromControlPostCreateWaitList(this);
                    this._execPostCreateHtml();
                    this._postCreateHtmlExecuted = true;
                    this.modifyEnabled(this._enabled); //make sure the enabled state that was set before rendering is applied
                    if (this._backgroundColorString)
                        this.getJQElement('').css('background-color', this._backgroundColorString);
                }
            }

            that.setBackgroundColor = function (color) {
                this._backgroundColorString = color.toString();
                this.getJQElement('').css('background-color', this._backgroundColorString);
            }

            return that;
        }


        ////////////////////////////////////////////////////////////////////////////////////////////
        // A static piece of text
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Static = function (content) {
            var that = Controls.Control(null);
            that.myContent = DQX.interpolate(content);
            that._isComment = false;

            that.makeComment = function () { this._isComment = true; return this; }

            that._execRenderHtml = function () {
                var lb = DocEl.Div({ id: this.getFullID('') });
                lb.addStyle("padding-top", "2px");
                lb.addStyle("padding-bottom", "2px");
                lb.addStyle('display', 'inline-block');
                if (this._isComment)
                    lb.setCssClass("DQXFormComment");
                lb.addElem(this.myContent);
                return lb.toString();
            }

            that._execPostCreateHtml = function () { }

            that._onChange = function () { }

            that.getValue = function () { return null; }

            return that;
        }



        ////////////////////////////////////////////////////////////////////////////////////////////
        // A piece of html that can be modified
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Html = function (iid, content, css_class) {
            DQX.checkIsString(content);
            var that = Controls.Control(iid);
            that.myContent = DQX.interpolate(content);

            that._execRenderHtml = function () {
                var lb = DocEl.Div({ id: this.getFullID('') });
                if (css_class) {
                    lb.setCssClass(css_class);
                } else {
                    lb.addStyle("padding-top", "2px");
                    lb.addStyle("padding-bottom", "2px");
                    lb.addStyle('display', 'inline-block');
                }
                lb.addElem(this.myContent);
                return lb.toString();
            }

            that._execPostCreateHtml = function () { }

            that._onChange = function () { }

            that.getValue = function () { return null; }

            //modify the content of the control
            that.modifyValue = function (newContent) {
                that.myContent = DQX.interpolate(newContent);
                this.getJQElement('').html(that.myContent);
                Controls.ExecPostCreateHtml();
            }

            return that;
        }


        ////////////////////////////////////////////////////////////////////////////////////////////
        // A check box
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Check = function (iid, args) {
            var that = Controls.Control(iid);
            DQX.requireMember(args, 'label');
            that.myLabel = DQX.interpolate(args.label);
            that.isChecked = false;
            if (args.value)
                that.isChecked = args.value;
            that._hint = false;
            if (args.hint)
                that._hint = DQX.interpolate(args.hint);


            that._execRenderHtml = function () {
                var chk = DocEl.Check({ id: this.getFullID('') });
                if (this.hint)
                    chk.addHint(this.hint);
                if (that.isChecked)
                    chk.addAttribute('checked', "checked");
                var label = DocEl.Label({ target: this.getFullID('') });
                if (this._hint)
                    label.addHint(this._hint);
                label.addElem(this.myLabel);
                return chk.toString() + label.toString();
            }

            that._execPostCreateHtml = function () {
                var target = 'change.controlevent';
                this.getJQElement('').unbind(target).bind(target, $.proxy(that._onChange, that));
            }

            that._onChange = function () {
                var lastval = this.isChecked;
                var newval = this.getValue();
                if (newval != lastval) {
                    this.isChecked = newval;
                    this._notifyChanged();
                }
            }

            //Returns the status of the check box
            that.getValue = function () {
                this.isChecked = this.getJQElement('').is(':checked');
                return this.isChecked;
            }

            //Modify the status of the check box
            that.modifyValue = function (newstate, preventNotify) {
                if (newstate == this.getValue()) return;
                this.isChecked = newstate;
                if (this.isChecked)
                    this.getJQElement('').attr('checked', 'checked');
                else
                    this.getJQElement('').removeAttr('checked');
                if (!preventNotify)
                    this._notifyChanged();
            }

            return that;
        }



        ////////////////////////////////////////////////////////////////////////////////////////////
        // A button
        // NOTE: CtrlValueChanged message is sent when the button was pressed
        //    args.content (optional) : text content of the button
        //    args.bitmap (optional) : bitmap image for the button (can be combined with content)
        //    args.hint (optional) : tooltip hint
        //    args.buttonClass (optional) : css class of the button element
        //    args.width (optional) : width of the button 
        //    args.height (optional) : height of the button 
        //    args.fastTouch (optional): immediate button responce on touch devices
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Button = function (iid, args) {
            var that = Controls.Control(iid);
            that.content = '<No content>';
            var description = '';
            if (args.description)
                description = DQX.interpolate(args.description);
            if (args.content && (!args.bitmap)) {
                that.content = '<span class="_DQXButtonText">' + DQX.interpolate(args.content) + '</span>';
            }
            if (args.bitmap && (!args.content)) {
                that.content = '<IMG SRC="' + args.bitmap + '" border=0 ALT="' + description + '" TITLE="' + description + '" style="padding-right:5px;float:left">';
            }
            if (args.bitmap && args.content) {
                var textWidth = '100%';
                if (args.width && args.height)
                    textWidth = (args.width - args.height - 12) + 'px';
                that.content = '';
                that.content += '<div style="display:inline-block;vertical-align:middle;width:1px;height:100%"></div>';
                that.content += '<div class="_DQXButtonImage" style="display:inline-block;vertical-align:middle;"><IMG SRC="' + args.bitmap + '" border=0 ALT="' + description + '" TITLE="' + description + '" style="padding-right:7px;"></div>';
                that.content += '<div class="_DQXButtonText" style="display:inline-block;width:{textw};vertical-align:middle">'.DQXformat({ textw: textWidth }) + DQX.interpolate(args.content) + '</div>';
            }
            if (args.hint)
                that._hint = args.hint;
            that._buttonClass = 'DQXWizardButton';
            if (args.buttonClass)
                that._buttonClass = args.buttonClass;
            if (args.width)
                that._width = args.width;
            if (args.height)
                that._height = args.height;
            if (args.fastTouch)
                that._fastTouch = args.fastTouch;
            that._enabled = true;

            that._execRenderHtml = function () {
                var bt = DocEl.Div({ id: this.getFullID('') });
                if (this._hint)
                    bt.addHint(this._hint);
                bt.addStyle('display', 'inline-block');
                bt.addStyle('vertical-align', 'top');
                bt.setCssClass(this._buttonClass);
                bt.addElem(that.content);
                if (this._width)
                    bt.setWidthPx(this._width);
                if (this._height)
                    bt.setHeightPx(this._height);
                return bt.toString();
            }

            that._execPostCreateHtml = function () {
                this.getJQElement('').click($.proxy(that._onChange, that));
                if (that._fastTouch) {
                    var element = document.getElementById(this.getFullID(''));
                    element.addEventListener("touchstart", that._onTouchStart, false);
                }
            }

            that._onTouchStart = function (ev) {
                if (ev.stopPropagation)
                    ev.stopPropagation();
                if (ev.preventDefault)
                    ev.preventDefault();
                setTimeout(function () {
                    that.getJQElement('').addClass('DQXBitmapButtonHighlight');
                    setTimeout(function () {
                        that.getJQElement('').removeClass('DQXBitmapButtonHighlight');
                    }, 500)
                }, 50);
                that._onChange();
            }

            that._onChange = function () {
                if (this._enabled)
                    this._notifyChanged();
            }

            //enable / disable the button
            that.enable = function (status) {
                this._enabled = status;
                if (this._enabled)
                    this.getJQElement('').css('opacity', 1);
                else
                    this.getJQElement('').css('opacity', 0.4);
            }

            return that;
        }

        ////////////////////////////////////////////////////////////////////////////////////////////
        // A hyperlink
        // NOTE: CtrlValueChanged message is sent when the hyperlink was pressed
        //    args.content : text of the hyperlink
        //    args.hint (optional) : hover tooltip
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Hyperlink = function (iid, args) {
            var that = Controls.Control(iid);
            DQX.requireMember(args, 'content');
            that.content = args.content;
            if (args.hint)
                that._hint = args.hint;

            that._execRenderHtml = function () {
                var bt = DocEl.Div({ id: this.getFullID('') });
                if (this._hint)
                    bt.addHint(this._hint);
                bt.addStyle('display', 'inline-block');
                bt.setCssClass("DQXHyperlink");
                bt.addElem(that.content);
                bt.addStyle("padding-top", "2px");
                bt.addStyle("padding-bottom", "2px");
                return bt.toString();
            }

            that._execPostCreateHtml = function () {
                this.getJQElement('').click($.proxy(that._onChange, that));
            }

            that._onChange = function () {
                this._notifyChanged();
            }

            return that;
        }



        ////////////////////////////////////////////////////////////////////////////////////////////
        // An edit box
        //    args.value (optional) : initial content of the edit box
        //    args.size (optional) : number of characters of the edit box
        //    args.hint (optional) : hover tooltip
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Edit = function (iid, args) {
            var that = Controls.Control(iid);
            that.myLabel = args.label;
            that.value = '';
            if ('value' in args)
                that.value = args.value;
            that.size = 6;
            if ('size' in args)
                that.size = args.size;
            if (args.hint)
                that._hint = args.hint;
            that._notifyEnter = null;

            //define a notification function that will be called when enter was pressed in the edit box
            that.setNotifyEnter = function (handler) {
                DQX.checkIsFunction(handler);
                this._notifyEnter = handler;
            }

            that._execRenderHtml = function () {
                var edt = DocEl.Edit(that.value, { id: this.getFullID('') });
                if (this._hint)
                    edt.addHint(this._hint);
                edt.addAttribute('size', that.size);
                edt.addAttribute('name', this.getFullID(''));
                edt.addAttribute('autocorrect', "off");
                edt.addAttribute('autocapitalize', "off");
                edt.addAttribute('autocomplete', "off");
                var rs = '';
                if (this.myLabel) {
                    var label = DocEl.Label({ target: this.getFullID('Label') });
                    label.addElem(this.myLabel);
                    rs = label.toString() + ' ';
                }
                return rs + edt.toString();
            }



            that._execPostCreateHtml = function () {
                this.getJQElement('').bind("propertychange input paste", $.proxy(that._onChange, that));
                this.getJQElement('').bind("keyup", $.proxy(that._onKeyUp, that));
            }

            that._onKeyUp = function (ev) {
                this._onChange();
                if (ev.keyCode == 13) {
                    if (this._notifyEnter)
                        this._notifyEnter();
                }
            }

            that._onChange = function () {
                var lastval = this.value;
                var newval = this.getValue();
                if (newval != lastval) {
                    this.value = newval;
                    this._notifyChanged();
                }
            }



            //Return the content of the edit box
            that.getValue = function () {
                this.value = this.getJQElement('').val();
                return this.value;
            }

            //Modify the content of the edit box
            that.modifyValue = function (newvalue) {
                if (newvalue == this.getValue()) return;
                this.value = newvalue;
                this.getJQElement('').val(newvalue);
                this._notifyChanged();
            }

            return that;
        }


        ////////////////////////////////////////////////////////////////////////////////////////////
        // A combo box
        //    agrs.label : text label put in front of the combo box
        //    agrs.states : list of combo box states, each state of the type { id:..., name,... }
        //    agrs.value (optional) : initial selected value of the combo box
        //    agrs.hint (optional) : hover tooltip
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Combo = function (iid, args) {
            var that = Controls.Control(iid);
            DQX.requireMember(args, 'label');
            DQX.requireMember(args, 'states');
            that.myLabel = args.label;
            that.myStates = args.states;
            that._selectedState = '';
            if ('value' in args)
                that._selectedState = args.value;
            if (args.hint)
                that._hint = args.hint;

            that._buildStatesMap = function () {
                this._statesMap = {};
                $.each(this.myStates, function (idx, state) {
                    DQX.requireMember(state, 'id');
                    DQX.requireMember(state, 'name');
                    that._statesMap[state.id] = state.name;
                })
            }
            that._buildStatesMap();

            //determines if an item is in the current set of states
            that.isState = function (id) {
                if (!('_statesMap' in this)) return false;
                return (id in this._statesMap);
            }

            that._buildSelectContent = function () {
                var st = '';
                for (var i = 0; i < this.myStates.length; i++)
                    st += '<option value="{id}" {selected}>{name}</option>'.DQXformat({
                        id: this.myStates[i].id,
                        name: this.myStates[i].name,
                        selected: (this.myStates[i].id == this._selectedState) ? 'selected="selected"' : ''
                    });
                return st;
            }

            that._execRenderHtml = function () {
                var cmb = DocEl.Create('select', { id: this.getFullID('') });
                if (this._hint)
                    cmb.addHint(this._hint);
                cmb.addElem(this._buildSelectContent());
                var label = DocEl.Label({ target: this.getFullID('Label') });
                label.addElem(this.myLabel);
                return label.toString() + ' ' + cmb.toString();
            }

            that._execPostCreateHtml = function () {
                var target = 'change.controlevent';
                this.getJQElement('').unbind(target).bind(target, $.proxy(that._onChange, that));
            }

            that._onChange = function () {
                this._selectedState = this.getValue();
                this._notifyChanged();
            }

            //Returns the currently selected item
            that.getValue = function () {
                this._selectedState = this.getJQElement('').find(":selected").attr('value');
                return this._selectedState;
            }

            //Sets what item is selected
            that.modifyValue = function (newstate) {
                if (newstate == this.getValue()) return;
                if (!this.isState(newstate))
                    DQX.reportError('Invalid combo box state');
                this._selectedState = newstate;
                this.getJQElement('').val(this._selectedState);
                this._notifyChanged();
            }


            return that;
        }



        ////////////////////////////////////////////////////////////////////////////////////////////
        // A hyperlink button
        // NOTE: CtrlValueChanged message is sent when the button was pressed
        //    agrs.bitmap (optional) : hyperlink bitmap
        //    agrs.text (optional) : hyperlink text
        //    agrs.hint (optional) : hover tooltip
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.LinkButton = function (iid, args) {
            var that = Controls.Control(iid);
            that.myBitmap = args.bitmap;
            that.text = args.text;
            that.description = '';
            that._hint = '';
            if (args.hint)
                that._hint = args.hint;
            that._vertShift = 0;
            if (args.vertShift)
                that._vertShift = args.vertShift;
            that._smartLink = false;
            if (args.smartLink) {
                that.myBitmap = DQXBMP('link1.png');
                that._vertShift = -2;
            }

            that._execRenderHtml = function () {
                var st = '<a id={id} TITLE="{desc2}" class="DQXHyperlink">'.DQXformat({ id: this.getFullID(''), desc2: that._hint });
                st += '<span style="white-space:nowrap;">'; //this trick is used to prevent a line break between the image and the text
                if (this.myBitmap) {
                    var s = '<IMG SRC="' + this.myBitmap + '" border=0 class="DQXBitmapLink" ALT="{desc1}" TITLE="{desc2}" style="position:relative;top:{shift}px"/>';
                    s = s.DQXformat(
                        { desc1: that.description, desc2: that._hint, shift: (-this._vertShift) });
                    st = st + s;
                }
                if (this.text) {
                    if (this.myBitmap) st += '&thinsp;';
                    st += '<span style="white-space:normal;">' + this.text + '</span>';
                }
                st += '</span>';
                st += '</a>';
                return st;
            }

            that._execPostCreateHtml = function () {
                var target = 'click.controlevent';
                this.getJQElement('').unbind(target).bind(target, $.proxy(that._onClick, that));
            }

            that._onClick = function () {
                this._notifyChanged();
            }

            that.getValue = function () {
                return "";
            }

            that.modifyValue = function (newstate) {
            }

            return that;
        }

        ////////////////////////////////////////////////////////////////////////////////////////////
        // A help button, where the id of the control is the documentation id
        // Pressing the button automatically shows the help content
        //    url: help content url
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.HelpButton = function (url, args) {
            args.bitmap = DQXBMP('info4.png');
            var that = Controls.LinkButton(null, args);

            that.setOnChanged(function () {
                Documentation.showHelp(url);
            })
            return that;
        }


        ////////////////////////////////////////////////////////////////////////////////////////////
        // A radio button group
        ////////////////////////////////////////////////////////////////////////////////////////////
        // A combo box
        //    agrs.label : text label
        //    agrs.states : list of radio button items, each state of the type { id:..., name,... }
        //    agrs.value (optional) : initial selected value
        //    agrs.hint (optional) : hover tooltip
        ////////////////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.RadioGroup = function (iid, args) {
            var that = Controls.Control(iid);
            DQX.requireMember(args, 'states');
            that.myLabel = args.label;
            that.myStates = args.states;
            that._selectedState = '';
            if ('value' in args)
                that._selectedState = args.value;
            if (args.hint)
                that._hint = args.hint;

            that._buildStatesMap = function () {
                this._statesMap = {};
                $.each(this.myStates, function (idx, state) {
                    DQX.requireMember(state, 'id');
                    DQX.requireMember(state, 'name');
                    that._statesMap[state.id] = state.name;
                })
            }
            that._buildStatesMap();

            that.isState = function (id) {
                if (!('_statesMap' in this)) return false;
                return (id in this._statesMap);
            }


            that._buildSelectContent = function () {
                var st = '';
                for (var i = 0; i < this.myStates.length; i++) {
                    var stateid = /*this.getFullID('') + '_' + */this.myStates[i].id;
                    st += '<div style="padding:5px">';
                    st += '<input type="radio" name={controlid} id={id2} value="{id}" {selected}></input>'.DQXformat({
                        controlid: this.getFullID(''),
                        id: stateid, id2: stateid,
                        selected: (this.myStates[i].id == this._selectedState) ? 'checked="yes"' : ''
                    });
                    st += '<label for="{id}">{title}</label>'.DQXformat({
                        id: stateid,
                        title: this.myStates[i].name
                    });
                    st += "</div>";
                }
                return st;
            }

            that._execRenderHtml = function () {
                var cmb = DocEl.Div({ id: this.getFullID('') });
                cmb.addElem(this._buildSelectContent());
                /*                var label = DocEl.Label({ target: this.getFullID('Label') });
                label.addElem(this.myLabel);*/
                return cmb.toString();
            }

            that._execPostCreateHtml = function () {
                var target = 'change.controlevent';
                this.getJQElement('').unbind(target).bind(target, $.proxy(that._onChange, that));
            }

            that._onChange = function () {
                this._selectedState = this.getValue();
                this._notifyChanged();
            }

            that.getValue = function () {
                this._selectedState = this.getJQElement('').find(":checked").attr('value');
                return this._selectedState;
            }

            that.modifyValue = function (newstate) {
                if (newstate == this.getValue()) return;
                if (!this.isState(newstate))
                    DQX.reportError('Invalid combo box state');
                this._selectedState = newstate;
                this.getJQElement('').val(this._selectedState);
                this._notifyChanged();
            }


            return that;
        }


        ////////////////////////////////////////////////////////////////////////////////////////////
        // A list
        //    args.width (optional) : width of the list box
        //    args.height (optional) : height of the list box
        //    args.checkList (optional) : if true, each list item has a check box
        //    args.allowSelectItem (optional) : if true, the user can select an item in the list (default: true)
        // Use setItems to define the items in the list
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.List = function (iid, args) {
            var that = Controls.Control(iid);
            that._width = 300;
            that._height = 200;
            if ('width' in args)
                that._width = args.width;
            if ('height' in args)
                that._height = args.height;
            that._checkList = false;
            if ('checkList' in args)//Items in the list have check boxes
                that._checkList = args.checkList;
            that._allowSelectItem = true;
            if ('allowSelectItem' in args)
                that._allowSelectItem = args.allowSelectItem;
            that._items = [];
            that._activeItem = null;

            that._getLineID = function (itemID) {
                return this.getFullID('_item_' + itemID);
            }
            that._getCheckID = function (itemID) {
                return this.getFullID('_check_' + itemID);
            }

            that._renderItems = function () {
                var lst = '';
                for (var i = 0; i < this._items.length; i++) {
                    var item = this._items[i];
                    var line = DocEl.Div({ id: this._getLineID(item.id) });
                    //line.setID(item.id);
                    if (this._activeItem == item.id)
                        line.setCssClass('DQXLargeListItemSelected');
                    else
                        line.setCssClass('DQXLargeListItem');
                    if (this._checkList) {
                        var checkArea = DocEl.Div({ parent: line });
                        checkArea.addStyle('float', 'left');
                        checkArea.addStyle('margin-right', '7px');
                        var chk = DocEl.Check({ id: this._getCheckID(item.id), parent: checkArea });
                        if (item.checked)
                            chk.addAttribute('checked', "checked");
                    }
                    line.addElem(item.content);
                    lst += line.toString();
                }
                return lst;
            }

            //sets the items of the list, and specifies the active item
            // 'lst' should be a list of objects of the type { id:..., content:... }
            that.setItems = function (lst, activeItem) {
                this._items = [];
                $.each(lst, function (idx, item) {
                    DQX.requireMember(item, 'id');
                    DQX.requireMember(item, 'content');
                    that._items.push(item);
                });
                this._itemsMap = {};
                for (var nr = 0; nr < this._items.length; nr++)
                    this._itemsMap[this._items[nr].id] = this._items[nr];
                if (typeof activeItem != 'undefined')
                    this._activeItem = activeItem;
                this.getJQElement('').html(this._renderItems());
                if (this.scrollHelper)
                    this.scrollHelper.update();
            }

            //returns an item from the list, by id
            that.findItem = function (itemID) {
                if (!this._itemsMap)
                    DQX.reportError('List items not initialised');
                var rs = this._itemsMap[itemID];
                if (!rs)
                    DQX.reportError('Item not present in the list: ' + itemID);
                return rs;
            }

            that._execRenderHtml = function () {
                var dv = DocEl.Div({ id: this.getFullID('') });
                dv.setCssClass('DQXFormControl');
                dv.makeAutoVerticalScroller(true);
                if (this._width > 0)
                    dv.setWidthPx(this._width);
                else
                    dv.addStyle('width', '100%');
                dv.setHeightPx(this._height);
                dv.addElem(this._renderItems());
                return dv.toString();
            }

            that._execPostCreateHtml = function () {

                this.scrollHelper = DQX.scrollHelper(this.getJQElement(''));

                var target = 'mousedown.itemevent';
                this.getJQElement('').unbind(target).bind(target, $.proxy(that._onChange, that));

                var target = 'dblclick.itemevent';
                this.getJQElement('').unbind(target).bind(target, $.proxy(that._onDoubleClick, that));

                var target = 'change.itemevent';
                this.getJQElement('').unbind(target).bind(target, $.proxy(that._onChangeCheck, that));

            }

            that._event2ListItem = function (ev) {
                rs = { itemID: null, inCheckBox: false };
                var ctrlID = ev.target.id;
                if (ctrlID == '')
                    ctrlID = $(ev.target).parent().attr('id');
                for (var i = 0; i < this._items.length; i++) {
                    var item = this._items[i];
                    if ((ctrlID == this._getLineID(item.id)) || (ctrlID == this._getCheckID(item.id))) {
                        rs.itemID = item.id;
                        if (ctrlID == this._getCheckID(item.id))
                            rs.inCheckBox = true;
                    }
                }
                return rs;
            }

            that.setOnDoubleClick = function (handler) {
                DQX.checkIsFunction(handler);
                that._handleDoubleClick = handler;
            }

            that._onDoubleClick = function (ev) {
                if (that._handleDoubleClick)
                    that._handleDoubleClick();
                return false;
            }

            that._onChangeCheck = function (ev) {
                var itemID = this._event2ListItem(ev).itemID;
                if (itemID) {
                    this.findItem(itemID).checked = $('#' + this._getCheckID(itemID)).is(':checked');
                    this._notifyChanged();
                }
            }

            that._onChange = function (ev) {
                var info = this._event2ListItem(ev)
                var itemID = info.itemID;
                if (itemID) {
                    if (this._allowSelectItem) {
                        this.modifyValue(itemID);
                    }
                    else {
                        if (!info.inCheckBox) {
                            var elem = $('#' + this._getCheckID(itemID));
                            var isChecked = checked = elem.is(':checked');
                            if (!isChecked)
                                elem.attr('checked', 'checked');
                            else
                                elem.removeAttr('checked');
                            this._notifyChanged();
                        }
                    }
                }
                return false;
            }

            //returns the currently active item
            that.getValue = function () {
                return this._activeItem;
            }

            //sets the currently active item
            that.modifyValue = function (newvalue) {
                if (this._activeItem)
                    this.getJQElement('').children('#' + this._getLineID(this._activeItem)).addClass('DQXLargeListItem').removeClass('DQXLargeListItemSelected');
                this.getJQElement('').children('#' + this._getLineID(newvalue)).removeClass('DQXLargeListItem').addClass('DQXLargeListItemSelected');
                this._activeItem = newvalue;
                this._notifyChanged();
            }

            //For a checked list, return the list with currently checked items
            that.getCheckedItems = function () {
                var items = [];
                for (var i = 0; i < this._items.length; i++) {
                    var item = this._items[i];
                    if ($('#' + this._getCheckID(item.id)).is(':checked'))
                        items.push(item.id);
                }
                return items;
            }

            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // A horizontal value slider
        //    args.label : text label of the slider
        //    args.minval : minimum value
        //    args.maxval : maximum value
        //    args.value : initial value
        //    args.digits (optional) : number of decimal digits displayed
        //    args.width (optional) : width of the slider
        //    args.height (optional) : height of the slider
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.ValueSlider = function (iid, args) {
            var that = Controls.Control(iid);
            that._width = 300; if ('width' in args) that._width = args.width;
            that._height = 25; if ('height' in args) that._height = args.height;
            DQX.requireMember(args, 'label');
            that._label = args.label;
            DQX.requireMember(args, 'minval');
            DQX.requireMember(args, 'maxval');
            that._minval = args.minval;
            that._maxval = args.maxval;
            that._value = that._minval; if (args.value) that._value = args.value;
            that.digits = 0; if (args.digits) that.digits = args.digits;

            that._controlExtensionList.push('Canvas');

            that._execRenderHtml = function () {
                st = '<div id="{id}" style="width:{width}px">'.DQXformat({ id: this.getFullID(''), width: this._width });
                st += '<span >{content}</span>'.DQXformat({ content: that._label });
                st += '<span id="{id}" style="float:right">1</span>'.DQXformat({ id: this.getFullID('Value') });
                st += "</div>";

                st += '<div><canvas id="{id}" width="{width}"  height="{height}"></canvas></div>'.DQXformat({ id: this.getFullID('Canvas'), width: this._width, height: this._height });
                return st;
            }

            that._execPostCreateHtml = function () {
                this._scroller = Scroller.HScrollBar(this.getFullID('Canvas'));
                this._scroller.myConsumer = this;
                this._scroller.zoomareafraction = 0.001;
                this._scroller.setRange(this._minval, this._maxval);
                this._scroller.setValue((this._value - this._minval) / (this._maxval - this._minval), 0.02);
                this._scroller.draw();
            };

            //Internal handlers
            that.scrollTo = function () {
                this._value = (this._scroller.rangeMin + this._scroller.scrollPos * (this._scroller.rangeMax - this._scroller.rangeMin));
                $('#' + this.getFullID('Value')).text(this._value.toFixed(this.digits));
                this._notifyChanged();
            };


            //Returns the current value of the slider
            that.getValue = function () {
                return this._value;
            };

            //Modifies the current value of the slider
            that.modifyValue = function (newvalue) {
                if (newvalue == this.getValue()) return;
                this._value = newvalue;
                $('#' + this.getFullID('Value')).text(this._value.toFixed(this.digits));
                this._scroller.setValue((this._value - this._minval) / (this._maxval - this._minval), 0.02);
                this._scroller.draw();
                this._notifyChanged();
            };

            return that;
        }



        return Controls;
    });
