

///////////////////////////////////////////////////////////////////////////////////////////////

DQX.Framework.List = function (iid, idivid) {
    var that = {};
    that.myID = iid;
    that.myDivID = idivid;
    that.items = [];
    that._activeItem = '';

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

    that.render = function () {
        var lst = '';
        for (var i = 0; i < this.items.length; i++) {
            var line = DQX.DocEl.Div();
            line.setID(this.items[i].id);
            if (this._activeItem == this.items[i].id)
                line.setCssClass('DQXLargeListItemSelected');
            else
                line.setCssClass('DQXLargeListItem');
            if (this.items[i].icon) {
                line.addElem('<IMG SRC="' + this.items[i].icon + '" border=0 ALT="" TITLE="" style="float:left;padding-right:6px">');
            }
            line.addElem(this.items[i].content);
            lst += line.toString();
        }
        $('#' + this.myDivID).html(lst);

        $('#' + this.myDivID).children().click($.proxy(that._clickItem, that));
    }

    that.setActiveItem = function (id, noEvent) {
        if (this._activeItem)
            $('#' + this.myDivID).children('#' + this._activeItem).addClass('DQXLargeListItem').removeClass('DQXLargeListItemSelected');
        $('#' + this.myDivID).children('#' + id).removeClass('DQXLargeListItem').addClass('DQXLargeListItemSelected');
        this._activeItem = id;
        if (!noEvent)
            DQX.Msg.send({ type: 'SelectItem', id: this.myID }, this._activeItem);
    }

    that.scrollActiveInView = function () {
        $('#' + this.myDivID).scrollTo($('#' + this.myDivID).children('#' + this._activeItem));
    }

    that._clickItem = function (ev) {
        var id = ev.target.id;
        if (id == '')
            id = $(ev.target).parent().attr('id');
        this.setActiveItem(id);
    }

    that.handleResize = function () {
    }


    ////////////////////////

    that.getActiveItem = function () {
        return this._activeItem;
    }


    return that;
}