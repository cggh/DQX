define([DQXSCExt("jquery"), DQXSC("Utils")],
    function ($, DQX) {

        var DataDecoders = {}

        /////////////////////////////////////////////////////////////////////////////////////////
        //Basic base64 encoding/decoding
        /////////////////////////////////////////////////////////////////////////////////////////

        DataDecoders.B64 = function () {
            var that = {};
            that.encodestr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-";
            that.invencode = [];
            for (var i = 0; i < 255; i++) that.invencode.push(0);
            for (var i = 0; i < that.encodestr.length; i++)
                that.invencode[that.encodestr[i].charCodeAt(0)] = i;

            //Converts a 64bit encoded integer to an integer
            that.B642Int = function (st) {
                rs = 0;
                for (var i = 0; i < st.length; i++)
                    rs = (rs << 6) + this.invencode[st.charCodeAt(i)]
                return rs;
            }

            //Converts a 64bit encoded integer to an integer
            that.B642IntFixed = function (st, offset, len) {
                rs = 0;
                for (var i = 0; i < len; i++)
                    rs = (rs << 6) + this.invencode[st.charCodeAt(offset + i)]
                return rs;
            }


            //Converts a set of 64bit encoded integers to float array, applying a linear mapping using slope and offset
            that.arrayB642Float = function (st, bytecount, slope, offset) {
                var vals = [];
                var cnt = st.length / bytecount;
                var ps = 0;
                for (var i = 0; i < cnt; i++) {
                    if ((st[ps] == '~') || (st[ps] == '#')) {//coding for absent value
                        vals.push(null);
                        ps += bytecount;
                    }
                    else {
                        var rs = 0;
                        for (var j = 0; j < bytecount; j++) {
                            rs = (rs << 6) + this.invencode[st.charCodeAt(ps)];
                            ps++;
                        }
                        vals.push(rs * slope + offset);
                    }
                }
                return vals;
            }

            return that;
        }

        /////////////////////////////////////////////////////////////////////////////////////////
        //Decoder for different formats of value lists as provided by the server
        /////////////////////////////////////////////////////////////////////////////////////////

        DataDecoders.ValueListDecoder = function () {
            var that = {};
            that.b64codec = DataDecoders.B64();
            that.doDecode = function (data) {

                if (data['Encoding'] == 'IntegerDiffB64') {
                    if (data['Data'].length == 0) return [];
                    var vals = [];
                    var offset = data['Offset'];
                    var datastrlist = data['Data'].split(',');
                    for (var i = 0; i < datastrlist.length; i++) {
                        offset += this.b64codec.B642Int(datastrlist[i]);
                        vals.push(offset);
                    }
                    return vals;
                }

                if (data['Encoding'] == 'IntegerB64') {
                    if (data['Data'].length == 0) return [];
                    var vals = [];
                    var datastrlist = data['Data'].split(',');
                    for (var i = 0; i < datastrlist.length; i++)
                        vals.push(this.b64codec.B642Int(datastrlist[i]));
                    return vals;
                }

                if (data['Encoding'] == 'FloatAsIntB64') {
                    if (data['Data'].length == 0) return [];
                    var offset = data['Offset'];
                    var slope = data['Slope'];
                    var bytecount = data['ByteCount'];
                    var datastr = data['Data'];
                    var vals = this.b64codec.arrayB642Float(datastr, bytecount, slope, offset);
                    return vals;
                }
                if (data['Encoding'] == 'Integer') {
                    if (data['Data'].length == 0) return [];
                    var vals = [];
                    var datastrlist = data['Data'].split(',');
                    for (var i = 0; i < datastrlist.length; i++) {
                        vals.push(parseInt(datastrlist[i]));
                    }
                    return vals;
                }
                if (data['Encoding'] == 'String') {
                    if (data['Data'].length == 0) return [];
                    var vals = data['Data'].split('~');
                    return vals;
                }
                throw "Unknown value list encoding: " + data['Encoding'];
            }

            return that;
        }

        return DataDecoders;
    });
