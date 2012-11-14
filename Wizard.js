define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/Utils", "DQX/Framework", "DQX/Controls"],
    function ($, DocEl, Msg, DQX, Framework, Controls) {
        var Wizard = {};

        Wizard.Create = function () {
            var that = {};

            that._pages = [];
            that.addPage = function (page) {//each page should be a Control.XXX instance
                that._pages.push(page);
            }

            that.run = function () {
                var background = DocEl.Div({ id: 'WizBackGround' });
                background.addStyle("position", "absolute");
                background.addStyle("left", '0px');
                background.addStyle("top", '0px');
                background.addStyle('width', '100%');
                background.addStyle('height', '100%');
                background.addStyle('background-color', 'rgba(0,0,0,0.4)');
                background.addStyle('z-index', '2000');
                $('#DQXUtilContainer').append(background.toString());

                var pageSizeX = $(window).width();
                var pageSizeY = $(window).height();

                var boxSizeX = 400;
                var boxSizeY = 300;

                var box = DocEl.Div({ id: 'WizBox' });
                box.addStyle("position", "absolute");
                box.addStyle("left", (pageSizeX - boxSizeX) / 2 + 'px');
                box.addStyle("top", (pageSizeY - boxSizeY) / 2 + 'px');
                box.addStyle('width', boxSizeX + 'px');
                box.addStyle('height', boxSizeY + 'px');
                box.setCssClass("DQXWizardBox");
                var boxHeader = DocEl.Div({ id: 'WizBoxHeader', parent: box });
                boxHeader.setCssClass("DQXWizardBoxHeader");
                boxHeader.addElem('the header');
                var boxContent = DocEl.Div({ id: 'WizBoxContent', parent: box });
                boxContent.setCssClass("DQXWizardBoxBody");
                boxContent.setHeightPx(boxSizeY-4-80);
                var boxFooter = DocEl.Div({ id: 'WizBoxFooter', parent: box });
                boxFooter.setCssClass("DQXWizardBoxFooter");
                boxFooter.addElem('the footer');
                $('#WizBackGround').append(box.toString());

                this.setPage(0);
            }

            that.setPage = function (ipageNr) {
                this.pageNr = ipageNr;
                $('#WizBoxContent').html(this._pages[this.pageNr].form.renderHtml());
                this._pages[this.pageNr].form.postCreateHtml();
            }

            //test: prepopulate with some dummy pages
            that.addPage({ form: Controls.Static('This is some dummy text on page 1.') });
            that.addPage({ form: Controls.Static('This is some dummy text on page 2.') });
            that.addPage({ form: Controls.Static('This is some dummy text on page 3.') });



            //var page = Controls.CompoundVert([]);
            //that.addPage(page);

            return that;
        }



        return Wizard
    });
