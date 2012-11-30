import yaml
import sys

#Some magic to allow us to ask the module for classes by string and dict
class Wrapper:
    def __init__(self, wrapped):
        self.wrapped = wrapped
    def __getattr__(self,name):
        return self.wrapped[name]

with open('config.yaml') as f:
    config = yaml.load(f)

sys.modules[__name__] = Wrapper(config)
