const face = require('../../utils/faceBusiness.js');
const canvasId = 'canvas1';
const maxCanvasWidth = 375;
const isReserveDraw = true;
const isWithFaceLandmarks = true;
// if it is taking photo
var isRunning = true;

Page({
  data: {
    btnText: 'Take a photo',
    devicePosition: 'front',
  },
  async onLoad() {
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
  },
  processPhoto(photoPath, imageWidth, imageHeight) {
    const ctx = wx.createCanvasContext(canvasId);
    var canvasWidth = imageWidth;
    if (canvasWidth > maxCanvasWidth) {
      canvasWidth = maxCanvasWidth;
    }
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
        async success(frame) {
          console.log('size of frame:', frame.width, frame.height);
          var detectResults = await face.detect(frame, isWithFaceLandmarks, canvasWidth, canvasHeight,photoPath);
          if (!detectResults || detectResults.length === 0) {
            var message = 'No results found.';
            wx.showToast({
              title: message,
              icon: 'none'
            });
          }
        }
      });
    });
  },
  takePhoto() {
    var _that = this;
    const context = wx.createCameraContext();
    const ctx = wx.createCanvasContext(canvasId);
    if (isRunning) {
      _that.setData({
        btnText: 'Retry',
      });
      isRunning = false;
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
      });
      isRunning = true;
      // clear canvas
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
  }
});
