from flask import Flask, render_template
import dqx

db_config = dict(host='129.67.45.41',
                 user='ben',
                 passwd='******',
                 db='test')

dqx_blueprint = dqx.Blueprint()
dqx_blueprint.add_view("annot", dqx.views.Annotation, db_config)

app = Flask(__name__)
app.register_blueprint(dqx_blueprint)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.debug = True
    print app.url_map
    app.run()