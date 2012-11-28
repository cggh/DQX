import flask
import views

class Blueprint(flask.Blueprint):
    def __init__(self):
        super(Blueprint, self).__init__('dqx', __name__, static_folder='static', url_prefix='/dqx')
    def add_view(self, name, view, *view_args, **view_kwargs):
        self.add_url_rule('/' + name, view_func=view.as_view(name, *view_args, **view_kwargs))