define(["jquery", "DQX/Utils", "DQX/DocEl"], 
    function ($, DQX, DocEl) {

    //Namespace for query tables
    var QueryTable = {}
    
    //Defines a column in a query table
    //Name is the displayed title of the column
    //CompID is the identifier of the column in the data fetcher
    //Tablepart can be 0 or 1 to define the left or right part
    QueryTable.Column = function (iName, iCompID, iTablePart) {
        var that = {};
        that.myName = iName;
        that.myCompID = iCompID;
        that.myComment = '';
        that.TablePart = iTablePart;
        that.Collapsed = false;
        that.HyperlinkCallBack = null;
        this.HyperLinkTarget = null;
    
        that.CellToText = function (content) { return content; }
        that.CellToColor = function (content) { return "white"; }
    
        //Use this function to convert a column into a hyperlink.
        //A callback function will be called when the user clicks the link
        //Target specifies the url target
        that.MakeHyperlink = function (iCallBack, iTarget) {
            this.HyperlinkCallBack = iCallBack;
            this.HyperLinkTarget = iTarget;
        }
        return that;
    }
    
    QueryTable._reflectOwnMessage = function(ID, message1, message2, message3) {
        return QueryTable.FindTable(ID)._onOwnMessage(message1, message2, message3);
    }
    
    
    QueryTable._list = [];
    
    
    //Returns a channelplot by its center canvas id, or return null if not found
    QueryTable.FindTable = function(iID) {
        for (var i in QueryTable._list)
            if (QueryTable._list[i].myBaseID == iID)
                return QueryTable._list[i];
        return null;
    }
    
    
    ///////////////////////////////////////////////////////////////////////////////
    // The Query table class
    ///////////////////////////////////////////////////////////////////////////////
    // iBaseID: the identifier of the div that contains the table elements
    // iDataFetcher: the DQX.DataFetcher.Curve class that provides the data for this table
    
    QueryTable.Table = function (iBaseID, iDataFetcher) {
        var that = {};
        QueryTable._list.push(that);
        that.myBaseID = iBaseID;
        that.myDataFetcher = iDataFetcher;
        that.myColumns = [];
        that.mySortOptions = [];
        that.myPageSize = 20;
        that.myDataFetcher.myDataConsumer = that;
    
        that._dataValid = false; //false= does not have valid data
        that.myTableOffset = 0;
        that.totalRecordCount = -1; //means not yet determined
    
        //Finds a html element in the cluster of elements that define this table
        that.getElement = function (extension) {
            var id = "#" + this.myBaseID + extension;
            var rs = $(id);
            if (rs.length == 0)
                throw "Missing query table element " + id;
            return rs;
        }
    
        //Adds a new column to the table, providing a QueryTable.Column
        that.addTableColumn = function (iCol) {
            this.myDataFetcher.activateFetchColumn(iCol.myCompID);
            this.myColumns.push(iCol);
            return iCol;
        }
    
        //finds and returns a column definition, providing the column identifier
        that.findColumn = function (iColID) {
            for (var colnr in this.myColumns)
                if (this.myColumns[colnr].myCompID == iColID)
                    return this.myColumns[colnr];
            return null;
        }
    
        //Adds a new sort option to the table
        //iOption: of type DQXTableSort
        that.addSortOption = function (iName, iOption) {
            this.mySortOptions.push({ name: iName, Option: iOption });
            var rs = "";
            for (var optnr in this.mySortOptions) {
                rs += '<option value="' + optnr + '">' + this.mySortOptions[optnr].name + '</option>';
            }
            this.getElement('SortOptions').html(rs);
        }
    
        //This function is called by the datafetcher to inform the table that new data is ready
        that.notifyDataReady = function () {
            if (this.myDataFetcher.isValid())
                this._dataValid = true;
            this.render();
        }
    
        //Used internally as a message reflection mechanism
        that._onOwnMessage = function (message1, message2, message3) {
            if (message1 == "First") {
                this.myTableOffset = 0;
                this.render();
                return false;
            }
            if (message1 == "LineUp") {
                this.myTableOffset=Math.max(0,this.myTableOffset-message2);
                this.render();
                return false;
            }
            if (message1 == "LineDown") {
    //            if (this.myTableOffset + this.myPageSize < this.totalRecordCount) {
                this.myTableOffset = Math.min(this.totalRecordCount - this.myPageSize+4,this.myTableOffset + message2);
                this.render();
                return false;
            }
            if (message1 == "Back") {
                this.myTableOffset -= this.myPageSize;
                if (this.myTableOffset < 0) this.myTableOffset = 0;
                this.render();
                return false;
            }
            if (message1 == "Forw") {
                if (this.myTableOffset + this.myPageSize < this.totalRecordCount) {
                    this.myTableOffset += this.myPageSize;
                    this.render();
                }
                return false;
            }
            if (message1 == "Last") {
                this.myTableOffset = (Math.floor((this.totalRecordCount) / this.myPageSize)) * this.myPageSize;
                this.render();
                return false;
            }
            if (message1 == "Collapse") {
                var thecol = this.findColumn(message2);
                thecol.Collapsed = !thecol.Collapsed;
                this.render();
                return false;
            }
            if (message1 == "Link") {
                this.findColumn(message2).HyperlinkCallBack(message3);
            }
            if (message1 == "MoreLines") {
                that.myPageSize += 3;
                this.render();
                return false;
            }
            if (message1 == "LessLines") {
                that.myPageSize = Math.max(1, that.myPageSize - 3);
                this.render();
                return false;
            }
        }
    
        that._onChangeSort = function () {
            //determine sort option
            var sortoptnr = this.getElement('SortOptions').val();
            var sortdir = this.getElement('SortDir').attr('checked');
            var SortOption = this.mySortOptions[sortoptnr].Option;
    
            this.myDataFetcher.positionField = SortOption.toString();
            this.myDataFetcher.sortReverse = sortdir;
            this.myDataFetcher.clearData();
    
            this.myTableOffset = 0;
            this.render();
        }
    
        //Forces a reload of the table information
        that.reLoadTable = function () {
            this.totalRecordCount = -1; //means not yet determined
            this.myDataFetcher.clearData();
            this.myTableOffset = 0;
            this.render();
        }
    
        //Causes the current table information to be invalidated (does not initiate a reload)
        that.invalidate = function () {
            if (this._dataValid) {
                this._dataValid = false;
                this.render();
            }
        }
    
        //Defines the query that is used to return the table content
        that.setQuery = function (iquery) {
            this.myDataFetcher._userQuery = iquery;
            this._dataValid = true;
        }
    
    
        //Renders the table
        that.render = function () {
    
    
            var row1 = Math.max(0, this.myTableOffset - 200);
            var row2 = this.myTableOffset + this.myPageSize + 200;
            var datacomplete = false;
    
            if (this._dataValid)
                datacomplete = this.myDataFetcher.IsDataReady(row1, row2, true);
    
            this.totalRecordCount = -1;
            if ('totalRecordCount' in this.myDataFetcher)
                this.totalRecordCount = this.myDataFetcher.totalRecordCount;
    
            var rs_pager = "";
            var rs_footer = '';
            rs_pager += '<span style="position:relative;bottom:-8px;">';
            rs_pager += DocEl.JavaScriptBitmaplink("Bitmaps/first.png", "First page", "QueryTable._reflectOwnMessage('" + this.myBaseID + "','First')");
            rs_pager += DocEl.JavaScriptBitmaplink("Bitmaps/previous.png", "Previous page", "QueryTable._reflectOwnMessage('" + this.myBaseID + "','Back')");
            rs_pager += DocEl.JavaScriptBitmaplink('Bitmaps/next.png', "Next page", "QueryTable._reflectOwnMessage('" + this.myBaseID + "','Forw')");
            if (datacomplete) {
                rs_pager += DocEl.JavaScriptBitmaplink('Bitmaps/lastpage.png', "Last page", "QueryTable._reflectOwnMessage('" + this.myBaseID + "','Last')");
            }
            rs_pager += "</span>";
            if (datacomplete && this._dataValid) {
                var downloadlink = this.myDataFetcher.createDownloadUrl();
                rs_footer += "<a href=" + downloadlink + ">Download as TAB-delimited file</a>";
            }
            else {
                rs_footer += "&nbsp;";
            }
    
            rs_pager += "&nbsp;&nbsp;";
            rs_pager += DocEl.JavaScriptBitmaplinkTransparent('Bitmaps/morelines.png', "More lines on page", "QueryTable._reflectOwnMessage('" + this.myBaseID + "','MoreLines')");
            rs_pager += "&nbsp;";
            rs_pager += DocEl.JavaScriptBitmaplinkTransparent('Bitmaps/lesslines.png', "Less lines on page", "QueryTable._reflectOwnMessage('" + this.myBaseID + "','LessLines')");
    
            rs_pager += "&nbsp;&nbsp;&nbsp;Current: ";
            rs_pager += (this.myTableOffset + 1) + "-" + (this.myTableOffset + this.myPageSize);
    
            var rs_table = [];
            for (var tbnr = 0; tbnr <= 1; tbnr++)
                if (this._dataValid)
                    rs_table[tbnr] = '<table class="DQXQueryTable">';
                else
                    rs_table[tbnr] = '<table class="DQXQueryTable DQXQueryTableInvalid">';
    
            //write headers
            for (var colnr in this.myColumns) {
                var thecol = this.myColumns[colnr];
                var tbnr = thecol.TablePart;
                rs_table[tbnr] += '<th TITLE="{comment}">'.DQXformat({ comment: thecol.myComment });
                if (!thecol.Collapsed) {
                    rs_table[tbnr] += thecol.myName;
                    rs_table[tbnr] += '&nbsp;<a onclick=\"QueryTable._reflectOwnMessage(\'' + this.myBaseID + '\',\'Collapse\',\'' + thecol.myCompID + '\')\" href=\"javascript:void(0)\"><</a>'
                }
                else
                    rs_table[tbnr] += '&nbsp;<a onclick=\"QueryTable._reflectOwnMessage(\'' + this.myBaseID + '\',\'Collapse\',\'' + thecol.myCompID + '\')\" href=\"javascript:void(0)\">></a>'
                rs_table[tbnr] += "</th>";
            }
    
    
            if ((this._dataValid) && (!datacomplete)) rs_pager += '&nbsp;<span style="background-color:rgb(192,0,0);font-weight:bold">FETCHING...</span>';
            else rs_pager += "; Total: " + Math.max(0, this.totalRecordCount);
            if (this.hasFetchFailed) rs_pager += "&nbsp;FETCH FAILED !";
    
            for (var rownr0 = 0; rownr0 < this.myPageSize; rownr0++) {
                var rownr = this.myTableOffset + rownr0;
                /*if (rownr < this.totalRecordCount)*/
                {
                    var downloadrownr = this.myDataFetcher.findIndexByXVal(rownr);
                    for (var tbnr = 0; tbnr <= 1; tbnr++)
                        rs_table[tbnr] += "<tr>";
                    for (var colnr in this.myColumns) {
                        var thecol = this.myColumns[colnr];
                        var tbnr = thecol.TablePart;
                        var hascontent = false;
                        var cell_color = "white";
                        var cell_content = "&nbsp;";
                        var cell_title = "";
                        if ((this.totalRecordCount < 0) || (rownr < this.totalRecordCount)) cell_content = "?";
                        if (downloadrownr >= 0) {
                            hascontent = true;
                            cell_content = this.myDataFetcher.getColumnPoint(downloadrownr, thecol.myCompID);
                            cell_color = thecol.CellToColor(cell_content);
                            cell_content = thecol.CellToText(cell_content);
                            cell_title = cell_content;
                            if (thecol.Collapsed)
                                cell_content = "";
                        }
                        rs_table[tbnr] += "<td  TITLE='" + cell_title + "' style='background-color:" + cell_color + "'>";
                        if ((thecol.HyperlinkCallBack) && (hascontent))
                            rs_table[tbnr] += '<a class="DQXQueryTableLink" onclick=\"QueryTable._reflectOwnMessage(\'' + this.myBaseID + '\',\'Link\',\'' + thecol.myCompID + '\',' + rownr + ')\" href=' + thecol.HyperLinkTarget + '>';
                        rs_table[tbnr] += cell_content;
                        if ((thecol.HyperlinkCallBack) && (hascontent))
                            rs_table[tbnr] += '</a>';
                        rs_table[tbnr] += "</td>";
                    }
                }
                for (var tbnr = 0; tbnr <= 1; tbnr++)
                    rs_table[tbnr] += "</tr>";
            }
            for (var tbnr = 0; tbnr <= 1; tbnr++)
                rs_table[tbnr] += "</table>";
    
            this.getElement('Body1')[0].innerHTML = rs_table[0];
            this.getElement('Body2')[0].innerHTML = rs_table[1];
            this.getElement('Pager').html(rs_pager);
            this.getElement('Footer').html(rs_footer);
        }
    
        //This function is called when a key was pressed
        that.onKeyDown = function (ev) {
            if (ev.keyCode == 40) {//line down
                this._onOwnMessage("LineDown",1);
                return true;
            }
            if (ev.keyCode == 38) {//line down
                this._onOwnMessage("LineUp",1);
                return true;
            }
            if (ev.keyCode == 33) {//page up
                this._onOwnMessage("Back");
                return true;
            }
            if (ev.keyCode == 34) {//page down
                this._onOwnMessage("Forw");
                return true;
            }
            return false;
        }
    
        that.OnMouseWheel = function (ev) {
            var delta = DQX.getMouseWheelDelta(ev);
            if (delta < 0)
                this._onOwnMessage("LineDown",3);
            if (delta > 0)
                this._onOwnMessage("LineUp",3);
            return false;
        }
    
    
        //Initialise some event handlers
        that.getElement("SortOptions").change($.proxy(that._onChangeSort, that));
        that.getElement("SortDir").change($.proxy(that._onChangeSort, that));
    
        that.getElement('Body1').bind('DOMMouseScroll mousewheel', $.proxy(that.OnMouseWheel, that));
        that.getElement('Body2').bind('DOMMouseScroll mousewheel', $.proxy(that.OnMouseWheel, that));
    
        return that;
    }

    //////////////////////////////////////////////////////////////////////////////////////////
    // Query table GUI component
    //////////////////////////////////////////////////////////////////////////////////////////
    
    QueryTable.GUI = function (iid, idatafetcher, args) {
        var that = DQX.Gui.GuiComponent(iid, args);
    
        var html = '';
    
    
        {//Create header
            var header = DocEl.Div();
            header.addStyle('padding-bottom', '5px');
            var pager_txt = DocEl.Span({ parent: header, id: that.getSubId("Pager") });
    
            var sortgroup = DocEl.Span({ parent: header });
            sortgroup.addStyle('float', 'right');
            sortgroup.addStyle('vertical-align', 'bottom');
            sortgroup.addStyle('position', 'relative');
            sortgroup.addStyle('top', '10px');
            sortgroup.addElem("&nbsp;&nbsp;&nbsp;Sort by: ");
            var pager_SortOptions = DocEl.Select([], '', { parent: sortgroup, id: that.getSubId("SortOptions") });
            sortgroup.addElem("&nbsp;");
            var pager_SortDir = DocEl.Check({ parent: sortgroup, id: (that.getSubId("SortDir")) });
            sortgroup.addElem("Inverted");
    
            html += header;
        }
    
        {//Create tables
            var holder = DocEl.Div();
            //holder.addStyle("overflow", "auto");
    
    
            //This variant uses a guaranteed fixed % distribution over both parts, and also guarantees that the table stretches the full extent        
            //        var div1 = DocEl.Div({ parent: holder });
            //        div1.makeFloatLeft().addStyle('overflow', 'auto').setWidthPc(args.leftfraction || 50);
            //        var tablebody1 = DocEl.Div({ parent: div1, id: that.getSubId("Body1") });
            //        tablebody1.addStyle("overflow-x", "scroll").addStyle("overflow-y", "hidden");
            //        tablebody1.addStyle("border-width",'0px');
            //        tablebody1.addStyle("border-right-width", '2px');
            //        tablebody1.addStyle("border-style", 'solid');
            //        tablebody1.addStyle("border-color", 'rgb(60,60,60)');
            //        var div2 = DocEl.Div({ parent: holder });
            //        div2.makeFloatLeft().addStyle('overflow', 'auto').setWidthPc(100 - (args.leftfraction || 50));
            //        var tablebody2 = DocEl.Div({ parent: div2, id: that.getSubId("Body2") });
            //        tablebody2.addStyle("overflow-x", "scroll").addStyle("overflow-y", "hidden");
            //        
    
            //This variant uses a maximum % distribution for the left part, and makes the left part never use more than required. It does not guarantee that the table stretches the full extent        
            var div1 = DocEl.Div({ parent: holder });
            div1.makeFloatLeft().addStyle('overflow', 'auto');
            div1.addStyle('max-width', (args.leftfraction || 50).toString() + '%');
            var tablebody1 = DocEl.Div({ parent: div1, id: that.getSubId("Body1") });
            tablebody1.addStyle("overflow-x", "scroll").addStyle("overflow-y", "hidden");
            tablebody1.addStyle("border-width", '0px');
            tablebody1.addStyle("border-right-width", '2px');
            tablebody1.addStyle("border-style", 'solid');
            tablebody1.addStyle("border-color", 'rgb(60,60,60)');
            var div2 = DocEl.Div({ parent: holder });
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
    
        that.rootelem.html(html);
    
    
        that.myTable = QueryTable.Table(iid, idatafetcher);
    
        DQX.setKeyDownReceiver(iid, $.proxy(that.myTable.onKeyDown, that.myTable));
    
        return that;
    }

    
    return QueryTable;
    });
      
    

