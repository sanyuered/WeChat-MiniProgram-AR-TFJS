const faceapi = require('../../utils/face-api.js');
const fetchWechat = require('fetch-wechat');
// tiny_face_detector options
const inputSize = 288;
const scoreThreshold = 0.3;
// your website url
const modelUrl = 'https://sanyuered.github.io/models/';
// const modelUrl = 'http://127.0.0.1/models/';
const referenceImageUrl = '../../../reference.jpg';
const hiddenCanvasId = 'hiddenCanvas';
const referenceImageWidth = 375;
const peopleName = ['Amy','Sheldon'];
// a canvas
var canvas1;
// model config
var options;
// canvas id
var canvasId;
// if reserve draw
var isReserveDraw;
// reference image 
var faceMatcher;
// canvas context
var canvasContext;

function createBrowserEnv() {
  canvasContext = wx.createCanvasContext(canvasId);
  return {
    Canvas: wx.createOffscreenCanvas(),
    CanvasRenderingContext2D: canvasContext,
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

function getModelOptions() {
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
  options = getModelOptions();
  console.log('options', options);
  await faceapi.loadTinyFaceDetectorModel(modelUrl);
  await faceapi.loadFaceLandmarkTinyModel(modelUrl);
  await faceapi.loadFaceRecognitionModel(modelUrl);
  console.log('model is loaded.');
}

async function warmup() {
  // warm up model
  var inputImgElTensor = faceapi.tf.zeros([1, 1, 1, 3]);
  await faceapi
    .detectAllFaces(inputImgElTensor, options)
    .withFaceLandmarks(true)
    .withFaceDescriptors();
  // memory management: dispose
  faceapi.tf.dispose(inputImgElTensor);
  console.log('warm up model');
}

async function detect(frame,
  isDrawOther) {
  var start = new Date();
  // input image
  const tempTensor = faceapi.tf.tensor(new Uint8Array(frame.data), [frame.height, frame.width, 4]);
  const inputImgElTensor = tempTensor.slice([0, 0, 0], [-1, -1, 3]);
  // detect  
  var detectResults = await faceapi
    .detectAllFaces(inputImgElTensor, options)
    .withFaceLandmarks(true)
    .withFaceDescriptors();
  // memory management: dispose
  faceapi.tf.dispose(tempTensor);
  faceapi.tf.dispose(inputImgElTensor);
  // statistics
  var end1 = new Date();
  console.log("detect time", end1 - start, 'ms');
  console.log("detect result", detectResults);
  faceapi.matchDimensions(canvas1, frame);

  if (isDrawOther) {
    const resizedResults = faceapi.resizeResults(detectResults, frame);
    for (var i = 0; i < resizedResults.length; i++) {
      const bestMatch = faceMatcher.findBestMatch(resizedResults[i].descriptor);
      // person name
      const label = bestMatch._label;
      if(label !== 'unknown'){
        const drawBox = new faceapi.draw.DrawBox(resizedResults[i].detection.box, { label });
        drawBox.draw(null);
      }
    }
    canvasContext.draw(isReserveDraw);
  }

  return detectResults;
}

function getReferenceImage(callback) {
  const ctx = wx.createCanvasContext(hiddenCanvasId);
  wx.getImageInfo({
    src: referenceImageUrl,
    success: function (res) {
      const referenceImageHeight = Math.floor((res.height / res.width) * referenceImageWidth);
      ctx.drawImage(res.path, 0, 0, referenceImageWidth, referenceImageHeight);
      ctx.draw(false, function () {
        wx.canvasGetImageData({
          canvasId: hiddenCanvasId,
          x: 0,
          y: 0,
          width: referenceImageWidth,
          height: referenceImageHeight,
          success: async function (canvasRes) {
            const detectResult = await detect(canvasRes, false, false);
            if (detectResult.length === 0) {
              return;
            }
            // peopele face descriptors
            const labeledDescriptors = [];
            for (var i = 0; i < detectResult.length; i++) {
              var labelName = 'unknown';
              if (i < peopleName.length) {
                labelName = peopleName[i];
              }
              labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(
                labelName,
                [detectResult[i].descriptor]
              ));
            }
            faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);
            console.log('faceMatcher', faceMatcher);

            if(typeof callback === 'function'){
              callback();
            }
          }
        });
      });
    },
    fail: function (error) {
      console.log('getReferenceImage', error);
    }
  });
}

module.exports = { loadmodel, warmup, detect, getReferenceImage };
