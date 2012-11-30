from flask.views import View
from flask import request, jsonify, abort
from dqx import dbtools
from os.path import join
import yaml
import MySQLdb

#http://127.0.0.1:5000/dqx/filterbank?chromid=Pf3D7_01_v3&ids=ERR012788-normed_coverage&blocksize=64&blockstart=0&blockcount=4738&start=-116930.5&stop=186265.5

#Return annotation information for a chromosome region
class FilterBank(View):
    def __init__(self, db_config, table, tracks_dir):
        #Expect dict with keys host, user, passwd and db
        self.db_config = db_config
        self.table = table
        self.tracks_dir = tracks_dir

    def dispatch_request(self):
        #TODO Better handling of missing/bad args
        args = dbtools.sanitise_dict_vals(request.args,
            wanted=('chromid', 'ids', 'blocksize', 'blockstart', 'blockcount', 'start', 'stop'))
        return self.do_query(**args)

    def do_query(self, chromid='', ids='', blocksize='1', blockstart='0', blockcount='1', start='0', stop='0'):
        ids = ids.split('~')
        results = {}
        for id in ids:
            print id
            sample, short_name = id.split('-')
            with MySQLdb.connect(**self.db_config) as cur:
                table = self.table
                q = 'SELECT filename from {table} where (sample="{sample}") and ' \
                            '(short_name="{short_name}") and ' \
                            '(chromosome="{chromid}") and ' \
                            '(block_size="{blocksize}")'.format(**locals())
                cur.execute(q)
                try:
                    filename = cur.fetchall()[0][0]
                except IndexError:
                    abort(404)
                    return
            file = FilterBankFile(join(self.tracks_dir,filename))
            results[id] = file.metadata
            results[id]['data'] = file.get_rows(int(blockstart), int(blockcount))
        return jsonify({'results':results,
                        'blocksize':blocksize,
                        'start': start,
                        'stop': stop,
                        'blockstart': blockstart,
                        'blockcount': blockcount})

class FilterBankFile:
    def __init__(self, filename):
        self.file = open(filename, 'r')
        with open(filename.replace('.data','.yaml')) as md_file:
            self.metadata = yaml.load(md_file)
        #BEN TODO PROPERLY
        self.row_size = self.metadata['encoder']['FixedLengthB64']['length'] * len(self.metadata['accumulators'])
        self.block_size = self.metadata['block_size']

    def get_rows(self, start, length):
        self.file.seek(start*self.row_size)
        return self.file.read(length*self.row_size)

    def __del__(self):
        self.file.close()
