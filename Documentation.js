/************************************************************************************************************************************
*************************************************************************************************************************************

Handles the display of documentation (help) in a popup mini-browser

Use Documentation.showHelp to show a help topic

*************************************************************************************************************************************
*************************************************************************************************************************************/

define([DQXSCJQ(), DQXSC("Utils"), DQXSC("DocEl"), DQXSC("Msg"), DQXSC("Popup")],
    function ($, DQX, DocEl, Msg, Popup) {
        var Documentation = {};

        Documentation.topicStack = [];
        Documentation.topicStackPointer = -1;

        Documentation._onCancel = function () {
            $('#DocuBoxBackGround').remove();
            DQX.unRegisterGlobalKeyDownReceiver('DocuBox');
        }

        closeDocumentation = function () {
            Documentation._onCancel();
        }

        Documentation._onPrevious = function () {
            if (Documentation.topicStackPointer > 0) {
                Documentation.topicStackPointer--;
                Documentation._displayHelp(Documentation.topicStack[Documentation.topicStackPointer].url, Documentation.topicStack[Documentation.topicStackPointer].scrollPos);
            }
        }

        Documentation._onNext = function () {
            if (Documentation.topicStackPointer < Documentation.topicStack.length - 1) {
                Documentation.topicStackPointer++;
                Documentation._displayHelp(Documentation.topicStack[Documentation.topicStackPointer].url, Documentation.topicStack[Documentation.topicStackPointer].scrollPos);
            }
        }

        Documentation._createBox = function () {

            if ($('#DocuBoxBackGround').length > 0)
                return;

            Documentation.topicStack = [];
            Documentation.topicStackPointer = -1;

            var background = DocEl.Div({ id: 'DocuBoxBackGround' });
            background.addStyle("position", "absolute");
            background.addStyle("left", '0px');
            background.addStyle("top", '0px');
            background.addStyle('width', '100%');
            background.addStyle('height', '100%');
            var wizbackcol = 'rgba(100,100,100,0.4)';
            background.addStyle('background-color', wizbackcol);
            background.addStyle('z-index', '2000');
            $('#DQXUtilContainer').append(background.toString());

            $('#DocuBoxBackGround').mousedown(function (ev) {
                if (ev.target.id == 'DocuBoxBackGround') {
                    $('#DocuBoxBackGround').css('background-color', 'rgba(50,50,50,0.6)');
                    setTimeout(function () {
                        $('#DocuBoxBackGround').css('background-color', wizbackcol);
                        setTimeout(function () {
                            $('#DocuBoxBackGround').css('background-color', 'rgba(50,50,50,0.6)');
                            setTimeout(function () {
                                $('#DocuBoxBackGround').css('background-color', wizbackcol);
                            }, 150);
                        }, 150);
                    }, 150);
                    //alert("Please close the wizard if you want to return to the application");
                }
            });

            var pageSizeX = DQX.getWindowClientW();
            var pageSizeY = DQX.getWindowClientH();
            var boxSizeX = Math.min(800, pageSizeX - 100);

            var box = DocEl.Div({ id: 'DocuBox' });
            box.addStyle("position", "absolute");
            box.addStyle("left", (pageSizeX - boxSizeX) / 2 + 'px');
            box.addStyle("top", 50 + 'px');
            box.addStyle('width', boxSizeX + 'px');
            box.setCssClass("DQXDocuBox");
            //box.addStyle("overflow", "hidden");

            var thecloser = DocEl.JavaScriptBitmaplink(DQXBMP("close2.png"), "Close", "closeDocumentation();");
            box.addElem(thecloser);
            thecloser.addStyle('position', 'absolute');
            thecloser.addStyle('right', '-16px');
            thecloser.addStyle('top', '-16px');


            var boxHeader = DocEl.Div({ id: 'DocuBoxHeader', parent: box });
            boxHeader.setCssClass("DQXDocuBoxHeader DQXDragHeader");
            //boxHeader.addElem('Help');

            var boxFooter = DocEl.Div({ id: 'DocuBoxFooter', parent: box });
            boxFooter.setCssClass("DQXDocuBoxFooter");
            var boxButtons = DocEl.Div({ id: 'DocuBoxButtons', parent: boxFooter });

            var buttons = [
            //                    { id: 'DocuBoxButtonCancel', name: '', bitmap: DQXBMP('cancel.png'), handler: Documentation._onCancel },
                    {id: 'DocuBoxButtonPrevious', name: '', bitmap: DQXBMP('arrow5left.png'), handler: Documentation._onPrevious },
                    { id: 'DocuBoxButtonNext', name: '', bitmap: DQXBMP('arrow5right.png'), handler: Documentation._onNext },
                ];

            for (var buttonNr = 0; buttonNr < buttons.length; buttonNr++) {
                var button = buttons[buttonNr];
                var boxButtonCancel = DocEl.Div({ id: button.id, parent: boxButtons });
                boxButtonCancel.setCssClass("DQXDocuButton");
                boxButtonCancel.addElem('<IMG SRC="' + button.bitmap + '" border=0 ALT="" style="margin-right:3px;margin-left:3px"></IMG>');
                boxButtonCancel.addElem(button.name);
            }
            //boxButtons.addElem("<b>This is the title</b>");

            var boxContent = DocEl.Div({ id: 'DocuBoxContent', parent: box });
            boxContent.setCssClass("DQXDocuBoxBody");
            boxContent.addStyle('max-height', (pageSizeY - 100 - 100) + 'px');

            //boxContent.setHeightPx(boxSizeY - 4 - 105);


            $('#DocuBoxBackGround').append(box.toString());
            Popup.makeDraggable('DocuBox');

            for (var buttonNr = 0; buttonNr < buttons.length; buttonNr++) {
                var button = buttons[buttonNr];
                $('#' + button.id).click($.proxy(button.handler, this));
            }

            DQX.registerGlobalKeyDownReceiver(function (ev) {
                if (ev.isEscape) Documentation._onCancel('DocuBox');
            }, 'DocuBox');

            //Documentation.scrollHelper = DQX.scrollHelper($('#DocuBoxContent'));
        }


        //Show a help box corresponding to a help id item in the DOM
        Documentation.showHelp = function (url) {
            if (Documentation.topicStackPointer >= 0)
                Documentation.topicStack[Documentation.topicStackPointer].scrollPos = $('#DocuBoxContent').scrollTop();
            Documentation._createBox();
            Documentation.topicStack = Documentation.topicStack.slice(0, Documentation.topicStackPointer + 1);
            Documentation.topicStack.push({ url: url, scrollPos: 0 });
            Documentation.topicStackPointer = Documentation.topicStack.length - 1;
            Documentation._displayHelp(url,0);
        }

        Documentation._displayHelp = function (url, scrollPos) {
            $('#DocuBoxButtonPrevious').css('opacity', (Documentation.topicStackPointer > 0) ? 1 : 0.3);
            $('#DocuBoxButtonNext').css('opacity', (Documentation.topicStackPointer < Documentation.topicStack.length - 1) ? 1 : 0.3);

            DQX.setProcessing("Downloading...");
            $.get(url, {})
            .done(function (data) {
                DQX.stopProcessing();
                $('#DocuBoxContent').html($('<div/>').append(DQX.interpolate(data)).find('.DQXHelpContent').html());
                if (scrollPos)
                    $('#DocuBoxContent').scrollTop(scrollPos);
                else
                    $('#DocuBoxContent').scrollTop(0);
                //Documentation.scrollHelper.update();
            })
            .fail(function () {
                DQX.stopProcessing();
                alert("Failed to download documentation item '" + url + "'");
            });


        }


        Msg.listen('', { type: 'ShowHelp' }, function (context, helpid) {
            Documentation.showHelp(helpid);
        });


        return Documentation;
    });
