import string


class Base64:
    alphabet = string.ascii_uppercase + \
               string.ascii_lowercase + \
               string.digits + \
               '+-'
    #establish the inversion table:
    invencode = []
    for i in range(0, 255):
        invencode.append(0)
    for i in range(len(alphabet)):
        invencode[ord(alphabet[i])] = i

    @staticmethod
    def encode_int(val, maxcnt=-1):
        if val is None:
            return '~' * maxcnt
        rs = ''
        cnt = 0
        while (val > 0) or (cnt == 0) or (maxcnt > 0 and cnt < maxcnt):
            rs = Base64.alphabet[val & 63] + rs
            val >>= 6
            cnt += 1
        return rs

    @staticmethod
    def decode_int(st):
        rs = 0
        for ch in st:
            rs = rs * 64 + Base64.invencode[ord(ch)]
        return rs


class ListEncoder:
    @staticmethod
    def encode_integers(vals):
        result = {'Encoding': "Integer",
                  'Data': ','.join([str(x) for x in vals])}
        return result

    @staticmethod
    def encode_integers_by_difference_B64(vals):
        result = {}
        MinValX = 0
        if vals:
            MinValX = min(vals)
        result['Encoding'] = "IntegerDiffB64"
        result['Offset'] = MinValX
        diffpointsx = []
        prevxval = MinValX
        for xval in vals:
            if xval < prevxval:
                raise Exception("EncodeIntegersByDifferenceB64: list should be increasing in size")
            diffpointsx.append(int(round(xval - prevxval)))
            prevxval = xval
        result['Data'] = ','.join([Base64.encode_int(x) for x in diffpointsx])
        return result

    @staticmethod
    def encode_integers_B64(vals):
        result = {'Encoding': "IntegerB64",
                 'Data': ','.join([Base64.encode_int(int(0.5 + x)) for x in vals])}
        return result

    @staticmethod
    def encode_floats_by_int_B64(vals, bytecount):
        result = {'Encoding': "FloatAsIntB64"}
        MinVal = 0
        MaxVal = 1
        nonemptyvals = [x for x in vals if x is not None]
        if nonemptyvals:
            MinVal = min(nonemptyvals)
            MaxVal = max(nonemptyvals)
            if MaxVal == MinVal:
                MaxVal = MinVal + 1

        CompressedRange = int(64 ** bytecount - 10)
        Offset = MinVal
        Slope = (MaxVal - MinVal) / CompressedRange
        result['Offset'] = Offset
        result['Slope'] = Slope
        result['ByteCount'] = bytecount
        #result['Data']=''.join([Base64.encode_int(int((vl-Offset)/Slope),bytecount) for vl in vals])
        # this string is used to encode an absent value
        absentcode = '~' * bytecount
        result['Data'] = ''.join(
            [vl is None and absentcode or (Base64.encode_int(int((vl - Offset) / Slope), bytecount))
             for vl in vals]
        )
        return result

    @staticmethod
    def encode_strings(vals):
        #!!!todo: ensure that all string have nice compatible ascii content
        result = {'Encoding': "String",
                 'Data': '~'.join([(item or '') for item in vals])}
        return result

    @staticmethod
    def encode_by_method(vals, methodid):
        if methodid == 'ST':
            return ListEncoder.encode_strings(vals)
        if methodid == 'IN':
            return ListEncoder.encode_integers(vals)
        if methodid == 'IB':
            return ListEncoder.encode_integers_B64(vals)
        if methodid == 'ID':
            return ListEncoder.encode_integers_by_difference_B64(vals)
        if methodid == 'F2':
            return ListEncoder.encode_floats_by_int_B64(vals, 2)
        if methodid == 'F3':
            return ListEncoder.encode_floats_by_int_B64(vals, 3)
        raise Exception('Invalid column encoding identifier {0}'.format(methodid))
