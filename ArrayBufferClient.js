/************************************************************************************************************************************
 *************************************************************************************************************************************

 Handles requests to the server that return arraybuffer objects

 *************************************************************************************************************************************
 *************************************************************************************************************************************/

define(["datastream"],
  function (DataStream) {

    var ArrayBufferClient = {};

    var decode = function(buffer, success, failure) {
      var stream = new DataStream(buffer);
      //The initial metadata is always little endian
      stream.endianness = DataStream.LITTLE_ENDIAN;
      //We now decode the response:
      //- First two bytes are 'AB'
      //- A /0 terminated cstyle string which is a valid numpy dtype, but which always includes the
      //endianness as first char. '<' little-endian, '>' big-endian, '|'not applicable.
      //  - 1-byte unsigned little endian number of dimensions = D
      //  - D x 4-byte unsigned little endians dimension sizes
      //  - 4-byte unsigned little endian buffer size (equal to the product of dimension sizes and byte length of dtype)
      //- The buffer itself.
      var magic = stream.readString(2);
      if (magic != 'AB')
        failure('Not array buffer stream');
      var dtype = stream.readCString();
      var numDim = stream.readUint8();
      var shape = [];
      for (var i=0; i < numDim;i++)
        shape.push(stream.readUint32());
      var arrayBytes = stream.readUint32();
      var endian;
      if (dtype[0] == '<')
         endian = DataStream.LITTLE_ENDIAN;
      else {
        if (dtype[0] == '>')
          endian = DataStream.BIG_ENDIAN;
        else
          failure("dtype doesn't start with endianness");
      }
      var array;
      switch (dtype.substring(1)) {
        case 'u1':
          array = stream.readUint8Array(null);
          break;
        case 'u2':
          array = stream.readUint16Array(null, endian);
          break;
        case 'u4':
          array = stream.readUint32Array(null, endian);
          break;
        case 'i1':
          array = stream.readInt8Array(null);
          break;
        case 'i2':
          array = stream.readInt16Array(null, endian);
          break;
        case 'i4':
          array = stream.readInt32Array(null, endian);
          break;
        case 'f4':
          array = stream.readFloat32Array(null, endian);
          break;
        case 'f8':
          array = stream.readFloat64Array(null, endian);
          break;
        default:
          failure("unsupported dtype");
      }
      array.shape = shape;
      success(array);
    };

    ArrayBufferClient.request = function(url, success, failure) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true/*async*/);
      xhr.responseType = 'arraybuffer';
      xhr.onreadystatechange = function handler() {
        if(this.readyState == this.DONE) {
          if(this.status == 200 && this.response != null) {
            decode(this.response, success, failure);
            return;
          }
          //error
          failure();
        }
      };
      xhr.send();

    };
    return ArrayBufferClient;
  }
);