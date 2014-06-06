# This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

﻿/*


DQX.Encoder={};

DQX.b64codec = DQX.B64();


DQX.Encoder.FixedString = function (info) {
    var that = {};
    that.length = parseFloat(info.Len);

    that.decodeArray = function (datastr) {
        var rs = [];
        var ct = datastr.length / this.length;
        for (var i = 0; i < ct; i++)
            rs.push(datastr[i * this.length, (i + 1) * this.length])
        return rs;
    }

    return that;
}


DQX.Encoder.Float2B64 = function (info) {
    var that = {};
    that.offset = parseFloat(info.Offset);
    that.slope = parseFloat(info.Slope);
    that.length = parseFloat(info.Len);

    that.decodeArray = function (datastr) {
        return DQX.b64codec.arrayB642Float(datastr, this.length, this.slope, this.offset);
    }

    return that;
}




DQX.Encoder.FloatList2B64 = function (info) {
    var that = {};
    that.rangeOffset = parseFloat(info.RangeOffset);
    that.rangeSlope = parseFloat(info.RangeSlope);
    that.count = parseInt(info.Count);

    that.decodeArray = function (datastr) {
        var strlen = datastr.length;
        var reclen = that.count + 4;
        var rs = [];
        for (var offset = 0; offset < strlen; offset += reclen) {
            var minval = DQX.b64codec.B642IntFixed(datastr, offset + 0, 2) * that.rangeSlope + that.rangeOffset;
            var maxval = DQX.b64codec.B642IntFixed(datastr, offset + 2, 2) * that.rangeSlope + that.rangeOffset;
            var subrs = [];
            for (var i = 0; i < this.count; i++)
                subrs.push(minval + DQX.b64codec.B642IntFixed(datastr, offset + 4 + i, 1) / 63.0 * (maxval - minval));
            rs.push(subrs);
        }
        return rs;
    }

    return that;
}



DQX.Encoder.Create = function (info) {
    if (info['ID'] == 'Float2B64')
        return DQX.Encoder.Float2B64(info);
    if (info['ID'] == 'FloatList2B64')
        return DQX.Encoder.FloatList2B64(info);
    if (info['ID'] == 'FixedString')
        return DQX.Encoder.FixedString(info);
    DQX.reportError("Invalid encoder id " + info['ID']);
}

// A class that contains the downloaded summary data for a single level. blocksize is the number of positions in this level
DQX.DataFetcher.SummaryBlockLevel = function (iblocksize) {
    var that = {};
    that._currentRangeMin = 1000.0;
    that._currentRangeMax = -1000.0;
    that._blockStart = 0;
    that._blockSize = iblocksize;
    that._blockCount = 0;
    that._buffer = {};

    that.isRangeComplete = function (rangemin, rangemax) {
        return ((rangemin >= this._currentRangeMin) && (rangemax <= this._currentRangeMax));
    }

    //gets the values for this level frome the fetched data
    that._fetchRange = function (keylist) {
        this._currentRangeMin = parseFloat(keylist["start"]);
        this._currentRangeMax = parseFloat(keylist["stop"]);
        this._blockStart = parseFloat(keylist["blockstart"]);
        this._blockCount = parseFloat(keylist["blockcount"]);
        this._buffer = {};

        var propresults = keylist['results'];
        this._propertyBuffers = [];
        for (prop in propresults) {
            var dt = propresults[prop];
            this._buffer[prop] = DQX.Encoder.Create(dt.encoder).decodeArray(dt.data);
        }
    }

    //returns the number of points this level contains for a specific range
    that.getPointsInRange = function (rangemin, rangemax) {
        var startnr = Math.max(0, Math.floor(rangemin / this._blockSize) - this._blockStart);
        var endnr = Math.min(that._blockCount - 1, Math.ceil(rangemax / this._blockSize) - this._blockStart);
        return endnr - startnr;
    }

    //returns the data points in a specified range for a specific property identifier
    that.getColumnPoints = function (rangemin, rangemax, cid) {
        var thedata = {};
        thedata.xVals = [];
        thedata.YVals = [];
        if (!(cid in this._buffer))
            return thedata;
        var lst = this._buffer[cid];
        var startnr = Math.max(0, Math.floor(rangemin / this._blockSize) - this._blockStart);
        var endnr = Math.min(lst.length - 1, Math.ceil(rangemax / this._blockSize) - this._blockStart);
        thedata.extraInfo = {};
        thedata.startIndex = startnr;
        thedata.extraInfo.startBlockNr = this._blockStart + startnr;
        thedata.extraInfo.blockSize = this._blockSize;
        for (var i = startnr; i <= endnr; i++) {
            thedata.xVals.push((this._blockStart + i + 0.5) * this._blockSize);
            thedata.YVals.push(lst[i]);
        }
        return thedata;
    }

    that.getColumnPoint = function (currentloadindex, cid) {
        if (!(cid in this._buffer))
            return null;
        var lst = this._buffer[cid];
        if ((currentloadindex < 0) || (currentloadindex >= lst.length)) return null;
        return lst[currentloadindex];
    }



    return that;
}



//////////////////////////////////////////////////////////////////////////////////////
//  Class DQX.DataFetcher.SummaryColumn
//////////////////////////////////////////////////////////////////////////////////////

DQX.DataFetcher.SummaryColumn = function (iid, ifolder, iconfig, ipropid, iColor) {
    var that = {};
    that.myID = iid;
    that.myFolder = ifolder;
    that.myConfig = iconfig;
    that.myPropID = ipropid;


    that.myActiveCount = 0;


    that.isActive = function () {
        return this.myActiveCount > 0;
    }

    return that;
}


//////////////////////////////////////////////////////////////////////////////////////
//  Class DQX.DataFetcher.Summary
//////////////////////////////////////////////////////////////////////////////////////

DQX.DataFetcher.Summary = function (iserverurl, iminBlockSize, idesiredPointCount) {
    if (!(this instanceof arguments.callee)) DQX.reportError("Should be called as constructor!");

    this.desiredPointCount = idesiredPointCount;

    this.serverurl = iserverurl; //The server url to contact for this
    this.minBlockSize = iminBlockSize;
    this.maxBlockSize = 1.0e9;
    this.myColumns = {};
    this._myChromoID = '';

    this._isFetching = false;

    this._levelBuffers = []; //holds DQX.DataFetcher.SummaryBlockLevel

    //adds a column to be fetched, providing a column id and a color
    this.addFetchColumn = function (ifolder, iconfig, ipropid, color) {
        var cid = ifolder + '_' + iconfig + '_' + ipropid;
        if (cid in this.myColumns)
            DQX.reportError("Column id already present: " + cid);
        this.myColumns[cid] = DQX.DataFetcher.SummaryColumn(cid, ifolder, iconfig, ipropid, color);
        this.clearData();
        return this.myColumns[cid];
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

    //sets the active chromosome identifier for this data fetcher
    this.setChromoID = function (iID) {
        this._myChromoID = iID;
        this.clearData();
    }

    //remove all currently downloaded data
    this.clearData = function () {
        this._levelBuffers = [];
    }

    //returns the level buffer associated with an individual summary level
    this._getLevelBuffer = function (blocksize) {
        var strblocksize = blocksize.toString();
        if (!(strblocksize in this._levelBuffers))
            this._levelBuffers[strblocksize] = DQX.DataFetcher.SummaryBlockLevel(blocksize);
        return this._levelBuffers[strblocksize];
    }

    //returns the optimal level (defined by the block size) for a given range
    this.getOptimalBlockSize = function (rangemin, rangemax) {
        var desiredBlockSize = (rangemax - rangemin) / this.desiredPointCount;
        var blockSize = Math.max(1, Math.pow(2.0, Math.round(Math.log(desiredBlockSize / this.minBlockSize) / Math.log(2)))) * this.minBlockSize;
        blockSize = Math.min(blockSize, this.maxBlockSize);
        return blockSize;
    }

    //Call this to determine if all data in a specific range is ready, and start fetching extra data if necessary
    this.IsDataReady = function (rangemin, rangemax) {
        var blockSize = this.getOptimalBlockSize(rangemin, rangemax);
        var buffer = this._getLevelBuffer(blockSize);
        if (buffer.isRangeComplete(rangemin, rangemax)) {
            return true;
        }
        else {
            this._fetchRange(blockSize, rangemin, rangemax);
            return false;
        }
    }

    //get point data for a specific column in a specific range
    this.getColumnPoints = function (rangemin, rangemax, cid) {
        var blockSize = this.getOptimalBlockSize(rangemin, rangemax);
        var buffer = this._getLevelBuffer(blockSize);
        if (!buffer.isRangeComplete(rangemin, rangemax)) {//the optimal level does not have all data -> look for the level that has the max number of relevant points
            var ptcount = buffer.getPointsInRange(rangemin, rangemax);
            for (otherbuffid in this._levelBuffers) {
                var otherbuff = this._levelBuffers[otherbuffid];
                var otherptcount = otherbuff.getPointsInRange(rangemin, rangemax);
                if (otherptcount > ptcount) {
                    ptcount = otherptcount;
                    buffer = otherbuff;
                }
            }
        }
        return buffer.getColumnPoints(rangemin, rangemax, cid); ;
    }

    //get the column value for a specific point in the current load set
    this.getColumnPoint = function (blockSize, currentloadindex, cid) {
        var buffer = this._getLevelBuffer(blockSize);
        return buffer.getColumnPoint(currentloadindex, cid);
    }



    this._createActiveColumnListString = function () {
        var collist = "";
        for (var cid in this.myColumns)
            if (this.myColumns[cid].isActive()) {
                if (collist.length > 0) collist += "~";
                collist += this.myColumns[cid].myFolder;
                collist += "~" + this.myColumns[cid].myConfig;
                collist += "~" + this.myColumns[cid].myPropID;
            }
        return collist;
    }

    //internal
    this._ajaxResponse_FetchRange = function (resp) {
        if (!this._isFetching) return;
        this.hasFetchFailed = false;
        this._isFetching = false;
        var keylist = DQX.parseResponse(resp); //unpack the response

        if ("Error" in keylist) {
            this.hasFetchFailed = true;
            //alert('Error ' + keylist['Error']);
            setTimeout($.proxy(this.myDataConsumer.notifyDataReady, this.myDataConsumer), DQX.timeoutRetry);
            return;
        }

        //check that this ajax response contains all required columns (if not, this is likely to be an outdated response)
        for (var cid in this.myColumns)
            if (this.myColumns[cid].isActive())
                if (!(cid in keylist['results'])) {
                    this.myDataConsumer.notifyDataReady();
                    return; //if not, we should not proceed with parsing it
                }

        var blockSize = keylist['blocksize'];
        this._getLevelBuffer(blockSize)._fetchRange(keylist);

        //get the summariser info
        var propresults = keylist['results'];
        this._propertySummerariserInfo = {}
        for (prop in propresults) {
            this._propertySummerariserInfo[prop] = propresults[prop].summariser;
        }

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
    this._fetchRange = function (blockSize, rangemin, rangemax, needtotalrecordcount) {


        if (!this._isFetching) {
            var collist = this._createActiveColumnListString();
            //create some buffer around the requested range. This reduces the number of requests and gives the user a smoother experience when scrolling or zooming out
            var range = rangemax - rangemin;
            rangemin -= 1.5 * range;
            rangemax += 1.5 * range;

            var blockStart = Math.max(0, Math.floor(rangemin / blockSize));
            var blockCount = Math.ceil((rangemax - rangemin) / blockSize);

            //prepare the url
            var myurl = DQX.Url(this.serverurl);
            myurl.addUrlQueryItem("datatype", 'summinfo');
            myurl.addUrlQueryItem("dataid", this._myChromoID);
            myurl.addUrlQueryItem("ids", collist);
            myurl.addUrlQueryItem("blocksize", blockSize);
            myurl.addUrlQueryItem("blockstart", blockStart);
            myurl.addUrlQueryItem("blockcount", blockCount);
            myurl.addUrlQueryItem("start", rangemin); //not used by server: only used for reflecting info to this client response code
            myurl.addUrlQueryItem("stop", rangemax); //idem

            var urlstring = myurl.toString();

            if (collist.length > 0) {//launch the ajax request
                this._isFetching = true;
                var thethis = this;
                $.ajax({
                    url: urlstring,
                    success: function (resp) { thethis._ajaxResponse_FetchRange(resp) },
                    error: function (resp) { thethis._ajaxFailure_FetchRange(resp) }
                });
            }
            else {
                //todo: somehow update without the need for fetching?
            }
        }
    }


}
*/