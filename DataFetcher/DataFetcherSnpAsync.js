/************************************************************************************************************************************
*************************************************************************************************************************************



*************************************************************************************************************************************
*************************************************************************************************************************************/

define(["jquery", "DQX/SQL", "DQX/Utils", "DQX/DataDecoders", "DQX/DataFetcher/DataFetcherFile"],
    function ($, SQL, DQX, DataDecoders, DataFetcherFile) {
        var DataFetcherSnp = {};

        DataFetcherSnp.Fetcher = function (iserverurl, data_id) {
            if (!(this instanceof arguments.callee)) DQX.reportError("Should be called as constructor!");

            this.serverurl = iserverurl; //The server url to contact for this
            this.dataid = data_id;
            this.decoder = DataDecoders.ValueListDecoder();
            this.b64codec = DataDecoders.B64();
            this.meta_fetched = false;
            this.fetches_waiting_for_meta = [];

            this._onFetchMetaInfo = function (content) {
                var self = this;
                var lines = content.split('\n');
                this._sequenceIDList = [];
                for (var linenr = 0; linenr < lines.length; linenr++) {
                    var line = lines[linenr];
                    var splitPos = line.indexOf('=');
                    if (splitPos > 0) {
                        var token = line.slice(0, splitPos);
                        var content = line.slice(splitPos + 1);
                        if (token == 'Samples')
                            this._sequenceIDList = content.split('\t');
                        if (token == 'SnpPositionFields') {
                            this._parseSnpPositionFields(content);
                        }
                        if (token == 'SampleCallFields') {
                            this._parseSampleCallFields(content);
                        }
                        if (token == 'Filters') {
                            this._filters = content.split('\t');
                            this._activeFilterMap = {};
                            $.each(this._filters, function (idx, filter) {
                                self._activeFilterMap[filter] = false;
                            });
                        }
                    }
                }
                if (!this._listSnpPositionInfo)
                    DQX.reportError("[@Snp] position info is missing");
                this.meta_fetched = true;
                this.fetches_waiting_for_meta.forEach(function(func){func();});
            };
            DataFetcherFile.getFile(serverUrl, this.dataid + "/_MetaData", $.proxy(this._onFetchMetaInfo, this));


            this._parseSnpPositionFields = function (content) {
                this._listSnpPositionInfo = JSON.parse(content);
                this._recordLength = 0;
                for (var fnr = 0; fnr < this._listSnpPositionInfo.length; fnr++) {
                    var fieldInfo = this._listSnpPositionInfo[fnr];
                    fieldInfo.decoder = DataDecoders.Encoder.Create(fieldInfo.Encoder);
                    fieldInfo.recordLength = fieldInfo.decoder.getRecordLength();
                    this._recordLength += fieldInfo.recordLength;
                }

                //create mapping
                this.mapSnpPositionInfoNr = [];
                for (fnr = 0; fnr < this._listSnpPositionInfo.length; fnr++) {
                    this.mapSnpPositionInfoNr[this._listSnpPositionInfo[fnr].ID] = fnr;
                    this._listSnpPositionInfo[fnr].displaySizeY = 30;
                }
            }

            this._parseSampleCallFields = function (content) {
                this._listSampleCallInfo = JSON.parse(content);
                this._sampleCallRecordLength = 0;
                for (var fnr = 0; fnr < this._listSampleCallInfo.length; fnr++) {
                    var fieldInfo = this._listSampleCallInfo[fnr];
                    fieldInfo.decoder = DataDecoders.Encoder.Create(fieldInfo.Encoder);
                    fieldInfo.recordLength = fieldInfo.decoder.getRecordLength();
                    this._sampleCallRecordLength += fieldInfo.recordLength;
                }

                //create mapping
                this.mapSampleCallInfoNr = [];
                for (fnr = 0; fnr < this._listSampleCallInfo.length; fnr++)
                    this.mapSampleCallInfoNr[this._listSampleCallInfo[fnr].ID] = fnr;
            }

            this.decode_response = function(response) {
                var positions = this.decoder.doDecode(response['posits']);
                var positions_length = positions.length;

                //Parse per-position SNP info
                var position_info = {};
                for (var infonr = 0; infonr < this._listSnpPositionInfo.length; infonr++)
                    position_info[this._listSnpPositionInfo[infonr].ID] = [];
                var snpdata = response['snpdata'];
                var posOffset = 0;
                for (var i = 0; i < positions_length; i++) {
                    for (infonr = 0; infonr < this._listSnpPositionInfo.length; infonr++) {
                        var info = this._listSnpPositionInfo[infonr];
                        position_info[info.ID].push(info.decoder.decodeSingle(snpdata, posOffset));
                        posOffset += info.recordLength;
                    }
                }

                //Parse per-sample call info
                var samples = response['seqids'].split('~');
                var sample_data = {};
                for (i = 0; i < samples.length; i++) {
                    var sampleCallInfo = {};
                    for (infonr = 0; infonr < this._listSampleCallInfo.length; infonr++)
                        sampleCallInfo[this._listSampleCallInfo[infonr].ID] = [];
                    var dta = response['seqvals'][samples[i]];
                    posOffset = 0;
                    for (var j = 0; j < positions_length; j++) {
                        for (infonr = 0; infonr < this._listSampleCallInfo.length; infonr++) {
                            info = this._listSampleCallInfo[infonr];
                            sampleCallInfo[info.ID].push(info.decoder.decodeSingle(dta, posOffset));
                            posOffset += info.recordLength;
                        }
                    }
                    sample_data[samples[i]] = sampleCallInfo
                }
                return {'sample_data':sample_data, 'position_info':position_info}
            }

            this.fetch = function (chromoID, rangemin, rangemax, samples, callback) {
                var self = this;
                if (!this.meta_fetched) {
                    this.fetches_waiting_for_meta.push(function() {
                        self.fetch(chromoID, rangemin, rangemax, samples, callback);
                    });
                } else {
                    var seqids = '';
                    for (var i = 0; i < samples.length-1; i++) {
                        seqids += samples[i];
                        seqids += '~';
                    }
                    seqids += samples[samples.length-1];

                    var activeFilterMask = '';
                    var self = this;
                    $.each(this._filters, function (idx, filterid) {
                        activeFilterMask += (self._activeFilterMap[filterid]) ? '1' : '0';
                    });


                    if (!this._sampleCallRecordLength)
                        DQX.reportError('No information on sample call data');

                    //prepare the url
                    var myurl = DQX.Url(this.serverurl);
                    myurl.addUrlQueryItem("datatype", "snpinfo");
                    myurl.addUrlQueryItem("seqids", seqids);
                    myurl.addUrlQueryItem("start", rangemin);
                    myurl.addUrlQueryItem("stop", rangemax);
                    myurl.addUrlQueryItem("chromoid", chromoID);
                    myurl.addUrlQueryItem("folder", this.dataid);
                    myurl.addUrlQueryItem("snpinforeclen", this._recordLength);
                    myurl.addUrlQueryItem("samplecallinforeclen", this._sampleCallRecordLength);
                    myurl.addUrlQueryItem("filters", activeFilterMask);
                    var urlString = myurl.toString();

                    $.ajax({
                        url: urlString,
                        success: function (response) {
                            var response = DQX.parseResponse(response);

                            if ("Error" in response) {
                                callback(null);
                                if (window.console) console.log("Error in SNP Fetch" + keylist['Error']);
                            }
                            callback(self.decode_response(response));
                        },
                         error: function (resp) {
                             if (window.console) console.log("Error in SNP Fetch");
                             callback(null);
                         }
                    });
                }
            }
        }

        DataFetcherSnp.FetcherSnpDetails = function (iserverurl) {
            var that={};
            that.serverurl = iserverurl; //The server url to contact for this

            that.getSnpInfo = function (filename, chrom, pos, onFinished) {

                var tryFinish = function() {
                    if (that._content&&that._header)
                        onFinished(that._header,that._content);
                }

                DataFetcherFile.getFile(that.serverurl, filename+".header", function(content) {
                    that._header=content;
                    tryFinish();
                });

                //prepare the url
                var myurl = DQX.Url(that.serverurl);
                myurl.addUrlQueryItem("datatype", "snpdetailinfo");
                myurl.addUrlQueryItem("name", filename);
                myurl.addUrlQueryItem("chrom", chrom);
                myurl.addUrlQueryItem("pos", pos);
                var urlstring = myurl.toString();
                $.ajax({
                    url: urlstring,
                    success: function (resp) {
                        var keylist = DQX.parseResponse(resp);
                        if ("Error" in keylist) {//!!!todo: some error handling
                            DQX.stopProcessing();
                            return;
                        }
                        that._content=keylist.content;
                        tryFinish();
                    },
                    error: function (resp) {//!!!todo: some error handling
                        DQX.stopProcessing();
                    }
                });
            }

            return that;
        }


        return DataFetcherSnp;
    });    
    





