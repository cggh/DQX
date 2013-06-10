/************************************************************************************************************************************
*************************************************************************************************************************************

A FramePanel that implements a tree

The tree will broadcast a SelectItem message when a new item in the tree was selected

NOTE: TreeCtrl.Tree.root represents the singe root item of the tree
Branches can be added to the root by calling addItem on this root item.


*************************************************************************************************************************************
*************************************************************************************************************************************/

define(["jquery", "DQX/Utils", "DQX/DocEl", "DQX/Msg", "DQX/FramePanel"],
    function ($, DQX, DocEl, Msg, FramePanel) {
        var TreeCtrl = {};

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // A class representing a branch in the tree
        //   * iID: identifier of the branch
        //   * icontent: text to display
        // NOTE: Use the creator function TreeCtrl.Branch to create a branch
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        TreeCtrl._objectBranch = function (iID, icontent) {
            this.myID = iID;
            this.content = icontent;
            this.items = []; //member items of this branch
            this._canSelect = true;
            this.myParent = null;
            this.myTree = null;
            this._collapsed = false;
        }

        //determine whether or not the branch can be selected by the user
        TreeCtrl._objectBranch.prototype.setCanSelect = function (status) {
            this._canSelect = status;
            return this;
        }

        //determine whether or not the branch is collapsed
        TreeCtrl._objectBranch.prototype.setCollapsed = function (status) {
            this._collapsed = status;
            return this;
        }

        //determine whether or not the branch can be selected by the user
        TreeCtrl._objectBranch.prototype.setCssClass = function (clss) {
            this._cssClass = clss;
            return this;
        }

        //Internal
        TreeCtrl._objectBranch.prototype.renderHtml = function () {
            return DQX.interpolate(this.content.toString());
        }

        //Internal
        TreeCtrl._objectBranch.prototype.postCreateHtml = function () {
        }


        //Return the child members of this branch
        TreeCtrl._objectBranch.prototype.getItems = function () {
            return this.items;
        }

        //Add a new child to this branch
        TreeCtrl._objectBranch.prototype.addItem = function (item) {
            if (!(item instanceof TreeCtrl._objectBranch)) DQX.reportError("Invalid type for branch member");
            this.items.push(item);
            item.myParent = this;
            if (this.myTree)
                this.myTree._addItemSub(this);
            return item;
        }

        //Internal
        TreeCtrl._objectBranch.prototype.setTree = function (tree) {
            if ((this.myTree != null) && (this.myTree !== tree))
                DQX.reportError('Item is already attached to a tree');
            this.myTree = tree;
            this._setTreeSub(tree);
        }

        TreeCtrl._objectBranch.prototype._setTreeSub = function (tree) { }


        //The creator function. Use this function to create a tree branch
        TreeCtrl.Branch = function (iID, icontent) {
            return new TreeCtrl._objectBranch(iID, icontent);
        }


        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Encapsulates a form control into a tree item
        // This creates a tree branch that contains a UI widget as defined in Controls.
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        TreeCtrl.Control = function (icontrol) {
            var that = TreeCtrl.Branch(icontrol.getID(), '');
            that.control = icontrol;
            that._canSelect = false;

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

        TreeCtrl.Tree = function (iid, iParentRef) {
            var that = FramePanel(iid, iParentRef);
            that.root = TreeCtrl.Branch(); //tree structured container of the items
            that.root.myTree = that;
            that._itemList = [];
            that._itemMap = {}; //map structured container of the items
            that._activeItem = '';

            //Return the highlighted item in the tree
            that.getActiveItem = function () {
                return that._activeItem;
            }

            //Find a tree item by its identifier
            that.findItem = function (id) {
                return this._itemMap[id];
            }

            that._addItemSub = function (item) {
                item.setTree(this);
                if (item.myID in this._itemMap) {
                    if (this._itemMap[item.myID] !== item)
                        DQX.reportError('Tree item ID "{id}" is already used'.DQXformat({ id: item.myID }));
                }
                else {
                    this._itemList.push(item);
                    this._itemMap[item.myID] = item;
                }
                var subItems = item.getItems();
                for (var i = 0; i < subItems.length; i++)
                    this._addItemSub(subItems[i]);
            }



            that._getDivIDButton = function (id) { return this.myID + '_DQXBt_' + id; }
            that._getDivIDItem = function (id) { return this.myID + '_DQXIt_' + id; }

            that._createButtonHtml = function (_collapsed) {
                return '<IMG SRC="' + DQX.BMP(_collapsed ? 'morelines.png' : 'lesslines.png') + '" border=0 ALT="" TITLE="" class="DQXTreeButtonImage" style="float:left;padding-right:6px">';
            }

            that._renderSub = function (parentDiv, item, level) {

                var subItems = item.getItems();
                var hasSubItems = subItems.length > 0;

                var titledv = DocEl.Div({ parent: parentDiv, id: this._getDivIDItem(item.myID) });
                if (item._canSelect)
                    titledv.setCssClass('DQXTreeItem');
                else
                    titledv.setCssClass('DQXTreeItemNoSelect');
                if (item._cssClass)
                    titledv.setCssClass(item._cssClass);

                if (hasSubItems) {
                    var buttondv = DocEl.Div({ parent: titledv, id: this._getDivIDButton(item.myID) });
                    buttondv.setCssClass("DQXTreeButton");
                    buttondv.addElem(this._createButtonHtml(item._collapsed));
                }

                contentstr = item.renderHtml(this.myID)
                titledv.addElem(contentstr);


                if (hasSubItems) {
                    var descdv = DocEl.Div({ parent: parentDiv, id: this.myID + '_DQXSub_' + item.myID });
                    if (item._collapsed)
                        descdv.addStyle('display', 'none');
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

            //Render the panel to the DOM tree
            that.render = function () {
                var dv = DocEl.Div({ id: 'tree' });
                dv.setCssClass('DQXTree');
                dv.addStyle('padding', '1px');
                var subItems = this.root.getItems();
                for (var i = 0; i < subItems.length; i++)
                    this._renderSub(dv, subItems[i], 0);
                $('#' + this.getDivID()).html(dv.toString());

                for (var i = 0; i < this._itemList.length; i++)
                    this._itemList[i].postCreateHtml();

                $('#' + this.getDivID()).find('.DQXTreeButton').click($.proxy(that._clickTreeButton, that));
                $('#' + this.getDivID()).find('.DQXTreeItem').click(that._clickTreeItem);
            }

            // Specify the new highlighted item in the try, by its identifier
            // if noEvent is true, not notification message will be sent
            that.setActiveItem = function (id, noEvent) {
                if (this._activeItem)
                    $('#' + this.getDivID()).find('#' + this._getDivIDItem(this._activeItem)).removeClass('DQXTreeItemSelected');
                $('#' + this.getDivID()).find('#' + this._getDivIDItem(id)).addClass('DQXTreeItemSelected');
                this._activeItem = id;
                if (!noEvent)
                    Msg.broadcast({ type: 'SelectItem', id: this.myID }, this._activeItem);
            }

            //Automatically scroll the highlighted item in the visible area
            that.scrollActiveInView = function () {
                var offset = $('#' + this.getDivID()).children('#' + this._activeItem);
                $('#' + this.getDivID()).scrollTop(offset);
            }

            that._clickTreeItem = function (ev) {
                var id = $(this).attr('id');
                if (id) {
                    id = id.split('_DQXIt_')[1];
                    that.setActiveItem(id);
                }
            }

            that._clickTreeButton = function (ev) {
                var id = ev.target.id;
                if (id == '')
                    id = $(ev.target).parent().attr('id');
                //        this.setActiveItem(ev.target.id);
                id = id.split('_DQXBt_')[1];
                var node = this.findItem(id);
                node._collapsed = !node._collapsed;

                $('#' + this._getDivIDButton(id)).html(this._createButtonHtml(node._collapsed));

                var subdiv = $('#' + this.myID + '_DQXSub_' + id);
                if (node._collapsed)
                    subdiv.slideUp(250);
                else
                    subdiv.slideDown(250);

            }

            that.handleResize = function () {
            }

            $('#' + that.getDivID()).addClass('DQXTree');

            return that;
        }
        return TreeCtrl;
    });
