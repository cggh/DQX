﻿
DQX.Controls = {};



//////////////////////////////////////////////////////////////////////////////////////////////

DQX.Controls.CompoundHor = function (icontrols) {
    var that = {};
    that._controls = icontrols;

    that.clear = function () {
        that._controls = [];
    }

    that.append = function (item) {
        that._controls.push(item);
    }

    that.getID = function () {
        if (this._controls.length == 0) throw 'Compound control has no components';
        return this._controls[0].getID(id);
    }

    that.setContextID = function (id) {
        for (var i = 0; i < this._controls.length; i++)
            this._controls[i].setContextID(id);
    }


    that.modifyEnabled = function (newstate) {
        for (var i = 0; i < this._controls.length; i++)
            this._controls[i].modifyEnabled(id);
    }


    that.renderHtml = function () {
        var st = '';
        for (var i = 0; i < this._controls.length; i++)
            st += this._controls[i].renderHtml();
        return st;
    }

    that.postCreateHtml = function () {
        for (var i = 0; i < this._controls.length; i++)
            this._controls[i].postCreateHtml(id);
    }

    return that;
}



//////////////////////////////////////////////////////////////////////////////////////////////

DQX.Controls.Label = function (icontent) {
    var that = {};
    that._content = icontent;

    that.getID = function () { return ''; }

    that.setContextID = function (id) {
    }


    that.modifyEnabled = function (newstate) {
    }


    that.renderHtml = function () {
        return this._content;
    }

    that.postCreateHtml = function () {
    }

    return that;
}



//////////////////////////////////////////////////////////////////////////////////////////////

DQX.Controls.Control = function (iid) {
    var that = {};
    that.myID = iid;
    that.myContextID = '';
    that._enabled = true;
    that._controlExtensionList = [];

    that.getID = function () { return this.myID; }

    that.getFullID = function (extension) {
        return this.myContextID + this.myID + extension;
    }

    that._reactModifyValue = function (scope, value) {
        if (scope.contextid == this.myContextID) {
            this.modifyValue(value);
        }
    }
    DQX.Msg.listen('ModifyValue'+that.getFullID(''),{ type: 'CtrlModifyValue', id: that.myID }, $.proxy(that._reactModifyValue, that));


    that._reactModifyEnabled = function (scope, value) {
        if (scope.contextid == this.myContextID) {
            this.modifyEnabled(value);
        }
    }
    DQX.Msg.listen('ModifyEnabled' + that.getFullID(), { type: 'CtrlModifyEnabled', id: that.myID }, $.proxy(that._reactModifyEnabled, that));


    that.setContextID = function (id) {
        if ((this.myContextID != '') && (this.myContextID !== id))
            throw 'Control context id is already set';
        this.myContextID = id;
    }



    that.getJQElement = function (extension) {
        return $('#' + this.getFullID(extension));
    }

    that.modifyEnabled = function (newstate) {
        this._enabled = newstate;
        for (var i = 0; i < this._controlExtensionList.length; i++) {
            if (this._enabled)
                this.getJQElement(this._controlExtensionList[i]).removeAttr('disabled');
            else
                this.getJQElement(this._controlExtensionList[i]).attr("disabled", "disabled");
        }
    }

    that._notifyChanged = function () {
        DQX.Msg.send({ type: 'CtrlValueChanged', id: this.myID, contextid: this.myContextID }, this);
    }



    return that;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

DQX.Controls.Check = function (iid, args) {
    var that = DQX.Controls.Control(iid);
    that.myLabel = args.label;
    that.isChecked = false;
    if ('value' in args)
        that.isChecked = args.value;

    that._controlExtensionList.push('');

    that.renderHtml = function () {
        var chk = DQX.DocEl.Check({ id: this.getFullID('') });
        if (that.isChecked)
            chk.addAttribute('checked', "checked");
        var label = DQX.DocEl.Label({ target: this.getFullID('') });
        label.addElem(this.myLabel);
        return chk.toString() + label.toString();
    }

    that.postCreateHtml = function () {
        var target = 'change.controlevent';
        this.getJQElement('').unbind(target).bind(target,$.proxy(that._onChange, that));
    }

    that._onChange = function () {
        var lastval = this.isChecked;
        var newval = this.getValue();
        if (newval != lastval) {
            this.isChecked = newval;
            this._notifyChanged();
        }
    }

    that.getValue = function () {
        this.isChecked = this.getJQElement('').is(':checked');
        return this.isChecked;
    }

    that.modifyValue = function (newstate) {
        if (newstate == this.getValue()) return;
        this.isChecked = newstate;
        if (this.isChecked)
            this.getJQElement('').attr('checked', 'checked');
        else
            this.getJQElement('').removeAttr('checked');
        this._notifyChanged();
    }

    return that;
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

DQX.Controls.Combo = function (iid, args) {
    var that = DQX.Controls.Control(iid);
    that.myLabel = args.label;
    that.myStates = args.states;
    that._selectedState = '';
    if ('value' in args)
        that._selectedState = args.value;

    that._controlExtensionList.push('');

    that._buildStatesMap = function () {
        this._statesMap = {};
        for (var i = 0; i < this.myStates.length; i++)
            this._statesMap[this.myStates[i].id] = this.myStates[i].name;
    }
    that._buildStatesMap();

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

    that.renderHtml = function () {
        var cmb = DQX.DocEl.Create('select', { id: this.getFullID('') });
        cmb.addElem(this._buildSelectContent());
        var label = DQX.DocEl.Label({ target: this.getFullID('Label') });
        label.addElem(this.myLabel);
        return label.toString() + ' ' + cmb.toString();
    }

    that.postCreateHtml = function () {
        var target = 'change.controlevent';
        this.getJQElement('').unbind(target).bind(target,$.proxy(that._onChange, that));
    }

    that._onChange = function () {
        this._selectedState = this.getValue();
        this._notifyChanged();
    }

    that.getValue = function () {
        this._selectedState = this.getJQElement('').find(":selected").attr('value');
        return this._selectedState;
    }

    that.modifyValue = function (newstate) {
        if (newstate == this.getValue()) return;
        if (!this.isState(newstate))
            throw 'Invalid combo box state';
        this._selectedState = newstate;
        this.getJQElement('').val(this._selectedState);
        this._notifyChanged();
    }


    return that;
}



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

DQX.Controls.LinkButton = function (iid, args) {
    var that = DQX.Controls.Control(iid);
    that.myBitmap = args.bitmap;
    that.description = '';
    if ('description' in args)
        that.description = args.description;

    that._controlExtensionList.push('');


    that.renderHtml = function () {
        var st = '<IMG id="{id}" SRC="' + this.myBitmap + '" border=0 class="DQXBitmapLink" ALT="{desc1}" TITLE="{desc2}">';
        st = st.DQXformat(
            { id: this.getFullID(''), desc1: that.description, desc2: that.description });
        return st;
    }

    that.postCreateHtml = function () {
        var target = 'mousedown.controlevent';
        this.getJQElement('').unbind(target).bind(target, $.proxy(that._onClick, that));
    }

    that._onClick = function () {
        DQX.Msg.send({ type: 'CtrlClicked', id: this.myID, contextid: this.myContextID }, this);
    }

    that.getValue = function () {
        return "";
    }

    that.modifyValue = function (newstate) {
    }


    return that;
}
