/************************************************************************************************************************************
*************************************************************************************************************************************

Some miscellaneous functions that help setting up the DQX environment


*************************************************************************************************************************************
*************************************************************************************************************************************/

//Setup some global properties for RequireJS
//Note that we append a version string to every script request. This has to be set in a global variable
function setupRequireJS() {
    if (typeof versionString == 'undefined')
        alert('Fatal error: versionString is missing');
    require.config({
        paths: {
            "jquery": "DQX/Externals/jquery"
        },
        waitSeconds: 15,
        urlArgs: "version="+versionString
    });
}


//Decorate a DQX file path
function DQXSC(filename) {
    return "DQX/" + filename;
}

//Decorate a DQX stock bitmap path
function DQXBMP(filename) {
    return "scripts/DQX/Bitmaps/" + filename;
}

//Decorate a DQX external source path (typically 3rd part libraries)
function DQXSCExt(filename) {
    return "DQX/Externals/" + filename;
}

//Decorate an asynchronous 3rd party fetch
function DQXSCAsync(filename) {
    return "async!" + filename;
}

//Return JQuery
function DQXSCJQ() {
    return "jquery";
}

//Return RequireJS
function DQXSCRQ() {
    return "require";
}

