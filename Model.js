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
                if (attr in that.attributes) {
                    that.attributes[attr] = value;
                    Msg.broadcast({id: that.id, change:attr});
                    return true;
                } else {
                    DQX.reportError("attr " + attr + " not in model");
                    return false;
                }
            };

            that.on = function(spec, callback) {
                Msg.listen("", $.extend(spec, {id: that.id}), callback, that);
            };

            return that;
        };
        return Model;
});