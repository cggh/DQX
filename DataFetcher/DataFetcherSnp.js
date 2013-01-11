define([DQXSCJQ(), DQXSC("SQL"), DQXSC("Utils"), DQXSC("DataDecoders")],
    function ($, SQL, DQX, DataDecoders) {
        var DataFetcherSnp = {}

        DataFetcherSnp.SnpFilterData = function () {
            var that = {};

            that.applyVCFFilter = true;
            that.minAvgCoverage = 0;
            that.minAvgPurity = 0;
            that.minPresence = 0;
            that.minSnpCoverage = 1;
            that.minSnpPurity = 0;
            this.requireParentsPresent = false;

            return that;
        }

        DataFetcherSnp.SnpSequence = function (iID) {
            var that = {};

            that.myID = iID;
            that.buffCov1 = [];
            that.buffCov2 = [];

            return that;
        }


        DataFetcherSnp.Fetcher = function (iserverurl, idataid, isamples) {
            if (!(this instanceof arguments.callee)) throw "Should be called as constructor!";

            this.serverurl = iserverurl; //The server url to contact for this
            this.dataid = idataid;
            this.myChromoID = '';
            this.decoder = DataDecoders.ValueListDecoder();
            this.b64codec = DataDecoders.B64();

            this.parentIDs = [];

            //The currently fetched range of data
            this._currentRangeMin = 1000.0;
            this._currentRangeMax = -1000.0;


            this.setSampleList = function (iSampleList) {
                this.mySeqs = {};
                for (var i = 0; i < iSampleList.length; i++) {
                    this.mySeqs[iSampleList[i]] = DataFetcherSnp.SnpSequence(iSampleList[i]);
                }
            }

            this.setDataID = function (iid) {
                this._currentRangeMin = 1000.0;
                this._currentRangeMax = -1000.0;
                this.dataid = iid;
            }

            this.setSampleList(isamples);


            this.buffPosits = [];

            this._isFetching = false; //If true, an ajax request was sent out and wasn't finished yet
            this.hasFetchFailed = false; //True if an error occurred while fetching the data

            //sets the active chromosome identifier for this data fetcher
            this.setChromoID = function (iID) {
                this.myChromoID = iID;
                this.clearData();
            }

            //Removes all downloaded data, forcing a reload
            this.clearData = function () {
                this._currentRangeMin = 1000.0;
                this._currentRangeMax = -1000.0;
                this.buffPosits = [];
                this._isFetching = false;
            }

            //internal
            this._ajaxResponse_FetchRange = function (resp) {
                if (!this._isFetching) return;
                this.hasFetchFailed = false;
                this._isFetching = false;
                var keylist = DQX.parseResponse(resp); //unpack the response

                if ("Error" in keylist) {
                    this.hasFetchFailed = true;
                    //alert(keylist.error);
                    setTimeout($.proxy(this.myDataConsumer.notifyDataReady, this.myDataConsumer), DQX.timeoutRetry);
                    return;
                }


                this.buffPosits = this.decoder.doDecode(keylist['posits']);
                var datalen = this.buffPosits.length;

                this.buffAvgCoverage = [];
                this.buffAvgPurity = [];
                this.buffSnpRefBase = [];
                this.buffSnpAltBase = [];
                this.buffSnpAQ = [];
                this.buffSnpMQ = [];
                this.buffSnpFilter = [];
                for (var i = 0; i < datalen; i++) {
                    this.buffAvgCoverage.push(0);
                    this.buffAvgPurity.push(0);
                }

                var snpdata = keylist['snpdata']
                for (var i = 0; i < datalen; i++) {
                    this.buffSnpRefBase.push(snpdata[7 * i + 0]);
                    this.buffSnpAltBase.push(snpdata[7 * i + 1]);
                    this.buffSnpAQ.push(this.b64codec.B642IntFixed(snpdata, 7 * i + 2, 2) / 4086.0 * 100.0);
                    this.buffSnpMQ.push(this.b64codec.B642IntFixed(snpdata, 7 * i + 4, 2) / 4086.0 * 100.0);
                    this.buffSnpFilter.push(snpdata[7 * i + 6] == '1');
                }

                var cov1, cov2, covtot, frq;
                var seqcount = 0;
                for (smp in this.mySeqs) {
                    var dta = keylist['seqvals'][smp];
                    var buffCov1 = [];
                    var buffCov2 = [];
                    for (var i = 0; i < datalen; i++) {
                        cov1 = this.b64codec.B642IntFixed(dta, 4 * i, 2);
                        cov2 = this.b64codec.B642IntFixed(dta, 4 * i + 2, 2);
                        buffCov1.push(cov1);
                        buffCov2.push(cov2);
                        this.buffAvgCoverage[i] += cov1 + cov2;
                        if (cov1 + cov2 > 0)
                            this.buffAvgPurity[i] += Math.max(cov1, cov2) * 2.0 / (cov1 + cov2) - 1.0;
                        else
                            this.buffAvgPurity[i] += 1.0;
                    }
                    this.mySeqs[smp].buffCov1 = buffCov1;
                    this.mySeqs[smp].buffCov2 = buffCov2;
                    seqcount++;
                }

                for (var i = 0; i < this.buffPosits.length; i++) {
                    this.buffAvgCoverage[i] /= seqcount;
                    this.buffAvgPurity[i] /= seqcount;
                }


                //update the currently downloaded range
                this._currentRangeMin = parseFloat(keylist["start"]);
                this._currentRangeMax = parseFloat(keylist["stop"]);


                //tell the consumer of this that the data are ready
                this.myDataConsumer.notifyDataReady();
            }

            //internal
            this._ajaxFailure_FetchRange = function (resp) {
                this.hasFetchFailed = true;
                this._isFetching = false;
                //tell the consumer of this that the data are 'ready'
                //note: this will cause a requery, which is what we want
                //the timout introduces a delay, avoiding that the server is flooded with requeries
                setTimeout($.proxy(this.myDataConsumer.notifyDataReady, this.myDataConsumer), DQX.timeoutRetry);
            }

            //internal: initiates the ajax data fetching call
            this._fetchRange = function (rangemin, rangemax) {

                if (!this._isFetching) {
                    //create some buffer around the requested range. This reduces the number of requests and gives the user a smoother experience when scrolling or zooming out
                    range = rangemax - rangemin;
                    rangemin -= 1.5 * range;
                    rangemax += 1.5 * range;
                    var seqids = '';
                    for (seqid in this.mySeqs) {
                        if (seqids.length > 0)
                            seqids += '~';
                        seqids += seqid;
                    }

                    //prepare the url
                    var myurl = DQX.Url(this.serverurl);
                    myurl.addUrlQueryItem("datatype", "snpinfo");
                    //            myurl.addUrlQueryItem("tbname", this.tablename);
                    myurl.addUrlQueryItem("seqids", seqids);
                    myurl.addUrlQueryItem("start", rangemin);
                    myurl.addUrlQueryItem("stop", rangemax);
                    myurl.addUrlQueryItem("chromoid", this.myChromoID);
                    myurl.addUrlQueryItem("folder", this.dataid);

                    this._isFetching = true;
                    var thethis = this;
                    $.ajax({
                        url: myurl.toString(),
                        success: function (resp) { thethis._ajaxResponse_FetchRange(resp) },
                        error: function (resp) { thethis._ajaxFailure_FetchRange(resp) }
                    });
                }
            }


            //Call this to determine if all data in a specific range is ready, and start fetching extra data if necessary
            this.IsDataReady = function (rangemin, rangemax) {

                if (!this.dataid) return true; //don't fetch anything if the data source is not provided

                if ((rangemin >= this._currentRangeMin) && (rangemax <= this._currentRangeMax)) {
                    var buffer = (rangemax - rangemin) / 2;
                    if ((rangemin - buffer < this._currentRangeMin) || (rangemax + buffer > this._currentRangeMax)) {
                        this._fetchRange(rangemin, rangemax);
                    }
                    return true;
                }
                else {
                    this._fetchRange(rangemin, rangemax);
                    return false;
                }
            }


            this.pos2BuffIndexLeft = function (pos) {
                var i1 = 0;
                var p1 = this.buffPosits[i1];
                var i2 = this.buffPosits.length - 1;
                var p2 = this.buffPosits[i2];
                while ((p1 < pos) && (i2 > i1 + 1)) {
                    var i3 = Math.floor((i1 + i2) / 2.0);
                    var p3 = this.buffPosits[i3];
                    if (p3 >= pos) {
                        i2 = i3;
                        p2 = p3;
                    }
                    else {
                        i1 = i3;
                        p1 = p3;
                    }
                }
                return i1;
            }

            this.pos2BuffIndexRight = function (pos) {
                var i1 = 0;
                var p1 = this.buffPosits[i1];
                var i2 = this.buffPosits.length - 1;
                var p2 = this.buffPosits[i2];
                while ((p2 > pos) && (i2 > i1 + 1)) {
                    var i3 = Math.ceil((i1 + i2) / 2.0);
                    var p3 = this.buffPosits[i3];
                    if (p3 <= pos) {
                        i1 = i3;
                        p1 = p3;
                    }
                    else {
                        i2 = i3;
                        p2 = p3;
                    }
                }
                return i2;
            }

            this.getSnpInfoRange = function (posMin, posMax, filter, hideFiltered) {
                var rs = {}

                var posits = [];
                var isFiltered = [];
                var idx1 = this.pos2BuffIndexLeft(posMin);
                var idx2 = this.pos2BuffIndexRight(posMax);

                //calculate presence fraction for each snp
                var buffPresence = [];
                for (var i = 0; i < idx1; i++)
                    buffPresence.push(0);
                for (var i = idx1; i <= idx2; i++) {
                    var ct = 0;
                    var totct = 0;
                    for (seqid in this.mySeqs) {
                        var seq = this.mySeqs[seqid];
                        var cov1 = seq.buffCov1[i];
                        var cov2 = seq.buffCov2[i];
                        var covtot = cov1 + cov2;
                        if (covtot >= filter.minSnpCoverage) {
                            if (Math.max(cov1, cov2) * 2.0 / (cov1 + cov2) - 1.0 >= filter.minSnpPurity)
                                ct++;
                        }
                        totct++;
                    }
                    buffPresence.push(ct * 1.0 / totct);
                }


                var idxlist = [];
                for (var i = idx1; i <= idx2; i++) {
                    var passed = true;
                    if (this.buffAvgCoverage[i] < filter.minAvgCoverage)
                        passed = false;
                    if (buffPresence[i] < filter.minPresence / 100.0)
                        passed = false;
                    if (this.buffAvgPurity[i] < filter.minAvgPurity)
                        passed = false;
                    if ((!this.buffSnpFilter[i]) && (filter.applyVCFFilter))
                        passed = false;
                    if (passed || (!hideFiltered)) {
                        idxlist.push(i);
                        posits.push(this.buffPosits[i]);
                        isFiltered.push(passed ? 0 : 1);
                    }
                }
                rs.posits = posits;
                rs.isFiltered = isFiltered;

                rs.SnpRefBase = [];
                rs.SnpAltBase = [];
                rs.AvgCoverage = [];
                rs.SnpAQ = [];
                rs.SnpMQ = [];
                rs.SnpFilter = [];
                for (var i = 0; i < idxlist.length; i++) {
                    var ii = idxlist[i];
                    rs.SnpRefBase.push(this.buffSnpRefBase[ii]);
                    rs.SnpAltBase.push(this.buffSnpAltBase[ii]);
                    rs.AvgCoverage.push(this.buffAvgCoverage[ii]);
                    rs.SnpAQ.push(this.buffSnpAQ[ii]);
                    rs.SnpMQ.push(this.buffSnpMQ[ii]);
                    rs.SnpFilter.push(this.buffSnpFilter[ii]);
                }

                var seqdata = {};
                for (seqid in this.mySeqs) {
                    var seq = this.mySeqs[seqid];
                    var cov1 = [];
                    var cov2 = [];
                    var pres = [];
                    for (var i = 0; i < idxlist.length; i++) {
                        var ii = idxlist[i];
                        var snpcov1 = seq.buffCov1[ii];
                        var snpcov2 = seq.buffCov2[ii];
                        cov1.push(snpcov1);
                        cov2.push(snpcov2);
                        var covtot = snpcov1 + snpcov2;
                        var present = 1;
                        if (covtot < filter.minSnpCoverage) present = 0;
                        else {
                            if (Math.max(snpcov1, snpcov2) * 2.0 / (snpcov1 + snpcov2) - 1.0 < filter.minSnpPurity)
                                present = 0;
                        }
                        pres.push(present);
                    }
                    seqdata[seqid] = { cov1: cov1, cov2: cov2, pres: pres };
                }
                rs.seqdata = seqdata;

                var extrafilterstep = false;
                if (filter.requireParentsPresent) {
                    extrafilterstep = true;
                    for (var i = 0; i < posits.length; i++) {
                        var parentspresent = true;
                        for (var pnr in this.parentIDs)
                            if (!seqdata[this.parentIDs[pnr]].pres[i])
                                parentspresent = false;
                        if (!parentspresent)
                            isFiltered[i] = true;
                    }
                }

                if ((extrafilterstep) && hideFiltered) {
                    globchannels = [rs.posits, rs.isFiltered, rs.SnpRefBase, rs.SnpAltBase, rs.AvgCoverage, rs.SnpAQ, rs.SnpMQ];
                    seqchannelnames = ['cov1', 'cov2', 'pres'];
                    var i2 = 0;
                    for (var i = 0; i < posits.length; i++) {
                        if (!isFiltered[i]) {
                            for (var chnr in globchannels)
                                globchannels[chnr][i2] = globchannels[chnr][i];
                            for (seqid in this.mySeqs) {
                                for (chnr in seqchannelnames) {
                                    seqdata[seqid][seqchannelnames[chnr]][i2] = seqdata[seqid][seqchannelnames[chnr]][i];
                                }
                            }
                            i2++;
                        }
                    }
                    for (var chnr in globchannels)
                        globchannels[chnr].length = i2;
                    for (seqid in this.mySeqs) {
                        for (chnr in seqchannelnames) {
                            seqdata[seqid][seqchannelnames[chnr]].length = i2;
                        }
                    }

                }

                return rs;
            }
        }

        return DataFetcherSnp;
    });    
    





