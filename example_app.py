from flask import Flask
import dqx.blueprint

app = Flask(__name__)
app.register_blueprint(dqx.blueprint)

@app.route('/')
def hello_world():
    return 'Hello World!'/0

print app.url_map

if __name__ == '__main__':
    app.debug= True
    app.run()