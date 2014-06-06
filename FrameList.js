// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

﻿/************************************************************************************************************************************
*************************************************************************************************************************************

A FramePanel that implements a list

The list will broadcast a SelectItem message when a new item in the list was selected

*************************************************************************************************************************************
*************************************************************************************************************************************/

define(["jquery", "DQX/Utils", "DQX/DocEl", "DQX/Msg", "DQX/FramePanel"],
    function ($, DQX, DocEl, Msg, FramePanel) {
        return function (iid, iParentRef) {
            var that = FramePanel(iid, iParentRef);
            that.myFilterDivID = that.getDivID() + '_filter';
            that.myListDivID = that.getDivID() + '_lst';
            that.items = [];
            that._activeItem = '';
            that._filterText = null;
            that._isCreated = false;
            that._hasFilter = false;
            that._template = null;
            that._filterTemplateComponentList = [];

            //Call this function to set a template for rendering each list item.
            //When a template is set, the 'content' property of each list item should be an object with tokens that will be interpolated in the template
            that.setTemplate = function (itemplate) {
                that._template = itemplate;
                return that;
            }

            that.setOnItemHighlighted = function(handler) {
                that._onItemHighlighted = handler;
            }

            //Call this function to make the list have a search function that shows string matches
            //Optionally, for template-based item rendering, a list of template components that should be searched for can be provided
            that.setHasFilter = function (ifilterTemplateComponentList) {
                that._hasFilter = true;
                if (ifilterTemplateComponentList)
                    that._filterTemplateComponentList = ifilterTemplateComponentList;
                return that;
            }

            //Sets the list items
            // * iItems: list of object with the following properties:
            //       - id :  internal identifier for the item
            //       - content : 
            //           . without template: displayed text
            //           . with template: object with token-value pairs
            //       - icon : bitmap to show next to the list item
            // * newactiveitem (optional) : identifier of the new selected item
            that.setItems = function (iItems, newactiveitem) {
                this.items = [];
                var activefound = false;
                for (var i = 0; i < iItems.length; i++) {
                    this.items.push({ id: iItems[i].id, content: iItems[i].content, icon: iItems[i].icon });
                    if (iItems[i].id == this._activeItem) activefound = true;
                }
                if (!activefound) {
                    if (iItems.length > 0) this._activeItem = iItems[0].id;
                    else this._activeItem = '';
                }
                if (typeof newactiveitem != 'undefined')
                    this._activeItem = newactiveitem;
            }



            //Renders to the DOM
            that.render = function () {
                if (!this._isCreated) {//initialise: render the required elements
                    var htmlContent = '';
                    var topOffset = 0;
                    if (this._hasFilter) {
                        topOffset = 30;
                        var editDiv = DocEl.Div({});
                        editDiv.addStyle('padding-left', '30px');
                        editDiv.addStyle('padding-right', '12px');
                        editDiv.addStyle('padding-top', '3px');
                        editDiv.addStyle('padding-bottom', '5px');
                        editDiv.addStyle('background-color', 'rgb(210,210,210)');
                        editDiv.addElem('<IMG SRC="' + DQX.BMP('magnif2.png') + '" border=0 ALT="" TITLE="" style="position:absolute;left:3px;top:2px">');
                        var edit = DocEl.Edit('', { id: this.myFilterDivID, parent: editDiv, placeHolder: 'Enter search text to filter items' });
                        edit.addStyle('width', '100%');
                        edit.addStyle('height', '18px');
                        edit.addStyle('border', '1px solid rgb(170,170,170)');
                        htmlContent += editDiv.toString();
                    }
                    var divList = DocEl.Div({ id: this.myListDivID });
                    divList.setCssClass('DQXLargeList');
                    divList.makeAutoVerticalScroller(true);
                    divList.addStyle('position', 'absolute');
                    if (this._hasFilter)
                        divList.addStyle('top', topOffset + 'px');
                    else
                        divList.addStyle('top', '0px');
                    divList.addStyle('bottom', '0px');
                    divList.addStyle('left', '0px');
                    divList.addStyle('right', '0px');
                    htmlContent += divList.toString();


                    $('#' + this.getDivID()).html(htmlContent);
                    if (this._hasFilter)
                        $('#' + this.myFilterDivID).bind("propertychange keyup input paste", $.proxy(that._onChangeFilter, that));
                    this._isCreated = true;

                    this.scrollHelper = DQX.scrollHelper($('#' + this.myListDivID));
                }

                var lst1 = '';
                var lst2 = '';
                for (var i = 0; i < this.items.length; i++) {
                    var line = DocEl.Div();
                    line.setID(this.items[i].id);
                    if (this._activeItem == this.items[i].id)
                        line.setCssClass('DQXLargeListItemSelected');
                    else
                        line.setCssClass('DQXLargeListItem');
                    if (this.items[i].icon) {
                        line.addElem('<IMG SRC="' + this.items[i].icon + '" border=0 ALT="" TITLE="" style="float:left;padding-right:6px">');
                    }
                    var matching = !this._filterText;
                    if (!this._template) {//without template
                        if (this._filterText)
                            matching = (this.items[i].content.toUpperCase().indexOf(this._filterText) >= 0);
                        var content = this.items[i].content;
                        if (this._filterText)
                            content = DQX.highlightText(content, this._filterText);
                        line.addElem(content);
                    }
                    else {//with template
                        var theContent = $.extend(true, {}, that.items[i].content);
                        if (this._filterText) {
                            $.each(this._filterTemplateComponentList, function (idx, filterComponent) {
                                if (that.items[i].content[filterComponent].toUpperCase().indexOf(that._filterText) >= 0)
                                    matching = true;
                                theContent[filterComponent] = DQX.highlightText(theContent[filterComponent], that._filterText);
                            })
                        }
                        var content = this._template.DQXformat(theContent);
                        line.addElem(content);
                    }
                    if (matching)
                        lst1 += line.toString();
                    else {
                        line.addStyle('color', 'rgb(130,130,130)');
                        lst2 += line.toString();
                    }
                }
                $('#' + this.myListDivID).html(lst1 + lst2);
                $('#' + this.myListDivID).children().click(that._clickItem);
                that.scrollHelper.update();
            }

            that._onChangeFilter = function () {
                this._filterText = $('#' + this.myFilterDivID).val().toUpperCase();
                this.render();
                $('#' + this.myListDivID).scrollTop(0);
            }

            //Sets the new highlighted item, providing the list item id
            //If noEvent is true, this will not generate a selection changed event
            that.setActiveItem = function (id, noEvent) {
                if (this._activeItem)
                    $('#' + this.myListDivID).children('#' + this._activeItem).addClass('DQXLargeListItem').removeClass('DQXLargeListItemSelected');
                $('#' + this.myListDivID).children('#' + id).removeClass('DQXLargeListItem').addClass('DQXLargeListItemSelected');
                this._activeItem = id;
                if (!noEvent) {
                    Msg.broadcast({ type: 'SelectItem', id: this.myID }, this._activeItem);
                    if (that._onItemHighlighted)
                        that._onItemHighlighted(that._activeItem)
                }
            }

            //Automatically scroll the highlighted item in the visible area
            that.scrollActiveInView = function () {
                if (this._activeItem) {
                    var offset = $('#' + this.myListDivID).children('#' + this._activeItem).position().top;
                    $('#' + this.myListDivID).scrollTop(offset);
                }
            }

            that._clickItem = function (ev) {
                var elem = $(this);
                var id = elem.attr('id');
                that.setActiveItem(id);
            }

            that.handleResize = function () {
                if (that.scrollHelper)
                    that.scrollHelper.update();
            }

            //Returns the currently highlighted item in the list
            that.getActiveItem = function () {
                return this._activeItem;
            }


            return that;
        };
    });