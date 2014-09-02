// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

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

define(["DQX/Utils", "DQX/Msg", "DQX/DocEl", "DQX/Scroller", "DQX/Documentation", "DQX/Externals/spectrum"],
    function (DQX, Msg, DocEl, Scroller, Documentation) {
        var Controls = {};

        Controls.autoCreateListeners = false;//set to true create event listeners for each control

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

        //Stores the status of a control (and subcontrols) to a single object
        //NOTE: only controls with specified classID's will be serialised!
        Controls.storeSettings = function(ictrl) {
            var obj={};
            ictrl.applyOnControls(function(actrl) {
                if (actrl.getValue) {
                    var ctrlid = actrl.classID;
                    if (ctrlid) {
                        obj[ctrlid]=actrl.getValue();
                    }
                }
            });
            return obj;
        }


        //Recalls the status of a control (and subcontrols) from a single object
        Controls.recallSettings = function(ictrl, settObj, preventNotify) {
            ictrl.applyOnControls(function(actrl) {
                if (actrl.modifyValue) {
                    var ctrlid = actrl.classID;
                    if ( (ctrlid) && (settObj[ctrlid]!=null) )
                        actrl.modifyValue(settObj[ctrlid],preventNotify);
                }
            });
        }



        ////////////////////////////////////////////////////////////////////////////////////////////
        // This control can be used to wrap another control control in a styled div
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Wrapper = function (icontrol, wrapperStyle) {
            var that = {};
            that._control = icontrol;
            that.myID = Controls._getNextControlID();
            that._wrapperStyle = wrapperStyle;

            that.getID = function () {
                return that.myID;
            }

            that.renderHtml = function () {
                var el = DocEl.Div({ id: this.myID });
                el.setCssClass(that._wrapperStyle)
                el.addElem(this._control.renderHtml());
                return el.toString();
            }

            that.postCreateHtml = function () {
                this._control.postCreateHtml();
            }

            that.applyOnControls = function(fnc) {
                if ('applyOnControls' in that._control)
                    that._control.applyOnControls(fnc);
            };

            that.tearDown = function() {
                if ('tearDown' in that._control)
                    that._control.tearDown();
            };

            that.setContextID = function (id) {
                if ('setContextID' in that._control)
                    that._control.setContextID(id);
            }


            return that;
        }


        ////////////////////////////////////////////////////////////////////////////////////////////
        // This control can be used to show or hide another control
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.ShowHide = function (icontrol) {
            var that = {};
            that._control = icontrol;
            that.myID = Controls._getNextControlID();
            that._visible = true;


            that.getID = function () {
                return that.myID;
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
                el.addStyle('display', 'inline-block');
                el.addElem(this._control.renderHtml());
                return el.toString();
            }

            that.postCreateHtml = function () {
                if (!that._visible)
                    $('#' + that.myID).hide();
                this._control.postCreateHtml();
            }

            that.applyOnControls = function(fnc) {
                if ('applyOnControls' in that._control)
                    that._control.applyOnControls(fnc);
            };

            that.tearDown = function() {
                if ('tearDown' in that._control)
                    that._control.tearDown();
            }

            return that;
        }


        ////////////////////////////////////////////////////////////////////////////////////////////
        // This control can be used to center another control
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.AlignCenter = function (icontrol) {
            var that = {};
            that._control = icontrol;

            that.getID = function () {
                return that._control.getID();
            }


            that.renderHtml = function () {
                var el1 = DocEl.Div({});
                el1.addStyle('text-align', 'center');
                var el2 = DocEl.Div({ parent: el1 });
                el2.addStyle('display', 'inline-block');
                el2.addStyle('text-align', 'left');
//                el2.addStyle('background-color', 'rgb(255,192,192)');
                el2.addElem(this._control.renderHtml());
                return el1.toString();
            }

            that.postCreateHtml = function () {
                this._control.postCreateHtml();
            }

            that.applyOnControls = function(fnc) {
                if ('applyOnControls' in that._control)
                    that._control.applyOnControls(fnc);
            };

            that.tearDown = function() {
                if ('tearDown' in that._control)
                    that._control.tearDown();
            }

            that.setContextID = function (id) {
                if ('setContextID' in that._control)
                    that._control.setContextID(id);
            }

            return that;
        }

        ////////////////////////////////////////////////////////////////////////////////////////////
        // This control can be used to right align another control
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.AlignRight = function (icontrol) {
            var that = {};
            that._control = icontrol;

            that.getID = function () {
                return that._control.getID();
            }


            that.renderHtml = function () {
                var el = DocEl.Div({ id: this.myID });
                el.addStyle('display', 'inline-block');
                el.addStyle('float', 'right');
                el.addElem(this._control.renderHtml());
                return el.toString();
            }

            that.postCreateHtml = function () {
                this._control.postCreateHtml();
            }

            that.applyOnControls = function(fnc) {
                if ('applyOnControls' in that._control)
                    that._control.applyOnControls(fnc);
            };

            that.tearDown = function() {
                if ('tearDown' in that._control)
                    that._control.tearDown();
            }

            that.setContextID = function (id) {
                if ('setContextID' in that._control)
                    that._control.setContextID(id);
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
            that.myID = Controls._getNextControlID();
            that._visible = true;
            that._autoFillX = true;
            that._legendClass = "DQXFormFieldSet";

            //Clears the list of member controls
            that.clear = function () {
                that.tearDown();
                that._controls = [];
            }

            //Determines whether or not the control fills the full horizontal space
            that.setAutoFillX = function(status) { this._autoFillX = status; return this; }

            that.setID = function(iid) {
                that.myCustomID = iid;
                return that;
            }

            //add a new control to the list (append at the end)
            that.addControl = function (item) {
                DQX.requireMemberFunction(item, 'getID');
                that._controls.push(item);
                return item;
            }

            //add a new control to the list (insert at top)
            that.addControlTop = function (item) {
                DQX.requireMemberFunction(item, 'getID');
                that._controls.unshift(item);
                return item;
            }

            that.tearDown = function() {
                $.each(that._controls, function(idx, ctrl) {
                    if ('tearDown' in ctrl)
                        ctrl.tearDown();
                });
            }


            if (icontrols)
                $.each(icontrols, function (idx, ctrl) { that.addControl(ctrl); });

            //Sets a header legend for the group
            that.setLegend = function (txt) {
                this._legend = txt; return this;
            }
            that.setLegendSimple = function () {
                that._legendClass = "DQXFormFieldSetSimple";
                return this;
            }
            that.setLegendClass = function (clss) {
                that._legendClass = clss;
                return this;
            }

            that.getID = function () {
                if (that.myCustomID)
                    return that.myCustomID;
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
                return that;
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

            that.applyOnControls = function(fnc) {
                $.each(that._controls, function(idx,ctrl) {
                    if ('applyOnControls' in ctrl)
                        ctrl.applyOnControls(fnc);
                });
            };


            return that;
        }

        ////////////////////////////////////////////////////////////////////////////////////////////
        //A compound control grouping a list of controls in a horizontal way
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.CompoundHor = function (icontrols) {
            var that = Controls.CompoundGenericList(icontrols);

            that.renderHtml = function () {
                var st = '';
                if (!that._autoFillX)
                    st += '<div style="display:inline-block">';
                if (this._legend.length > 0) {
                    st += '<fieldset class="{cls}">'.DQXformat({cls:that._legendClass});
                    st += '<legend>' + this._legend + '</legend>';
                }
                for (var i = 0; i < this._controls.length; i++)
                    st += this._controls[i].renderHtml();
                if (this._legend.length > 0) {
                    st += '</fieldset>';
                }
                if (!that._autoFillX)
                    st += '</div>';
                return st;
            }

            return that;
        }


        ////////////////////////////////////////////////////////////////////////////////////////////
        //A compound control grouping a list of controls in a horizontal way
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.CompoundVert = function (icontrols) {
            var that = Controls.CompoundGenericList(icontrols);
            that.treatAsBlock = false;
            that._margin = 3;
            that._leftIndent = 0;

            that.setMargin = function(margin) {
                that._margin = margin;
                return that;
            }

            that.setLeftIndent = function(vl) {
                that._leftIndent = vl;
                if (!that.treatAsBlock)
                    DQX.reportError('Invalid combination of settings');
                return that;
            }

            that.setTreatAsBlock = function() {
                that.treatAsBlock = true;
                return that;
            }


            that.renderHtml = function () {
                var st = '';
                if (that.treatAsBlock || (!that._autoFillX) )
                    st += '<div style="display:inline-block;vertical-align:top;margin-left:{marginleft}px">'.DQXformat({
                        marginleft: that._leftIndent
                    });
                if (this._legend.length > 0) {
                    st += '<fieldset class="{cls}">'.DQXformat({cls:that._legendClass});
                    st += '<legend>' + this._legend + '</legend>';
                }
                for (var i = 0; i < this._controls.length; i++) {
                    var el = DocEl.Div({});
                    if (that._margin>0) {
                        if (i>0)
                            el.addStyle('margin-top', ((i>0)?(this._margin):(this._margin/2)) + 'px');
                        if (i<this._controls.length-1)
                            el.addStyle('margin-bottom', ((i<this._controls.length-1)?(this._margin):(this._margin/2)) + 'px');
                    }
                    el.addElem(this._controls[i].renderHtml());
                    st += el.toString();
                }
                if (this._legend.length > 0) {
                    st += '</fieldset>';
                }
                if (that.treatAsBlock || (!that._autoFillX) )
                    st += '</div>';
                return st;
            }

            return that;
        }


        Controls.BaseCustom = function (stackVertical) {
            if (!stackVertical)
                var that = Controls.CompoundHor([]);
            else
                var that = Controls.CompoundVert([]);
            return that;
        }


        //////////////////////////////////////////////////////////////////////////

        Controls.Section = function (icontrol, settings) {
            var that = {};
            that._control = icontrol;
            that.myID = Controls._getNextControlID();
            that._visible = true;
            that._headerStyleClass = 'DQXControlSectionHeader';
            that._bodyStyleClass = 'DQXControlSectionBody';
            that._title = settings.title;
            //that._visible = true;
            that._canCollapse = true;
            that._defaultCollapsed = false;
            if (settings.headerStyleClass)
                that._headerStyleClass = settings.headerStyleClass;
            if (settings.bodyStyleClass)
                that._bodyStyleClass = settings.bodyStyleClass;
            if (settings.canCollapse === false)
                that._canCollapse = false;
            if (settings.defaultCollapsed)
                that._visible = false;



            that.getID = function () {
                return that.myID;
            }


            that._createButtonHtml = function (_collapsed) {
                return '<span class="fa {ic}" style="font-size: 12px"></span>'.DQXformat({ic:_collapsed?'fa-plus-circle':'fa-minus-circle'});
                //return '<IMG SRC="' + DQX.BMP(_collapsed ? 'morelines.png' : 'lesslines.png') + '" border=0 ALT="" TITLE="" class="DQXTreeButtonImage" style="float:left;padding-right:6px">';
            }

            that.renderHtml = function () {
                that.myIDHeader = that.myID+'header';
                that.myIDButton = that.myID+'collapserbutton';
                that.myIDBody = that.myID+'body';
                var el = DocEl.Div({ id: this.myID });
                var header = DocEl.Div({ parent: el , id:that.myIDHeader});
                header.setCssClass(that._headerStyleClass);
                if (that._canCollapse) {
                    header.addStyle('cursor', 'pointer');
                    var buttondv = DocEl.Div({ parent: header, id:that.myIDButton });
                    buttondv.addStyle('width','20px');
                    buttondv.addStyle('height','15px');
                    buttondv.setCssClass("DQXTreeButton");
                    buttondv.addElem(that._createButtonHtml(!that._visible));
                }
                header.addElem(that._title);
                var body = DocEl.Div({ parent: el, id:that.myIDBody });
                body.setCssClass(that._bodyStyleClass);
                if (!that._visible)
                    body.addStyle('display','none');
                body.addElem(this._control.renderHtml());
                return el.toString();
            }

            that.postCreateHtml = function () {
                if (that._canCollapse) {
                    var clickElem = $('#' + that.myIDHeader);
                    clickElem.click(function() {
                        that._visible = !that._visible;
                        var subdiv = $('#' + that.myIDBody);
                        if (!that._visible) {
                            subdiv.slideUp(250);
                            if (that.onCollapsing)
                                that.onCollapsing();
                        }
                        else {
                            subdiv.slideDown(250);
                            if (that.onExpanding)
                                that.onExpanding();
                        }
                        setTimeout(function() {
                            $('#' + that.myIDButton).html(that._createButtonHtml(!that._visible));
                        }, 300)
                    });
                }
                this._control.postCreateHtml();
            }

            that.applyOnControls = function(fnc) {
                if ('applyOnControls' in that._control)
                    that._control.applyOnControls(fnc);
            };

            that.tearDown = function() {
                if ('tearDown' in that._control)
                    that._control.tearDown();
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
            that._legend = null;
            that._autoFillX = true;

            //Clears the member controls
            that.clear = function () {
                that._controlRows = [];
            }

            that.setSeparation = function(seph, sepv) {
                that.sepH = seph;
                that.sepV = sepv;
                return that;
            }

            //Sets a header legend for the group
            that.setLegend = function (txt) { this._legend = txt; return this; }

            that.setID = function(iid) {
                that.myCustomID = iid;
                return that;
            }

            //Determines whether or not the control fills the full horizontal space
            that.setAutoFillX = function(status) { this._autoFillX = status; return this; }

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


            that.applyOnControls = function(fnc) {
                for (var rowNr = 0; rowNr < this._controlRows.length; rowNr++)
                    for (var colNr = 0; colNr < this._controlRows[rowNr].length; colNr++)
                        if (this._controlRows[rowNr][colNr] != null)
                            if ('applyOnControls' in this._controlRows[rowNr][colNr])
                                this._controlRows[rowNr][colNr].applyOnControls(fnc);
            };


            that.getID = function () {
                if (that.myCustomID)
                    return that.myCustomID;
                if (!this.getItem(0, 0)) DQX.reportError('Compound control has no components');
                return this.getItem(0, 0).getID(id);
            }

            that.setContextID = function (id) {
                this._loopItems(function (it) { it.setContextID(id); });
            }

            that.modifyEnabled = function (newstate) {
                this._loopItems(function (it) { it.modifyEnabled(id); });
                return that;
            }

            that.renderHtml = function () {
                var st = '';
                if (!this._autoFillX)
                    st += '<div style="display:inline-block">';
                if (this._legend) {
                    st += '<fieldset class="{cls}">'.DQXformat({cls:that._legendClass});
                    st += '<legend>' + this._legend + '</legend>';
                }

                st += '<table style="padding-top:{pt}px;">'.DQXformat({ pt: this.sepV });
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

                if (this._legend) {
                    st += '</fieldset>';
                }
                if (!this._autoFillX)
                    st += '</div>';
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

            that.applyOnControls = function(fnc) {
            };

            that.findControl = function (id) { return null; }

            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////////////
        //A 
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.HorizontalSeparator = function (isize) {
            var that = {};
            that._size = isize;
            that.getID = function () { return ''; }
            that.setContextID = function (id) { }
            that.modifyEnabled = function (newstate) { }
            that.renderHtml = function () {
                return '<div style="width:{sz}px;display:inline-block"></div>'.DQXformat({ sz: this._size });
            }
            that.postCreateHtml = function () { }
            that.findControl = function (id) { return null; }

            that.applyOnControls = function(fnc) {
            };

            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////////////
        //A 
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.VerticalSeparator = function (isize) {
            var that = {};
            that._size = isize;
            that.getID = function () { return ''; }
            that.setContextID = function (id) { }
            that.modifyEnabled = function (newstate) { }
            that.renderHtml = function () {
                return '<div style="height:{sz}px;width:100%;clear:both"></div>'.DQXformat({ sz: this._size });
            }
            that.postCreateHtml = function () { }
            that.findControl = function (id) { return null; }

            that.applyOnControls = function(fnc) {
            };

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
            that._eventids = [];

            if (_debug_) {
                if ($('#' + iid).length > 0)
                    DQX.reportError('Control creation error: element with ID ' + iid + ' is already present in the DOM tree');
            }

            //Defines this control to have the focus
            that.setHasDefaultFocus = function () {
                this._hasDefaultFocus = true;
                return this;
            }

            //Used for store/recall serialisation of the control data
            that.setClassID = function(id) {
                that.classID = id;
                return that;
            }

            that.getID = function () { return this.myID; }

            //Internal
            that.getFullID = function (extension) { return this.myContextID + this.myID + extension; }

            that._reactModifyValue = function (scope, value) {
                if (scope.contextid == this.myContextID) {
                    this.modifyValue(value);
                }
            }

            if (Controls.autoCreateListeners) {
                //We install a listener so that we can send an event to modify the value of the control
                var eventid = DQX.getNextUniqueID();that._eventids.push(eventid);
                Msg.listen(eventid, { type: 'CtrlModifyValue', id: that.myID }, $.proxy(that._reactModifyValue, that));
            }


            that._reactModifyEnabled = function (scope, value) {
                if (scope.contextid == this.myContextID) {
                    this.modifyEnabled(value);
                }
            }

            if (Controls.autoCreateListeners) {
                //We install a listener so that we can send an event to modify the enabled state of the control
                var eventid = DQX.getNextUniqueID();that._eventids.push(eventid);
                Msg.listen(eventid, { type: 'CtrlModifyEnabled', id: that.myID }, $.proxy(that._reactModifyEnabled, that));
            }

            that.tearDown = function() {
                $.each(that._eventids, function(idx,eventid) {
                    Msg.delListener(eventid);
                });
            }


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

            that.applyOnControls = function(fnc) {
                fnc(that);
            };


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
                return that;
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
                if (!this.isRendered()) DQX.reportError('Control is not rendered');
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

            that.bindToModel = function (model, attr, transform) {
                var transform = transform || function (a) {return a;}
                that.modifyValue(model.get(attr), true);
                model.on({ change: attr }, function () {
                    that.modifyValue(model.get(attr), true);
                });
                that.setOnChanged(function () {
                    model.set(attr, transform(that.getValue()));
                });
                return that;
            };

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

            that.findControl = function (id) { return null; }

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
                if (this.getJQElement('').length>0)
                    this.isChecked = this.getJQElement('').is(':checked');
                return this.isChecked;
            }

            //Modify the status of the check box
            //Returns whether the value has been modified
            that.modifyValue = function (newstate, preventNotify) {
                if (newstate == this.getValue()) return false;
                this.isChecked = newstate;
                if (this.isChecked)
                    this.getJQElement('').attr('checked', 'checked');
                else
                    this.getJQElement('').removeAttr('checked');
                if (!preventNotify)
                    this._notifyChanged();
                return true;
            }

            that.modifyEnabled = function (newstate) {
                this._enabled = newstate;
                for (var i = 0; i < this._controlExtensionList.length; i++) {
                    if (this._enabled) {
                        var ele = this.getJQElement(this._controlExtensionList[i]);
                        ele.removeAttr('disabled');
                        ele.next().css('opacity', 1.0);
                    }
                    else {
                        var ele = this.getJQElement(this._controlExtensionList[i]);
                        ele.attr("disabled", "disabled");
                        ele.next().css('opacity', 0.4);
                    }
                }
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
                that.content += '<IMG SRC="' + args.bitmap + '" border=0 ALT="' + description + '" TITLE="' + description + '" style="padding-right:7px;vertical-align:middle;';
                if (args.bitmapHeight)
                    that.content += 'height:{h}px'.DQXformat({h:args.bitmapHeight});
                that.content += '">';
                that.content += '<div class="_DQXButtonText" style="display:inline-block;width:{textw};vertical-align:middle">'.DQXformat({ textw: textWidth }) + DQX.interpolate(args.content) + '</div>';
            }
            if (args.icon && args.content) {
                var textWidth = '100%';
                if (args.width && args.height)
                    textWidth = (args.width - args.height - 12) + 'px';
                that.content = '';
                that.content += '<div style="display:inline-block;vertical-align:middle;width:1px;height:100%"></div>';
                that.content += '<div class="fa {icon} buttonicon" style="display:inline-block;line-height: inherit;font-size: 22px;padding-right:7px;vertical-align:middle;{colorToken}"></div>'.DQXformat({
                    icon:args.icon,
                    colorToken:(args.iconColor?('color:'+args.iconColor.toString()):'')
                });
                that.content += '<div class="_DQXButtonText" style="display:inline-block;width:{textw};vertical-align:middle">'.DQXformat({ textw: textWidth }) + DQX.interpolate(args.content) + '</div>';
            }
            if (args.icon && !args.content) {
                that.content += '<div class="fa {icon} buttonicon" style="'.DQXformat({icon:args.icon});
                if (args.height)
                    that.content += 'font-size: {height}px;'.DQXformat({height:args.height});
                that.content += 'display:inline-block;line-height: inherit;vertical-align:middle;"></div>';
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
                //Commented out as added in default css class DQXWizardButton
              //  bt.addStyle('vertical-align', 'top');
                if (args.floatright)
                    bt.addStyle('float', 'right');
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

            //to be called when the button is running
            that.changeContent = function(newContent) {
                this.getJQElement('').html(newContent);
            };


            //to be called when the button is running
            that.changeIcon = function(newIcon, newIconColor, newText) {
                var icEl = this.getJQElement('').find('.fa');
                icEl.removeClass(args.icon);
                icEl.addClass(newIcon);
                icEl.css('color', newIconColor.toString());
                if (newText!=null)
                    this.getJQElement('').find('._DQXButtonText').html(newText);
                args.icon = newIcon;
            };



            that.modifyEnabled = function (newstate) {
                that.enable(newstate);
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

            //modify the content of the control
            that.modifyValue = function (newContent) {
                that.content = newContent;
                this.getJQElement('').html(that.content);
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
            if (args.class)
                that._class = args.class;

            //if (that.myLabel)
            //    that._controlExtensionList.push('TheLabel');


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
                if (that._class)
                    edt.setCssClass(that._class);
                var rs = '';
                if (this.myLabel) {
                    var label = DocEl.Label({ target: this.getFullID('') });
                    label.addElem(this.myLabel);
                    if (that._class)
                        label.setCssClass(that._class);
                    rs = label.toString() + ' ';
                }
                return rs + edt.toString();
            }



            that._execPostCreateHtml = function () {
                this.getJQElement('').bind("propertychange input paste", $.proxy(that._onChange, that));
                this.getJQElement('').bind("keyup", $.proxy(that._onKeyUp, that));
                if (that._hasDefaultFocus)
                    this.getJQElement('').select();
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
                if (this.isRendered())
                    this.value = this.getJQElement('').val();
                return this.value;
            }

            //Modify the content of the edit box
            that.modifyValue = function (newvalue, preventNotify) {
                if (newvalue === this.getValue()) return;
                this.value = newvalue;
                this.getJQElement('').val(newvalue);
                if (!preventNotify)
                    this._notifyChanged();
            }

            return that;
        }



        ////////////////////////////////////////////////////////////////////////////////////////////
        // An textarea box (=multiline edit)
        //    args.value (optional) : initial content of the edit box
        //    args.size (optional) : number of horizontal characters of the edit box
        //    args.linecount (optional) : number of lines of the edit box
        //    args.hint (optional) : hover tooltip
        //    args.fixedfont : true for fixed spacing font
        //    args.accepttabs
        ////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Textarea = function (iid, args) {
            var that = Controls.Control(iid);
            that.myLabel = args.label;
            that.value = '';
            if ('value' in args)
                that.value = args.value;
            that.size = 6;
            if ('size' in args)
                that.size = args.size;
            that.linecount = 2;
            if ('linecount' in args)
                that.linecount = args.linecount;
            if (args.hint)
                that._hint = args.hint;
            if (args.fixedfont)
                that._fixedfont = args.fixedfont;
            if (args.noWrap)
                that._noWrap = args.noWrap;
            if (args.accepttabs)
                that._accepttabs = args.accepttabs;
            that._notifyEnter = null;

            //if (that.myLabel)
            //    that._controlExtensionList.push('TheLabel');


            //define a notification function that will be called when enter was pressed in the edit box
            that.setNotifyEnter = function (handler) {
                DQX.checkIsFunction(handler);
                this._notifyEnter = handler;
            }

            that._execRenderHtml = function () {
                var edt = DocEl.Create("textarea", { id: this.getFullID('') });
                edt.addElem(that.value);
                if (this._hint)
                    edt.addHint(this._hint);
                edt.addAttribute('cols', that.size);
                edt.addAttribute('rows', that.linecount);
                edt.addAttribute('name', this.getFullID(''));
                edt.addAttribute('autocorrect', "off");
                edt.addAttribute('autocapitalize', "off");
                edt.addAttribute('autocomplete', "off");
                if (this._noWrap) {
                    edt.addStyle('overflow-x','scroll');
                    edt.addStyle('white-space','pre');
                    edt.addAttribute('wrap', "off");
                }
                if (that._fixedfont) {
                    edt.addStyle('font-family', 'Courier');
                }
                var rs = '';
                if (this.myLabel) {
                    var label = DocEl.Label({ target: this.getFullID('') });
                    label.addElem(this.myLabel);
                    rs = label.toString() + ' ';
                }
                return rs + edt.toString();
            }



            that._execPostCreateHtml = function () {
                this.getJQElement('').bind("propertychange input paste", $.proxy(that._onChange, that));
                if (that._accepttabs)
                    this.getJQElement('').bind("keydown", that._onKeyDown);
                this.getJQElement('').bind("keyup", $.proxy(that._onKeyUp, that));
                if (that._hasDefaultFocus)
                    this.getJQElement('').select();
            }

            that._onKeyDown = function (ev) {
                if (that._accepttabs) {
                    if(ev.keyCode === 9) { // tab was pressed
                        // get caret position/selection
                        var start = this.selectionStart;
                        var end = this.selectionEnd;

                        var $this = $(this);
                        var value = $this.val();

                        // set textarea value to: text before caret + tab + text after caret
                        $this.val(value.substring(0, start)
                            + "\t"
                            + value.substring(end));

                        // put caret at right position again (add one for the tab)
                        this.selectionStart = this.selectionEnd = start + 1;

                        // prevent the focus lose
                        ev.preventDefault();
                    }
                }
            };

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
            that.modifyValue = function (newvalue, preventNotify) {
                if (newvalue == this.getValue()) return;
                this.value = newvalue;
                this.getJQElement('').val(newvalue);
                if (!preventNotify)
                    this._notifyChanged();
            }

            return that;
        }


        ////////////////////////////////////////////////////////////////////////////////////////////
        // A combo box
        //    args.label : text label put in front of the combo box
        //    args.states : list of combo box states, each state of the type { id:..., name,... }
        //    args.value (optional) : initial selected value of the combo box
        //    args.hint (optional) : hover tooltip
        //    args.width: combo box width
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
            if ('width' in args)
                that._width = args.width;

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

            that.setItems = function(states, selectedState) {
                this.myStates = [];
                $.each(states, function (idx, item) {
                    DQX.requireMember(item, 'id');
                    DQX.requireMember(item, 'name');
                    that.myStates.push(item);
                });
                that._selectedState = selectedState;
                this.getJQElement('').html(that._buildSelectContent());
                that._buildStatesMap();
            }

            that._buildSelectContent = function () {
                var st = '';
                var lastGroupName = '';
                for (var i = 0; i < this.myStates.length; i++) {
                    var groupName = this.myStates[i].group || '';
                    if (groupName != lastGroupName) {
                        if (lastGroupName)
                            st += '</optgroup>';
                        lastGroupName = groupName;
                        if (groupName)
                            st += '<optgroup = label="{name}">'.DQXformat({name: groupName});
                    }
                    st += '<option value="{id}" {selected}>{name}</option>'.DQXformat({
                        id: this.myStates[i].id,
                        name: this.myStates[i].name,
                        selected: (this.myStates[i].id == this._selectedState) ? 'selected="selected"' : ''
                    });
                }
                if (lastGroupName)
                    st += '</optgroup>';
                return st;
            }

            that._execRenderHtml = function () {
                var wrapper = DocEl.Div();
                wrapper.addStyle('display', 'inline-block');
                wrapper.setCssClass('DQXSelectWrapper');
                var cmb = DocEl.Create('select', { id: this.getFullID(''), parent: wrapper });
                if (that._width)
                    cmb.addStyle('width',that._width+'px');
                if (this._hint)
                    cmb.addHint(this._hint);
                cmb.addElem(this._buildSelectContent());
                var label = DocEl.Label({ target: this.getFullID('Label') });
                label.addElem(this.myLabel);
                return label.toString() + ' ' + wrapper.toString();
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
                var item = this.getJQElement('').find(":selected");
                if (item.length>0)
                    this._selectedState = item.attr('value');
                return this._selectedState;
            }

            //Sets what item is selected
            that.modifyValue = function (newstate, preventNotify) {
                if (newstate == this.getValue()) return;
                if (!this.isState(newstate))
                    DQX.reportError('Invalid combo box state: ' + newstate);
                this._selectedState = newstate;
                this.getJQElement('').val(this._selectedState);
                if (!preventNotify)
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
        //    args.vertShift (optional) : vertical shift
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
            that._opacity = 1;
            if (args.opacity)
                that._opacity = args.opacity;

            that._smartLink = false;
            if (args.smartLink) {
                that.myBitmap = DQX.BMP('link1.png');
                that._vertShift = -2;
            }

            that._execRenderHtml = function () {
                var st = '<a id={id} TITLE="{desc2}" >'.DQXformat({ id: this.getFullID(''), desc2: that._hint });
                st += '<span style="white-space:nowrap;">'; //this trick is used to prevent a line break between the image and the text
                if (this.myBitmap) {
                    var s = '<IMG SRC="' + this.myBitmap + '" border=0 class="DQXBitmapLink" ALT="{desc1}" TITLE="{desc2}" style="position:relative;top:{shift}px;opacity:{opacity}"/>';
                    s = s.DQXformat(
                        { desc1: that.description, desc2: that._hint, shift: (-this._vertShift), opacity: this._opacity });
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




        Controls.ImageButton = function (iid, args) {
            var that = Controls.Control(iid);
            that.myBitmap = args.bitmap;
            that._hint = '';
            if (args.hint)
                that._hint = args.hint;
            that._vertShift = 0;
            if (args.vertShift)
                that._vertShift = args.vertShift;

            that._execRenderHtml = function () {
                var st = '<span id={id} TITLE="{desc2}" >'.DQXformat({ id: this.getFullID(''), desc2: that._hint });
                st += '<span style="white-space:nowrap;">'; //this trick is used to prevent a line break between the image and the text
                if (this.myBitmap) {
                    var s = '<IMG SRC="' + this.myBitmap + '" border=0 class="DQXBitmapLinkTransparent" ALT="{desc1}" TITLE="{desc2}" style="position:relative;top:{shift}px"/>';
                    s = s.DQXformat(
                        { desc1: that.description, desc2: that._hint, shift: (-this._vertShift), opacity: this._opacity });
                    st = st + s;
                }
                if (this.text) {
                    if (this.myBitmap) st += '&thinsp;';
                    st += '<span style="white-space:normal;">' + this.text + '</span>';
                }
                st += '</span>';
                st += '</span>';
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
            args.bitmap = DQX.BMP('info4.png');
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
        //    agrs.states : list of radio button items, each state of the type { id:..., name,... } (optional: disabled=true)
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
                    st += '<input type="radio" name={controlid} id={id2} value="{id}" {selected} {disabled}></input>'.DQXformat({
                        controlid: this.getFullID(''),
                        id: stateid,
                        id2: this.getFullID(stateid),
                        selected: (this.myStates[i].id == this._selectedState) ? 'checked="yes"' : '',
                        disabled: (this.myStates[i].disabled) ? 'disabled="yes"' : ''
                    });
                    st += '<label for="{id}">{title}</label>'.DQXformat({
                        id: this.getFullID(stateid),
                        title: this.myStates[i].name
                    });
                    st += "</div>";
                }
                return st;
            }

            that._execRenderHtml = function () {
                var cmb = DocEl.Div({ id: this.getFullID('') });
                cmb.addStyle('display', 'inline-block');
                parentElem=cmb;
                if (that.myLabel) {
                    var fs = DocEl.Create('fieldset',{parent:cmb});
                    fs.setCssClass('DQXFormFieldSet');
                    fs.addElem('<legend>'+that.myLabel+'</legend>');
                    parentElem = fs;
                }
                parentElem.addElem(this._buildSelectContent());
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
                var item = this.getJQElement('').find(":checked");
                if (item.length>0)
                    this._selectedState = item.attr('value');
                return this._selectedState;
            }

            that.modifyValue = function (newstate, preventNotify) {
                if (newstate == this.getValue()) return;
                if (!this.isState(newstate))
                    DQX.reportError('Invalid combo box state');
                this._selectedState = newstate;
                $.each(that.myStates, function(idx,state) {
                    if (state.id==newstate)
                        that.getJQElement(state.id).attr('checked','yes');
                    else
                        that.getJQElement(state.id).removeAttr('checked');
                })
                if (!preventNotify)
                    this._notifyChanged();
            }

            that.modifyItemEnabled = function(itemID, newState) {
                $.each(that.myStates, function(idx,state) {
                    if (state.id==itemID) {
                        state.enabled=newState;
                        if (!newState)
                            that.getJQElement(itemID).attr('disabled','yes');
                        else
                            that.getJQElement(itemID).removeAttr('disabled');
                    }
                })
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
                if (itemID != null) {
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
            that.modifyValue = function (newvalue, preventNotify) {
                if (this._activeItem != null)
                    this.getJQElement('').children('#' + this._getLineID(this._activeItem)).addClass('DQXLargeListItem').removeClass('DQXLargeListItemSelected');
                this.getJQElement('').children('#' + this._getLineID(newvalue)).removeClass('DQXLargeListItem').addClass('DQXLargeListItemSelected');
                this._activeItem = newvalue;
                if (!preventNotify)
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
        //    args.scaleDistance: value difference between indicated tick marks
        //    args.width (optional) : width of the slider
        //    args.height (optional) : height of the slider
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.ValueSlider = function (iid, args) {
            var that = Controls.Control(iid);
            that._width = 300; if ('width' in args) that._width = args.width;
            that._height = 20; if ('height' in args) that._height = args.height;
            DQX.requireMember(args, 'label');
            that._label = args.label;
            DQX.requireMember(args, 'minval');
            DQX.requireMember(args, 'maxval');
            that._minval = args.minval;
            that._maxval = args.maxval;
            if (args.scaleDistance)
                that.scaleDistance = args.scaleDistance;
            that._value = that._minval; if (args.value) that._value = args.value;
            that.digits = 0; if (args.digits) that.digits = args.digits;
            that.minIsNone = false; if (args.minIsNone) that.minIsNone = args.minIsNone;
            that._notifyOnFinished = false;
            that._drawIndicators = true; if (args.drawIndicators===false) that._drawIndicators = false;

            // Call this function to force the control to call the onChanged function only when the dragging is completed
            that.setNotifyOnFinished = function() {
                that._notifyOnFinished = true;
                return that;
            }

            that._controlExtensionList.push('Canvas');

            that._execRenderHtml = function () {
                st = '';
                st += '<div style="display:inline-block">';
                st += '<div id="{id}" style="width:{width}px">'.DQXformat({ id: this.getFullID(''), width: this._width });
                st += '<span class="SupportingText">{content}</span>'.DQXformat({ content: that._label });
                st += '<span id="{id}" style="float:right">1</span>'.DQXformat({ id: this.getFullID('Value') });
                st += "</div>";
                st += '<div><canvas id="{id}" width="{width}"  height="{height}"></canvas></div>'.DQXformat({ id: this.getFullID('Canvas'), width: this._width, height: this._height });
                st += "</div>";
                return st;
            }

            that.showValue = function () {
                if (!that.customValueMapper)
                    var txt = this._value.toFixed(this.digits);
                else
                    var txt = that.customValueMapper(this._value);
                if (this.minIsNone && (this._value == this._minval))
                    txt = 'None';
                $('#' + this.getFullID('Value')).html(txt);
            }

            that._execPostCreateHtml = function () {
                this._scroller = Scroller.HScrollBar(this.getFullID('Canvas'));
                this._scroller.drawIndicators = that._drawIndicators;
                this._scroller.myConsumer = this;
                this._scroller.zoomareafraction = 0.00001;
                if (that.scaleDistance)
                    this._scroller.setScaleDistance(that.scaleDistance);
                this._scroller.setRange(this._minval, this._maxval);
                this._scroller.setValue((this._value - this._minval) / (this._maxval - this._minval), 0.0);
                this.showValue();
                this._scroller.draw();
            };

            //Internal handlers
            that.scrollTo = function () {
                this._value = (this._scroller.rangeMin + this._scroller.scrollPos * (this._scroller.rangeMax - this._scroller.rangeMin));
                this.showValue();
                if (!that._notifyOnFinished)
                    this._notifyChanged();
            };
            that.scrollFinished = function() {
                if (that._notifyOnFinished)
                    this._notifyChanged();
            }


            //Returns the current value of the slider
            that.getValue = function () {
                if (this.minIsNone && (this._value == this._minval))
                    return null;
                else {
                    var mf = Math.pow(10,this.digits)
                    return Math.round(this._value*mf)*1.0/mf;
                }
            };

            //Modifies the current value of the slider
            that.modifyValue = function (newvalue, preventNotify) {
                if (newvalue == this.getValue()) return;
                this._value = newvalue;
                this.showValue();
                this._scroller.setValue((this._value - this._minval) / (this._maxval - this._minval), 0.02);
                this._scroller.draw();
                if (!preventNotify)
                    this._notifyChanged();
            };

            return that;
        }




        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // A file upload control
        //    args.serverUrl : url where DQXServer is running
        //
        // Based on http://blog.new-bamboo.co.uk/2010/07/30/html5-powered-ajax-file-uploads and https://github.com/newbamboo/example-ajax-upload
        // NOTE: perhaps replace by http://blueimp.github.io/jQuery-File-Upload/ , https://github.com/blueimp/jQuery-File-Upload   ?
        //
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.FileUpload = function (iid, args) {
            var that = Controls.Control(iid);
            DQX.requireMember(args, 'serverUrl');
            that._serverUrl = args.serverUrl;
            that._autoUpload=true;
            that._uploadedFileId=null;

//            that._controlExtensionList.push('Canvas');

            that._execRenderHtml = function () {

                var bt = DocEl.Div({ id: this.getFullID('') });
                if (this._hint)
                    bt.addHint(this._hint);
                bt.addStyle('display', 'inline-block');
                bt.addStyle('vertical-align', 'top');

                bt.addElem('<input id="{id}" type="file" name="filedata"/>'.DQXformat( { id:this.getFullID('input') } ));
                bt.addElem('<br>');

                var status = DocEl.Div({ id: this.getFullID('status'), parent: bt });
                status.addStyle('width','150px')
                status.addElem('<span style="color:rgb(150,150,150)">Not uploaded</span>')

/*                status.addStyle('border','1 px solid black');
                status.addStyle('background-color','rgb(20,200,255)');*/

                var st=bt.toString();
                return st;
            }


            that._execPostCreateHtml = function () {
                $('#'+this.getFullID('input')).change(function() {
                    that._uploadedFileId=null;
                    if (that._autoUpload) that._uploadFile();
                })
            };

            that._uploadFile =function() {
                that._uploadedFileId=null;
                var fileInput = document.getElementById(this.getFullID('input'));
                var file = fileInput.files[0];
                that._fileName=file.name;

                var xhr = new XMLHttpRequest();

                var onprogressHandler = function(evt) {
                    var percent = evt.loaded/evt.total*99.89;
                    var status = DocEl.Div({ });
                    status.addStyle('width','100%');
                    //status.addStyle('height','100%');
                    //status.addStyle('border','1px solid rgb(160,160,160)');
                    status.addStyle('background-color','rgb(220,220,220)');

                    var bar = DocEl.Div({ parent: status });
                    bar.addStyle('width',percent + '%');
                    //bar.addStyle('border','1px solid black');
                    bar.addStyle('background-color','rgb(150,150,255)');
                    bar.addElem(percent.toFixed(1)+'%');

                    $('#'+that.getFullID('status')).html(status.toString());
                }
                xhr.upload.addEventListener('progress', onprogressHandler, false);

                xhr.onreadystatechange = function() {
                    if (xhr.readyState == 4) {
                        that._uploadedFileId = null;
                        var keylist = JSON.parse(xhr.responseText);
                        that._uploadedFileId=keylist.filename;
                        if (that._uploadedFileId)
                            $('#'+that.getFullID('status')).html('<span style="color:rgb(0,192,0)"><b>Uploaded</b></span>');
                        else
                            $('#'+that.getFullID('status')).html('<span style="color:rgb(255,0,0)"><b>Failed</b></span>');
                        that._notifyChanged();
                    }
                }
                xhr.open('POST', that._serverUrl+'?datatype=uploadfile', true);
                xhr.send(file);
            }


            //Returns the current value of the slider
            that.getValue = function () {
                return that._uploadedFileId;
            };

            that.getFileName = function() {
                return that._fileName;
            }


            return that;
        }



        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // A color picker control
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.ColorPicker = function (iid, args) {
            var that = Controls.Control(iid);
            that.myLabel = null;
            if ('label' in args)
                that.myLabel = DQX.interpolate(args.label);
            that.colorValue = DQX.Color(0.5,0,0);
            if ('value' in args)
                that.colorValue = args.value;



            that._execRenderHtml = function () {
                var st = '';
                if (that.myLabel)
                    st += that.myLabel+'&nbsp;';
                st +=' <input type="text" id="{id}" />'.DQXformat({id: this.getFullID('')});
                return st;
            }


            that._execPostCreateHtml = function () {

                if (true) {
                    $("#"+this.getFullID('')).spectrum({
                        color: that.colorValue.toString(),
                        showPalette: true,
                        palette: ['fff', '000', 'rgb(230,0,0)', 'rgb(0,170,0)', 'rgb(80,80,255)', 'rgb(210,120,0)', 'rgb(200,0,200)'],
                        change: function(color) {
                            var rgb = color.toRgb();
                            that.colorValue = DQX.Color(rgb.r/255.0,rgb.g/255.0,rgb.b/255.0);
                            that._notifyChanged();
                        }
                    });
                }
            };

            //Returns the current value of the slider
            that.getValue = function () {
                return that.colorValue;
            };

            return that;
        }



        return Controls;
    });
