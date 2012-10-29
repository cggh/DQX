

DQX.Gui = {};


//////////////////////////////////////////////////////////////////////////////////////////
// Base class for high-level GUI components
//////////////////////////////////////////////////////////////////////////////////////////

DQX.Gui.GuiComponent = function (iid, args) {
    var that = {};
    that.id = iid;

    that.getSubId = function (ext) { return that.id + ext; }

    if ($('#' + that.id).length == 0) throw "Invalid Gui component " + iid;
    that.rootelem = $('#' + that.id);

    var _handleOnResize = function () {
        if ('onResize' in that) {
            if ((that.rootelem.width()>5)&&(that.rootelem.height()>5))
                that.onResize();
        }
    }

    that.rootelem.resize(_handleOnResize);



    return that;
}


//////////////////////////////////////////////////////////////////////////////////////////
// Interactive query builder
//////////////////////////////////////////////////////////////////////////////////////////

DQX.Gui.QueryBuilder = function (iid, args) {
    var that = DQX.Gui.GuiComponent(iid, args);

    that.myBuilder = new DQX.QueryBuilder(iid);

    that.onResize = function () {
        this.myBuilder._reRender();
    }

    return that;
}


//////////////////////////////////////////////////////////////////////////////////////////
// Query table
//////////////////////////////////////////////////////////////////////////////////////////

DQX.Gui.QueryTable = function (iid, idatafetcher, args) {
    var that = DQX.Gui.GuiComponent(iid, args);

    var html = '';


    {//Create header
        var header = DQX.DocEl.Div();
        header.addStyle('padding-bottom', '5px');
        var pager_txt = DQX.DocEl.Span({ parent: header, id: that.getSubId("Pager") });

        var sortgroup = DQX.DocEl.Span({ parent: header });
        sortgroup.addStyle('float', 'right');
        sortgroup.addStyle('vertical-align', 'bottom');
        sortgroup.addStyle('position', 'relative');
        sortgroup.addStyle('top', '10px');
        sortgroup.addElem("&nbsp;&nbsp;&nbsp;Sort by: ");
        var pager_SortOptions = DQX.DocEl.Select([], '', { parent: sortgroup, id: that.getSubId("SortOptions") });
        sortgroup.addElem("&nbsp;");
        var pager_SortDir = DQX.DocEl.Check({ parent: sortgroup, id: (that.getSubId("SortDir")) });
        sortgroup.addElem("Inverted");

        html += header;
    }

    {//Create tables
        var holder = DQX.DocEl.Div();
        //holder.addStyle("overflow", "auto");


        //This variant uses a guaranteed fixed % distribution over both parts, and also guarantees that the table stretches the full extent        
        //        var div1 = DQX.DocEl.Div({ parent: holder });
        //        div1.makeFloatLeft().addStyle('overflow', 'auto').setWidthPc(args.leftfraction || 50);
        //        var tablebody1 = DQX.DocEl.Div({ parent: div1, id: that.getSubId("Body1") });
        //        tablebody1.addStyle("overflow-x", "scroll").addStyle("overflow-y", "hidden");
        //        tablebody1.addStyle("border-width",'0px');
        //        tablebody1.addStyle("border-right-width", '2px');
        //        tablebody1.addStyle("border-style", 'solid');
        //        tablebody1.addStyle("border-color", 'rgb(60,60,60)');
        //        var div2 = DQX.DocEl.Div({ parent: holder });
        //        div2.makeFloatLeft().addStyle('overflow', 'auto').setWidthPc(100 - (args.leftfraction || 50));
        //        var tablebody2 = DQX.DocEl.Div({ parent: div2, id: that.getSubId("Body2") });
        //        tablebody2.addStyle("overflow-x", "scroll").addStyle("overflow-y", "hidden");
        //        

        //This variant uses a maximum % distribution for the left part, and makes the left part never use more than required. It does not guarantee that the table stretches the full extent        
        var div1 = DQX.DocEl.Div({ parent: holder });
        div1.makeFloatLeft().addStyle('overflow', 'auto');
        div1.addStyle('max-width', (args.leftfraction || 50).toString() + '%');
        var tablebody1 = DQX.DocEl.Div({ parent: div1, id: that.getSubId("Body1") });
        tablebody1.addStyle("overflow-x", "scroll").addStyle("overflow-y", "hidden");
        tablebody1.addStyle("border-width", '0px');
        tablebody1.addStyle("border-right-width", '2px');
        tablebody1.addStyle("border-style", 'solid');
        tablebody1.addStyle("border-color", 'rgb(60,60,60)');
        var div2 = DQX.DocEl.Div({ parent: holder });
        div2.addStyle('overflow', 'auto'); //.setWidthPc(95);
        var tablebody2 = DQX.DocEl.Div({ parent: div2, id: that.getSubId("Body2") });
        tablebody2.addStyle("overflow-x", "scroll").addStyle("overflow-y", "hidden");
        tablebody2.setBackgroundColor(DQX.Color(0.7,0.7,0.7));

        html += holder;
    }

    {//Create footer
        var footer = DQX.DocEl.Div();
        var footer_txt = DQX.DocEl.Span({ parent: footer, id: (that.getSubId("Footer")) });
        footer.addStyle("clear", "both");
        footer.addStyle("padding-top", "3px");
        html += footer;
    }

    that.rootelem.html(html);


    that.myTable = DQX.QueryTable.Table(iid, idatafetcher);

    DQX.setKeyDownReceiver(iid, $.proxy(that.myTable.onKeyDown, that.myTable));

    return that;
}

