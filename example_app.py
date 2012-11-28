from flask import Flask, render_template
import dqx
import yaml

with open('config.yaml') as f:
    config = yaml.load(f)


dqx_blueprint = dqx.Blueprint()
dqx_blueprint.add_view("annot", dqx.views.Annotation, config['db'])

app = Flask(__name__)
app.register_blueprint(dqx_blueprint)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.debug = True
    print app.url_map
    app.run()