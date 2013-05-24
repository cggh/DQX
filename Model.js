define([DQXSCJQ(), DQXSC("Utils"), DQXSC("Msg")],
    function ($, Utils, Msg) {
        var Model = function(attrs) {
            var that = {};
            //Take a copy of the attrs
            that.attributes = $.extend({}, attrs);
            that.id = 'Model_'+DQX.getNextUniqueID();

            that.get = function(attr) {
                if (attr)
                    return that.attributes[attr];
                else
                    return that.attributes;
            };

            that.set = function(attr, value) {
                // Handle both `"key", value` and `{key: value}` -style arguments.
                var attrs = {};
                if (typeof attr === 'object') {
                    attrs = attr;
                } else {
                    (attrs = {})[attr] = value;
                }
                //Iterate over the new data, keeping track of which changed.
                var changed = [];
                $.each(attrs, function (attr, value) {
                    if (attr in that.attributes) {
                        if (that.attributes[attr] != value) {
                            that.attributes[attr] = value;
                            changed.push(attr);
                        }
                    } else {
                        DQX.reportError("attr " + attr + " not in model");
                    }
                });
                //For each of the changed attributes fire off an event
                $.each(changed, function(i, attr) {
                    Msg.broadcast({id: that.id, change:attr});
                });
                //If we have any changed fire off the general change event
                if (changed.length > 0)
                    Msg.broadcast({id: that.id, change:true});
                return (changed.length > 0);
            };

            that.on = function(spec, callback) {
                Msg.listen("", $.extend(spec, {id: that.id}), callback, that);
            };

            return that;
        };
        return Model;
});