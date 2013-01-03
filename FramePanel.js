define(["jquery", "DQX/DocEl", "DQX/Msg", "jquery_scrollTo"],
    function ($, DocEl, Msg) {
        return function (iid, iParentRef) {
            var that = {};
            that.myID = iid;
            if (DQX.hasMember(iParentRef, 'getClientDivID')) {
                that.myParentFrame = iParentRef;
                that.myDivID = iParentRef.getClientDivID();
                iParentRef.setClientObject(that);
            }
            if (!that.myDivID)//assume that the parent reference is simply the ID of a div
                that.myDivID = iParentRef;
            if (that.myDivID.length == 0)
                throw "Invalid parent reference";
            if ($('#' + that.myDivID).length == 0) 
                throw "Invalid Gui component " + iid;

            that.getDivID = function () { return this.myDivID; }

            that.getSubId = function (ext) { return this.myDivID + ext; }

            that.getRootElem = function () { return $('#' + that.myDivID); }

            that.handleResize = function () {
                if ('onResize' in that) {
                    if ((that.getRootElem().width() > 5) && (that.getRootElem().height() > 5))
                        that.onResize();
                }
            }

            return that;
        };
    });