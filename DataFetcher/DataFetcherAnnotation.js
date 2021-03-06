// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

﻿/************************************************************************************************************************************
*************************************************************************************************************************************



*************************************************************************************************************************************
*************************************************************************************************************************************/

define(["jquery", "DQX/SQL", "DQX/Utils", "DQX/DataDecoders"],
    function ($, SQL, DQX, DataDecoders) {
        var DataFetcherAnnotation = {}

        DataFetcherAnnotation.Fetcher = function (iconfig) {
            if (!(this instanceof arguments.callee)) DQX.reportError("Should be called as constructor!");

            this.config = iconfig;
            DQX.assertPresence(this.config, 'serverURL');
            DQX.assertPresence(this.config, 'database');
            DQX.assertPresence(this.config, 'annotTableName');

            this.database = iconfig.database;
            this.annotTableName = iconfig.annotTableName;
            this.fetchSubFeatures = true;
            this.field_start = 'fstart';
            this.field_stop = 'fstop';
            this.field_chrom = 'chromid'
            this.field_name = 'fname';
            this.field_id = 'fid';
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
            this._userQuery2 = null;

            this.translateChromoId = function (id) { return id; }

            // note : fTypeName can be comma separated list
            this.setFeatureType = function (fTypeName, fSubTypeName) {
                this.ftype = fTypeName;
                this.fsubtype = fSubTypeName;
            }


            this.setUserQuery2 = function(qry) {
                if (qry.isTrivial)
                    this._userQuery2 = null;
                else
                    this._userQuery2 = qry;
                this.clearData();
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

            this.AjaxResponse = function (resp, success_callback) {
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
                var tmpNameList = this.myNameList;
                $.each(tmpNameList, function(idx, str) {
                    tmpNameList[idx] = decodeURIComponent(str);
                });
                this.myIDList = vallistdecoder.doDecode(keylist['IDs']);
                this.myTypeList = vallistdecoder.doDecode(keylist['Types']);
                this.myParentIDList = vallistdecoder.doDecode(keylist['ParentIDs']);
                this.myExtraField1List = null;
                if (this.extrafield1)
                    this.myExtraField1List = vallistdecoder.doDecode(keylist['ExtraField1']);
                if (success_callback) {
                    var annots = [];
                    for (var i = 0; i < this.myStartList.length; i++) {
                        annots.push({
                            start: this.myStartList[i],
                            stop: this.myStopList[i],
                            width: this.myStopList[i] - this.myStartList[i],
                            name: this.myNameList[i],
                            id: this.myIDList[i],
                            type: this.myTypeList[i],
                            parent: this.myParentIDList[i]
                        });
                    }
                    success_callback(annots);
                } else
                    this.myDataConsumer.notifyDataReady();
            }

            this._ajaxFailure = function (resp, failure_callback) {
                this.hasFetchFailed = true;
                this._isFetching = false;
                if (failure_callback)
                    failure_callback(resp);
                else
                    setTimeout($.proxy(this.myDataConsumer.notifyDataReady, this.myDataConsumer), DQX.timeoutRetry);
            }

            this._fetchRange = function (rangemin, rangemax, success_callback, failure_callback) {
                if (!this._isFetching) {
                    range = Math.max(0, rangemax - rangemin) + 1;
                    rangemin -= range;
                    rangemax += range;
                    this._requestNr++;
                    var myurl = DQX.Url(this.config.serverURL);
                    myurl.addUrlQueryItem('datatype', 'annot');
                    myurl.addUrlQueryItem('database', this.database);
                    myurl.addUrlQueryItem('requestnr', this._requestNr);
                    myurl.addUrlQueryItem('chrom', this.translateChromoId(this._myChromoID));
                    myurl.addUrlQueryItem('start', rangemin);
                    myurl.addUrlQueryItem('stop', rangemax);
                    myurl.addUrlQueryItem('table', this.annotTableName);
                    myurl.addUrlQueryItem('fieldstart', this.field_start);
                    myurl.addUrlQueryItem('fieldstop', this.field_stop);
                    myurl.addUrlQueryItem('fieldchrom', this.field_chrom);
                    myurl.addUrlQueryItem('fieldid', this.field_id);
                    if (this.field_name)
                        myurl.addUrlQueryItem('fieldname', this.field_name);
                    else
                        myurl.addUrlQueryItem('fieldname', this.field_id);
                    if (this.ftype)
                        myurl.addUrlQueryItem('ftype', this.ftype);
                    if (this.fsubtype)
                        myurl.addUrlQueryItem('fsubtype', this.fsubtype);
                    if (this.extrafield1)
                        myurl.addUrlQueryItem('extrafield1', this.extrafield1);
                    myurl.addUrlQueryItem('subfeatures', this.fetchSubFeatures ? '1' : 0);

                    if (this._userQuery2) {
                        myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(this._userQuery2));
                    }

                    this._isFetching = true;
                    var thethis = this;
                    $.ajax({
                        url: myurl.toString(),
                        success: function (resp) { thethis.AjaxResponse(resp, success_callback); },
                        error: function (resp) { thethis._ajaxFailure(resp, failure_callback); }
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
                thedata.extraField1List = null;
                if (this.extrafield1)
                    thedata.extraField1List = [];
                var genemap = {}
                var typeMap = [];
                if (this.ftype) {
                    $.each(this.ftype.split(','), function(idx, tpe) {
                        typeMap[tpe] = true;
                    });
                }
                for (i = 0; i < this.myStartList.length; i++)
                    if ((this.myStopList[i] >= rangemin) && (this.myStartList[i] <= rangemax) && ((typeMap[this.myTypeList[i]]) || (this.ftype.length == 0))) {
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
                        if (this.extrafield1)
                            thedata.extraField1List.push(this.myExtraField1List[i]);
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
                myurl.addUrlQueryItem('database', this.database);
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
    





