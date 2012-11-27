from flask import Flask, render_template
import dqx.blueprint

app = Flask(__name__)
app.register_blueprint(dqx.blueprint)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.debug= True
    app.run()