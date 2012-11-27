from flask import Blueprint

blueprint = Blueprint('dqx', __name__, static_folder='static', url_prefix='/dqx')
