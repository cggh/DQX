﻿define(["jquery", "DQX/DocEl", "DQX/Msg"], 
    function ($, DocEl, Msg) {
    var TreeCtrl = {};
    
    ////////////////////////// A class representing a branch in the tree ///////////////////////////////////////
    
    TreeCtrl._objectBranch = function (iID, icontent) {
        this.myID = iID;
        this.content = icontent;
        this.items = []; //member items of this branch
        this.canSelect = true;
        this.myParent = null;
        this.myTree = null;
    }
    
    TreeCtrl._objectBranch.prototype.renderHtml = function () {
        return this.content.toString();
    }
    
    TreeCtrl._objectBranch.prototype.postCreateHtml = function () {
    }
    
    
    TreeCtrl._objectBranch.prototype.getItems = function () {
        return this.items;
    }
    
    TreeCtrl._objectBranch.prototype.addItem = function (item) {
        this.items.push(item);
        item.myParent = this;
        if (this.myTree)
            this.myTree._addItemSub(this);
        return item;
    }
    
    TreeCtrl._objectBranch.prototype.setTree = function (tree) {
        if ((this.myTree != null) && (this.myTree!==tree))
            throw 'Item is already attached to a tree';
        this.myTree = tree;
        this._setTreeSub(tree);
    }
    
    TreeCtrl._objectBranch.prototype._setTreeSub = function (tree) { }
    
    
    //The creator function
    TreeCtrl.Branch = function (iID,icontent) {
        return new TreeCtrl._objectBranch(iID,icontent);
    }
    
    
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    TreeCtrl.Control = function (icontrol) {
        var that = TreeCtrl.Branch(icontrol.getID(), '');
        that.control = icontrol;
        that.canSelect = false;
    
        that._setTreeSub = function (tree) {
            this.control.setContextID(tree.myID);
        }
    
        that.renderHtml = function (iparentID) {
            return this.control.renderHtml();
        }
    
        that.postCreateHtml = function () {
            return this.control.postCreateHtml();
        }
    
        return that;
    }
    
    
    
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    TreeCtrl.Tree = function (iid, idivid) {
        var that = {};
        that.myID = iid;
        that.myDivID = idivid;
        that.root = TreeCtrl.Branch(); //tree structured container of the items
        that.root.myTree = that;
        that._itemList = [];
        that._itemMap = {}; //map structured container of the items
        that._activeItem = '';
    
        that.getActiveItem = function () {
            return that._activeItem;
        }
    
        that.findItem = function (id) {
            return this._itemMap[id];
        }
    
        that._addItemSub = function (item) {
            item.setTree(this);
            if (item.myID in this._itemMap) {
                if (this._itemMap[item.myID] !== item)
                    throw 'Tree item ID "{id}" is already used'.DQXformat({ id: item.myID });
            }
            else {
                this._itemList.push(item);
                this._itemMap[item.myID] = item;
            }
            var subItems = item.getItems();
            for (var i = 0; i < subItems.length; i++)
                this._addItemSub(subItems[i]);
        }
    
    
    
        that._getDivIDButton = function (id) {
            return this.myID + '_DQXBt_' + id;
        }
        that._getDivIDItem = function (id) {
            return this.myID + '_DQXIt_' + id;
        }
    
        that._createButtonHtml = function (collapsed) {
            return '<IMG SRC="Bitmaps/' + (collapsed ? 'morelines' : 'lesslines') + '.png" border=0 ALT="" TITLE="" class="DQXTreeButtonImage" style="float:left;padding-right:6px">';
        }
    
        that._renderSub = function (parentDiv, item, level) {
    
            var subItems = item.getItems();
            var hasSubItems = subItems.length > 0;
    
            var titledv = DocEl.Div({ parent: parentDiv, id: this._getDivIDItem(item.myID) });
            if (item.canSelect)
                titledv.setCssClass('DQXTreeItem');
            else
                titledv.setCssClass('DQXTreeItemNoSelect');
    
            if (hasSubItems) {
                var buttondv = DocEl.Div({ parent: titledv, id: this._getDivIDButton(item.myID) });
                buttondv.setCssClass("DQXTreeButton");
                buttondv.addElem(this._createButtonHtml(item.collapsed));
            }
    
            contentstr = item.renderHtml(this.myID)
            titledv.addElem(contentstr);
    
    
            if (hasSubItems) {
                var descdv = DocEl.Div({ parent: parentDiv, id: this.myID + '_DQXSub_' + item.myID });
                descdv.addStyle('padding-left', '12px');
                descdv.addStyle('padding-bottom', '4px');
                var descdv2 = DocEl.Div({ parent: descdv });
                descdv2.addStyle('padding-left', '17px');
                descdv2.addStyle('border-width', '0px');
                descdv2.addStyle('border-color', 'rgb(128,128,128)');
                descdv2.addStyle('border-left-width', '1px');
                //descdv2.addStyle('border-bottom-width', '1px');
                //descdv2.addStyle('border-top-width', '1px');
                descdv2.addStyle('border-style', 'solid');
                //descdv2.addStyle('border-top-left-radius', '8px');
                descdv2.addStyle('border-bottom-left-radius', '6px');
                var gr = 0.82 - 0.07 * level;
                //descdv2.setBackgroundColor(DQX.Color(gr, gr, gr));
                for (var i = 0; i < subItems.length; i++) {
                    this._renderSub(descdv2, subItems[i], level + 1);
                }
            }
        }
    
        that.render = function () {
            var dv = DocEl.Div({ id: 'tree' });
            //dv.setBackgroundColor(DQX.Color(1, 0, 0));
            dv.addStyle('padding', '1px');
            var subItems = this.root.getItems();
            for (var i = 0; i < subItems.length; i++)
                this._renderSub(dv, subItems[i], 0);
            $('#' + this.myDivID).html(dv.toString());
    
            for (var i = 0; i < this._itemList.length; i++)
                this._itemList[i].postCreateHtml();
    
            $('#' + this.myDivID).find('.DQXTreeButton').click($.proxy(that._clickTreeButton, that));
            $('#' + this.myDivID).find('.DQXTreeItem').mousedown($.proxy(that._clickTreeItem, that));
        }
    
        that.setActiveItem = function (id, noEvent) {
            if (this._activeItem)
                $('#' + this.myDivID).find('#' + this._getDivIDItem(this._activeItem)).removeClass('DQXTreeItemSelected');
            $('#' + this.myDivID).find('#' + this._getDivIDItem(id)).addClass('DQXTreeItemSelected');
            this._activeItem = id;
            if (!noEvent)
                Msg.send({ type: 'SelectItem', id: this.myID }, this._activeItem);
        }
    
        that.scrollActiveInView = function () {
            //        $('#' + this.myDivID).scrollTo($('#' + this.myDivID).children('#' + this._activeItem));
        }
    
        that._clickTreeItem = function (ev) {
            var id = ev.target.id;
            if (id == '')
                id = $(ev.target).parent().attr('id');
            if (id) {
                id = id.split('_DQXIt_')[1];
                this.setActiveItem(id);
            }
        }
    
        that._clickTreeButton = function (ev) {
            var id = ev.target.id;
            if (id == '')
                id = $(ev.target).parent().attr('id');
            //        this.setActiveItem(ev.target.id);
            id = id.split('_DQXBt_')[1];
            var node = this.findItem(id);
            node.collapsed = !node.collapsed;
    
            $('#' + this._getDivIDButton(id)).html(this._createButtonHtml(node.collapsed));
    
            var subdiv = $('#' + this.myID + '_DQXSub_' + id);
            if (node.collapsed)
                subdiv.slideUp(250);
            else
                subdiv.slideDown(250);
    
        }
    
        that.handleResize = function () {
        }
    
    
        return that;
    }
    return TreeCtrl;
    });
