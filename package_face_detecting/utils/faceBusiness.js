const faceapi = require('../../utils/face-api.js');
const jsfeat = require('../utils/jsfeat.js');
const fetchWechat = require('fetch-wechat');
// tiny_face_detector options
const inputSize = 288;
const scoreThreshold = 0.45;
const useTinyModel = true;
// your website url
const modelUrl = 'https://sanyuered.github.io/models/';
// const modelUrl = 'http://127.0.0.1/models/';
// decoration image for image tracker 
const decorationImageUrl = '../../../cat_beard.png';
// hidden canvas
const hiddenCanvasId = 'hiddenCanvas';
// canvas width
var canvasWidth = 0;
// canvas height
var canvasHeight = 0;
// a canvas
var canvas1;
// model config
var options;
// canvas id
var canvasId;
// if reserve draw
var isReserveDraw;
// temp photo path
var tempImagePath = null;

function createBrowserEnv() {
  return {
    Canvas: wx.createOffscreenCanvas(),
    CanvasRenderingContext2D: wx.createCanvasContext(canvasId),
    isReserveDraw: isReserveDraw,
    Image: null,
    ImageData: null,
    Video: null,
    createCanvasElement: function () {
      return {};
    },
    createImageElement: function () {
      return {};
    },
    fetch: fetchWechat.fetchFunc(),
    readFile: function () { }
  };
}

function getFaceDetectorOptions() {
  return new faceapi.TinyFaceDetectorOptions({
    inputSize,
    scoreThreshold
  })
}

async function loadmodel(_canvasId,
  _isReserveDraw) {
  canvasId = _canvasId;
  isReserveDraw = _isReserveDraw;

  faceapi.setEnv(createBrowserEnv(canvasId, isReserveDraw));
  canvas1 = {
    width: 128,
    height: 128,
  };
  options = getFaceDetectorOptions();
  console.log('options', options);
  await faceapi.loadTinyFaceDetectorModel(modelUrl);
  await faceapi.loadFaceLandmarkTinyModel(modelUrl);
  console.log('model is loaded.');
}

async function detect(frame,
  isWithFaceLandmarks,
  _canvasWidth,
  _canvasHeight,
  photoPath) {
  canvasWidth = _canvasWidth;
  canvasHeight = _canvasHeight;
  tempImagePath = photoPath;

  var start = new Date();
  // detect
  const tempTensor = faceapi.tf.tensor(new Uint8Array(frame.data), [frame.height, frame.width, 4]);
  const inputImgElTensor = tempTensor.slice([0, 0, 0], [-1, -1, 3]);
  var detectResults = [];
  if (isWithFaceLandmarks) {
    detectResults = await faceapi.detectAllFaces(inputImgElTensor, options).withFaceLandmarks(useTinyModel);
  } else {
    detectResults = await faceapi.detectAllFaces(inputImgElTensor, options);
  }
  // memory management: dispose
  faceapi.tf.dispose(tempTensor);
  faceapi.tf.dispose(inputImgElTensor);
  // statistics
  var end1 = new Date();
  console.log("detect time", end1 - start, 'ms');
  console.log("detect result", detectResults);
  faceapi.matchDimensions(canvas1, frame);
  const resizedResults = faceapi.resizeResults(detectResults, frame);
  // draw rect
  faceapi.draw.drawDetections(canvas1, resizedResults);
  // draw landmarks
  if (isWithFaceLandmarks) {
    faceapi.draw.drawFaceLandmarks(canvas1, resizedResults);
    /*
    if (resizedResults && resizedResults.length > 0) {
      const ctx = wx.createCanvasContext(canvasId);
      drawFaceDecoration(resizedResults[0].landmarks._positions, ctx);
    }
    */
  }
  var end2 = new Date();
  console.log("draw time", end2 - end1, 'ms');

  return detectResults;
}

async function warmup() {
  // warm up model
  var frame = faceapi.tf.zeros([1, 1, 1, 3]);
  await faceapi.detectAllFaces(frame, options).withFaceLandmarks(useTinyModel);
  // memory management: dispose
  faceapi.tf.dispose(frame);
  console.log('warm up model');
}