//////////////////////////////////////////////////////////////////////////////////////////
// Chromosome plot
//////////////////////////////////////////////////////////////////////////////////////////

DQX.Gui.ChromoPlot = function (iid, args) {
    var that = DQX.Gui.GuiComponent(iid, args);

    that.leftsize = 120; //size of the fixed scale
    that.rightsize = 80; //size of the fixed scale

    that.bodyHeight = args.fixedSize;

    var html = '';
    var width = that.rootelem.width();

    that.vScrollWidth = 20;

    {//Create header
        var header = DQX.DocEl.Div({ id: that.getSubId("Header") });
        header.addStyle("white-space", "nowrap").addStyle("overflow", "hidden");
        header.setWidthFull();
        header.addStyle('padding-bottom', '5px');
        var chromopicker = DQX.DocEl.Select([], '', { parent: header, id: that.getSubId("ChromoPicker") });
        DQX.DocEl.Span({ id: that.getSubId("HeaderExtra"), parent: header });
        html += header;
    }

    {//Create body
        var body = DQX.DocEl.Div({ id: that.getSubId("Body") });
        body.addStyle("white-space", "nowrap").addStyle("overflow", "hidden");
        body.addStyle('position','relative');
        var cnvleft = DQX.DocEl.Create('canvas', { parent: body, id: that.getSubId("Left") });
        cnvleft.setWidthPx(that.leftsize).setHeightPx(that.bodyHeight);
        cnvleft.addAttribute("width", that.leftsize).addAttribute("height", that.bodyHeight);
        var cnvcenter = DQX.DocEl.Create('canvas', { parent: body, id: that.getSubId("Center") });
        cnvcenter.setWidthPx(width - 1 - that.leftsize - that.rightsize - that.vScrollWidth).setHeightPx(that.bodyHeight);
        cnvcenter.addAttribute("width", width - 1 - that.leftsize - that.rightsize).addAttribute("height", that.bodyHeight);
        var cnvright = DQX.DocEl.Create('canvas', { parent: body, id: that.getSubId("Right") });
        cnvright.setWidthPx(that.rightsize).setHeightPx(that.bodyHeight);
        cnvright.addAttribute("width", that.rightsize).addAttribute("height", that.bodyHeight);

        var scrolldiv = DQX.DocEl.Div({ parent: body, id: that.getSubId("Scrollarea") });
        scrolldiv.setWidthPx(that.vScrollWidth);
        scrolldiv.setHeightPx(that.bodyHeight);
//        scrolldiv.setBackgroundColor(DQX.Color(0.21, 0, 0));
        scrolldiv.addStyle("position", "absolute");
        scrolldiv.addStyle("right", "0px");
        scrolldiv.addStyle("top", "0px");
        html += body;
    }

    {//Create scrollbar area
        var el = DQX.DocEl.Div();
        el.addStyle("white-space", "nowrap").addStyle("overflow", "hidden");
        var scroll = DQX.DocEl.Create('canvas', { parent: el, id: that.getSubId("HScroller") });
        scroll.addAttribute("width", width - 1).addAttribute("height", 30);
        scroll.setWidthPx(width - 1).setHeightPx(30);
        html += el;
    }

    {//Create footer
        var footer = DQX.DocEl.Div();
        //footer.addStyle("white-space", "nowrap").addStyle("overflow", "hidden");
        footer.setWidthFull();
        footer.addStyle('padding', '5px');
        footer.addElem('<span class="DQXDarkFrameHighlight">Find feature:</span>&nbsp;&nbsp;');
        var geneselector = DQX.DocEl.Edit('', { parent: footer, id: that.getSubId("FindGene") });
        footer.addElem('&nbsp;<span class="DQXInfoButton">HelpChromoBrowserFindGene</span>&nbsp;&nbsp;');
        var genereporter = DQX.DocEl.Span({ parent: footer, id: that.getSubId("GeneHits") });
        html += footer;
    }

    that.rootelem.html(html);
    that.myChromoPlot = ChromoPlotter(iid, args.config);


    that.onResize = function () {
        var width = this.rootelem.width() - that.leftsize - that.rightsize - 1 - that.vScrollWidth;
        var height = this.myChromoPlot.sizeY;
        this.myChromoPlot.resize(width, height);
        if (this.myChromoPlot.myHScroller) {
            this.myChromoPlot.myHScroller.resize(this.rootelem.width() - 1 - that.vScrollWidth);
            this.myChromoPlot.zoomScrollTo(this.myChromoPlot.myHScroller.scrollPos, this.myChromoPlot.myHScroller.ScrollSize);
        }
    }

    that.onKeyDown = function (ev) {
        return this.myChromoPlot.onKeyDown(ev);
    }
    DQX.setKeyDownReceiver(iid, $.proxy(that.onKeyDown, that));


    return that;
}