

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



function DQXSC(filename) {
    return "DQX/" + filename;
}

function DQXBMP(filename) {
    return "scripts/DQX/Bitmaps/" + filename;
}

function DQXSCExt(filename) {
    return "DQX/Externals/" + filename;
}

function DQXSCAsync(filename) {
    return "async!" + filename;
}


function DQXSCJQ() {
    return "jquery";
}

function DQXSCRQ() {
    return "require";
}

