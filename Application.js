# This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

/************************************************************************************************************************************
 *************************************************************************************************************************************

IMPORTANT NOTE:
 both require.js and async.js should be present in the project!

 *************************************************************************************************************************************
 *************************************************************************************************************************************/



/************************************************************************************************************************************
 *
 * Application: the one and single application object
 * Application.startupParams: a map with tokens provided on the url on startup
 *
 ************************************************************************************************************************************/

define(["jquery", "DQX/Utils", "DQX/DocEl", "DQX/Msg", "DQX/Framework", "DQX/HistoryManager", "DQX/Controls", "DQX/PopupFrame"],
    function ($, DQX, DocEl, Msg, Framework, HistoryManager, Controls, PopupFrame) {
        var Application = {};

        Application._initialised = false;
        Application._customNavigationButtons = [];
        Application._views=[];
        Application._viewMap={};
        Application._showViewsAsTabs = false;
        Application._headerHeight = 60;



        Application._addView = function(view) {
            if (view.getStateID() in Application._viewMap)
                DQX.reportError('Duplicate view id: ' + view.getStateID());
            Application._views.push(view);
            Application._viewMap[view.getStateID()]=view;
        };


        Application.setHeaderHeight = function(h) {
            Application._headerHeight = h;
        }

        //Define the html that will go into the header of the application
        Application.setHeader = function(html) {
            Application._checkNotInitialised();
            Application._headerHtml=html;
        };

        // Add a button to the nagivation section (right part of the app header)
        Application.addNavigationButton = function(name, bitmap, width, handler) {
            Application._customNavigationButtons.push({ name: name, bitmap: bitmap, width: width, handler: handler });
        }

        Application.showViewsAsTabs = function() {
            Application._showViewsAsTabs = true;
        }

        Application.customInitFunction = function(proceedFunction) {
            proceedFunction();
        };//implement this function

        Application.init=function(ititle) {
            Application.title=ititle;

            //Check the the browser supports the features we need
            if ((!Modernizr.canvas) || (!Modernizr.canvastext) || (!Modernizr.svg)) {
                var message=$('#OldBrowser').html();
                if (!message)
                    message='<b>Fatal error:</b> This browser is outdated and does not support the features necessary to run this application';
                $('#Div1').html(message);//If not, set an error message
                return;
            }

            Application.startupParams = {};
            var tokens = window.location.search.substring(1).split('&');
            for (var tokennr = 0; tokennr < tokens.length; tokennr++) {
                if (tokens[tokennr]) {
                    var tokenpair = tokens[tokennr].split('=');
                    Application.startupParams[tokenpair[0]] = tokenpair[1];
                }
            }

            DQX.Init();
            setTimeout(function() {
                Application._createFrameWork1();
                Application._initialised = true;
            })
        };

        //returns a list of all views
        Application.getViewList = function() {
            return Application._views;
        }

        Application.getView = function(viewID) {
            if (!Application._viewMap[viewID])
                DQX.reportError('Invalid view '+viewID);
            return Application._viewMap[viewID];
        }

        Application.activateView = function(viewID) {
            if (!(viewID in Application._viewMap))
                DQX.reportError('Invalid view id: ' + viewID);
            Application._viewMap[viewID].activateState();
        };


        Application._createFrameWork1 = function () {
            Application.frameWindow = Framework.FrameFullWindow(Framework.FrameGroupVert(''));
            Application.frameRoot = Application.frameWindow.getFrameRoot();
            Application.frameRoot.setMargins(0).setSeparatorSize(0);

            //The top line of the page
            Application.frameHeaderIntro = Application.frameRoot.addMemberFrame(Framework.FrameFinal('HeaderIntro', 1))
                .setFixedSize(Framework.dimY, Application._headerHeight).setFrameClassClient('DQXPage').setMargins(0).setAllowScrollBars(false,false);

            //The body panel of the page
            if (Application._showViewsAsTabs)
                Application.frameBody = Application.frameRoot.addMemberFrame(Framework.FrameGroupTab('info', 1));
            else
                Application.frameBody = Application.frameRoot.addMemberFrame(Framework.FrameGroupStack('info', 1)).setAnimateTransition();

            $.each(Application._views,function(idx,view){
                view._myFrame = Application.frameBody.addMemberFrame(Framework.FrameGeneric(view.getStateID(), 1))
                    .setFrameClass('DQXClient')
                    .setDisplayTitle(view._myTitle)
                    .setDisplayTitle2(Application.title)
                    .setMargins(0)
                    .setFrameClass('DQXFrame');
                view.createFrames(view._myFrame);
                if (!view._doEarlyInitialisation)
                    view._myFrame.setInitialiseFunction(view._initialisePanels);

            });

            Msg.listen('',{ type: 'ChangeTab', id: Application.frameBody.getFrameID() }, function(scope, frameid) {
                Application.getView(frameid).onBecomeVisible();
            });


            Application.customInitFunction(Application._createFramework2);
        };


        Application._createFramework2 = function() {

            Application.frameWindow.render('Div1');

            Application.frameHeaderIntro.setContentHtml(Application._headerHtml);
            Application._createNavigationSection();

            DQX.initPostCreate();
            HistoryManager.init();

            $.each(Application._views,function(idx,view){
                if (view._doEarlyInitialisation)
                    view._initialisePanels();
            });

        };

        Application._checkNotInitialised = function() {
            if (Application._initialised)
                DQX.reportError('Application is already initialised');
        }


        Application._createNavigationButton = function (id, parentDiv, bitmap, content, styleClass, width, handlerFunction) {
            var bt = Controls.Button(id, { bitmap: bitmap, content: content, buttonClass: styleClass, width: width, height: 30 });
            bt.setOnChanged(handlerFunction);
            parentDiv.addElem(bt.renderHtml());
        };


        Application._createNavigationSection = function () {
            var navSectionDiv = DocEl.Div();
            navSectionDiv.addStyle("position", "absolute");
            navSectionDiv.addStyle("right", "0px");
            navSectionDiv.addStyle("top", "0px");
            navSectionDiv.addStyle("padding-top", "0px");
            navSectionDiv.addStyle("padding-right", "5px");
            //this._createNavigationButton("HeaderPrevious", navSectionDiv, DQX.BMP("/Icons/Small/Back.png"), "Previous<br>view", "DQXToolButton3", 100, function () { Msg.send({ type: 'Back' }) });
            this._createNavigationButton("HeaderHome", navSectionDiv, DQX.BMP("/Icons/Small/Home.png"), "Intro<br>view", "DQXToolButton3", 100, function () { Msg.send({ type: 'Home' }) });

            // Create custom navigation buttons
            $.each(Application._customNavigationButtons, function(idx, buttonInfo) {
                Application._createNavigationButton("", navSectionDiv, buttonInfo.bitmap, buttonInfo.name, "DQXToolButton1", buttonInfo.width, buttonInfo.handler);
            });

            $('#Div1').append(navSectionDiv.toString());
            DQX.ExecPostCreateHtml();

            Msg.listen('', { type: 'Home' }, function () {
                PopupFrame.minimiseAll();
                HistoryManager.setState(Application._views[0].getStateKeys());
            });
            Msg.listen('', { type: 'Back' }, function () {
                HistoryManager.back();
            });

        };





///////////////////////////////////////////////////////////////////////////////////////////////////////

        Application.View = function(iid,ititle) {
            var that = {};
            that._myID=iid;
            that._myTitle=ititle;
            that._myFrame = null;//Framework.frame instance, provided by application during initialisation
            that._doEarlyInitialisation = false;

            //Call this function if you want to initialise (i.e. call createPanels) the view when the application starts
            //Alternative: view is only initialised when it becomes visible
            that.setEarlyInitialisation = function() {
                that._doEarlyInitialisation = true;
            }

            that.getStateID = function () { return this._myID; };

            that.getFrame = function() { return that._myFrame; };

            that._initialisePanels = function () {
                that.createPanels();
                that._myFrame.applyOnPanels(function(panel) {
                    if (panel._panelfirstRendered==false)
                        panel.render();
                })
            };


            that.getStateKeys = function () {//default implementation, can be overwritten
                var mp = {};
                mp[this._myID] = null;
                return mp;
            };


            //Can be overridden
            that.activateState = function () {
                that._myFrame.makeVisible();
                setTimeout(function() {
                    that._myFrame.applyOnPanels(function(panel) {
                        if (panel.handleResize)
                            panel.handleResize();
                    })
                },50);
            };

            that.isActive = function() {
                return that._myFrame.isVisible();
            }

            // Creates & returns a standard button that activates this view zhen clicked
            that.createActivationButton = function(settings) {
                var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: settings.content, bitmap:settings.bitmap, width:120, height:50 });
                bt.setOnChanged(function() {
                    Application.activateView(that._myID);
                })
                return bt;
            }



            /*********** Overridables ***********/

            that.createFrames = function() { DQX.reportError("Please override createFrames"); }; //override to define the frames of this view

            that.createPanels = function() { DQX.reportError("Please override createPanels"); }; //override to define the panels of this view

            that.onBecomeVisible = function() {};


            Application._addView(that);
            HistoryManager.addView(that);

            return that;
        };





        return Application;
    });
