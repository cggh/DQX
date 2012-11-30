from dqx.B64 import ListEncoder
from dqx import dbtools
import MySQLdb
from flask.views import View
from flask import request, jsonify


#Return annotation information for a chromosome region
class Annotation(View):
    def __init__(self, db_config):
        #Expect dict with keys host, user, passwd and db
        self.db_config = db_config

    def dispatch_request(self):
        #TODO Better handling of missing/bad args
        args = dbtools.sanitise_dict_vals(request.args,
            wanted=('chromid', 'fstart', 'fstop', 'table', 'ftype', 'fsubtype', 'subfeatures'))
        return self.do_query(**args)

    def do_query(self, chromid='', fstart='0', fstop='0', table='', ftype='gene', fsubtype='exon', subfeatures='1'):
        fstart = str(int(fstart))
        fstop = str(int(fstop))
        with MySQLdb.connect(**self.db_config) as cur:
            typequery = '(ftype="{ftype}")'.format(**locals()) if ftype else '(true)'
            if subfeatures == '1':
                typequery += ' or (ftype="{fsubtype}")'.format(**locals())

            statement= 'SELECT fstart, fstop, fname, fid, ftype, fparentid FROM {table} WHERE ' \
                       '({typequery}) and (chromid="{chromid}") and (fstop>={fstart}) and (fstart<={fstop}) ' \
                       'ORDER BY fstart'.format(**locals())

            #TODO Should be proper logging
            print(statement + '\n')
            cur.execute(statement)
            starts, stops, names, ids, types, parentids = zip(*cur.fetchall())
            cur.close()

            return jsonify(**{'DataType': 'Points',
                    'Starts': ListEncoder.encode_integers_by_difference_B64(starts),
                    'Sizes': ListEncoder.encode_integers([x[1] - x[0] for x in zip(starts, stops)]),
                    'Names': ListEncoder.encode_strings(names),
                    'IDs': ListEncoder.encode_strings(ids),
                    'Types': ListEncoder.encode_strings(types),
                    'ParentIDs': ListEncoder.encode_strings(parentids),
                    'fstart': fstart,
                    'fstop': fstop,
                    })
