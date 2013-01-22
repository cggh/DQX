define([DQXSCJQ(), DQXSC("SQL"), DQXSC("Utils"), DQXSC("DataDecoders")],
    function ($, SQL, DQX, DataDecoders) {
        var DataFetcherAnnotation = {}

        DataFetcherAnnotation.Fetcher = function (iconfig) {
            if (!(this instanceof arguments.callee)) DQX.reportError("Should be called as constructor!");

            this.config = iconfig;
            DQX.assertPresence(this.config, 'serverURL');
            DQX.assertPresence(this.config, 'annotTableName');

            this.annotTableName = iconfig.annotTableName;
            this.fetchSubFeatures = true;
            this.ftype = 'gene';
            this.fsubtype = 'exon';
            this.showFeatureType = false;




            this._myChromoID = "";
            this._currentRangeMin = 1000.0;
            this._currentRangeMax = -1000.0;
            this.myStartList = [];
            this.myStopList = [];
            this.myNameList = [];
            this.myIDList = [];
            this.myTypeList = [];
            this.myParentIDList = [];
            this._isFetching = false;
            this.hasFetchFailed = false;
            this._requestNr = 0;

            this.translateChromoId = function (id) { return id; }

            this.setFeatureType = function (fTypeName, fSubTypeName) {
                this.ftype = fTypeName;
                this.fsubtype = fSubTypeName;
            }

            this.clearData = function () {
                this._requestNr++;
                this._currentRangeMin = 1000.0;
                this._currentRangeMax = -1000.0;
                this.myStartList = [];
                this.myStopList = [];
                this.myNameList = [];
                this.myIDList = [];
                this.myTypeList = [];
                this.myParentIDList = [];
            }

            this.AjaxResponse = function (resp) {
                this.hasFetchFailed = false;
                this._isFetching = false;
                var vallistdecoder = DataDecoders.ValueListDecoder();
                var keylist = DQX.parseResponse(resp);
                if ("Error" in keylist) {
                    this.hasFetchFailed = true;
                    setTimeout($.proxy(this.myDataConsumer.notifyDataReady, this.myDataConsumer), DQX.timeoutRetry);
                    return;
                }
                if (keylist.requestnr != this._requestNr) {
                    this.myDataConsumer.notifyDataReady();
                    return;
                }

                this._currentRangeMin = parseFloat(keylist["start"]);
                this._currentRangeMax = parseFloat(keylist["stop"]);
                this.myStartList = vallistdecoder.doDecode(keylist['Starts']);
                var sizes = vallistdecoder.doDecode(keylist['Sizes']);
                this.myStopList = [];
                for (var i = 0; i < this.myStartList.length; i++)
                    this.myStopList.push(this.myStartList[i] + sizes[i]);
                this.myNameList = vallistdecoder.doDecode(keylist['Names']);
                this.myIDList = vallistdecoder.doDecode(keylist['IDs']);
                this.myTypeList = vallistdecoder.doDecode(keylist['Types']);
                this.myParentIDList = vallistdecoder.doDecode(keylist['ParentIDs']);
                this.myDataConsumer.notifyDataReady();
            }

            this._ajaxFailure = function (resp) {
                this.hasFetchFailed = true;
                this._isFetching = false;
                setTimeout($.proxy(this.myDataConsumer.notifyDataReady, this.myDataConsumer), DQX.timeoutRetry);
            }

            this._fetchRange = function (rangemin, rangemax) {
                if (!this._isFetching) {
                    range = Math.max(0, rangemax - rangemin) + 1;
                    rangemin -= range;
                    rangemax += range;
                    this._requestNr++;
                    var myurl = DQX.Url(this.config.serverURL);
                    myurl.addUrlQueryItem('datatype', 'annot');
                    myurl.addUrlQueryItem('requestnr', this._requestNr);
                    myurl.addUrlQueryItem('chrom', this.translateChromoId(this._myChromoID));
                    myurl.addUrlQueryItem('start', rangemin);
                    myurl.addUrlQueryItem('stop', rangemax);
                    myurl.addUrlQueryItem('table', this.annotTableName);
                    myurl.addUrlQueryItem('ftype', this.ftype);
                    myurl.addUrlQueryItem('fsubtype', this.fsubtype);
                    myurl.addUrlQueryItem('subfeatures', this.fetchSubFeatures ? '1' : 0);
                    this._isFetching = true;
                    var thethis = this;
                    $.ajax({
                        url: myurl.toString(),
                        dataType: 'TEXT',
                        type: 'get',
                        success: function (resp) { thethis.AjaxResponse(resp); },
                        error: function (resp) { thethis._ajaxFailure(resp); }
                    });
                }
            }

            this.setChromoID = function (chromoid) {
                this._myChromoID = chromoid;
            }



            this.IsDataReady = function (rangemin, rangemax) {
                if ((rangemin >= this._currentRangeMin) && (rangemax <= this._currentRangeMax)) {
                    return true;
                }
                else {
                    this._fetchRange(rangemin, rangemax);
                    return false;
                }
            }


            this.getData = function (rangemin, rangemax) {
                var thedata = {};
                thedata.myStartList = [];
                thedata.myStopList = [];
                thedata.myNameList = [];
                thedata.myIDList = [];
                thedata.myExonStarts = [];
                thedata.myExonStops = [];
                var genemap = {}
                for (i = 0; i < this.myStartList.length; i++)
                    if ((this.myStopList[i] >= rangemin) && (this.myStartList[i] <= rangemax) && ((this.myTypeList[i] == this.ftype) || (this.ftype.length == 0))) {
                        genemap[this.myIDList[i]] = thedata.myIDList.length;
                        thedata.myStartList.push(this.myStartList[i]);
                        thedata.myStopList.push(this.myStopList[i]);
                        var name = this.myNameList[i];
                        if (this.showFeatureType)
                            name = this.myTypeList[i] + ' ' + name;
                        thedata.myNameList.push(name);
                        thedata.myIDList.push(this.myIDList[i]);
                        thedata.myExonStarts.push([]);
                        thedata.myExonStops.push([]);
                    }
                for (i = 0; i < this.myStartList.length; i++)
                    if ((this.myStopList[i] >= rangemin) && (this.myStartList[i] <= rangemax) && (this.myTypeList[i] == this.fsubtype)) {
                        var genenr = genemap[this.myParentIDList[i]]
                        if (genenr >= 0) {
                            thedata.myExonStarts[genenr].push(this.myStartList[i]);
                            thedata.myExonStops[genenr].push(this.myStopList[i]);
                        }
                    }
                return thedata;
            }

            //fetches all annotation for a single record
            this.fetchFullAnnotInfo = function (id, theCallbackFunction, theFailFunction) {
                //prepare the url

                var myurl = DQX.Url(this.config.serverURL);
                myurl.addUrlQueryItem('datatype', 'fullannotinfo');
                myurl.addUrlQueryItem('table', this.annotTableName);
                //myurl.addUrlQueryItem('idfield', this.config.annotidfield);
                myurl.addUrlQueryItem('id', id);
                var _ajaxResponse_FetchPoint = function (resp) {
                    //todo: error handling
                    theCallbackFunction(DQX.parseResponse(resp).Data);
                }
                $.ajax({
                    url: myurl.toString(),
                    success: _ajaxResponse_FetchPoint,
                    error: theFailFunction
                });
            }

        }

        return DataFetcherAnnotation;
    });    
    





