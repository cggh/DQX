// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

/************************************************************************************************************************************
*************************************************************************************************************************************

This class provides management for the concept of history in a single-page web application.
It tracks a number of views (see Framework.ViewSet), and each view can have a number of state keys by itself


*************************************************************************************************************************************
*************************************************************************************************************************************/

define(["jquery", "DQX/Msg"],
    function ($, Msg) {
        var HistoryManager = {

            _callBackChangeState: null,
            stateKeys: null,
            views: [],
            viewsMap: {},

            //Call this function to add a new view to the manager
            addView: function (view) {
                HistoryManager.views.push(view);
                if (view.getStateID()) {
                    if (view.getStateID() in HistoryManager.viewsMap)
                        DQX.reportError("Duplicate view state id");
                    HistoryManager.viewsMap[view.getStateID()] = view;
                }
            },

            //Call this function to specify a handler that will be called each time the state changes
            setCallBackChangeState: function (handler) {
                this._callBackChangeState = handler;
            },

            //Call this function to initialise the first view
            init: function () {
                HistoryManager._onChanged();
            },

            //Internal: actualise the application status
            updateState: function () {
                //NOTE: the code below is not needed anymore, as a page reload can now automatically show the right view
/*                if ((!$.isEmptyObject(this.stateKeys)) && (!this.started)) {//do something sensible when the reload was hit on a page different from the start page
                    this.started = true;
                    this.setState({});
                    return;
                }*/
                if ((!this.stateKeys) || ($.isEmptyObject(this.stateKeys))) {//do something sensible when no state is provided
                    if (!this.viewsMap['start']) {
                        return;
                        DQX.reportError('No start view provided');
                    }
                    this.viewsMap['start'].activateState(this.stateKeys);
                    return;
                }
                var view = null;
                for (var viewNr = 0; viewNr < this.views.length; viewNr++) {
                    if (this.views[viewNr].getStateID() in this.stateKeys) {
                        if (view != null)
                            DQX.reportError("Duplicate applicable view");
                        view = this.views[viewNr];
                    }
                }
                if (view != null)
                    view.activateState(this.stateKeys);
                if (this._callBackChangeState)
                    this._callBackChangeState(this.stateKeys);
            },

            back: function() {
                history.back();
            },

            //Sets a new state
            setState: function (iStateKeys) {
                this.stateKeys = iStateKeys;
                var str = '';
                for (key in this.stateKeys) {
                    if (str.length > 0) str += '&';
                    str += key;
                    if (this.stateKeys[key] != null)
                        str += '=' + this.stateKeys[key];
                }
                this.updateState();
                window.location.hash = str;
                if (typeof _gaq !== 'undefined')
                    _gaq.push(['_trackEvent', 'State', 'set', str]);
            },

            //Reacts to a change in url hash tag
            _onChanged: function () {
                var newstateKeys = {};
                var theHash = window.location.hash;

//                if (!HistoryManager.isNotFirstUrlHashTest) {
//                    theStoredHash = DQX.getUrlSearchString('fragment');
//                    if (theStoredHash) {
//                        theHash = theStoredHash.replace(/%23/g,'#');
//                    }
//                    HistoryManager.isNotFirstUrlHashTest = true;
//                }

                var tokens = theHash.substring(1).split('&');
                for (var tokennr = 0; tokennr < tokens.length; tokennr++) {
                    if (tokens[tokennr]) {
                        var tokenpair = tokens[tokennr].split('=');
                        newstateKeys[tokenpair[0]] = tokenpair[1];
                    }
                }

                var issame = true;
                if (this.dstateKeys == null)
                    issame = false;
                else {
                    for (var k in newstateKeys)
                        if ((!(k in this.stateKeys)) || (newstateKeys[k] != this.stateKeys[k]))
                            issame = false;
                    for (var k in this.stateKeys)
                        if ((!(k in newstateKeys)) || (this.stateKeys[k] != newstateKeys[k]))
                            issame = false;
                }

                if (!issame) {
                    this.stateKeys = newstateKeys;
                    this.updateState();
                }
            },


            //Listens to tab changes, and automatically figure out if they mean a change in view state
            _reactSwitchTab: function (scope, newid) {
                if (HistoryManager.__ignoreSwitchTab)
                    return;

                var activeView = null;
                //attempt 1: match by id of the tab that was clicked
                for (var viewNr = 0; viewNr < HistoryManager.views.length; viewNr++) {
                    var view = HistoryManager.views[viewNr];
                    if (view.getFrame() != null) {
                        if (newid == view.getFrame().myFrameID) {
                            if (activeView)
                                DQX.reportError("Duplicate matching view");
                            activeView = view;
                        }
                    }
                }
                if (!activeView) {
                    //attempt 2: match by identifying visible frame
                    for (var viewNr = 0; viewNr < HistoryManager.views.length; viewNr++) {
                        var view = HistoryManager.views[viewNr];
                        if (view.getFrame() != null) {
                            if (view.getFrame().isVisible()) {
                                if (activeView)
                                    DQX.reportError("Duplicate matching view");
                                activeView = view;
                            }
                        }
                    }
                }
                if (activeView) {
                    if (!HistoryManager.__preventSetFragment)
                    HistoryManager.setState(activeView.getStateKeys());
                }
            },

            end: true
        }

        //Register the required handlers
        window.onhashchange = $.proxy(HistoryManager._onChanged, HistoryManager);
        Msg.listen('', { type: 'ChangeTab' }, HistoryManager._reactSwitchTab);


        return HistoryManager;
    });
