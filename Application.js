/************************************************************************************************************************************
 *************************************************************************************************************************************


 *************************************************************************************************************************************
 *************************************************************************************************************************************/

define(["jquery", "DQX/Utils", "DQX/DocEl", "DQX/Msg", "DQX/Framework", "DQX/HistoryManager"],
    function ($, DQX, DocEl, Msg, Framework, HistoryManager) {
        var Application = {};


        Application._views=[];


        Application.customInitFunction = function(proceedFunction) {

            proceedFunction();
        }//implement this function

        Application.init=function(ititle) {
            Application.title=ititle;
            DQX.Init();
            setTimeout(function() {
                Application._createFrameWork1();
            })
        }


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
                view._myFrame = Application.frameBody.addMemberFrame(Framework.FrameGeneric('intro', 1))
                    .setFrameClass('DQXClient')
                    .setDisplayTitle(view._myTitle)
                    .setDisplayTitle2(Application.title)
                    .setMargins(0)
                    .setFrameClass('DQXFrame');/*.setAllowScrollBars(false,false)*/;
                view.createFrames(view._myFrame);
            })

            Application.customInitFunction(Application._createFramework2);
        }


        Application._createFramework2 = function() {

            Application.frameWindow.render('Div1');

        }




///////////////////////////////////////////////////////////////////////////////////////////////////////

        Application.View = function(iid,ititle) {
            var that = {};
            that._myID=iid;
            that._myTitle=ititle;
            that._myFrame = null;//Framework.frame instance, provived by application during initialisation

            Application._views.push(that);
            //that.registerView();

            that.getStateID = function () { return this._myID; }

            /*********** Overridables ***********/

            that.createFrames = function(rootFrame) {} //override to define the frames of this view


            HistoryManager.addView(that);

            return that;
        }





        return Application;
    });
