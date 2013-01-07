define(["jquery", "DQX/Msg"],
    function ($, Msg) {
        var HistoryManager = {

            stateKeys: null,

            updateState: function () {
                if (this.globalLoadState == null)
                    throw 'globalLoadState is not defined';
                this.globalLoadState(this.stateKeys);
            },


            setState: function (stateKeys) {
                this.stateKeys = stateKeys;
                var str = '';
                for (key in stateKeys) {
                    if (str.length > 0) str += '&';
                    str += key;
                    if (stateKeys[key] != null)
                        str += '=' + stateKeys[key];
                }
                this.updateState();
                window.location.hash = str;
            },

            onChanged: function () {
                var newstateKeys = {};
                var tokens = window.location.hash.substring(1).split('&');
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

            views: [],
            viewsMap: {},

            addView: function (view) {
                HistoryManager.views.push(view);
                if (view.myStateID) {
                    if (view.myStateD in HistoryManager.viewsMap)
                        throw "Duplicate view state id";
                    HistoryManager.viewsMap[view.myStateID] = view;
                }
            },

            reactSwitchTab: function (scope, newid) {
                if (HistoryManager.__ignoreSwitchTab)
                    return;

                var activeView = null;
                //attempt 1: match by id of the tab that was clicked
                for (var viewNr = 0; viewNr < HistoryManager.views.length; viewNr++) {
                    var view = HistoryManager.views[viewNr];
                    if (view.myFrame != null) {
                        if (newid == view.myFrame.myFrameID) {
                            if (activeView)
                                throw "Duplicate matching view";
                            activeView = view;
                        }
                    }
                }
                if (!activeView) {
                    //attempt 2: match by identifying visible frame
                    for (var viewNr = 0; viewNr < HistoryManager.views.length; viewNr++) {
                        var view = HistoryManager.views[viewNr];
                        if (view.myFrame != null) {
                            if (view.myFrame.isVisible()) {
                                if (activeView)
                                    throw "Duplicate matching view";
                                activeView = view;
                            }
                        }
                    }
                }

                if (activeView)
                    HistoryManager.setState(activeView.getStateKeys());
            },


            globalLoadState: function (stateKeys) {
                if ((!$.isEmptyObject(stateKeys)) && (!HistoryManager.started)) {//do something sensible when the reload was hit on a page different from the start page
                    HistoryManager.started = true;
                    HistoryManager.setState({});
                    return;
                }
                if ((!stateKeys) || ($.isEmptyObject(stateKeys))) {//do something sensible when no state is provided
                    if (!HistoryManager.viewsMap['start'])
                        throw 'No start view provided';
                    HistoryManager.viewsMap['start'].activateState(stateKeys);
                    return;
                }
                var view = null;
                for (var viewNr = 0; viewNr < HistoryManager.views.length; viewNr++) {
                    if (HistoryManager.views[viewNr].getStateID() in stateKeys) {
                        if (view != null)
                            throw "Duplicate applicable view";
                        view = HistoryManager.views[viewNr];
                    }
                }
                if (view != null)
                    view.activateState(stateKeys);
            }


        }


        window.onhashchange = $.proxy(HistoryManager.onChanged, HistoryManager);
        Msg.listen('', { type: 'ChangeTab' }, HistoryManager.reactSwitchTab);
        return HistoryManager;
    });
