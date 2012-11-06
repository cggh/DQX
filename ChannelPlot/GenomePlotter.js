define(["jquery", "DQX/ChannelPlotter", "DQX/Msg", "DQX/ChannelPlot/ChannelPlotter", "DQX/DataFetcher/DataFetcherAnnotation"],
    function ($, DocEl, Msg, ChannelPlotter, DataFetcherAnnotation) {
        var GenomePlotter = {};

        GenomePlotter.Plotter = function (iDivID, args) {
            var that = ChannelPlotter.Plotter(iDivID, args);

            //Create the data fetcher for the gen annotation information
            that._annotationFetcher = new DataFetcherAnnotation.Fetcher(args);
            that.addDataFetcher(that._annotationFetcher);

            return that;
        }


        return GenomePlotter;
    });
