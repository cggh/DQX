define(["jquery", "DQX/DocEl", "DQX/Msg", "DQX/ChannelCanvas"],
    function ($, DocEl, Msg, ChannelCanvas) {
        var ChannelYVals = {};



        ChannelYVals.Channel = function (id) {
            var that = ChannelCanvas.Base(id);

            that.draw = function (drawInfo) {
                this.drawStandardGradientCenter(drawInfo);
                this.drawStandardGradientLeft(drawInfo);
                this.drawStandardGradientRight(drawInfo);
            }

            return that;
        }



        return ChannelYVals;
    });
