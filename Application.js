/************************************************************************************************************************************
 *************************************************************************************************************************************

IMPORTANT NOTE:
 both require.js and async.js should be present in the project!

 *************************************************************************************************************************************
 *************************************************************************************************************************************/

define(["jquery", "DQX/Utils", "DQX/DocEl", "DQX/Msg", "DQX/Framework", "DQX/HistoryManager", "DQX/Controls"],
    function ($, DQX, DocEl, Msg, Framework, HistoryManager, Controls) {
        var Application = {};


        Application._views=[];
        Application._viewMap={};
        Application._addView = function(view) {
            if (view.getStateID() in Application._viewMap)
                DQX.reportError('Duplicate view id: ' + view.getStateID());
            Application._views.push(view);
            Application._viewMap[view.getStateID()]=view;
        };

        //Define the html that will go into the header of the application
        Application.setHeader = function(html) {
            Application._headerHtml=html;
        };

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

            DQX.Init();
            setTimeout(function() {
                Application._createFrameWork1();
            })
        };

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
                .setFixedSize(Framework.dimY, 60).setFrameClassClient('DQXPage').setMargins(0).setAllowScrollBars(false,false);

            //The body panel of the page
            Application.frameBody = Application.frameRoot.addMemberFrame(Framework.FrameGroupStack('info', 1)).setAnimateTransition();

            $.each(Application._views,function(idx,view){
                view._myFrame = Application.frameBody.addMemberFrame(Framework.FrameGeneric(view.getStateID(), 1))
                    .setFrameClass('DQXClient')
                    .setDisplayTitle(view._myTitle)
                    .setDisplayTitle2(Application.title)
                    .setMargins(0)
                    .setFrameClass('DQXFrame');
                view.createFrames(view._myFrame);
                view._myFrame.setInitialiseFunction(view._initialisePanels);

            });

            Application.customInitFunction(Application._createFramework2);
        };


        Application._createFramework2 = function() {

            Application.frameWindow.render('Div1');

            Application.frameHeaderIntro.setContentHtml(Application._headerHtml);
            Application.createNavigationSection();

            DQX.initPostCreate();
            HistoryManager.init();

        };

        Application.createNavigationButton = function (id, parentDiv, bitmap, content, styleClass, width, handlerFunction) {
            var bt = Controls.Button(id, { bitmap: bitmap, content: content, buttonClass: styleClass, width: width, height: 30 });
            bt.setOnChanged(handlerFunction);
            parentDiv.addElem(bt.renderHtml());
        };


        Application.createNavigationSection = function () {
            var navSectionDiv = DocEl.Div();
            navSectionDiv.addStyle("position", "absolute");
            navSectionDiv.addStyle("right", "0px");
            navSectionDiv.addStyle("top", "0px");
            navSectionDiv.addStyle("padding-top", "3px");
            navSectionDiv.addStyle("padding-right", "5px");
            this.createNavigationButton("HeaderPrevious", navSectionDiv, DQX.BMP("/Icons/Small/Back.png"), "Previous<br>view", "DQXToolButton3", 100, function () { Msg.send({ type: 'Back' }) });
            this.createNavigationButton("HeaderHome", navSectionDiv, DQX.BMP("/Icons/Small/Home.png"), "Intro<br>view", "DQXToolButton3", 100, function () { Msg.send({ type: 'Home' }) });
            //$('#' + this.myHeaderFrame.getClientDivID()).append(navSectionDiv.toString());
            $('#Div1').append(navSectionDiv.toString());
            DQX.ExecPostCreateHtml();

            Msg.listen('', { type: 'Home' }, function () {
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


            Application._addView(that);
            HistoryManager.addView(that);

            return that;
        };





        return Application;
    });
