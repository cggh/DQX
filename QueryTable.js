// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

define(["jquery", "DQX/Utils", "DQX/DocEl", "DQX/Msg", "DQX/FramePanel", "DQX/Controls", "DQX/SQL", "DQX/QueryBuilder", "DQX/DataFetcher/DataFetchers"],
    function ($, DQX, DocEl, Msg, FramePanel, Controls, SQL, QueryBuilder, DataFetchers) {

        var QueryTable = {}


        //////////////////////////////////////////////////////////////////////////////////////////
        // Query table FramePanel
        //////////////////////////////////////////////////////////////////////////////////////////
        // argument idatafetcher: of type DataFetchers.Table
        //
        // *** Optional settings **********
        // args.leftfraction: relative size of the left, nonscrolling component of the table (if not specified, this part is not present)
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
                header.setCssClass("DQXButtonBar");
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
                tablebody1.makeVisibleHorizontalScroller(false).addStyle("overflow-y", "hidden");
                tablebody1.addStyle("border-width", '0px');
                tablebody1.addStyle("border-right-width", '2px');
                tablebody1.addStyle("border-style", 'solid');
                tablebody1.addStyle("border-color", 'rgb(220,220,220)');
                var div2 = DocEl.Div({ parent: holder, id: that.getSubId("BodyContainer") });
                div2.addStyle('overflow', 'auto'); //.setWidthPc(95);
                var tablebody2 = DocEl.Div({ parent: div2, id: that.getSubId("Body2") });
                tablebody2.makeVisibleHorizontalScroller(true).addStyle("overflow-y", "hidden");
                tablebody2.setBackgroundColor(DQX.Color(0.98, 0.98, 0.98));
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


            that.invalidateQuery = function() {
                that.myTable.invalidate();
            };



            // Creates an advanced query tool panel for this table, in the frame provided
            // callBackFunction is called everytime the query was changed
            that.createPanelAdvancedQuery = function(iFrame, callBackFunction, noAutoUpdate, iSettings) {
                var settings = {};
                settings.noUpdate = noAutoUpdate;
                if (iSettings)
                    settings = $.extend(settings,iSettings);
                var panelAdvancedQueryBuilder = QueryBuilder.Panel(iFrame, settings);
                var builder = panelAdvancedQueryBuilder;
                var dataFetcher = this.myTable.myDataFetcher;

                var updateAdvancedQuery = function () {
                    var thequery = builder.getQuery();
                    that.myTable.setQuery(thequery);
                    that.myTable.reLoadTable();
                };

                if (!noAutoUpdate) {
                    //Attach message handler that update the query results when requested
                    Msg.listen("",{type:"RequestUpdateQuery",id:builder.myDivID}, function() {
                        updateAdvancedQuery();
                        if (callBackFunction)
                            callBackFunction();
                    });
                    //Attach message handler that invalidates the query results when requested
                    Msg.listen("",{type:"QueryModified",id:builder.myDivID}, function() {
                        that.invalidateQuery();
                    });
                }

                $.each(that.myTable.myColumns, function(idx,colinfo) {
                    //var dataType="String";//Float,Integer,MultiChoiceInt
                    if (!colinfo.colIsClientGenerated) {
                        var fetchInfo = dataFetcher.getFetchColumn(colinfo.myCompID);
                        var dataType = fetchInfo.myEncodingType;
                        var choiceList = null;
                        if (colinfo._datatype_MultipleChoiceInt) {
                            dataType = "MultiChoiceInt";
                            choiceList = colinfo._datatype_MultipleChoiceInt;
                        }
                        if (colinfo._datatype_MultipleChoiceString) {
                            dataType = "String";
                            choiceList = colinfo._datatype_MultipleChoiceString;
                        }

                        queryColInfo = SQL.TableColInfo(colinfo.myCompID, colinfo.myName, dataType, choiceList);
                        if (colinfo.CellToText)
                            queryColInfo.content2Display = colinfo.CellToText;
                        if (colinfo.CellToTextInv)
                            queryColInfo.display2Content = colinfo.CellToTextInv;
                        if (colinfo.GroupName)
                            queryColInfo.GroupName = colinfo.GroupName;
                        builder.addTableColumn(queryColInfo);
                    }
                });

                //Initialise the query builder
                //builder._createNewStatement(builder.root);
                builder.render();

                return builder;
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
            that.minWidth = 10;
            that.TablePart = iTablePart;
            that._visible = true;
            that._hyperlinkCellMessageScope = null;
            that._hyperlinkCellHint = '';
            that._hyperlinkHeaderMessageScope = null;
            that._headerClickHandler = null;
            that._cellClickHandler = null;
            that._toolTip = '';

            //Overridable. Returns the displayed cell text, given its original content
            that.CellToText = function (content) { return content; }

            //Overridable. Returns the background color of a cell, given its content
            that.CellToColor = function (content) { return "white"; }
            /*            if (that.TablePart == 0)
            that.CellToColor = function (content) { return "rgb(240,240,240)"; }*/

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
                    this.setToolTip(hint);
            }

            that.setToolTip = function(text) {
                this._toolTip=text;
            }

            that.setHeaderClickHandler = function(handler) {
                this._headerClickHandler=handler;
            }

            that.setCellClickHandler = function(handler, isExternal) {
                this._cellClickHandler=handler;
                this._cellClickHandlerIsExternal=isExternal;
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

            //Defines the datatype as a multiple choice list with integer id's (useful for automatic creation of query tools)
            that.setDataType_MultipleChoiceInt = function(choiceList) {
                this._datatype_MultipleChoiceInt=choiceList;
            }

            //Defines the datatype as a multiple choice list with string id's (useful for automatic creation of query tools)
            that.setDataType_MultipleChoiceString = function(choiceList) {
                this._datatype_MultipleChoiceString=choiceList;
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
            that._lastSelClickedRowNr = null;

            that.fetchBuffer = 200;
            that.recordCountFetchType = DataFetchers.RecordCountFetchType.IMMEDIATE;

            //Internal usage. Finds a html element in the cluster of elements that define this table
            that.getElementID = function (extension) {
                return this.myBaseID + extension;
            }

            that.isPresentInDOMTree = function() {
                var id = "#" + this.myBaseID;
                var rs = $(id);
                return (rs.length > 0);
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

            //Adds a new column to the table and automatically adds it to the data fetcher, providing a QueryTable.Column
            that.createTableColumn = function(
                iCol,            //A a QueryTable.Column object
                encodingType,     // Identifier for the encoding type for transfer (see DataFetchers.CurveColumn for list of possibilities)
                sortable,        // If true, this column will be sortable
                sortByDefault
            ) {
                this.myDataFetcher.addFetchColumn(iCol.myCompID, encodingType);
                var col = this.addTableColumn(iCol);
                if (sortable)
                    this.addSortOption(iCol.myName, SQL.TableSort([iCol.myCompID]), !!(sortByDefault));
                return col;
            }

            //Removes all the columns in the table (note: they will still be present in the datafetcher!)
            that.clearTableColumns = function () {
                $.each(this.myColumns, function (idx, col) {
                    that.myDataFetcher.deactivateFetchColumn(col.myCompID);
                });
                this.myColumns = [];
                this.mySortOptions = [];
            }

            that.createSelectionColumn = function(colID, colName, tableid, idcolumn, selectionManager, color, onChanged) {
                var col = QueryTable.Column(colName, colID, 0);
                col.isSelection = true;
                col.setCellClickHandler(function(myDataFetcher, rownr, info) {
                    var downloadrownr = myDataFetcher.findIndexByXVal(rownr);
                    if (downloadrownr < 0) return null;
                    var id = myDataFetcher.getColumnPoint(downloadrownr, idcolumn);
                    var prevState = selectionManager.isItemSelected(id);
                    if ( (!info.shiftPressed) || (that._lastSelClickedRowNr == null) ) {
                        selectionManager.selectItem(id,!prevState);
                    }
                    else {
                        for (var i=Math.min(downloadrownr,that._lastSelClickedRowNr); i<=Math.max(downloadrownr,that._lastSelClickedRowNr); i++) {
                            var id = myDataFetcher.getColumnPoint(i, idcolumn);
                            selectionManager.selectItem(id,!prevState);
                        }
                    }
                    that._lastSelClickedRowNr = downloadrownr;
                    if (onChanged)
                        onChanged();
                });
                col.colIsClientGenerated = true;
                col.colorString = color.toString();
                col.customTextCreator = function(myDataFetcher, downloadrownr) {
                    var id = myDataFetcher.getColumnPoint(downloadrownr, idcolumn);
                    var isSelected = selectionManager.isItemSelected(id);
                    return '<div style="width:20px;font-size: 14px;color:{cl}">&nbsp;<span class="fa {ic}"></span></div>'.DQXformat({
                        cl:isSelected?col.colorString:'rgb(170,170,170)',
                        ic: isSelected?'fa-check-circle':'fa-circle-thin'
                    });
//                    return '<span style="'+(selectionManager.isItemSelected(id)?'background-color:'+col.colorString:"")+';border:1px solid rgb(150,150,150)">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span>';
                };
                this.myColumns.push(col);

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

            // Adds a new sort option to the table
            // iOption: of type SQL.TableSort
            // Note: the first sort option added will be activated by default
            that.addSortOption = function (iName, iOption, isDefault) {
                DQX.requireMemberFunction(iOption, 'getPrimaryColumnID');
                this.mySortOptions.push({ name: iName, Option: iOption });
                var thecol = this.findColumn(iOption.getPrimaryColumnID());
                if (thecol)
                    thecol.sortOption = iOption;
                if ( (!this.startSortOptionSet) || (isDefault) ) {
                    this.startSortOptionSet=true;
                    this.myDataFetcher.setSortOption(iOption,false);
                }
            }

            that.getRecordCount = function() {
                if (that.totalRecordCount<0)
                    return null;
                else
                    return that.totalRecordCount;
            }

            that.getIsTruncatedRecordCount = function () {
                return that.isTruncatedRecordCount;
            }



            that.getSortColumn = function() {
                //this.myDataFetcher.sortReverse = reverse;
                return this.myDataFetcher.positionField;
            }


            //This function is called by the datafetcher to inform the table that new data is ready. In reaction, we render the table
            that.notifyDataReady = function () {
                if (this.myDataFetcher.isValid())
                    this._dataValid = true;
                this.render();
            }

            that._onForward = function () {
                if ((this.myTableOffset + this.myPageSize < this.totalRecordCount) || (this.totalRecordCount<0) ) {
                    this.myTableOffset += this.myPageSize;
                    that._lastSelClickedRowNr = null;
                    this.render();
                }
                return false;
            }

            that._onFirst = function () {
                this.myTableOffset = 0;
                this.render();
                that._lastSelClickedRowNr = null;
                return false;
            }

            that._onBack = function () {
                this.myTableOffset -= this.myPageSize;
                if (this.myTableOffset < 0) this.myTableOffset = 0;
                this.render();
                that._lastSelClickedRowNr = null;
                return false;
            }

            that._onLast = function () {
                this.myTableOffset = (Math.floor((this.totalRecordCount) / this.myPageSize)) * this.myPageSize;
                this.render();
                that._lastSelClickedRowNr = null;
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
                that._lastSelClickedRowNr = null;
                this.render();
                return false;
            }

            that._onLineDown = function (message2) {
                this.myTableOffset = Math.max(0, Math.min(this.totalRecordCount - this.myPageSize + 4, this.myTableOffset + message2));
                that._lastSelClickedRowNr = null;
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
                    var newOffset = this._highlightRowNr - this.myPageSize + 4;
                    if (this.totalRecordCount>=0)
                        var newOffset = Math.min(this.totalRecordCount - this.myPageSize + 4, newOffset);
                    this.myTableOffset = Math.max(0, newOffset);
                    this.render();
                }
            }


            that.queryAll = function() {
                this.setQuery(SQL.WhereClause.Trivial());
                this.reLoadTable();
            }

            //Forces a reload of the table information
            that.reLoadTable = function () {
                this.totalRecordCount = -1; //means not yet determined
                this.myDataFetcher.clearData();
                this.myTableOffset = 0;
                this._highlightRowNr = -1;
                that._lastSelClickedRowNr = null;
                this.render();
            }

            that.clearData = function() {
                this.totalRecordCount = -1; //means not yet determined
                this.myDataFetcher.clearData();
                this._highlightRowNr = -1;
                that._lastSelClickedRowNr = null;
            }

            //Causes the current table information to be invalidated (does not initiate a reload)
            that.invalidate = function () {
                if (this._dataValid) {
                    this._highlightRowNr = -1;
                    this._dataValid = false;
                    this.render();
                    $('#' + this.myBaseID + '_status').html('<span class="DQXImportantMessage">Query results are not up-to-date</span>');
                }
            }

            //Defines the restricting query that is used to return the table content
            //iquery should be one of the query objects defined in SQL.WhereClause
            that.setQuery = function (iquery) {
                this._highlightRowNr = -1;
                this.myDataFetcher.setUserQuery1(iquery);
                this._dataValid = true;
            }

            that.setTable = function (tablename) {
                this.myDataFetcher.setTableName(tablename);
            }


            //Renders the table to html
            that.render = function () {
                if (!that.isPresentInDOMTree())
                    return;
                DQX.pushActivity("Creating table");

                if (!this._pagerCreated) {
                    var rs_pager = "";
                    rs_pager += '<span style="position:relative;bottom:-2px;">';
                    var navButtonControls = [];
                    navButtonControls.push(Controls.Button(that.myBaseID + '_goFirst', { height:22, icon: 'fa-step-backward', description: 'First page', buttonClass: 'DQXButtonBarButton', fastTouch: true }).setOnChanged($.proxy(that._onFirst, that)));
                    navButtonControls.push(Controls.Button(that.myBaseID + '_goPrevious', { height:22, icon: 'fa-play', description: 'Previous page', buttonClass: 'DQXButtonBarButton fa-flip-horizontal', fastTouch: true }).setOnChanged($.proxy(that._onBack, that)));
                    navButtonControls.push(Controls.Button(that.myBaseID + '_goNext', { height:22, icon: 'fa-play', description: 'Next page', buttonClass: 'DQXButtonBarButton', fastTouch: true }).setOnChanged($.proxy(that._onForward, that)));
                    navButtonControls.push(Controls.Button(that.myBaseID + '_goLast', { height:22, icon: 'fa-step-forward', description: 'Last page', buttonClass: 'DQXButtonBarButton', fastTouch: true }).setOnChanged($.proxy(that._onLast, that)));
                    this.navButtonControls = navButtonControls;
                    $.each(navButtonControls, function (idx, bt) { rs_pager += bt.renderHtml(); });
                    rs_pager += '</span>';
                    rs_pager += '<span id="{id}" style="display:inline-block; padding-top:7px"></span>'.DQXformat({ id: that.myBaseID + '_status' });

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



                var row1 = Math.max(0, this.myTableOffset - this.fetchBuffer);
                var row2 = this.myTableOffset + this.myPageSize + this.fetchBuffer;
                var datacomplete = false;

                if (this._dataValid) {
                    if (!this.preventFetch)
                        datacomplete = this.myDataFetcher.IsDataReady(row1, row2, that.recordCountFetchType);
                }

                this.totalRecordCount = -1;
                if ('totalRecordCount' in this.myDataFetcher)
                    this.totalRecordCount = this.myDataFetcher.totalRecordCount;

                this.isTruncatedRecordCount = false;
                if ('isTruncatedRecordCount' in this.myDataFetcher)
                    this.isTruncatedRecordCount = this.myDataFetcher.isTruncatedRecordCount;

                if (this.totalRecordCount == 0) {
                    st = '<span class="DQXImportantMessage">This result set does not contain any data<span>';
                }
                else {
                    var st = "&nbsp;&nbsp;&nbsp;Current: " + (this.myTableOffset + 1) + "-" + (this.myTableOffset + this.myPageSize);
                    str_recordCount = ' <i>[fetching...]</i>';
                    if (this.totalRecordCount>0) {
                        if (!this.isTruncatedRecordCount)
                            str_recordCount = '' + this.totalRecordCount;
                        else
                            str_recordCount = '>' + this.totalRecordCount;
                    }
                    st += '; Total: ' + str_recordCount;
                }
                $('#' + that.myBaseID + '_status').html(st);


                if (datacomplete && this._dataValid && (!this.preventDownloadData) ) {
                    var downloadlink = this.myDataFetcher.createDownloadUrl();
                    if (!that.dl_button) {
                        that.dl_button = Controls.Button(that.myBaseID + '_dl', { height: 22, icon: 'fa-download', description: 'Download data', buttonClass: 'DQXButtonBarButton', fastTouch: true }).setOnChanged(function() {window.location.href = downloadlink});
                        that.dl_button_showhide = Controls.ShowHide(that.dl_button);
                        $('#' + that.myBaseID + '_right').html(that.dl_button_showhide.renderHtml());
                        Controls.ExecPostCreateHtml();
                    } else {
                        that.dl_button.setOnChanged(function() {window.location.href = downloadlink});
                        that.dl_button_showhide.setVisible(true);
                    }


                }
                else {
                    if (that.dl_button_showhide)
                        that.dl_button_showhide.setVisible(false);
                }




                var rs_table = [];
                for (var tbnr = 0; tbnr <= 1; tbnr++)
                    if (this._dataValid)
                        rs_table[tbnr] = '<table class="DQXQueryTable">';
                    else
                        rs_table[tbnr] = '<table class="DQXQueryTable DQXQueryTableInvalid">';

                //write headers
                var rightPartCount = 0;
                for (var colnr in this.myColumns) {
                    var thecol = this.myColumns[colnr];
                    if (thecol.isVisible()) {
                        var tbnr = thecol.TablePart;
                        if (tbnr==1) rightPartCount++;
                        rs_table[tbnr] += '<th TITLE="{comment}"><div id="{theid}" class="DQXQueryTableHeaderText" style="position:relative;padding-right:15px;height:100%;min-width:{minw}px">'
                            .DQXformat({ comment: thecol._toolTip, theid: (thecol.myCompID + '~headertext~' + this.myBaseID), minw: thecol.minWidth });
                        rs_table[tbnr] += thecol.myName;
                        if (thecol.myName.indexOf('<br>') < 0)
                            rs_table[tbnr] += '<br>&nbsp;';
                        if (thecol.sortOption) {
                            var bitmapname = DQX.BMP("arrow6up.png");
                            if (this.myDataFetcher.positionField == thecol.sortOption.toString()) {
                                if (!this.myDataFetcher.sortReverse)
                                    bitmapname = DQX.BMP("arrow7up.png");
                                else
                                    bitmapname = DQX.BMP("arrow7down.png");
                            }
                            var st = '<IMG class="DQXQueryTableSortHeader" id="{id}" SRC={bmp} border=0 class="DQXBitmapLink" title="Sort by this column" ALT="Link" style="position:absolute;right:-4px;bottom:-3px">'.
                                DQXformat({ id: thecol.myCompID + '~sort~' + this.myBaseID, bmp: bitmapname });
                            rs_table[tbnr] += ' ' + st;
                        }
                        if (thecol._hyperlinkHeaderMessageScope || thecol._headerClickHandler ) {
                            var st = '<IMG class="DQXQueryTableLinkHeader" id="{theid}" SRC=' + DQX.BMP('linkinfo2.png') + ' border=0 class="DQXBitmapLink" ALT="Link" title="{hint}" style="position:absolute;right:-3px;top:-3px">'
                            st = st.DQXformat({ theid: (thecol.myCompID + '~headerlink~' + this.myBaseID), hint: thecol._toolTip });
                            rs_table[tbnr] += ' ' + st;
                        }
                        rs_table[tbnr] += "</div>";
                        rs_table[tbnr] += "</th>";
                    }
                }



                if ((this._dataValid) && (!datacomplete)) $('#' + that.myBaseID + '_status').html('<span class="DQXImportantMessage">FETCHING...</span>');
                if (this.hasFetchFailed) $('#' + that.myBaseID + '_status').html('<span class="DQXImportantMessage">FETCH FAILED !!!</span>');

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
                                    if (!thecol.colIsClientGenerated)
                                        cell_content = this.myDataFetcher.getColumnPoint(downloadrownr, thecol.myCompID);
                                    var origcontent = cell_content;
                                    if (thecol.customTextCreator)
                                        cell_content = thecol.customTextCreator(this.myDataFetcher, downloadrownr);
                                    cell_color = thecol.CellToColor(cell_content);
                                    cell_content = thecol.CellToText(cell_content);
                                    cell_title = cell_content;

                                    if (thecol.barGraphWidth)
                                        cell_content = '<div style="display:inline-block;width:{width}px"><div class="QueryTableValueBar" style="width:{widthfr}px"></div></div><div style="position:relative;left:{mwidth}px;top:-2px;display:inline-block">{content}</div>'.DQXformat({
                                            width:thecol.barGraphWidth,
                                            mwidth:-thecol.barGraphWidth,
                                            widthfr: Math.round((origcontent-thecol.minval)/(thecol.maxval-thecol.minval)*thecol.barGraphWidth),
                                            content: cell_content
                                        });
                                }
                                rs_table[tbnr] += "<td style='max-width:"+(thecol.maxColumnWidth?(thecol.maxColumnWidth+'px'):'none')+";background-color:" + cell_color + "'>";//!!!todo: introduce optional max-width
                                var isLink = false;
                                if ((thecol._hyperlinkCellMessageScope || (thecol._cellClickHandler)) && (hascontent) && (cell_content)) {
                                    isLink = true;
                                    var linkID = thecol.myCompID + '~' + rownr + '~link~' + this.myBaseID;
                                    rs_table[tbnr] += '<span class="DQXQueryTableLinkCell" id="{id}">'.DQXformat({ id: linkID });
                                    if (!thecol.isSelection) {
//                                        rs_table[tbnr] += '<IMG SRC="' + DQX.BMP('link3.png') + '" border=0  width=12 id={id} title="{hint}" ALT="Link"> '.
//                                            DQXformat({ hint: thecol._hyperlinkCellHint, id: linkID });
                                        rs_table[tbnr] += '<span class="fa {icon} DQXQueryTableLinkIcon"></span>'.DQXformat({
                                            icon: (thecol._cellClickHandlerIsExternal?"fa-external-link":"fa-external-link-square")
                                        });
                                    }
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


                $('#' + this.myBaseID).find('.DQXQueryTableLinkCell').mousedown(function() { return false; });
                $('#' + this.myBaseID).find('.DQXQueryTableLinkCell').click($.proxy(that._onClickLinkCell, that));
                $('#' + this.myBaseID).find('.DQXQueryTableHeaderText').click($.proxy(that._onClickLinkHeader, that));
                //$('#' + this.myBaseID).find('.DQXQueryTableLinkHeader').click($.proxy(that._onClickLinkHeader, that));
                $('#' + this.myBaseID).find('.DQXQueryTableSortHeader').click($.proxy(that._onClickSortHeader, that));
                $('#' + this.myBaseID).find('.DQXTableRow').mouseenter(that._onRowMouseEnter);
                $('#' + this.myBaseID).find('.DQXTableRow').mouseleave(that._onRowMouseLeave);
                $('#' + this.myBaseID).find('.DQXTableRow').mousedown(that._onRowMouseDown);

                this.navButtonControls[0].enable(this.myTableOffset > 0);
                this.navButtonControls[1].enable(this.myTableOffset > 0);
                var endReached = this.myTableOffset + this.myPageSize >= this.totalRecordCount;
                this.navButtonControls[2].enable( (!endReached) || (this.totalRecordCount<0) );
                this.navButtonControls[3].enable(!endReached);

                DQX.popActivity();
            }

            //Sets the highlight to a new row
            that.modifyHightlightRow = function (newRowNr) {
                if (this.hasHighlight) {
                    if (newRowNr >= 0) {
                        if ((!this._dataValid)/* || (this.totalRecordCount <= 0)*/) return;
                        newRowNr = Math.max(0, newRowNr);
                        if (this.totalRecordCount>=0)
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
                if (ev.target.id)
                    var tokens = ev.target.id.split('~');
                else
                    var tokens = ev.currentTarget.id.split('~');
                var column = this.findColumn(tokens[0]);
                if (column._cellClickHandler)
                    column._cellClickHandler(that.myDataFetcher,tokens[1], {shiftPressed:ev.shiftKey, controlPressed:ev.ctrlKey});
                if (column._hyperlinkCellMessageScope)
                    Msg.broadcast(column._hyperlinkCellMessageScope, parseInt(tokens[1]));
                return false;
            }

            that._onClickLinkHeader = function (ev) {
                var tokens = ev.target.id.split('~');
                var column = this.findColumn(tokens[0]);
                if (column._headerClickHandler)
                    column._headerClickHandler(tokens[0]);
                if (column._hyperlinkHeaderMessageScope)
                    Msg.broadcast(column._hyperlinkHeaderMessageScope, tokens[0]);
                return false;
            }

            that._onClickSortHeader = function (ev) {
                var tokens = ev.target.id.split('~');
                var column = this.findColumn(tokens[0]);

                if (column.checkCanSort) //if a funtion that controls the sortability of the column is present, call it
                    if (!column.checkCanSort())
                        return false;

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
                if (column.checkCanSort) //if a funtion that controls the sortability of the column is present, call it
                    if (!column.checkCanSort())
                        return;
                var newPositionField = column.sortOption.toString();
                this.myDataFetcher.sortReverse = reverse;
                this.myDataFetcher.positionField = newPositionField;
                this.myDataFetcher.clearData();
                this.myTableOffset = 0;
                this._highlightRowNr = -1;
                this.render();
            }

            that.storeSettings = function() {
                var obj = {};
                obj.positionField = that.myDataFetcher.positionField;
                obj.sortReverse = that.myDataFetcher.sortReverse;
                return obj;
            }

            that.recallSettings = function(settObj) {
                if (settObj.positionField)
                    that.myDataFetcher.positionField = settObj.positionField;
                if (settObj.sortReverse)
                    that.myDataFetcher.sortReverse = settObj.sortReverse;
/*
                this.myDataFetcher.clearData();
                this.myTableOffset = 0;
                this._highlightRowNr = -1;
                this.render();*/
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
                if (delta < 0) {
                    this._onLineDown(3);
                    return false;
                }
                if (delta > 0) {
                    this._onLineUp(3);
                    return false;
                }
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
      
    

