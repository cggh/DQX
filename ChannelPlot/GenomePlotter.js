define(["jquery", "DQX/Msg", "DQX/ChannelPlot/ChannelPlotter", "DQX/DataFetcher/DataFetcherAnnotation", "DQX/ChannelPlot/ChannelAnnotation", "DQX/SQL", "DQX/DocEl"],
    function ($, Msg, ChannelPlotter, DataFetcherAnnotation, ChannelAnnotation, SQL, DocEl) {
        var GenomePlotter = {};




        GenomePlotter.Plotter = function (iDivID, args) {
            var that = ChannelPlotter.Plotter(iDivID, args);
            that._chromosomes = [];


            //Create the data fetcher for the gen annotation information
            that._annotationFetcher = new DataFetcherAnnotation.Fetcher(args);
            that.addDataFetcher(that._annotationFetcher);

            that._MaxZoomFactX = 1.0 / 0.2;
            //that._myNavigator.minScrollSize = 0.0001;

            that.annotationChannel = ChannelAnnotation.Channel("_Annotation", that._annotationFetcher);
            that.addChannel(that.annotationChannel, true);

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
                var chromoquery = SQL.WhereClause.CompareFixed(that.chromoNrField, '=', that.currentChromoNr);
                for (var fetchnr = 0; fetchnr < this._myDataFetchers.length; fetchnr++) {
                    if ('setUserQuery' in this._myDataFetchers[fetchnr])
                        this._myDataFetchers[fetchnr].setUserQuery(chromoquery);
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
                if (size < 10) size = 10;
                this.setMark(pos - size / 2, pos + size / 2);
                var winsize = size * 6;
                if (winsize < 60000) winsize = 60000;
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


            var chromopicker = DocEl.Select([], '', { id: that.getSubID("ChromoPicker") });
            that.getElemJQ('Header').html(chromopicker.toString());
            that.getElemJQ("ChromoPicker").change($.proxy(that._onChangeChromosome, that));

            return that;
        }





        return GenomePlotter;
    });
