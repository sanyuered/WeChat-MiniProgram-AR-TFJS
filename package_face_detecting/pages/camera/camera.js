const face = require('../../utils/faceBusiness.js')
const canvasId = 'canvas1';
const speedMaxCount = 10;
const isReserveDraw = false;
const isWithFaceLandmarks = false;
// camera listener
var listener = null;

Page({
    data: {
        devicePosition: 'front',
        cameraStyle: 'camera_Android',
    },
    onReady() {
        var _that = this;
        // set cameraStyle of camera by system platform
        wx.getSystemInfo({
            success(res) {
                console.log(res.system);
                if (res.system.indexOf('iOS') !== -1) {
                    _that.setData({
                        cameraStyle: 'camera_iOS',
                    });
                }
            }
        })
    },
    async onLoad() {
        var _that = this;
        wx.showLoading({
            title: 'Loading...',
        });
        await face.loadmodel(canvasId, isReserveDraw);
        wx.hideLoading();
        wx.showLoading({
            title: 'Warming Up...',
        });
        await face.warmup();
        wx.hideLoading();
        _that.startTacking();
    },
    onUnload: function () {
        this.stopTacking();
        console.log('onUnload', 'listener is stop');
    },
    startTacking() {
        var _that = this;
        var count = 0;
        const context = wx.createCameraContext();

        if (!context.onCameraFrame) {
            var message = 'Does not support the new api "Camera.onCameraFrame".';
            console.log(message);
            wx.showToast({
                title: message,
                icon: 'none'
            });
            return;
        }

        // real-time
        listener = context.onCameraFrame(async function (res) {
            if (count < speedMaxCount) {
                count++;
                return;
            }
            count = 0;
            console.log('onCameraFrame:', res.width, res.height);
            const frame = {
                data: new Uint8ClampedArray(res.data),
                width: res.width,
                height: res.height,
            };
            // process
            await face.detect(frame, isWithFaceLandmarks, frame.width, frame.height,null);
        });
        // start
        listener.start();
        console.log('startTacking', 'listener is start');
    },
    stopTacking() {
        if (listener) {
            listener.stop();
        }
    },
    changeDirection() {
        var status = this.data.devicePosition;
        if (status === 'back') {
            status = 'front';
        } else {
            status = 'back';
        }
        this.setData({
            devicePosition: status,
        });
    }
})
