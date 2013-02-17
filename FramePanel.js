/************************************************************************************************************************************
*************************************************************************************************************************************



*************************************************************************************************************************************
*************************************************************************************************************************************/

define([DQXSCJQ(), DQXSC("DocEl"), DQXSC("Msg")],
    function ($, DocEl, Msg) {

        ////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Creates a FramePanel base class
        // A frame panel is a GUI component that is placed as an endpoint in a frame (Framework.FrameFinal)
        // Example GUI components that are derived from this:
        // QueryTable.Panel, ChannelPlotter.Panel, GMaps.GMap, QueryBuilder.Panel, FrameList, FreameTree
        //
        // iParentRef can be a Framework.Frame object, or a string containing the id of the html div that will hold this panel
        ////////////////////////////////////////////////////////////////////////////////////////////////////////


        return function (iParentRef) {
            var that = {};

            that.getID = function () { return this.myID; }

            if (DQX.hasMember(iParentRef, 'getClientDivID')) {//assume that the parent reference is a Framework.Frame object
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


            that.getDivID = function () { return this.myDivID; }

            that.getSubId = function (ext) { return this.myDivID + ext; }

            that.getRootElem = function () { return $('#' + that.myDivID); }

            //Used internally by the framework
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

            //Used internally by the framework
            that.execPostInitialise = function () {
                if (this._onPostInitialise)
                    this._onPostInitialise();
            }

            //Call this function to provide a function that will be called the first time this panel appears, after the html has been created
            that.setPostInitialiseHandler = function (handler) {
                this._onPostInitialise = handler;
            }

            return that;
        };
    });