/************************************************************************************************************************************
*************************************************************************************************************************************



*************************************************************************************************************************************
*************************************************************************************************************************************/


define([DQXSCJQ(), DQXSC("Msg"), DQXSC("ChannelPlot/ChannelPlotter"), DQXSC("DataFetcher/DataFetcherAnnotation"), DQXSC("ChannelPlot/ChannelAnnotation"), DQXSC("SQL"), DQXSC("DocEl"), DQXSC("DataDecoders"), DQXSC("Controls")],
    function ($, Msg, ChannelPlotter, DataFetcherAnnotation, ChannelAnnotation, SQL, DocEl, DataDecoders, Controls) {
        var GenomePlotter = {};




        GenomePlotter.Panel = function (iParentRef, args) {
            var that = ChannelPlotter.Panel(iParentRef, args);

            DQX.assertPresence(args, 'viewID');
            that.viewID = args.viewID;

            that._chromosomes = [];

            if (args.chromoIdField) {
                that.chromoIdField = args.chromoIdField;
            }
            else {
                DQX.assertPresence(args, 'chromnrfield');
                that.chromoNrField = args.chromnrfield;
            }


            //Create the data fetcher for the gen annotation information
            that._annotationFetcher = new DataFetcherAnnotation.Fetcher(args);
            that.addDataFetcher(that._annotationFetcher);

            that._MaxZoomFactX = 1.0 / 0.2;
            that.getNavigator.minScrollSize = 0.0001;

            that.annotationChannel = ChannelAnnotation.Channel("_Annotation", that._annotationFetcher);
            that.annotationChannel.setTitle('Genes');
            that.annotationChannel.darkenFactor = 0.85;
            that.addChannel(that.annotationChannel, true);

            that.getAnnotationFetcher = function () {
                return this._annotationFetcher;
            }

            that.getAnnotationChannel = function () {
                return this.annotationChannel;
            }

            //converts a chromosome id to a chromosome number
            that.getChromoNr = function (chromoid) {
                for (var chromnr = 0; chromnr < this._chromosomes.length; chromnr++)
                    if (this._chromosomes[chromnr].id == chromoid)
                        return chromnr + 1;
                return null;
            }


            //converts a chromosome id to a chromosome number
            that.getChromoID = function (chromonr) {
                return this._chromosomes[chromonr - 1].id;
            }

            that.getCurrentChromoID = function () {
                return this.getChromoID(this.currentChromoNr);
            }

            //Call this function to switch to another chromosome
            that.setChromosome = function (newchromoid, updatepicker, redraw) {
                var newchromonr = this.getChromoNr(newchromoid);
                if (newchromonr == null) {
                    alert('This feature is not in the scope of the current data set');
                    return;
                }
                if (newchromonr != this.currentChromoNr)
                    this.clearData();
                this._fullRangeMin = -this._chromosomes[newchromonr - 1].size * 1.0E6 / 2000;
                this._fullRangeMax = this._chromosomes[newchromonr - 1].size * 1.0E6;
                this.currentChromoNr = newchromonr;

                if (updatepicker)
                    that.getElemJQ("ChromoPicker").val(newchromonr);

                //Defines the restricting query for all channels
                if (that.chromoIdField) {
                    var chromoquery = SQL.WhereClause.CompareFixed(that.chromoIdField, '=', this._chromosomes[this.currentChromoNr - 1].id);
                }
                else {
                    var chromoquery = SQL.WhereClause.CompareFixed(that.chromoNrField, '=', that.currentChromoNr);
                }
                for (var fetchnr = 0; fetchnr < this._myDataFetchers.length; fetchnr++) {
                    if ('setUserQuery1' in this._myDataFetchers[fetchnr])
                        this._myDataFetchers[fetchnr].setUserQuery1(chromoquery);
                    if ('setChromoID' in this._myDataFetchers[fetchnr])
                        this._myDataFetchers[fetchnr].setChromoID(this._chromosomes[this.currentChromoNr - 1].id);
                }

                if (redraw) {
                    this.render();
                    //this.myHScroller.draw();
                }
            }

            //adds a new chromosome to the viewer
            that.addChromosome = function (iid, iname, isize) {//size in megabases
                this._fullRangeMin = -0.25E6; //start point of the full x range
                this._chromosomes.push({ id: iid, name: iname, size: isize });
                //fills in the value in the combo box showing the chromosomes
                var rs = '';
                for (var chromnr = 0; chromnr < this._chromosomes.length; chromnr++)
                    rs += '<option value="' + (chromnr + 1).toString() + '">' + this._chromosomes[chromnr].name + '</option>';
                that.getElemJQ("ChromoPicker").html(rs);
            }

            //Call this function to highlight a particular region
            that.highlightRegion = function (chromid, pos, size) {
                this.setChromosome(chromid, true, false);
                if (size < 1) size = 1;
                this.setMark(pos - size / 2, pos + size / 2);
                var winsize = size * 3;
                if (winsize < 600) winsize = 600;
                this.setPosition(pos, winsize);
            }

            //Call this function to show a particular region
            that.showRegion = function (chromid, leftpos, size) {
                this.setChromosome(chromid, true, false);
                this.setPosition(leftpos + size / 2, size);
            }


            //internal: called as event handler
            that._onChangeChromosome = function () {
                var newnr = parseInt(that.getElemJQ("ChromoPicker").val());
                this.setChromosome(this._chromosomes[newnr - 1].id, false);
                this.clearData();
                this._offsetX = 0;
                this._myNavigator.rangeMax = this._chromosomes[newnr - 1].size;
                this._myNavigator.scrollPos = 0;
                this.zoomScrollTo(this._myNavigator.scrollPos, this._myNavigator.ScrollSize);
                this.render();
            }

            that._onScrollRight = function () {
                this._myNavigator.setValue(Math.min(1.0 - this._myNavigator.ScrollSize, this._myNavigator.scrollPos + this._myNavigator.ScrollSize / 2));
                this.zoomScrollTo(this._myNavigator.scrollPos, this._myNavigator.ScrollSize);
                this.render();
            }
            that._onScrollLeft = function () {
                this._myNavigator.setValue(Math.max(0, this._myNavigator.scrollPos - this._myNavigator.ScrollSize / 2));
                this.zoomScrollTo(this._myNavigator.scrollPos, this._myNavigator.ScrollSize);
                this.render();
            }

            that._onZoomIn = function () {
                this.reScale(1.5);
            }

            that._onZoomOut = function () {
                this.reScale(1.0 / 1.5);
            }

            //internal: request gene list was succesful
            that._ajaxResponse_FindGene = function (resp) {
                var keylist = DQX.parseResponse(resp); //unpack the response
                if ("Error" in keylist) {
                    this.getElemJQ("FeatureHits").html("Failed to fetch data: " + keylist["Error"]);
                    return;
                }
                var vallistdecoder = DataDecoders.ValueListDecoder();
                var genelist = vallistdecoder.doDecode(keylist['Hits']);
                var chromidlist = vallistdecoder.doDecode(keylist['Chroms']);
                var startlist = vallistdecoder.doDecode(keylist['Starts']);
                var endlist = vallistdecoder.doDecode(keylist['Ends']);
                rs = '';
                this._uniqueFeatureHit = null;
                var pattern = this.getElemJQ("FeaturePicker").val().toLowerCase()
                if ((genelist.length > 0) && (genelist[0].length > 0)) {
                    for (genenr in genelist) {
                        if (genelist[genenr].toLowerCase() == pattern)
                            this._uniqueFeatureHit = { chromid: chromidlist[0], start: startlist[0], end: endlist[0] }
                        var winsize = endlist[genenr] - startlist[genenr];
                        var lnk = DocEl.Create("a", args);
                        lnk.addAttribute("href", "javascript:void(0)");
                        lnk.addElem(genelist[genenr]);
                        lnk.addAttribute("id", "ChromoBrowserFeatureLink_" + genenr);
                        rs += ' ' + lnk.toString();
                        //that.addAttribute("onclick", functionstr);
                        //rs += " <span>{name}</span>".DQXformat({ name: genelist[genenr] });
                        //rs += this.createLinkToRegion(chromidlist[genenr], (startlist[genenr] + endlist[genenr]) / 2, winsize, genelist[genenr]);
                        //rs += '<SMALL>(' + chromidlist[genenr] + ':' + (startlist[genenr] / 1e6).toFixed(2) + '-' + (endlist[genenr] / 1.e6).toFixed(2) + ') </SMALL>';
                        //rs += '&nbsp; ';
                    }
                    if (genelist.length >= 6)
                        rs += " ...";
                    this.getElemJQ("FeatureHits").html(rs);
                    for (genenr in genelist) {
                        (function dummy(nr) {
                            var theGeneNr = nr;
                            $('#' + "ChromoBrowserFeatureLink_" + genenr).mousedown(function (ev) {
                                Msg.send({ type: 'JumpgenomeRegion' + that.viewID }, {
                                    chromNr: that.getChromoNr(chromidlist[theGeneNr]),
                                    start: startlist[theGeneNr],
                                    end: endlist[theGeneNr]
                                });
                            });
                        })(genenr);
                    }
                }
                else {
                    this.getElemJQ("FeatureHits").html("No hits found");
                }
            }

            //internal: request gene list has failed
            that._ajaxFailure_FindGene = function (resp) {
                this.getElemJQ("FeatureHits").html("Failed to fetch data");
            }


            //internal: called as event handler
            that._onChangeFeaturePicker = function () {
                var pattern = this.getElemJQ("FeaturePicker").val();
                if (pattern.length == 0) {
                    this.getElemJQ("FeatureHits").html("");
                }
                else {
                    var myurl = DQX.Url(this._annotationFetcher.config.serverURL);
                    myurl.addUrlQueryItem('datatype', 'findgene');
                    myurl.addUrlQueryItem('pattern', pattern);
                    myurl.addUrlQueryItem('database', this._annotationFetcher.database);
                    myurl.addUrlQueryItem('table', this._annotationFetcher.annotTableName);
                    myurl.addUrlQueryItem('chromnrfield', this.chromoNrField);
                    /*                    myurl.addUrlQueryItem('startfield', this.config.annotstartfield);
                    myurl.addUrlQueryItem('stopfield', this.config.annotstopfield);
                    myurl.addUrlQueryItem('namefield', this.config.annotnamefield);*/
                    /*                    if ("altpositionfindtablename" in this.config) {
                    myurl.addUrlQueryItem('alttablename', this.config.altpositionfindtablename);
                    myurl.addUrlQueryItem('altidfield', this.config.altpositionfindidfield);
                    myurl.addUrlQueryItem('altchromnrfield', this.config.altpositionfindchromnrfield);
                    myurl.addUrlQueryItem('altposfield', this.config.altpositionfindposfield);
                    myurl.addUrlQueryItem('altpositionchromprefix', this.config.altpositionchromprefix);
                    }*/
                    this.getElemJQ("FeatureHits").html("Fetching data...");
                    $.ajax({
                        url: myurl.toString(),
                        success: function (resp) { that._ajaxResponse_FindGene(resp); },
                        error: function (resp) { that._ajaxFailure_FindGene(resp); }
                    });

                }
            }

            //Prepare header
            var headerDiv = DocEl.Div();
            headerDiv.addStyle('padding', '4px');
            var chromPickerDiv = DocEl.Div({ parent: headerDiv });
            chromPickerDiv.addStyle('float', 'left');
            chromPickerDiv.addElem('Chromosome: ');
            chromPickerDiv.addStyle('padding', '5px');
            var chromopicker = DocEl.Select([], '', { id: that.getSubID("ChromoPicker"), parent: chromPickerDiv });

            var navButtonDiv = DocEl.Div({ parent: headerDiv });
            navButtonDiv.addStyle('float', 'left');

            navButtonControls = [];
            navButtonControls.push(Controls.Button(that.getSubID('BtZoomin'), { bitmap: DQXBMP('zoomin1.png'), description: 'Zoom in', buttonClass: 'DQXBitmapButton', fastTouch: true }).setOnChanged($.proxy(that._onZoomIn, that)));
            navButtonControls.push(Controls.Button(that.getSubID('BtZoomout'), { bitmap: DQXBMP('zoomout1.png'), description: 'Zoom out', buttonClass: 'DQXBitmapButton', fastTouch: true }).setOnChanged($.proxy(that._onZoomOut, that)));
            navButtonControls.push(Controls.Button(that.getSubID('BtScrollLeft'), { bitmap: DQXBMP('arrow3left.png'), description: 'Scroll left', buttonClass: 'DQXBitmapButton', fastTouch: true }).setOnChanged($.proxy(that._onScrollLeft, that)));
            navButtonControls.push(Controls.Button(that.getSubID('BtScrollRight'), { bitmap: DQXBMP('arrow3right.png'), description: 'Scroll right', buttonClass: 'DQXBitmapButton', fastTouch: true }).setOnChanged($.proxy(that._onScrollRight, that)));
            $.each(navButtonControls, function (idx, bt) { navButtonDiv.addElem(bt.renderHtml()); });

            that.getElemJQ('Header').html(headerDiv.toString());
            that.getElemJQ("ChromoPicker").change($.proxy(that._onChangeChromosome, that));
            Controls.ExecPostCreateHtml();


            var footerDiv = DocEl.Div();
            footerDiv.addStyle('padding', '3px');
            footerDiv.addElem('Find feature: ');
            var featurepicker = DocEl.Edit('', { id: that.getSubID("FeaturePicker"), parent: footerDiv, placeHolder:"Enter search text" });
            footerDiv.addElem(' ');
            footerDiv.addElem(DocEl.Span({ id: that.getSubID("FeatureHits"), parent: footerDiv }));
            that.getElemJQ('Footer').html(footerDiv.toString());
            var elem = that.getElemJQ('FeaturePicker');
            var reactfunc = $.proxy(that._onChangeFeaturePicker, that);
            elem.change(reactfunc); elem.keyup(reactfunc); elem.keydown(reactfunc);
            elem.bind('paste', function () { setTimeout(reactfunc, 50) });

            return that;
        }





        return GenomePlotter;
    });
