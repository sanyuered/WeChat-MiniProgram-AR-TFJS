const mobilenet = require('../../utils/mobilenet.js');
const canvasId = 'canvas2d'
const maxCanvasWidth = 375;

Page({
  mobilenetModel: null,
  data: {
    btnText: 'Take a photo',
    devicePosition: 'back',
    // if it is taking photo
    isRunning: true,
    result: '',
  },
  async onReady() {
    // var _that = this;
    // load tfjs model
    wx.showLoading({
      title: 'Loading TFJS...',
    });
    await this.initMobilenet()
    wx.hideLoading();
  },
  onUnload: function () {

  },
  processPhoto(photoPath, imageWidth, imageHeight) {
    var _that = this;
    const ctx = wx.createCanvasContext(canvasId);
    // the width of the scale image 
    var canvasWidth = imageWidth;
    if (canvasWidth > maxCanvasWidth) {
      canvasWidth = maxCanvasWidth;
    }
    // the height of the scale image 
    var canvasHeight = Math.floor(canvasWidth * (imageHeight / imageWidth));
    // draw image on canvas
    ctx.drawImage(photoPath, 0, 0, canvasWidth, canvasHeight);
    // waiting for drawing
    ctx.draw(false, function () {
      // get image data from canvas
      wx.canvasGetImageData({
        canvasId: canvasId,
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
        async success(res) {
          console.log('size of frame:', res.width, res.height);
          const frame = {
            data: new Uint8Array(res.data),
            width: res.width,
            height: res.height,
          };
          // process
          await _that.executeMobilenet(frame);

        }
      });
    });
  },
  takePhoto() {
    var _that = this;
    const context = wx.createCameraContext();
    const ctx = wx.createCanvasContext(canvasId);
    if (_that.data.isRunning) {
      _that.setData({
        btnText: 'Retry',
        isRunning: false,
      });
      // take a photo
      context.takePhoto({
        quality: 'normal',
        success: (res) => {
          var photoPath = res.tempImagePath;
          //get size of image 
          wx.getImageInfo({
            src: photoPath,
            success(res) {
              console.log('size of image:', res.width, res.height);
              _that.processPhoto(photoPath, res.width, res.height);
            }
          });
        }
      });
    }
    else {
      _that.setData({
        btnText: 'Take a photo',
        isRunning: true,
      });
      // clear 2d canvas
      ctx.clearRect(0, 0);
      ctx.draw();
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
  },
  async initMobilenet() {
    // Load the model.
    this.mobilenetModel = await mobilenet.load({
      version: 2,
      alpha: 0.5,
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
    this.setData({ result: predictions[0].className + ",概率：" + predictions[0].probability.toFixed(2) });
    console.log('executeMobilenet', predictions);
  },
});
