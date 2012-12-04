define(["require", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/DocEl", "DQX/Utils", "DQX/FrameTree", "DQX/Popup", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "config"],
    function (require, Framework, Controls, Msg, DocEl, DQX, FrameTree, Popup, GenomePlotter, ChannelYVals, DataFetchers, DataFetcherSummary, config) {
        var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

        var GenomeBrowser = (function() {
            function GenomeBrowser(parentFrame) {
                this.createPanels = __bind(this.createPanels, this);
                this.createChannel = __bind(this.createChannel, this);
                this.channelModifyVisibility = __bind(this.channelModifyVisibility, this);
                this.sampleModifyVisibility = __bind(this.sampleModifyVisibility, this);
                this.updateVisibility = __bind(this.updateVisibility, this);

                //Constructor
                parentFrame.setInitialiseFunction(this.createPanels);
                this.frameSelectors = parentFrame.addMemberFrame(Framework.FrameGroupVert('GenomeSelectors', 0.1));
                this.frameSelectors.sizeRange[Framework.dimX].setMinSize(300);

                this.frameBrowser = parentFrame.addMemberFrame(Framework.FrameFinal('GenomeBrowser', 1));
                this.frameBrowser.setMargins(0);
                this.frameBrowser.setDisplayTitle('Browser');
                this.frameBrowser.allowXScrollbar = false;
                this.frameBrowser.allowYScrollbar = false;

                this.frameChannels = this.frameSelectors.addMemberFrame(Framework.FrameFinal('GenomeChannels', 1));
                this.frameChannels.setMargins(0);
                this.frameChannels.setDisplayTitle('Channels');

                this.frameSamples = this.frameSelectors.addMemberFrame(Framework.FrameFinal('GenomeSamples', 1));
                this.frameSamples.setMargins(0);
                this.frameSamples.setDisplayTitle('Samples');


                Msg.listen("", { type: 'JumpgenomePosition' }, $.proxy(this.onJumpGenomePosition, this));
                Msg.listen("", { type: 'JumpgenomeRegion' }, $.proxy(this.onJumpGenomeRegion, this));
            }

            GenomeBrowser.prototype.createPanels = function() {
                //Left channel selection area
                this.treeSamples = FrameTree.Tree('treeSamples', this.frameSamples.getClientDivID());
                var branch = FrameTree.Branch('samples', DocEl.StyledText('Samples', 'DQXLarge'));
                var branch_samples = this.treeSamples.root.addItem(branch);
                branch_samples.canSelect = false;
                var that = this;
                for (var key in config.samples) {
                    var sample_type_group = branch_samples.addItem(FrameTree.Branch(key.replace(/\s+/g, ''), DocEl.StyledText(key, 'DQXSemiLarge')));
                    sample_type_group.collapsed = true;
                    for (var i = 0; i < config.samples[key].length; i++) {
                        (function() { //Closure to get proper binding.... le sigh
                            var sample_name = config.samples[key][i].short_name;
                            var check = Controls.Check(
                                'SampleControl' + sample_name,
                                {label: config.samples[key][i].short_name+' '+config.samples[key][i].ox_code, value: false});
                            sample_type_group.addItem(FrameTree.Control(check));
                            Msg.listen('CtrlValueChanged' + sample_name, { type: 'CtrlValueChanged', id: check.getID() },
                                function (scope, ctrl) {
                                    that.sampleModifyVisibility(sample_name, check.getValue());
                                });
                        })();
                    }
                }
                this.frameSamples.setClientObject(this.treeSamples);
                this.treeSamples.render();


                this.treeChannels = FrameTree.Tree('treeChannels', this.frameChannels.getClientDivID());
                var branch = FrameTree.Branch('channels', DocEl.StyledText('Channels', 'DQXLarge'));
                var branch_channels = this.treeChannels.root.addItem(branch);
                branch_channels.canSelect = false;
                var that = this;
                for (var key in config.tracks) {
                    var channel_type_group = branch_channels.addItem(FrameTree.Branch(key.replace(/\s+/g, ''), DocEl.StyledText(key, 'DQXSemiLarge')));
                    channel_type_group.collapsed = true;
                    for (var i = 0; i < config.tracks[key].length; i++) {
                        (function() { //Closure to get proper binding.... le sigh
                            var chan_name = config.tracks[key][i].short_name;
                            var check = Controls.Check(
                                'ChannelControl' + chan_name,
                                {label: config.tracks[key][i].name, value: false});
                            channel_type_group.addItem(FrameTree.Control(check));
                            Msg.listen('CtrlValueChanged' + chan_name, { type: 'CtrlValueChanged', id: check.getID() },
                                function (scope, ctrl) {
                                    that.channelModifyVisibility(chan_name, check.getValue());
                                });
                        })();
                    }
                }
                this.frameChannels.setClientObject(this.treeChannels);
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

                samples_names = [];
                this.samples_enabled = {};
                for (var key in config.samples) {
                    for (var i = 0; i < config.samples[key].length; i++) {
                        samples_names.push(config.samples[key][i].short_name);
                        this.samples_enabled[config.samples[key][i].short_name] = false;
                    }
                }

                this.data_fetchers = {};
                for (var i = 0; i < samples_names.length; i++) {
                    this.data_fetchers[samples_names[i]] = new DataFetcherSummary.Summary('dqx/filterbank', 1, 1100);
                    this.genome_panel.addDataFetcher(this.data_fetchers[samples_names[i]]);
                }

                this.tracks_enabled = {};
                for (var key in config.tracks) {
                    for (var i = 0; i < config.tracks[key].length; i++) {
                        this.createChannel(config.tracks[key][i].short_name, samples_names, config.tracks[key][i].name, config.tracks[key][i].range);
                        this.tracks_enabled[config.tracks[key][i].short_name] = false;
                    }
                }

                //this.createChannel("normed_coverage", config.samples, "Normalised Coverage", [0,50]);
                //this.createChannel("num_reads", ["ERR012788"], "title");
                this.genome_panel.showRegion("Pf3D7_01", 0, 1000000);

            };

            GenomeBrowser.prototype.createChannel = function(short_name, component_names, title, range) {
                var test_channel = ChannelYVals.Channel(short_name, range[0], range[1]);
                test_channel.setTitle(title);
                this.genome_panel.addChannel(test_channel, false);
                this.genome_panel.channelModifyVisibility(test_channel.getID(), false);

                for (var i = 0; i < component_names.length; i++) {
                    var col = DQX.hslToRgb(i/component_names.length, 1,.5);
                    console.log(col);
                    var col_info = this.data_fetchers[component_names[i]].addFetchColumn(component_names[i]+'-'+short_name);
                    var comp = ChannelYVals.Comp(component_names[i], this.data_fetchers[component_names[i]], col_info.myID);
                    comp.setColor(DQX.Color(col[0]/255, col[1]/255, col[2]/255));
                    var component = test_channel.addComponent(comp);
                    test_channel.modifyComponentActiveStatus(component_names[i], false);
                    component.myPlotHints.makeDrawLines(3000000.0); //This causes the points to be connected with lines
                    component.myPlotHints.interruptLineAtAbsent = true;
                    component.myPlotHints.drawPoints = false;
                }
            };

            GenomeBrowser.prototype.sampleModifyVisibility = function (id, status) {
                this.samples_enabled[id] = status;
                this.updateVisibility();
            };

            GenomeBrowser.prototype.channelModifyVisibility = function (id, status) {
                this.tracks_enabled[id] = status;
                this.updateVisibility();
            };

            GenomeBrowser.prototype.updateVisibility = function () {
                for (key_t in this.tracks_enabled) {
                    this.genome_panel.channelModifyVisibility(key_t, this.tracks_enabled[key_t]);
                    for (key_s in this.samples_enabled) {
                        this.genome_panel.findChannel(key_t).modifyComponentActiveStatus(key_s, this.tracks_enabled[key_t] && this.samples_enabled[key_s]);
                    }
                }
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