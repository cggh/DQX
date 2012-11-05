define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/ChannelCanvas"],
    function ($, DocEl, Msg, ChannelCanvas) {
        var ChannelYVals = {};



        ChannelYVals.Channel = function (id) {
            var that = ChannelCanvas.Base(id);

            that.draw = function (drawInfo) {
                this.drawStandardGradient(drawInfo, drawInfo.centerContext);
            }

            return that;
        }



        return ChannelYVals;
    });
