/************************************************************************************************************************************
*************************************************************************************************************************************



*************************************************************************************************************************************
*************************************************************************************************************************************/

define(["jquery", "DQX/SQL", "DQX/Utils", "DQX/DataDecoders"],
    function ($, SQL, DQX, DataDecoders) {
        var DataFetchers = {}


        //Enum specifying the fetch type options for the total record count
        DataFetchers.RecordCountFetchType = {
            IMMEDIATE : 0,
            DELAYED : 1,
            NONE : 2
        }

        //////////////////////////////////////////////////////////////////////////////////////
        //  Class DataFetchers.Table
        //////////////////////////////////////////////////////////////////////////////////////
        // A wrapper around DataFetchers.Curve, making it suitable for paged querying of table data

        DataFetchers.Table = function (iserverurl, idatabase, itablename) {
            DQX.checkIsString(iserverurl); DQX.checkIsString(idatabase); DQX.checkIsString(itablename);
            var that = new DataFetchers.Curve(iserverurl, idatabase, itablename, 'LIMIT');
            that.positionField='';

            //Sets the sort column(s), provided as a SQL.TableSort object, and the sort order
            that.setSortOption = function (sortInfo, sortReverse) {
                DQX.requireMemberFunction(sortInfo, 'getPrimaryColumnID');
                this.positionField = sortInfo.toString();
                this.sortReverse = sortReverse;
            }

            return that;
        }

        //////////////////////////////////////////////////////////////////////////////////////
        //  Class DataFetchers.Curve
        //////////////////////////////////////////////////////////////////////////////////////

        DataFetchers.Curve = function (iserverurl, idatabase, itablename, ipositionfield) {
            if (!(this instanceof arguments.callee)) DQX.reportError("Should be called as constructor!");
            DQX.checkIsString(iserverurl); DQX.checkIsString(idatabase); DQX.checkIsString(itablename);


            this.serverurl = iserverurl; //The server url to contact for this
            this.database = idatabase; //The name of the database to fetch from
            this.tablename = itablename; //The name of the table to fetch from
            this.rangeExtension = 1.5; //Left & right buffer that is automatically fetched along with the range request
            this._maxViewportSizeX=1.0e99;//info will be hidden if the viewport gets larger than this

            this._maxrecordcount = 1000000;//When fetching record counts, cap to this value
            this._reportIfError = false;// If false, silently retry on error. If true, report error & stop

            this._requestNr = 0;
            if (!itablename)
                DQX.reportError('Invalid table name');

            if (!ipositionfield) ipositionfield='pos';
            this.positionField = ipositionfield; //The field that contains the position information (use 'LIMIT' for data fetchers that are based on record numbers)
            this.sortReverse = false;
            this.useLimit = (ipositionfield == 'LIMIT'); //if true, position information are record numbers rather than positions in a columnn (used for paged table fetching)

            //Two optional restricting queries, defined as a DQXWhereClause style object
            this._userQuery1 = null;
            this._userQuery2 = null;

            this.setReportIfError = function(status) {
                this._reportIfError = status;
            }

            //defines a custom query to apply on the data records
            this.setUserQuery1 = function (iquery) {
                this._userQuery1 = iquery;
                this.clearData();
            }

            this.setUserQuery2 = function (qry) {
                if (qry.isTrivial)
                    this._userQuery2 = null;
                else
                    this._userQuery2 = qry;
                this.clearData();
            }

            this.setTableName = function(tableName) {
                this.tablename = tableName;
                this.clearData();
            };

            // Use this function to cap the value of the record count of the result set. This speeds up the underlying count query
            this.setMaxRecordCount = function(mx) {
                this._maxrecordcount = mx
            }

            this.setMaxViewportSizeX = function(maxval) {
                this._maxViewportSizeX = maxval;
            }


            this.resetAll =function() {
                //The currently fetched range of data
                this._currentRangeMin = 1000.0;
                this._currentRangeMax = -1000.0;

                this.myDownloadPointsX = []; //X positions of all the currently downloaded points
                this.myColumns = {}; //maps column IDs to DataFetchers.CurveColumn objects
                this.totalRecordCount = -1;

                this._isFetching = false; //If true, an ajax request was sent out and wasn't finished yet
                this.hasFetchFailed = false; //True if an error occurred while fetching the data
            }
            this.resetAll();

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



            //adds a column to be fetched, providing a column id and an encoding identifier
            this.addFetchColumn = function (cid, encoding) {
                if (!this.myColumns[cid])
                    this.myColumns[cid] = DataFetchers.CurveColumn(encoding);
                this.clearData();
                return this.myColumns[cid];
            }

            //same as addFetchColumn, but automatically activates the column
            this.addFetchColumnActive = function (cid, encoding) {
                var col = this.addFetchColumn(cid,encoding);
                this.activateFetchColumn(cid);
                return col;
            }

            //Creates a int-type fetch column
            this.addFetchColumnInt = function (cid, activate) {
                var col = this.addFetchColumn(cid,'IntB64');
                if (activate)
                    this.activateFetchColumn(cid);
                return col;
            }

            //Creates a float-type fetch column
            this.addFetchColumnValue = function (cid, activate) {
                var col = this.addFetchColumn(cid,'Float2');
                if (activate)
                    this.activateFetchColumn(cid);
                return col;
            }

            this.hasFetchColumn = function(cid) {
                return (cid in this.myColumns);
            }

            this.getFetchColumn = function (cid) {
                var rs = this.myColumns[cid];
                if (rs == null)
                    DQX.reportError("Invalid fetcher column id " + cid);
                return rs;
            }

            //removes a column
            this.delFetchColumn = function (cid) {
                delete this.myColumns[cid];
            }

            //call this function to request the presence of a column
            this.activateFetchColumn = function (cid) {
                if (!(cid in this.myColumns))
                    DQX.reportError("Unable to activate column {cid}: it is not present in the datafetcher".DQXformat({cid: cid}));
                if (this.myColumns[cid].myActiveCount == 0)
                    this.clearData();
                this.myColumns[cid].myActiveCount++;
            }

            //call this function to stop requesting the presence of a column
            this.deactivateFetchColumn = function (cid) {
                if (cid in this.myColumns)
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
                    if (this._reportIfError)
                        alert('Error:\n' + keylist.Error);
                    else
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
                this._currentRangeMin = parseFloat(keylist["_start"]);
                this._currentRangeMax = parseFloat(keylist["_stop"]);

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
                    if (this.useLimit) {
                        var startPoint = Math.max(0,parseInt(keylist['_start']));
                        var requestedcount = parseInt(keylist['_stop']) - startPoint + 1;
                        var obtainedcount = this.myDownloadPointsX.length;
                        if (obtainedcount<requestedcount) {
                            this.totalRecordCount = startPoint+obtainedcount;
                            //alert('downloaded: '+obtainedcount+' '+requestedcount);
                        }
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
                this.hasFetchFailed = true;
                this._isFetching = false;
                if (this._reportIfError) {
                    var errorText = 'Error:\n';
                    if (resp.statusText)
                        errorText += resp.statusText;
                    alert(errorText);
                }
                else {
                    //tell the consumer of this that the data are 'ready'
                    //note: this will cause a requery, which is what we want
                    //the timout introduces a delay, avoiding that the server is flooded with requeries
                    setTimeout($.proxy(this.myDataConsumer.notifyDataReady, this.myDataConsumer), DQX.timeoutRetry);
                }
            }


            this._ajaxResponse_FetchRecordCount = function(resp) {
                var keylist = DQX.parseResponse(resp); //unpack the response

                if ("Error" in keylist)
                    return;

                if (keylist.requestid != this._recordcountrequestid)
                    return;

                if ('TotalRecordCount' in keylist)
                    this.totalRecordCount = keylist['TotalRecordCount'];
                this.isTruncatedRecordCount = false;
                if ('Truncated' in keylist)
                    this.isTruncatedRecordCount = keylist['Truncated']

                //tell the consumer of this that the data are ready
                this.myDataConsumer.notifyDataReady();
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
            // recordCountFetchType is of type DataFetchers.RecordCountFetchType
            this._fetchRange = function (rangemin, rangemax, recordCountFetchType) {
                if (!recordCountFetchType)
                    recordCountFetchType = DataFetchers.RecordCountFetchType.IMMEDIATE;


                if (rangemax-rangemin>this._maxViewportSizeX)
                    return;

                if ((this._userQuery1) && (this._userQuery1.isNone)) {//Query indicates that we should fetch nothing!
                    this.hasFetchFailed = false;
                    this._isFetching = false;
                    range = rangemax - rangemin;
                    rangemin = Math.round(rangemin - this.rangeExtension * range);
                    rangemax = Math.round(rangemax + this.rangeExtension * range);
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
                    rangemin -= this.rangeExtension * range;
                    rangemax += this.rangeExtension * range;

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
                            if ((this._userQuery2) && (!this._userQuery2.isTrivial) ) {
                                qry = SQL.WhereClause.AND([qry, this._userQuery2]);
                            }
                        }
                    }

                    var qrytype = "qry";
                    if (this.useLimit) qrytype = "pageqry";

                    if (!this.positionField) {
                        if (!this.useLimit)
                            DQX.reportError("positionField is missing in DataFetcher");
                        else
                        DQX.reportError("No sorting specified for table data fetcher");
                    }

                    //prepare the url
                    var myurl = DQX.Url(this.serverurl);
                    myurl.addUrlQueryItem("datatype", qrytype);
                    myurl.addUrlQueryItem('database', this.database);
                    myurl.addUrlQueryItem('requestnr', this._requestNr);
                    myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(qry));
                    myurl.addUrlQueryItem("tbname", this.tablename);
                    myurl.addUrlQueryItem("collist", collist);
                    myurl.addUrlQueryItem("posfield", this.positionField);
                    if (this.positionField)
                        myurl.addUrlQueryItem("order", this.positionField);
                    myurl.addUrlQueryItem("_start", rangemin); //not used by server: only used for reflecting info to this client response code
                    myurl.addUrlQueryItem("_stop", rangemax); //idem
                    myurl.addUrlQueryItem("sortreverse", this.sortReverse ? 1 : 0);
                    myurl.addUrlQueryItem("needtotalcount", ((this.totalRecordCount < 0) && (recordCountFetchType==DataFetchers.RecordCountFetchType.IMMEDIATE)) ? 1 : 0);

                    myurl.addUrlQueryItem("needsmartsort", 0);


                    if (this.useLimit)
                        myurl.addUrlQueryItem("limit", rangemin + "~" + rangemax);

                    if (collist.length > 0) {//launch the ajax request
                        var urlString = myurl.toString()
                        this._isFetching = true;
                        var thethis = this;
                        if (this.showDownload)
                            DQX.setProcessing("Downloading...");

                        $.ajax({
                            url: urlString,
                            success: function (resp) {
                                thethis._ajaxResponse_FetchRange(resp);
                                if (recordCountFetchType==DataFetchers.RecordCountFetchType.DELAYED) {//Fetch record cound in a second pass
                                    var myurl2 = DQX.Url(thethis.serverurl);
                                    thethis._recordcountrequestid = DQX.getNextUniqueID();
                                    myurl2.addUrlQueryItem("datatype", 'getrecordcount');
                                    myurl2.addUrlQueryItem('database', thethis.database);
                                    myurl2.addUrlQueryItem('requestid', thethis._recordcountrequestid);
                                    myurl2.addUrlQueryItem("qry", SQL.WhereClause.encode(qry));
                                    myurl2.addUrlQueryItem("tbname", thethis.tablename);
                                    myurl2.addUrlQueryItem("maxrecordcount", thethis._maxrecordcount);
                                    $.ajax({
                                        url: myurl2.toString(),
                                        success: function (resp) {
                                            thethis._ajaxResponse_FetchRecordCount(resp);
                                        },
                                        error: function (resp) {
                                        }
                                    });
                                }
                            },

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
                myurl.addUrlQueryItem("database", this.database);
                myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(thequery));
                myurl.addUrlQueryItem("tbname", this.tablename);
                myurl.addUrlQueryItem("collist", collist);
                myurl.addUrlQueryItem("posfield", this.positionField);
                myurl.addUrlQueryItem("order", this.positionField);
                myurl.addUrlQueryItem("sortreverse", this.sortReverse ? 1 : 0);
                return myurl.toString();
            }

            // Call this to determine if all data in a specific range is ready, and start fetching extra data if necessary
            // recordCountFetchType is of type DataFetchers.RecordCountFetchType.IMMEDIATE
            this.IsDataReady = function (rangemin, rangemax, recordCountFetchType) {
                if (rangemax-rangemin>this._maxViewportSizeX)
                    return true;

                if ((rangemin >= this._currentRangeMin) && (rangemax <= this._currentRangeMax)) {
                    var buffer = (rangemax - rangemin) / 2;
                    if ((rangemin - buffer < this._currentRangeMin) || (rangemax + buffer > this._currentRangeMax)) {
                        this._fetchRange(rangemin, rangemax, recordCountFetchType);
                    }
                    return true;
                }
                else {
                    this._fetchRange(rangemin, rangemax, recordCountFetchType);
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
                if (!mycol)
                    DQX.reportError('Invalid column ID "{id}"'.DQXformat({ id: cid }));
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
                myurl.addUrlQueryItem('database', this.database);
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
        //  Class DataFetchers.CurveColumn
        //////////////////////////////////////////////////////////////////////////////////////

        DataFetchers.CurveColumn = function (iEncoding) {
            var that = {};
            that.myEncodingList = {
                "Generic": { id:"GN", type:"String" },    //returns string data, also works for other data
                "String": { id:"ST", type:"String" },    //returns string data
                "Float2": { id:"F2", type:"Float" },    //returns floats in 2 base64 bytes
                "Float3": { id:"F3", type:"Float" },     //returns floats in 3 base64 bytes
                "Float4": { id:"F4", type:"Float" },     //returns floats in 4 base64 bytes
                "Int": { id:"IN", type:"Integer" },        //returns exact integers
                "IntB64": { id:"IB", type:"Integer" },     //returns exact integers, base64 encoded
                "IntDiff": { id:"ID", type:"Integer" }     //returns exact integers as differences with previous values
            }

            if (!(iEncoding in that.myEncodingList)) {
                var myEncodingList2=[];
                $.each(that.myEncodingList, function(idx,vl) { myEncodingList2.push(idx) })
                DQX.reportError("Invalid column encoding " + iEncoding + ". Should be one of: "+myEncodingList2.join(', '));
            }
            that.myEncodingID = that.myEncodingList[iEncoding].id;
            that.myEncodingType = that.myEncodingList[iEncoding].type;

            that.myActiveCount = 0; //reference counting to determine if this column data is used
            that.myDownloadValues = []; //holds the currently downloaded values of this column

            //Clears all fetched data
            that.clearData = function () {
                this.myDownloadValues = [];
            }

            //Determines if this column data is currently used
            that.isActive = function () {
                return this.myActiveCount > 0;
            }

            return that;
        }


        //Fetches all columns for a single record
        DataFetchers.fetchSingleRecord = function (iserverUrl, idatabase, itableName, ifieldName, ifieldContent, respHandler, failHandler) {
            var dataFetcher = new DataFetchers.Curve(iserverUrl,idatabase,itableName);
            dataFetcher.fetchFullRecordInfo(
                SQL.WhereClause.CompareFixed(ifieldName, '=', ifieldContent),
                function (data) {
                    DQX.stopProcessing();
                    respHandler(data);
                },
                function (msg) {
                    DQX.stopProcessing();
                    if (failHandler)
                        failHandler();
                }
            );
            DQX.setProcessing("Downloading...");
        }



        //////////////////////////////////////////////////////////////////////////////////////
        //  RecordsetFetcher: fetches a set of records from the server
        /// !!!NOTE: in the server code, a kind of authorisation check will have to be built, validating that the client can have read access to this table
        //////////////////////////////////////////////////////////////////////////////////////


        DataFetchers.RecordsetFetcher = function (iserverUrl, idatabase, itableName) {
            var that = {};
            DQX.checkIsString(iserverUrl); DQX.checkIsString(idatabase); DQX.checkIsString(itableName);
            that.serverUrl = iserverUrl; //The server url to contact for this
            that.database = idatabase; //database to fetch from
            that.tableName = itableName; //The name of the table to fetch from
            that.columns = [];
            that._maxResultCount = 100000;
            that._sortReverse = false;
            that._distinct = false;
            if (!itableName)
                DQX.reportError('Invalid table name');

            that.addColumn = function (id, encoding) {
                this.columns.push({ id: id, encoding: encoding });
            };

            that.getColumnIDs = function() {
                 var ids = [];
                $.each(this.columns,function(idx, col) {
                    ids.push(col.id);
                });
                return ids;
            }

            that.setMaxResultCount = function (maxcount) {
                this._maxResultCount = maxcount;
            };

            that.makeDistinct = function(status) {
                that._distinct = status;
                return that;
            };


            that._ajaxResponse_FetchRange = function (resp, respHandler, failHandler) {
                if (this.showDownload)
                    DQX.stopProcessing();
                var keylist = DQX.parseResponse(resp); //unpack the response
                if (keylist.Error) {
                    failHandler(keylist.Error);
                    return;
                }
                var data = {};
                var DataDecoders = require("DQX/DataDecoders");
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
                    failHandler('Server error '+JSON.stringify(resp));
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
                myurl.addUrlQueryItem('database', this.database);
                myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(query));
                myurl.addUrlQueryItem("tbname", this.tableName);
                myurl.addUrlQueryItem("collist", this._createActiveColumnListString());
                myurl.addUrlQueryItem("order", orderField);
                myurl.addUrlQueryItem("sortreverse", that._sortReverse?1:0);
                myurl.addUrlQueryItem("needtotalcount", 0);
                myurl.addUrlQueryItem("limit", "0~" + this._maxResultCount);
                myurl.addUrlQueryItem("distinct", that._distinct?1:0);
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




        //////////////////////////////////////////////////////////////////////////////////////
        //  ServerDataGetter: fetches a group of tables from the server, and executes a callback function when everything is downloaded
        //////////////////////////////////////////////////////////////////////////////////////


        DataFetchers.ServerDataGetter = function() {
            var that={};
            that._tables = [];
            that._tablesMap = {};

            that.addTable = function(iTableName, iColumns, iSortColumn, query, settings) {
                var columns = [];
                $.each(iColumns, function(idx, col) {
                    if (typeof (col) != 'object') {
                        columns.push({ id: col, tpe: 'string' });
                    }
                    else {
                        if (['string', 'float', 'int'].indexOf(col.tpe) < 0 )
                            DQX.reportError('Invalid table column type: property tpe should be string,float or int');
                        columns.push(col);
                    }
                })
                var tableInfo = { name: iTableName, columns: columns, sortcolumn: iSortColumn };
                if (settings && settings.distinct)
                    tableInfo.distinct=true;
                tableInfo.query = SQL.WhereClause.Trivial();
                if (query)
                    tableInfo.query = query;
                that._tables.push(tableInfo);
                that._tablesMap[iTableName] = tableInfo;
            };

            that.getTableRecords = function(tableName) {
                var tableInfo = that._tablesMap[tableName];
                if (!tableInfo)
                    DQX.reportError('Invalid table name '+tableName);
                return tableInfo.records;
            }

            that.tryFinalise = function() {
                var isComplete = true;
                $.each(that._tables, function(idx, tableInfo) {
                    if (!tableInfo.data)
                        isComplete = false;
                });
                if (isComplete) {
                    $.each(that._tables, function(idx, tableInfo) {
                        var recordCount  = tableInfo.data[tableInfo.columns[0].id].length;
                        tableInfo.records = [];
                        for (var recnr=0; recnr < recordCount; recnr++) {
                            var rec = {};
                            $.each(tableInfo.columns, function (colidx, columnInfo) {
                                rec[columnInfo.id] = tableInfo.data[columnInfo.id][recnr];
                                if (columnInfo.tpe=='float')
                                    rec[columnInfo.id] = parseFloat(rec[columnInfo.id]);
                                if (columnInfo.tpe=='int')
                                    rec[columnInfo.id] = parseInt(rec[columnInfo.id]);
                            });
                            tableInfo.records.push(rec);
                        }
                    });
                    that._proceedFunction();
                }
            }

            that.execute = function(serverUrl, database, proceedFunction) {
                that._proceedFunction = proceedFunction;
                if (that._tables.length==0) {
                    proceedFunction();
                    return;
                }
                $.each(that._tables, function (ID, tableInfo) {
                    var fetcher = DataFetchers.RecordsetFetcher(serverUrl, database, tableInfo.name);
                    fetcher.makeDistinct(tableInfo.distinct);
                    $.each(tableInfo.columns, function (colidx, columnInfo) {
                        fetcher.addColumn(columnInfo.id, 'GN');
                    });
                    fetcher.getData(tableInfo.query, tableInfo.sortcolumn, function (data) {
                            tableInfo.data = data;
                            that.tryFinalise();
                        },
                        function (msg) {
                            DQX.reportError(msg/* + '\n(data: ' + tableInfo.name+')'*/);
                        }
                    );
                    //DQX.setProcessing("Downloading...");
                });

                //proceedFunction();
            }

            return that;
        }


        return DataFetchers;
    });    
    

