define(["jquery", "DQX/ChannelPlotter", "DQX/Msg", "DQX/ChannelPlotter" ],
    function ($, DocEl, Msg, ChannelPlotter) {
        var GenomePlotter = {};

        GenomePlotter.Plotter = function (iDivID, args) {
            var that = ChannelPlotter.Plotter(iDivID, args);

            return that;
        }


        return GenomePlotter;
    });
