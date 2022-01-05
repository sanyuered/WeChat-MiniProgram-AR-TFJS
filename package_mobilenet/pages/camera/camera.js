const mobilenet = require('../../utils/mobilenet.js');

Page({
    listener:null,
    // throttling
    intervalTimeout: 1000,
    mobilenetModel:null,
    data: {
        devicePosition: 'back',
        result:'',
    },
    async onReady() {
        const system = wx.getSystemInfoSync().system;
        var _that = this;
        wx.showLoading({
            title: 'Loading TFJS...',
        });
        await this.initMobilenet()
        wx.hideLoading();

        _that.startTacking();
    },
    onUnload: function () {
        this.stopTacking();
        console.log('onUnload', 'listener is stop');
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

        this.intervalId = setInterval(async function () {
            if (frameData) {
                 // process
                await _that.executeMobilenet(frameData);
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
    },
    async initMobilenet() {
        // Load the model.
        this.mobilenetModel = await mobilenet.load({ 
          version:2, 
          alpha:0.5,
         });
        this.setData({ result: 'model loaded.' });
        console.log('initMobilenet', 'model loaded');
      },
      async executeMobilenet(frame) {
        if (!this.mobilenetModel) {
          return
        }
        const img = frame
        // Classify the image.
        const predictions = await this.mobilenetModel.classify(img);
        this.setData({ result: predictions[0].className+",概率："+predictions[0].probability.toFixed(2) });
        console.log('executeMobilenet', predictions);
      },
})