function drawImageOnUI(transformData,
  canvasWidth,
  canvasHeight,
  ctx) {
  //const hiddenCtx = wx.createCanvasContext(hiddenCanvasId);
  const hiddenCtx = wx.createCanvasContext(hiddenCanvasId);
  // avoid to get hidden images existed
  const offsetLeft = canvasWidth;
  hiddenCtx.drawImage(decorationImageUrl, 0, 0, canvasWidth, canvasHeight);
  console.log('size of decoration image', canvasWidth, canvasHeight);
  hiddenCtx.draw(false, function () {
    // get image data of srcImage
    wx.canvasGetImageData({
      canvasId: hiddenCanvasId,
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      success(srcImage) {
        // create a image data of destImage
        wx.canvasGetImageData({
          canvasId: hiddenCanvasId,
          x: offsetLeft,
          y: 0,
          width: canvasWidth,
          height: canvasHeight,
          success(destImage) {
            console.log('transformData', transformData);

            // invert the transform for function "warp_perspective_color" 
            custom.invert_transform({ data: transformData });
            // warp perspective
            custom.warp_perspective_color(
              srcImage,
              destImage,
              transformData);
            var itemData = destImage.data;
            // convert from black to transparent.
            for (var i = 0; i < itemData.length; i = i + 4) {
              if (itemData[i] === 0 &&
                itemData[i + 1] === 0 &&
                itemData[i + 2] === 0 &&
                itemData[i + 3] !== 0) {
                itemData[i + 3] = 0;
              }
            }
            // "take a photo" mode
            if (tempImagePath) {
              // put image data
              wx.canvasPutImageData({
                canvasId: hiddenCanvasId,
                x: offsetLeft,
                y: 0,
                width: canvasWidth,
                height: canvasHeight,
                data: itemData,
                success(res) {
                  // When function "wx.canvasToTempFilePath" is called frequently on Android Wechat, WeChat will be crashed.
                  // get image file path
                  wx.canvasToTempFilePath({
                    x: offsetLeft,
                    y: 0,
                    width: canvasWidth,
                    height: canvasHeight,
                    destWidth: canvasWidth,
                    destHeight: canvasHeight,
                    canvasId: hiddenCanvasId,
                    success(res2) {
                      // draw image
                      ctx.drawImage(res2.tempFilePath, 0, 0, canvasWidth, canvasHeight);
                      ctx.draw(isReserveDraw);
                      console.log('drawImageOnUI', 'completed');
                    }
                  });
                },
                fail(errorMsg) {
                  console.log('drawImageOnUI', errorMsg);
                }
              });

            } else {
              // put image data
              wx.canvasPutImageData({
                canvasId: canvasId,
                x: 0,
                y: 0,
                width: canvasWidth,
                height: canvasHeight,
                data: itemData,
                success(res) {
                  console.log('drawImageOnUI', 'completed');
                },
                fail(errorMsg) {
                  console.log('drawImageOnUI', errorMsg);
                }
              });
            }
          }
        });
      },
      fail(errorMsg) {
        console.log('canvasGetImageData', errorMsg);
      },
    });
  });
}

function drawFaceDecoration(landmarks, ctx) {
  var srcPoints = [];
  var destPoints = [];
  // The number 375 means picture "cat_beard.png" width and height.
  console.log('drawFaceDecoration', canvasWidth, canvasHeight);
  var widthRatio = canvasWidth / 375;
  var heightRatio = canvasHeight / 375;
  // The following are 4 source points.
  // The picture width is 375 and height is 375.
  // left eye
  srcPoints.push({
    x: 150.2587 * widthRatio,
    y: 135.3529 * heightRatio,
  });
  // right eye
  srcPoints.push({
    x: 230.2213 * widthRatio,
    y: 137.1662 * heightRatio,
  });
  // left side of mouth
  srcPoints.push({
    x: 153.8815 * widthRatio,
    y: 225.9835 * heightRatio,
  });
  // right side of mouth
  srcPoints.push({
    x: 173.5974 * widthRatio,
    y: 225.8535 * heightRatio,
  });
  // The following are 4 destion points.
  // The point index 38, 44, 48 and 67 are index of feature points on the face.
  destPoints.push({
    x: landmarks[38]._x,
    y: landmarks[38]._y,
  });
  destPoints.push({
    x: landmarks[44]._x,
    y: landmarks[44]._y,
  });
  destPoints.push({
    x: landmarks[48]._x,
    y: landmarks[48]._y,
  });
  destPoints.push({
    x: landmarks[67]._x,
    y: landmarks[67]._y,
  });

  // get transform from source to destion
  var transformData = custom.perspective_transform(
    srcPoints[0].x, srcPoints[0].y, destPoints[0].x, destPoints[0].y,
    srcPoints[1].x, srcPoints[1].y, destPoints[1].x, destPoints[1].y,
    srcPoints[2].x, srcPoints[2].y, destPoints[2].x, destPoints[2].y,
    srcPoints[3].x, srcPoints[3].y, destPoints[3].x, destPoints[3].y,
  );

  //draw image on UI
  drawImageOnUI(transformData.data,
    canvasWidth,
    canvasHeight, ctx);
}

