const face = require('../../utils/faceBusiness.js')
const model = require('../../utils/modelBusiness.js');
const canvasWebGLId = 'canvasWebGL';
// throttling
const cameraFrameMax = 3;
// a url of gltf model 
const modelUrl = 'https://m.sanyue.red/demo/gltf/sunglass.glb';
// camera listener
var listener = null;

Page({
    data: {
        devicePosition: 'front',
    },
    async onReady() {
        var _that = this;
        wx.showLoading({
            title: 'Loading TFJS...',
        });
        await face.loadModel();
        wx.hideLoading();

        // load 3d model
        model.initThree(canvasWebGLId, modelUrl);

        _that.startTacking();
    },
    onUnload: function () {
        this.stopTacking();
        console.log('onUnload', 'listener is stop');

        model.stopAnimate();
        model.dispose();
    },
    startTacking() {
        var _that = this;
        var count = 0;
        const context = wx.createCameraContext();

        // real-time
        listener = context.onCameraFrame(async function (res) {
            // it is throttling
            if (count < cameraFrameMax) {
                count++;
                return;
            }
            count = 0;
            console.log('onCameraFrame:', res.width, res.height);
            const frame = {
                data: new Uint8Array(res.data),
                width: res.width,
                height: res.height,
            };

            // process
            var result = await face.detect(frame);

            if (result && result.prediction) {
                var canvasWidth = frame.width;
                var canvasHeight = frame.height;

                // set the rotation and position of the 3d model.    
                model.setModel(result.prediction,
                    canvasWidth,
                    canvasHeight);
            } else {
                var message = 'No results.';
                wx.showToast({
                    title: message,
                    icon: 'none'
                });
            }
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
