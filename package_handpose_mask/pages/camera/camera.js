const hand = require('../../utils/handBusiness.js');
const model = require('../../utils/modelBusiness.js');
const canvasWebGLId = 'canvasWebGL';
// a url of gltf model 
const modelUrl = '../../utils/cat_beard.png';
// camera listener
var listener = null;

Page({
    // throttling for Android
    intervalTimeout: 500,
    data: {
        devicePosition: 'back',
    },
    onReady() {
        const system = wx.getSystemInfoSync().system;
        // if iOS
        if (system.indexOf('iOS') !== -1) {
            // throttling for iOS
            this.intervalTimeout = 3000;
        }
    },
    async onLoad() {
        var _that = this;
        wx.showLoading({
            title: 'Loading TFJS...',
        });
        await hand.loadModel();
        wx.hideLoading();

        setTimeout(function () {
            // load 3d model
            model.initThree(canvasWebGLId, modelUrl);
        }, 150)
        _that.startTacking();
    },
    onUnload: function () {
        this.stopTacking();
        console.log('onUnload', 'listener is stop');

        model.stopAnimate();
        model.dispose();
    },
    async onCameraFrame_callback(frame,
        canvasWidth,
        canvasHeight) {

        // process
        var result = await hand.detect(frame);

        if (result && result.prediction.length > 0) {
            var canvasWidth = frame.width;
            var canvasHeight = frame.height;

            // set the rotation and position of the 3d model.    
            model.setModel(result.prediction[0],
                canvasWidth,
                canvasHeight);
        } else {
            var message = 'No results.';
            console.log('onCameraFrame_callback', message)
        }

    },
    startTacking() {
        var _that = this;
        const context = wx.createCameraContext();

        // real-time
        var frameData;
        var canvasWidth;
        var canvasHeight;
        this.listener = context.onCameraFrame(function (res) {
            frameData = {
                data: new Uint8Array(res.data),
                width: res.width,
                height: res.height,
            };;
            canvasWidth = res.width;
            canvasHeight = res.height;
            // console.log('onCameraFrame:', res.width, res.height);
        });

        this.intervalId = setInterval(function () {
            if (frameData) {
                _that.onCameraFrame_callback(frameData,
                    canvasWidth,
                    canvasHeight);
            }
        }, this.intervalTimeout);

        // start
        this.listener.start();
        console.log('startTacking', 'listener is running');
    },
    stopTacking() {
        if (this.listener) {
            this.listener.stop();
            this.listener = null;
        }
        clearInterval(this.intervalId);
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