var custom = {};

custom.perspective_transform = function (
  src_x0, src_y0, dst_x0, dst_y0,
  src_x1, src_y1, dst_x1, dst_y1,
  src_x2, src_y2, dst_x2, dst_y2,
  src_x3, src_y3, dst_x3, dst_y3) {
  var transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
  jsfeat.math.perspective_4point_transform(transform,
    src_x0, src_y0, dst_x0, dst_y0,
    src_x1, src_y1, dst_x1, dst_y1,
    src_x2, src_y2, dst_x2, dst_y2,
    src_x3, src_y3, dst_x3, dst_y3);
  return transform;
};

custom.invert_transform = function (transform) {
  jsfeat.matmath.invert_3x3(transform, transform);
};

/*
Reference: https://github.com/josundin/magcut/blob/master/js/imagewarp.js
Author: josundin
Title: image warp
License: MIT
*/
custom.warp_perspective_color = function (src, dst, transform) {
  var dst_width = dst.width | 0, dst_height = dst.height | 0;
  var src_width = src.width | 0, src_height = src.height | 0;
  var x = 0, y = 0, off = 0, ixs = 0, iys = 0, xs = 0.0, ys = 0.0, xs0 = 0.0, ys0 = 0.0, ws = 0.0, sc = 0.0, a = 0.0, b = 0.0, p0r = 0.0, p1r = 0.0, p0g = 0.0, p1g = 0.0, p0b = 0.0, p1b = 0.0;
  var td = transform;
  var m00 = td[0], m01 = td[1], m02 = td[2],
    m10 = td[3], m11 = td[4], m12 = td[5],
    m20 = td[6], m21 = td[7], m22 = td[8];
  var dptr = 0;
  for (var i = 0; i < dst_height; ++i) {
    xs0 = m01 * i + m02,
      ys0 = m11 * i + m12,
      ws = m21 * i + m22;
    for (var j = 0; j < dst_width; j++ , dptr += 4, xs0 += m00, ys0 += m10, ws += m20) {
      sc = 1.0 / ws;
      xs = xs0 * sc, ys = ys0 * sc;
      ixs = xs | 0, iys = ys | 0;
      if (xs > 0 && ys > 0 && ixs < (src_width - 1) && iys < (src_height - 1)) {
        a = Math.max(xs - ixs, 0.0);
        b = Math.max(ys - iys, 0.0);
        //off = (src_width*iys + ixs)|0;
        off = (((src.width * 4) * iys) + (ixs * 4)) | 0;
        p0r = src.data[off] + a * (src.data[off + 4] - src.data[off]);
        p1r = src.data[off + (src_width * 4)] + a * (src.data[off + (src_width * 4) + 4] - src.data[off + (src_width * 4)]);
        p0g = src.data[off + 1] + a * (src.data[off + 4 + 1] - src.data[off + 1]);
        p1g = src.data[off + (src_width * 4) + 1] + a * (src.data[off + (src_width * 4) + 4 + 1] - src.data[off + (src_width * 4) + 1]);
        p0b = src.data[off + 2] + a * (src.data[off + 4 + 2] - src.data[off + 2]);
        p1b = src.data[off + (src_width * 4) + 2] + a * (src.data[off + (src_width * 4) + 4 + 2] - src.data[off + (src_width * 4) + 2]);
        dst.data[dptr + 0] = p0r + b * (p1r - p0r);
        dst.data[dptr + 1] = p0g + b * (p1g - p0g);
        dst.data[dptr + 2] = p0b + b * (p1b - p0b);
        dst.data[((i * (dst.width * 4)) + (j * 4)) + 3] = 255;
      }
      else {
        dst.data[((i * (dst.width * 4)) + (j * 4)) + 3] = 0;
      }
    }
  }
};

module.exports = { loadmodel, warmup, detect };
