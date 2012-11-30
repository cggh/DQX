from shovel import task
import os
from os.path import join, relpath
import yaml
import MySQLdb
from example_app import config
import pprint

def chunks(l, n):
    """ Yield successive n-sized chunks from l.
    """
    for i in xrange(0, len(l), n):
        yield l[i:i+n]
@task
def build_filterbank_db(table_name, directory):
    fields = ('name', 'short_name', 'chromosome', 'sample', 'block_size', 'value', 'accumulators')
    fields2 = ('name', 'short_name', 'chomosome', 'sample', 'block_size', 'value', 'accumulators')
    channels = []
    with MySQLdb.connect(**config.db) as cur:
        cur.execute('DROP TABLE IF EXISTS {table_name}'.format(**locals()))
        cur.execute('CREATE TABLE {table_name} ('
                    'name VARCHAR(100) NOT NULL,'
                    'short_name VARCHAR(30) NOT NULL,'
                    'chromosome VARCHAR(20) NOT NULL,'
                    'sample VARCHAR(20) NOT NULL,'
                    'block_size INT NOT NULL,'
                    'value VARCHAR(100) NOT NULL,'
                    'accumulators VARCHAR(100) NOT NULL,'
                    'filename VARCHAR(100) NOT NULL,'
                    'PRIMARY KEY (filename))'.format(**locals())
        )
        cur.close()
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file[-5:] == '.yaml':
                with open(join(root, file)) as f:
                    data = yaml.load(f)
                    try:
                        channels.append([data[k] for k in fields]+[relpath(join(root, file), directory).replace('yaml','data')])
                    except KeyError:
                        channels.append([data[k] for k in fields2]+[relpath(join(root, file), directory).replace('yaml','data')])
        if len(channels) >= 100:
            print len(channels), 'found, inserting....'
            with MySQLdb.connect(**config.db) as cur:
                cur.executemany('INSERT INTO {table_name} '
                                '(name, short_name, chromosome, sample, block_size, value, accumulators, filename)'
                                'VALUES (%s, %s, %s, %s, "%s", %s, "%s", %s)'.format(**locals()),
                                channels
                          )
                cur.close()
            channels = []




