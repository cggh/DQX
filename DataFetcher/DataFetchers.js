define([DQXSCJQ(), DQXSC("SQL"), DQXSC("Utils"), DQXSC("DataDecoders")],
    function ($, SQL, DQX, DataDecoders) {
        var DataFetchers = {}

        //////////////////////////////////////////////////////////////////////////////////////
        //  Class DataFetchers.CurveColumn
        //////////////////////////////////////////////////////////////////////////////////////

        DataFetchers.CurveColumn = function (iEncoding) {
            var that = {};
            that.myEncodingList = {
                "String": "ST",    //returns string data
                "Float2": "F2",    //returns floats in 2 base64 bytes
                "Float3": "F3",     //returns floats in 3 base64 bytes
                "Int": "IN",        //returns exact integers
                "IntB64": "IB",     //returns exact integers
                "IntDiff": "ID"     //returns exact integers as differences with previous values
            }

            if (!(iEncoding in that.myEncodingList))
                DQX.reportError("Invalid column encoding " + iEncoding);
            that.myEncodingID = that.myEncodingList[iEncoding];

            that.myActiveCount = 0;
            that.myDownloadValues = []; //holds the currently downloaded values of this column


            that.clearData = function () {
                this.myDownloadValues = [];
            }

            that.isActive = function () {
                return this.myActiveCount > 0;
            }


            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////
        //  Class DataFetchers.Curve
        //////////////////////////////////////////////////////////////////////////////////////

        DataFetchers.Curve = function (iserverurl, itablename, ipositionfield) {
            if (!(this instanceof arguments.callee)) DQX.reportError("Should be called as constructor!");

            this.serverurl = iserverurl; //The server url to contact for this
            this.tablename = itablename; //The name of the table to fetch from
            this._requestNr = 0;
            if (!itablename)
                DQX.reportError('Invalid table name');

            this.positionField = ipositionfield; //The field that contains the position information (use 'LIMIT' for data fetchers that are based on record numbers)
            this.sortReverse = false;
            this.useLimit = (ipositionfield == 'LIMIT'); //if true, position information are record numbers rather than positions in a columnn (used for paged table fetching)

            //Two optional restricting queries, defined as a DQXWhereClause style object
            this._userQuery1 = null;
            this._userQuery2 = null;

            //defines a custom query to apply on the data records
            this.setUserQuery1 = function (iquery) {
                this._userQuery1 = iquery;
                this.clearData();
            }

            this.setUserQuery2 = function (qry) {
                this._userQuery2 = qry;
                this.clearData();
            }



            //The currently fetched range of data
            this._currentRangeMin = 1000.0;
            this._currentRangeMax = -1000.0;

            this.myDownloadPointsX = []; //X positions of all the currently downloaded points
            this.myColumns = {}; //maps column IDs to DataFetchers.CurveColumn objects
            this.totalRecordCount = -1;

            this._isFetching = false; //If true, an ajax request was sent out and wasn't finished yet
            this.hasFetchFailed = false; //True if an error occurred while fetching the data

            //Removes all downloaded data, forcing a reload
            this.clearData = function () {
                this._requestNr++;
                this._currentRangeMin = 1000.0;
                this._currentRangeMax = -1000.0;
                this.myDownloadPointsX = [];
                for (var cid in this.myColumns)
                    this.myColumns[cid].clearData();
                this.totalRecordCount = -1;
                this._isFetching = false;
            }



            //adds a column to be fetched, providing a column id and a color
            this.addFetchColumn = function (cid, encoding, colr) {
                this.myColumns[cid] = DataFetchers.CurveColumn(encoding, colr);
                this.clearData();
                return this.myColumns[cid];
            }

            this.getFetchColumn = function (cid) {
                var rs = this.myColumns[cid];
                if (rs == null) DQX.reportError("Invalid fetcher column id " + cid);
                return rs;
            }

            //removes a column
            this.delFetchColumn = function (cid) {
                delete this.myColumns[cid];
            }

            //call this function to request the presence of a column
            this.activateFetchColumn = function (cid) {
                if (this.myColumns[cid].myActiveCount == 0)
                    this.clearData();
                this.myColumns[cid].myActiveCount++;
            }

            //call this function to stop requesting the presence of a column
            this.deactivateFetchColumn = function (cid) {
                this.myColumns[cid].myActiveCount--;
            }

            //internal
            this._ajaxResponse_FetchRange = function (resp) {
                if (this.showDownload)
                    DQX.stopProcessing();
                if (!this._isFetching) return;
                this.hasFetchFailed = false;
                this._isFetching = false;
                var keylist = DQX.parseResponse(resp); //unpack the response

                if ("Error" in keylist) {
                    this.hasFetchFailed = true;
                    setTimeout($.proxy(this.myDataConsumer.notifyDataReady, this.myDataConsumer), DQX.timeoutRetry);
                    return;
                }

                if (keylist.requestnr != this._requestNr) {
                    this.myDataConsumer.notifyDataReady();
                    return;
                }


                //check that this ajax response contains all required columns (if not, this is likely to be an outdated response)
                for (var cid in this.myColumns)
                    if (this.myColumns[cid].isActive())
                        if (!(cid in keylist)) {
                            this.myDataConsumer.notifyDataReady();
                            return; //if not, we should not proceed with parsing it
                        }

                //update the currently downloaded range
                this._currentRangeMin = parseFloat(keylist["start"]);
                this._currentRangeMax = parseFloat(keylist["stop"]);

                if ('TotalRecordCount' in keylist)
                    this.totalRecordCount = keylist['TotalRecordCount'];

                //decode all the downloaded columns
                var b64codec = DataDecoders.B64();
                var vallistdecoder = DataDecoders.ValueListDecoder();
                if (keylist["DataType"] == "Points") {
                    this.myDownloadPointsX = vallistdecoder.doDecode(keylist['XValues']);
                    for (var cid in this.myColumns)
                        if (this.myColumns[cid].isActive()) {
                            this.myColumns[cid].myDownloadValues = vallistdecoder.doDecode(keylist[cid]);
                        }
                    //txt = "Fetched points: " + this.myDownloadPointsX.length + " (" + resp.length / 1000.0 + "Kb, " + Math.round(resp.length / this.myDownloadPointsX.length * 100) / 100 + "bytes/point)";
                    //$("#click2").text(txt);
                }

                //tell the consumer of this that the data are ready
                this.myDataConsumer.notifyDataReady();
            }

            //internal
            this._ajaxFailure_FetchRange = function (resp) {
                if (this.showDownload)
                    DQX.stopProcessing();
                //alert('###error');
                this.hasFetchFailed = true;
                this._isFetching = false;
                //tell the consumer of this that the data are 'ready'
                //note: this will cause a requery, which is what we want
                //the timout introduces a delay, avoiding that the server is flooded with requeries
                setTimeout($.proxy(this.myDataConsumer.notifyDataReady, this.myDataConsumer), DQX.timeoutRetry);
            }

            this._createActiveColumnListString = function () {
                var collist = "";
                for (var cid in this.myColumns)
                    if (this.myColumns[cid].isActive()) {
                        if (collist.length > 0) collist += "~";
                        collist += this.myColumns[cid].myEncodingID;
                        collist += cid;
                    }
                return collist;
            }

            this.isValid = function () {
                if (this._userQuery1 == null) return true;
                return !this._userQuery1.isNone;
            }

            //internal: initiates the ajax data fetching call
            this._fetchRange = function (rangemin, rangemax, needtotalrecordcount) {

                if ((this._userQuery1) && (this._userQuery1.isNone)) {//Query indicates that we should fetch nothing!
                    this.hasFetchFailed = false;
                    this._isFetching = false;
                    range = rangemax - rangemin;
                    rangemin = Math.round(rangemin - 1.5 * range);
                    rangemax = Math.round(rangemax + 1.5 * range);
                    this._currentRangeMin = rangemin;
                    this._currentRangeMax = rangemax;
                    this.myDownloadPointsX = [];
                    for (var cid in this.myColumns)
                        this.myColumns[cid].myDownloadValues = [];
                    this.totalRecordCount = 0;
                    setTimeout($.proxy(this.myDataConsumer.notifyDataReady, this.myDataConsumer), DQX.timeoutRetry);
                    return;
                }

                if (!this._isFetching) {
                    var collist = this._createActiveColumnListString();
                    //create some buffer around the requested range. This reduces the number of requests and gives the user a smoother experience when scrolling or zooming out
                    range = rangemax - rangemin;
                    rangemin -= 1.5 * range;
                    rangemax += 1.5 * range;

                    var qry = SQL.WhereClause.Trivial();
                    if (!this.useLimit) {
                        //prepare where clause
                        qry = SQL.WhereClause.AND();
                        qry.addComponent(SQL.WhereClause.CompareFixed(this.positionField, '>=', rangemin));
                        qry.addComponent(SQL.WhereClause.CompareFixed(this.positionField, '<=', rangemax));
                        if (this._userQuery1 != null) qry.addComponent(this._userQuery1);
                        if (this._userQuery2 != null) qry.addComponent(this._userQuery2);
                    }
                    else {
                        if (this._userQuery1 != null) {
                            qry = this._userQuery1;
                            if (this._userQuery2) {
                                qry = SQL.WhereClause.AND([qry, this._userQuery2]);
                            }
                        }
                    }

                    var qrytype = "qry";
                    if (this.useLimit) qrytype = "pageqry"

                    //prepare the url
                    var myurl = DQX.Url(this.serverurl);
                    myurl.addUrlQueryItem("datatype", qrytype);
                    myurl.addUrlQueryItem('requestnr', this._requestNr);
                    myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(qry));
                    myurl.addUrlQueryItem("tbname", this.tablename);
                    myurl.addUrlQueryItem("collist", collist);
                    myurl.addUrlQueryItem("posfield", this.positionField);
                    myurl.addUrlQueryItem("order", this.positionField);
                    myurl.addUrlQueryItem("start", rangemin); //not used by server: only used for reflecting info to this client response code
                    myurl.addUrlQueryItem("stop", rangemax); //idem
                    myurl.addUrlQueryItem("sortreverse", this.sortReverse ? 1 : 0);
                    myurl.addUrlQueryItem("needtotalcount", ((this.totalRecordCount < 0) && (needtotalrecordcount)) ? 1 : 0);


                    if (this.useLimit)
                        myurl.addUrlQueryItem("limit", rangemin + "~" + rangemax);

                    if (collist.length > 0) {//launch the ajax request
                        this._isFetching = true;
                        var thethis = this;
                        if (this.showDownload)
                            DQX.setProcessing("Downloading...");
                        $.ajax({
                            url: myurl.toString(),
                            success: function (resp) { thethis._ajaxResponse_FetchRange(resp) },
                            error: function (resp) { thethis._ajaxFailure_FetchRange(resp) }
                        });
                    }
                    else {
                        //todo: somehow update without the need for fetching?
                    }
                }
            }


            //Returns the url that can be used to download the data set this fetcher is currently serving
            this.createDownloadUrl = function () {
                //prepare the url
                var collist = this._createActiveColumnListString();
                var thequery = SQL.WhereClause.Trivial();
                if (this._userQuery1 != null)
                    thequery = this._userQuery1;
                var myurl = DQX.Url(this.serverurl);
                myurl.addUrlQueryItem("datatype", "downloadtable");
                myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(thequery));
                myurl.addUrlQueryItem("tbname", this.tablename);
                myurl.addUrlQueryItem("collist", collist);
                myurl.addUrlQueryItem("posfield", this.positionField);
                myurl.addUrlQueryItem("order", this.positionField);
                myurl.addUrlQueryItem("sortreverse", this.sortReverse ? 1 : 0);
                return myurl.toString();
            }

            //Call this to determine if all data in a specific range is ready, and start fetching extra data if necessary
            this.IsDataReady = function (rangemin, rangemax, needtotalrecordcount) {
                if ((rangemin >= this._currentRangeMin) && (rangemax <= this._currentRangeMax)) {
                    var buffer = (rangemax - rangemin) / 2;
                    if ((rangemin - buffer < this._currentRangeMin) || (rangemax + buffer > this._currentRangeMax)) {
                        this._fetchRange(rangemin, rangemax, needtotalrecordcount);
                    }
                    return true;
                }
                else {
                    this._fetchRange(rangemin, rangemax, needtotalrecordcount);
                    return false;
                }
            }

            //For a given X value, returns the index in the current download set
            this.findIndexByXVal = function (xval) {
                //todo: optimise this using binary intersection
                if ('myDownloadPointsX' in this) {
                    for (var trypt in this.myDownloadPointsX)
                        if (xval == this.myDownloadPointsX[trypt])
                            return trypt;
                }
                return -1; //means not found
            }

            //get point data for a specific column in a specific range
            this.getColumnPoints = function (rangemin, rangemax, cid) {
                var thedata = {};
                //todo: optimise both loops using binary intersection
                for (var startpt = 0; (startpt < this.myDownloadPointsX.length - 1) && (this.myDownloadPointsX[startpt] < rangemin); startpt++);
                for (var endpt = this.myDownloadPointsX.length - 1; (endpt > 0) && (this.myDownloadPointsX[endpt] > rangemax); endpt--);
                if (startpt > 0) startpt--;
                if (endpt < this.myDownloadPointsX.length - 1) endpt++;
                thedata.startIndex = startpt; //the start index of the returned set in the current load set
                thedata.xVals = []; //the positions of the points
                for (var i = startpt; i <= endpt; i++) thedata.xVals.push(this.myDownloadPointsX[i]);
                thedata.YVals = []; //the column values (or 'y' values in most cases)
                var yvalues = this.myColumns[cid];
                for (var i = startpt; i <= endpt; i++) thedata.YVals.push(yvalues.myDownloadValues[i]);
                return thedata;
            }

            //get the position for a specific point in the current load set
            this.getPosition = function (currentloadindex) {
                if ((currentloadindex < 0) || (currentloadindex >= this.myDownloadPointsX.length)) return null;
                return this.myDownloadPointsX[currentloadindex];
            }

            //get the column value for a specific point in the current load set
            this.getColumnPoint = function (currentloadindex, cid) {
                if ((currentloadindex < 0) || (currentloadindex >= this.myDownloadPointsX.length)) return null;
                var mycol = this.myColumns[cid];
                if (!mycol) DQX.reportError('Invalid column ID "{id}"'.DQXformat({ id: cid }));
                return mycol.myDownloadValues[currentloadindex];
            }

            //internal
            this._ajaxFailure_FetchPoint = function (resp) {
                //todo: what to do here?
                this._isFetching = false;
            }

            //fetches all information about an individual point
            //whereclause: a DQXWhereClause style object
            this.fetchFullRecordInfo = function (whereclause, theCallbackFunction, theFailFunction) {
                //prepare the url
                var myurl = DQX.Url(this.serverurl);
                myurl.addUrlQueryItem("datatype", 'recordinfo');
                myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(whereclause));
                myurl.addUrlQueryItem("tbname", this.tablename); //tablename to fetch from
                var _ajaxResponse_FetchPoint = function (resp) {
                    var keylist = DQX.parseResponse(resp);
                    if ("Error" in keylist) {
                        theFailFunction(keylist.Error);
                        return;
                    }
                    theCallbackFunction(keylist.Data);
                }
                $.ajax({
                    url: myurl.toString(),
                    success: _ajaxResponse_FetchPoint,
                    error: theFailFunction
                });
            }
        }

        //////////////////////////////////////////////////////////////////////////////////////
        //  RecordsetFetcher: fetches a set of records from the server
        /// !!!NOTE: in the server code, a kind of authorisation check will have to be built, validating that the client can have read access to this table
        //////////////////////////////////////////////////////////////////////////////////////


        DataFetchers.RecordsetFetcher = function (iserverUrl, itableName) {
            var that = {};
            that.serverUrl = iserverUrl; //The server url to contact for this
            that.tableName = itableName; //The name of the table to fetch from
            that.columns = [];
            that._maxResultCount = 100000;
            if (!itableName)
                DQX.reportError('Invalid table name');

            that.addColumn = function (id, encoding) {
                this.columns.push({ id: id, encoding: encoding });
            }

            that.setMaxResultCount = function (maxcount) {
                this._maxResultCount = maxcount;
            }

            that._ajaxResponse_FetchRange = function (resp, respHandler, failHandler) {
                if (this.showDownload)
                    DQX.stopProcessing();
                var keylist = DQX.parseResponse(resp); //unpack the response
                if ("Error" in keylist) {
                    failHandler(keylist.Error);
                    return;
                }
                var data = {};
                var DataDecoders = require(DQXSC("DataDecoders"));
                var b64codec = DataDecoders.B64();
                var vallistdecoder = DataDecoders.ValueListDecoder();
                for (var i = 0; i < this.columns.length; i++)
                    data[this.columns[i].id] = vallistdecoder.doDecode(keylist[this.columns[i].id]);
                respHandler(data);
            }

            that._ajaxFailure_FetchRange = function (resp, failHandler) {
                if (this.showDownload)
                    DQX.stopProcessing();
                if (failHandler)
                    failHandler('Server error');
            }

            that._createActiveColumnListString = function () {
                var collist = "";
                for (var i = 0; i < this.columns.length; i++) {
                    if (collist.length > 0) collist += "~";
                    collist += this.columns[i].encoding;
                    collist += this.columns[i].id;
                }
                return collist;
            }


            that.getData = function (query, orderField, respHandler, failHandler) {
                //prepare the url
                var myurl = DQX.Url(this.serverUrl);
                myurl.addUrlQueryItem("datatype", "pageqry");
                myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(query));
                myurl.addUrlQueryItem("tbname", this.tableName);
                myurl.addUrlQueryItem("collist", this._createActiveColumnListString());
                //myurl.addUrlQueryItem("posfield", this.positionField);
                myurl.addUrlQueryItem("order", orderField);
                myurl.addUrlQueryItem("sortreverse", 0);
                myurl.addUrlQueryItem("needtotalcount", 0);
                myurl.addUrlQueryItem("limit", "0~" + this._maxResultCount);
                var urlstring = myurl.toString();
                this._isFetching = true;
                var thethis = this;
                $.ajax({
                    url: urlstring,
                    success: function (resp) { thethis._ajaxResponse_FetchRange(resp, respHandler, failHandler) },
                    error: function (resp) { thethis._ajaxFailure_FetchRange(resp, failHandler) }
                });
            }

            return that;
        }

        return DataFetchers;
    });    
    

