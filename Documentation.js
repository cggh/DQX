define([DQXSCJQ(), DQXSC("Utils"), DQXSC("DocEl"), DQXSC("Msg"), DQXSC("Popup")],
    function ($, DQX, DocEl, Msg, Popup) {
        var Documentation = {};


        Documentation._onCancel = function () {
            $('#DocuBoxBackGround').remove();
        }

        Documentation.createBox = function () {

            if ($('#DocuBoxBackGround').length > 0)
                return;

            var background = DocEl.Div({ id: 'DocuBoxBackGround' });
            background.addStyle("position", "absolute");
            background.addStyle("left", '0px');
            background.addStyle("top", '0px');
            background.addStyle('width', '100%');
            background.addStyle('height', '100%');
            var wizbackcol = 'rgba(100,100,100,0.3)';
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
            box.addStyle('max-height', (pageSizeY - 100) + 'px');
            box.addStyle("overflow", "auto");
            box.setCssClass("DQXDocuBox");

            var boxHeader = DocEl.Div({ id: 'DocuBoxHeader', parent: box });
            boxHeader.setCssClass("DQXDocuBoxHeader DQXDragHeader");
            boxHeader.addElem('Help');

            var boxFooter = DocEl.Div({ id: 'DocuBoxFooter', parent: box });
            boxFooter.setCssClass("DQXDocuBoxFooter");
            var boxButtons = DocEl.Div({ id: 'DocuBoxButtons', parent: boxFooter });

            var buttons = [
                    { id: 'WizBoxButtonCancel', name: '', bitmap: DQXBMP('cancel.png'), handler: Documentation._onCancel },
                    { id: 'WizBoxButtonPrevious', name: '', bitmap: DQXBMP('arrow5left.png'), handler: Documentation._onPrevious },
                    { id: 'WizBoxButtonNext', name: '', bitmap: DQXBMP('arrow5right.png'), handler: Documentation._onNext },
                ];

            for (var buttonNr = 0; buttonNr < buttons.length; buttonNr++) {
                var button = buttons[buttonNr];
                var boxButtonCancel = DocEl.Div({ id: button.id, parent: boxButtons });
                boxButtonCancel.setCssClass("DQXDocuButton");
                boxButtonCancel.addElem('<IMG SRC="' + button.bitmap + '" border=0 ALT="" style="margin-right:3px;margin-left:3px"></IMG>');
                boxButtonCancel.addElem(button.name);
            }
            boxButtons.addElem("<b>This is the title</b>");

            var boxContent = DocEl.Div({ id: 'DocuBoxContent', parent: box });
            boxContent.setCssClass("DQXDocuBoxBody");

            //boxContent.setHeightPx(boxSizeY - 4 - 105);


            $('#DocuBoxBackGround').append(box.toString());
            Popup.makeDraggable('DocuBox');

            for (var buttonNr = 0; buttonNr < buttons.length; buttonNr++) {
                var button = buttons[buttonNr];
                $('#' + button.id).mousedown($.proxy(button.handler, this));
            }


        }


        //Show a help box corresponding to a help id item in the DOM
        Documentation.showHelp = function (id) {
            if (id.slice(0, 3) != 'LNK')
                DQX.reportError('Invalid help link ' + id);
            id = id.slice(3, 999);
            Documentation.createBox();
            var docElem = $('#DQXDocumentation').find('#' + id);
            if (docElem.length == 0) DQX.reportError("Broken help link " + id);
            var helpcontent = docElem.html();
            Documentation.createBox();
            $('#DocuBoxContent').html(helpcontent);
            /*
            var pageSizeX = DQX.getWindowClientW();
            var pageSizeY = DQX.getWindowClientH();
            var boxSizeX = $('#DocuBox').width();
            var boxSizeY = $('#DocuBox').height();
            $('#DocuBox').css({ left: (pageSizeX - boxSizeX) / 2, top: (pageSizeY - boxSizeY) / 2 });
            */
        }

        Msg.listen('', { type: 'ShowHelp' }, function (context, helpid) {
            Documentation.showHelp(helpid);
        });


        return Documentation;
    });
