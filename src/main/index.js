
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

var win_data = [];
win_data['x'] = 100;
win_data['y'] = 200;
win_data['width'] = 400;
win_data['height'] = 500;
win_data['url'] = 'https://google.com';

function in_array(search,array){
     for(var i in array){
         if(array[i]==search){
             return true;
         }
     }
     return false;
 }

function get_argv() {
    process.argv.forEach((val, index) => {
        if(val){
            var strs = val.split("=");
            if(strs[0] && strs[1]){
                if(in_array(strs[0],['x','y','width','height'])){
                    win_data[strs[0]] = parseInt(strs[1]);
                }else{
                    win_data[strs[0]] = strs[1];
                }
            }
        }
    });
}

function init() {
    get_argv();

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
        app.dock.hide();
    } else {
        // 
    }
}

function createWeb() {
    /**
     * Initial window options
     */

    var frame = true;
    if (isMac) {
        frame = false;
    }

    webWindow = new BrowserWindow({
        useContentSize: true,
        width: win_data['width'],
        height: win_data['height'],
        x: win_data['x'],
        y: win_data['y'],
        maximizable: false,
        minimizable: false,
        transparent: true,
        resizable: true,
        frame: frame,
        webPreferences: {
            nodeIntegration: true,
            webviewTag: true
        },
    })

    let webContents = webWindow.webContents;
    webContents.on('did-finish-load', () => {
        webContents.setZoomFactor(1);
        webContents.setVisualZoomLevelLimits(1, 1);

        //webContents.openDevTools();

        //dialog.showErrorBox('userDate',app.getPath('userData'));
        //dialog.showErrorBox('electron',process.versions.electron);
        //dialog.showErrorBox('chrome',process.versions.chrome);
    })
    webWindow.loadURL(win_data['url'])

    webWindow.setOpacity(1.0)

    webWindow.setAlwaysOnTop(true);
    webWindow.setSkipTaskbar(true);

    webContents.on('new-window',(event,url)=>{
        event.preventDefault();
        webWindow.loadURL(url);
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
