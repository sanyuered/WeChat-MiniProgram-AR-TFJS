const face = require('../../utils/faceBusiness.js');
const model = require('../../utils/modelBusiness.js');
const canvasId = 'canvas2d';
const canvasWebGLId = 'canvasWebGL';
const maxCanvasWidth = 375;
// a url of sprite image
const modelUrl = '../../utils/cat_beard.png';

Page({
  data: {
    btnText: 'Take a photo',
    devicePosition: 'front',
    // if it is taking photo
    isRunning: true,
  },
  async onReady() {
    // load tfjs model
    wx.showLoading({
      title: 'Loading TFJS...',
    });
    await face.loadModel();
    wx.hideLoading();

    // load 3d model
    model.initThree(canvasWebGLId, modelUrl);
  },
  onUnload: function () {
    model.stopAnimate();
    model.dispose();
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
          var result = await face.detect(frame);

          if (result && result.prediction) {
            // set the rotation and position of the 3d model.    
            model.setModel(result.prediction,
              canvasWidth,
              canvasHeight);
            // put the 3d model on the image
            model.setSceneBackground(frame);
          } else {
            var message = 'No results.';
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
      // clear 3d canvas
      model.clearSceneBackground();
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
