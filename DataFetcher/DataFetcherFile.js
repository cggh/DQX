// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

﻿/************************************************************************************************************************************
*************************************************************************************************************************************



*************************************************************************************************************************************
*************************************************************************************************************************************/

define(["jquery", "DQX/SQL", "DQX/Utils", "DQX/base64"],
    function ($, SQL, DQX, Base64) {
        var DataFetcherFile = {}


        DataFetcherFile.getFile = function (serverUrl, filename, handler) {
            //prepare the url
            var myurl = DQX.Url(serverUrl);
            //filename=filename.replace(/\./g, "_dot_");
            myurl.addUrlQueryItem("datatype", "getfile");
            myurl.addUrlQueryItem("name", filename);
            var urlstring = myurl.toString();
            $.ajax({
                url: urlstring,
                success: function (resp) {
                    var keylist = DQX.parseResponse(resp);
                    if ("Error" in keylist) {//!!!todo: some error handling
                        DQX.stopProcessing();
                        return;
                    }
                    handler(Base64.decode(keylist.content));
                },
                error: function (resp) {//!!!todo: some error handling
                    DQX.stopProcessing();
                }
            });
        }


        return DataFetcherFile;
    });    
    

