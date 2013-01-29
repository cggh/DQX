define([DQXSCJQ(), DQXSC("DocEl"), DQXSC("Msg")],
    function ($, DocEl, Msg) {
        return function (iParentRef) {
            var that = {};
            if (DQX.hasMember(iParentRef, 'getClientDivID')) {
                that.myParentFrame = iParentRef;
                that.myDivID = iParentRef.getClientDivID();
                iParentRef.setClientObject(that);
            }
            if (!that.myDivID)//assume that the parent reference is simply the ID of a div
                that.myDivID = iParentRef;
            if (that.myDivID.length == 0)
                DQX.reportError("Invalid parent reference");
            if ($('#' + that.myDivID).length == 0)
                DQX.reportError("Invalid Gui component " + that.myDivID);
            that.myID = that.myDivID;

            that.setID = function (iid) {
                this.myID = iid;
                return this;
            }

            that.getID = function () { return this.myID; }

            that.getDivID = function () { return this.myDivID; }

            that.getSubId = function (ext) { return this.myDivID + ext; }

            that.getRootElem = function () { return $('#' + that.myDivID); }

            that.handleResize = function () {
                if ('onResize' in that) {
                    if ((that.getRootElem().width() > 5) && (that.getRootElem().height() > 5)) {
                        if ((that._lastResizedSizeX != that.getRootElem().width()) || (that._lastResizedSizeY != that.getRootElem().height())) {
                            that.onResize();
                            that._lastResizedSizeX = that.getRootElem().width();
                            that._lastResizedSizeY = that.getRootElem().height();
                        }
                    }
                }
            }

            return that;
        };
    });