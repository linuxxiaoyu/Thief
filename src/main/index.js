import { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, shell, dialog, nativeImage } from 'electron'
import db from './utils/db'
import book from './utils/book'
import osUtil from './utils/osUtil'
import stock from './utils/stock'
import ad from './utils/ad'
import request from 'request'

//const { TouchBarButton, TouchBarSpacer } = TouchBar

let touchBarText = null;

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
    global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let tray;
let desktopWindow;
let desktopBarWindow;
let webWindow;
let videoWindow;
let pdfWindow;

const isMac = 'darwin' === process.platform;

var win_data = [];
win_data['x'] = 100;
win_data['y'] = 200;
win_data['width'] = 400;
win_data['height'] = 500;

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
            if(strs[0]){
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

    db.set("auto_page", "0");
    db.set("is_mouse", "0");

    if (isMac) {
        createSetting();

        if (db.get('curr_model') === '2') {
            createWindownDesktop();

            setTimeout(() => {
                BossKey(1);
            }, 1000);
        } else if (db.get('curr_model') === '3') {
            db.set("curr_model", "1")
        }
    } else {
        createWindownDesktop();

        setTimeout(() => {
            BossKey(1);
        }, 1000);
    }

    createKey();
    createTray();

    if (webWindow === "null" || webWindow === "undefined" || typeof(webWindow) === "undefined") {
        createWeb();
    }

    try {
        webWindow.show();
    } catch (error) {
        createWeb();
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
        webContents.setLayoutZoomLevelLimits(0, 0);
    })

    webWindow.loadURL(win_data['url'])
    // webWindow.loadURL(webURL)

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


function setText(text) {
    global.text = {
        text: text
    }
}

let autoPageTime;

function AutoPage() {
    if (db.get('auto_page') === '1') {
        clearInterval(autoPageTime);
        db.set("auto_page", "0")
        var second = db.get('second');
        autoPageTime = setInterval(function() {
            NextPage();
        }, parseInt(second) * 1000);
    } else if (db.get('auto_page') === '0') {
        db.set("auto_page", "1")
        clearInterval(autoPageTime);
    }
}

function updateText(text) {
    let curr_model = db.get('curr_model');

    if (curr_model === '1') {
        tray.setTitle(text);
    } else if (curr_model === '2') {
        tray.setTitle("");
        setText(text);
        if (desktopWindow != null) {
            desktopWindow.webContents.send('text', 'ping');
        }
    } else if (curr_model === '3') {
        tray.setTitle("");

        if (desktopBarWindow != null) {
            setText(osUtil.getCpu());
            desktopBarWindow.webContents.send('text', 'ping');
        }

        touchBarText.label = text;
    }
}

function NextPage() {
    let display_model = db.get('display_model');
    let display_shares_list = db.get('display_shares_list');

    if (display_model === '2') {
        stock.getData(display_shares_list, function(text) {
            updateText(text);
        })
    } else {
        let text = book.getNextPage();
        updateText(text);
    }
}

function PreviousPage() {
    let display_model = db.get('display_model');
    let display_shares_list = db.get('display_shares_list');

    if (display_model === '2') {
        stock.getData(display_shares_list, function(text) {
            updateText(text);
        })
    } else {
        let text = book.getPreviousPage();
        updateText(text);
    }
}

