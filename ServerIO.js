// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>


define(["require", "DQX/Framework", "DQX/Popup", "DQX/Msg", "DQX/Utils", "DQX/DocEl", "DQX/Controls", "DQX/base64"],
    function (require, Framework, Popup, Msg, DQX, DocEl, Controls, Base64) {


        var ServerIO = {};

        ServerIO.waitForCompletion = function(serverUrl, calculationid, onCompleted, initialResponse, onFailed) {
            var content = 'Server is processing. This may take a while!<p>';
            var progressDivId = 'calculationprogressbox'+DQX.getNextUniqueID();
            var logDivId1 = 'logbox'+DQX.getNextUniqueID();
            var logDivId2 = 'logbox'+DQX.getNextUniqueID();
            content += '<div id="{id}"  style="min-width:400px"></div><br>'.DQXformat({id: progressDivId});
            content += '<div id="{id1}" class="DQXFloatBoxContent2" style="width:500px;height:300px; resize:both; overflow: scroll"><div id="{id2}"></div></div>'.DQXformat({id1: logDivId1, id2: logDivId2});

            var popupid = Popup.create('Processing', content, null, {} );
            var poll = function() {
                data = {};
                DQX.customRequest(serverUrl, PnServerModule, 'querycalculation', { calculationid: calculationid, showlog:'1' }, function(resp) {
                    if (resp.failed) {
                        alert(resp.status);
                        DQX.ClosePopup(popupid);
                        if (onFailed)
                            onFailed(initialResponse);
                    }
                    else {
                        if (resp.completed) {
                            DQX.ClosePopup(popupid);
                            if (onCompleted)
                                onCompleted(initialResponse);
                        }
                        else {
                            var str = resp.status;
                            if (resp.progress)
                                str+=' ('+(100*resp.progress).toFixed(0)+'%)';
                            if ($('#'+progressDivId).length>0) {
                                $('#'+progressDivId).html('<h3>'+str+'</h3>');
                                $('#'+logDivId2).html(ServerIO.formatLog(resp.log));
                                $('#'+logDivId1).scrollTop($('#'+logDivId2).innerHeight());
                                setTimeout(poll, 1000);
                            }
                        }
                    }
                });
            };
            setTimeout(poll, 200);


        };

        ServerIO.customAsyncRequest = function(serverUrl, respmodule, request, data, onCompleted, onFailed) {
            DQX.customRequest(serverUrl, respmodule, request, data, function(resp) {
                ServerIO.waitForCompletion(serverUrl, resp.calculationid, onCompleted, resp, onFailed);
            });
        };

        ServerIO.formatLog = function(origcontent) {
            if (!origcontent)
                return '';
            var div = DocEl.Div();
            div.setCssClass('DQXLogReport');
            var content = '';
            var indent = -1;
            var isDataDump = false;
            var lines = origcontent.split('\n');
            $.each(lines, function(idx, line) {
                var linediv = DocEl.Div();
                var addLine = true;
                linediv.setCssClass('DQXLogReportLine');
                if (line.substring(0,3) == '==>') {
                    linediv.setCssClass('DQXLogReportHeader');
                    line = line.substring(3);
                    indent += 1;
                }
                if (line.substring(0,3) == '-->') {
                    linediv.setCssClass('DQXLogReportHeaderSub');
                    line = line.substring(3);
                    indent += 1;
                }
                if (line.substring(0,3) == 'DD>') {
                    indent += 1;
                    addLine = false;
                    isDataDump = true;
                }

                linediv.addStyle('margin-left',30*Math.max(0,indent)+'px')

                if (line.substring(0,3) == '<==') {
                    indent -= 1;
                    linediv.setCssClass('DQXLogReportFooter');
                    line = line.substring(3);
                }
                if (line.substring(0,3) == '<--') {
                    indent -= 1;
                    linediv.setCssClass('DQXLogReportFooterSub');
                    line = line.substring(3);
                }
                if (line.substring(0,3) == '<DD') {
                    indent -= 1;
                    addLine = false;
                    isDataDump = false;
                }


                if (line.substring(0,8) == 'COMMAND:') {
                    linediv.setCssClass('DQXLogReportCommand');
                    line = line.substring(8);
                }
                if (line.substring(0,4) == 'SQL:') {
                    linediv.setCssClass('DQXLogReportCommand');
                    line = line.substring(4);
                }
                if (line.substring(0,6) == 'ERROR:') {
                    linediv.setCssClass('DQXLogReportError');
                }
                if (line.substring(0,8) == 'WARNING:') {
                    linediv.setCssClass('DQXLogReportWarning');
                }
                if (line.substring(0,2) == '[<') {
                    addLine = false;
                }
                if (line.substring(0,3) == '@@@') {
                    addLine = false;
                }
                if (addLine) {
                    if (isDataDump) {
                        line = line.replace(/ /g,'&nbsp;')
                        line = '<div class="DQXLogReportDataDump">' + line +'</div>';
                    }
                    linediv.addElem(line);
                    content += linediv.toString();
                }
            });
            div.addElem(content)
            return div.toString();
        }

        ServerIO.showLog = function(serverUrl, logid) {
            //!!! todo: move server side out of Pn Server Module and into DQXServer
            DQX.setProcessing();
            DQX.customRequest(serverUrl, PnServerModule,'getcalculationlog',{ id: logid },function(resp) {
                DQX.stopProcessing();
                if (resp.Error)
                    Popup.create('Calculation log', 'No log data present');
                else {
                    Popup.create('Calculation log '+logid, ServerIO.formatLog(resp.Content) );
                }
            });
        };



        return ServerIO;
    });