define(["require", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/DocEl", "DQX/Utils", "DQX/FrameTree", "DQX/Popup", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/DataFetcher/DataFetchers", "config"],
    function (require, Framework, Controls, Msg, DocEl, DQX, FrameTree, Popup, GenomePlotter, ChannelYVals, DataFetchers, config) {
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
                this.dataFetcher = new DataFetchers.Curve('serverUrl', 'tableName', 'pos');
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
                    serverURL: 'serverUrl',
                    annotTableName: 'TableName',
                    chromnrfield: 'chrom'
                };
                this.panelBrowser = GenomePlotter.Panel(this.frameBrowser.getClientDivID(), browserConfig);
                this.frameBrowser.setClientObject(this.panelBrowser);

                for (var i = 0; i < config.chromosomes.length; i++) {
                    this.panelBrowser.addChromosome(config.chromosomes[i].name, config.chromosomes[i].name, config.chromosomes[i].len);
                }

//                //Prepare the channels
//                var dataFetcherSNPS = this.dataFetcherSNPs;
//                var channelValues = [];
//
//                this.panelBrowser.addDataFetcher(this.dataFetcherSNPs);
//                for (var fieldNr = 0; fieldNr < MetaData.fieldList.length; fieldNr++) {
//                    var fieldInfo = MetaData.fieldList[fieldNr];
//                    if (fieldInfo.fieldGroupID) {
//                        var compid = fieldInfo.id;
//                        var dataType = MetaData.MGDataType(fieldInfo.dataTypeID);
//                        if (dataType.isFloat()) {
//                            var theChannel = ChannelYVals.Channel(compid, { minVal: dataType.getMinValue(), maxVal: dataType.getMaxValue() });
//                            theChannel.setTitle(fieldInfo.name);
//                            this.panelBrowser.addChannel(theChannel, false);
//                            this.panelBrowser.channelModifyVisibility(theChannel.getID(), fieldInfo.channelDefaultVisible);
//                            var colinfo = this.dataFetcherSNPs.addFetchColumn(compid, "Float2");
//                            plotcomp = theChannel.addComponent(ChannelYVals.Comp(compid, this.dataFetcherSNPs, compid));
//                            plotcomp.myPlotHints.color = DQX.Color(0, 0, 0);
//                            plotcomp.myPlotHints.pointStyle = 1;
//                            theChannel.modifyComponentActiveStatus(compid, fieldInfo.channelDefaultVisible);
//                            this.panelBrowser.channelModifyVisibility(theChannel.getID(), fieldInfo.channelDefaultVisible);
//                            channelValues.push({ id: compid, dataType: dataType });
//                            theChannel.getToolTipContent = createChannelToolTip;
//                            theChannel.handlePointClicked = handleChannelPointClick;
//
//                        }
//                    }
//                }

                this.panelBrowser.showRegion("MAL1", 0, 100000);

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
//                this.panelBrowser.highlightRegion(this.panelBrowser.getChromoID(args.chromNr), args.position, 20);
//            },
//
//            //Call this function to jump to & highlight a specific region on the genome
//            onJumpGenomeRegion: function (context, args) {
//                DQX.assertPresence(args, 'chromNr'); DQX.assertPresence(args, 'start'); DQX.assertPresence(args, 'end');
//                this.activate();
//                this.panelBrowser.highlightRegion(this.panelBrowser.getChromoID(args.chromNr), (args.start + args.end) / 2, args.end - args.start);
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