const faceLandmarksDetection = require('@tensorflow-models/face-landmarks-detection');
require('@tensorflow/tfjs-backend-webgl');
const detectionConfidence = 0.8;
const maxFaces = 1;
var model;

async function loadModel() {
  model = await faceLandmarksDetection.load(
    faceLandmarksDetection.SupportedPackages.mediapipeFacemesh, {
      shouldLoadIrisModel: false,
      detectionConfidence: detectionConfidence,
      maxFaces: maxFaces,
    });
  console.log('facemesh model is loaded.');
}

async function detect(frame) {
  if (!model) {
    console.log('facemesh model has not been loaded.');
    return;
  }
  var start = new Date();
  const predictions = await model.estimateFaces({
    input: frame,
    predictIrises: false,
  });
  var end = new Date() - start;
  console.log('detect', end, 'ms');

  return { prediction: predictions[0] };
}

module.exports = { loadModel, detect };
