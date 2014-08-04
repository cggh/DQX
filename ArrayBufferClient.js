// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

/************************************************************************************************************************************
 *************************************************************************************************************************************

 Handles requests to the server that return arraybuffer objects

 *************************************************************************************************************************************
 *************************************************************************************************************************************/

define(["datastream"],
    function (DataStream) {

        var ArrayBufferClient = {};

        var decode_single_array = function (stream) {
            var dtype = stream.readCString();
            if (dtype == 'S')
                dtype = '|S';
            var numDim = stream.readUint8();
            var shape = [];
            for (var i = 0; i < numDim; i++)
                shape.push(stream.readUint32());
            var array_len = stream.readUint32();
            var endian;
            switch (dtype[0]) {
                case '<':
                    endian = DataStream.LITTLE_ENDIAN;
                    break;
                case '>':
                    endian = DataStream.BIG_ENDIAN;
                    break;
                case '|':
                    endian = DataStream.LITTLE_ENDIAN;
                    break;
                default:
                    DQX.reportError("dtype doesn't start with endianness");
                    return;
            }
            var array;
            switch (dtype.substring(1)) {
                case 'u1':
                    array = stream.readUint8Array(array_len);
                    break;
                case 'u2':
                    array = stream.readUint16Array(array_len, endian);
                    break;
                case 'u4':
                    array = stream.readUint32Array(array_len, endian);
                    break;
                case 'i1':
                    array = stream.readInt8Array(array_len);
                    break;
                case 'i2':
                    array = stream.readInt16Array(array_len, endian);
                    break;
                case 'i4':
                    array = stream.readInt32Array(array_len, endian);
                    break;
                case 'f4':
                    array = stream.readFloat32Array(array_len, endian);
                    break;
                case 'f8':
                    array = stream.readFloat64Array(array_len, endian);
                    break;
                case 'S':
                    array = _.times(array_len, function() {
                        return stream.readCString();
                    });
                    break;
                default:
                    DQX.reportError("unsupported dtype");
                    return;
            }
            //Firefox is a PITA and won't let us set properties on TypedArrays, so we have to wrap them in an object
            var result = {
              array:array,
              shape:shape
            }
            return result;
        };

        var decode_array_set = function (stream) {
            var num_arrays = stream.readUint8();
            var result = {};
            for (var i=0; i<num_arrays; i++) {
                var name = stream.readCString();
                result[name] = decode_single_array(stream);
            }
            return result;
        };
        var decode = function (buffer, success, failure) {
            var stream = new DataStream(buffer);
            //The initial metadata is always little endian
            stream.endianness = DataStream.LITTLE_ENDIAN;
            //We now decode the response, see arraybuffer.py:
            var magic = stream.readString(2);
            var result;
            if (magic == 'AB')
                result = decode_single_array(stream);
            else if (magic == 'AS')
                result = decode_array_set(stream);
            else {
                DQX.reportError('Not array buffer stream');
                failure();
                return;
            }
            success(result);
        };

        ArrayBufferClient.request = function (url, success, failure) {
            $.ajax({
                    url: url,
                    success: function(data) {
                        if (data != null)
                            decode(data, success, failure);
                        else
                            failure();
                    },
                    error: failure,
                    dataType: 'arraybuffer' // See extra code in jquery.js
                }
            );
        };
        return ArrayBufferClient;
    }
);