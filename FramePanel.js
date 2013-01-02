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

            that.getDivID = function () { return this.myDivID; }

            return that;
        };
    });