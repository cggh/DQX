/************************************************************************************************************************************
*************************************************************************************************************************************

Implements a Framework.ViewSet that can be used to browse a set of static html pages, emulating navigation tools in the browser

This listens to ShowStaticDoc messages to show a html document

*************************************************************************************************************************************
*************************************************************************************************************************************/

define([DQXSCRQ(), DQXSC("Framework"), DQXSC("HistoryManager"), DQXSC("Msg"), DQXSC("Utils"), DQXSC("DocEl"), DQXSC("Controls")],
    function (require, Framework, HistoryManager, Msg, DQX, DocEl, Controls) {
        StaticDocViewModule = {

            Instance: function (iPage, iFrame) {
                var that = Framework.ViewSet(iFrame, 'doc');
                that.myPage = iPage;
                that.registerView();

                //Called automatically
                that.createPanels = function () {
                    this.panelStaticDoc = Framework.Form(this.getFrame());
                    this.panelStaticDoc.render();
                };


                //Called automatically
                that.createFramework = function () {
                };

                that.loadPage = function (url) {
                    that.activeUrl = url;
                    HistoryManager.setState(that.getStateKeys());

                }

                that.activateState = function (stateKeys) {
                    var st = stateKeys.doc;
                    this.activeUrl = st.replace(/\*/g, "/");
                    this.getFrame().makeVisible();

                    DQX.setProcessing("Downloading...");
                    $.get(this.activeUrl, {})
                    .done(function (data) {
                        DQX.stopProcessing();
                        //fetch the title
                        var docParser = new DOMParser();
                        try {
                            var xmlDoc = docParser.parseFromString(data, "text/xml");
                            var title = xmlDoc.getElementsByTagName("title")[0].childNodes[0].nodeValue;
                        } catch (e) {
                            DQX.reportError('Unable to fetch static document title:\n\n' + e);
                        }
                        that.getFrame().modifyDisplayTitle(title);

                        //fetch the html content
                        var content = $('<div/>').append(data).find('.DQXStaticContent').html();
                        that.panelStaticDoc.clear();
                        that.panelStaticDoc.addHtml('<div class="DQXStaticContent">' + content + '</div>');
                        that.panelStaticDoc.render();
                    })
                    .fail(function () {
                        DQX.stopProcessing();
                        alert("Failed to download documentation item '" + that.activeUrl + "'");
                    });

                }

                that.getStateKeys = function () {
                    var encoded = that.activeUrl.replace(/\//g, "*");
                    return { doc: encoded };
                };

                Msg.listen('', { type: 'ShowStaticDoc' }, function (scope, url) {
                    that.loadPage(url);
                });

                return that;
            },











            end: true
        };


        return StaticDocViewModule;
    });