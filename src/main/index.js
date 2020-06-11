import { app, BrowserWindow, Menu, ipcMain } from 'electron'


/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
    global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let webWindow;

const isMac = 'darwin' === process.platform;

var winData = [];
winData['x'] = 100;
winData['y'] = 200;
winData['width'] = 400;
winData['height'] = 500;
winData['url'] = 'https://google.com';

function inArray(search, array) {
     for (var i in array){
         if (array[i] == search) {
             return true;
         }
     }
     return false;
 }

function getArgv() {
    process.argv.forEach((val, index) => {
        if (val) {
            var strs = val.split("=");
            if (strs[0] && strs[1]) {
                if (inArray(strs[0], ['x','y','width','height'])) {
                    winData[strs[0]] = parseInt(strs[1]);
                } else {
                    winData[strs[0]] = strs[1];
                }
            }
        }
    });
}

function init() {
    getArgv();

    Menu.setApplicationMenu(null);

    if (isMac) {
        createSetting();
    }

    if (webWindow === "null" || webWindow === "undefined" || typeof(webWindow) === "undefined") {
        createWeb();
    }

    try {
        webWindow.show();
    } catch (error) {
        createWeb();
    }
}

function createSetting() {
    if (isMac) {
        // app.dock.hide(); // comment for test
    } else {
        // 
    }
}

function createWeb() {
    /**
     * Initial window options
     */
    var userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36';

    var frame = true;
    if (isMac) {
        frame = false;
    }

    webWindow = new BrowserWindow({
        useContentSize: true,
        width: winData['width'],
        height: winData['height'],
        x: winData['x'],
        y: winData['y'],
        maximizable: false,
        minimizable: false,
        transparent: true,
        resizable: true,
        frame: frame,
        webPreferences: {
            nodeIntegration: true,
            webviewTag: true,
            sandbox: true
        },
    })

    let webContents = webWindow.webContents;
    webContents.on('did-finish-load', () => {
        webContents.setZoomFactor(1);
        webContents.setVisualZoomLevelLimits(1, 1);

        // webContents.openDevTools();
        // BrowserWindow.addExtension('/users/admin/extension/Google-Translate-fbh5play');
    })
    webWindow.loadURL(winData['url'], {
        userAgent: userAgent
    })

    webWindow.setOpacity(1.0)

    webWindow.setAlwaysOnTop(true);
    webWindow.setSkipTaskbar(true);

    webContents.on('new-window',(event,url)=>{
        event.preventDefault();
        webWindow.loadURL(url,{
            userAgent: userAgent
        });
    })

    webWindow.on('closed', () => {
        webWindow = null
    })
}

ipcMain.on('webOpacity', function(e, v) {
    if (webWindow != null) {
        var num = webWindow.getOpacity();

        if (v == "-") {
            if (num <= 0.0) {
                webWindow.setOpacity(0.0);
            } else {
                num = num - 0.1
                webWindow.setOpacity(num);
            }
        } else if (v == "+") {
            if (num >= 1.0) {
                webWindow.setOpacity(1.0);
            } else {
                num = num + 0.1
                webWindow.setOpacity(num);
            }
        } else if (v == "exit") {
            if (webWindow != null) {
                webWindow.close();
            }
        } else if (v === "change") {
            if (webWindow != null) {
                var x = webWindow.getSize();
                if (x[1] <= 100) {
                    webWindow.setSize(715, 500);
                    webWindow.center();
                }
            }
        }
    }
})

app.on('ready', init)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