function BossKey(type) {
    let text = db.get('moyu_text');
    let curr_model = db.get('curr_model');
    let is_ad = db.get('is_ad');

    if (curr_model === '1') {
        if (is_ad === "") {
            ad.getAd(function(x) {
                if (x === "err") {
                    tray.setTitle(text);
                } else {
                    tray.setTitle(x);
                    var timex = new Date().getTime()
                    db.set("is_ad", timex);
                }
            })
        } else {
            var timex = new Date().getTime()
            if (timex - is_ad >= 28800000) {
                ad.getAd(function(x) {
                    if (x === "err") {
                        tray.setTitle(text);
                    } else {
                        tray.setTitle(x);
                        var timex = new Date().getTime()
                        db.set("is_ad", timex);
                    }
                })
            } else {
                tray.setTitle(text);
            }
        }

    } else if (curr_model === '2') {
        tray.setTitle("");

        if (is_ad === "") {
            ad.getAd(function(x) {
                if (x === "err") {
                    setText(text);
                } else {
                    setText(x);
                    var timex = new Date().getTime()
                    db.set("is_ad", timex);
                }
            })
        } else {
            var timex = new Date().getTime()
            if (timex - is_ad >= 28800000) {
                ad.getAd(function(x) {
                    if (x === "err") {
                        setText(text);
                    } else {
                        setText(x);
                        var timex = new Date().getTime()
                        db.set("is_ad", timex);
                    }
                })
            } else {
                setText(text);
            }
        }

        if (desktopWindow != null) {
            if (type === 1) {
                desktopWindow.webContents.send('text', 'boss');
            } else if (type === 2) {
                {
                    if (desktopWindow.isVisible()) {
                        desktopWindow.hide();
                    } else {
                        desktopWindow.show();
                    }
                }
            }
        }
    } else if (curr_model === '3') {
        tray.setTitle("");

        if (desktopBarWindow != null) {
            setText(osUtil.getCpu());
            desktopBarWindow.webContents.send('text', 'ping');
        }
        // TouchBar 模式
        touchBarText.label = '🚄=[😘🐶🐱🐭🐹🐸🐯🐵🐙🐼🐨🐮🐥🦉🐍🦞🦙🐉🦂🦀🦐🐍🐢🐄🦍🦏🐓🐇🐷]';
    }

    if (webWindow != null) {
        {
            if (webWindow.isVisible()) {
                webWindow.hide();
            } else {
                webWindow.show();
            }
        }
    }

    if (pdfWindow != null) {
        {
            if (pdfWindow.isVisible()) {
                pdfWindow.hide();
            } else {
                pdfWindow.show();
            }
        }
    }

    if (videoWindow != null) {
        {
            if (videoWindow.isVisible()) {
                videoWindow.hide();
            } else {
                videoWindow.show();
            }
        }
    }
}


function checkUpdate() {
    request({
        url: "https://gitee.com/lauix/public_version/raw/master/version.txt",
        method: "GET"
    }, function(err, res, body) {
        const logo = `${__static}/icon.png`;
        const image = nativeImage.createFromPath(logo)

        var newVersion = parseFloat(body);

        var currVersion = 4.0
        if (newVersion > currVersion) {
            const options = {
                type: 'info',
                title: 'Check for updates',
                message: "Found new version, updated?",
                buttons: ['yes', 'no'],
                icon: image
            }
            dialog.showMessageBox(options, function(index) {
                if (index == 0) {
                    shell.openExternal('https://github.com/cteamx/Thief/releases')
                }
            })
        } else {
            const options = {
                type: 'info',
                title: 'Check for updates',
                message: "Currently the latest version",
                buttons: ['confirm'],
                icon: image
            }
            dialog.showMessageBox(options)
        }
    })
}

function Exit() {
    app.quit();
}

var key_previousx = null;
var key_nextx = null;
var key_bossx = null;
var key_autox = null;

function createKey() {
    try {
        let xkey_previous = db.get('key_previous');
        // 如果指令有问题，则不注册
        if (!xkey_previous || xkey_previous.indexOf('+') < 0) {
            return
        }
        // 注册之前删除上一次注册的全局快捷键
        if (key_previousx != null) {
            globalShortcut.unregister(key_previousx)
        }

        key_previousx = xkey_previous
        globalShortcut.register(xkey_previous, function() {
            PreviousPage();
        })

        let xkey_next = db.get('key_next');
        // 如果指令有问题，则不注册
        if (!xkey_next || xkey_next.indexOf('+') < 0) {
            return
        }
        // 注册之前删除上一次注册的全局快捷键
        if (key_nextx != null) {
            globalShortcut.unregister(key_nextx)
        }
        key_nextx = xkey_next
        globalShortcut.register(xkey_next, function() {
            NextPage();
        })

        let xkey_boss = db.get('key_boss');
        // 如果指令有问题，则不注册
        if (!xkey_boss || xkey_boss.indexOf('+') < 0) {
            return
        }
        // 注册之前删除上一次注册的全局快捷键
        if (key_bossx != null) {
            globalShortcut.unregister(key_bossx)
        }
        key_bossx = xkey_boss
        globalShortcut.register(xkey_boss, function() {
            BossKey(2);
        })

        let xkey_auto = db.get('key_auto');
        // 如果指令有问题，则不注册
        if (!xkey_auto || xkey_auto.indexOf('+') < 0) {
            return
        }
        // 注册之前删除上一次注册的全局快捷键
        if (key_autox != null) {
            globalShortcut.unregister(key_autox)
        }
        key_autox = xkey_auto
        globalShortcut.register(xkey_auto, function() {
            AutoPage();
        })
    } catch (error) {
        const logo = `${__static}/icon.png`;
        const image = nativeImage.createFromPath(logo)

        const options = {
            type: 'info',
            title: 'Abnormal shortcut keys',
            message: "The setting shortcut key is wrong, please see the document exception summary!",
            buttons: ['Open document', 'no'],
            icon: image
        }
        dialog.showMessageBox(options, function(index) {
            if (index == 0) {
                shell.openExternal('https://thief.im/#/use?id=%e5%bc%82%e5%b8%b8%e6%b1%87%e6%80%bb')
            }
        })

        Exit();
    }

    globalShortcut.register('CommandOrControl+Alt+X', function() {
        Exit();
    })
}

