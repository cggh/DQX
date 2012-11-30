define(["require", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/DocEl", "DQX/Utils", "DQX/FrameTree", "DQX/Popup", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "config"],
    function (require, Framework, Controls, Msg, DocEl, DQX, FrameTree, Popup, GenomePlotter, ChannelYVals, DataFetchers, DataFetcherSummary, config) {
        var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

        var GenomeBrowser = (function() {
            function GenomeBrowser(parentFrame) {
                this.createPanels = __bind(this.createPanels, this);
                //Constructor
                parentFrame.setInitialiseFunction(this.createPanels);
                this.frameChannels = parentFrame.addMemberFrame(Framework.FrameFinal('GenomeChannels', 0.1));
                this.frameChannels.setMargins(0);
                this.frameChannels.setDisplayTitle('Channels');
                this.frameChannels.sizeRange[Framework.dimX].setMinSize(300);

                this.frameBrowser = parentFrame.addMemberFrame(Framework.FrameFinal('GenomeBrowser', 1));
                this.frameBrowser.setMargins(0);
                this.frameBrowser.setDisplayTitle('Browser');
                this.frameBrowser.allowXScrollbar = false;
                this.frameBrowser.allowYScrollbar = false;
                Msg.listen("", { type: 'JumpgenomePosition' }, $.proxy(this.onJumpGenomePosition, this));
                Msg.listen("", { type: 'JumpgenomeRegion' }, $.proxy(this.onJumpGenomeRegion, this));
            }

            GenomeBrowser.prototype.createPanels = function() {
                //Left channel selection area
                this.treeChannels = FrameTree.Tree('treeChannels', this.frameChannels.getClientDivID());
                this.frameChannels.setClientObject(this.treeChannels);
                var branchChannels = this.treeChannels.root.addItem(FrameTree.Branch('channels', DocEl.StyledText('Channels', 'DQXLarge')));
                branchChannels.canSelect = false;
                this.treeChannels.render();

                //Right channel view
                var browserConfig = {
                    serverURL: 'dqx/annot',
                    annotTableName: 'pfannot',
                    chromnrfield: 'chromid'
                };
                this.genome_panel = GenomePlotter.Panel(this.frameBrowser.getClientDivID(), browserConfig);
                this.frameBrowser.setClientObject(this.genome_panel);

                for (var i = 0; i < config.chromosomes.length; i++) {
                    this.genome_panel.addChromosome(config.chromosomes[i].name, config.chromosomes[i].name, config.chromosomes[i].len);
                }

                this.data_fetcher = new DataFetcherSummary.Summary('dqx/filterbank', 1, 1100);
                this.genome_panel.addDataFetcher(this.data_fetcher);
                
                var test_channel = ChannelYVals.Channel('fasbat', 0, 1000);
                test_channel.setTitle("Test");
                this.genome_panel.addChannel(test_channel, false);
                this.genome_panel.channelModifyVisibility(test_channel.getID(), true);
                var col_info = this.data_fetcher.addFetchColumn('ERR012788-num_reads', DQX.Color(0, 0, 0));
                var component = test_channel.addComponent(ChannelYVals.Comp('compID', this.data_fetcher, col_info.myID));
                test_channel.modifyComponentActiveStatus('compID', true);
                component.myPlotHints.makeDrawLines(3000000.0); //This causes the points to be connected with lines
                component.myPlotHints.interruptLineAtAbsent = true;
                component.myPlotHints.drawPoints = false;


                this.genome_panel.showRegion("Pf3D7_01", 0, 100000);

            };
            return GenomeBrowser;
        })();
        return GenomeBrowser;
    }
);
//        var theGenomeBrowser = {
//
//            createPanelChannels: function () {
//                theGenomeBrowser.createChannelsPanel();
//                theGenomeBrowser.createBrowserPanel();
//            },
//
//            //Given a channel id, jump to the corresponding sample set
//            jumpSampleSet: function (id) {
//                require("Page").navigateSampleSet(id.split('_')[1]);
//            },
//
//            //modifies the visibility status of a channel, prodived its id
//            channelModifyVisibility: function (id, status) {
//                theGenomeBrowser.panelBrowser.findChannel(id).modifyComponentActiveStatus(id, status);
//                theGenomeBrowser.panelBrowser.channelModifyVisibility(id, status);
//            },
//
//            //Returns the query filter the snp set displayed in the browser is subject to, or null if there is no filter
//            getSNPSetQuery: function () {
//                if (theGenomeBrowser.check_GenomeBrowserFreqQueryOnly.getValue() == 'true')
//                    return theGenomeBrowser.SNPSetQuery;
//                else
//                    return null;
//            },
//
//            //Updates the query filter for the snps that are displayed in the browser
//            updateSNPSetQuery: function () {
//                theGenomeBrowser.dataFetcherSNPs.setUserQuery2(theGenomeBrowser.getSNPSetQuery());
//                theGenomeBrowser.panelBrowser.render();
//            },
//
//            createBrowserPanel: function () {
//            },
//
//            //Call this function to jump to & highlight a specific position on the genome
//            onJumpGenomePosition: function (context, args) {
//                DQX.assertPresence(args, 'chromNr'); DQX.assertPresence(args, 'position');
//                this.activate();
//                this.genome_panel.highlightRegion(this.genome_panel.getChromoID(args.chromNr), args.position, 20);
//            },
//
//            //Call this function to jump to & highlight a specific region on the genome
//            onJumpGenomeRegion: function (context, args) {
//                DQX.assertPresence(args, 'chromNr'); DQX.assertPresence(args, 'start'); DQX.assertPresence(args, 'end');
//                this.activate();
//                this.genome_panel.highlightRegion(this.genome_panel.getChromoID(args.chromNr), (args.start + args.end) / 2, args.end - args.start);
//            },
//
//            jumpSNP: function (snpid) {
//                theGenomeBrowser.activate();
//                var chromid = snpid.split(':')[0]; //!!!this is currently a hack until we have proper snp id's
//                var pos = parseInt(snpid.split(':')[1]);
//                theGenomeBrowser.panelBrowser.highlightRegion(chromid, pos, 20);
//            },
//
//            jumpGene: function (args) {
//                theGenomeBrowser.activate();
//                theGenomeBrowser.panelBrowser.highlightRegion(args.chromid, (args.start + args.stop) / 2, (args.stop - args.start));
//            },
//
//            //Call this function to bring the genome browser in display
//            activate: function () {
//                var tabswitched = theGenomeBrowser.frameBrowser.makeVisible();
//                theGenomeBrowser.panelBrowser.handleResize(); //force immediate calculation of size
//                theMap.createMapPoints();
//            },
//
//            end: true
//        };
//        return theGenomeBrowser;
//    });