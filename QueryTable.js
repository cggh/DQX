define([DQXSCJQ(), DQXSC("Utils"), DQXSC("DocEl"), DQXSC("Msg"), DQXSC("FramePanel"), DQXSC("Controls")],
    function ($, DQX, DocEl, Msg, FramePanel, Controls) {

        var QueryTable = {}


        //////////////////////////////////////////////////////////////////////////////////////////
        // Query table FramePanel
        //////////////////////////////////////////////////////////////////////////////////////////
        // argument idatafetcher: of type DataFetchers.Table
        //
        // *** Optional settings **********
        // args.leftfraction: relative size of the left, nonscrolling component of the table
        //
        // NOTE: most of the functionality for managing the querytable should be accessed via
        // the member object returned by getTable, which is of type QueryTable.Table
        //////////////////////////////////////////////////////////////////////////////////////////


        QueryTable.Panel = function (iParentRef, idatafetcher, args) {
            var that = FramePanel(iParentRef);
            DQX.requireMemberFunction(idatafetcher, "setSortOption");

            var html = '';
            {//Create header
                var header = DocEl.Div();
                header.setCssClass("DQXLight");
                header.addStyle('padding-bottom', '5px');
                var pager_txt = DocEl.Span({ parent: header, id: that.getSubId("Pager") });
                html += header;
            }
            {//Create nonscrolling & scrolling tables
                var holder = DocEl.Div({ id: that.getSubId("BodyHolder") });
                var div1 = DocEl.Div({ parent: holder });
                div1.makeFloatLeft().addStyle('overflow', 'auto');
                div1.addStyle('max-width', (args.leftfraction || 50).toString() + '%');
                var tablebody1 = DocEl.Div({ parent: div1, id: that.getSubId("Body1") });
                tablebody1.addStyle("overflow-x", "scroll").addStyle("overflow-y", "hidden");
                tablebody1.addStyle("border-width", '0px');
                tablebody1.addStyle("border-right-width", '2px');
                tablebody1.addStyle("border-style", 'solid');
                tablebody1.addStyle("border-color", 'rgb(60,60,60)');
                var div2 = DocEl.Div({ parent: holder, id: that.getSubId("BodyContainer") });
                div2.addStyle('overflow', 'auto'); //.setWidthPc(95);
                var tablebody2 = DocEl.Div({ parent: div2, id: that.getSubId("Body2") });
                tablebody2.addStyle("overflow-x", "scroll").addStyle("overflow-y", "hidden");
                tablebody2.setBackgroundColor(DQX.Color(0.7, 0.7, 0.7));
                html += holder;
            }
            {//Create footer
                var footer = DocEl.Div();
                var footer_txt = DocEl.Span({ parent: footer, id: (that.getSubId("Footer")) });
                footer.addStyle("clear", "both");
                footer.addStyle("padding-top", "3px");
                html += footer;
            }
            //Render html
            that.getRootElem().html(html);

            //This creates the object that holds the actual table management code
            that.myTable = QueryTable.Table(that.getDivID(), idatafetcher);
            that.myTable.autoSizeHeight = true;

            //Returns the actual table object
            that.getTable = function () { return this.myTable; }

            DQX.setOnHoverKeyDownReceiver(that.getID(), $.proxy(that.myTable.onKeyDown, that.myTable));

            //Internal: returns the total vertical size of the table
            that._getVerticalUserSize = function () {
                return $('#' + that.getSubId("BodyHolder")).outerHeight() + $('#' + that.getSubId("Pager")).outerHeight() + $('#' + that.getSubId("Footer")).outerHeight(); ;
            }

            //Implements an event handler from FramePanel
            that.onResize = function () {
                var availabeH = this.getRootElem().innerHeight() - DQX.scrollBarWidth - 25;
                var lineH = 21;
                if (availabeH != this.lastAvailabeH) {
                    this.myTable.myPageSize = Math.max(1, Math.floor((availabeH - 70) / lineH));
                    this.myTable.render();
                    var ctr = 0;
                    do {
                        var requiredH = this._getVerticalUserSize();
                        if (requiredH + lineH < availabeH)
                            this.myTable._onMoreLines();
                        ctr++;
                    }
                    while ((requiredH + lineH < availabeH) && (ctr < 5) && (requiredH > 0))
                    var ctr = 0;
                    do {
                        var requiredH = this._getVerticalUserSize();
                        if (requiredH > availabeH)
                            this.myTable._onLessLines();
                        ctr++;
                    }
                    while ((requiredH > availabeH) && (ctr < 5) && (requiredH > 0));
                }
                this.lastAvailabeH = availabeH;
            }

            return that;
        }


        //Defines a column in a query table
        //Name is the displayed title of the column
        //CompID is the identifier of the column in the data fetcher
        //Tablepart can be 0 or 1 to define the left or right part
        QueryTable.Column = function (iName, iCompID, iTablePart) {
            var that = {};
            that.myName = DQX.interpolate(iName);
            that.myCompID = iCompID;
            that.myComment = '';
            that.minWidth = 10;
            that.TablePart = iTablePart;
            that._visible = true;
            that._hyperlinkCellMessageScope = null;
            that._hyperlinkCellHint = '';
            that._hyperlinkHeaderMessageScope = null;
            that._hyperlinkHeaderHint = '';

            //Overridable. Returns the displayed cell text, given its original content
            that.CellToText = function (content) { return content; }

            //Overridable. Returns the background color of a cell, given its content
            that.CellToColor = function (content) { return "white"; }
            if (that.TablePart == 0)
                that.CellToColor = function (content) { return "rgb(240,240,240)"; }

            //Use this function to convert a column cell into a hyperlink.
            //A message will be sent when the user clicks the link (see Msg for further details about messageScope)
            //Optionally, a hint text can be provided that will be displayed when hovering over the hyperlink
            that.makeHyperlinkCell = function (messageScope, hint) {
                this._hyperlinkCellMessageScope = messageScope;
                if (hint)
                    this._hyperlinkCellHint = hint;
            }

            //Use this function to convert a column header into a hyperlink.
            //A message will be sent when the user clicks the link (see Msg for further details about messageScope)
            //Optionally, a hint text can be provided that will be displayed when hovering over the hyperlink
            that.makeHyperlinkHeader = function (messageScope, hint) {
                this._hyperlinkHeaderMessageScope = messageScope;
                if (hint)
                    this._hyperlinkHeaderHint = hint;
            }

            //Returns the visibility status of a column
            that.isVisible = function () {
                return this._visible;
            }

            //Modifies the visibility status of a column
            that.setVisible = function (newStatus) {
                this._visible = newStatus;
            }

            that.setMinWidth = function (val) {
                this.minWidth = val;
            }

            return that;
        }



        ///////////////////////////////////////////////////////////////////////////////
        // The Query table class
        ///////////////////////////////////////////////////////////////////////////////
        // This should not be instantiated independently, but is automaticall created as a member of QueryTable.Panel

        QueryTable.Table = function (iBaseID, iDataFetcher) {
            var that = {};
            that.myBaseID = iBaseID;
            that.myDataFetcher = iDataFetcher;
            that.myColumns = [];
            that.mySortOptions = [];
            that.myPageSize = 20;
            that.hasHighlight = true;
            that._highlightRowNr = -1;
            that.myDataFetcher.myDataConsumer = that;

            that._dataValid = false; //false= does not have valid data
            that.myTableOffset = 0;
            that.totalRecordCount = -1; //means not yet determined

            //Internal usage. Finds a html element in the cluster of elements that define this table
            that.getElementID = function (extension) {
                return this.myBaseID + extension;
            }

            //Internal usage. Finds a html element in the cluster of elements that define this table
            that.getElement = function (extension) {
                var id = "#" + this.myBaseID + extension;
                var rs = $(id);
                if (rs.length == 0)
                    DQX.reportError("Missing query table element " + id);
                return rs;
            }

            //Adds a new column to the table, providing a QueryTable.Column
            that.addTableColumn = function (iCol) {
                DQX.requireMemberFunction(iCol, 'CellToText');
                this.myDataFetcher.activateFetchColumn(iCol.myCompID);
                this.myColumns.push(iCol);
                return iCol;
            }

            //finds and returns a column definition, providing the column identifier. returns null if not found
            that.findColumn = function (iColID) {
                for (var colnr in this.myColumns)
                    if (this.myColumns[colnr].myCompID == iColID)
                        return this.myColumns[colnr];
                return null;
            }

            //finds and returns a column definition, providing the column identifier. Throws an error if not found
            that.findColumnRequired = function (iColID) {
                var rs = this.findColumn(iColID);
                if (!rs)
                    DQX.reportError('Column id "{id}" not found in query table'.DQXformat({ id: iColID }));
                return rs;
            }

            //Adds a new sort option to the table
            //iOption: of type SQL.TableSort
            that.addSortOption = function (iName, iOption) {
                DQX.requireMemberFunction(iOption, 'getPrimaryColumnID');
                this.mySortOptions.push({ name: iName, Option: iOption });
                this.findColumnRequired(iOption.getPrimaryColumnID()).sortOption = iOption;
            }

            //This function is called by the datafetcher to inform the table that new data is ready. In reaction, we render the table
            that.notifyDataReady = function () {
                if (this.myDataFetcher.isValid())
                    this._dataValid = true;
                this.render();
            }

            that._onForward = function () {
                if (this.myTableOffset + this.myPageSize < this.totalRecordCount) {
                    this.myTableOffset += this.myPageSize;
                    this.render();
                }
                return false;
            }

            that._onFirst = function () {
                this.myTableOffset = 0;
                this.render();
                return false;
            }

            that._onBack = function () {
                this.myTableOffset -= this.myPageSize;
                if (this.myTableOffset < 0) this.myTableOffset = 0;
                this.render();
                return false;
            }

            that._onLast = function () {
                this.myTableOffset = (Math.floor((this.totalRecordCount) / this.myPageSize)) * this.myPageSize;
                this.render();
                return false;
            }

            that._onMoreLines = function () {
                that.myPageSize += 1;
                this.render();
                return false;
            }

            that._onLessLines = function () {
                that.myPageSize = Math.max(1, that.myPageSize - 1);
                this.render();
                return false;
            }

            that._onLineUp = function (message2) {
                this.myTableOffset = Math.max(0, this.myTableOffset - message2);
                this.render();
                return false;
            }

            that._onLineDown = function (message2) {
                this.myTableOffset = Math.max(0, Math.min(this.totalRecordCount - this.myPageSize + 4, this.myTableOffset + message2));
                this.render();
                return false;
            }

            that.scrollHighlightRowInView = function () {
                if (this._highlightRowNr < 0) return;
                if (this._highlightRowNr < this.myTableOffset) {
                    this.myTableOffset = Math.max(0, this._highlightRowNr - 3);
                    this.render();
                }
                if (this._highlightRowNr >= this.myTableOffset + this.myPageSize) {
                    this.myTableOffset = Math.max(0, Math.min(this.totalRecordCount - this.myPageSize + 4, this._highlightRowNr - this.myPageSize + 4));
                    this.render();
                }
            }


            //Forces a reload of the table information
            that.reLoadTable = function () {
                this.totalRecordCount = -1; //means not yet determined
                this.myDataFetcher.clearData();
                this.myTableOffset = 0;
                this._highlightRowNr = -1;
                this.render();
            }

            //Causes the current table information to be invalidated (does not initiate a reload)
            that.invalidate = function () {
                if (this._dataValid) {
                    this._highlightRowNr = -1;
                    this._dataValid = false;
                    this.render();
                }
            }

            //Defines the restricting query that is used to return the table content
            //iquery should be one of the query objects defined in SQL.WhereClause
            that.setQuery = function (iquery) {
                this._highlightRowNr = -1;
                this.myDataFetcher._userQuery1 = iquery;
                this._dataValid = true;
            }


            //Renders the table to html
            that.render = function () {
                DQX.pushActivity("Creating table");

                if (!this._pagerCreated) {
                    var rs_pager = "";
                    rs_pager += '<span style="position:relative;bottom:-2px;">';
                    var navButtonControls = [];
                    navButtonControls.push(Controls.Button(that.myBaseID + '_goFirst', { bitmap: DQXBMP('first.png'), description: 'First page', buttonClass: 'DQXBitmapButton', fastTouch: true }).setOnChanged($.proxy(that._onFirst, that)));
                    navButtonControls.push(Controls.Button(that.myBaseID + '_goPrevious', { bitmap: DQXBMP('previous.png'), description: 'Previous page', buttonClass: 'DQXBitmapButton', fastTouch: true }).setOnChanged($.proxy(that._onBack, that)));
                    navButtonControls.push(Controls.Button(that.myBaseID + '_goNext', { bitmap: DQXBMP('next.png'), description: 'Next page', buttonClass: 'DQXBitmapButton', fastTouch: true }).setOnChanged($.proxy(that._onForward, that)));
                    navButtonControls.push(Controls.Button(that.myBaseID + '_goLast', { bitmap: DQXBMP('lastpage.png'), description: 'Last page', buttonClass: 'DQXBitmapButton', fastTouch: true }).setOnChanged($.proxy(that._onLast, that)));
                    this.navButtonControls = navButtonControls;
                    $.each(navButtonControls, function (idx, bt) { rs_pager += bt.renderHtml(); });
                    rs_pager += '</span>';
                    rs_pager += '<span id="{id}" style="display:inline-block; vertical-align:middle"></span>'.DQXformat({ id: that.myBaseID + '_status' });

                    var rightgroup = DocEl.Span({ id: that.myBaseID + '_right' });
                    rightgroup.addStyle('float', 'right');
                    rightgroup.addStyle('vertical-align', 'bottom');
                    rightgroup.addStyle('position', 'relative');
                    rightgroup.addStyle('top', '5px');
                    rightgroup.addStyle('right', '5px');
                    rs_pager += rightgroup.toString();

                    this.getElement('Pager').html(rs_pager);
                    Controls.ExecPostCreateHtml();
                    this._pagerCreated = true;
                }



                var row1 = Math.max(0, this.myTableOffset - 200);
                var row2 = this.myTableOffset + this.myPageSize + 200;
                var datacomplete = false;

                if (this._dataValid)
                    datacomplete = this.myDataFetcher.IsDataReady(row1, row2, true);

                this.totalRecordCount = -1;
                if ('totalRecordCount' in this.myDataFetcher)
                    this.totalRecordCount = this.myDataFetcher.totalRecordCount;

                if (this.totalRecordCount == 0) {
                    st = '<span style="background-color:rgb(255,128,128)"><b>This result set does not contain any data</b><span>';
                }
                else {
                    var st = "&nbsp;&nbsp;&nbsp;Current: " + (this.myTableOffset + 1) + "-" + (this.myTableOffset + this.myPageSize);
                    st += '; Total: ' + this.totalRecordCount;
                }
                $('#' + that.myBaseID + '_status').html(st);


                if (datacomplete && this._dataValid) {
                    var downloadlink = this.myDataFetcher.createDownloadUrl();
                    var downloadHtml = '<a href=' + downloadlink + '><IMG class="DQXBitmapLink" SRC=' + DQXBMP('download.png') + ' border=0 title="Download this data as TAB-delimited file" ALT="Download"></a>';
                    var downloadHtml = '<a href=' + downloadlink + '><span class="DQXHyperlink">Download<br>table</span></a>';
                    $('#' + that.myBaseID + '_right').html(downloadHtml);
                }
                else
                    $('#' + that.myBaseID + '_right').html('');



                var rs_table = [];
                for (var tbnr = 0; tbnr <= 1; tbnr++)
                    if (this._dataValid)
                        rs_table[tbnr] = '<table class="DQXQueryTable">';
                    else
                        rs_table[tbnr] = '<table class="DQXQueryTable DQXQueryTableInvalid">';

                //write headers
                for (var colnr in this.myColumns) {
                    var thecol = this.myColumns[colnr];
                    if (thecol.isVisible()) {
                        var tbnr = thecol.TablePart;
                        rs_table[tbnr] += '<th TITLE="{comment}"><div id="{theid}" class="DQXQueryTableHeaderText" style="position:relative;padding-right:15px;height:100%;min-width:{minw}px">'
                            .DQXformat({ comment: thecol.myComment, theid: (thecol.myCompID + '~headertext~' + this.myBaseID), minw: thecol.minWidth });
                        rs_table[tbnr] += thecol.myName;
                        if (thecol.myName.indexOf('<br>') < 0)
                            rs_table[tbnr] += '<br>&nbsp;';
                        if (thecol.sortOption) {
                            var bitmapname = DQXBMP("arrow5down.png");
                            if (this.myDataFetcher.positionField == thecol.sortOption.toString()) {
                                if (!this.myDataFetcher.sortReverse)
                                    bitmapname = DQXBMP("arrow4down.png");
                                else
                                    bitmapname = DQXBMP("arrow4up.png");
                            }
                            var st = '<IMG class="DQXQueryTableSortHeader" id="{id}" SRC={bmp} border=0 class="DQXBitmapLink" title="Sort by this column" ALT="Link" style="position:absolute;right:-4px;bottom:-3px">'.
                                DQXformat({ id: thecol.myCompID + '~sort~' + this.myBaseID, bmp: bitmapname });
                            rs_table[tbnr] += ' ' + st;
                        }
                        if (thecol._hyperlinkHeaderMessageScope) {
                            var st = '<IMG class="DQXQueryTableLinkHeader" id="{theid}" SRC=' + DQXBMP('link2.png') + ' border=0 class="DQXBitmapLink" ALT="Link" title="{theid}" style="position:absolute;right:-5px;top:-5px">'
                            st = st.DQXformat({ theid: (thecol.myCompID + '~headerlink~' + this.myBaseID), hint: thecol._hyperlinkHeaderHint });
                            rs_table[tbnr] += ' ' + st;
                        }
                        rs_table[tbnr] += "</div>";
                        rs_table[tbnr] += "</th>";
                    }
                }



                if ((this._dataValid) && (!datacomplete)) $('#' + that.myBaseID + '_status').html('<span style="background-color:rgb(255,0,0);font-weight:bold;">FETCHING...</span>');
                if (this.hasFetchFailed) $('#' + that.myBaseID + '_status').html('<span style="background-color:rgb(255,0,0);font-weight:bold;">FETCH FAILED !!!</span>');

                for (var rownr0 = 0; rownr0 < this.myPageSize; rownr0++) {
                    var rownr = this.myTableOffset + rownr0;
                    /*if (rownr < this.totalRecordCount)*/
                    {
                        var downloadrownr = this.myDataFetcher.findIndexByXVal(rownr);
                        for (var tbnr = 0; tbnr <= 1; tbnr++)
                            rs_table[tbnr] += '<tr class="DQXTableRow" id="{id}">'.DQXformat({ id: rownr + '_row_' + this.myBaseID + '_' + tbnr });
                        for (var colnr in this.myColumns) {
                            var thecol = this.myColumns[colnr];
                            if (thecol.isVisible()) {
                                var tbnr = thecol.TablePart;
                                var hascontent = false;
                                var cell_color = "white";
                                var cell_content = "&nbsp;";
                                var cell_title = "";
                                if ((this.totalRecordCount < 0) || (rownr < this.totalRecordCount)) cell_content = "?";
                                if (downloadrownr >= 0) {
                                    hascontent = true;
                                    cell_content = this.myDataFetcher.getColumnPoint(downloadrownr, thecol.myCompID);
                                    if (thecol.customTextCreator)
                                        cell_content = thecol.customTextCreator(this.myDataFetcher, downloadrownr);
                                    cell_color = thecol.CellToColor(cell_content);
                                    cell_content = thecol.CellToText(cell_content);
                                    cell_title = cell_content;
                                }
                                rs_table[tbnr] += "<td style='background-color:" + cell_color + "'>";
                                var isLink = false;
                                if ((thecol._hyperlinkCellMessageScope) && (hascontent)) {
                                    isLink = true;
                                    var linkID = thecol.myCompID + '~' + rownr + '~link~' + this.myBaseID;
                                    rs_table[tbnr] += '<span class="DQXQueryTableLinkCell" id="{id}">'.DQXformat({ id: linkID });
                                    rs_table[tbnr] += '<IMG SRC="' + DQXBMP('link3.png') + '" border=0  id={id} title="{hint}" ALT="Link"> '.
                                        DQXformat({ hint: thecol._hyperlinkCellHint, id: linkID });
                                }
                                rs_table[tbnr] += cell_content;
                                if (isLink)
                                    rs_table[tbnr] += '</span>';
                                rs_table[tbnr] += "</td>";
                            }
                        }
                    }
                    for (var tbnr = 0; tbnr <= 1; tbnr++)
                        rs_table[tbnr] += "</tr>";
                }
                for (var tbnr = 0; tbnr <= 1; tbnr++)
                    rs_table[tbnr] += "</table>";

                this.getElement('Footer').html('');
                this.getElement('Body1').html(rs_table[0]);
                this.getElement('Body2').html(rs_table[1]);


                if (this._highlightRowNr >= 0)
                    for (var tbnr = 0; tbnr <= 1; tbnr++)
                        $('#' + that.myBaseID).find('#' + this._highlightRowNr + '_row_' + that.myBaseID + '_' + tbnr).addClass("DQXTableRowSelected");


                $('#' + this.myBaseID).find('.DQXQueryTableLinkCell').click($.proxy(that._onClickLinkCell, that));
                $('#' + this.myBaseID).find('.DQXQueryTableHeaderText').click($.proxy(that._onClickLinkHeader, that));
                //$('#' + this.myBaseID).find('.DQXQueryTableLinkHeader').click($.proxy(that._onClickLinkHeader, that));
                //$('#' + this.myBaseID).find('.DQXQueryTableSortHeader').click($.proxy(that._onClickSortHeader, that));
                $('#' + this.myBaseID).find('.DQXTableRow').mouseenter(that._onRowMouseEnter);
                $('#' + this.myBaseID).find('.DQXTableRow').mouseleave(that._onRowMouseLeave);
                $('#' + this.myBaseID).find('.DQXTableRow').mousedown(that._onRowMouseDown);

                this.navButtonControls[0].enable(this.myTableOffset > 0);
                this.navButtonControls[1].enable(this.myTableOffset > 0);
                var endReached = this.myTableOffset + this.myPageSize >= this.totalRecordCount;
                this.navButtonControls[2].enable(!endReached);
                this.navButtonControls[3].enable(!endReached);

                DQX.popActivity();
            }

            //Sets the highlight to a new row
            that.modifyHightlightRow = function (newRowNr) {
                if (this.hasHighlight) {
                    if (newRowNr >= 0) {
                        if ((!this._dataValid) || (this.totalRecordCount <= 0)) return;
                        newRowNr = Math.max(0, newRowNr);
                        newRowNr = Math.min(this.totalRecordCount - 1, newRowNr);
                    }
                    else newRowNr = -1;
                    if (that._highlightRowNr != newRowNr) {
                        that._highlightRowNr = newRowNr;
                        $('#' + that.myBaseID).find('.DQXTableRow').removeClass("DQXTableRowSelected");
                        for (var tbnr = 0; tbnr <= 1; tbnr++)
                            $('#' + that.myBaseID).find('#' + newRowNr + '_row_' + that.myBaseID + '_' + tbnr).addClass("DQXTableRowSelected");
                        Msg.broadcast({ type: "HighlightRowModified", id: this.myBaseID }, this);
                    }
                }
            }

            //Determines if a row is currently hightlighted
            that.hasHighlightRow = function () {
                return that._highlightRowNr >= 0;
            }

            //Returns the row number of the currently highlighted row
            that.getHighlightRowNr = function () {
                return that._highlightRowNr;
            }

            //Returns the content of a cell, identifier by the row number and column identifier
            that.getCellValue = function (rownr, colID) {
                var downloadrownr = this.myDataFetcher.findIndexByXVal(rownr);
                if (downloadrownr < 0) return null;
                return that.myDataFetcher.getColumnPoint(downloadrownr, colID);
            }

            that._onRowMouseDown = function (ev) {
                var id = $(this).attr('id');
                var downloadrownr = id.split('_')[0];
                if (downloadrownr >= 0) that.modifyHightlightRow(downloadrownr);
            }


            that._onRowMouseEnter = function (ev) {
                var id = $(this).attr('id');
                var rownr = id.split('_')[0];
                if (rownr >= 0) {
                    for (var tbnr = 0; tbnr <= 1; tbnr++)
                        $('#' + that.myBaseID).find('#' + rownr + '_row_' + that.myBaseID + '_' + tbnr).addClass("DQXTableRowHover");
                }
            }

            that._onRowMouseLeave = function (ev) {
                var id = $(this).attr('id');
                var rownr = id.split('_')[0];
                if (rownr >= 0) {
                    for (var tbnr = 0; tbnr <= 1; tbnr++)
                        $('#' + that.myBaseID).find('#' + rownr + '_row_' + that.myBaseID + '_' + tbnr).removeClass("DQXTableRowHover");
                }
            }

            that._onClickLinkCell = function (ev) {
                var tokens = ev.target.id.split('~');
                var column = this.findColumn(tokens[0]);
                Msg.broadcast(column._hyperlinkCellMessageScope, parseInt(tokens[1]));
            }

            that._onClickLinkHeader = function (ev) {
                var tokens = ev.target.id.split('~');
                var column = this.findColumn(tokens[0]);
                Msg.broadcast(column._hyperlinkHeaderMessageScope, tokens[0]);
                return false;
            }

            that._onClickSortHeader = function (ev) {
                var tokens = ev.target.id.split('~');
                var column = this.findColumn(tokens[0]);

                var newPositionField = column.sortOption.toString();
                if (this.myDataFetcher.positionField != newPositionField)
                    this.myDataFetcher.sortReverse = false;
                else
                    this.myDataFetcher.sortReverse = !this.myDataFetcher.sortReverse;
                this.myDataFetcher.positionField = newPositionField;
                this.myDataFetcher.clearData();
                this.myTableOffset = 0;
                this._highlightRowNr = -1;
                this.render();
                return false;
            }

            that.sortByColumn = function (colid, reverse) {
                var column = this.findColumn(colid);
                var newPositionField = column.sortOption.toString();
                this.myDataFetcher.sortReverse = reverse;
                this.myDataFetcher.positionField = newPositionField;
                this.myDataFetcher.clearData();
                this.myTableOffset = 0;
                this._highlightRowNr = -1;
                this.render();
            }

            //This function is called when a key was pressed
            that.onKeyDown = function (ev) {
                if (ev.keyCode == 40) {//line down
                    if (this.hasHighlight) {
                        this.modifyHightlightRow(this._highlightRowNr + 1);
                        this.scrollHighlightRowInView();
                    }
                    else
                        this._onLineDown(1);
                    return true;
                }
                if (ev.keyCode == 38) {//line up
                    if (this.hasHighlight) {
                        this.modifyHightlightRow(Math.max(0, this._highlightRowNr - 1));
                        this.scrollHighlightRowInView();
                    }
                    else
                        this._onLineUp(1);
                    return true;
                }
                if (ev.keyCode == 33) {//page up
                    if (this.hasHighlight) {
                        this.modifyHightlightRow(Math.max(0, this._highlightRowNr - this.myPageSize));
                        this.scrollHighlightRowInView();
                    }
                    else
                        that._onBack();
                    return true;
                }
                if (ev.keyCode == 34) {//page down
                    if (this.hasHighlight) {
                        this.modifyHightlightRow(Math.max(0, this._highlightRowNr + this.myPageSize));
                        this.scrollHighlightRowInView();
                    }
                    else
                        that._onForward();
                    return true;
                }
                return false;
            }

            that.OnMouseWheel = function (ev) {
                var delta = DQX.getMouseWheelDelta(ev);
                if (delta < 0)
                    this._onLineDown(3);
                if (delta > 0)
                    this._onLineUp(3);
                return false;
            }
            /*
            that.handleTouchStart = function (info, ev) {
            that._dragstartoffsetX = that.getElement("Body2").scrollLeft();
            this._dragTableOffset = this.myTableOffset;
            that._dragstartx = info.pageX;
            that._dragstarty = info.pageY;
            }

            that.handleTouchMove = function (info, ev) {
            that.getElement("Body2").scrollLeft(that._dragstartoffsetX - (info.pageX - that._dragstartx))
            var newOffset = Math.round(this._dragTableOffset - (info.pageY - that._dragstarty) / 21);
            if (newOffset != this.myTableOffset) {
            this.myTableOffset = newOffset;
            this.render();
            }
            }
            */

            that.onResize = function () {
            }



            //Initialise some event handlers
            that.getElement('Body1').bind('DOMMouseScroll mousewheel', $.proxy(that.OnMouseWheel, that));
            that.getElement('Body2').bind('DOMMouseScroll mousewheel', $.proxy(that.OnMouseWheel, that));

            //DQX.augmentTouchEvents(that, that.getElementID('Body2'), true, false);

            return that;
        }



        return QueryTable;
    });
      
    