function createTray() {
    const menubarLogo = process.platform === 'darwin' ? `${__static}/mac.png` : `${__static}/win.png`

    var menuList = [];
    menuList.push({
        label: 'Check for updates',
        click() {
            checkUpdate();
        }
    });

    if (isMac) {
        menuList.push({
            type: "separator"
        }, {
            label: 'Taskbar mode',
            type: 'radio',
            checked: db.get('curr_model') === '1',
            click() {
                db.set("curr_model", "1")

                if (desktopWindow != null) {
                    desktopWindow.close();
                }

                if (desktopBarWindow != null) {
                    desktopBarWindow.close();
                }

                BossKey(1);
            }
        }, );
    } else {}

    menuList.push({
        type: "separator"
    }, {
        label: 'Web touch fish',
        click() {
            if (webWindow === "null" || webWindow === "undefined" || typeof(webWindow) === "undefined") {
                createWeb();
            } else {
                try {
                    webWindow.show();
                } catch (error) {
                    createWeb();
                }
            }
        }
    }, {
        type: "separator"
    }, {
        label: 'Boss key',
        accelerator: db.get('key_boss'),
        click() {
            BossKey(2);
        }
    }, {
        type: "separator"
    }, {
        accelerator: 'CommandOrControl+Alt+X',
        label: 'drop out',
        click() {
            Exit();
        }
    });


    // tray = new Tray(nativeImage.createEmpty())
    tray = new Tray(menubarLogo)
    tray.setContextMenu(Menu.buildFromTemplate(menuList))
    BossKey();
}

function createSetting() {
    if (isMac) {
        app.dock.hide();
    } else {
        // 
    }
}

ipcMain.on('bg_text_color', function() {
    tray.destroy();
    createKey();
    createTray();

    if (desktopWindow != null) {
        desktopWindow.webContents.send('bg_text_color', 'ping');
    }

    if (desktopBarWindow != null) {
        desktopBarWindow.webContents.send('bg_text_color', 'ping');
    }
})

ipcMain.on('jump_page', function() {
    NextPage();
})

ipcMain.on('MouseAction', function(e, v) {
    if (desktopWindow != null) {
        if (v == "1") {
            // 鼠标左击
            NextPage();
        } else if (v == "2") {
            // 鼠标右击
            PreviousPage();
        } else if (v == "3") {
            // 鼠标进入
        } else if (v == "4") {
            // 鼠标移出
            BossKey(2);
        }
    }
})

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

// const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
//   // Someone tried to run a second instance, we should focus our window.
//   if (desktopWindow) {
//     if (desktopWindow.isMinimized()) desktopWindow.restore()
//     desktopWindow.focus()
//   }
// })

// if (shouldQuit) {
//   app.quit()
// }

app.on('ready', init)

app.on('window-all-closed', () => {
    db.set("auto_page", "0");
    db.set("is_mouse", "0");

    if (isMac) {
        db.set("curr_model", "1")
    }

    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// app.on('activate', () => {
//   if (settingWindow === null) {
//     createWindow()
//   }
// })

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

// import { autoUpdater } from 'electron-updater'

// autoUpdater.on('update-downloaded', () => {
//   autoUpdater.quitAndInstall()
// })

// app.on('ready', () => {
//   if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
// })